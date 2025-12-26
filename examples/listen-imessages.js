const KafkaConsumer = require('../kafka/consumer');

/**
 * Listen for iMessage events from Kafka
 * Prints incoming messages with phone numbers and content
 *
 * Usage: node examples/listen-imessages.js
 */
async function runIMessageListener() {
  // Use a unique consumer group to avoid conflicts
  process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

  const kafkaListener = new KafkaConsumer();

  console.log('🔊 Starting iMessage Listener...');
  console.log('📱 Listening for messages on Kafka topic...\n');

  // Register handler for message.received events
  kafkaListener.onEvent('message.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    
    console.log('\n' + '='.repeat(60));
    console.log('📱 NEW iMESSAGE');
    console.log('='.repeat(60));
    console.log(`📞 From: ${payload.from_phone || 'Unknown'}`);
    console.log(`💬 Message: ${payload.text || '(no text)'}`);
    console.log(`🆔 Chat ID: ${payload.chat_id || 'Unknown'}`);
    console.log(`📅 Sent At: ${payload.sent_at || 'Unknown'}`);
    console.log(`📲 Service: ${payload.service || 'Unknown'}`);
    console.log(`👁️  Read: ${payload.is_read ? 'Yes' : 'No'}`);
    
    if (payload.chat_handles && payload.chat_handles.length > 0) {
      console.log(`👥 Participants:`);
      payload.chat_handles.forEach(handle => {
        const isMe = handle.is_me ? ' (You)' : '';
        console.log(`   - ${handle.display_name || handle.identifier}${isMe}`);
      });
    }
    
    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`📎 Attachments: ${payload.attachments.length} file(s)`);
      payload.attachments.forEach((att, idx) => {
        console.log(`   ${idx + 1}. ${att.filename || att.url || 'Unknown file'}`);
      });
    }
    
    if (payload.reaction_id) {
      console.log(`😀 Reaction: ${payload.reaction_id}`);
    }
    
    console.log('='.repeat(60) + '\n');
  });

  // Register handler for typing indicators
  kafkaListener.onEvent('typing_indicator.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`⌨️  [TYPING] Chat ${payload.chat_id || 'Unknown'} - Someone is typing...`);
  });

  kafkaListener.onEvent('typing_indicator.removed', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`⌨️  [STOPPED] Chat ${payload.chat_id || 'Unknown'} - Typing stopped`);
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
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await kafkaListener.stop();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    console.log('💡 Waiting for messages... (Press Ctrl+C to stop)\n');
  } catch (error) {
    console.error('\n❌ Error starting listener:', error.message);
    if (error.message && error.message.includes('incompatible')) {
      console.error('\n💡 Tip: If you see protocol incompatibility errors,');
      console.error('   wait a few minutes or use a different consumer group.\n');
    }
    await kafkaListener.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the listener
if (require.main === module) {
  runIMessageListener();
}

module.exports = runIMessageListener;
