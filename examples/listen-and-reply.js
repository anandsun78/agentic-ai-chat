const KafkaConsumer = require('../kafka/consumer');
const AgenticAPIClient = require('../api/agentic-client');
const readline = require('readline');

/**
 * Listen for iMessage messages and allow sending replies
 * Creates an interactive terminal for inbound/outbound messages
 *
 * Usage: node examples/listen-and-reply.js
 */
async function listenAndReply() {
  // Use unique consumer group to avoid conflicts
  process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

  const kafkaListener = new KafkaConsumer();
  const agenticClient = new AgenticAPIClient();
  
  // Create readline interface for user input
  const inputLoop = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let activeChatId = null;
  let activeFromPhone = null;

  console.log('🔊 Starting iMessage Listener with Reply Capability...');
  console.log('📱 Listening for messages on Kafka topic...\n');
  console.log('💡 Commands:');
  console.log('   - Type a message and press Enter to reply to the last received message');
  console.log('   - Type "exit" or "quit" to stop\n');
  console.log('='.repeat(60) + '\n');

  // Register handler for message.received events
  kafkaListener.onEvent('message.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    
    activeChatId = payload.chat_id;
    activeFromPhone = payload.from_phone;
    
    console.log('\n' + '='.repeat(60));
    console.log('📱 NEW iMESSAGE RECEIVED');
    console.log('='.repeat(60));
    console.log(`📞 From: ${payload.from_phone || 'Unknown'}`);
    console.log(`💬 Message: ${payload.text || '(no text)'}`);
    console.log(`🆔 Chat ID: ${payload.chat_id || 'Unknown'}`);
    console.log(`📅 Sent At: ${payload.sent_at || 'Unknown'}`);
    console.log('='.repeat(60));
    console.log('\n💬 Type your reply (or "exit" to quit):');
  });

  // Register handler for typing indicators
  kafkaListener.onEvent('typing_indicator.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`\n⌨️  [TYPING] Chat ${payload.chat_id || 'Unknown'} - Someone is typing...`);
  });

  kafkaListener.onEvent('typing_indicator.removed', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`\n⌨️  [STOPPED] Chat ${payload.chat_id || 'Unknown'} - Typing stopped`);
  });

  // Handle user input for replies
  inputLoop.on('line', async (input) => {
    const message = input.trim();

    if (!message) {
      return;
    }

    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log('\n🛑 Shutting down...');
      await kafkaListener.stop();
      inputLoop.close();
      process.exit(0);
    }

    if (!activeChatId) {
      console.log('❌ No message received yet. Please wait for a message first.\n');
      return;
    }

    try {
      console.log(`\n📤 Sending reply to chat ${activeChatId}...`);
      
      const response = await agenticClient.createChatMessage(activeChatId, {
        message: {
          text: message,
        },
      });

      console.log('✅ Reply sent successfully!');
      console.log(`   Message ID: ${response.data.id}`);
      console.log(`   Sent to: ${activeFromPhone || 'Unknown'}\n`);
      console.log('💬 Waiting for next message... (or type "exit" to quit)\n');
    } catch (error) {
      console.error('\n❌ Error sending reply:');
      console.error(`   Status: ${error.status}`);
      console.error(`   Message: ${error.message}`);
      if (error.data) {
        console.error(`   Details:`, JSON.stringify(error.data, null, 2));
      }
      console.log('\n💬 Try again or type "exit" to quit\n');
    }
  });

  try {
    // Connect to Kafka
    await kafkaListener.connect();
    console.log('✅ Connected to Kafka cluster');
    console.log(`📥 Listening on topic: ${kafkaListener.topicName}`);
    console.log(`👥 Consumer Group: ${kafkaListener.consumerGroup}\n`);

    // Start consuming messages
    await kafkaListener.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await kafkaListener.stop();
      inputLoop.close();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await kafkaListener.stop();
      inputLoop.close();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    console.log('💡 Waiting for messages... (Type "exit" to stop)\n');
  } catch (error) {
    console.error('\n❌ Error starting listener:', error.message);
    if (error.message && error.message.includes('incompatible')) {
      console.error('\n💡 Tip: If you see protocol incompatibility errors,');
      console.error('   wait a few minutes or use a different consumer group.\n');
    }
    inputLoop.close();
    await kafkaListener.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the listener
if (require.main === module) {
  listenAndReply();
}

module.exports = listenAndReply;
