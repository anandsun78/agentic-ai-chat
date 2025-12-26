# Firebase Firestore Setup Guide

## Current Status
✅ Kafka listener is running and will save events to Firestore
✅ Code is configured to save to these Firestore collections:
   - `kafka_events` - All Kafka events
   - `kafka_messages` - Message events (received/sent)
   - `kafka_typing_indicators` - Typing indicator events

## Setup Firebase Authentication

To enable Firestore writes, you need to configure Firebase Admin SDK credentials. Choose one method:

### Method 1: Service Account Key File (Recommended)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `allinonehrm`
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file (e.g., `firebase-service-account.json`)
6. Set environment variable:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-service-account.json"
   ```

### Method 2: Application Default Credentials

If you have Google Cloud SDK installed:
```bash
gcloud auth application-default login
```

### Method 3: Environment Variable (JSON String)

Set the service account JSON as an environment variable:
```bash
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"allinonehrm",...}'
```

## Verify Setup

After setting up credentials, restart the server:
```bash
npm start
```

Then start the Kafka listener:
```bash
curl -X POST http://localhost:3000/api/listener/start
```

## Check Firestore

1. Go to Firebase Console → Firestore Database
2. Look for these collections:
   - `kafka_events`
   - `kafka_messages`
   - `kafka_typing_indicators`
3. New documents will appear as Kafka events arrive

## What Gets Saved

Each Kafka event is saved with:
- Event type and ID
- Phone numbers, chat IDs, message text
- Timestamps (server timestamp + ISO string)
- Full event data
- Metadata (service, attachments, participants, etc.)

