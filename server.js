const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;

// Simple router
const routes = {
  'GET /': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'AI Agent Platform API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /health',
        skills: 'GET /skills (coming soon)',
        agents: 'GET /agents (coming soon)',
        chat: 'POST /chat (coming soon)',
        tools: 'GET /tools (coming soon)',
        telegram: 'POST /telegram/webhook (coming soon)'
      }
    }, null, 2));
  },
  
  'GET /health': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    }, null, 2));
  },
  
  'GET /skills': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: [
        { id: '1', name: 'Psychologist', category: 'DOMAIN_EXPERTISE', isBuiltin: true },
        { id: '2', name: 'Marketer', category: 'DOMAIN_EXPERTISE', isBuiltin: true },
        { id: '3', name: 'Data Analyst', category: 'DOMAIN_EXPERTISE', isBuiltin: true }
      ]
    }, null, 2));
  },
  
  'GET /agents': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: [
        { 
          id: 'agent-1', 
          name: 'Marketing Assistant', 
          description: 'Helps with marketing tasks',
          model: 'openai/gpt-4o-mini',
          isActive: true
        }
      ]
    }, null, 2));
  }
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const key = `${req.method} ${req.url}`;
  const handler = routes[key];
  
  if (handler) {
    handler(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${key} not found`
      }
    }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log('🚀 AI Agent Platform API Server');
  console.log('================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/`);
  console.log('================================');
  console.log('\nAvailable endpoints:');
  console.log('  GET  /         - API info');
  console.log('  GET  /health   - Health check');
  console.log('  GET  /skills   - List skills');
  console.log('  GET  /agents   - List agents');
  console.log('\nPress Ctrl+C to stop');
});
