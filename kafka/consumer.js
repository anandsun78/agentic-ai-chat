const { getKafkaInstance, getTopicName, getConsumerGroup, validateConfig } = require('./config');
const { CONFIG } = require('../config/constants');

const { events, kafka } = CONFIG;

/**
 * Kafka consumer for inbound events
 * Handles message.received, typing_indicator.received, and typing_indicator.removed
 */
class KafkaConsumer {
  constructor() {
    this.consumer = null;
    this.topicName = null;
    this.consumerGroup = null;
    this.isRunning = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize and connect the consumer
   */
  async connect() {
    try {
      validateConfig();
      const kafkaClient = getKafkaInstance();
      this.topicName = getTopicName();
      this.consumerGroup = getConsumerGroup();
      
      this.consumer = kafkaClient.consumer({
        groupId: this.consumerGroup,
        sessionTimeout: kafka.sessionTimeoutMs,
        heartbeatInterval: kafka.heartbeatIntervalMs,
        maxInFlightRequests: kafka.maxInFlightRequests,
        rebalanceTimeout: kafka.rebalanceTimeoutMs, // Extra time for rebalance
        retry: {
          initialRetryTime: kafka.retryInitialMs,
          retries: kafka.retryCount,
        },
        // Force protocol compatibility
        allowAutoTopicCreation: false,
      });

      await this.consumer.connect();
      console.log('✅ Kafka consumer connected successfully');
      console.log(`   Consumer Group: ${this.consumerGroup}`);
      console.log(`   Topic: ${this.topicName}`);
      return true;
    } catch (error) {
      console.error('❌ Error connecting Kafka consumer:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to the topic
   */
  async subscribe() {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    try {
      await this.consumer.subscribe({
        topic: this.topicName,
        fromBeginning: false, // Start from latest messages
      });
      console.log(`📥 Subscribed to topic: ${this.topicName}`);
    } catch (error) {
      console.error('❌ Error subscribing to topic:', error.message);
      throw error;
    }
  }

  /**
   * Register a handler for a specific event type
   * @param {String} eventType - Event type (e.g., 'message.received', 'typing_indicator.received')
   * @param {Function} handler - Handler function that receives the event data
   */
  onEvent(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.eventHandlers.set(eventType, handler);
    console.log(`📌 Registered handler for event: ${eventType}`);
  }

  /**
   * Process a Kafka message
   * @param {Object} message - Kafka message object
   */
  async processMessage(message) {
    try {
      const rawValue = message.value.toString();
      let eventPayload;

      // Try to parse as JSON
      try {
        eventPayload = JSON.parse(rawValue);
      } catch (e) {
        // If not JSON, treat as plain text
        eventPayload = {
          event_type: events.unknown,
          data: { text: rawValue },
        };
      }

      const eventType = eventPayload.event_type || events.unknown;
      const eventId = eventPayload.event_id || 'unknown';
      const createdAt = eventPayload.created_at || new Date().toISOString();

      console.log(`\n📨 Received event: ${eventType}`);
      console.log(`   Event ID: ${eventId}`);
      console.log(`   Created At: ${createdAt}`);

      // Call registered handler if exists
      const eventHandler = this.eventHandlers.get(eventType);
      if (eventHandler) {
        try {
          await eventHandler(eventPayload);
        } catch (handlerError) {
          console.error(`❌ Error in handler for ${eventType}:`, handlerError.message);
        }
      } else {
        // Default handler - just log the data
        console.log('   Data:', JSON.stringify(eventPayload.data, null, 2));
      }

      // Handle specific event types
      switch (eventType) {
        case events.messageReceived:
          this.handleMessageReceived(eventPayload);
          break;
        case events.messageSent:
          // Handle messages we sent (for confirmation)
          this.handleMessageReceived(eventPayload);
          break;
        case events.typingIndicatorReceived:
          this.handleTypingIndicatorReceived(eventPayload);
          break;
        case events.typingIndicatorRemoved:
          this.handleTypingIndicatorRemoved(eventPayload);
          break;
        default:
          console.log(`   Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error.message);
    }
  }

  /**
   * Handle message.received event
   * @param {Object} eventData - Event data
   */
  handleMessageReceived(eventData) {
    const { data } = eventData;
    console.log(`\n💬 New Message Received:`);
    console.log(`   From: ${data.from_phone || 'Unknown'}`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Text: ${data.text || '(no text)'}`);
    console.log(`   Read: ${data.is_read ? 'Yes' : 'No'}`);
    if (data.attachments && data.attachments.length > 0) {
      console.log(`   Attachments: ${data.attachments.length}`);
    }
  }

  /**
   * Handle typing_indicator.received event
   * @param {Object} eventData - Event data
   */
  handleTypingIndicatorReceived(eventData) {
    const { data } = eventData;
    console.log(`\n⌨️  Typing Indicator:`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Display: ${data.display ? 'Yes' : 'No'}`);
    console.log(`   Timestamp: ${data.timestamp || 'Unknown'}`);
  }

  /**
   * Handle typing_indicator.removed event
   * @param {Object} eventData - Event data
   */
  handleTypingIndicatorRemoved(eventData) {
    const { data } = eventData;
    console.log(`\n⌨️  Typing Stopped:`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Display: ${data.display ? 'Yes' : 'No'}`);
    console.log(`   Timestamp: ${data.timestamp || 'Unknown'}`);
  }

  /**
   * Start consuming messages
   */
  async start() {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    if (this.isRunning) {
      console.log('⚠️  Consumer is already running');
      return;
    }

    try {
      await this.subscribe();
      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(message);
        },
      });

      console.log('🚀 Consumer started and listening for messages...');
    } catch (error) {
      this.isRunning = false;
      
      // Handle protocol incompatibility error
      if (error.message && error.message.includes('incompatible')) {
        console.error('\n❌ Consumer group protocol incompatibility detected.');
        console.error('   This usually happens when other consumers are using different KafkaJS versions.');
        console.error('\n💡 Solutions:');
        console.error('   1. Wait a few minutes for existing consumers to disconnect');
        console.error('   2. Use a unique consumer group ID for testing (update .env)');
        console.error('   3. Ensure all consumers use the same KafkaJS version');
        console.error('\n   Attempting to disconnect and retry...\n');
        
        // Try to disconnect and wait before retrying
        try {
          await this.consumer.disconnect();
          await new Promise(resolve => setTimeout(resolve, kafka.consumerErrorBackoffMs));
          console.log('   Retrying connection...');
          await this.consumer.connect();
          await this.subscribe();
          await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
              await this.processMessage(message);
            },
          });
          console.log('✅ Consumer reconnected successfully!');
          return;
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError.message);
        }
      }
      
      console.error('❌ Error starting consumer:', error.message);
      throw error;
    }
  }

  /**
   * Stop consuming messages and disconnect
   */
  async stop() {
    if (this.consumer && this.isRunning) {
      try {
        await this.consumer.disconnect();
        this.isRunning = false;
        console.log('✅ Kafka consumer disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting consumer:', error.message);
        throw error;
      }
    }
  }
}

module.exports = KafkaConsumer;
