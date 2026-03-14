# Tools Registry

Tool definitions, registry, and execution sandbox for the AI Agent Platform.

## Structure

- `interfaces/` - Tool interface contracts
- `builtin/` - Built-in tool implementations
- `registry/` - Tool registry implementation
- `sandbox/` - Secure execution environment

## Usage

```typescript
import { toolRegistry, ToolDefinition } from '@ai-agent-platform/tools-registry';

// Register a tool
toolRegistry.register(toolDefinition);

// Get all tools
const allTools = toolRegistry.getAll();

// Get by category
const commTools = toolRegistry.getByCategory('COMMUNICATION');
```
