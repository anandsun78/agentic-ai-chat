require('dotenv').config();
const AgenticAPIClient = require('../api/agentic-client');

/**
 * Fetch chats by phone number
 * Usage: node examples/get-chats.js [phone_number] [api_base_url] [api_key]
 */
async function getChats() {
  try {
    // Get phone number from command line or use default
    const rawPhoneArg = process.argv[2] || '5713659116';
    const apiBaseUrl = process.argv[3] || process.env.AGENTIC_API_BASE_URL;
    const apiKey = process.argv[4] || process.env.AGENTIC_API_KEY;

    if (!apiBaseUrl || !apiKey) {
      console.error('❌ Error: API credentials required!');
      console.error('\nUsage:');
      console.error('  node examples/get-chats.js [phone_number] [api_base_url] [api_key]');
      console.error('\nOr set environment variables:');
      console.error('  AGENTIC_API_BASE_URL=https://your-api-url.com');
      console.error('  AGENTIC_API_KEY=your-api-key');
      console.error('\nExample:');
      console.error('  node examples/get-chats.js 5713659116 https://api.example.com your-key');
      process.exit(1);
    }

    // Initialize API client with credentials
    const apiClient = new AgenticAPIClient({
      baseURL: apiBaseUrl,
      apiKey: apiKey,
    });

    // Phone number in E.164 format (add + prefix if not present)
    const e164Phone = rawPhoneArg.startsWith('+')
      ? rawPhoneArg
      : `+1${rawPhoneArg}`;

    console.log(`📱 Fetching chats for phone number: ${e164Phone}\n`);

    // Call GET /api/chats with phone_number query parameter
    const apiResponse = await apiClient.listChats({
      phoneNumber: e164Phone,
      page: 1,
      perPage: 100,
    });

    console.log('✅ Response Status:', apiResponse.status);
    console.log('\n📋 Chats:');
    console.log(JSON.stringify(apiResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status) {
      console.error('   Status Code:', error.status);
    }
    if (error.data) {
      console.error('   Error Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  getChats();
}

module.exports = getChats;
