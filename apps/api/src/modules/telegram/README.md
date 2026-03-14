# Telegram Integration

A comprehensive Telegram integration for the AI Agent Platform that allows users to chat with their agents through Telegram using a single platform-wide bot.

## Architecture

### Single Bot Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Telegram Platform                             │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ Telegram Bot │  ← 1 bot serves all users                    │
│  │  @YourBot    │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         │ Webhook                                                │
│         ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                Telegram Service                             │ │
│  │                                                             │ │
│  │  1. Receive webhook update                                 │ │
│  │  2. Identify Telegram user                                 │ │
│  │  3. Map to platform user                                   │ │
│  │  4. Route to correct agent                                 │ │
│  │  5. Process through AgentCore                              │ │
│  │  6. Send reply back to Telegram                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Agent 1    │    │   Agent 2    │    │   Agent N    │       │
│  │  (User A)    │    │  (User B)    │    │  (User C)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow

1. **User sends message** to Telegram bot
2. **Telegram sends webhook** to platform
3. **TelegramService** receives and processes the update
4. **User Mapping** - Find or create Telegram user mapping
5. **Agent Resolution** - Find the active agent for this user
6. **Message Routing** - Send to AgentCore for processing
7. **Reply Sending** - Send response back to Telegram user

## Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow instructions to create bot
4. Save the bot token

### 2. Configure Environment

Add to `.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your-secret-for-webhook-verification
```

### 3. Set Webhook

The webhook is automatically set when the server starts. Alternatively:

```bash
POST /api/telegram/webhook/setup-webhook
```

### 4. Configure Agent

Users can connect their agent to Telegram:

```bash
POST /api/telegram/config/:agentId
{
  "welcomeMessage": "Welcome! I'm here to help.",
  "allowAllUsers": true,
  "showTypingIndicator": true,
  "voiceEnabled": false
}
```

## API Endpoints

### Webhook Endpoints

```
POST /api/telegram/webhook/webhook
# Receives updates from Telegram (automatic)

GET /api/telegram/webhook/webhook-info
# Get webhook status and bot info

POST /api/telegram/webhook/setup-webhook
# Manually setup webhook

POST /api/telegram/webhook/send-test
# Send test message (requires chatId)
```

### Configuration Endpoints

```
GET /api/telegram/config
# List all Telegram configurations

GET /api/telegram/config/:agentId
# Get config for specific agent

POST /api/telegram/config/:agentId
# Create/update Telegram config
{
  "welcomeMessage": "Hello!",
  "allowAllUsers": true,
  "allowedUserIds": ["123456789"],
  "showTypingIndicator": true,
  "voiceEnabled": false
}

DELETE /api/telegram/config/:agentId
# Remove Telegram config

POST /api/telegram/config/:agentId/test
# Test connection (sends test message)
{
  "chatId": "123456789"
}

POST /api/telegram/config/:agentId/toggle
# Enable/disable Telegram
{
  "isActive": true
}

POST /api/telegram/link
# Link Telegram user to platform account
{
  "telegramUserId": "123456789",
  "platformUserId": "platform-user-id"
}

GET /api/telegram/stats
# Get Telegram usage statistics
```

## User Flow

### First Time User

1. User finds bot on Telegram (e.g., @YourPlatformBot)
2. User sends `/start`
3. Bot welcomes them and explains:
   - They need to create an agent on the platform
   - Connect Telegram in agent settings
   - Return to chat

### Returning User

1. User sends message to bot
2. Bot identifies user via Telegram ID
3. Bot finds user's active agent
4. Message processed through AgentCore
5. Reply sent back to user

### Multiple Agents

Users can have multiple agents:

```
User: /agents
Bot: Your Connected Agents:
     1. ✅ Marketing Assistant
        _Helps with marketing tasks_
     
     2. Code Reviewer
        _Reviews your code_
     
     Use /switch <number> to change agent

User: /switch 2
Bot: ✅ Switched to agent: Code Reviewer
     You can now start chatting!
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show welcome message |
| `/help` | Show help and available commands |
| `/agents` | List your connected agents |
| `/switch <number>` | Switch to a different agent |

## Database Schema

### TelegramConfig

```typescript
{
  id: string;
  agentId: string;          // Link to agent
  botToken: string;         // Encrypted platform token
  botUsername: string;      // @YourBot
  webhookUrl: string;       // Webhook URL
  webhookSecret: string;    // For verification
  welcomeMessage?: string;  // Custom welcome message
  unknownCommandMsg?: string;
  isActive: boolean;        // Enabled/disabled
  allowAllUsers: boolean;   // Allow any Telegram user
  allowedUserIds: string[]; // Specific Telegram user IDs
  showTypingIndicator: boolean;
  voiceEnabled: boolean;
  totalMessages: number;    // Stats
  createdAt: Date;
  updatedAt: Date;
}
```

### TelegramUserMapping

```typescript
{
  id: string;
  telegramUserId: string;   // Telegram's user ID
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  platformUserId?: string;  // Link to platform account (optional)
  totalInteractions: number;
  createdAt: Date;
  lastInteractionAt: Date;
}
```

### Conversation

Telegram conversations are tracked with `channel: 'TELEGRAM'`:

```typescript
{
  id: string;
  agentId: string;
  userId: string;
  channel: 'TELEGRAM';
  channelMetadata: {
    telegramChatId: string;
    telegramUserId: string;
  };
  // ... other fields
}
```

## Features

### ✅ Supported

- **Text Messages** - Full support
- **Typing Indicator** - Shows "typing..." while processing
- **Reply to Messages** - Contextual replies
- **Multiple Agents** - Switch between agents
- **Markdown Formatting** - Bold, italic, code, etc.
- **Long Messages** - Automatic splitting (max 4096 chars)
- **Conversation History** - Persisted in database
- **Message Routing** - Correct agent per user
- **Webhook Security** - Secret token verification

### 🚧 Planned

- **Voice Messages** - Transcription support
- **Images** - Image understanding
- **Inline Buttons** - Interactive responses
- **Group Chats** - Multi-user support
- **File Sharing** - Document processing

## Code Example

### Sending Message to Telegram User

```typescript
import { telegramService } from './providers/telegram';

await telegramService.sendReply({
  chatId: '123456789',
  text: 'Hello from your AI agent!',
  parseMode: 'Markdown',
  replyToMessageId: 123, // Optional: reply to specific message
});
```

### Processing Telegram Message

```typescript
// This is handled automatically by TelegramService
// But here's how it works internally:

const telegramMessage = {
  telegramUserId: '123456789',
  telegramChatId: '123456789',
  text: 'Hello!',
  // ...
};

// 1. Map Telegram user to platform
const userMapping = await getOrCreateUserMapping(telegramMessage);

// 2. Find active agent
const agent = await getActiveAgent(telegramMessage.telegramUserId);

// 3. Get or create conversation
const conversation = await getOrCreateConversation(
  telegramMessage.telegramUserId,
  agent.id,
  telegramMessage.telegramChatId
);

// 4. Process through AgentCore
const result = await agentCore.process(
  agent.id,
  agent.ownerId,
  telegramMessage.text,
  {
    metadata: {
      conversationId: conversation.id,
      channel: 'TELEGRAM',
      telegramChatId: telegramMessage.telegramChatId,
    },
  }
);

// 5. Send reply
await telegramService.sendReply({
  chatId: telegramMessage.telegramChatId,
  text: result.message.content,
});
```

## Security

### Webhook Verification

```typescript
const secret = req.headers['x-telegram-bot-api-secret-token'];
if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### User Access Control

```typescript
// Only allow specific Telegram users
if (!config.allowAllUsers) {
  if (!config.allowedUserIds.includes(telegramUserId)) {
    throw new Error('User not authorized');
  }
}
```

### Token Encryption

In production, encrypt `botToken` in the database:

```typescript
// Encrypt before saving
const encryptedToken = encrypt(botToken, ENCRYPTION_KEY);

// Decrypt when using
const token = decrypt(encryptedToken, ENCRYPTION_KEY);
```

## Testing

### Using curl

```bash
# Test webhook
curl -X POST https://your-domain.com/api/telegram/webhook/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 123456789,
        "type": "private"
      },
      "date": 1234567890,
      "text": "Hello!"
    }
  }'

# Test message sending
curl -X POST https://your-domain.com/api/telegram/webhook/send-test \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "123456789",
    "text": "Test message from platform"
  }'
```

### Using the Bot

1. Start bot: `/start`
2. Check help: `/help`
3. List agents: `/agents`
4. Switch agent: `/switch 1`
5. Send message: `Hello, agent!`

## Troubleshooting

### Bot Not Responding

1. Check webhook URL is correct
2. Verify bot token is valid
3. Check server logs for errors
4. Test webhook manually

### User Can't Access Agent

1. Check `allowedUserIds` includes user's Telegram ID
2. Verify `isActive` is true
3. Check agent exists and belongs to user

### Messages Not Routing

1. Check TelegramUserMapping exists
2. Verify active agent is set
3. Check conversation is created with correct metadata

## Environment Variables

```env
# Required
TELEGRAM_BOT_TOKEN=your-bot-token

# Optional (but recommended)
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=random-secret-string
```

## License

MIT
