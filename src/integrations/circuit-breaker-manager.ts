/**
 * Circuit Breaker Manager
 *
 * Prevents repeated failed sync attempts by implementing circuit breaker pattern.
 * Opens circuit after threshold failures, transitions through states, and maintains
 * separate state per user and integration type.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import pool from '../db/connection';
import { IntegrationType } from './token-health-monitor';

export type CircuitBreakerStateType = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  userId: string;
  integrationType: IntegrationType;
  state: CircuitBreakerStateType;
  failureCount: number;
  lastFailureAt: Date | null;
  openedAt: Date | null;
  nextRetryAt: Date | null;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // 3 failures to open
  openDuration: number;           // 1 hour in ms
  halfOpenMaxAttempts: number;    // 1 attempt in half-open
}

interface CircuitBreakerRow {
  id: string;
  user_id: string;
  integration_type: string;
  state: string;
  failure_count: number;
  last_failure_at: Date | null;
  last_failure_reason: string | null;
  opened_at: Date | null;
  next_retry_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * CircuitBreakerManager
 * Manages circuit breaker state to prevent repeated failed sync attempts
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private config: CircuitBreakerConfig;

  private constructor() {
    this.config = {
      failureThreshold: 3,
      openDuration: 60 * 60 * 1000, // 1 hour
      halfOpenMaxAttempts: 1,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Check if sync should be allowed
   *
   * Requirements: 2.2, 2.3
   */
  async canExecuteSync(
    userId: string,
    integrationType: IntegrationType
  ): Promise<boolean> {
    const state = await this.getState(userId, integrationType);

    // If no state exists, initialize as closed and allow sync
    if (!state) {
      await this.initializeState(userId, integrationType);
      return true;
    }

    const now = new Date();

    // Closed state: Allow sync
    if (state.state === 'closed') {
      return true;
    }

    // Open state: Check if timeout has passed
    // Requirement 2.3: Circuit breaker timeout transition
    if (state.state === 'open') {
      if (state.nextRetryAt && now >= state.nextRetryAt) {
        // Transition to half_open
        await this.transitionToHalfOpen(userId, integrationType);
        return true;
      }
      // Still in timeout period, block sync
      // Requirement 2.2: Circuit breaker blocks execution when open
      return false;
    }

    // Half-open state: Allow one attempt
    if (state.state === 'half_open') {
      return true;
    }

    return false;
  }

  /**
   * Record sync success (resets circuit breaker)
   *
   * Requirements: 2.4, 2.5
   */
  async recordSuccess(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    const state = await this.getState(userId, integrationType);

    if (!state) {
      // Initialize as closed if no state exists
      await this.initializeState(userId, integrationType);
      return;
    }

    const oldState = state.state;

    // Requirement 2.4, 2.5: Circuit breaker recovery
    // Success in any state transitions to closed and resets failure count
    await pool.query(
      `UPDATE circuit_breaker_state
       SET state = 'closed',
           failure_count = 0,
           last_failure_at = NULL,
           opened_at = NULL,
           next_retry_at = NULL,
           updated_at = NOW()
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );

    // Requirement 2.7: Circuit breaker audit logging
    if (oldState !== 'closed') {
      this.logStateTransition(userId, integrationType, oldState, 'closed', 'Sync succeeded');
    }
  }

  /**
   * Record sync failure (increments failure count, may open circuit)
   *
   * Requirements: 2.1, 2.4, 2.5
   */
  async recordFailure(
    userId: string,
    integrationType: IntegrationType,
    error: Error
  ): Promise<void> {
    const state = await this.getState(userId, integrationType);

    if (!state) {
      // Initialize and record first failure
      await this.initializeState(userId, integrationType);
      await this.recordFailure(userId, integrationType, error);
      return;
    }

    const now = new Date();
    const newFailureCount = state.failureCount + 1;
    const oldState = state.state;

    // Requirement 2.5: Half-open failure transitions back to open
    if (state.state === 'half_open') {
      const nextRetryAt = new Date(now.getTime() + this.config.openDuration);
      
      await pool.query(
        `UPDATE circuit_breaker_state
         SET state = 'open',
             failure_count = $1,
             last_failure_at = $2,
             last_failure_reason = $3,
             opened_at = $2,
             next_retry_at = $4,
             updated_at = NOW()
         WHERE user_id = $5 AND integration_type = $6`,
        [newFailureCount, now, error.message, nextRetryAt, userId, integrationType]
      );

      // Requirement 2.7: Circuit breaker audit logging
      this.logStateTransition(
        userId,
        integrationType,
        oldState,
        'open',
        `Sync failed in half_open state: ${error.message}`
      );
      return;
    }

    // Requirement 2.1: Circuit breaker threshold
    // After exactly 3 failures, transition to open
    if (state.state === 'closed' && newFailureCount >= this.config.failureThreshold) {
      const nextRetryAt = new Date(now.getTime() + this.config.openDuration);
      
      await pool.query(
        `UPDATE circuit_breaker_state
         SET state = 'open',
             failure_count = $1,
             last_failure_at = $2,
             last_failure_reason = $3,
             opened_at = $2,
             next_retry_at = $4,
             updated_at = NOW()
         WHERE user_id = $5 AND integration_type = $6`,
        [newFailureCount, now, error.message, nextRetryAt, userId, integrationType]
      );

      // Requirement 2.7: Circuit breaker audit logging
      this.logStateTransition(
        userId,
        integrationType,
        oldState,
        'open',
        `Failure threshold reached (${newFailureCount} failures): ${error.message}`
      );
      return;
    }

    // Still in closed state, increment failure count
    await pool.query(
      `UPDATE circuit_breaker_state
       SET failure_count = $1,
           last_failure_at = $2,
           last_failure_reason = $3,
           updated_at = NOW()
       WHERE user_id = $4 AND integration_type = $5`,
      [newFailureCount, now, error.message, userId, integrationType]
    );
  }

  /**
   * Get current circuit breaker state
   */
  async getState(
    userId: string,
    integrationType: IntegrationType
  ): Promise<CircuitBreakerState | null> {
    try {
      const result = await pool.query<CircuitBreakerRow>(
        'SELECT * FROM circuit_breaker_state WHERE user_id = $1 AND integration_type = $2',
        [userId, integrationType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToState(result.rows[0]);
    } catch (error) {
      // If table doesn't exist, return null (will initialize as closed)
      console.warn(`Error getting circuit breaker state for ${integrationType}:`, error);
      return null;
    }
  }

  /**
   * Manually reset circuit breaker (admin action or user re-auth)
   */
  async reset(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    const state = await this.getState(userId, integrationType);
    const oldState = state?.state || 'unknown';

    await pool.query(
      `INSERT INTO circuit_breaker_state (user_id, integration_type, state, failure_count)
       VALUES ($1, $2, 'closed', 0)
       ON CONFLICT (user_id, integration_type)
       DO UPDATE SET
         state = 'closed',
         failure_count = 0,
         last_failure_at = NULL,
         last_failure_reason = NULL,
         opened_at = NULL,
         next_retry_at = NULL,
         updated_at = NOW()`,
      [userId, integrationType]
    );

    // Requirement 2.7: Circuit breaker audit logging
    if (oldState !== 'closed') {
      this.logStateTransition(userId, integrationType, oldState, 'closed', 'Manual reset');
    }
  }

  /**
   * Initialize circuit breaker state as closed
   */
  private async initializeState(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO circuit_breaker_state (user_id, integration_type, state, failure_count)
         VALUES ($1, $2, 'closed', 0)
         ON CONFLICT (user_id, integration_type) DO NOTHING`,
        [userId, integrationType]
      );
    } catch (error) {
      // If table doesn't exist, that's okay - circuit breaker is optional
      console.warn(`Could not initialize circuit breaker state for ${integrationType}:`, error);
    }
  }

  /**
   * Transition from open to half_open state
   *
   * Requirement 2.3: Circuit breaker timeout transition
   */
  private async transitionToHalfOpen(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    const state = await this.getState(userId, integrationType);
    const oldState = state?.state || 'unknown';

    await pool.query(
      `UPDATE circuit_breaker_state
       SET state = 'half_open',
           next_retry_at = NULL,
           updated_at = NOW()
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );

    // Requirement 2.7: Circuit breaker audit logging
    this.logStateTransition(
      userId,
      integrationType,
      oldState,
      'half_open',
      'Timeout period elapsed, testing recovery'
    );
  }

  /**
   * Log state transition for audit trail
   *
   * Requirement 2.7: Circuit breaker audit logging
   */
  private logStateTransition(
    userId: string,
    integrationType: IntegrationType,
    oldState: string,
    newState: string,
    reason: string
  ): void {
    console.log(
      `[CircuitBreaker] State transition for user ${userId}, integration ${integrationType}: ` +
      `${oldState} → ${newState}. Reason: ${reason}. Timestamp: ${new Date().toISOString()}`
    );
  }

  /**
   * Convert database row to CircuitBreakerState object
   */
  private rowToState(row: CircuitBreakerRow): CircuitBreakerState {
    return {
      userId: row.user_id,
      integrationType: row.integration_type as IntegrationType,
      state: row.state as CircuitBreakerStateType,
      failureCount: row.failure_count,
      lastFailureAt: row.last_failure_at,
      openedAt: row.opened_at,
      nextRetryAt: row.next_retry_at,
    };
  }
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();
