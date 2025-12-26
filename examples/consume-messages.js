const KafkaConsumer = require('../kafka/consumer');

/**
 * Example: Consume messages from Kafka topic
 * Listens for:
 * - message.received
 * - typing_indicator.received
 * - typing_indicator.removed
 */
async function consumeMessages() {
  const kafkaListener = new KafkaConsumer();

  // Register custom handlers for specific event types
  kafkaListener.onEvent('message.received', async (eventPayload) => {
    console.log('\n🎯 Custom handler for message.received called!');
    // You can add custom logic here, e.g., save to database, send notifications, etc.
  });

  kafkaListener.onEvent('typing_indicator.received', async (eventPayload) => {
    console.log('\n🎯 Custom handler for typing_indicator.received called!');
    // Custom logic for typing indicators
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
