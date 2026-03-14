const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Mock data
const mockAgents = [
  {
    id: 'agent-1',
    name: 'Marketing Assistant',
    description: 'Helps with marketing tasks',
    model: 'openai/gpt-4o-mini',
    isActive: true
  },
  {
    id: 'agent-2',
    name: 'Therapy Bot',
    description: 'Provides emotional support',
    model: 'openai/gpt-4o-mini',
    isActive: true
  }
];

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/agents', (req, res) => {
  res.json({ success: true, data: { agents: mockAgents, total: mockAgents.length } });
});

app.post('/chat/:agentId', (req, res) => {
  const responses = [
    "Hello! I'm here to help you with your request.",
    "That's an interesting question. Let me think about it...",
    "I can definitely help with that! Here's what I suggest...",
    "Thanks for reaching out! How can I assist you today?"
  ];
  
  res.json({
    success: true,
    data: {
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      }
    }
  });
});

// Serve chat interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create server
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 AI Agent Platform Server Started!');
  console.log('================================');
  console.log(`Server running on:`);
  console.log(`  • Local:   http://localhost:${PORT}/`);
  console.log(`  • Network: http://0.0.0.0:${PORT}/`);
  console.log('================================');
  console.log('\nThe server is now running!');
  console.log('DO NOT CLOSE THIS WINDOW!');
  console.log('\nPress Ctrl+C to stop the server\n');
});

// Keep alive
setInterval(() => {
  console.log(`[${new Date().toLocaleTimeString()}] Server is running on port ${PORT}`);
}, 30000);
