/**
 * Batch Processor Tests
 * 
 * Tests for batch processing utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BatchProcessor } from './batch-processor';

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;

  beforeEach(() => {
    batchProcessor = new BatchProcessor(10); // Small batch size for testing
  });

  describe('processBatches', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processedBatches: number[][] = [];

      await batchProcessor.processBatches(
        items,
        async (batch) => {
          processedBatches.push([...batch]);
          return batch.length;
        },
        false // No transaction for test
      );

      // Should create 3 batches: [0-9], [10-19], [20-24]
      expect(processedBatches.length).toBe(3);
      expect(processedBatches[0].length).toBe(10);
      expect(processedBatches[1].length).toBe(10);
      expect(processedBatches[2].length).toBe(5);
    });

    it('should handle empty array', async () => {
      const items: number[] = [];
      const processedBatches: number[][] = [];

      await batchProcessor.processBatches(
        items,
        async (batch) => {
          processedBatches.push([...batch]);
          return batch.length;
        },
        false
      );

      expect(processedBatches.length).toBe(0);
    });

    it('should handle single batch', async () => {
      const items = [1, 2, 3];
      const processedBatches: number[][] = [];

      await batchProcessor.processBatches(
        items,
        async (batch) => {
          processedBatches.push([...batch]);
          return batch.length;
        },
        false
      );

      expect(processedBatches.length).toBe(1);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
    });

    it('should return results from each batch', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);

      const results = await batchProcessor.processBatches(
        items,
        async (batch) => {
          return batch.reduce((sum, item) => sum + item, 0);
        },
        false
      );

      // Results should be sum of each batch
      expect(results.length).toBe(3);
      expect(results[0]).toBe(45); // Sum of 0-9
      expect(results[1]).toBe(145); // Sum of 10-19
      expect(results[2]).toBe(110); // Sum of 20-24
    });
  });

  describe('getBatchSize', () => {
    it('should return configured batch size', () => {
      expect(batchProcessor.getBatchSize()).toBe(10);
    });
  });
});
