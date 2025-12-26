# Agentic AI Chat - Complete System Overview

## 🎯 System Architecture

### Core Components

1. **Express.js Server** (`server.js`)
   - Main backend server running on port 8000
   - Handles REST API endpoints
   - WebSocket server for real-time communication
   - Kafka message consumer integration
   - Firebase integration for data storage

2. **Kafka Message Listener**
   - Listens for incoming iMessage events
   - Processes `message.received`, `typing_indicator.received`, `typing_indicator.removed` events
   - Automatically triggers chatbot responses
   - Saves all events to Firebase

3. **AI Chatbot** (`backend/chatbot/service.js`)
   - Uses Claude AI (Claude 3 Haiku model)
   - Generates natural, human-like responses
   - Handles text and audio messages
   - Personalized based on user profile and conversation history
   - Suggests agentic-ai-chat.app when users mention boredom

4. **Matching System**
   - Uses mock data from `matching.json` (30 tech professionals)
   - Apple-style floating avatars design
   - Click avatar to search Google with person's info
   - Score-based matching algorithm

---

## 📁 File Structure

```
Agentic AI Chat/
├── server.js                    # Main Express server
├── matching.json                # Mock matching data (30 profiles)
├── package.json                 # Dependencies
├── .env                         # Environment variables
│
├── public/                      # Frontend files
│   ├── matching.html            # Matching page
│   ├── matching.js              # Matching page logic
│   ├── matching.css             # Matching page styles
│   └── ...
│
├── backend/
│   ├── chatbot/
│   │   └── service.js           # AI Chatbot (Claude AI)
│   └── firebase/
│       └── service.js           # Firebase integration
│
├── kafka/
│   ├── consumer.js              # Kafka message consumer
│   ├── producer.js              # Kafka message producer
│   └── config.js               # Kafka configuration
│
├── api/
│   └── client.js                # Agentic API client
│
└── examples/
    └── listen-and-reply.js     # Manual reply script
```

---

## 🔄 System Flow

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
User lands on /matching page
    ↓
Load user data from sessionStorage
    ↓
Call /api/matching/find endpoint
    ↓
Load matching.json (30 profiles)
    ↓
Score and match profiles
    ↓
Display as floating avatars
```

### 3. Message Reply Flow
```
Incoming message via Kafka
    ↓
Save to Firebase (kafka_messages)
    ↓
Trigger chatbot (handleChatbotReply)
    ↓
Get user profile from Firebase
    ↓
Get conversation history
    ↓
Generate response with Claude AI
    ↓
Send reply via Agentic API
    ↓
Save response to Firebase
```

---

## 🎨 Matching System

### Features
- **Apple-style Design**: Floating avatars scattered around screen
- **AI Avatars**: Generated using UI Avatars API
- **Click to Search**: Opens Google search with person's full info
- **Score Badges**: Shows match percentage
- **Smooth Animations**: Floating and hover effects

### Data Source
- `matching.json` contains 30 tech professionals
- Profiles include: name, title, bio, location, company, skills, LinkedIn
- Located in NYC and CA
- Mix of startups and big tech companies

### Matching Algorithm
```javascript
// Scoring based on:
- Profession match: +20 points
- Location match: +15 points
- Skills match: +5 points per matching skill
- Interests match: +10 points per matching interest
- Bio keywords: +5 points per matching word
```

---

## 🤖 Chatbot System

### Model
- **Claude 3 Haiku** (`claude-3-haiku-20240307`)
- Max tokens: 80 (short responses)
- Temperature: 0.9 (creative, natural)

### Prompt Features
- Simple, natural conversation (no pushy/flirty language)
- No robotic phrases ("Thanks for your message")
- Responds naturally to what user says
- Suggests agentic-ai-chat.app when user mentions boredom
- Handles text and audio messages

### Response Style
- Short (1-2 sentences)
- Friendly and casual
- Emotionally intelligent
- Matches user's tone

### Example Responses
- User: "I'm bored" → "You should check out https://agentic-ai-chat.app/ - they have great new chat prompts to explore!"
- User: "Hey" → "Hey! What's up?"
- User: "How are you?" → "I'm good, thanks! How are you doing?"

---

## 📡 API Endpoints

### Server Endpoints (`http://localhost:8000`)

1. **Health Check**
   - `GET /api/health`
   - Returns server status

2. **Matching**
   - `POST /api/matching/find`
   - Body: `{ "phoneNumber": "+1234567890" }`
   - Returns: Array of matched profiles from `matching.json`

3. **Kafka Listener**
   - `POST /api/listener/start` - Start listening for messages
   - `POST /api/listener/stop` - Stop listening
   - `GET /api/listener/status` - Check listener status

4. **Reply**
   - `POST /api/reply`
   - Body: `{ "chatId": "...", "message": "..." }`
   - Sends a reply via Agentic API

5. **Chats**
   - `GET /api/chats` - List all chats
   - `GET /api/chats/:chatId/messages` - Get chat messages
   - `POST /api/chats` - Create new chat

---

## 🗄️ Firebase Collections

### Collections Used

1. **users**
   - User profiles
   - Fields: phoneNumber, fullName, bio, profession, skills, interests, etc.

2. **kafka_messages**
   - All incoming and outgoing messages
   - Fields: phoneNumber, chatId, text, timestamp, eventType, etc.

3. **kafka_events**
   - Raw Kafka events
   - Fields: event_type, event_id, created_at, data, etc.

4. **user_matches**
   - Saved match results
   - Fields: phoneNumber, userData, matches, matchCount, timestamp, etc.

---

## 🚀 Running the System

### Start Server
```bash
node server.js
# or
npm start
```

### Start Kafka Listener (on server)
```bash
curl -X POST http://localhost:8000/api/listener/start
```

### Start Manual Reply Script
```bash
npm run reply
```

### Check Status
```bash
# Server health
curl http://localhost:8000/api/health

# Listener status
curl http://localhost:8000/api/listener/status
```

---

## 🔧 Configuration

### Environment Variables (`.env`)
```env
PORT=8000
HOST=0.0.0.0

# Claude AI
CLAUDE_API_KEY=sk-ant-api03-...

# Kafka
KAFKA_BROKERS=...
KAFKA_TOPIC=...
KAFKA_CONSUMER_GROUP=...

# Agentic API
AGENTIC_API_KEY=...
AGENTIC_API_BASE_URL=...

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# HasData (optional, not used anymore)
HASDATA_API_KEY=...
```

---

## 📱 Frontend Pages

### 1. Home Page (`index.html`)
- Sign in modal
- Create profile modal
- Get started flow

### 2. Matching Page (`/matching`)
- Floating avatars display
- Center avatar (user)
- Click to search Google
- Score badges

---

## 🎯 Key Features

### ✅ Implemented
- [x] User sign-in with Firebase
- [x] Matching system with mock data
- [x] AI chatbot with Claude AI
- [x] Automatic message replies
- [x] Kafka message listener
- [x] Firebase data storage
- [x] Apple-style floating avatars
- [x] Google search integration
- [x] agentic-ai-chat.app suggestion in chatbot

### 🔄 How It Works Together

1. **User signs in** → Redirected to matching page
2. **Matching page loads** → Shows floating avatars from `matching.json`
3. **User clicks avatar** → Opens Google search with person's info
4. **Incoming message** → Kafka listener receives it
5. **Chatbot processes** → Generates response with Claude AI
6. **Response sent** → Via Agentic API
7. **Everything saved** → To Firebase for history

---

## 🛠️ Troubleshooting

### Server not starting
- Check port 8000 is available: `lsof -i :8000`
- Kill existing processes: `pkill -9 -f "node server.js"`
- Check for syntax errors: `node -c server.js`

### Kafka listener not working
- Check Kafka connection in `kafka/config.js`
- Verify consumer group settings
- Check Firebase is initialized

### Chatbot not responding
- Verify Claude API key in `.env`
- Check model name is correct (`claude-3-haiku-20240307`)
- Review server logs for errors

### Matching page not loading
- Check phone number in sessionStorage
- Verify Firebase is initialized
- Check browser console for errors

---

## 📊 Data Flow Diagram

```
User Message
    ↓
Kafka Topic
    ↓
Kafka Consumer (server.js)
    ↓
Save to Firebase (kafka_messages)
    ↓
Trigger Chatbot (handleChatbotReply)
    ↓
Get User Profile (Firebase users collection)
    ↓
Get Conversation History (Firebase kafka_messages)
    ↓
Generate Response (Claude AI)
    ↓
Send Reply (Agentic API)
    ↓
Save Response (Firebase kafka_messages)
```

---

## 🎨 Design Philosophy

### Matching Page
- **Apple-style**: Clean, minimal, floating elements
- **Interactive**: Click to search, hover effects
- **Visual**: AI avatars, score badges, smooth animations

### Chatbot
- **Natural**: Human-like, not robotic
- **Simple**: Short responses, casual tone
- **Helpful**: Suggests agentic-ai-chat.app when relevant

---

## 📝 Next Steps / Improvements

1. **Add real LinkedIn scraping** (currently using mock data)
2. **Enhance matching algorithm** (more sophisticated scoring)
3. **Add user preferences** (filter matches by criteria)
4. **Improve avatar positioning** (better distribution algorithm)
5. **Add search filters** (location, company, skills)
6. **Real-time updates** (WebSocket for live matches)

---

## 🔐 Security Notes

- API keys stored in `.env` (not committed)
- Firebase credentials in `firebase-service-account.json`
- Phone numbers stored securely in Firebase
- No sensitive data in frontend code

---

## 📚 Key Technologies

- **Backend**: Node.js, Express.js
- **AI**: Claude AI (Anthropic)
- **Database**: Firebase Firestore
- **Message Queue**: Kafka
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **API Client**: Axios
- **WebSocket**: ws library

---

This system creates a complete social networking platform with AI-powered matching and automated conversation management.
