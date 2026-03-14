# Skills Registry

Skill definitions and registry for the AI Agent Platform.

## Structure

- `interfaces/` - Skill interface contracts
- `builtin/` - Built-in skill implementations
- `registry/` - Skill registry implementation

## Usage

```typescript
import { skillRegistry, SkillDefinition } from '@ai-agent-platform/skills-registry';

// Register a skill
skillRegistry.register(skillDefinition);

// Get all skills
const allSkills = skillRegistry.getAll();

// Get by category
const domainSkills = skillRegistry.getByCategory('DOMAIN_EXPERTISE');
```
