import { MiddlewareFunction, MiddlewareContext, MiddlewareHook } from './types';

export class MiddlewareRegistry {
  private middlewares: Map<MiddlewareHook, MiddlewareFunction[]> = new Map();

  /**
   * Register a middleware for a specific hook
   */
  use(hook: MiddlewareHook, middleware: MiddlewareFunction): void {
    if (!this.middlewares.has(hook)) {
      this.middlewares.set(hook, []);
    }
    this.middlewares.get(hook)!.push(middleware);
  }

  /**
   * Register multiple middlewares
   */
  useMany(hook: MiddlewareHook, ...middlewares: MiddlewareFunction[]): void {
    for (const middleware of middlewares) {
      this.use(hook, middleware);
    }
  }

  /**
   * Execute middlewares for a hook
   */
  async execute(hook: MiddlewareHook, context: MiddlewareContext): Promise<void> {
    const middlewares = this.middlewares.get(hook) || [];

    for (const middleware of middlewares) {
      await this.runMiddleware(middleware, context);
    }
  }

  /**
   * Run a single middleware with next() support
   */
  private async runMiddleware(
    middleware: MiddlewareFunction,
    context: MiddlewareContext
  ): Promise<void> {
    let nextCalled = false;

    const next = async () => {
      nextCalled = true;
    };

    await middleware(context, next);
  }

  /**
   * Check if middlewares exist for a hook
   */
  has(hook: MiddlewareHook): boolean {
    const middlewares = this.middlewares.get(hook);
    return !!middlewares && middlewares.length > 0;
  }

  /**
   * Clear all middlewares for a hook
   */
  clear(hook: MiddlewareHook): void {
    this.middlewares.delete(hook);
  }

  /**
   * Clear all middlewares
   */
  clearAll(): void {
    this.middlewares.clear();
  }

  /**
   * Get registered hooks
   */
  getHooks(): MiddlewareHook[] {
    return Array.from(this.middlewares.keys());
  }
}

// Singleton instance
export const middlewareRegistry = new MiddlewareRegistry();

// Export helper to create common middlewares
export function createLoggingMiddleware(logger: Console = console): MiddlewareFunction {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const startTime = Date.now();
    logger.log(`[Agent Core] Processing message for agent ${context.agentId}`);
    
    await next();
    
    const duration = Date.now() - startTime;
    logger.log(`[Agent Core] Completed in ${duration}ms`);
  };
}

export function createMetricsMiddleware(
  onMetric: (metric: { agentId: string; duration: number; tokens: number }) => void
): MiddlewareFunction {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    await next();
    
    if (context.result) {
      onMetric({
        agentId: context.agentId,
        duration: Date.now() - startTime,
        tokens: context.result.usage.totalTokens,
      });
    }
  };
}

export function createRateLimitMiddleware(
  checkLimit: (userId: string) => Promise<boolean>,
  errorMessage: string = 'Rate limit exceeded'
): MiddlewareFunction {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const allowed = await checkLimit(context.userId);
    
    if (!allowed) {
      throw new Error(errorMessage);
    }
    
    await next();
  };
}
