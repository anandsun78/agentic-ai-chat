require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const KafkaConsumer = require('./kafka/consumer');
const AgenticAPIClient = require('./api/agentic-client');
const SocialNetworkAgent = require('./backend/chatbot/service');
const { CONFIG } = require('./config/constants');
const { events, firebase, kafka, messaging } = CONFIG;
// Firebase service - handle errors gracefully
let firebaseBridge = null;
try {
  firebaseBridge = require('./backend/firebase/service');
} catch (error) {
  console.warn('⚠️  Firebase service not available:', error.message);
  console.warn('   Creating stub functions to prevent errors');
  firebaseBridge = {
    initializeFirebase: () => { console.warn('Firebase not configured'); },
    saveKafkaEventToFirebase: async () => { return null; },
    saveMessageReceivedToFirebase: async () => { return null; },
    saveMessageSentToFirebase: async () => { return null; },
    saveTypingIndicatorToFirebase: async () => { return null; }
  };
}

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time message delivery
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
const publicPath = path.join(__dirname, 'public');
console.log('📁 Public directory:', publicPath);
app.use(express.static(publicPath));

// Serve root static files (styles.css, script.js, etc.)
app.use(express.static(__dirname));

// Serve matching page
app.get('/matching', (req, res) => {
  const matchingPath = path.join(__dirname, 'public', 'matching.html');
  console.log('📍 Serving matching page from:', matchingPath);
  res.sendFile(matchingPath, (err) => {
    if (err) {
      console.error('❌ Error serving matching page:', err);
      res.status(500).send(`Error loading matching page: ${err.message}`);
    } else {
      console.log('✅ Matching page served successfully');
    }
  });
});

// Serve index page
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  console.log('📍 Serving index page from:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index page:', err);
      res.status(500).send(`Error loading page: ${err.message}`);
    }
  });
});

// Track Kafka consumer and websocket clients
let kafkaConsumerHandle = null;
let listenerActive = false;
const wsClients = new Set();

// Store Kafka events in memory for phone number lookup
const eventBuffer = [];
const MAX_BUFFERED_EVENTS = Math.max(1, kafka.maxBufferedEvents);

// Initialize API client (with error handling)
let agenticClient = null;
try {
  agenticClient = new AgenticAPIClient();
} catch (error) {
  console.warn('⚠️  API client initialization failed:', error.message);
  console.warn('   Some endpoints may not work until API credentials are configured.');
}

// Initialize Firebase Admin SDK (non-blocking)
setTimeout(() => {
  try {
    if (firebaseBridge && firebaseBridge.initializeFirebase) {
      const db = firebaseBridge.initializeFirebase();
      if (db) {
        console.log('✅ Firebase service initialized for Kafka event storage');
        console.log('✅ Firebase functions available:', {
          saveKafkaEventToFirebase: typeof firebaseBridge.saveKafkaEventToFirebase === 'function',
          saveMessageReceivedToFirebase: typeof firebaseBridge.saveMessageReceivedToFirebase === 'function',
          saveMessageSentToFirebase: typeof firebaseBridge.saveMessageSentToFirebase === 'function',
          saveTypingIndicatorToFirebase: typeof firebaseBridge.saveTypingIndicatorToFirebase === 'function'
        });
      } else {
        console.warn('⚠️  Firebase initialized but database not available');
      }
    } else {
      console.warn('⚠️  Firebase service not available - Kafka events will not be saved');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.error('   Stack:', error.stack);
    console.warn('   Kafka events will not be saved to Firebase until Firebase is configured.');
  }
}, 1000);

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastWs(data) {
  const message = JSON.stringify(data);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Setup Kafka consumer with event handlers
 */
function ensureConsumer() {
  if (kafkaConsumerHandle) {
    return kafkaConsumerHandle;
  }

  try {
    // Use unique consumer group to avoid conflicts
    process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

    const kafkaConsumer = new KafkaConsumer();

    // Handle incoming messages
    kafkaConsumer.onEvent(events.messageReceived, async (eventData) => {
      const { data } = eventData;
      
      const wsPayload = {
        type: events.messageReceived,
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            from: data.from_phone,
            text: data.text,
            chatId: data.chat_id,
            sentAt: data.sent_at,
            service: data.service,
            isRead: data.is_read,
            attachments: data.attachments || [],
            participants: data.chat_handles || [],
          },
        },
      };

      // Store event for phone number lookup
      eventBuffer.push({
        phoneNumber: data.from_phone,
        eventType: events.messageReceived,
        timestamp: eventData.created_at,
        chatId: data.chat_id,
        ...wsPayload
      });

      // Keep only last MAX_BUFFERED_EVENTS
      if (eventBuffer.length > MAX_BUFFERED_EVENTS) {
        eventBuffer.shift();
      }

      // Save to Firebase
      if (firebaseBridge && typeof firebaseBridge.saveMessageReceivedToFirebase === 'function') {
        try {
          console.log(`💾 Saving ${events.messageReceived} to Firebase...`);
          console.log('   Event data:', JSON.stringify({
            event_id: eventData.event_id,
            from_phone: data.from_phone,
            text: data.text?.substring(0, 50) + '...',
            chat_id: data.chat_id
          }));
          
          const messageId = await firebaseBridge.saveMessageReceivedToFirebase(eventData);
          if (messageId) {
            console.log(`✅ Message saved to Firebase ${firebase.collections.messages} collection (ID: ${messageId})`);
          } else {
            console.warn('⚠️  saveMessageReceivedToFirebase returned null/undefined');
          }
          
          const eventId = await firebaseBridge.saveKafkaEventToFirebase(events.messageReceived, eventData);
          if (eventId) {
            console.log(`✅ Kafka event saved to Firebase ${firebase.collections.events} collection (ID: ${eventId})`);
          } else {
            console.warn('⚠️  saveKafkaEventToFirebase returned null/undefined');
          }
        } catch (error) {
          console.error(`❌ Error saving ${events.messageReceived} to Firebase:`, error);
          console.error('   Error type:', error.constructor.name);
          console.error('   Error message:', error.message);
          console.error('   Error code:', error.code);
          console.error('   Error stack:', error.stack);
          // Continue even if Firebase save fails
        }
      } else {
        console.warn(`⚠️  Firebase service not available for saving ${events.messageReceived}`);
        console.warn('   firebaseBridge exists:', !!firebaseBridge);
        console.warn('   saveMessageReceivedToFirebase is function:', typeof firebaseBridge?.saveMessageReceivedToFirebase);
      }

      // Broadcast to all connected clients
      broadcastWs(wsPayload);

      // Process message with Social Network Agent chatbot (non-blocking)
      // Support both text and audio messages
      const hasText = data.text && data.text.trim().length > 0;
      const hasAttachments = data.attachments && data.attachments.length > 0;
      
      console.log(`🤖 Checking if chatbot should respond...`);
      console.log(`   chatbotAgent exists: ${!!chatbotAgent}`);
      console.log(`   hasText: ${hasText}`);
      console.log(`   hasAttachments: ${hasAttachments}`);
      console.log(`   text: ${data.text?.substring(0, 50) || '(no text)'}`);
      
      if (chatbotAgent && (hasText || hasAttachments)) {
        console.log(`✅ Triggering chatbot response...`);
        // Process asynchronously without blocking message handling
        handleChatbotReply(
          data.from_phone, 
          data.text || '', 
          data.chat_id, 
          data.service,
          data.attachments || []
        )
          .catch(error => {
            console.error('❌ Error in chatbot response processing:', error);
            console.error('   Stack:', error.stack);
            // Don't block message processing if chatbot fails
          });
      } else {
        console.log(`⚠️  Chatbot not triggered - chatbotAgent: ${!!chatbotAgent}, hasText: ${hasText}, hasAttachments: ${hasAttachments}`);
      }
    });

    // Handle typing indicators
    kafkaConsumer.onEvent(events.typingIndicatorReceived, async (eventData) => {
      const { data } = eventData;
      
      // Save to Firebase
      if (firebaseBridge && typeof firebaseBridge.saveTypingIndicatorToFirebase === 'function') {
        try {
          await firebaseBridge.saveTypingIndicatorToFirebase(events.typingIndicatorReceived, eventData);
          await firebaseBridge.saveKafkaEventToFirebase(events.typingIndicatorReceived, eventData);
          console.log('✅ Typing indicator saved to Firebase');
        } catch (error) {
          console.error(`❌ Error saving ${events.typingIndicatorReceived} to Firebase:`, error);
          // Continue even if Firebase save fails
        }
      }
      
      broadcastWs({
        type: events.typingIndicatorReceived,
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            chatId: data.chat_id,
            display: data.display,
            timestamp: data.timestamp,
          },
        },
      });
    });

    kafkaConsumer.onEvent(events.typingIndicatorRemoved, async (eventData) => {
      const { data } = eventData;
      
      // Save to Firebase
      if (firebaseBridge && typeof firebaseBridge.saveTypingIndicatorToFirebase === 'function') {
        try {
          await firebaseBridge.saveTypingIndicatorToFirebase(events.typingIndicatorRemoved, eventData);
          await firebaseBridge.saveKafkaEventToFirebase(events.typingIndicatorRemoved, eventData);
          console.log('✅ Typing indicator removed saved to Firebase');
        } catch (error) {
          console.error(`❌ Error saving ${events.typingIndicatorRemoved} to Firebase:`, error);
          // Continue even if Firebase save fails
        }
      }
      
      broadcastWs({
        type: events.typingIndicatorRemoved,
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            chatId: data.chat_id,
            display: data.display,
            timestamp: data.timestamp,
          },
        },
      });
    });

    // Handle message.sent events (messages we sent)
    kafkaConsumer.onEvent(events.messageSent, async (eventData) => {
      const { data } = eventData;
      
      // Save to Firebase
      if (firebaseBridge && typeof firebaseBridge.saveMessageSentToFirebase === 'function') {
        try {
          console.log(`💾 Saving ${events.messageSent} to Firebase...`);
          console.log('   Event data:', JSON.stringify({
            event_id: eventData.event_id,
            from_phone: data.from_phone,
            text: data.text?.substring(0, 50) + '...',
            chat_id: data.chat_id
          }));
          
          const messageId = await firebaseBridge.saveMessageSentToFirebase(eventData);
          if (messageId) {
            console.log(`✅ Message sent saved to Firebase ${firebase.collections.messages} collection (ID: ${messageId})`);
          } else {
            console.warn('⚠️  saveMessageSentToFirebase returned null/undefined');
          }
          
          const eventId = await firebaseBridge.saveKafkaEventToFirebase(events.messageSent, eventData);
          if (eventId) {
            console.log(`✅ Kafka event saved to Firebase ${firebase.collections.events} collection (ID: ${eventId})`);
          } else {
            console.warn('⚠️  saveKafkaEventToFirebase returned null/undefined');
          }
        } catch (error) {
          console.error(`❌ Error saving ${events.messageSent} to Firebase:`, error);
          console.error('   Error type:', error.constructor.name);
          console.error('   Error message:', error.message);
          console.error('   Error code:', error.code);
          console.error('   Error stack:', error.stack);
          // Continue even if Firebase save fails
        }
      } else {
        console.warn(`⚠️  Firebase service not available for saving ${events.messageSent}`);
        console.warn('   firebaseBridge exists:', !!firebaseBridge);
        console.warn('   saveMessageSentToFirebase is function:', typeof firebaseBridge?.saveMessageSentToFirebase);
      }
      
      broadcastWs({
        type: events.messageSent,
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            from: data.from_phone,
            text: data.text,
            chatId: data.chat_id,
            sentAt: data.sent_at,
            messageId: data.id,
          },
        },
      });
    });

    kafkaConsumerHandle = kafkaConsumer;
    return kafkaConsumer;
  } catch (error) {
    console.error('Error setting up consumer:', error);
    throw error;
  }
}

/**
 * Process incoming message with chatbot and send response
 */
async function handleChatbotReply(phoneNumber, messageText, chatId, service = messaging.defaultService, attachments = []) {
  try {
    if (!chatbotAgent) {
      console.warn('⚠️  Chatbot agent not available');
      return;
    }

    if (!firebaseBridge) {
      console.warn('⚠️  Firebase service not available for chatbot');
      return;
    }

    const db = firebaseBridge.initializeFirebase();
    if (!db) {
      console.warn('⚠️  Firebase database not available for chatbot');
      return;
    }

    console.log('🤖 Processing message with Social Network Agent (Claude 3.5 Sonnet)...');
    console.log(`   Phone: ${phoneNumber}, Chat: ${chatId}`);
    if (attachments && attachments.length > 0) {
      console.log(`   Attachments: ${attachments.length} file(s)`);
    }

    // Get personalized response from chatbot (with audio/image support)
    const result = await chatbotAgent.processIncomingMessage(
      phoneNumber,
      messageText,
      chatId,
      db,
      attachments || []
    );

    if (!result || !result.response) {
      console.warn('⚠️  No response generated by chatbot');
      return;
    }

    const responseText = result.response;
    console.log(`✅ Chatbot generated response: ${responseText.substring(0, 100)}...`);

    // Send reply via Agentic API
    if (!agenticClient) {
      console.warn('⚠️  API client not available, cannot send chatbot response');
      return;
    }

    try {
      console.log(`📤 Sending chatbot response to Agentic API...`);
      console.log(`   Chat ID: ${chatId}`);
      console.log(`   Response: ${responseText.substring(0, 50)}...`);
      
      // Use same format as listen-and-reply.js (npm run reply)
      const replyResponse = await agenticClient.createChatMessage(chatId, {
        message: {
          text: responseText,
        },
      });

      console.log('✅ Chatbot response sent via Agentic API');
      console.log(`   Status: ${replyResponse.status}`);
      console.log(`   Message ID: ${replyResponse.data?.id || 'unknown'}`);
      console.log(`   Full response:`, JSON.stringify(replyResponse.data, null, 2));

      // Save chatbot response to Firebase for conversation history
      try {
        const admin = require('firebase-admin');
        await db.collection(firebase.collections.messages).add({
          eventType: events.messageSent,
          phoneNumber: phoneNumber,
          chatId: chatId,
          messageText: responseText,
          text: responseText,
          service: service || messaging.defaultService,
          isBotResponse: true,
          botType: 'social_network_agent',
          originalMessage: messageText,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        });
        console.log('✅ Chatbot response saved to Firebase');
      } catch (firebaseError) {
        console.error('❌ Error saving chatbot response to Firebase:', firebaseError);
        // Continue even if save fails
      }

      // Broadcast chatbot response to connected clients
      broadcastWs({
        type: events.messageSent,
        event: {
          id: replyResponse.data?.id || null,
          createdAt: new Date().toISOString(),
          data: {
            from: phoneNumber,
            text: responseText,
            chatId: chatId,
            sentAt: new Date().toISOString(),
            isBotResponse: true,
            botType: 'social_network_agent'
          }
        }
      });

    } catch (apiError) {
      console.error('❌ Error sending chatbot response via API:');
      console.error('   Error message:', apiError.message);
      console.error('   Error status:', apiError.status);
      console.error('   Error data:', JSON.stringify(apiError.data || apiError, null, 2));
      console.error('   Chat ID:', chatId);
      console.error('   Response text:', responseText);
      // Don't throw - allow system to continue
    }

  } catch (error) {
    console.error('❌ Error in handleChatbotReply:', error);
    console.error('   Stack:', error.stack);
    // Don't throw - allow message processing to continue
  }
}

// Initialize Claude AI (Claude 3.5 Sonnet - supports multimodal including audio transcription)
const claudeClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

if (!process.env.CLAUDE_API_KEY) {
  console.warn('⚠️  CLAUDE_API_KEY not set in environment variables');
}

// Initialize Social Network Agent Chatbot
let chatbotAgent = null;
try {
  chatbotAgent = new SocialNetworkAgent();
  console.log('✅ Social Network Agent chatbot initialized');
} catch (error) {
  console.warn('⚠️  Could not initialize chatbot agent:', error.message);
  chatbotAgent = null;
}

// ==================== REST API Endpoints ====================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    listening: listenerActive,
  });
});

/**
 * AI-Powered Matching endpoint using Claude
 * POST /api/matching/find
 * Body: { phoneNumber: string }
 */
app.post('/api/matching/find', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log('🔍 Finding matches for phone number:', phoneNumber);

    // Get user data from Firebase
    let db = null;
    let userData = null;
    
    if (firebaseBridge) {
      try {
        db = firebaseBridge.initializeFirebase();
        
        // Get user data
        try {
          const userQuery = db.collection(firebase.collections.users).where('phoneNumber', '==', phoneNumber);
          const userSnapshot = await userQuery.get();
          
          if (!userSnapshot.empty) {
            userData = userSnapshot.docs[0].data();
            console.log('✅ User data from Firebase:', userData);
          }
        } catch (error) {
          console.warn('Error fetching user data:', error.message);
        }
      } catch (firebaseError) {
        console.warn('Firebase initialization error:', firebaseError.message);
        // Continue without Firebase
      }
    }

    // Get conversation history from Firebase (Kafka messages)
    const conversations = [];
    
    if (db) {
      try {
        // Try configured messages collection - get all messages and filter by phone number
        const messagesSnapshot = await db.collection(firebase.collections.messages)
          .orderBy('timestamp', 'desc')
          .limit(100)
          .get();
        
        messagesSnapshot.forEach(doc => {
          const msg = doc.data();
          const msgPhone = msg.phoneNumber || msg.from_phone || msg.data?.from_phone || msg.data?.from || '';
          
          // Check if message is from this phone number
          if (msgPhone === phoneNumber || msgPhone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')) {
            const text = msg.text || msg.message || msg.data?.text || msg.data?.message || '';
            if (text && text.length > 0) {
              conversations.push({
                text: text,
                type: msg.type || msg.eventType || 'message',
                timestamp: msg.timestamp || msg.createdAt
              });
            }
          }
        });
        
        console.log(`✅ Found ${conversations.length} conversation messages`);
      } catch (error) {
        console.warn('Error fetching conversations:', error.message);
        // Continue without conversation history
      }
    }

    console.log(`✅ Found ${conversations.length} conversation messages`);

    // Use mock data from matching.json for matching (no HasData API)
    console.log('🔍 Loading mock matching data from matching.json...');
    let mockProfiles = [];
    let finalMatches = [];
    
    try {
      const matchingDataPath = path.join(__dirname, 'matching.json');
      const matchingData = JSON.parse(fs.readFileSync(matchingDataPath, 'utf8'));
      mockProfiles = matchingData.profiles || [];
      console.log(`✅ Loaded ${mockProfiles.length} mock profiles from matching.json`);
      
      // Match profiles based on user data
      finalMatches = matchProfilesFromMock(userData, conversations, mockProfiles);
      console.log(`✅ Found ${finalMatches.length} matched profiles from mock data`);
    } catch (mockError) {
      console.error('❌ Error loading mock data:', mockError.message);
      console.error('   Stack:', mockError.stack);
      finalMatches = [];
    }

    // Save matches to Firebase
    if (finalMatches.length > 0 && firebaseBridge && db) {
      try {
        const admin = require('firebase-admin');
        await db.collection('user_matches').add({
          phoneNumber,
          userData,
          matches: finalMatches,
          matchCount: finalMatches.length,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString(),
          type: 'mock_data',
          source: 'matching.json'
        });
        console.log('✅ Matches saved to Firebase');
      } catch (firebaseError) {
        console.error('Error saving to Firebase:', firebaseError);
        // Don't fail the request if Firebase save fails
      }
    }

    res.json({
      success: true,
      matches: finalMatches,
      count: finalMatches.length,
      source: 'mock_data'
    });

  } catch (error) {
    console.error('❌ Error in matching endpoint:', error);
    res.status(500).json({
      error: 'Failed to find matches',
      message: error.message
    });
  }
});

/**
 * Parse HasData SERP API response to extract LinkedIn profiles
 */
function parseHasDataResponse(data) {
  const matches = [];
  
  // Extract from organicResults
  if (data?.organicResults && Array.isArray(data.organicResults)) {
    data.organicResults.forEach((result) => {
      if (result.link && result.link.includes('linkedin.com')) {
        matches.push({
          title: result.title || 'LinkedIn Profile',
          link: result.link,
          snippet: result.snippet || result.description || '',
          thumbnail: result.thumbnail || null
        });
      }
    });
  }
  
  // Extract from organic_results (alternative format)
  if (data?.organic_results && Array.isArray(data.organic_results)) {
    data.organic_results.forEach((result) => {
      if (result.link && result.link.includes('linkedin.com')) {
        // Avoid duplicates
        if (!matches.find(m => m.link === result.link)) {
          matches.push({
            title: result.title || 'LinkedIn Profile',
            link: result.link,
            snippet: result.snippet || result.description || '',
            thumbnail: result.thumbnail || null
          });
        }
      }
    });
  }
  
  return matches;
}

/**
 * Extract name from LinkedIn profile title
 */
function extractNameFromTitle(title) {
  if (!title) return 'LinkedIn User';
  
  // Remove common LinkedIn suffixes
  let name = title
    .replace(/\s*-\s*LinkedIn.*$/i, '')
    .replace(/\s*\|\s*LinkedIn.*$/i, '')
    .replace(/\s*on\s+LinkedIn.*$/i, '')
    .trim();
  
  // Extract first part (usually the name)
  const parts = name.split(/\s*[|\-–]\s*/);
  return parts[0] || 'LinkedIn User';
}

/**
 * Extract initials from title/name
 */
function extractInitials(title) {
  const name = extractNameFromTitle(title);
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Generate avatar color based on index
 */
function generateAvatarColor(index) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA',
    '#FCBAD3', '#A8E6CF', '#FFD3A5', '#FF9A8B', '#C7CEEA',
    '#FF8B94', '#A8DADC', '#FFB6C1', '#E8A87C', '#C38D9E',
    '#85CDCA', '#F4A261', '#FFD89B', '#FFB347', '#FFA07A'
  ];
  return colors[index % colors.length];
}

/**
 * Extract location from snippet
 */
function extractLocationFromSnippet(snippet) {
  if (!snippet) return '';
  
  // Common location patterns
  const locationPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})/g, // City, State
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+([A-Z]{2})/g,  // City State
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi           // "in City"
  ];
  
  for (const pattern of locationPatterns) {
    const match = snippet.match(pattern);
    if (match) {
      return match[0].replace(/^in\s+/i, '');
    }
  }
  
  return '';
}

/**
 * Extract profession from snippet
 */
function extractProfessionFromSnippet(snippet) {
  if (!snippet) return '';
  
  const professions = [
    'Software Engineer', 'Doctor', 'Engineer', 'Designer', 'Manager',
    'Developer', 'Consultant', 'Analyst', 'Director', 'Specialist'
  ];
  
  for (const profession of professions) {
    if (snippet.toLowerCase().includes(profession.toLowerCase())) {
      return profession;
    }
  }
  
  return '';
}

function getMockProfiles() {
  return [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Cardiologist | Stanford Medicine",
      bio: "Leading cardiologist specializing in preventive heart care. Passionate about AI in healthcare.",
      profession: "Doctor",
      specialty: "Cardiology",
      location: "San Francisco, CA",
      avatarColor: "#FF6B6B",
      initials: "SC",
      interests: ["Healthcare", "AI", "Research", "Wellness"],
      linkedin: "https://linkedin.com/in/sarah-chen-md"
    },
    {
      id: 2,
      name: "Alex Rodriguez",
      title: "Senior Software Engineer | Google",
      bio: "Full-stack developer building scalable cloud infrastructure. Open source contributor.",
      profession: "Tech",
      specialty: "Software Engineering",
      location: "Mountain View, CA",
      avatarColor: "#4ECDC4",
      initials: "AR",
      interests: ["Cloud Computing", "Open Source", "System Design"],
      linkedin: "https://linkedin.com/in/alex-rodriguez-dev"
    },
    {
      id: 3,
      name: "Dr. Michael Park",
      title: "Neurosurgeon | Mayo Clinic",
      bio: "Expert in minimally invasive brain surgery. Published researcher in neuroscience.",
      profession: "Doctor",
      specialty: "Neurosurgery",
      location: "Rochester, MN",
      avatarColor: "#95E1D3",
      initials: "MP",
      interests: ["Neuroscience", "Surgery", "Research", "Innovation"],
      linkedin: "https://linkedin.com/in/michael-park-md"
    },
    {
      id: 4,
      name: "Emma Thompson",
      title: "Product Manager | Apple",
      bio: "Leading product strategy for consumer devices. Passionate about user experience design.",
      profession: "Tech",
      specialty: "Product Management",
      location: "Cupertino, CA",
      avatarColor: "#F38181",
      initials: "ET",
      interests: ["Product Design", "UX", "Innovation", "Technology"],
      linkedin: "https://linkedin.com/in/emma-thompson-pm"
    },
    {
      id: 5,
      name: "Dr. James Wilson",
      title: "Pediatrician | Children's Hospital",
      bio: "Dedicated to children's health and wellness. Advocate for preventive care.",
      profession: "Doctor",
      specialty: "Pediatrics",
      location: "Boston, MA",
      avatarColor: "#AA96DA",
      initials: "JW",
      interests: ["Pediatrics", "Public Health", "Childcare", "Education"],
      linkedin: "https://linkedin.com/in/james-wilson-md"
    },
    {
      id: 6,
      name: "David Kim",
      title: "AI Research Scientist | OpenAI",
      bio: "Working on next-generation language models. PhD in Machine Learning from MIT.",
      profession: "Tech",
      specialty: "AI Research",
      location: "San Francisco, CA",
      avatarColor: "#FCBAD3",
      initials: "DK",
      interests: ["AI", "Machine Learning", "Research", "Innovation"],
      linkedin: "https://linkedin.com/in/david-kim-ai"
    },
    {
      id: 7,
      name: "Dr. Lisa Anderson",
      title: "Dermatologist | Private Practice",
      bio: "Board-certified dermatologist specializing in cosmetic and medical dermatology.",
      profession: "Doctor",
      specialty: "Dermatology",
      location: "New York, NY",
      avatarColor: "#FFD93D",
      initials: "LA",
      interests: ["Dermatology", "Cosmetic Medicine", "Wellness", "Beauty"],
      linkedin: "https://linkedin.com/in/lisa-anderson-md"
    },
    {
      id: 8,
      name: "Ryan Martinez",
      title: "DevOps Engineer | Amazon AWS",
      bio: "Building reliable cloud infrastructure. Expert in Kubernetes and containerization.",
      profession: "Tech",
      specialty: "DevOps",
      location: "Seattle, WA",
      avatarColor: "#6BCB77",
      initials: "RM",
      interests: ["Cloud", "DevOps", "Kubernetes", "Infrastructure"],
      linkedin: "https://linkedin.com/in/ryan-martinez-devops"
    },
    {
      id: 9,
      name: "Dr. Priya Patel",
      title: "Oncologist | Memorial Sloan Kettering",
      bio: "Leading cancer researcher and clinician. Focus on personalized cancer treatment.",
      profession: "Doctor",
      specialty: "Oncology",
      location: "New York, NY",
      avatarColor: "#FF8B94",
      initials: "PP",
      interests: ["Oncology", "Research", "Personalized Medicine", "Innovation"],
      linkedin: "https://linkedin.com/in/priya-patel-md"
    },
    {
      id: 10,
      name: "Sophie Chen",
      title: "Data Scientist | Netflix",
      bio: "Analyzing user behavior to improve content recommendations. ML engineer and statistician.",
      profession: "Tech",
      specialty: "Data Science",
      location: "Los Gatos, CA",
      avatarColor: "#A8E6CF",
      initials: "SC",
      interests: ["Data Science", "ML", "Analytics", "Entertainment"],
      linkedin: "https://linkedin.com/in/sophie-chen-ds"
    },
    {
      id: 11,
      name: "Dr. Robert Taylor",
      title: "Emergency Medicine | Johns Hopkins",
      bio: "Emergency physician with expertise in trauma care. Medical educator and researcher.",
      profession: "Doctor",
      specialty: "Emergency Medicine",
      location: "Baltimore, MD",
      avatarColor: "#FFD3A5",
      initials: "RT",
      interests: ["Emergency Medicine", "Trauma", "Education", "Public Health"],
      linkedin: "https://linkedin.com/in/robert-taylor-md"
    },
    {
      id: 12,
      name: "Jordan Lee",
      title: "Cybersecurity Engineer | Microsoft",
      bio: "Protecting enterprise systems from threats. Expert in zero-trust architecture.",
      profession: "Tech",
      specialty: "Cybersecurity",
      location: "Redmond, WA",
      avatarColor: "#C7CEEA",
      initials: "JL",
      interests: ["Cybersecurity", "Infrastructure", "Privacy", "Technology"],
      linkedin: "https://linkedin.com/in/jordan-lee-security"
    },
    {
      id: 13,
      name: "Dr. Maria Garcia",
      title: "Psychiatrist | Harvard Medical School",
      bio: "Specializing in mental health and wellness. Advocate for accessible mental healthcare.",
      profession: "Doctor",
      specialty: "Psychiatry",
      location: "Boston, MA",
      avatarColor: "#FFB6C1",
      initials: "MG",
      interests: ["Mental Health", "Wellness", "Education", "Public Health"],
      linkedin: "https://linkedin.com/in/maria-garcia-md"
    },
    {
      id: 14,
      name: "Chris Johnson",
      title: "Blockchain Developer | Coinbase",
      bio: "Building decentralized applications. Expert in smart contracts and Web3 technologies.",
      profession: "Tech",
      specialty: "Blockchain",
      location: "San Francisco, CA",
      avatarColor: "#FF9A8B",
      initials: "CJ",
      interests: ["Blockchain", "Web3", "Cryptocurrency", "Innovation"],
      linkedin: "https://linkedin.com/in/chris-johnson-blockchain"
    },
    {
      id: 15,
      name: "Dr. Kevin Brown",
      title: "Orthopedic Surgeon | Cleveland Clinic",
      bio: "Specializing in sports medicine and joint replacement. Team physician for professional athletes.",
      profession: "Doctor",
      specialty: "Orthopedics",
      location: "Cleveland, OH",
      avatarColor: "#A8DADC",
      initials: "KB",
      interests: ["Sports Medicine", "Surgery", "Athletics", "Innovation"],
      linkedin: "https://linkedin.com/in/kevin-brown-md"
    },
    {
      id: 16,
      name: "Taylor Swift",
      title: "Mobile App Developer | Meta",
      bio: "Creating engaging mobile experiences. iOS and Android expert with focus on performance.",
      profession: "Tech",
      specialty: "Mobile Development",
      location: "Menlo Park, CA",
      avatarColor: "#FFD89B",
      initials: "TS",
      interests: ["Mobile", "iOS", "Android", "UX"],
      linkedin: "https://linkedin.com/in/taylor-swift-mobile"
    },
    {
      id: 17,
      name: "Dr. Amanda White",
      title: "Radiologist | UCSF Medical Center",
      bio: "Expert in medical imaging and AI-assisted diagnostics. Published researcher.",
      profession: "Doctor",
      specialty: "Radiology",
      location: "San Francisco, CA",
      avatarColor: "#E8A87C",
      initials: "AW",
      interests: ["Radiology", "AI", "Medical Imaging", "Research"],
      linkedin: "https://linkedin.com/in/amanda-white-md"
    },
    {
      id: 18,
      name: "Morgan Davis",
      title: "Cloud Architect | Microsoft Azure",
      bio: "Designing scalable cloud solutions for enterprise clients. Multi-cloud expert.",
      profession: "Tech",
      specialty: "Cloud Architecture",
      location: "Seattle, WA",
      avatarColor: "#C38D9E",
      initials: "MD",
      interests: ["Cloud", "Architecture", "Enterprise", "Scalability"],
      linkedin: "https://linkedin.com/in/morgan-davis-cloud"
    },
    {
      id: 19,
      name: "Dr. Jennifer Kim",
      title: "Anesthesiologist | UCLA Health",
      bio: "Ensuring patient safety during surgery. Expert in pain management and critical care.",
      profession: "Doctor",
      specialty: "Anesthesiology",
      location: "Los Angeles, CA",
      avatarColor: "#85CDCA",
      initials: "JK",
      interests: ["Anesthesiology", "Patient Safety", "Critical Care", "Medicine"],
      linkedin: "https://linkedin.com/in/jennifer-kim-md"
    },
    {
      id: 20,
      name: "Casey Wilson",
      title: "Frontend Engineer | Stripe",
      bio: "Building beautiful, accessible web interfaces. React and TypeScript enthusiast.",
      profession: "Tech",
      specialty: "Frontend Development",
      location: "San Francisco, CA",
      avatarColor: "#F4A261",
      initials: "CW",
      interests: ["Frontend", "React", "TypeScript", "Design"],
      linkedin: "https://linkedin.com/in/casey-wilson-frontend"
    }
  ];
}

function buildAnalysisPrompt(userData, conversations, mockProfiles) {
  let prompt = `You are an expert matchmaking AI. Analyze the following user profile, conversation history, and available profiles to select the best matches.

USER PROFILE:
${userData ? JSON.stringify(userData, null, 2) : 'No profile data available'}

CONVERSATION HISTORY (recent messages):
${conversations.length > 0 ? conversations.map((c, i) => `${i + 1}. ${c.text}`).join('\n') : 'No conversation history'}

AVAILABLE PROFILES (20 diverse professionals from doctors to tech):
${JSON.stringify(mockProfiles, null, 2)}

Based on this information:
1. Analyze the user's interests, profession, and conversation themes
2. Select 5-8 profiles that would be the best matches
3. Score each selected profile (0-100) based on relevance
4. Provide reasoning for each match

Respond in JSON format:
{
  "selectedMatches": [
    {
      "profileId": 1,
      "score": 95,
      "reason": "Strong match because..."
    },
    ...
  ],
  "analysis": "Brief analysis of why these matches were selected"
}`;

  return prompt;
}

/**
 * Match profiles from mock data (matching.json)
 * Returns all profiles formatted for the frontend
 */
function matchProfilesFromMock(userData, conversations, mockProfiles) {
  if (!mockProfiles || mockProfiles.length === 0) {
    return [];
  }

  // Analyze user data to score and select relevant matches
  const userText = JSON.stringify(userData || {}).toLowerCase();
  const conversationText = conversations.map(c => c.text).join(' ').toLowerCase();
  const allText = (userText + ' ' + conversationText).toLowerCase();
  
  // Score each profile based on relevance
  const scored = mockProfiles.map(profile => {
    let score = 50; // Base score
    
    // Check profession match
    if (userData?.profession) {
      const userProfession = userData.profession.toLowerCase();
      const profileProfession = (profile.profession || '').toLowerCase();
      if (profileProfession === userProfession || profileProfession.includes(userProfession) || userProfession.includes(profileProfession)) {
        score += 20;
      }
    }
    
    // Check location match (NYC or CA)
    if (userData?.location) {
      const userLocation = userData.location.toLowerCase();
      const profileLocation = (profile.location || '').toLowerCase();
      if (profileLocation.includes('new york') && userLocation.includes('new york')) {
        score += 15;
      } else if ((profileLocation.includes('california') || profileLocation.includes('ca') || profileLocation.includes('san francisco')) && 
                 (userLocation.includes('california') || userLocation.includes('ca') || userLocation.includes('san francisco'))) {
        score += 15;
      }
    }
    
    // Check skills match
    if (userData?.skills && Array.isArray(userData.skills) && profile.skills && Array.isArray(profile.skills)) {
      const userSkills = userData.skills.map(s => s.toLowerCase());
      const matchingSkills = profile.skills.filter(skill => 
        userSkills.some(us => skill.toLowerCase().includes(us) || us.includes(skill.toLowerCase()))
      );
      score += matchingSkills.length * 5;
    }
    
    // Check interests match
    if (profile.interests && Array.isArray(profile.interests)) {
      profile.interests.forEach(interest => {
        if (allText.includes(interest.toLowerCase())) {
          score += 10;
        }
      });
    }
    
    // Check specialty match
    if (profile.specialty && allText.includes(profile.specialty.toLowerCase())) {
      score += 15;
    }
    
    // Check bio keywords
    if (profile.bio) {
      const bioWords = profile.bio.toLowerCase().split(' ');
      bioWords.forEach(word => {
        if (word.length > 4 && allText.includes(word)) {
          score += 5;
        }
      });
    }
    
    // Boost score for tech professionals if user is in tech
    if (userData?.profession && userData.profession.toLowerCase().includes('tech')) {
      if (profile.profession && profile.profession.toLowerCase() === 'tech') {
        score += 10;
      }
    }
    
    return {
      id: `mock_${profile.id}`,
      name: profile.name,
      title: profile.title,
      bio: profile.bio,
      linkedin: profile.linkedin,
      avatarColor: profile.avatarColor || generateAvatarColor(profile.id - 1),
      initials: profile.initials || extractInitials(profile.name),
      location: profile.location,
      profession: profile.profession,
      specialty: profile.specialty,
      company: profile.company,
      companyType: profile.companyType,
      skills: profile.skills || [],
      interests: profile.interests || [],
      score: Math.min(100, score),
      matchReason: score > 80 ? 'Excellent match based on your profile and interests' : 
                   score > 70 ? 'Strong match based on your profile' : 
                   score > 60 ? 'Good professional match' : 
                   'Diverse professional connection in tech'
    };
  });
  
  // Sort by score and return all matches (or top 20 if too many)
  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 30); // Return top 30 matches
}

function selectMatchesFromMock(userData, conversations, mockProfiles) {
  // Legacy function - redirects to matchProfilesFromMock
  return matchProfilesFromMock(userData, conversations, mockProfiles);
}

function parseClaudeMatchSelection(analysis, mockProfiles) {
  try {
    // Try to extract JSON from Claude's response
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.selectedMatches && Array.isArray(parsed.selectedMatches)) {
        // Map selected profile IDs to full profile data
        const matches = parsed.selectedMatches
          .map(selection => {
            const profile = mockProfiles.find(p => p.id === selection.profileId);
            if (profile) {
              return {
                ...profile,
                score: selection.score || 50,
                matchReason: selection.reason || 'Good match based on profile analysis'
              };
            }
            return null;
          })
          .filter(m => m !== null)
          .sort((a, b) => b.score - a.score);
        
        return matches;
      }
    }
  } catch (e) {
    console.warn('Could not parse Claude response as JSON, using fallback');
  }

  // Return empty to trigger fallback selection
  return [];
}

function extractLinkedInProfiles(data) {
  const profiles = [];
  
  if (data?.organicResults) {
    data.organicResults.forEach(result => {
      if (result.link && result.link.includes('linkedin.com')) {
        profiles.push({
          title: result.title || 'LinkedIn Profile',
          link: result.link,
          snippet: result.snippet || '',
          thumbnail: result.thumbnail || null
        });
      }
    });
  }
  
  if (data?.organic_results) {
    data.organic_results.forEach(result => {
      if (result.link && result.link.includes('linkedin.com')) {
        profiles.push({
          title: result.title || 'LinkedIn Profile',
          link: result.link,
          snippet: result.snippet || '',
          thumbnail: result.thumbnail || null
        });
      }
    });
  }

  return profiles;
}

async function scoreMatchesWithClaude(matches, userData, conversations, matchingCriteria) {
  if (matches.length === 0) return [];

  // Build prompt for Claude to score matches
  const scoringPrompt = `You are a matchmaking AI. Score and rank these LinkedIn profiles based on how well they match the user.

USER PROFILE:
${userData ? JSON.stringify(userData, null, 2) : 'No profile data'}

CONVERSATION THEMES:
${conversations.length > 0 ? conversations.map(c => c.text).join(' ') : 'No conversations'}

MATCHING CRITERIA:
${JSON.stringify(matchingCriteria, null, 2)}

LINKEDIN PROFILES TO SCORE:
${JSON.stringify(matches.slice(0, 20), null, 2)}

For each profile, provide a relevance score (0-100) and brief explanation.
Respond in JSON format:
{
  "scoredMatches": [
    {
      "index": 0,
      "score": 85,
      "reason": "Strong match because..."
    },
    ...
  ]
}`;

  try {
    const response = await claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: scoringPrompt
      }]
    });

    const analysis = response.content[0].text;
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const scored = matches.map((match, index) => {
        const scored = parsed.scoredMatches?.find(s => s.index === index);
        return {
          ...match,
          score: scored?.score || 50,
          matchReason: scored?.reason || ''
        };
      });
      
      return scored.sort((a, b) => b.score - a.score);
    }
  } catch (error) {
    console.error('Error scoring with Claude:', error);
  }

  // Fallback: return matches as-is
  return matches.map(m => ({ ...m, score: 50, matchReason: '' }));
}

/**
 * Start listening for messages
 * POST /api/listener/start
 */
app.post('/api/listener/start', async (req, res) => {
  try {
    if (listenerActive) {
      return res.status(400).json({
        error: 'Listener is already running',
        listening: true,
      });
    }

    const consumer = ensureConsumer();
    
    await consumer.connect();
    await consumer.start();
    
    listenerActive = true;

    res.json({
      success: true,
      message: 'Listener started successfully',
      listening: true,
    });
  } catch (error) {
    console.error('Error starting listener:', error);
    res.status(500).json({
      error: 'Failed to start listener',
      message: error.message,
    });
  }
});

/**
 * Stop listening for messages
 * POST /api/listener/stop
 */
app.post('/api/listener/stop', async (req, res) => {
  try {
    if (!listenerActive || !kafkaConsumerHandle) {
      return res.status(400).json({
        error: 'Listener is not running',
        listening: false,
      });
    }

    await kafkaConsumerHandle.stop();
    kafkaConsumerHandle = null;
    listenerActive = false;

    res.json({
      success: true,
      message: 'Listener stopped successfully',
      listening: false,
    });
  } catch (error) {
    console.error('Error stopping listener:', error);
    res.status(500).json({
      error: 'Failed to stop listener',
      message: error.message,
    });
  }
});

/**
 * Get listener status
 * GET /api/listener/status
 */
app.get('/api/listener/status', (req, res) => {
  res.json({
    listening: listenerActive,
    connected: kafkaConsumerHandle !== null,
    clients: wsClients.size,
  });
});

/**
 * Send a reply to a chat
 * POST /api/reply
 * Body: { chatId: string, message: string }
 */
app.post('/api/reply', async (req, res) => {
  try {
    if (!agenticClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure AGENTIC_API_KEY and AGENTIC_API_BASE_URL environment variables',
      });
    }

    const { chatId, message } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: 'chatId is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'message is required and cannot be empty',
      });
    }

    const response = await agenticClient.createChatMessage(chatId, {
      message: {
        text: message.trim(),
      },
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        messageId: response.data.id,
        chatId: response.data.chat_id,
        text: response.data.text,
        sentAt: response.data.sent_at,
      },
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(error.status || 500).json({
      error: 'Failed to send reply',
      message: error.message,
      details: error.data,
    });
  }
});

/**
 * Get chat messages
 * GET /api/chats/:chatId/messages
 */
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    if (!agenticClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure AGENTIC_API_KEY and AGENTIC_API_BASE_URL environment variables',
      });
    }

    const { chatId } = req.params;
    const response = await agenticClient.listChatMessages(chatId);

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(error.status || 500).json({
      error: 'Failed to fetch messages',
      message: error.message,
      details: error.data,
    });
  }
});

/**
 * Check if phone number exists in Kafka events
 * GET /api/kafka/check-phone
 */
app.get('/api/kafka/check-phone', (req, res) => {
  try {
    const { phone_number } = req.query;
    
    if (!phone_number) {
      return res.status(400).json({
        error: 'phone_number parameter is required',
      });
    }

    // Normalize phone number (remove formatting)
    const normalizedPhone = phone_number.replace(/\D/g, '');
    
    // Check if phone number exists in Kafka events
    const foundEvents = eventBuffer.filter(event => {
      const eventPhone = event.phoneNumber?.replace(/\D/g, '') || '';
      return eventPhone === normalizedPhone || 
             eventPhone.endsWith(normalizedPhone) || 
             normalizedPhone.endsWith(eventPhone);
    });

    const exists = foundEvents.length > 0;
    
    res.json({
      success: true,
      exists: exists,
      phoneNumber: phone_number,
      eventCount: foundEvents.length,
      latestEvent: foundEvents.length > 0 ? foundEvents[foundEvents.length - 1] : null,
    });
  } catch (error) {
    console.error('Error checking phone number:', error);
    res.status(500).json({
      error: 'Failed to check phone number',
      message: error.message,
    });
  }
});

/**
 * Get all chats
 * GET /api/chats
 */
app.get('/api/chats', async (req, res) => {
  try {
    if (!agenticClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure AGENTIC_API_KEY and AGENTIC_API_BASE_URL environment variables',
      });
    }

    const { phone_number, page, per_page } = req.query;
    const response = await agenticClient.listChats({
      phoneNumber: phone_number,
      page: page ? parseInt(page) : undefined,
      perPage: per_page ? parseInt(per_page) : undefined,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(error.status || 500).json({
      error: 'Failed to fetch chats',
      message: error.message,
      details: error.data,
    });
  }
});

/**
 * Create chat
 * POST /api/chats
 */
app.post('/api/chats', async (req, res) => {
  try {
    if (!agenticClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure AGENTIC_API_KEY and AGENTIC_API_BASE_URL environment variables',
      });
    }

    const response = await agenticClient.createChat(req.body);

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(error.status || 500).json({
      error: 'Failed to create chat',
      message: error.message,
      details: error.data,
    });
  }
});

// ==================== WebSocket Connection ====================

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  wsClients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to iMessage listener',
    listening: listenerActive,
    timestamp: new Date().toISOString(),
  }));

  // Handle client messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'send_reply') {
        const { chatId, message: messageText } = data;
        
        if (!chatId || !messageText) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'chatId and message are required',
          }));
          return;
        }

        if (!agenticClient) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'API client not initialized. Please configure API credentials.',
          }));
          return;
        }

        try {
          const response = await agenticClient.createChatMessage(chatId, {
            message: {
              text: messageText,
            },
          });

          ws.send(JSON.stringify({
            type: 'reply_sent',
            success: true,
            data: {
              messageId: response.data.id,
              chatId: response.data.chat_id,
              text: response.data.text,
              sentAt: response.data.sent_at,
            },
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to send reply',
            error: error.message,
            details: error.data,
          }));
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  if (kafkaConsumerHandle && listenerActive) {
    try {
      await kafkaConsumerHandle.stop();
    } catch (error) {
      console.error('Error stopping consumer:', error);
    }
  }

  // Close all WebSocket connections
  wsClients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 8000; // Changed to 8000 to match user's access
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Cloud Run

server.listen(PORT, HOST, () => {
  console.log(`🚀 iMessage API Server running on ${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}`);
  console.log(`🌐 REST API: http://${HOST}:${PORT}/api`);
  console.log(`\n💡 Start the listener: POST http://${HOST}:${PORT}/api/listener/start`);
  
  // Log environment info
  console.log(`\n📋 Environment:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${PORT}`);
  console.log(`   HOST: ${HOST}`);
});

module.exports = app;
