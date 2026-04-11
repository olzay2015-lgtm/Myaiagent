import { Router } from 'express';

/**
 * Platform Module Interface
 * Each feature module must implement this interface
 */
export interface PlatformModule {
  /** Unique module identifier */
  id: string;

  /** Human-readable module name */
  name: string;

  /** Module description */
  description: string;

  /** Module version */
  version: string;

  /**
   * Initialize the module (register tools, set up connections, etc.)
   * Called once during application startup
   */
  initialize(): Promise<void>;

  /**
   * Get Express router with module-specific routes (optional)
   * Will be mounted at /modules/{module.id}/
   */
  getRouter?(): Router;

  /**
   * Graceful shutdown hook
   */
  shutdown?(): Promise<void>;

  /**
   * Health check for the module
   */
  healthCheck?(): Promise<ModuleHealth>;
}

export interface ModuleHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
}

export interface ModuleRegistryOptions {
  /** Base path for module routes (default: '/modules') */
  basePath?: string;
  /** Whether to continue loading if a module fails (default: true) */
  continueOnError?: boolean;
}
