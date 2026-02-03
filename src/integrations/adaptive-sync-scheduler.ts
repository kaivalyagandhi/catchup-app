/**
 * Adaptive Sync Scheduler
 *
 * Dynamically adjusts sync frequency based on data change patterns.
 * Reduces frequency when no changes are detected, restores to default when changes occur.
 * Implements exponential backoff for failed syncs.
 *
 * Requirements: 3.1, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 7.6
 */

import pool from '../db/connection';
import { IntegrationType } from './token-health-monitor';

export interface SyncSchedule {
  userId: string;
  integrationType: IntegrationType;
  currentFrequency: number;        // in milliseconds
  defaultFrequency: number;        // base frequency
  minFrequency: number;            // minimum allowed
  maxFrequency: number;            // maximum allowed
  consecutiveNoChanges: number;    // counter for adaptive logic
  lastSyncAt: Date | null;
  nextSyncAt: Date;
}

interface SyncScheduleRow {
  id: string;
  user_id: string;
  integration_type: string;
  current_frequency_ms: string;
  default_frequency_ms: string;
  min_frequency_ms: string;
  max_frequency_ms: string;
  consecutive_no_changes: number;
  last_sync_at: Date | null;
  next_sync_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Sync frequency configuration
 */
export const SYNC_FREQUENCIES = {
  contacts: {
    default: 3 * 24 * 60 * 60 * 1000,  // 3 days
    min: 7 * 24 * 60 * 60 * 1000,      // 7 days
    max: 1 * 24 * 60 * 60 * 1000,      // 1 day
  },
  calendar: {
    default: 4 * 60 * 60 * 1000,       // 4 hours (with webhooks)
    min: 4 * 60 * 60 * 1000,           // 4 hours
    max: 1 * 60 * 60 * 1000,           // 1 hour
    webhookFallback: 8 * 60 * 60 * 1000, // 8 hours (when webhook active)
  },
};

/**
 * Exponential backoff configuration
 */
const BACKOFF_CONFIG = {
  initialDelay: 5 * 60 * 1000,      // 5 minutes
  maxDelay: 24 * 60 * 60 * 1000,    // 24 hours
  multiplier: 2,
};

/**
 * AdaptiveSyncScheduler
 * Manages dynamic sync frequency based on change detection and failure patterns
 */
export class AdaptiveSyncScheduler {
  private static instance: AdaptiveSyncScheduler;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AdaptiveSyncScheduler {
    if (!AdaptiveSyncScheduler.instance) {
      AdaptiveSyncScheduler.instance = new AdaptiveSyncScheduler();
    }
    return AdaptiveSyncScheduler.instance;
  }

  /**
   * Calculate next sync time based on change detection
   *
   * Requirements: 5.1, 5.2, 5.3, 5.5
   */
  async calculateNextSync(
    userId: string,
    integrationType: IntegrationType,
    changesDetected: boolean,
    isManualSync: boolean = false
  ): Promise<Date> {
    const schedule = await this.getSchedule(userId, integrationType);

    if (!schedule) {
      // Initialize schedule if it doesn't exist
      await this.initializeSchedule(userId, integrationType);
      return await this.calculateNextSync(userId, integrationType, changesDetected, isManualSync);
    }

    // Requirement 5.7, 7.6: Manual sync isolation
    // Manual syncs don't affect consecutive_no_changes counter or next_sync_at
    if (isManualSync) {
      return schedule.nextSyncAt;
    }

    const now = new Date();
    let newFrequency = schedule.currentFrequency;
    let newConsecutiveNoChanges = schedule.consecutiveNoChanges;

    if (changesDetected) {
      // Requirement 5.2: Adaptive frequency restoration
      // Reset to default frequency when changes are detected
      newFrequency = schedule.defaultFrequency;
      newConsecutiveNoChanges = 0;
    } else {
      // Increment no-change counter
      newConsecutiveNoChanges++;

      // Requirement 5.1: Adaptive frequency reduction
      // After 5 consecutive syncs with no changes, reduce frequency by 50%
      if (newConsecutiveNoChanges >= 5) {
        newFrequency = Math.floor(schedule.currentFrequency * 1.5);
        newConsecutiveNoChanges = 0; // Reset counter after adjustment
      }
    }

    // Requirement 5.3, 5.5: Frequency bounds enforcement
    const config = this.getFrequencyConfig(integrationType);
    newFrequency = Math.max(config.max, Math.min(config.min, newFrequency));

    const nextSyncAt = new Date(now.getTime() + newFrequency);

    // Requirement 5.6: Schedule persistence
    await this.updateSchedule(
      userId,
      integrationType,
      newFrequency,
      newConsecutiveNoChanges,
      now,
      nextSyncAt
    );

    return nextSyncAt;
  }

  /**
   * Calculate exponential backoff delay for failed syncs
   *
   * Requirements: 3.1, 3.3, 3.4, 3.5
   */
  async calculateBackoffDelay(
    userId: string,
    integrationType: IntegrationType,
    failureCount: number
  ): Promise<Date> {
    // Requirement 3.1, 3.3: Exponential backoff calculation
    // Start at 5 minutes, double with each failure
    let delay = BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, failureCount - 1);

    // Requirement 3.4: Backoff upper bound
    // Cap at 24 hours
    delay = Math.min(delay, BACKOFF_CONFIG.maxDelay);

    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + delay);

    // Requirement 3.6: Backoff persistence
    // Update next_sync_at in database
    await pool.query(
      `UPDATE sync_schedule
       SET next_sync_at = $1,
           updated_at = NOW()
       WHERE user_id = $2 AND integration_type = $3`,
      [nextSyncAt, userId, integrationType]
    );

    return nextSyncAt;
  }

  /**
   * Reset backoff on successful sync
   *
   * Requirement 3.5: Backoff reset on success
   */
  async resetBackoff(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    const schedule = await this.getSchedule(userId, integrationType);
    
    if (!schedule) {
      return;
    }

    // Reset to default frequency
    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + schedule.defaultFrequency);

    await pool.query(
      `UPDATE sync_schedule
       SET current_frequency_ms = default_frequency_ms,
           next_sync_at = $1,
           updated_at = NOW()
       WHERE user_id = $2 AND integration_type = $3`,
      [nextSyncAt, userId, integrationType]
    );
  }

  /**
   * Get current sync schedule
   */
  async getSchedule(
    userId: string,
    integrationType: IntegrationType
  ): Promise<SyncSchedule | null> {
    const result = await pool.query<SyncScheduleRow>(
      'SELECT * FROM sync_schedule WHERE user_id = $1 AND integration_type = $2',
      [userId, integrationType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToSchedule(result.rows[0]);
  }

  /**
   * Reset to default frequency (after changes detected)
   */
  async resetToDefault(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    const schedule = await this.getSchedule(userId, integrationType);
    
    if (!schedule) {
      await this.initializeSchedule(userId, integrationType);
      return;
    }

    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + schedule.defaultFrequency);

    await pool.query(
      `UPDATE sync_schedule
       SET current_frequency_ms = default_frequency_ms,
           consecutive_no_changes = 0,
           next_sync_at = $1,
           updated_at = NOW()
       WHERE user_id = $2 AND integration_type = $3`,
      [nextSyncAt, userId, integrationType]
    );
  }

  /**
   * Set calendar polling to webhook fallback frequency (8 hours)
   *
   * Requirements: 6.3 - Webhook frequency adjustment
   */
  async setWebhookFallbackFrequency(userId: string): Promise<void> {
    const webhookFrequency = SYNC_FREQUENCIES.calendar.webhookFallback;
    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + webhookFrequency);

    await pool.query(
      `UPDATE sync_schedule
       SET current_frequency_ms = $1,
           default_frequency_ms = $1,
           next_sync_at = $2,
           updated_at = NOW()
       WHERE user_id = $3 AND integration_type = 'google_calendar'`,
      [webhookFrequency, nextSyncAt, userId]
    );

    console.log(
      `[AdaptiveSyncScheduler] Set webhook fallback frequency (8 hours) for user ${userId}`
    );
  }

  /**
   * Restore normal polling frequency (4 hours) when webhook fails
   *
   * Requirements: 6.5 - Webhook fallback
   */
  async restoreNormalPollingFrequency(userId: string): Promise<void> {
    const normalFrequency = SYNC_FREQUENCIES.calendar.default;
    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + normalFrequency);

    await pool.query(
      `UPDATE sync_schedule
       SET current_frequency_ms = $1,
           default_frequency_ms = $1,
           next_sync_at = $2,
           updated_at = NOW()
       WHERE user_id = $3 AND integration_type = 'google_calendar'`,
      [normalFrequency, nextSyncAt, userId]
    );

    console.log(
      `[AdaptiveSyncScheduler] Restored normal polling frequency (4 hours) for user ${userId}`
    );
  }

  /**
   * Get all users due for sync
   *
   * Requirements: 5.1, 5.2
   */
  async getUsersDueForSync(
    integrationType: IntegrationType
  ): Promise<string[]> {
    const now = new Date();
    
    const result = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM sync_schedule
       WHERE integration_type = $1
       AND next_sync_at <= $2
       ORDER BY next_sync_at ASC`,
      [integrationType, now]
    );

    return result.rows.map(row => row.user_id);
  }

  /**
   * Update sync schedule
   *
   * Requirement 5.6: Schedule persistence
   */
  private async updateSchedule(
    userId: string,
    integrationType: IntegrationType,
    currentFrequency: number,
    consecutiveNoChanges: number,
    lastSyncAt: Date,
    nextSyncAt: Date
  ): Promise<void> {
    await pool.query(
      `UPDATE sync_schedule
       SET current_frequency_ms = $1,
           consecutive_no_changes = $2,
           last_sync_at = $3,
           next_sync_at = $4,
           updated_at = NOW()
       WHERE user_id = $5 AND integration_type = $6`,
      [currentFrequency, consecutiveNoChanges, lastSyncAt, nextSyncAt, userId, integrationType]
    );
  }

  /**
   * Get frequency configuration for integration type
   */
  private getFrequencyConfig(integrationType: IntegrationType) {
    return integrationType === 'google_contacts'
      ? SYNC_FREQUENCIES.contacts
      : SYNC_FREQUENCIES.calendar;
  }

  /**
   * Convert database row to SyncSchedule object
   */
  private rowToSchedule(row: SyncScheduleRow): SyncSchedule {
    return {
      userId: row.user_id,
      integrationType: row.integration_type as IntegrationType,
      currentFrequency: parseInt(row.current_frequency_ms, 10),
      defaultFrequency: parseInt(row.default_frequency_ms, 10),
      minFrequency: parseInt(row.min_frequency_ms, 10),
      maxFrequency: parseInt(row.max_frequency_ms, 10),
      consecutiveNoChanges: row.consecutive_no_changes,
      lastSyncAt: row.last_sync_at,
      nextSyncAt: row.next_sync_at,
    };
  }

  /**
   * Initialize sync schedule for a user with custom frequency
   * Public method for OAuth connection flows
   * 
   * Requirements: 5.1, 6.3, 6.5
   */
  async initializeSchedule(
    userId: string,
    integrationType: IntegrationType,
    customFrequency?: number
  ): Promise<void> {
    const config = this.getFrequencyConfig(integrationType);
    const frequency = customFrequency || config.default;
    const now = new Date();
    const nextSyncAt = new Date(now.getTime() + frequency);

    await pool.query(
      `INSERT INTO sync_schedule (
        user_id,
        integration_type,
        current_frequency_ms,
        default_frequency_ms,
        min_frequency_ms,
        max_frequency_ms,
        consecutive_no_changes,
        next_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
      ON CONFLICT (user_id, integration_type) 
      DO UPDATE SET
        current_frequency_ms = EXCLUDED.current_frequency_ms,
        next_sync_at = EXCLUDED.next_sync_at,
        updated_at = NOW()`,
      [
        userId,
        integrationType,
        frequency,
        config.default,
        config.min,
        config.max,
        nextSyncAt,
      ]
    );
  }

  /**
   * Remove sync schedule for a user
   * Used during disconnection flows
   * 
   * Requirements: 5.1
   */
  async removeSchedule(
    userId: string,
    integrationType: IntegrationType
  ): Promise<void> {
    await pool.query(
      `DELETE FROM sync_schedule 
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );
  }
}

// Export singleton instance
export const adaptiveSyncScheduler = AdaptiveSyncScheduler.getInstance();
