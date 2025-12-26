# Agentic AI Chat - AI-Powered Social Networking Platform

An intelligent social networking application that combines professional matching with AI-powered conversations through iMessage integration. Built for seamless connections using Claude AI, Kafka messaging, and Firebase.

## Overview

Agentic AI Chat is a social networking platform that:
- **Matches professionals** based on skills, interests, location, and profession
- **Automates conversations** using Claude AI chatbot (supports text + voice messages)
- **Integrates with iMessage** via Kafka event streaming
- **Provides real-time updates** through WebSocket connections
- **Stores data** in Firebase Firestore

### Key Features

- 🤖 **AI Chatbot**: Claude 3 Haiku-powered conversational agent with personality
- 🎯 **Smart Matching**: Score-based algorithm matching 30+ tech professionals
- 💬 **iMessage Integration**: Real-time message handling via Kafka
- 🎤 **Voice Message Support**: Chatbot responds naturally to audio messages
- ⚡ **Real-time Updates**: WebSocket broadcasting for live events
- 🎨 **Beautiful UI**: Apple-style floating avatar design
- 🔥 **Firebase Backend**: Persistent storage for users, messages, and matches
- 🐳 **Docker Ready**: Containerized for easy deployment
- ☁️ **Cloud Deployment**: Configured for Google Cloud Run

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Development](#development)
- [Deployment](#deployment)
- [Examples](#examples)
- [Documentation](#documentation)

---

## Architecture

### Technology Stack

- **Backend**: Node.js + Express.js
- **AI**: Anthropic Claude 3 Haiku (text + audio support)
- **Messaging**: Kafka (Confluent Cloud)
- **Database**: Firebase Firestore
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time**: WebSocket (ws library)
- **Deployment**: Docker + Google Cloud Run

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User (iMessage)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────┐
           │  Kafka Topic    │  (Confluent Cloud)
           │  Message Queue  │
           └────────┬────────┘
                    │
                    ▼
      ┌─────────────────────────┐
      │  Express.js Server      │
      │  - Kafka Consumer       │
      │  - REST API             │
      │  - WebSocket Server     │
      └──────┬──────────────────┘
             │
      ┌──────┴──────┬───────────┬────────────┐
      ▼             ▼           ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Chatbot  │  │ Firebase │  │ Matching │  │ Agentic  │
│ (Claude) │  │ Service  │  │ Engine   │  │ API      │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Prerequisites

- **Node.js** 16+ and npm
- **Firebase Account** with Firestore enabled
- **Anthropic API Key** (for Claude AI)
- **Kafka Cluster** (Confluent Cloud or similar)
- **Agentic AI Chat API** credentials
- **Google Cloud Account** (optional, for deployment)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd agentic-ai-chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Download service account key JSON
4. Place it in the project root as `firebase-service-account.json`

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Configuration](#configuration) section).

---

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0
NODE_ENV=development

# Claude AI (Anthropic)
CLAUDE_API_KEY=sk-ant-api03-...

# Kafka Configuration (Confluent Cloud)
KAFKA_BOOTSTRAP_SERVERS=pkc-xxxxx.us-east1.gcp.confluent.cloud:9092
KAFKA_TOPIC_NAME=team.team.xxxxx
KAFKA_CONSUMER_GROUP=team-cg-xxxxx
KAFKA_CLIENT_ID=team-client-xxxxx
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_TLS_ENABLED=true

# Agentic AI Chat API
AGENTIC_API_BASE_URL=https://your-api-base-url.com
AGENTIC_API_KEY=your-api-key-here

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

### Firebase Collections

The application uses these Firestore collections:

- **users**: User profiles (phoneNumber, fullName, bio, profession, skills, interests)
- **kafka_messages**: Incoming/outgoing messages
- **kafka_events**: Raw Kafka event logs
- **user_matches**: Saved match results

---

## Usage

### Starting the Server

```bash
# Development
npm start

# or
node server.js
```

The server will start on `http://localhost:8000`

### Starting the Kafka Listener

The Kafka consumer doesn't start automatically. Start it via API:

```bash
curl -X POST http://localhost:8000/api/listener/start
```

### Stopping the Kafka Listener

```bash
curl -X POST http://localhost:8000/api/listener/stop
```

### Checking Status

```bash
# Server health
curl http://localhost:8000/api/health

# Listener status
curl http://localhost:8000/api/listener/status
```

---

## API Endpoints

### Health & Status

- **GET** `/api/health` - Health check
- **GET** `/api/listener/status` - Get Kafka listener status

### Kafka Listener Control

- **POST** `/api/listener/start` - Start listening for messages
- **POST** `/api/listener/stop` - Stop listening

### Matching

- **POST** `/api/matching/find`
  ```json
  {
    "phoneNumber": "+1234567890"
  }
  ```
  Returns matched profiles from `matching.json`

### Messaging

- **POST** `/api/reply`
  ```json
  {
    "chatId": "12345",
    "message": "Hello!"
  }
  ```
  Send a reply via Agentic API

### Chats

- **GET** `/api/chats` - List all chats
- **GET** `/api/chats/:chatId/messages` - Get messages for a chat
- **POST** `/api/chats` - Create new chat

### WebSocket

Connect to `ws://localhost:8000` for real-time message events:

```javascript
const ws = new WebSocket('ws://localhost:8000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data.event);
};
```

---

## Project Structure

```
agentic-ai-chat/
├── server.js                    # Main Express server
├── package.json                 # Dependencies
├── Dockerfile                   # Docker configuration
├── cloudbuild.yaml              # Google Cloud Build config
├── .env.example                 # Environment template
│
├── backend/
│   ├── chatbot/
│   │   └── service.js           # AI Chatbot (Claude 3 Haiku)
│   └── firebase/
│       └── service.js           # Firebase integration
│
├── kafka/
│   ├── consumer.js              # Kafka message consumer
│   ├── producer.js              # Kafka message producer
│   └── config.js                # Kafka configuration
│
├── api/
│   ├── agentic-client.js        # Agentic API client
│   └── schemas.js               # API schemas/constants
│
├── public/
│   ├── matching.html            # Matching page UI
│   ├── matching.js              # Matching page logic
│   ├── matching.css             # Matching page styles
│   └── test-client.html         # Testing client
│
├── examples/
│   ├── send-message.js          # Send message example
│   ├── consume-messages.js      # Consume messages example
│   ├── listen-and-reply.js      # Auto-reply example
│   └── agentic-api-examples.js  # API usage examples
│
├── matching.json                # Mock profile data (30 profiles)
│
└── Documentation/
    ├── SYSTEM_OVERVIEW.md       # Complete system overview
    ├── AGENTIC_API_DOCUMENTATION.md # Agentic API docs
    ├── AGENTIC_API_ENDPOINTS.md # Endpoint reference
    ├── KAFKA_SETUP.md           # Kafka setup guide
    ├── FIREBASE_SETUP.md        # Firebase setup guide
    └── DEPLOYMENT.md            # Cloud Run deployment
```

---

## How It Works

### 1. User Sign-In Flow

```
User enters phone number
    ↓
Check Firebase 'users' collection
    ↓
If found → Store in sessionStorage
    ↓
Redirect to /matching page
```

### 2. Matching Flow

```
Load user data from sessionStorage
    ↓
Call POST /api/matching/find
    ↓
Load matching.json (30 tech profiles)
    ↓
Score profiles based on:
  - Profession match (+20 points)
  - Location match (+15 points)
  - Skills overlap (+5 per skill)
  - Interests overlap (+10 per interest)
  - Bio keywords (+5 per word)
    ↓
Display as floating avatars (top 30 matches)
```

### 3. Automated Message Response Flow

```
Incoming iMessage → Kafka Topic
    ↓
Kafka Consumer receives event
    ↓
Save to Firebase (kafka_messages)
    ↓
Trigger chatbot (handleChatbotReply)
    ↓
Get user profile from Firebase
    ↓
Get conversation history (last 20 messages)
    ↓
Process audio attachments (if present)
    ↓
Generate response with Claude AI
  - Context-aware (uses profile + history)
  - Personalized tone
  - Short (1-2 sentences)
  - Suggests agentic-ai-chat.app when relevant
    ↓
Send reply via Agentic API
    ↓
Save response to Firebase
    ↓
Broadcast to WebSocket clients
```

### 4. Chatbot Behavior

The AI chatbot is designed to be:
- **Natural**: Sounds human, not robotic
- **Short**: 1-2 sentences max
- **Casual**: Uses contractions, modern language
- **Emotionally intelligent**: Matches user's tone
- **Helpful**: Suggests https://agentic-ai-chat.app/ when users mention boredom
- **Audio-aware**: Responds naturally to voice messages

**Example Conversations:**
```
User: "Hey"
Bot: "Hey! What's up?"

User: "I'm bored"
Bot: "You should check out https://agentic-ai-chat.app/ - they have great new chat prompts to explore!"

User: [Voice message]
Bot: "Thanks for the message! What's on your mind?"
```

---

## Development

### Available Scripts

```bash
# Start server
npm start

# Run Kafka examples
npm run producer       # Send test message
npm run consumer       # Consume messages
npm run listen         # Listen for iMessages
npm run reply          # Manual reply script

# Run API examples
npm run api-examples   # Test Agentic API
```

### Testing the Chatbot

1. Start the server:
   ```bash
   npm start
   ```

2. Start the Kafka listener:
   ```bash
   curl -X POST http://localhost:8000/api/listener/start
   ```

3. Send a test message via iMessage to the configured number

4. Watch the server logs to see the chatbot generate and send a response

### Manual Reply Testing

Test sending replies manually:

```bash
npm run reply
```

This script listens for incoming messages and prompts you to type a reply.

---

## Deployment

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t agentic-ai-chat .

# Run container
docker run -p 8000:8000 --env-file .env agentic-ai-chat
```

### Google Cloud Run

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

**Quick Deploy:**

```bash
# Set project ID
export PROJECT_ID=your-project-id

# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Set environment variables
gcloud run services update agentic-ai-chat \
  --region=us-east1 \
  --set-env-vars="CLAUDE_API_KEY=...,KAFKA_BOOTSTRAP_SERVERS=..."
```

The service will be available at:
```
https://agentic-ai-chat-xxxxx-uc.a.run.app
```

---

## Examples

### Example 1: Find Matches for a User

```bash
curl -X POST http://localhost:8000/api/matching/find \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

Response:
```json
{
  "success": true,
  "matches": [
    {
      "id": "mock_1",
      "name": "Sarah Chen",
      "title": "Senior Software Engineer | Stripe",
      "profession": "Tech",
      "location": "San Francisco, CA",
      "score": 85,
      "matchReason": "Excellent match based on your profile and interests",
      "skills": ["JavaScript", "TypeScript", "React"],
      "linkedin": "https://linkedin.com/in/sarah-chen-stripe"
    }
  ],
  "count": 30,
  "source": "mock_data"
}
```

### Example 2: Send a Message

```bash
curl -X POST http://localhost:8000/api/reply \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "abc123",
    "message": "Hey! How are you?"
  }'
```

### Example 3: WebSocket Client

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000');

ws.on('open', () => {
  console.log('Connected to server');
});

ws.on('message', (data) => {
  const event = JSON.parse(data);

  if (event.type === 'message.received') {
    console.log('New message:', event.event.data.text);
  }
});
```

---

## Documentation

Comprehensive documentation is available in the following files:

- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Complete system architecture and features
- **[AGENTIC_API_DOCUMENTATION.md](AGENTIC_API_DOCUMENTATION.md)** - Agentic AI Chat API reference
- **[AGENTIC_API_ENDPOINTS.md](AGENTIC_API_ENDPOINTS.md)** - All server endpoints
- **[KAFKA_SETUP.md](KAFKA_SETUP.md)** - Kafka configuration guide
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Firebase setup instructions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Google Cloud Run deployment

---

## Matching Algorithm

The matching system scores profiles based on multiple factors:

```javascript
Base Score: 50

Matching Criteria:
├── Profession match: +20 points
├── Location match: +15 points
├── Skills overlap: +5 points per matching skill
├── Interests overlap: +10 points per matching interest
├── Bio keywords: +5 points per matching word
└── Tech profession boost: +10 points (if both in tech)

Maximum Score: 100
```

**Example:**
- User: Software Engineer, San Francisco, Skills: [React, Node.js]
- Match: Sarah Chen, Software Engineer, San Francisco, Skills: [React, TypeScript]
- Score: 50 + 20 (profession) + 15 (location) + 5 (React) + 10 (tech boost) = 100

---

## Chatbot Configuration

The AI chatbot uses Claude 3 Haiku with these settings:

```javascript
{
  model: 'claude-3-haiku-20240307',
  maxTokens: 80,              // Short responses
  temperature: 0.9,           // Creative, natural
  maxContextMessages: 20,     // Conversation history
  responseStyle: 'casual, friendly, emotionally intelligent'
}
```

**Personality Traits:**
- Warm and engaging
- Human-like (not robotic)
- Short and concise
- Emotionally intelligent
- Slightly witty when appropriate

---

## Mock Data

The system includes 30 mock tech professional profiles in `matching.json`:

**Locations:**
- San Francisco, CA (majority)
- New York, NY
- Seattle, WA
- Other California cities

**Companies:**
- Big Tech: Stripe, Airbnb, OpenAI, Meta, Google, Apple, Netflix, Amazon, Microsoft, etc.
- Startups: Various funded startups and Y Combinator alums

**Specialties:**
- Software Engineering
- Product Management
- AI/ML Engineering
- Data Science
- DevOps
- UX/UI Design
- Blockchain
- Cybersecurity

---

## Troubleshooting

### Server won't start

```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing process
pkill -9 -f "node server.js"

# Check for syntax errors
node -c server.js
```

### Kafka listener not working

1. Verify Kafka credentials in `.env`
2. Check consumer group compatibility
3. Ensure Firebase is initialized
4. Check server logs for connection errors

### Chatbot not responding

1. Verify `CLAUDE_API_KEY` is set
2. Check model name: `claude-3-haiku-20240307`
3. Ensure Agentic API credentials are correct
4. Review server logs for API errors

### Firebase errors

1. Verify `GOOGLE_APPLICATION_CREDENTIALS` path
2. Check service account permissions
3. Ensure Firestore is enabled in Firebase Console
4. Verify collections exist: `users`, `kafka_messages`, `kafka_events`

---

## Security Notes

- API keys are stored in `.env` (never commit!)
- Firebase credentials in `firebase-service-account.json` (gitignored)
- Phone numbers stored securely in Firebase
- Use Secret Manager for production deployments
- Frontend Firebase config should use environment variables

---

## Performance

- **Response Time**: < 2s for chatbot responses
- **WebSocket**: Real-time message broadcasting
- **Kafka**: Asynchronous message processing
- **Firebase**: Cached reads for faster queries
- **Cloud Run**: Auto-scaling 0-10 instances

---

## License

ISC

---

## Contributing

This is a hackathon project. For improvements or bug fixes, please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## Support

For questions or issues:
- Review documentation in `/docs`
- Check [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) for detailed architecture
- See [examples/](examples/) for code samples

---

## Acknowledgments

- **Anthropic Claude AI** for conversational intelligence
- **agentic-ai-chat.app** for iMessage API integration
- **Confluent Cloud** for Kafka messaging
- **Firebase** for real-time database
- Built with ❤️ for hackathon

---

**Version**: 2.0.0
**Last Updated**: December 2025
