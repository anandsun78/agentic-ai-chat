const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let isFirebaseReady = false;

function initializeFirebase() {
  if (isFirebaseReady) {
    return admin.firestore();
  }

  try {
    // Initialize with service account or fallback credentials
    // Prod: service account key file
    // Dev: env var JSON or ADC
    
    if (!admin.apps.length) {
      // Option 1: Service account key file path (if available)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceCreds = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceCreds),
          projectId: serviceCreds.project_id || 'allinonehrm'
        });
        console.log(`✅ Firebase initialized with service account file: ${serviceCreds.project_id}`);
      }
      // Option 2: Service account JSON from environment variable
      else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceCreds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceCreds),
          projectId: serviceCreds.project_id || 'allinonehrm'
        });
        console.log(`✅ Firebase initialized with service account: ${serviceCreds.project_id}`);
      }
      // Option 3: Try the default service account path
      else {
        const path = require('path');
        const defaultServiceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
        try {
          const serviceCreds = require(defaultServiceAccountPath);
          admin.initializeApp({
            credential: admin.credential.cert(serviceCreds),
            projectId: serviceCreds.project_id || 'allinonehrm'
          });
          console.log(`✅ Firebase initialized with service account from: ${defaultServiceAccountPath}`);
          console.log(`   Project: ${serviceCreds.project_id}`);
        } catch (fileError) {
          // Option 4: Application Default Credentials (gcloud auth application-default login)
          const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'allinonehrm';
          try {
            admin.initializeApp({
              projectId: firebaseProjectId,
              credential: admin.credential.applicationDefault()
            });
            console.log(`✅ Firebase initialized with Application Default Credentials: ${firebaseProjectId}`);
          } catch (adcError) {
            // Fallback: Initialize without credentials (set up later)
            console.warn('⚠️  No Firebase credentials found, initializing with project ID only');
            console.warn('   To enable Firestore writes, set up credentials (see FIREBASE_SETUP.md)');
            admin.initializeApp({
              projectId: firebaseProjectId
            });
            console.log(`✅ Firebase initialized with project: ${firebaseProjectId} (credentials needed for writes)`);
          }
        }
      }
    }

    const db = admin.firestore();
    isFirebaseReady = true;
    console.log('✅ Firebase Admin SDK initialized');
    console.log('✅ Firestore database ready');
    
    // Configure Firestore settings
    db.settings({ ignoreUndefinedProperties: true });
    
    return db;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    console.error('   To fix this, you need to set up Firebase credentials:');
    console.error('   1. Download service account key from Firebase Console');
    console.error('   2. Set FIREBASE_SERVICE_ACCOUNT_PATH env var to the key file path');
    console.error('   OR run: gcloud auth application-default login');
    throw error;
  }
}

/**
 * Save a Kafka event to Firebase
 */
async function saveKafkaEventToFirebase(eventType, eventData) {
  try {
    const db = initializeFirebase();
    if (!db) {
      console.error('❌ Firebase database not initialized');
      return null;
    }
    
    const kafkaRecord = {
      eventType: eventType,
      eventId: eventData.event_id || eventData.id || null,
      eventData: eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString()
    };

    console.log(`💾 Attempting to save Kafka event to Firebase: ${eventType}`);
    console.log(`   Collection: kafka_events`);
    console.log(`   Event ID: ${kafkaRecord.eventId}`);

    // Save to 'kafka_events' collection
    const savedRef = await db.collection('kafka_events').add(kafkaRecord);
    console.log(`✅ Kafka event saved to Firebase: ${eventType} (Collection: kafka_events, Doc ID: ${savedRef.id})`);
    
    return savedRef.id;
  } catch (error) {
    console.error(`❌ Error saving Kafka event to Firebase (${eventType}):`, error);
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    // Don't throw - return null so calling code can continue
    return null;
  }
}

/**
 * Save a message.received event to Firestore
 */
async function saveMessageReceivedToFirebase(eventData) {
  try {
    const db = initializeFirebase();
    if (!db) {
      console.error('❌ Firebase database not initialized for saveMessageReceivedToFirebase');
      return null;
    }
    
    const { data } = eventData;
    
    if (!data) {
      console.error('❌ Event data is missing in saveMessageReceivedToFirebase');
      return null;
    }
    
    const inboundDoc = {
      eventType: 'message.received',
      eventId: eventData.event_id || null,
      phoneNumber: data.from_phone || null,
      chatId: data.chat_id || null,
      messageText: data.text || '',
      text: data.text || '', // Also save as 'text' for compatibility
      sentAt: data.sent_at || null,
      service: data.service || 'iMessage',
      isRead: data.is_read || false,
      attachments: data.attachments || [],
      participants: data.chat_handles || [],
      fullEventData: eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    console.log(`💾 Attempting to save message to Firebase`);
    console.log(`   Collection: kafka_messages`);
    console.log(`   From phone: ${inboundDoc.phoneNumber}`);
    console.log(`   Chat ID: ${inboundDoc.chatId}`);
    console.log(`   Message text length: ${inboundDoc.messageText?.length || 0}`);

    // Save to 'kafka_messages' collection in Firestore
    const savedRef = await db.collection('kafka_messages').add(inboundDoc);
    console.log(`✅ Message received saved to Firestore (Collection: kafka_messages, Doc ID: ${savedRef.id}, From: ${data.from_phone})`);
    
    return savedRef.id;
  } catch (error) {
    console.error('❌ Error saving message received to Firestore:', error);
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED') || error.message.includes('authentication')) {
      console.error('   This is a Firestore authentication/permission error');
      console.error('   Please check Firebase credentials and Firestore security rules');
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    // Don't throw - allow system to continue even if Firestore save fails
    return null;
  }
}

/**
 * Save a message.sent event to Firestore
 */
async function saveMessageSentToFirebase(eventData) {
  try {
    const db = initializeFirebase();
    if (!db) {
      console.error('❌ Firebase database not initialized for saveMessageSentToFirebase');
      return null;
    }
    
    const { data } = eventData;
    
    if (!data) {
      console.error('❌ Event data is missing in saveMessageSentToFirebase');
      return null;
    }
    
    const outboundDoc = {
      eventType: 'message.sent',
      eventId: eventData.event_id || null,
      phoneNumber: data.from_phone || null,
      chatId: data.chat_id || null,
      messageText: data.text || '',
      text: data.text || '', // Also save as 'text' for compatibility
      sentAt: data.sent_at || null,
      service: data.service || 'iMessage',
      messageId: data.id || null,
      fullEventData: eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    console.log(`💾 Attempting to save sent message to Firebase`);
    console.log(`   Collection: kafka_messages`);
    console.log(`   From phone: ${outboundDoc.phoneNumber}`);

    // Save to 'kafka_messages' collection in Firestore
    const savedRef = await db.collection('kafka_messages').add(outboundDoc);
    console.log(`✅ Message sent saved to Firestore (Collection: kafka_messages, Doc ID: ${savedRef.id}, From: ${data.from_phone})`);
    
    return savedRef.id;
  } catch (error) {
    console.error('❌ Error saving message sent to Firestore:', error);
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error message: ${error.message}`);
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED') || error.message.includes('authentication')) {
      console.error('   This is a Firestore authentication/permission error');
      console.error('   Please check Firebase credentials and Firestore security rules');
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    // Don't throw - allow system to continue even if Firestore save fails
    return null;
  }
}

/**
 * Save a typing indicator event to Firestore
 */
async function saveTypingIndicatorToFirebase(eventType, eventData) {
  try {
    const db = initializeFirebase();
    const { data } = eventData;
    
    const typingRecord = {
      eventType: eventType,
      eventId: eventData.event_id,
      chatId: data.chat_id,
      display: data.display,
      eventTimestamp: data.timestamp,
      fullEventData: eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    // Save to 'kafka_typing_indicators' collection in Firestore
    const savedRef = await db.collection('kafka_typing_indicators').add(typingRecord);
    console.log(`✅ Typing indicator saved to Firestore: ${eventType} (Collection: kafka_typing_indicators, Doc ID: ${savedRef.id})`);
    
    return savedRef.id;
  } catch (error) {
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED') || error.message.includes('authentication')) {
      console.error(`❌ Firestore authentication error (${eventType}):`, error.message);
      console.error('   Please set up Firebase credentials (see FIREBASE_SETUP.md)');
    } else {
      console.error(`❌ Error saving typing indicator to Firestore (${eventType}):`, error.message);
    }
    // Don't throw - allow system to continue even if Firestore save fails
    return null;
  }
}

module.exports = {
  initializeFirebase,
  saveKafkaEventToFirebase,
  saveMessageReceivedToFirebase,
  saveMessageSentToFirebase,
  saveTypingIndicatorToFirebase
};
