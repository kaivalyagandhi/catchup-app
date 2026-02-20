/**
 * Memory Circuit Breaker
 *
 * Prevents operations when memory usage exceeds safe thresholds.
 * Monitors heap usage and throws errors when limits are reached.
 *
 * Requirements: Memory Optimization Phase 1
 */

export interface MemoryCircuitBreakerOptions {
  maxHeapPercent: number; // Default: 80
  checkIntervalMs: number; // Default: 1000
  enableLogging: boolean; // Default: true
}

export interface MemoryUsage {
  heapUsed: number; // Bytes
  heapTotal: number; // Bytes
  heapPercent: number; // Percentage
  rss: number; // Bytes
  external: number; // Bytes
}

export class MemoryCircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly memoryUsage: MemoryUsage
  ) {
    super(message);
    this.name = 'MemoryCircuitBreakerError';
  }
}

export class MemoryCircuitBreaker {
  private maxHeapPercent: number;
  private checkIntervalMs: number;
  private enableLogging: boolean;

  constructor(options?: Partial<MemoryCircuitBreakerOptions>) {
    this.maxHeapPercent = options?.maxHeapPercent ?? 80;
    this.checkIntervalMs = options?.checkIntervalMs ?? 1000;
    this.enableLogging = options?.enableLogging ?? true;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    const heapPercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      heapPercent,
      rss: usage.rss,
      external: usage.external,
    };
  }

  /**
   * Check memory and throw if threshold exceeded
   */
  async checkMemory(): Promise<void> {
    const usage = this.getMemoryUsage();

    if (usage.heapPercent > this.maxHeapPercent) {
      const error = new MemoryCircuitBreakerError(
        `Memory circuit breaker triggered: ${usage.heapPercent.toFixed(1)}% heap used (threshold: ${this.maxHeapPercent}%)`,
        usage
      );

      if (this.enableLogging) {
        console.error('[Memory Circuit Breaker] Threshold exceeded:', {
          heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapPercent: `${usage.heapPercent.toFixed(1)}%`,
          rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
          threshold: `${this.maxHeapPercent}%`,
        });
      }

      throw error;
    }
  }

  /**
   * Execute operation with memory checks before and after
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check memory before operation
    await this.checkMemory();

    // Execute operation
    const result = await operation();

    // Check memory after operation
    await this.checkMemory();

    return result;
  }

  /**
   * Format memory usage for logging
   */
  formatMemoryUsage(usage: MemoryUsage): string {
    return JSON.stringify({
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapPercent: `${usage.heapPercent.toFixed(1)}%`,
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    });
  }
}
