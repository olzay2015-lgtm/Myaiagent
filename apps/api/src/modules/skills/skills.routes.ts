import { Router } from 'express';
import { SkillsController } from './skills.controller';

const router = Router();
const controller = new SkillsController();

// GET /api/skills - List all skills (with filters)
router.get('/', controller.list.bind(controller));

// GET /api/skills/builtin - List built-in skills
router.get('/builtin', controller.listBuiltin.bind(controller));

// GET /api/skills/categories - Get skill categories
router.get('/categories', controller.getCategories.bind(controller));

// GET /api/skills/:id - Get single skill
router.get('/:id', controller.getById.bind(controller));

// POST /api/skills - Create skill
router.post('/', controller.create.bind(controller));

// PUT /api/skills/:id - Update skill
router.put('/:id', controller.update.bind(controller));

// DELETE /api/skills/:id - Delete skill
router.delete('/:id', controller.delete.bind(controller));

// POST /api/skills/:id/clone - Clone a skill
router.post('/:id/clone', controller.clone.bind(controller));

export { router as skillsRoutes };
