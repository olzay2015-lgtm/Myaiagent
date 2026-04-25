const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env
require('dotenv').config();

const PORT = process.env.PORT || 4001;

const AGENT_PROMPTS = {
  'agent-1': 'Ты Маркетолог. Помогаешь с маркетингом, продвижением и продажами. Давай полезные советы по бизнесу.',
  'agent-2': 'Ты Психолог. Помогаешь с психологической поддержкой и эмоциональным здоровьем. Будь эмпатичным.',
  'agent-3': 'Ты Аналитик. Помогаешь анализировать данные и находить решения. Будь точным и практичным.',
  'agent-4': 'Ты Помощник. Помогаешь с любыми вопросами. Давай полезные и подробные ответы.'
};

const agents = [
  { id: 'agent-1', name: 'Маркетолог', role: 'Маркетинг и продвижение' },
  { id: 'agent-2', name: 'Психолог', role: 'Психологическая поддержка' },
  { id: 'agent-3', name: 'Аналитик', role: 'Анализ данных' },
  { id: 'agent-4', name: 'Помощник', role: 'Общая помощь' }
];

// SQLite setup
const Database = require('better-sqlite3');
const db = new Database('conversations.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );
  
  CREATE TABLE IF NOT EXISTS user_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    confidence REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fact_key)
  );
`);

// Helper functions
function getOrCreateConversation(agentId) {
  const existing = db.prepare(`
    SELECT id FROM conversations 
    WHERE agent_id = ? 
    ORDER BY updated_at DESC 
    LIMIT 1
  `).get(agentId);
  
  if (existing) {
    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
    return existing.id;
  }
  
  const agent = agents.find(a => a.id === agentId);
  const title = agent ? agent.name : 'New Chat';
  
  const result = db.prepare('INSERT INTO conversations (agent_id, title) VALUES (?, ?)').run(agentId, title);
  return result.lastInsertRowid;
}

function addMessage(conversationId, role, content) {
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversationId, role, content);
  db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conversationId);
}

function getConversationHistory(conversationId) {
  return db.prepare(`
    SELECT role, content FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `).all(conversationId);
}

function getRecentConversations(limit = 10) {
  return db.prepare(`
    SELECT c.id, c.agent_id, c.title, c.updated_at,
           (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM conversations c
    ORDER BY c.updated_at DESC
    LIMIT ?
  `).all(limit);
}

// User facts functions
function getUserFacts() {
  return db.prepare('SELECT * FROM user_facts ORDER BY updated_at DESC').all();
}

function saveUserFact(key, value, category = 'general') {
  const normalizedKey = key.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM user_facts WHERE fact_key = ?').get(normalizedKey);
  
  if (existing) {
    db.prepare('UPDATE user_facts SET fact_value = ?, updated_at = CURRENT_TIMESTAMP WHERE fact_key = ?').run(value, normalizedKey);
  } else {
    db.prepare('INSERT INTO user_facts (fact_key, fact_value, category) VALUES (?, ?, ?)').run(normalizedKey, value, category);
  }
}

async function extractFactsFromMessage(message) {
  const facts = [];
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://64.188.116.103:4001',
        'X-Title': 'AI Agent Platform'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'Ты - эксперт по извлечению фактов из текста. Извлеки важные факты о пользователе из текста ниже. Верни результат в формате JSON массива с объектами: [{"key": "имя_факта", "value": "значение", "category": "категория"}]. Категории: personal, work, location, interests, business, goals. Если фактов нет - верни пустой массив []. Отвечай ТОЛЬКО массивом JSON, без пояснений.' 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '[]';
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.log('Failed to parse facts:', content);
    }
  } catch (e) {
    console.error('Error extracting facts:', e.message);
  }
  
  return facts;
}

async function processAndSaveFacts(agentReply, conversationId) {
  const lastMessages = db.prepare(`
    SELECT content FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at DESC 
    LIMIT 5
  `).all(conversationId);
  
  const combinedText = lastMessages.map(m => m.content).join('\n');
  const facts = await extractFactsFromMessage(combinedText);
  
  for (const fact of facts) {
    if (fact.key && fact.value) {
      saveUserFact(fact.key, fact.value, fact.category || 'general');
    }
  }
  
  return facts.length;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get recent conversations
  if (req.url === '/conversations' && req.method === 'GET') {
    const conversations = getRecentConversations(10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, conversations }));
    return;
  }

  // Get user facts (long-term memory)
  if (req.url === '/facts' && req.method === 'GET') {
    const facts = getUserFacts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, facts }));
    return;
  }

  // Get conversation history
  if (req.url.startsWith('/chat/') && req.method === 'GET') {
    const idPart = req.url.split('/')[2];
    
    // Check if it's an agent ID (starts with 'agent-')
    if (idPart && idPart.startsWith('agent-')) {
      // Get most recent conversation for this agent
      const recent = db.prepare(`
        SELECT id FROM conversations 
        WHERE agent_id = ?
        ORDER BY updated_at DESC LIMIT 1
      `).get(idPart);
      
      if (recent) {
        const history = getConversationHistory(recent.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, conversationId: recent.id, history }));
        return;
      } else {
        // No conversation exists for this agent
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, conversationId: null, history: [] }));
        return;
      }
    }
    
    // Otherwise, treat as conversation ID
    const conversationId = parseInt(idPart);
    
    if (!conversationId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, conversationId: null, history: [] }));
      return;
    }
    
    const history = getConversationHistory(conversationId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, conversationId, history }));
    return;
  }

  if (req.url === '/') {
    const indexPath = path.join(__dirname, 'apps/api/public/index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(indexPath));
      return;
    }
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

  // Chat endpoint
  if ((req.url === '/chat' || req.url.startsWith('/chat/')) && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const message = data.message;
        const conversationId = data.conversationId;
        let agentId = data.agentId || 'agent-4';
        
        // Extract agentId from URL if present
        if (req.url.startsWith('/chat/')) {
          const urlAgentId = req.url.split('/')[2];
          if (urlAgentId && urlAgentId.startsWith('agent-')) agentId = urlAgentId;
        }
        
        // Get or create conversation
        let convId = conversationId;
        if (!convId || convId === null || convId === undefined) {
          convId = getOrCreateConversation(agentId);
        }
        
        // Verify conversation exists
        const existingConv = db.prepare('SELECT id FROM conversations WHERE id = ?').get(convId);
        if (!existingConv) {
          convId = getOrCreateConversation(agentId);
        }
        
        // Add user message
        addMessage(convId, 'user', message);
        
        // Get conversation history for context
        const history = getConversationHistory(convId);
        
        // Get user facts for long-term memory
        const userFacts = getUserFacts();
        let factsContext = '';
        if (userFacts.length > 0) {
          factsContext = '\nИзвестные факты о пользователе:\n';
          userFacts.forEach(fact => {
            factsContext += `- ${fact.fact_key}: ${fact.fact_value}\n`;
          });
        }
        
        const systemPrompt = (AGENT_PROMPTS[agentId] || AGENT_PROMPTS['agent-4']) + factsContext;
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({ role: h.role, content: h.content }))
        ];
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://64.188.116.103:4001',
            'X-Title': 'AI Agent Platform'
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages: messages
          })
        });
        
        const result = await response.json();
        const reply = result.choices?.[0]?.message?.content || 'Ошибка';
        
        // Add assistant message
        addMessage(convId, 'assistant', reply);
        
        // Extract and save user facts
        await processAndSaveFacts(reply, convId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, reply, conversationId: convId }));
      } catch (e) {
        console.error('Chat error:', e.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, reply: 'Ошибка: ' + e.message }));
      }
    });
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
  console.log(`http://localhost:${PORT}/conversations - Recent chats`);
  console.log('='.repeat(40));
});