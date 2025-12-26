require('dotenv').config();
const KafkaProducer = require('../kafka/producer');

/**
 * Send a Kafka request asking for GET /api/chats
 * Downstream service should perform the actual API call
 */
async function requestChatsViaKafka() {
  const kafkaProducer = new KafkaProducer();
  const rawPhone = process.argv[2] || '5713659116';

  try {
    // Format phone number to E.164
    const e164Phone = rawPhone.startsWith('+')
      ? rawPhone
      : `+1${rawPhone}`;

    console.log(`📤 Sending Kafka message to request chats for: ${e164Phone}\n`);

    // Connect to Kafka
    await kafkaProducer.connect();

    // Create a message requesting the API call
    const kafkaRequest = {
      api_version: 'v2',
      created_at: new Date().toISOString(),
      event_type: 'api.request',
      event_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        method: 'GET',
        endpoint: '/api/chats',
        query_params: {
          phone_number: e164Phone,
        },
        request_id: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };

    // Send the request message to Kafka
    const sendResult = await kafkaProducer.sendMessage(kafkaRequest);

    console.log('✅ Request message sent to Kafka successfully!');
    console.log(`\n📋 Message Details:`);
    if (sendResult) {
      if (sendResult.topicName || sendResult.topic) {
        console.log(`   Topic: ${sendResult.topicName || sendResult.topic}`);
      }
      if (sendResult.partitions && sendResult.partitions.length > 0) {
        console.log(`   Partition: ${sendResult.partitions[0].partition}`);
        console.log(`   Offset: ${sendResult.partitions[0].offset}`);
      }
    }
    console.log(`\n📨 Request Payload:`);
    console.log(JSON.stringify(kafkaRequest, null, 2));
    console.log(`\n💡 This message can be consumed by a service that will make the API call to GET /api/chats`);

    // Disconnect
    await kafkaProducer.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await kafkaProducer.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  requestChatsViaKafka();
}

module.exports = requestChatsViaKafka;
