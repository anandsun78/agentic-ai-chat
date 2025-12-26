const AgenticAPIClient = require('../api/agentic-client');
const readline = require('readline');

/**
 * Send a reply to a chat
 * Usage: node examples/send-reply.js <chat_id> <message_text>
 * Or run interactively: node examples/send-reply.js
 */
async function sendReply(chatId, messageText) {
  const apiClient = new AgenticAPIClient();

  try {
    console.log(`\n📤 Sending reply to chat ${chatId}...`);
    console.log(`💬 Message: ${messageText}\n`);

    const apiResponse = await apiClient.createChatMessage(chatId, {
      message: {
        text: messageText,
      },
    });

    console.log('✅ Message sent successfully!');
    console.log(`   Message ID: ${apiResponse.data.id}`);
    console.log(`   Chat ID: ${apiResponse.data.chat_id}`);
    console.log(`   Text: ${apiResponse.data.text}`);
    console.log(`   Sent At: ${apiResponse.data.sent_at}\n`);

    return apiResponse.data;
  } catch (error) {
    console.error('\n❌ Error sending message:');
    console.error(`   Status: ${error.status}`);
    console.error(`   Message: ${error.message}`);
    if (error.data) {
      console.error(`   Details:`, JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
}

// If run from command line with arguments
if (require.main === module) {
  const cliArgs = process.argv.slice(2);

  if (cliArgs.length >= 2) {
    // Command line mode: node send-reply.js <chat_id> <message>
    const chatId = cliArgs[0];
    const messageText = cliArgs.slice(1).join(' ');
    sendReply(chatId, messageText)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('💬 Send iMessage Reply');
    console.log('='.repeat(50));
    console.log('Enter chat ID and message to send a reply.\n');

    rl.question('Chat ID: ', (chatId) => {
      if (!chatId.trim()) {
        console.error('❌ Chat ID is required');
        rl.close();
        process.exit(1);
      }

      rl.question('Message: ', async (messageText) => {
        if (!messageText.trim()) {
          console.error('❌ Message text is required');
          rl.close();
          process.exit(1);
        }

        try {
          await sendReply(chatId.trim(), messageText.trim());
        } catch (error) {
          // Error already logged
        } finally {
          rl.close();
          process.exit(0);
        }
      });
    });
  }
}

module.exports = sendReply;
