require('dotenv').config();
const KafkaConsumer = require('../kafka/consumer');
const AgenticAPIClient = require('../api/agentic-client');

/**
 * Kafka to API Bridge
 * Consumes Kafka events and triggers API calls when requested
 */
class KafkaToAPIBridge {
  constructor() {
    this.kafkaListener = new KafkaConsumer();
    this.agenticClient = null;
  }

  async initialize() {
    // Initialize API client if we have the base URL
    const apiBaseUrl = process.env.AGENTIC_API_BASE_URL;
    const apiKey = process.env.AGENTIC_API_KEY;

    if (apiBaseUrl && apiKey) {
      this.agenticClient = new AgenticAPIClient({
        baseURL: apiBaseUrl,
        apiKey: apiKey,
      });
      console.log('✅ API client initialized');
    } else {
      console.log('⚠️  API client not initialized - AGENTIC_API_BASE_URL not set');
      console.log('   Will only log Kafka messages, not make API calls');
    }

    // Register handler for API request events
    this.kafkaListener.onEvent('api.request', async (eventData) => {
      await this.handleApiRequest(eventData);
    });

    // Also handle message.received events from Agentic
    this.kafkaListener.onEvent('message.received', async (eventData) => {
      console.log('\n💬 Received message from Agentic:');
      const msg = eventData.data;
      console.log(`   From: ${msg.from_phone}`);
      console.log(`   Text: ${msg.text}`);
      console.log(`   Chat ID: ${msg.chat_id}`);
    });
  }

  async handleApiRequest(eventData) {
    const { data } = eventData;
    const method = data.method;
    const endpoint = data.endpoint;
    const queryParams = data.query_params || {};

    console.log(`\n🔗 Processing API Request:`);
    console.log(`   Method: ${method}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Query Params:`, queryParams);

    if (!this.agenticClient) {
      console.log('   ⚠️  Cannot process - API client not initialized');
      return;
    }

    try {
      let response;

      // Handle different API endpoints
      if (method === 'GET' && endpoint === '/api/chats') {
        response = await this.agenticClient.listChats({
          phoneNumber: queryParams.phone_number,
          page: queryParams.page || 1,
          perPage: queryParams.per_page || 25,
        });

        console.log(`\n✅ API Call Successful:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Chats Found: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
        console.log(`\n📋 Response Data:`);
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log(`   ⚠️  Unsupported endpoint: ${method} ${endpoint}`);
      }
    } catch (error) {
      console.error(`\n❌ API Call Failed:`);
      console.error(`   Error: ${error.message}`);
      if (error.status) {
        console.error(`   Status: ${error.status}`);
      }
      if (error.data) {
        console.error(`   Details:`, JSON.stringify(error.data, null, 2));
      }
    }
  }

  async start() {
    try {
      await this.initialize();
      await this.kafkaListener.connect();
      await this.kafkaListener.start();

      console.log('\n🚀 Kafka to API Bridge is running...');
      console.log('   Listening for API requests and Agentic messages');
      console.log('   Press Ctrl+C to stop\n');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...');
        await this.kafkaListener.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n\n🛑 Shutting down...');
        await this.kafkaListener.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('\n❌ Error starting bridge:', error.message);
      await this.kafkaListener.stop().catch(() => {});
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const bridge = new KafkaToAPIBridge();
  bridge.start();
}

module.exports = KafkaToAPIBridge;
