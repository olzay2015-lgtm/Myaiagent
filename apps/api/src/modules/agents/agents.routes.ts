import { Router } from 'express';
import { AgentsController } from './agents.controller';

const router = Router();
const controller = new AgentsController();

// GET /api/agents - List all agents
router.get('/', controller.list.bind(controller));

// POST /api/agents - Create agent
router.post('/', controller.create.bind(controller));

// GET /api/agents/:id - Get agent
router.get('/:id', controller.getById.bind(controller));

// PUT /api/agents/:id - Update agent
router.put('/:id', controller.update.bind(controller));

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', controller.delete.bind(controller));

// GET /api/agents/:id/prompt-preview - Preview assembled prompt
router.get('/:id/prompt-preview', controller.previewPrompt.bind(controller));

// GET /api/agents/:id/skills - Get agent skills
router.get('/:id/skills', controller.getSkills.bind(controller));

// POST /api/agents/:id/skills - Attach skill to agent
router.post('/:id/skills', controller.attachSkill.bind(controller));

// PUT /api/agents/:id/skills/:skillId - Update agent skill
router.put('/:id/skills/:skillId', controller.updateSkill.bind(controller));

// DELETE /api/agents/:id/skills/:skillId - Detach skill from agent
router.delete('/:id/skills/:skillId', controller.detachSkill.bind(controller));

// POST /api/agents/:id/skills/:skillId/toggle - Toggle skill enabled state
router.post('/:id/skills/:skillId/toggle', controller.toggleSkill.bind(controller));

// GET /api/agents/:id/tools - Get agent tools
router.get('/:id/tools', controller.getTools.bind(controller));

// POST /api/agents/:id/tools - Attach tool to agent
router.post('/:id/tools', controller.attachTool.bind(controller));

// PUT /api/agents/:id/tools/:toolId - Update agent tool
router.put('/:id/tools/:toolId', controller.updateTool.bind(controller));

// DELETE /api/agents/:id/tools/:toolId - Detach tool from agent
router.delete('/:id/tools/:toolId', controller.detachTool.bind(controller));

// POST /api/agents/:id/tools/:toolId/toggle - Toggle tool enabled state
router.post('/:id/tools/:toolId/toggle', controller.toggleTool.bind(controller));

// POST /api/agents/:id/tools/:toolId/config - Update tool configuration
router.post('/:id/tools/:toolId/config', controller.updateToolConfig.bind(controller));

// POST /api/agents/:id/chat - Chat with agent
router.post('/:id/chat', controller.chat.bind(controller));

export { router as agentsRoutes };
