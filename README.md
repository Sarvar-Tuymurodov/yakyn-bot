# Yakyn - Bot Backend

Telegram Bot and API backend for the Yakyn Mini App. Handles user management, contact reminders, AI integrations, and scheduled notifications.

## Features

### Current Features
- **Telegram Bot** - Welcome messages and Mini App integration
- **REST API** - Endpoints for contacts, users, and AI features
- **Scheduled Reminders** - Cron-based reminder notifications via Telegram
- **Voice Transcription** - Speech-to-text using:
  - OpenAI Whisper (Russian)
  - ElevenLabs Scribe (Uzbek)
- **AI Features**:
  - Voice-to-Contact parsing (extract name, frequency, notes, birthday from speech)
  - Message suggestions based on contact context
- **Database** - PostgreSQL with Prisma ORM

### Tech Stack
- Node.js + TypeScript
- Express.js
- grammY (Telegram Bot Framework)
- Prisma ORM
- PostgreSQL
- OpenAI API
- ElevenLabs API

## Project Structure

```
src/
├── bot/
│   ├── commands/      # Bot commands (/start)
│   └── index.ts       # Bot setup
├── routes/            # Express API routes
│   ├── contacts.ts
│   ├── users.ts
│   └── ai.ts
├── services/          # Business logic
│   ├── contact.service.ts
│   ├── user.service.ts
│   ├── ai.service.ts
│   └── reminder.service.ts
├── cron/              # Scheduled tasks
│   └── reminders.ts
└── index.ts           # App entry point

prisma/
└── schema.prisma      # Database schema
```

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yakyn

# Telegram
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=https://your-mini-app.com

# AI Services
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Server
PORT=3000
```

## API Endpoints

### Users
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update user settings

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/:id/contacted` - Mark as contacted
- `DELETE /api/contacts/:id/contacted` - Undo mark contacted
- `POST /api/contacts/:id/snooze` - Snooze reminder

### AI
- `POST /api/ai/transcribe` - Transcribe audio to text
- `POST /api/ai/voice-to-contact` - Parse voice into contact data
- `POST /api/ai/suggestions` - Get message suggestions

## Future Plans

See [Future Features](#future-features) section below.

---

## Future Features

### Priority 1 - Backend Improvements
- [ ] **Rate Limiting** - Protect API from abuse
- [ ] **Caching** - Redis for frequently accessed data
- [ ] **Error Tracking** - Sentry integration
- [ ] **Logging** - Structured logging with Winston

### Priority 2 - Notification Enhancements
- [ ] **Smart Timing** - Send reminders at user's preferred time
- [ ] **Reminder Batching** - Combine multiple reminders into one message
- [ ] **Rich Messages** - Inline buttons for quick actions
- [ ] **Reminder Preview** - Show upcoming reminders summary

### Priority 3 - AI Improvements
- [ ] **Better Voice Parsing** - Handle more natural language variations
- [ ] **Context-Aware Suggestions** - Use conversation history for better suggestions
- [ ] **Multi-language Support** - Add more languages for transcription
- [ ] **Voice Notes** - Save and transcribe voice notes about contacts

### Priority 4 - Infrastructure
- [ ] **Webhook Mode** - Switch from polling to webhooks
- [ ] **Health Checks** - Endpoint for monitoring
- [ ] **Database Backups** - Automated backup strategy
- [ ] **Analytics** - Track usage patterns for insights
