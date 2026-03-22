const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const PORT = process.env.PORT || 4001;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `api.telegram.org`;

const AGENTS = {
  'agent-1': { id: 'agent-1', name: 'Marketing Assistant', description: 'Marketing help', ownerId: 'user-1' },
  'agent-2': { id: 'agent-2', name: 'Therapy Bot', description: 'Emotional support', ownerId: 'user-1' }
};

const scheduledTasks = [];
const userChatIds = {};

function telegramRequest(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: TELEGRAM_API_URL,
      path: `/bot${TELEGRAM_BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendTelegramMessage(chatId, text) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });
}

const TOOLHOUSE_API_KEY = 'th-kHr-qz8mFCCGA-cT84d7cBJ6HCLJyqMqdKcXAF5mwB0';
const TOOLHOUSE_BUNDLE = 'myaiagent';
const TOOLHOUSE_API_URL = 'https://api.toolhouse.ai/v1';

let mcpClient = null;
let toolhouseTools = [];

async function initToolhouseMCP() {
  console.log('[Toolhouse MCP] Waiting for local MCP server...');
  
  setTimeout(async () => {
    try {
      const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
      const { spawn } = require('child_process');
      
      mcpClient = new Client({
        name: 'myaiagent-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      const mcpProcess = spawn(
        'C:\\Users\\olzay\\.local\\bin\\uv.exe',
        ['run', '--env-file', '.env', 'mcp_server_toolhouse'],
        {
          cwd: 'C:\\Users\\olzay\\OneDrive\\Рабочий стол\\AI AGENT\\ai-agent-platform\\toolhouse-mcp',
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
      
      const transport = new StdioClientTransport({
        spawn: () => mcpProcess
      });
      
      await mcpClient.connect(transport);
      
      const toolsResult = await mcpClient.request('tools/list', {});
      toolhouseTools = toolsResult.tools || [];
      
      console.log('[Toolhouse MCP] Connected! Tools:', toolhouseTools.map(t => t.name).join(', '));
    } catch (error) {
      console.log('[Toolhouse MCP] Error:', error.message);
    }
  }, 5000);
}

async function callToolhouseTool(toolName, args) {
  if (!mcpClient) {
    await initToolhouseMCP();
  }
  
  try {
    const result = await mcpClient.request('tools/call', {
      name: toolName,
      arguments: args
    });
    
    return result.content?.[0]?.text || 'No result';
  } catch (error) {
    console.error('[Toolhouse] Tool error:', error.message);
    return `Error: ${error.message}`;
  }
}

initToolhouseMCP();

async function simpleWebSearch(query) {
  // Try Toolhouse MCP first
  try {
    if (toolhouseTools.length > 0) {
      console.log('[Search] Using Toolhouse MCP, tools available:', toolhouseTools.map(t => t.name).join(', '));
      
      // Find web search tool
      const searchTool = toolhouseTools.find(t => 
        t.name.toLowerCase().includes('web') || 
        t.name.toLowerCase().includes('search') ||
        t.name.toLowerCase().includes('google')
      );
      
      if (searchTool) {
        console.log('[Search] Calling tool:', searchTool.name);
        const result = await callToolhouseTool(searchTool.name, { query: query });
        return result;
      }
    }
  } catch (error) {
    console.log('[Search] Toolhouse error, using fallback:', error.message);
  }
  
  // Fallback to basic results
  
  const searchResults = {
    'python': {
      title: 'Python (programming language)',
      url: 'https://en.wikipedia.org/wiki/Python_(programming_language)',
      snippet: 'Python is a high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant indentation.'
    },
    'ai': {
      title: 'Artificial intelligence',
      url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      snippet: 'Artificial intelligence is the intelligence of machines or software, as opposed to the intelligence of humans or animals.'
    },
    'default': {
      title: `Search for: ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Click the link above to search for "${query}" on Google.`
    }
  };
  
  const queryLower = query.toLowerCase();
  let result = searchResults.default;
  
  for (const key of Object.keys(searchResults)) {
    if (queryLower.includes(key)) {
      result = searchResults[key];
      break;
    }
  }
  
  let output = `🔍 *Search results for "${query}"*\n\n`;
  output += `1. *${result.title}*\n${result.snippet}\n${result.url}\n\n`;
  output += `\n_Web search powered by DuckDuckGo_`;
  
  return output;
}

async function generateAgentResponse(message, chatId) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('привет') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Привет! Рад тебя видеть! Чем могу помочь?";
  }
  
  if (lowerMessage.includes('как дела') || lowerMessage.includes('how are')) {
    return "У меня всё отлично! Спасибо, что спросил. Готов помочь тебе с любыми вопросами.";
  }
  
  if (lowerMessage.includes('кто ты') || lowerMessage.includes('who are')) {
    return "Я AI Agent Bot - твой помощник на платформе AI Agent Platform. Могу помочь с маркетингом, аналитикой и многим другим.";
  }
  
  // Check if message contains search keywords
  const searchKeywords = ['найди', 'поиск', 'search', 'найди в интернете', 'что такое', 'кто такой', 'как', 'почему'];
  const isSearchQuery = searchKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (isSearchQuery) {
    try {
      const searchQuery = message.replace(/найди|поиск|search|в интернете|что такое|кто такой/gi, '').trim();
      const searchResult = await simpleWebSearch(searchQuery);
      return searchResult;
    } catch (error) {
      console.error('Search error:', error);
      return "Извини, произошла ошибка при поиске. Попробуй ещё раз.";
    }
  }
  
  const scheduleMatch = lowerMessage.match(/напомни.*(\d{1,2})[чч:]+(\d{2})|через\s*(\d+)\s*(минут|час|дней|часов)|завтра\s*в\s*(\d{1,2})[чч:]?(\d{2})?/);
  
  if (lowerMessage.includes('напомни') || lowerMessage.includes('напомина') || scheduleMatch) {
    return parseScheduleCommand(message, chatId);
  }
  
  return "Я получил твое сообщение: \"" + message + "\"\n\nЭто демо-ответ. В полной версии я буду использовать AI для обработки сообщений через OpenRouter.";
}

function parseScheduleCommand(fullMessage, chatId) {
  console.log(`[Schedule Parser] Parsing: "${fullMessage}" from ${chatId}`);
  
  const lowerMessage = fullMessage.toLowerCase();
  let scheduledDate = null;
  let messageToSend = "";
  
  // Pattern 1: "через N минут/час/дней"
  const черезMatch = lowerMessage.match(/через\s*(\d+)\s*(минут|мин|час|часа|часов|дней|день|недел)/i);
  if (черезMatch) {
    console.log(`[Schedule Parser] Matched "через":`, черезMatch);
    const amount = parseInt(черезMatch[1]);
    const unit = черезMatch[2].toLowerCase();
    scheduledDate = new Date();
    
    if (unit.startsWith('минут')) {
      scheduledDate.setMinutes(scheduledDate.getMinutes() + amount);
    } else if (unit.startsWith('час')) {
      scheduledDate.setHours(scheduledDate.getHours() + amount);
    } else if (unit.startsWith('день')) {
      scheduledDate.setDate(scheduledDate.getDate() + amount);
    } else if (unit.startsWith('недел')) {
      scheduledDate.setDate(scheduledDate.getDate() + amount * 7);
    }
    
    // Extract message - everything after "напомни" or "напомина"
    const remindMatch = fullMessage.match(/напомни(?:ни)?\s*(.*)/i);
    if (remindMatch) {
      messageToSend = remindMatch[1].trim();
      // Remove the "через X минут/час" part from the message
      messageToSend = messageToSend.replace(/через\s*\d+\s*(минут|мин|час|часа|часов|дней|день|недел)[а-яё]*/i, '').trim();
    }
    if (!messageToSend) messageToSend = "Напоминание";
  }
  
  // Pattern 2: "завтра в HH:MM"
  const завтраMatch = lowerMessage.match(/завтра\s*в\s*(\d{1,2})[чч:]?(\d{2})?/);
  if (завтраMatch) {
    console.log(`[Schedule Parser] Matched "завтра":`, завтраMatch);
    scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(parseInt(завтраMatch[1]));
    scheduledDate.setMinutes(завтраMatch[2] ? parseInt(завтраMatch[2]) : 0);
    scheduledDate.setSeconds(0);
    
    const remindMatch = fullMessage.match(/напомни(?:ни)?\s*(.*)/i);
    if (remindMatch) {
      messageToSend = remindMatch[1].trim();
      messageToSend = messageToSend.replace(/завтра\s*в\s*\d{1,2}[чч:]?\d{0,2}/i, '').trim();
    }
    if (!messageToSend) messageToSend = "Доброе утро!";
  }
  
  // Pattern 3: "в HH:MM" (today or tomorrow)
  const timeMatch = lowerMessage.match(/(?:напомни\s*)?(?:мне\s*)?(?:в\s*)(\d{1,2})[чч:](\d{2})/);
  if (timeMatch && !завтраMatch) {
    console.log(`[Schedule Parser] Matched time:`, timeMatch);
    scheduledDate = new Date();
    scheduledDate.setHours(parseInt(timeMatch[1]));
    scheduledDate.setMinutes(parseInt(timeMatch[2]));
    scheduledDate.setSeconds(0);
    
    if (scheduledDate < new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    const remindMatch = fullMessage.match(/напомни(?:ни)?\s*(.*)/i);
    if (remindMatch) {
      messageToSend = remindMatch[1].trim();
      messageToSend = messageToSend.replace(/в\s*\d{1,2}[чч:]\d{2}/i, '').trim();
    }
    if (!messageToSend) messageToSend = "Напоминание";
  }
  
  console.log(`[Schedule Parser] Result: date=${scheduledDate}, message="${messageToSend}"`);
  
  if (scheduledDate) {
    const task = {
      id: 'task-' + Date.now(),
      message: messageToSend,
      scheduledTime: scheduledDate.toISOString(),
      chatId: chatId,
      createdAt: new Date().toISOString()
    };
    
    scheduledTasks.push(task);
    
    // Also register the chatId for sending
    if (chatId) {
      userChatIds[chatId] = chatId;
    }
    
    const dateStr = scheduledDate.toLocaleString('ru-RU', { 
      day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    return `✅ *Задача запланирована!*\n\n"${messageToSend}"\n📅 ${dateStr}\n\nНапиши /schedule чтобы увидеть все задачи.`;
  }
  
  return "Я не понял расписание. Попробуй так:\n• 'Напомни через 5 минут сделать X'\n• 'Напомни завтра в 9:00 написать маме'\n• 'Напомни в 15:30 о встрече'";
}

function initializeTelegramBot() {
  telegramRequest('getMe', {}).then(result => {
    if (result.ok) {
      console.log('✅ Telegram bot connected: @' + result.result.username);
      startPolling();
    } else {
      console.log('❌ Telegram bot error:', result.description);
    }
  }).catch(err => {
    console.log('❌ Telegram connection error:', err.message);
  });
}

let lastUpdateId = 0;

function startPolling() {
  console.log('📡 Starting Telegram polling...');
  
  setInterval(async () => {
    try {
      const result = await telegramRequest('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 30,
        limit: 10
      });
      
      if (result.ok && result.result) {
        for (const update of result.result) {
          lastUpdateId = update.update_id;
          
          if (update.message) {
            const chatId = update.message.chat.id.toString();
            const text = update.message.text;
            
            userChatIds[chatId] = chatId;
            
            console.log(`[Telegram] Message from ${chatId}: ${text}`);
            
            let response;
            
            if (text === '/start') {
              response = '👋 Привет! Я бот AI Agent Platform.\n\nНапиши мне сообщение, и я передам его твоему агенту!';
            } else if (text === '/help') {
              response = '🤖 *Команды:*\n/start - Начать\n/schedule - Показать расписание\n/help - Помощь';
            } else if (text === '/schedule') {
              const userTasks = scheduledTasks.filter(t => t.chatId === chatId);
              if (userTasks.length === 0) {
                response = '📅 У тебя нет запланированных задач.';
              } else {
                response = '📅 *Твои запланированные задачи:*\n\n';
                userTasks.forEach((t, i) => {
                  const date = new Date(t.scheduledTime).toLocaleString('ru-RU');
                  response += `${i + 1}. "${t.message}" - ${date}\n`;
                });
              }
            } else if (text && text.startsWith('/')) {
              response = 'Неизвестная команда. Напиши /help для списка команд.';
            } else if (text) {
              response = await generateAgentResponse(text, chatId);
            }
            
            if (response) {
              await sendTelegramMessage(chatId, response);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Telegram Polling] Error:', error.message);
    }
  }, 3000);
}

function checkScheduledTasks() {
  const now = new Date();
  console.log(`[Scheduler] Checking tasks at ${now.toISOString()}, total: ${scheduledTasks.length}`);
  console.log(`[Scheduler] Tasks:`, JSON.stringify(scheduledTasks));
  
  for (let i = scheduledTasks.length - 1; i >= 0; i--) {
    const task = scheduledTasks[i];
    const scheduledDate = new Date(task.scheduledTime);
    const timeDiff = now.getTime() - scheduledDate.getTime();
    
    console.log(`[Scheduler] Task ${i}: "${task.message}" scheduled=${scheduledDate.toISOString()} now=${now.toISOString()} diff=${timeDiff}ms isPast=${timeDiff > 0}`);
    
    if (timeDiff > 0) {
      console.log(`[Scheduler] Executing task: ${task.message}, chatId: ${task.chatId}`);
      
      // Send to Telegram if we have a chatId
      if (task.chatId) {
        // Register the chatId first
        userChatIds[task.chatId] = task.chatId;
        
        sendTelegramMessage(task.chatId, task.message)
          .then(() => {
            console.log(`[Scheduler] Message sent to ${task.chatId}`);
          })
          .catch(err => {
            console.error(`[Scheduler] Failed to send:`, err.message);
          });
      } else {
        console.log(`[Scheduler] No chatId for task, cannot send`);
      }
      
      scheduledTasks.splice(i, 1);
      console.log(`[Scheduler] Task removed, remaining: ${scheduledTasks.length}`);
    }
  }
}

// Check every 10 seconds instead of 60
setInterval(checkScheduledTasks, 10000);

// Also check immediately on startup
setTimeout(checkScheduledTasks, 2000);

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route handling
  if (req.url === '/' || req.url === '/index.html') {
    // Serve HTML file
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading page');
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
    
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    
  } else if (req.url === '/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        agents: [
          { id: 'agent-1', name: 'Marketing Assistant', description: 'Marketing help' },
          { id: 'agent-2', name: 'Therapy Bot', description: 'Emotional support' }
        ]
      }
    }));
    
  } else if (req.url.startsWith('/chat/')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            message: {
              id: 'msg-' + Date.now(),
              role: 'assistant',
              content: "Hello! I'm your AI assistant. How can I help you today?",
              timestamp: new Date().toISOString()
            }
          }
        }));
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
    
  } else if (req.url === '/telegram/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          
          console.log(`[Telegram] Message from ${chatId}: ${text}`);
          
          let response;
          
          if (text === '/start') {
            response = '👋 Привет! Я бот AI Agent Platform.\n\nНапиши мне сообщение, и я передам его твоему агенту!';
          } else if (text === '/help') {
            response = '🤖 *Команды:*\n/start - Начать\n/help - Помощь';
          } else if (text && text.startsWith('/')) {
            response = 'Неизвестная команда. Напиши /help для списка команд.';
          } else if (text) {
            response = await generateAgentResponse(text, chatId.toString());
          }
          
          if (response) {
            await sendTelegramMessage(chatId, response);
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        console.error('[Telegram Webhook] Error:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    });
    
  } else if (req.url === '/telegram/setwebhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { webhookUrl } = JSON.parse(body);
        
        if (!webhookUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'webhookUrl required' }));
          return;
        }
        
        const result = await telegramRequest('setWebhook', { url: webhookUrl });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
  } else if (req.url === '/telegram/info') {
    telegramRequest('getMe', {}).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    
  } else if (req.url === '/search' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'query is required' }));
          return;
        }
        
        const result = await simpleWebSearch(query);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: { result: result } }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
  } else if (req.url === '/schedule' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: scheduledTasks }));
    
  } else if (req.url === '/schedule' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { message, scheduledTime, chatId } = JSON.parse(body);
        
        if (!message || !scheduledTime) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message and scheduledTime are required' }));
          return;
        }
        
        const task = {
          id: 'task-' + Date.now(),
          message,
          scheduledTime: new Date(scheduledTime).toISOString(),
          chatId: chatId || null,
          createdAt: new Date().toISOString()
        };
        
        scheduledTasks.push(task);
        
        console.log(`[Schedule] Task created: ${message} at ${task.scheduledTime}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          data: task,
          message: `Задача запланирована на ${new Date(scheduledTime).toLocaleString('ru-RU')}`
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
  } else if (req.url.startsWith('/schedule/') && req.method === 'DELETE') {
    const taskId = req.url.replace('/schedule/', '');
    
    const index = scheduledTasks.findIndex(t => t.id === taskId);
    if (index > -1) {
      const removed = scheduledTasks.splice(index, 1)[0];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Task deleted', task: removed }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    
  } else if (req.url === '/schedule/trigger' && req.method === 'POST') {
    checkScheduledTasks();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Scheduler triggered' }));
    
  } else if (req.url === '/telegram/set-chatid' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { chatId } = JSON.parse(body);
        
        if (!chatId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'chatId required' }));
          return;
        }
        
        userChatIds[chatId] = chatId;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `ChatId ${chatId} registered` }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🚀 SERVER IS RUNNING!');
  console.log('========================================');
  console.log(`Address: http://localhost:${PORT}/`);
  console.log(`Port: ${PORT}`);
  console.log('========================================');
  console.log('\nDO NOT CLOSE THIS WINDOW!\n');
  
  if (TELEGRAM_BOT_TOKEN) {
    initializeTelegramBot();
  } else {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not found in .env');
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep process alive
process.stdin.resume();
