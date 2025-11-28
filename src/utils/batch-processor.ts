/**
 * Batch Processor Utility
 * 
 * Provides utilities for batching database operations to improve performance.
 * Implements transaction-based batch inserts and updates.
 * 
 * Requirements: 12.3
 */

import { Pool } from 'pg';
import pool from '../db/connection';

export interface BatchOperation<T> {
  execute(): Promise<T>;
}

/**
 * Batch Processor
 * 
 * Processes items in batches with configurable batch size and transaction support.
 */
export class BatchProcessor {
  private batchSize: number;
  private dbPool: Pool;

  constructor(batchSize: number = 100, dbPool?: Pool) {
    this.batchSize = batchSize;
    this.dbPool = dbPool || pool;
  }

  /**
   * Process items in batches with a processing function
   * 
   * @param items - Array of items to process
   * @param processFn - Function to process each batch
   * @param useTransaction - Whether to wrap each batch in a transaction
   * @returns Array of results from each batch
   */
  async processBatches<T, R>(
    items: T[],
    processFn: (batch: T[]) => Promise<R>,
    useTransaction: boolean = true
  ): Promise<R[]> {
    const results: R[] = [];
    const batches = this.createBatches(items);

    for (const batch of batches) {
      if (useTransaction) {
        const result = await this.executeInTransaction(async () => {
          return await processFn(batch);
        });
        results.push(result);
      } else {
        const result = await processFn(batch);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Create batches from an array of items
   */
  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    return batches;
  }

  /**
   * Execute a function within a database transaction
   */
  private async executeInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await fn();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get the configured batch size
   */
  getBatchSize(): number {
    return this.batchSize;
  }
}

/**
 * Default batch processor instance with batch size of 100
 */
export const defaultBatchProcessor = new BatchProcessor(100);
