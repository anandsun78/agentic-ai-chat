const { getKafkaInstance, getTopicName, validateConfig } = require('./config');

/**
 * Kafka producer for publishing messages
 */
class KafkaProducer {
  constructor() {
    this.producer = null;
    this.topicName = null;
  }

  /**
   * Initialize and connect the producer
   */
  async connect() {
    try {
      validateConfig();
      const kafkaClient = getKafkaInstance();
      this.topicName = getTopicName();
      this.producer = kafkaClient.producer();

      await this.producer.connect();
      console.log('✅ Kafka producer connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Error connecting Kafka producer:', error.message);
      throw error;
    }
  }

  /**
   * Send a message to the Kafka topic
   * @param {Object} message - The message object to send
   * @param {Object} options - Optional parameters (partition, key, headers, etc.)
   * @returns {Promise<Object>} - Record metadata
   */
  async sendMessage(message, options = {}) {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      const payloadValue = typeof message === 'string'
        ? message 
        : JSON.stringify(message);

      const kafkaRecord = {
        topic: this.topicName,
        messages: [
          {
            value: payloadValue,
            key: options.key || null,
            partition: options.partition || null,
            headers: options.headers || {},
            timestamp: options.timestamp || Date.now().toString(),
          },
        ],
      };

      const sendResult = await this.producer.send(kafkaRecord);
      
      // Handle kafkajs response structure
      if (sendResult && Array.isArray(sendResult) && sendResult.length > 0) {
        const ackMetadata = sendResult[0];
        if (ackMetadata && ackMetadata.partitions && ackMetadata.partitions.length > 0) {
          console.log('📤 Message sent successfully:');
          console.log(`   Topic: ${ackMetadata.topicName || ackMetadata.topic}`);
          console.log(`   Partition: ${ackMetadata.partitions[0].partition}`);
          console.log(`   Offset: ${ackMetadata.partitions[0].offset}`);
        }
        return ackMetadata;
      } else if (sendResult) {
        // Handle different response structures
        console.log('📤 Message sent successfully');
        return sendResult;
      }

      return sendResult;
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      throw error;
    }
  }

  /**
   * Send multiple messages in a batch
   * @param {Array} messages - Array of message objects
   * @returns {Promise<Object>} - Record metadata
   */
  async sendBatch(messages) {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      const batchItems = messages.map((msg) => ({
        value: typeof msg === 'string' ? msg : JSON.stringify(msg),
        key: msg.key || null,
        partition: msg.partition || null,
        headers: msg.headers || {},
      }));

      const sendResult = await this.producer.send({
        topic: this.topicName,
        messages: batchItems,
      });

      console.log(`📤 Batch of ${messages.length} messages sent successfully`);
      return sendResult;
    } catch (error) {
      console.error('❌ Error sending batch:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect the producer
   */
  async disconnect() {
    if (this.producer) {
      try {
        await this.producer.disconnect();
        console.log('✅ Kafka producer disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting producer:', error.message);
        throw error;
      }
    }
  }
}

module.exports = KafkaProducer;
