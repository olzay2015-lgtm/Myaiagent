const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'AI Agent Platform API is running!'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'AI Agent Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      skills: '/skills (coming soon)',
      agents: '/agents (coming soon)',
      chat: '/chat (coming soon)',
      tools: '/tools (coming soon)',
      telegram: '/telegram (coming soon)'
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 AI Agent Platform API Server');
  console.log('================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('================================');
});
