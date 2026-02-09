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
  currentFrequency: number; // in milliseconds
  defaultFrequency: number; // base frequency
  minFrequency: number; // minimum allowed
  maxFrequency: number; // maximum allowed
  consecutiveNoChanges: number; // counter for adaptive logic
  lastSyncAt: Date | null;
  nextSyncAt: Date;
  onboardingUntil: Date | null; // when onboarding period ends (24h after first connection)
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
  onboarding_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Sync frequency configuration
 * Updated 2026-02-04: Reduced frequencies to minimize API usage
 * Reference: SYNC_FREQUENCY_FINAL_CONFIG.md
 */
export const SYNC_FREQUENCIES = {
  contacts: {
    default: 7 * 24 * 60 * 60 * 1000, // 7 days (was 3 days)
    min: 30 * 24 * 60 * 60 * 1000, // 30 days (was 7 days)
    max: 1 * 24 * 60 * 60 * 1000, // 1 day (unchanged)
    onboarding: 1 * 60 * 60 * 1000, // 1 hour (new: for first 24h after connection)
  },
  calendar: {
    default: 24 * 60 * 60 * 1000, // 24 hours (was 4 hours)
    min: 24 * 60 * 60 * 1000, // 24 hours (was 4 hours)
    max: 4 * 60 * 60 * 1000, // 4 hours (was 1 hour)
    webhookFallback: 12 * 60 * 60 * 1000, // 12 hours (was 8 hours, when webhook active)
    onboarding: 2 * 60 * 60 * 1000, // 2 hours (new: for first 24h after connection)
  },
};

/**
 * Exponential backoff configuration
 */
const BACKOFF_CONFIG = {
  initialDelay: 5 * 60 * 1000, // 5 minutes
  maxDelay: 24 * 60 * 60 * 1000, // 24 hours
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
   *
   * Onboarding Mitigation: During the first 24 hours after connection,
   * use onboarding frequency (1h for contacts, 2h for calendar) instead of adaptive logic.
   * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"
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

    // Check if still in onboarding period
    const isOnboarding = schedule.onboardingUntil && now < schedule.onboardingUntil;

    if (isOnboarding) {
      // During onboarding: use onboarding frequency, ignore adaptive logic
      const config = this.getFrequencyConfig(integrationType);
      const nextSyncAt = new Date(now.getTime() + config.onboarding);

      console.log(
        `[AdaptiveSyncScheduler] User ${userId} (${integrationType}) in onboarding period. ` +
          `Next sync in ${config.onboarding / (60 * 60 * 1000)}h at ${nextSyncAt.toISOString()}`
      );

      // Update schedule with onboarding frequency
      await this.updateSchedule(
        userId,
        integrationType,
        config.onboarding,
        schedule.consecutiveNoChanges, // Don't change counter during onboarding
        now,
        nextSyncAt
      );

      return nextSyncAt;
    }

    // Past onboarding period: use normal adaptive logic
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
  async resetBackoff(userId: string, integrationType: IntegrationType): Promise<void> {
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
  async resetToDefault(userId: string, integrationType: IntegrationType): Promise<void> {
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
   * Set calendar polling to webhook fallback frequency (12 hours)
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
      `[AdaptiveSyncScheduler] Set webhook fallback frequency (12 hours) for user ${userId}`
    );
  }

  /**
   * Restore normal polling frequency (24 hours) when webhook fails
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
      `[AdaptiveSyncScheduler] Restored normal polling frequency (24 hours) for user ${userId}`
    );
  }

  /**
   * Get all users due for sync
   *
   * Requirements: 5.1, 5.2
   */
  async getUsersDueForSync(integrationType: IntegrationType): Promise<string[]> {
    const now = new Date();

    const result = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM sync_schedule
       WHERE integration_type = $1
       AND next_sync_at <= $2
       ORDER BY next_sync_at ASC`,
      [integrationType, now]
    );

    return result.rows.map((row) => row.user_id);
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
      onboardingUntil: row.onboarding_until,
    };
  }

  /**
   * Initialize sync schedule for a user with custom frequency
   * Public method for OAuth connection flows
   *
   * Requirements: 5.1, 6.3, 6.5
   *
   * Onboarding Mitigation: If this is a first connection, use onboarding frequency
   * (1h for contacts, 2h for calendar) for the first 24 hours.
   * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 3: Onboarding-Specific Frequency"
   */
  async initializeSchedule(
    userId: string,
    integrationType: IntegrationType,
    customFrequency?: number
  ): Promise<void> {
    const config = this.getFrequencyConfig(integrationType);
    const now = new Date();

    // Check if this is a first connection
    const isFirstConnection = await this.isFirstConnection(userId, integrationType);

    // Determine frequency and onboarding period
    let frequency: number;
    let onboardingUntil: Date | null = null;

    if (customFrequency) {
      // Custom frequency provided (e.g., webhook fallback)
      frequency = customFrequency;
    } else if (isFirstConnection) {
      // First connection: use onboarding frequency for first 24 hours
      frequency = config.onboarding;
      onboardingUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      console.log(
        `[AdaptiveSyncScheduler] First connection for user ${userId} (${integrationType}). ` +
          `Using onboarding frequency: ${frequency / (60 * 60 * 1000)}h until ${onboardingUntil.toISOString()}`
      );
    } else {
      // Existing connection: use default frequency
      frequency = config.default;
    }

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
        next_sync_at,
        onboarding_until
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
      ON CONFLICT (user_id, integration_type) 
      DO UPDATE SET
        current_frequency_ms = EXCLUDED.current_frequency_ms,
        next_sync_at = EXCLUDED.next_sync_at,
        onboarding_until = EXCLUDED.onboarding_until,
        updated_at = NOW()`,
      [
        userId,
        integrationType,
        frequency,
        config.default,
        config.min,
        config.max,
        nextSyncAt,
        onboardingUntil,
      ]
    );
  }

  /**
   * Remove sync schedule for a user
   * Used during disconnection flows
   *
   * Requirements: 5.1
   */
  async removeSchedule(userId: string, integrationType: IntegrationType): Promise<void> {
    await pool.query(
      `DELETE FROM sync_schedule 
       WHERE user_id = $1 AND integration_type = $2`,
      [userId, integrationType]
    );
  }

  /**
   * Check if this is the first connection for a user
   * Returns true if no previous syncs exist for this integration type
   *
   * Used for onboarding mitigation - immediate first sync
   * Reference: SYNC_FREQUENCY_UPDATE_PLAN.md Section "Priority 1: Immediate First Sync"
   */
  async isFirstConnection(userId: string, integrationType: IntegrationType): Promise<boolean> {
    if (integrationType === 'google_contacts') {
      // Check if user has any sync history in google_contacts_sync_state
      const result = await pool.query(
        `SELECT last_full_sync_at, last_incremental_sync_at 
         FROM google_contacts_sync_state 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return true; // No sync state record = first connection
      }

      const row = result.rows[0];
      // First connection if both sync timestamps are null
      return !row.last_full_sync_at && !row.last_incremental_sync_at;
    } else {
      // For calendar, check if user has any sync history in sync_schedule
      const result = await pool.query(
        `SELECT last_sync_at 
         FROM sync_schedule 
         WHERE user_id = $1 AND integration_type = $2`,
        [userId, integrationType]
      );

      if (result.rows.length === 0) {
        return true; // No schedule record = first connection
      }

      const row = result.rows[0];
      // First connection if last_sync_at is null
      return !row.last_sync_at;
    }
  }
}

// Export singleton instance
export const adaptiveSyncScheduler = AdaptiveSyncScheduler.getInstance();
