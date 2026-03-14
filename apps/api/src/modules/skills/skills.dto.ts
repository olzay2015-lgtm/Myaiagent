import { SkillCategory } from '@prisma/client';

export interface CreateSkillDto {
  name: string;
  description?: string;
  category: SkillCategory;
  prompt: string;
  icon?: string;
  color?: string;
  variables?: Record<string, unknown>;
  priority?: number;
}

export interface UpdateSkillDto {
  name?: string;
  description?: string;
  category?: SkillCategory;
  prompt?: string;
  icon?: string;
  color?: string;
  variables?: Record<string, unknown>;
  priority?: number;
}

export interface SkillFilters {
  category?: string;
  search?: string;
  isBuiltin?: boolean;
  page: number;
  limit: number;
}
