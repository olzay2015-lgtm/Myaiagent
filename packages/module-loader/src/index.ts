import { Express, Router } from 'express';
import { PlatformModule, ModuleHealth, ModuleRegistryOptions } from './interfaces';

export { PlatformModule, ModuleHealth, ModuleRegistryOptions } from './interfaces';

/**
 * ModuleRegistry — центральный реестр модулей платформы.
 * Позволяет регистрировать, инициализировать и монтировать модули.
 * Принцип: «Добавляй — не меняй».
 */
export class ModuleRegistry {
  private modules: Map<string, PlatformModule> = new Map();
  private initialized: Set<string> = new Set();
  private options: Required<ModuleRegistryOptions>;

  constructor(options: ModuleRegistryOptions = {}) {
    this.options = {
      basePath: options.basePath ?? '/modules',
      continueOnError: options.continueOnError ?? true,
    };
  }

  /**
   * Register a module (does NOT initialize it yet)
   */
  register(module: PlatformModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`⚠️  Module "${module.id}" is already registered, skipping.`);
      return;
    }
    this.modules.set(module.id, module);
    console.log(`📦 Module registered: ${module.name} v${module.version}`);
  }

  /**
   * Initialize all registered modules and mount their routes
   */
  async initializeAll(app: Express): Promise<void> {
    console.log(`\n🚀 Initializing ${this.modules.size} module(s)...\n`);

    for (const [id, module] of this.modules) {
      try {
        // Initialize module
        await module.initialize();
        this.initialized.add(id);
        console.log(`  ✅ ${module.name} initialized`);

        // Mount routes if available
        if (module.getRouter) {
          const router = module.getRouter();
          const mountPath = `${this.options.basePath}/${id}`;
          app.use(mountPath, router);
          console.log(`  🔌 Routes mounted at ${mountPath}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to initialize module "${id}":`, error);
        if (!this.options.continueOnError) {
          throw error;
        }
      }
    }

    console.log(`\n✅ Module initialization complete (${this.initialized.size}/${this.modules.size} loaded)\n`);
  }

  /**
   * Graceful shutdown of all modules
   */
  async shutdownAll(): Promise<void> {
    for (const [id, module] of this.modules) {
      if (module.shutdown && this.initialized.has(id)) {
        try {
          await module.shutdown();
          console.log(`🛑 Module "${id}" shut down`);
        } catch (error) {
          console.error(`❌ Error shutting down module "${id}":`, error);
        }
      }
    }
  }

  /**
   * Health check for all modules
   */
  async healthCheckAll(): Promise<Record<string, ModuleHealth>> {
    const results: Record<string, ModuleHealth> = {};

    for (const [id, module] of this.modules) {
      if (module.healthCheck && this.initialized.has(id)) {
        try {
          results[id] = await module.healthCheck();
        } catch (error) {
          results[id] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Health check failed',
          };
        }
      } else {
        results[id] = {
          status: this.initialized.has(id) ? 'healthy' : 'unhealthy',
          message: this.initialized.has(id) ? 'No health check defined' : 'Not initialized',
        };
      }
    }

    return results;
  }

  /**
   * Get a module by ID
   */
  get(id: string): PlatformModule | undefined {
    return this.modules.get(id);
  }

  /**
   * List all registered modules
   */
  list(): Array<{ id: string; name: string; version: string; initialized: boolean }> {
    return Array.from(this.modules.values()).map(m => ({
      id: m.id,
      name: m.name,
      version: m.version,
      initialized: this.initialized.has(m.id),
    }));
  }
}

// Singleton
export const moduleRegistry = new ModuleRegistry();
