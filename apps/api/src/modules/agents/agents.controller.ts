import { Request, Response } from 'express';
import { AgentsService } from './agents.service';
import { agentEngine } from '../../services';
import { CreateAgentDto, UpdateAgentDto } from './agents.dto';

export class AgentsController {
  private agentsService: AgentsService;

  constructor() {
    this.agentsService = new AgentsService();
  }

  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';
      const { page = '1', limit = '20' } = req.query;

      const agents = await this.agentsService.list(userId, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error listing agents:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list agents' },
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';
      const data: CreateAgentDto = req.body;

      const agent = await this.agentsService.create(data, userId);

      res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create agent' },
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = await this.agentsService.getById(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error getting agent:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent' },
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';
      const data: UpdateAgentDto = req.body;

      const agent = await this.agentsService.update(id, data, userId);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error: any) {
      console.error('Error updating agent:', error);
      if (error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update agent' },
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';

      await this.agentsService.delete(id, userId);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      if (error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete agent' },
      });
    }
  }

  async previewPrompt(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const preview = await agentEngine.previewPrompt(id);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error: any) {
      console.error('Error previewing prompt:', error);
      if (error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to preview prompt' },
      });
    }
  }

  async getSkills(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const skills = await agentEngine.getAgentSkills(id);

      res.json({
        success: true,
        data: skills,
      });
    } catch (error) {
      console.error('Error getting agent skills:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent skills' },
      });
    }
  }

  async attachSkill(req: Request, res: Response) {
    try {
      const { id: agentId } = req.params;
      const { skillId, isEnabled, customPrompt, priority, variables } = req.body;

      const agentSkill = await agentEngine.attachSkill(agentId, skillId, {
        isEnabled,
        customPrompt,
        priority,
        variables,
      });

      res.status(201).json({
        success: true,
        data: agentSkill,
      });
    } catch (error) {
      console.error('Error attaching skill:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to attach skill' },
      });
    }
  }

  async updateSkill(req: Request, res: Response) {
    try {
      const { id: agentId, skillId } = req.params;
      const { isEnabled, customPrompt, priority, variables } = req.body;

      const agentSkill = await agentEngine.attachSkill(agentId, skillId, {
        isEnabled,
        customPrompt,
        priority,
        variables,
      });

      res.json({
        success: true,
        data: agentSkill,
      });
    } catch (error) {
      console.error('Error updating skill:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update skill' },
      });
    }
  }

  async detachSkill(req: Request, res: Response) {
    try {
      const { id: agentId, skillId } = req.params;

      await agentEngine.detachSkill(agentId, skillId);

      res.json({
        success: true,
        data: { detached: true },
      });
    } catch (error) {
      console.error('Error detaching skill:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to detach skill' },
      });
    }
  }

  async toggleSkill(req: Request, res: Response) {
    try {
      const { id: agentId, skillId } = req.params;
      const { isEnabled } = req.body;

      const agentSkill = await agentEngine.toggleSkill(agentId, skillId, isEnabled);

      res.json({
        success: true,
        data: agentSkill,
      });
    } catch (error) {
      console.error('Error toggling skill:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle skill' },
      });
    }
  }

  // ==================== TOOL MANAGEMENT ====================

  async getTools(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tools = await agentEngine.getAgentTools(id);

      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      console.error('Error getting agent tools:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent tools' },
      });
    }
  }

  async attachTool(req: Request, res: Response) {
    try {
      const { id: agentId } = req.params;
      const { toolId, isEnabled, config, allowedOperations } = req.body;

      const agentTool = await agentEngine.attachTool(agentId, toolId, {
        isEnabled,
        config,
        allowedOperations,
      });

      res.status(201).json({
        success: true,
        data: agentTool,
      });
    } catch (error) {
      console.error('Error attaching tool:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to attach tool' },
      });
    }
  }

  async updateTool(req: Request, res: Response) {
    try {
      const { id: agentId, toolId } = req.params;
      const { isEnabled, config, allowedOperations } = req.body;

      const agentTool = await agentEngine.attachTool(agentId, toolId, {
        isEnabled,
        config,
        allowedOperations,
      });

      res.json({
        success: true,
        data: agentTool,
      });
    } catch (error) {
      console.error('Error updating tool:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update tool' },
      });
    }
  }

  async detachTool(req: Request, res: Response) {
    try {
      const { id: agentId, toolId } = req.params;

      await agentEngine.detachTool(agentId, toolId);

      res.json({
        success: true,
        data: { detached: true },
      });
    } catch (error) {
      console.error('Error detaching tool:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to detach tool' },
      });
    }
  }

  async toggleTool(req: Request, res: Response) {
    try {
      const { id: agentId, toolId } = req.params;
      const { isEnabled } = req.body;

      const agentTool = await agentEngine.toggleTool(agentId, toolId, isEnabled);

      res.json({
        success: true,
        data: agentTool,
      });
    } catch (error) {
      console.error('Error toggling tool:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle tool' },
      });
    }
  }

  async updateToolConfig(req: Request, res: Response) {
    try {
      const { id: agentId, toolId } = req.params;
      const { config } = req.body;

      const agentTool = await agentEngine.updateToolConfig(agentId, toolId, config);

      res.json({
        success: true,
        data: agentTool,
      });
    } catch (error) {
      console.error('Error updating tool config:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update tool config' },
      });
    }
  }

  async chat(req: Request, res: Response) {
    try {
      const { id: agentId } = req.params;
      const { message, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Message is required' },
        });
      }

      const response = await agentEngine.chat(agentId, message, history);

      res.json({
        success: true,
        data: {
          message: response.message,
          usage: response.usage,
          latencyMs: response.latencyMs,
          model: response.model,
        },
      });
    } catch (error: any) {
      console.error('Error chatting with agent:', error);
      if (error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }
      res.status(500).json({
        success: false,
        error: { code: 'LLM_ERROR', message: error.message || 'Failed to generate response' },
      });
    }
  }
}
