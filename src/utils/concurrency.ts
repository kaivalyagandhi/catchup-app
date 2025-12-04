/**
 * Concurrency Control Utilities
 *
 * Handles concurrent updates with:
 * - Optimistic locking for contact updates
 * - Double-booking prevention for suggestion acceptance
 * - Idempotency keys for notification delivery
 */

import { Pool } from 'pg';

/**
 * Optimistic locking error
 */
export class OptimisticLockError extends Error {
  constructor(
    message: string,
    public entityType: string,
    public entityId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

/**
 * Concurrent update error
 */
export class ConcurrentUpdateError extends Error {
  constructor(
    message: string,
    public entityType: string,
    public entityId: string
  ) {
    super(message);
    this.name = 'ConcurrentUpdateError';
  }
}

/**
 * Idempotency key manager
 */
export class IdempotencyKeyManager {
  private keys: Map<string, { timestamp: number; result: any }> = new Map();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if operation with this key has already been processed
   */
  async checkKey(key: string): Promise<{ exists: boolean; result?: any }> {
    const entry = this.keys.get(key);

    if (!entry) {
      return { exists: false };
    }

    // Check if key has expired
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.keys.delete(key);
      return { exists: false };
    }

    return { exists: true, result: entry.result };
  }

  /**
   * Store result for idempotency key
   */
  async storeKey(key: string, result: any): Promise<void> {
    this.keys.set(key, {
      timestamp: Date.now(),
      result,
    });
  }

  /**
   * Clean up expired keys
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.keys.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.keys.delete(key);
      }
    }
  }
}

// Singleton instance
export const idempotencyKeyManager = new IdempotencyKeyManager();

// Clean up expired keys every hour
setInterval(() => idempotencyKeyManager.cleanup(), 60 * 60 * 1000);

/**
 * Generate idempotency key for notification
 */
export function generateNotificationIdempotencyKey(
  userId: string,
  suggestionId: string,
  channel: 'sms' | 'email'
): string {
  return `notification:${userId}:${suggestionId}:${channel}`;
}

/**
 * Execute operation with idempotency check
 */
export async function executeWithIdempotency<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  // Check if already processed
  const check = await idempotencyKeyManager.checkKey(key);
  if (check.exists) {
    return check.result as T;
  }

  // Execute operation
  const result = await operation();

  // Store result
  await idempotencyKeyManager.storeKey(key, result);

  return result;
}

/**
 * Optimistic locking for contact updates
 */
export interface VersionedEntity {
  id: string;
  version: number;
  [key: string]: any;
}

export async function updateWithOptimisticLock<T extends VersionedEntity>(
  pool: Pool,
  tableName: string,
  entityId: string,
  expectedVersion: number,
  updates: Partial<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Read current version
    const selectQuery = `
      SELECT version FROM ${tableName}
      WHERE id = $1
      FOR UPDATE
    `;
    const selectResult = await client.query(selectQuery, [entityId]);

    if (selectResult.rows.length === 0) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const currentVersion = selectResult.rows[0].version;

    // Check version matches
    if (currentVersion !== expectedVersion) {
      throw new OptimisticLockError(
        'Entity has been modified by another process',
        tableName,
        entityId,
        expectedVersion,
        currentVersion
      );
    }

    // Update with new version
    const newVersion = currentVersion + 1;
    const updateFields = Object.keys(updates)
      .filter((key) => key !== 'id' && key !== 'version')
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    const updateValues = Object.keys(updates)
      .filter((key) => key !== 'id' && key !== 'version')
      .map((key) => updates[key as keyof T]);

    const updateQuery = `
      UPDATE ${tableName}
      SET ${updateFields}, version = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [entityId, newVersion, ...updateValues]);

    await client.query('COMMIT');

    return updateResult.rows[0] as T;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Prevent double-booking for suggestion acceptance
 */
export interface SuggestionLock {
  suggestionId: string;
  userId: string;
  timeslot: { start: Date; end: Date };
}

export async function acceptSuggestionWithLock(
  pool: Pool,
  suggestionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the suggestion row
    const lockQuery = `
      SELECT id, user_id, status, proposed_timeslot_start, proposed_timeslot_end
      FROM suggestions
      WHERE id = $1
      FOR UPDATE
    `;
    const lockResult = await client.query(lockQuery, [suggestionId]);

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Suggestion not found' };
    }

    const suggestion = lockResult.rows[0];

    // Check if already accepted
    if (suggestion.status === 'accepted') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Suggestion already accepted' };
    }

    // Check if user owns this suggestion
    if (suggestion.user_id !== userId) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Unauthorized' };
    }

    // Check for conflicting accepted suggestions in the same timeslot
    const conflictQuery = `
      SELECT id FROM suggestions
      WHERE user_id = $1
        AND status = 'accepted'
        AND id != $2
        AND (
          (proposed_timeslot_start, proposed_timeslot_end) OVERLAPS ($3, $4)
        )
      FOR UPDATE
    `;
    const conflictResult = await client.query(conflictQuery, [
      userId,
      suggestionId,
      suggestion.proposed_timeslot_start,
      suggestion.proposed_timeslot_end,
    ]);

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Time slot conflict with another accepted suggestion',
      };
    }

    // Update suggestion status
    const updateQuery = `
      UPDATE suggestions
      SET status = 'accepted', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    await client.query(updateQuery, [suggestionId]);

    await client.query('COMMIT');

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retry operation with exponential backoff on lock conflicts
 */
export async function retryOnLockConflict<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a lock conflict error
      const isLockConflict =
        error instanceof OptimisticLockError ||
        error instanceof ConcurrentUpdateError ||
        (error.code && error.code === '40P01'); // PostgreSQL deadlock

      if (!isLockConflict || attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = initialDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Distributed lock using PostgreSQL advisory locks
 */
export class DistributedLock {
  constructor(private pool: Pool) {}

  /**
   * Acquire lock with timeout
   */
  async acquire(lockId: number, timeoutMs: number = 5000): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const result = await client.query('SELECT pg_try_advisory_lock($1)', [lockId]);

        if (result.rows[0].pg_try_advisory_lock) {
          return true;
        }

        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Release lock
   */
  async release(lockId: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    } finally {
      client.release();
    }
  }

  /**
   * Execute operation with lock
   */
  async withLock<T>(
    lockId: number,
    operation: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const acquired = await this.acquire(lockId, timeoutMs);

    if (!acquired) {
      throw new Error(`Failed to acquire lock ${lockId} within ${timeoutMs}ms`);
    }

    try {
      return await operation();
    } finally {
      await this.release(lockId);
    }
  }
}

/**
 * Generate lock ID from string (for advisory locks)
 */
export function generateLockId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
