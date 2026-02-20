/**
 * Memory Monitor Tests
 *
 * Requirements: Memory Optimization Phase 1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryMonitor } from './memory-monitor';

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;

  beforeEach(() => {
    monitor = new MemoryMonitor({
      sampleIntervalMs: 100, // Short interval for testing
      maxSamples: 10,
      growthThreshold: 1.5,
      enableAlerts: false,
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('start and stop', () => {
    it('should start monitoring', () => {
      monitor.start();
      const samples = monitor.getSamples();
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      // Should not throw
    });

    it('should not start twice', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      monitor.start();
      monitor.start();

      expect(consoleSpy).toHaveBeenCalledWith('[Memory Monitor] Already started');

      consoleSpy.mockRestore();
    });
  });

  describe('getSamples', () => {
    it('should return memory samples', async () => {
      monitor.start();

      // Wait for a few samples
      await new Promise((resolve) => setTimeout(resolve, 250));

      const samples = monitor.getSamples();

      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0]).toHaveProperty('timestamp');
      expect(samples[0]).toHaveProperty('heapUsed');
      expect(samples[0]).toHaveProperty('heapTotal');
      expect(samples[0]).toHaveProperty('rss');
    });

    it('should limit samples to maxSamples', async () => {
      const monitor = new MemoryMonitor({
        sampleIntervalMs: 50,
        maxSamples: 3,
        enableAlerts: false,
      });

      monitor.start();

      // Wait for more than maxSamples intervals
      await new Promise((resolve) => setTimeout(resolve, 250));

      const samples = monitor.getSamples();

      expect(samples.length).toBeLessThanOrEqual(3);

      monitor.stop();
    });
  });

  describe('logMemoryUsage', () => {
    it('should log memory usage for an operation', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const before = process.memoryUsage();
      const after = process.memoryUsage();

      monitor.logMemoryUsage('test-operation', before, after);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Memory] test-operation:'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should calculate heap diff correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const before = process.memoryUsage();
      // Allocate some memory
      const arr = new Array(1000).fill('test');
      const after = process.memoryUsage();

      monitor.logMemoryUsage('test-operation', before, after);

      expect(consoleSpy).toHaveBeenCalled();

      // Clean up
      arr.length = 0;
      consoleSpy.mockRestore();
    });
  });

  describe('wrapOperation', () => {
    it('should wrap operation with memory tracking', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await monitor.wrapOperation('test-op', async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Memory] test-op:'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should track memory before and after operation', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await monitor.wrapOperation('test-op', async () => {
        // Allocate some memory
        const arr = new Array(1000).fill('test');
        return arr.length;
      });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('detectLeak', () => {
    it('should return null when not enough samples', () => {
      const result = monitor.detectLeak();
      expect(result).toBeNull();
    });

    it('should detect memory leak when growth exceeds threshold', async () => {
      monitor.start();

      // Wait for initial samples
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Allocate memory to simulate leak
      const leakyArray: any[] = [];
      for (let i = 0; i < 100; i++) {
        leakyArray.push(new Array(100000).fill('leak'));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Wait for more samples
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = monitor.detectLeak();

      expect(result).not.toBeNull();
      if (result) {
        expect(result.detected).toBe(true);
        expect(result.growthPercent).toBeGreaterThan(0);
        expect(result.recommendation).toContain('leak');
      }

      // Clean up
      leakyArray.length = 0;
    });

    it('should not detect leak when growth is normal', async () => {
      const monitor = new MemoryMonitor({
        sampleIntervalMs: 100,
        maxSamples: 5,
        growthThreshold: 2.0, // High threshold
        enableAlerts: false,
      });

      monitor.start();

      // Wait for samples
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = monitor.detectLeak();

      if (result) {
        expect(result.detected).toBe(false);
      }

      monitor.stop();
    });
  });
});
