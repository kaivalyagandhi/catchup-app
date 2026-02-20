/**
 * Memory Monitor
 *
 * Tracks memory usage over time and detects potential leaks.
 * Provides operation wrapping for automatic memory tracking.
 *
 * Requirements: Memory Optimization Phase 1
 */

export interface MemoryMonitorOptions {
  sampleIntervalMs: number; // Default: 60000 (1 minute)
  maxSamples: number; // Default: 60 (1 hour of data)
  growthThreshold: number; // Default: 1.5 (50% growth)
  enableAlerts: boolean; // Default: true
}

export interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

export interface LeakDetectionResult {
  detected: boolean;
  growthPercent: number;
  firstSample: MemorySample;
  lastSample: MemorySample;
  recommendation: string;
}

export class MemoryMonitor {
  private sampleIntervalMs: number;
  private maxSamples: number;
  private growthThreshold: number;
  private enableAlerts: boolean;
  private samples: MemorySample[] = [];
  private intervalId?: NodeJS.Timeout;

  constructor(options?: Partial<MemoryMonitorOptions>) {
    this.sampleIntervalMs = options?.sampleIntervalMs ?? 60000;
    this.maxSamples = options?.maxSamples ?? 60;
    this.growthThreshold = options?.growthThreshold ?? 1.5;
    this.enableAlerts = options?.enableAlerts ?? true;
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.intervalId) {
      console.warn('[Memory Monitor] Already started');
      return;
    }

    console.log('[Memory Monitor] Starting memory monitoring');

    // Take initial sample
    this.takeSample();

    // Schedule periodic sampling
    this.intervalId = setInterval(() => {
      this.takeSample();
      this.detectLeak();
    }, this.sampleIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('[Memory Monitor] Stopped memory monitoring');
    }
  }

  /**
   * Take a memory sample
   */
  private takeSample(): void {
    const usage = process.memoryUsage();

    const sample: MemorySample = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
    };

    this.samples.push(sample);

    // Keep only maxSamples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Log memory usage for an operation
   */
  logMemoryUsage(operation: string, before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): void {
    const heapDiff = after.heapUsed - before.heapUsed;
    const heapPercent = (after.heapUsed / after.heapTotal) * 100;

    console.log(`[Memory] ${operation}:`, {
      heapUsed: `${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(after.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapPercent: `${heapPercent.toFixed(1)}%`,
      heapDiff: `${heapDiff >= 0 ? '+' : ''}${(heapDiff / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(after.rss / 1024 / 1024).toFixed(2)} MB`,
    });

    // Alert if heap usage > 70%
    if (this.enableAlerts && heapPercent > 70) {
      console.warn(`[Memory] WARNING: High heap usage (${heapPercent.toFixed(1)}%)`);
    }
  }

  /**
   * Wrap operation with memory tracking
   */
  async wrapOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const before = process.memoryUsage();
    const result = await fn();
    const after = process.memoryUsage();
    this.logMemoryUsage(operation, before, after);
    return result;
  }

  /**
   * Get memory samples
   */
  getSamples(): MemorySample[] {
    return [...this.samples];
  }

  /**
   * Detect memory leaks
   */
  detectLeak(): LeakDetectionResult | null {
    if (this.samples.length < 2) {
      return null;
    }

    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];

    const growthPercent = ((lastSample.heapUsed - firstSample.heapUsed) / firstSample.heapUsed) * 100;

    const detected = growthPercent > (this.growthThreshold - 1) * 100;

    const result: LeakDetectionResult = {
      detected,
      growthPercent,
      firstSample,
      lastSample,
      recommendation: detected
        ? 'Potential memory leak detected. Take heap snapshot for investigation.'
        : 'No memory leak detected.',
    };

    if (detected && this.enableAlerts) {
      console.warn('[Memory] Potential leak detected:', {
        growthPercent: `${growthPercent.toFixed(1)}%`,
        firstSample: {
          heapUsed: `${(firstSample.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          timestamp: new Date(firstSample.timestamp).toISOString(),
        },
        lastSample: {
          heapUsed: `${(lastSample.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          timestamp: new Date(lastSample.timestamp).toISOString(),
        },
        recommendation: result.recommendation,
      });
    }

    return result;
  }
}
