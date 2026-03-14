import { Request, Response } from 'express';
import { SkillsService } from './skills.service';
import { CreateSkillDto, UpdateSkillDto } from './skills.dto';

export class SkillsController {
  private skillsService: SkillsService;

  constructor() {
    this.skillsService = new SkillsService();
  }

  async list(req: Request, res: Response) {
    try {
      const { category, search, isBuiltin, page = '1', limit = '20' } = req.query;
      
      const filters = {
        category: category as string | undefined,
        search: search as string | undefined,
        isBuiltin: isBuiltin !== undefined ? isBuiltin === 'true' : undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const skills = await this.skillsService.list(filters);
      
      res.json({
        success: true,
        data: skills,
        meta: {
          page: filters.page,
          limit: filters.limit,
        },
      });
    } catch (error) {
      console.error('Error listing skills:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list skills',
        },
      });
    }
  }

  async listBuiltin(req: Request, res: Response) {
    try {
      const skills = await this.skillsService.list({ isBuiltin: true });
      
      res.json({
        success: true,
        data: skills,
      });
    } catch (error) {
      console.error('Error listing builtin skills:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list builtin skills',
        },
      });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await this.skillsService.getCategories();
      
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get categories',
        },
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skill = await this.skillsService.getById(id);

      if (!skill) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        });
      }

      res.json({
        success: true,
        data: skill,
      });
    } catch (error) {
      console.error('Error getting skill:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get skill',
        },
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id'; // TODO: Get from auth middleware
      const data: CreateSkillDto = req.body;

      const skill = await this.skillsService.create(data, userId);

      res.status(201).json({
        success: true,
        data: skill,
      });
    } catch (error) {
      console.error('Error creating skill:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create skill',
        },
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id'; // TODO: Get from auth middleware
      const data: UpdateSkillDto = req.body;

      const skill = await this.skillsService.update(id, data, userId);

      res.json({
        success: true,
        data: skill,
      });
    } catch (error: any) {
      console.error('Error updating skill:', error);
      
      if (error.message === 'Skill not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        });
      }

      if (error.message === 'Cannot modify builtin skill') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot modify builtin skills',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update skill',
        },
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id'; // TODO: Get from auth middleware

      await this.skillsService.delete(id, userId);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
      console.error('Error deleting skill:', error);
      
      if (error.message === 'Skill not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        });
      }

      if (error.message === 'Cannot delete builtin skill') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete builtin skills',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete skill',
        },
      });
    }
  }

  async clone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id'; // TODO: Get from auth middleware

      const skill = await this.skillsService.clone(id, userId);

      res.status(201).json({
        success: true,
        data: skill,
      });
    } catch (error: any) {
      console.error('Error cloning skill:', error);
      
      if (error.message === 'Skill not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SKILL_NOT_FOUND',
            message: 'Skill not found',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clone skill',
        },
      });
    }
  }
}
