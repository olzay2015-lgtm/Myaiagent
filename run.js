const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4001;

const agents = [
  { id: 'agent-1', name: 'Маркетолог', role: 'Маркетинг и продвижение' },
  { id: 'agent-2', name: 'Психолог', role: 'Психологическая поддержка' },
  { id: 'agent-3', name: 'Аналитик', role: 'Анализ данных' },
  { id: 'agent-4', name: 'Помощник', role: 'Общая помощь' }
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'AI Agent Platform',
      version: '1.0.0',
      status: 'running',
      agents: agents
    }));
    return;
  }

  if (req.url === '/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, agents: agents }));
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  const filePath = path.join(__dirname, 'apps/api/public', req.url);
  if (req.url.endsWith('.html') && fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(filePath));
    return;
  }

  if (req.url === '/index.html' || req.url === '/web') {
    const indexPath = path.join(__dirname, 'apps/api/public/index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(indexPath));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('='.repeat(40));
  console.log('🚀 AI Agent Platform');
  console.log('='.repeat(40));
  console.log(`http://localhost:${PORT}/ - Web interface`);
  console.log(`http://localhost:${PORT}/agents - List agents`);
  console.log(`http://localhost:${PORT}/health - Health check`);
  console.log('='.repeat(40));
});