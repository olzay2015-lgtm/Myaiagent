import { Router } from 'express';
import { ToolsController } from './tools.controller';

const router = Router();
const controller = new ToolsController();

// GET /api/tools - List all tools
router.get('/', controller.list.bind(controller));

// GET /api/tools/builtin - List builtin tools
router.get('/builtin', controller.listBuiltin.bind(controller));

// GET /api/tools/categories - Get tool categories
router.get('/categories', controller.getCategories.bind(controller));

// GET /api/tools/execute - Execute a tool directly (for testing)
router.post('/execute', controller.execute.bind(controller));

// GET /api/tools/:id - Get single tool
router.get('/:id', controller.getById.bind(controller));

// POST /api/tools - Create custom tool
router.post('/', controller.create.bind(controller));

// PUT /api/tools/:id - Update tool
router.put('/:id', controller.update.bind(controller));

// DELETE /api/tools/:id - Delete tool
router.delete('/:id', controller.delete.bind(controller));

// POST /api/tools/:id/clone - Clone a tool
router.post('/:id/clone', controller.clone.bind(controller));

export { router as toolsRoutes };
