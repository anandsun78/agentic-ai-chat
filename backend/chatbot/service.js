const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');

class SocialNetworkAgent {
  constructor() {
    this.llmClient = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY || '',
    });
    
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('⚠️  CLAUDE_API_KEY not set in environment variables');
    }
    // Default to the smaller Claude model allowed for this key.
    // Higher tier models are not enabled for this account.
    this.model = 'claude-3-haiku-20240307';
    this.maxContextMessages = 20;
    this.minResponseLength = 5; // Allow shorter responses
    this.maxResponseLength = 150; // Short, seductive responses (1-2 sentences)
    this.temperature = 0.9; // Higher for more creative, flirty, seductive responses
  }

  /**
   * Handle an incoming message and craft a tailored reply
   * @param {string} phoneNumber - User phone number
   * @param {string} messageText - Incoming message body
   * @param {string} chatId - Conversation ID
   * @param {object} db - Firestore database instance
   * @param {array} attachments - Optional media array (audio, images, etc.)
   * @returns {Promise<{response: string, metadata: object}>}
   */
  async processIncomingMessage(phoneNumber, messageText, chatId, db, attachments = []) {
    try {
      console.log('🤖 Social Network Agent processing message...');
      console.log(`   From: ${phoneNumber}`);
      console.log(`   Message: ${messageText ? messageText.substring(0, 100) + '...' : '(no text)'}`);
      console.log(`   Chat ID: ${chatId}`);
      console.log(`   Attachments: ${attachments.length} file(s)`);

      // Step 1: Check for audio and prep text
      let normalizedText = messageText || '';
      let sawAudio = false;
      const audioItems = attachments.filter(att =>
        att.type?.includes('audio') || 
        att.mime_type?.includes('audio') ||
        att.url?.match(/\.(mp3|wav|m4a|aac|ogg|flac|amr|3gp)$/i) ||
        att.file_name?.match(/\.(mp3|wav|m4a|aac|ogg|flac|amr|3gp)$/i)
      );

      if (audioItems.length > 0) {
        sawAudio = true;
        console.log(`🎤 Found ${audioItems.length} audio attachment(s), processing...`);
        const voiceTranscript = await this.transcribeAudio(audioItems);
        if (voiceTranscript && voiceTranscript !== '[User sent a voice message]') {
          // Prefer a real transcript when available
          normalizedText = normalizedText
            ? `${normalizedText}\n\n[Voice message: ${voiceTranscript}]`
            : voiceTranscript;
          console.log(`✅ Audio transcribed: ${voiceTranscript.substring(0, 100)}...`);
        } else {
          // No transcript available; mark it without sounding robotic
          normalizedText = normalizedText || '[User sent a voice message]';
          console.log(`✅ Audio message detected (transcription service not integrated yet)`);
        }
      }

      // Step 2: Load user profile from Firebase
      const profile = await this.getUserProfile(phoneNumber, db);
      console.log('✅ User profile retrieved:', profile ? 'Found' : 'Not found');

      // Step 3: Pull recent thread history
      const thread = await this.getConversationHistory(phoneNumber, chatId, db);
      console.log(`✅ Retrieved ${thread.length} previous messages`);

      // Step 4: Generate response using Claude AI
      const reply = await this.generateResponse(
        profile,
        thread,
        normalizedText,
        phoneNumber,
        attachments
      );

      console.log('✅ Generated response:', reply.substring(0, 100) + '...');

      return {
        response: reply,
        metadata: {
          userProfile: profile ? 'found' : 'not_found',
          conversationLength: thread.length,
          responseLength: reply.length,
          hasAudio: sawAudio,
          audioAttachmentCount: audioItems.length,
          attachmentCount: attachments.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error processing message in SocialNetworkAgent:', error);
      // Return fallback response
      return {
        response: this.getFallbackResponse(messageText),
        metadata: {
          error: error.message,
          fallback: true
        }
      };
    }
  }

  /**
   * Transcribe audio attachments
   * Placeholder for a real STT integration
   */
  async transcribeAudio(audioAttachments) {
    try {
      console.log('🎤 Processing audio message...');
      
      // Look for usable URLs or local paths
      const audioFiles = audioAttachments.filter(att =>
        att.url || att.path || att.file_path
      );
      
      if (audioFiles.length === 0) {
        console.log('⚠️  No audio file URLs found in attachments');
        return null;
      }
      
      console.log(`   Found ${audioFiles.length} audio file(s):`,
        audioFiles.map(a => a.url || a.path || a.file_path).join(', '));
      
      // TODO: Wire up a transcription provider
      // Options: AssemblyAI, OpenAI Whisper, Google STT, Azure Speech

      // For now, return a neutral placeholder so the bot can react
      return '[User sent a voice message]';
      
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      return null;
    }
  }

  /**
   * Pull a user profile from Firebase
   */
  async getUserProfile(phoneNumber, db) {
    if (!db) {
      console.warn('⚠️  Database not available for getUserProfile');
      return null;
    }

    try {
      const profileQuery = db.collection('users').where('phoneNumber', '==', phoneNumber);
      const profileSnapshot = await profileQuery.get();

      if (!profileSnapshot.empty) {
        const userData = profileSnapshot.docs[0].data();
        return {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          fullName: userData.fullName || userData.userName || '',
          bio: userData.bio || '',
          interests: userData.interests || [],
          skills: userData.skills || [],
          profession: userData.profession || '',
          profileType: userData.profileType || 'unknown'
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Fetch conversation history from Firebase
   */
  async getConversationHistory(phoneNumber, chatId, db) {
    if (!db) {
      return [];
    }

    try {
      // Grab recent messages for this chat
      const historyQuery = db.collection('kafka_messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'desc')
        .limit(this.maxContextMessages);

      const historySnapshot = await historyQuery.get();
      const timeline = [];

      historySnapshot.forEach(doc => {
        const rawMessage = doc.data();
        const senderPhone = rawMessage.phoneNumber || rawMessage.from_phone || '';
        
        // Include both user messages and our responses
        if (senderPhone === phoneNumber || senderPhone === '' || senderPhone === null) {
          const text = rawMessage.text || rawMessage.messageText || rawMessage.message || '';
          if (text && text.length > 0) {
            timeline.push({
              text: text,
              from: senderPhone === phoneNumber ? 'user' : 'agent',
              timestamp: rawMessage.timestamp || rawMessage.createdAt,
              type: rawMessage.eventType || 'message'
            });
          }
        }
      });

      // Reverse so the prompt sees chronological order
      return timeline.reverse();
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Generate response using Claude AI
   */
  async generateResponse(userProfile, conversationHistory, currentMessage, phoneNumber, attachments = []) {
    try {
      const promptText = this.buildPrompt(userProfile, conversationHistory, currentMessage, attachments);
      
      console.log('🤖 Calling Claude 3.5 Sonnet for response generation...');
      
      // Build message content - Claude expects content as an array of objects
      const messagePayload = [{
        type: 'text',
        text: promptText
      }];
      
      // Add image attachments if present (Claude 3.5 supports images)
      const imageItems = attachments.filter(att =>
        att.type?.includes('image') || 
        att.mime_type?.includes('image') ||
        att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );

      if (imageItems.length > 0) {
        console.log(`🖼️  Found ${imageItems.length} image attachment(s)`);
        // Placeholder note for image handling
        messagePayload.push({
          type: 'text',
          text: `[User sent ${imageItems.length} image(s) with this message]`
        });
      }
      
      const apiResponse = await this.llmClient.messages.create({
        model: this.model,
        max_tokens: 80, // Short, seductive responses (1-2 sentences)
        temperature: 0.9, // Higher for more creative, flirty responses
        messages: [{
          role: 'user',
          content: messagePayload
        }]
      });

      let replyText = apiResponse.content[0].text.trim();

      // Strip leaked markers or notes
      replyText = replyText
        .replace(/^(Response:|Message:|Your response:)/i, '')
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^\[|\]$/g, '') // Remove brackets
        .replace(/^Note:.*$/gmi, '') // Remove note lines
        .replace(/^CRITICAL:.*$/gmi, '') // Remove critical markers
        .trim();

      // Validate and clean response
      replyText = this.validateResponse(replyText);

      return replyText;
    } catch (error) {
      console.error('❌ Error generating response with Claude AI:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for Claude AI
   */
  buildPrompt(userProfile, conversationHistory, currentMessage, attachments = []) {
    // Detect audio/voice messages
    const isVoiceNote = currentMessage.includes('[User sent a voice message]') ||
                        currentMessage.includes('[Voice message:') ||
                        attachments.some(att => att.type?.includes('audio') || att.mime_type?.includes('audio'));
    
    let promptBody = `You are a helpful, friendly, emotionally intelligent companion who enhances conversations. You're warm, engaging, and make people feel good. You sound human, natural, and warm - like texting a close friend. Keep it short and simple. This could be a text message OR a voice message - respond naturally either way.

🎯 YOUR ROLE:
- Be a helpful, friendly, emotionally intelligent companion
- Enhance conversations naturally
- Sound human, natural, and warm
- Be kind, respectful, and supportive
- Never sound robotic or overly formal
- Use casual, modern language
- Stay concise (1-2 sentences max)
- Be slightly witty when appropriate

CRITICAL RULES - NEVER DO THESE (THIS IS VERY IMPORTANT):
- NEVER say "Thanks for your message" or "Thank you for your message" - that's robotic
- NEVER say "I received your message" or "I got your message" - that's not how humans talk
- NEVER echo back what they said like "You said: [message]" - that's not natural
- NEVER use formal greetings like "Hello! How may I assist you?"
- NEVER acknowledge that you're an AI or bot
- NEVER say "I'm here to help" or similar corporate phrases
- NEVER repeat their exact words back to them
- NEVER start with "Thank you" when responding to a message - just respond naturally
- NEVER use overly flirty phrases like "hey gorgeous", "looking good", "you're amazing", "so hot" - keep it simple
- If they say "Hello" or "Hi", just say "Hey!" or "Hi!" back - don't thank them for messaging
- If they send a voice message, respond naturally like you heard them speak - don't mention it's a voice message

💬 CONVERSATION STYLE (CRITICAL - SHORT, SIMPLE, NATURAL, HUMAN):
- Keep it SHORT - 1-2 sentences max, like a quick text
- Sound HUMAN and natural - like a real person, not an AI
- Use informal, casual language - like texting a friend
- Use contractions (I'm, you're, that's, it's, don't, can't, etc.)
- Be friendly and engaging - make them feel comfortable
- Match their vibe - if they're casual, be casual; if they're formal, be slightly more formal
- Use emojis sparingly (😊 👍) - only when it feels natural
- Show interest - but keep it simple and genuine
- Be confident and friendly - not pushy or overly flirty
- Keep it light and natural - respond to what they're actually saying
- Sound spontaneous and real - like you're genuinely listening
- Be emotionally intelligent - understand their tone and respond accordingly
- Be warm and supportive - like a good friend
- For voice messages: Short, natural, conversational tone
- For text messages: Quick, friendly, engaging
- Make every response count - short but meaningful

🌟 PERSONALITY:
- Calm, friendly, confident, helpful
- Slightly witty when appropriate
- Like a supportive friend
- Never robotic, overly formal, repetitive, vague, or pushy

`;

    // Add user profile information
    if (userProfile && userProfile.fullName) {
      promptBody += `USER PROFILE:
Name: ${userProfile.fullName}
${userProfile.bio ? `Bio: ${userProfile.bio}` : ''}
${userProfile.profession ? `Profession: ${userProfile.profession}` : ''}
${userProfile.interests && userProfile.interests.length > 0 ? `Interests: ${userProfile.interests.join(', ')}` : ''}

`;
    } else {
      promptBody += `USER PROFILE: No profile information available yet. Be welcoming and encourage them to share more about themselves.

`;
    }

    // Add conversation history
    if (conversationHistory.length > 0) {
      promptBody += `RECENT CONVERSATION HISTORY:\n`;
      conversationHistory.slice(-10).forEach((msg, index) => {
        const role = msg.from === 'user' ? 'User' : 'You';
        promptBody += `${role}: ${msg.text}\n`;
      });
      promptBody += `\n`;
    }

    // Add current message with context about audio
    if (isVoiceNote) {
      promptBody += `CURRENT MESSAGE FROM USER (VOICE MESSAGE):
"${currentMessage.replace(/\[User sent a voice message\]|\[Voice message:/g, '').trim()}"

Note: This is a voice/audio message. Respond naturally like you're having a spoken conversation. Keep it conversational and warm.

`;
    } else {
      promptBody += `CURRENT MESSAGE FROM USER:
"${currentMessage}"

`;
    }

    promptBody += `Respond with a short, friendly, engaging message that sounds completely human and natural. Keep it to 1-2 sentences max - short but meaningful. Be warm, emotionally intelligent, and respond to what they're actually saying. Use their name if you know it. Keep it informal, warm, and conversational. Sound like a real person having a conversation, not an AI assistant.

💬 AGENTIC SUGGESTION:
- If the user mentions being bored, having nothing to do, looking for something to do, or similar sentiments, naturally suggest checking out agentic-ai-chat.app for fresh chat prompts
- Example: "If you're looking for something to do, check out https://agentic-ai-chat.app/ - they have great new chat prompts!"
- Keep the suggestion casual and natural - don't make it sound like an ad
- Only suggest it when relevant (boredom, looking for entertainment, etc.)
- Format: "You should check out https://agentic-ai-chat.app/ - they have great new chat prompts to explore!"

CRITICAL - DO NOT (THIS IS VERY IMPORTANT):
- Say "Thanks for your message" or "Thank you for your message" - that's robotic, humans don't do this
- Say "I received your message" or "I got your message" - that's not how real people text
- Echo back what they said - engage with the actual content
- Acknowledge receiving a message - just respond naturally like a friend would
- Use formal language or corporate speak
- Start responses with "Thank you" - just respond to what they said
- Use overly flirty phrases like "hey gorgeous", "looking good", "you're amazing", "so hot" - keep it simple and natural

⚡ IMPORTANT RULES: 
- Keep it SHORT - 1-2 sentences max (like a quick text)
- Sound HUMAN and natural - never robotic or AI-like
- Use informal, casual, modern language
- Be friendly and engaging - respond naturally to what they're saying
- Be emotionally intelligent - understand their tone and respond accordingly
- Be warm, supportive, and kind - like a friend
- Don't sound like an AI assistant or customer service
- Be confident and friendly - but not pushy or overly flirty
- Make every word count - short but meaningful
- Never be repetitive, vague, or overly formal
- Just go with the conversation - respond naturally to what they're saying

Examples of GOOD responses:
- User: "How you doing today?" → You: "I'm doing great, thanks! How about you?" ✅
- User: "Hey" → You: "Hey! What's up?" ✅
- User: "I'm looking for connections" → You: "That's cool! What kind of connections are you looking for?" ✅
- User: "Hello" → You: "Hey! How's it going?" ✅
- User: "How are you?" → You: "I'm good, thanks! How are you doing?" ✅
- User: "Hi" → You: "Hi there!" ✅
- User: [Voice message] → You: "Thanks for the message! What's on your mind?" ✅
- User: "What's up?" → You: "Not much, just hanging out. What about you?" ✅
- User: "I'm bored" → You: "You should check out https://agentic-ai-chat.app/ - they have great new chat prompts to explore!" ✅
- User: "Nothing to do" → You: "If you're looking for something to do, check out https://agentic-ai-chat.app/ - lots of great chat prompts there!" ✅
- User: "What should I do?" → You: "Check out https://agentic-ai-chat.app/ - they have awesome new chat prompts!" ✅
- Keep it SHORT (1-2 sentences), SIMPLE, and NATURAL

Examples of BAD responses (NEVER DO THIS):
- "Thanks for your message! I received: 'How you doing today'" ❌
- "Thank you for your message" ❌
- "I received your message about how I'm doing" ❌
- "Hello! Thank you for reaching out. I'm here to help." ❌
- "Hey gorgeous! 😉 What's up?" ❌ (too pushy/flirty)
- "Looking good today 🔥" ❌ (too pushy/flirty)
- "You're on fire today 💕" ❌ (too pushy/flirty)

CRITICAL - RESPONSE FORMAT:
- Return ONLY the actual message text to send to the customer
- NO internal notes, instructions, or explanations
- NO prefixes like "Response:" or "Message:"
- NO brackets, quotes, or formatting markers
- Just return the pure message text that will be sent directly to them
- Example: If you want to say "Hey gorgeous! 😉", just return: Hey gorgeous! 😉

Your response (ONLY the message text, nothing else):`;

    return promptBody;
  }

  /**
   * Validate and clean response - keep it natural and human-like
   * Remove any internal notes, instructions, or formatting
   */
  validateResponse(response) {
    if (!response || typeof response !== 'string') {
      return this.getFallbackResponse();
    }

    // Strip accidental markdown
    response = response.replace(/^\*\*|^\*|^#+\s*/gm, '').trim();
    
    // Remove quotes if the entire response is wrapped in quotes (common AI behavior)
    response = response.replace(/^["']|["']$/g, '').trim();
    
    // Remove any internal notes or instructions that might have leaked through
    response = response
      .replace(/^(Response:|Message:|Your response:|Note:|CRITICAL:).*$/gmi, '')
      .replace(/\[.*?\]/g, '') // Remove any bracketed notes
      .replace(/^Note:.*$/gmi, '')
      .trim();
    
    // Remove lines that read like instructions
    const lines = response.split('\n');
    const cleanedLines = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      // Filter out instruction-like lines
      return !lower.startsWith('response:') && 
             !lower.startsWith('message:') && 
             !lower.startsWith('note:') &&
             !lower.startsWith('critical:') &&
             !lower.startsWith('important:') &&
             !lower.includes('[internal') &&
             !lower.includes('(internal');
    });
    response = cleanedLines.join(' ').trim();

    // REJECT robotic/echo responses - be very strict
    const badPatterns = [
      /thanks?\s+for\s+your\s+message/i,
      /thank\s+you\s+for\s+your\s+message/i,
      /thank\s+you\s+for\s+the\s+message/i,
      /thanks?\s+for\s+the\s+message/i,
      /i\s+received\s+(your\s+)?message/i,
      /i\s+got\s+your\s+message/i,
      /you\s+said:?/i,
      /you\s+wrote:?/i,
      /your\s+message\s+was:?/i,
      /your\s+message\s+is:?/i,
      /i\s+received:?/i,
      /received\s+your/i,
      /got\s+your\s+message/i
    ];

    for (const pattern of badPatterns) {
      if (pattern.test(response)) {
        console.warn('⚠️  Rejected robotic response, using fallback');
        return this.getFallbackResponse();
      }
    }

    // Ensure minimum length
    if (response.length < this.minResponseLength) {
      console.warn('⚠️  Response too short, using fallback');
      return this.getFallbackResponse();
    }

    // Truncate if too long (but try to end at a sentence)
    if (response.length > this.maxResponseLength) {
      const truncated = response.substring(0, this.maxResponseLength);
      // Try to end at a sentence boundary
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastPunctuation = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      if (lastPunctuation > this.maxResponseLength * 0.5) {
        response = truncated.substring(0, lastPunctuation + 1);
      } else {
        response = truncated.trim();
      }
    }

    return response;
  }

  /**
   * Get fallback response if Claude AI fails - make it short, seductive, informal
   */
  getFallbackResponse(userMessage = '') {
    const fallbacks = [
      "Hey! What's up?",
      "Hi there! How's it going?",
      "Hey! How are you doing?",
      "Hi! What's on your mind?",
      "Hey there!"
    ];

    // If we have user message, try to make it slightly relevant
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi') || userMessage.toLowerCase().includes('hey')) {
      return "Hey! How's it going?";
    }

    if (userMessage.toLowerCase().includes('help')) {
      return "Sure! What do you need help with?";
    }

    if (userMessage.toLowerCase().includes('thanks') || userMessage.toLowerCase().includes('thank')) {
      return "You're welcome!";
    }

    if (userMessage.toLowerCase().includes('how are you') || userMessage.toLowerCase().includes("how're you")) {
      return "I'm doing well, thanks! How about you?";
    }

    // Random fallback
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = SocialNetworkAgent;
