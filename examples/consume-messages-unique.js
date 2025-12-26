const KafkaConsumer = require('../kafka/consumer');

/**
 * Example: Consume messages with a unique consumer group
 * Helps avoid protocol incompatibility with other consumers
 *
 * Usage: KAFKA_USE_UNIQUE_GROUP=true node examples/consume-messages-unique.js
 */
async function consumeMessages() {
  // Set unique group flag if not already set
  if (!process.env.KAFKA_USE_UNIQUE_GROUP) {
    process.env.KAFKA_USE_UNIQUE_GROUP = 'true';
  }

  const kafkaListener = new KafkaConsumer();

  // Register custom handlers for specific event types
  kafkaListener.onEvent('message.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log('\n📱 ===== NEW iMESSAGE RECEIVED =====');
    console.log(`   From: ${payload.from_phone || 'Unknown'}`);
    console.log(`   Chat ID: ${payload.chat_id || 'Unknown'}`);
    console.log(`   Message: ${payload.text || '(no text)'}`);
    console.log(`   Sent At: ${payload.sent_at || 'Unknown'}`);
    console.log(`   Service: ${payload.service || 'Unknown'}`);
    if (payload.chat_handles && payload.chat_handles.length > 0) {
      console.log(`   Participants: ${payload.chat_handles.map(h => h.display_name || h.identifier).join(', ')}`);
    }
    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`   Attachments: ${payload.attachments.length} file(s)`);
    }
    console.log('=====================================\n');
  });

  kafkaListener.onEvent('typing_indicator.received', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`\n⌨️  [TYPING] Chat ${payload.chat_id || 'Unknown'} - Someone is typing...`);
  });

  kafkaListener.onEvent('typing_indicator.removed', async (eventPayload) => {
    const { data: payload } = eventPayload;
    console.log(`\n⌨️  [STOPPED TYPING] Chat ${payload.chat_id || 'Unknown'}`);
  });

  try {
    // Connect to Kafka
    await kafkaListener.connect();

    // Start consuming messages
    await kafkaListener.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down consumer...');
      await kafkaListener.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down consumer...');
      await kafkaListener.stop();
      process.exit(0);
    });

    // Keep the process alive
    console.log('\n💡 Press Ctrl+C to stop the consumer\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await kafkaListener.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  consumeMessages();
}

module.exports = consumeMessages;
