const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

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

// Serve static files from public directory with cache control
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Mock data for demonstration
const mockSkills = [
  {
    id: '1',
    name: 'Psychologist',
    slug: 'psychologist',
    description: 'Provides empathetic, supportive conversation',
    category: 'DOMAIN_EXPERTISE',
    prompt: 'You are a supportive psychologist...',
    isBuiltin: true,
    priority: 10
  },
  {
    id: '2',
    name: 'Marketer',
    slug: 'marketer',
    description: 'Expert in marketing strategy',
    category: 'DOMAIN_EXPERTISE',
    prompt: 'You are an experienced marketing professional...',
    isBuiltin: true,
    priority: 10
  },
  {
    id: '3',
    name: 'Friendly',
    slug: 'friendly',
    description: 'Warm, approachable tone',
    category: 'COMMUNICATION',
    prompt: 'You are friendly and approachable...',
    isBuiltin: true,
    priority: 5
  }
];

const mockAgents = [
  {
    id: 'agent-1',
    name: 'Marketing Assistant',
    description: 'Helps with marketing tasks',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    isActive: true,
    skills: ['1', '3']
  },
  {
    id: 'agent-2',
    name: 'Therapy Bot',
    description: 'Provides emotional support',
    model: 'openai/gpt-4o-mini',
    temperature: 0.8,
    isActive: true,
    skills: ['1']
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Skills API
app.get('/skills', (req, res) => {
  res.json({
    success: true,
    data: {
      skills: mockSkills,
      total: mockSkills.length
    }
  });
});

app.get('/skills/builtin', (req, res) => {
  res.json({
    success: true,
    data: mockSkills.filter(s => s.isBuiltin)
  });
});

app.get('/skills/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'PERSONALITY', name: 'Personality', description: 'Core personality traits' },
      { id: 'DOMAIN_EXPERTISE', name: 'Domain Expertise', description: 'Professional knowledge' },
      { id: 'COMMUNICATION', name: 'Communication', description: 'Communication style' },
      { id: 'CUSTOM', name: 'Custom', description: 'User-created skills' }
    ]
  });
});

// Agents API
app.get('/agents', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: mockAgents,
      total: mockAgents.length
    }
  });
});

app.get('/agents/:id', (req, res) => {
  const agent = mockAgents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' }
    });
  }
  res.json({
    success: true,
    data: agent
  });
});

// Chat API
app.post('/chat/:agentId', async (req, res) => {
  const { message } = req.body;
  const agent = mockAgents.find(a => a.id === req.params.agentId);
  
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' }
    });
  }

  // Mock response
  const responses = [
    "Hello! I'm here to help you with your request.",
    "That's an interesting question. Let me think about it...",
    "I can definitely help with that! Here's what I suggest...",
    "Thanks for reaching out! How can I assist you today?"
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  res.json({
    success: true,
    data: {
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date().toISOString()
      },
      agent: {
        id: agent.id,
        name: agent.name
      },
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      },
      latencyMs: 1200
    }
  });
});

// Tools API
app.get('/tools', (req, res) => {
  res.json({
    success: true,
    data: {
      tools: [
        { id: '1', name: 'Web Search', slug: 'web_search', category: 'DATA_ACCESS', isBuiltin: true },
        { id: '2', name: 'File System', slug: 'file_system', category: 'FILE_SYSTEM', isBuiltin: true },
        { id: '3', name: 'Telegram Sender', slug: 'telegram_send', category: 'COMMUNICATION', isBuiltin: true }
      ],
      total: 3
    }
  });
});

// Serve chat interface at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong!' }
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 AI Agent Platform API Server');
  console.log('================================');
  console.log(`Server running on port ${PORT}`);
  console.log('');
  console.log('🔗 Web Interface:');
  console.log(`   Chat UI: http://localhost:${PORT}/`);
  console.log('');
  console.log('🔗 API Endpoints:');
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Skills:  http://localhost:${PORT}/skills`);
  console.log(`   Agents:  http://localhost:${PORT}/agents`);
  console.log('================================');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
