const KafkaProducer = require('../kafka/producer');

/**
 * Example: Send a message to Kafka topic
 */
async function sendMessage() {
  const kafkaProducer = new KafkaProducer();

  try {
    // Connect to Kafka
    await kafkaProducer.connect();

    // Example 1: Send a simple test message
    console.log('\n📤 Sending test message...');
    const smokeMessage = {
      event: 'test_message',
      data: {
        message: 'Hello from Agentic AI Chat!',
        timestamp: new Date().toISOString(),
        source: 'nodejs-producer',
      },
    };

    await kafkaProducer.sendMessage(smokeMessage);

    // Example 2: Send a message that matches the Agentic API format
    console.log('\n📤 Sending Agentic API format message...');
    const apiLikeMessage = {
      api_version: 'v2',
      created_at: new Date().toISOString(),
      data: {
        text: 'This is a test message from the Kafka producer',
        chat_id: '12345',
        from_phone: '+1234567890',
        is_read: false,
        attachments: [],
      },
      event_id: `test-${Date.now()}`,
      event_type: 'message.received',
    };

    await kafkaProducer.sendMessage(apiLikeMessage);

    // Example 3: Send a batch of messages
    console.log('\n📤 Sending batch of messages...');
    const batchPayloads = [
      { event: 'batch_test_1', data: { message: 'Batch message 1' } },
      { event: 'batch_test_2', data: { message: 'Batch message 2' } },
      { event: 'batch_test_3', data: { message: 'Batch message 3' } },
    ];

    await kafkaProducer.sendBatch(batchPayloads);

    console.log('\n✅ All messages sent successfully!');

    // Disconnect
    await kafkaProducer.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await kafkaProducer.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  sendMessage();
}

module.exports = sendMessage;
