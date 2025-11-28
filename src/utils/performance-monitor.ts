/**
 * Performance Monitor Utility
 * 
 * Provides utilities for monitoring and logging performance metrics.
 * Tracks sync duration, API request counts, and performance warnings.
 * 
 * Requirements: 12.4
 */

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  itemsProcessed?: number;
  apiRequestCount?: number;
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * Performance Monitor
 * 
 * Tracks performance metrics for operations and logs warnings for slow operations.
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics>;
  private apiRequestCounts: Map<string, number>;

  constructor() {
    this.metrics = new Map();
    this.apiRequestCounts = new Map();
  }

  /**
   * Start tracking an operation
   * 
   * @param operationId - Unique identifier for the operation
   * @param operationName - Human-readable name for the operation
   * @param metadata - Additional metadata to track
   */
  startOperation(
    operationId: string,
    operationName: string,
    metadata?: Record<string, any>
  ): void {
    this.metrics.set(operationId, {
      operationName,
      startTime: Date.now(),
      warnings: [],
      metadata,
    });
    
    // Reset API request count for this operation
    this.apiRequestCounts.set(operationId, 0);
  }

  /**
   * Increment API request count for an operation
   * 
   * @param operationId - Unique identifier for the operation
   */
  incrementApiRequestCount(operationId: string): void {
    const currentCount = this.apiRequestCounts.get(operationId) || 0;
    this.apiRequestCounts.set(operationId, currentCount + 1);
  }

  /**
   * Get current API request count for an operation
   * 
   * @param operationId - Unique identifier for the operation
   */
  getApiRequestCount(operationId: string): number {
    return this.apiRequestCounts.get(operationId) || 0;
  }

  /**
   * End tracking an operation and calculate metrics
   * 
   * @param operationId - Unique identifier for the operation
   * @param itemsProcessed - Number of items processed during the operation
   * @returns Performance metrics for the operation
   */
  endOperation(operationId: string, itemsProcessed?: number): PerformanceMetrics | null {
    const metrics = this.metrics.get(operationId);
    
    if (!metrics) {
      console.warn(`No metrics found for operation: ${operationId}`);
      return null;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.itemsProcessed = itemsProcessed;
    metrics.apiRequestCount = this.apiRequestCounts.get(operationId) || 0;

    // Check for performance warnings
    this.checkPerformanceWarnings(metrics);

    // Log metrics
    this.logMetrics(metrics);

    // Clean up
    this.metrics.delete(operationId);
    this.apiRequestCounts.delete(operationId);

    return metrics;
  }

  /**
   * Check for performance warnings based on metrics
   * 
   * Requirements: 12.4 - Log performance warnings for slow syncs (>2 min for 500 contacts)
   */
  private checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    // Check duration-based warnings only if duration and itemsProcessed are present
    if (metrics.duration && metrics.itemsProcessed) {
      const durationMinutes = metrics.duration / 1000 / 60;
      const itemsProcessed = metrics.itemsProcessed;

      // Warning threshold: >2 minutes for 500 contacts
      // Calculate expected time: (itemsProcessed / 500) * 2 minutes
      const expectedMinutes = (itemsProcessed / 500) * 2;
      
      if (durationMinutes > expectedMinutes && durationMinutes > 2) {
        const warning = 
          `Slow sync detected: ${durationMinutes.toFixed(2)} minutes for ${itemsProcessed} contacts ` +
          `(expected ~${expectedMinutes.toFixed(2)} minutes)`;
        
        metrics.warnings = metrics.warnings || [];
        metrics.warnings.push(warning);
        
        console.warn(`[Performance Warning] ${warning}`);
      }

      // Additional warning for very slow operations (>5 minutes)
      if (durationMinutes > 5) {
        const warning = `Very slow operation: ${durationMinutes.toFixed(2)} minutes`;
        metrics.warnings = metrics.warnings || [];
        metrics.warnings.push(warning);
        
        console.warn(`[Performance Warning] ${warning}`);
      }
    }

    // Warning for high API request count (independent of duration)
    if (metrics.apiRequestCount && metrics.apiRequestCount > 100) {
      const warning = `High API request count: ${metrics.apiRequestCount} requests`;
      metrics.warnings = metrics.warnings || [];
      metrics.warnings.push(warning);
      
      console.warn(`[Performance Warning] ${warning}`);
    }
  }

  /**
   * Log performance metrics
   */
  private logMetrics(metrics: PerformanceMetrics): void {
    const durationSeconds = metrics.duration ? (metrics.duration / 1000).toFixed(2) : 'N/A';
    const durationMinutes = metrics.duration ? (metrics.duration / 1000 / 60).toFixed(2) : 'N/A';
    
    console.log(
      `[Performance] ${metrics.operationName}: ` +
      `Duration: ${durationSeconds}s (${durationMinutes}m), ` +
      `Items: ${metrics.itemsProcessed || 0}, ` +
      `API Requests: ${metrics.apiRequestCount || 0}`
    );

    if (metrics.warnings && metrics.warnings.length > 0) {
      console.warn(`[Performance] Warnings: ${metrics.warnings.join(', ')}`);
    }
  }

  /**
   * Add a warning to an ongoing operation
   * 
   * @param operationId - Unique identifier for the operation
   * @param warning - Warning message
   */
  addWarning(operationId: string, warning: string): void {
    const metrics = this.metrics.get(operationId);
    
    if (metrics) {
      metrics.warnings = metrics.warnings || [];
      metrics.warnings.push(warning);
    }
  }

  /**
   * Get current metrics for an operation (without ending it)
   * 
   * @param operationId - Unique identifier for the operation
   */
  getCurrentMetrics(operationId: string): PerformanceMetrics | null {
    return this.metrics.get(operationId) || null;
  }
}

/**
 * Default performance monitor instance
 */
export const defaultPerformanceMonitor = new PerformanceMonitor();
