import { Request, Response } from 'express';
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto, ExecuteToolDto } from './tools.dto';
import { toolRegistry, toolExecutor } from '@ai-agent-platform/tools-registry';
import { prisma } from '@ai-agent-platform/database';

export class ToolsController {
  private toolsService: ToolsService;

  constructor() {
    this.toolsService = new ToolsService();
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

      const tools = await this.toolsService.list(filters);
      
      res.json({
        success: true,
        data: tools,
        meta: {
          page: filters.page,
          limit: filters.limit,
        },
      });
    } catch (error) {
      console.error('Error listing tools:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list tools',
        },
      });
    }
  }

  async listBuiltin(req: Request, res: Response) {
    try {
      const tools = await this.toolsService.list({ isBuiltin: true });
      
      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      console.error('Error listing builtin tools:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list builtin tools',
        },
      });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await this.toolsService.getCategories();
      
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
      const tool = await this.toolsService.getById(id);

      if (!tool) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found',
          },
        });
      }

      res.json({
        success: true,
        data: tool,
      });
    } catch (error) {
      console.error('Error getting tool:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get tool',
        },
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';
      const data: CreateToolDto = req.body;

      const tool = await this.toolsService.create(data, userId);

      res.status(201).json({
        success: true,
        data: tool,
      });
    } catch (error) {
      console.error('Error creating tool:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create tool',
        },
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';
      const data: UpdateToolDto = req.body;

      const tool = await this.toolsService.update(id, data, userId);

      res.json({
        success: true,
        data: tool,
      });
    } catch (error: any) {
      console.error('Error updating tool:', error);
      
      if (error.message === 'Tool not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found',
          },
        });
      }

      if (error.message === 'Cannot modify builtin tool') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot modify builtin tools',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tool',
        },
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';

      await this.toolsService.delete(id, userId);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
      console.error('Error deleting tool:', error);
      
      if (error.message === 'Tool not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found',
          },
        });
      }

      if (error.message === 'Cannot delete builtin tool') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete builtin tools',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tool',
        },
      });
    }
  }

  async clone(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';

      const tool = await this.toolsService.clone(id, userId);

      res.status(201).json({
        success: true,
        data: tool,
      });
    } catch (error: any) {
      console.error('Error cloning tool:', error);
      
      if (error.message === 'Tool not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clone tool',
        },
      });
    }
  }

  async execute(req: Request, res: Response) {
    try {
      const data: ExecuteToolDto = req.body;
      const userId = (req as any).user?.id || 'temp-user-id';

      // Find the tool
      const tool = toolRegistry.get(data.toolId) || toolRegistry.getBySlug(data.toolSlug || '');

      if (!tool) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found',
          },
        });
      }

      // Execute the tool
      const result = await toolExecutor.execute(
        tool,
        data.input,
        {
          agentId: data.agentId || 'test-agent',
          userId,
          conversationId: data.conversationId || 'test-conversation',
          toolConfig: data.config || {},
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error executing tool:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: 'Failed to execute tool',
        },
      });
    }
  }
}
