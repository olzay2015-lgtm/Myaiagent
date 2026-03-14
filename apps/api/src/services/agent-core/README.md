# Agent Core

A modular, extensible core for AI agent processing with support for skills, tools, and conversation management.

## Architecture

The Agent Core follows a modular pipeline architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Agent Core                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Context Builder                                             │
│     ├─ Load agent configuration                                 │
│     ├─ Load active skills → build system prompt                 │
│     ├─ Load active tools → prepare function schemas             │
│     └─ Build complete agent context                             │
│                                                                 │
│  2. Conversation Manager                                        │
│     ├─ Get/create conversation                                  │
│     ├─ Build message history                                    │
│     ├─ Format for LLM                                           │
│     └─ Persist messages                                         │
│                                                                 │
│  3. Tool Orchestrator                                           │
│     ├─ Send request to LLM with function calling                │
│     ├─ Check for tool calls                                     │
│     ├─ Execute tools                                            │
│     ├─ Send results back to LLM                                 │
│     └─ Repeat until final response                              │
│                                                                 │
│  4. Response Processor                                          │
│     ├─ Process final LLM response                               │
│     ├─ Format for API output                                    │
│     └─ Build result object                                      │
│                                                                 │
│  [Middleware Hooks]                                             │
│     ├─ beforeLoadContext                                        │
│     ├─ afterLoadContext                                         │
│     ├─ beforeSendToLLM                                          │
│     ├─ afterLLMResponse                                         │
│     ├─ beforeToolExecution                                      │
│     ├─ afterToolExecution                                       │
│     ├─ beforeSaveMessage                                        │
│     ├─ afterProcess                                             │
│     └─ onError                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. ContextBuilder

Loads and prepares the agent context:

```typescript
const context = await contextBuilder.build(agentId, userId);

// Returns:
{
  agent: AgentConfig,
  systemPrompt: string,      // Combined skills into system prompt
  skills: SkillContext[],    // Active skills
  tools: ToolContext[],      // Active tools
  metadata: {...}
}
```

### 2. ConversationManager

Manages conversation state and history:

```typescript
// Get or create conversation
const conversation = await conversationManager.getOrCreate(
  conversationId,
  agentId,
  userId
);

// Add message
await conversationManager.addMessage(conversationId, {
  role: 'user',
  content: 'Hello!',
});

// Build LLM messages
const messages = await conversationManager.buildLLMMessages(
  conversationId,
  systemPrompt,
  userMessage
);
```

### 3. ToolOrchestrator

Handles the tool calling loop:

```typescript
// Check if LLM response has tool calls
if (toolOrchestrator.hasToolCalls(response)) {
  const toolCalls = toolOrchestrator.extractToolCalls(response);
  
  // Execute tools
  const results = await toolOrchestrator.executeToolCalls(
    toolCalls,
    tools,
    executionContext
  );
  
  // Continue loop for LLM to process results
}
```

### 4. ResponseProcessor

Processes and formats the final response:

```typescript
const processed = responseProcessor.process(
  llmResponse,
  toolCalls,
  toolResults,
  iterations
);

// Returns formatted response with metadata
```

### 5. Middleware System

Extensible hooks for custom logic:

```typescript
import { agentCore, MiddlewareHook, createLoggingMiddleware } from './agent-core';

// Register logging middleware
agentCore.use(MiddlewareHook.BEFORE_LOAD_CONTEXT, createLoggingMiddleware());

// Custom middleware
agentCore.use(MiddlewareHook.AFTER_PROCESS, async (context, next) => {
  console.log(`Processed in ${context.result?.latencyMs}ms`);
  await next();
});
```

**Available Hooks:**

- `BEFORE_LOAD_CONTEXT` - Before loading agent context
- `AFTER_LOAD_CONTEXT` - After context is loaded
- `BEFORE_SEND_TO_LLM` - Before sending to LLM
- `AFTER_LLM_RESPONSE` - After receiving LLM response
- `BEFORE_TOOL_EXECUTION` - Before executing tools
- `AFTER_TOOL_EXECUTION` - After tool execution
- `BEFORE_SAVE_MESSAGE` - Before saving to database
- `AFTER_PROCESS` - After complete processing
- `ON_ERROR` - On any error

## Usage

### Basic Usage

```typescript
import { agentCore } from './services/agent-core';

// Process a message
const result = await agentCore.process(agentId, userId, message, {
  metadata: { source: 'web' },
});

console.log(result.message.content);
console.log(result.usage.totalTokens);
console.log(result.toolCalls); // If tools were used
```

### Streaming

```typescript
const stream = agentCore.stream(agentId, userId, message);

for await (const chunk of stream) {
  console.log(chunk.content);
  if (chunk.isComplete) {
    console.log('Done!');
  }
}
```

### With Middleware

```typescript
// Rate limiting
agentCore.use(
  MiddlewareHook.BEFORE_LOAD_CONTEXT,
  createRateLimitMiddleware(
    async (userId) => checkRateLimit(userId),
    'Rate limit exceeded'
  )
);

// Metrics
agentCore.use(
  MiddlewareHook.AFTER_PROCESS,
  createMetricsMiddleware((metric) => {
    metrics.record(metric);
  })
);
```

### Custom Instance

```typescript
import { AgentCore } from './services/agent-core';

const customAgentCore = new AgentCore({
  contextBuilder: new ContextBuilder(),
  conversationManager: new ConversationManager(),
  toolOrchestrator: new ToolOrchestrator(10), // Max 10 iterations
  responseProcessor: new ResponseProcessor(),
  llmProvider: customLLMProvider,
});
```

## Processing Flow

```
1. User Message
   ↓
2. Load Context
   ├─ Load agent config
   ├─ Load skills → build prompt
   └─ Load tools → prepare schemas
   ↓
3. Get Conversation
   ├─ Get existing or create new
   └─ Load message history
   ↓
4. Build LLM Messages
   ├─ System prompt
   ├─ Conversation history
   └─ Current user message
   ↓
5. Send to LLM
   ├─ With function calling enabled
   └─ With active tool schemas
   ↓
6. Check for Tool Calls?
   ├─ YES → Execute tools
   │        ↓
   │        Add tool results to messages
   │        ↓
   │        Go back to step 5
   │
   └─ NO → Final response
   ↓
7. Process Response
   ├─ Format content
   ├─ Calculate metadata
   └─ Build result
   ↓
8. Save to Database
   ├─ Save assistant message
   └─ Save tool results
   ↓
9. Return Result
```

## API Endpoints

### Chat

```
POST /chat/:agentId
{
  "message": "Hello!",
  "conversationId": "optional-existing-id",
  "metadata": {}
}

Response:
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-123",
      "role": "assistant",
      "content": "Hello! How can I help?",
      "timestamp": "..."
    },
    "conversationId": "conv-456",
    "toolCalls": [...],       // If tools were used
    "toolResults": [...],
    "usage": {
      "promptTokens": 100,
      "completionTokens": 50,
      "totalTokens": 150
    },
    "latencyMs": 2500,
    "iterations": 1
  }
}
```

### Stream

```
POST /chat/:agentId/stream
{
  "message": "Hello!"
}

Response: SSE stream
data: {"content": "Hello", "isComplete": false}
data: {"content": "!", "isComplete": false}
data: {"content": "", "isComplete": true}
```

## Tool Calling Example

```typescript
// User: "Search for latest AI news"

// 1. LLM receives message with web_search tool available
// 2. LLM calls: web_search({ query: "latest AI news" })
// 3. Tool executes and returns results
// 4. Results sent back to LLM
// 5. LLM generates final response with search results

const result = await agentCore.process(agentId, userId, 
  "Search for latest AI news"
);

result.toolCalls = [
  {
    id: "call-123",
    toolSlug: "web_search",
    arguments: { query: "latest AI news" }
  }
];

result.toolResults = [
  {
    toolCallId: "call-123",
    toolSlug: "web_search",
    success: true,
    data: { results: [...] },
    executionTimeMs: 1200
  }
];

result.message.content = "Here are the latest AI news: ...";
```

## Error Handling

```typescript
try {
  const result = await agentCore.process(agentId, userId, message);
} catch (error) {
  if (error.message.includes('Agent not found')) {
    // Handle missing agent
  }
  if (error.message.includes('Max iterations')) {
    // Handle too many tool calls
  }
}
```

## Configuration

Agent behavior can be configured per agent:

```typescript
{
  model: "openai/gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 4096,
  maxToolIterations: 5,  // Max tool calling loops
  // ... other settings
}
```

## Extending

### Custom Middleware

```typescript
agentCore.use(MiddlewareHook.BEFORE_TOOL_EXECUTION, async (context, next) => {
  // Log tool execution
  console.log(`Executing ${context.metadata.toolCount} tools`);
  
  // Add custom metadata
  context.metadata.executionStart = Date.now();
  
  await next();
  
  // Post-execution logic
  const duration = Date.now() - (context.metadata.executionStart as number);
  console.log(`Tools executed in ${duration}ms`);
});
```

### Custom Tool

```typescript
import { createTool } from '@ai-agent-platform/tools-registry';

const myTool = createTool({
  id: 'custom-tool',
  name: 'My Custom Tool',
  slug: 'my_tool',
  category: 'CUSTOM',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter' }
    },
    required: ['param']
  },
  handler: async (input, context) => {
    return {
      success: true,
      data: { result: 'Done!' }
    };
  }
});

toolRegistry.register(myTool);
```

## License

MIT
