/**
 * Performance Monitor Tests
 * 
 * Tests for performance monitoring utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from './performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  describe('startOperation and endOperation', () => {
    it('should track operation duration', async () => {
      const operationId = 'test-op-1';
      
      monitor.startOperation(operationId, 'Test Operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const metrics = monitor.endOperation(operationId, 100);
      
      expect(metrics).toBeDefined();
      expect(metrics?.operationName).toBe('Test Operation');
      expect(metrics?.duration).toBeGreaterThan(0);
      expect(metrics?.itemsProcessed).toBe(100);
    });

    it('should return null for non-existent operation', () => {
      const metrics = monitor.endOperation('non-existent');
      expect(metrics).toBeNull();
    });

    it('should track metadata', () => {
      const operationId = 'test-op-2';
      const metadata = { userId: 'user-123', syncType: 'full' };
      
      monitor.startOperation(operationId, 'Test Operation', metadata);
      const metrics = monitor.endOperation(operationId);
      
      expect(metrics?.metadata).toEqual(metadata);
    });
  });

  describe('API request tracking', () => {
    it('should track API request count', () => {
      const operationId = 'test-op-3';
      
      monitor.startOperation(operationId, 'Test Operation');
      
      monitor.incrementApiRequestCount(operationId);
      monitor.incrementApiRequestCount(operationId);
      monitor.incrementApiRequestCount(operationId);
      
      expect(monitor.getApiRequestCount(operationId)).toBe(3);
      
      const metrics = monitor.endOperation(operationId);
      expect(metrics?.apiRequestCount).toBe(3);
    });

    it('should return 0 for non-existent operation', () => {
      expect(monitor.getApiRequestCount('non-existent')).toBe(0);
    });
  });

  describe('performance warnings', () => {
    it('should generate warning for slow sync', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operationId = 'test-op-4';
      monitor.startOperation(operationId, 'Test Operation');
      
      // Manually set start time to simulate slow operation
      const metrics = monitor.getCurrentMetrics(operationId);
      if (metrics) {
        metrics.startTime = Date.now() - (3 * 60 * 1000); // 3 minutes ago
      }
      
      const result = monitor.endOperation(operationId, 500);
      
      // Should have warning for >2 minutes for 500 contacts
      expect(result?.warnings).toBeDefined();
      expect(result?.warnings?.length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should generate warning for high API request count', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operationId = 'test-op-5';
      monitor.startOperation(operationId, 'Test Operation');
      
      // Simulate high API request count
      for (let i = 0; i < 150; i++) {
        monitor.incrementApiRequestCount(operationId);
      }
      
      const result = monitor.endOperation(operationId, 100);
      
      expect(result?.apiRequestCount).toBe(150);
      expect(result?.warnings).toBeDefined();
      // The warning is generated in checkPerformanceWarnings which checks API count
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('addWarning', () => {
    it('should add custom warning to operation', () => {
      const operationId = 'test-op-6';
      
      monitor.startOperation(operationId, 'Test Operation');
      monitor.addWarning(operationId, 'Custom warning message');
      
      const metrics = monitor.endOperation(operationId);
      
      expect(metrics?.warnings).toContain('Custom warning message');
    });

    it('should handle warning for non-existent operation', () => {
      // Should not throw error
      expect(() => {
        monitor.addWarning('non-existent', 'Warning');
      }).not.toThrow();
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current metrics without ending operation', () => {
      const operationId = 'test-op-7';
      
      monitor.startOperation(operationId, 'Test Operation');
      monitor.incrementApiRequestCount(operationId);
      
      const currentMetrics = monitor.getCurrentMetrics(operationId);
      
      expect(currentMetrics).toBeDefined();
      expect(currentMetrics?.operationName).toBe('Test Operation');
      expect(currentMetrics?.endTime).toBeUndefined();
      
      // Operation should still be tracked
      const finalMetrics = monitor.endOperation(operationId);
      expect(finalMetrics).toBeDefined();
    });

    it('should return null for non-existent operation', () => {
      const metrics = monitor.getCurrentMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });
});
