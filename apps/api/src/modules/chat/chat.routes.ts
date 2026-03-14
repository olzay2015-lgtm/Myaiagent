import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();
const controller = new ChatController();

// POST /api/chat/:agentId - Chat with agent using new AgentCore
router.post('/:agentId', controller.chat.bind(controller));

// POST /api/chat/:agentId/stream - Stream chat response
router.post('/:agentId/stream', controller.stream.bind(controller));

// GET /api/chat/:conversationId - Get conversation history
router.get('/conversation/:conversationId', controller.getConversation.bind(controller));

// DELETE /api/chat/:conversationId - Delete conversation
router.delete('/conversation/:conversationId', controller.deleteConversation.bind(controller));

export { router as chatRoutes };
