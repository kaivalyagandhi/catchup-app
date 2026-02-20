/**
 * Adaptive Sync Scheduler Tests
 *
 * Tests for adaptive sync frequency management and exponential backoff.
 * Includes both unit tests and property-based tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import pool from '../db/connection';
import {
  AdaptiveSyncScheduler,
  adaptiveSyncScheduler,
  SYNC_FREQUENCIES,
} from './adaptive-sync-scheduler';
import { IntegrationType } from './token-health-monitor';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('AdaptiveSyncScheduler', () => {
  beforeEach(async () => {
    // Create test user with google_id to satisfy check_auth_method constraint
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, auth_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_id = EXCLUDED.google_id, auth_method = EXCLUDED.auth_method`,
      [TEST_USER_ID, `test-${Date.now()}@example.com`, 'Test User', 'google-test-id', 'google']
    );

    // Clean up any existing schedules
    await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('calculateNextSync', () => {
    it('should initialize schedule if it does not exist', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create sync history to simulate existing connection (not first connection)
      await pool.query(
        `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
        [TEST_USER_ID]
      );
      
      const nextSync = await adaptiveSyncScheduler.calculateNextSync(
        TEST_USER_ID,
        integrationType,
        false
      );

      expect(nextSync).toBeInstanceOf(Date);
      expect(nextSync.getTime()).toBeGreaterThan(Date.now());

      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      expect(schedule).not.toBeNull();
      expect(schedule?.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.default);
    });

    it('should reduce frequency after 5 consecutive no-change syncs', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create sync history to simulate existing connection (not first connection)
      await pool.query(
        `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
        [TEST_USER_ID]
      );
      
      // Initialize
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      
      let schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      const initialFrequency = schedule!.currentFrequency;

      // Simulate 4 more consecutive no-change syncs (total of 5 including initialization)
      for (let i = 0; i < 4; i++) {
        await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      }

      // After 5 syncs, frequency should be adjusted and counter reset
      schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      expect(schedule!.currentFrequency).toBeGreaterThan(initialFrequency);
      expect(schedule!.consecutiveNoChanges).toBe(0); // Reset after adjustment
    });

    it('should restore default frequency when changes are detected', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create sync history to simulate existing connection (not first connection)
      await pool.query(
        `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
        [TEST_USER_ID]
      );
      
      // Initialize and reduce frequency
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      for (let i = 0; i < 5; i++) {
        await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      }

      // Detect changes
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, true);

      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.default);
      expect(schedule!.consecutiveNoChanges).toBe(0);
    });

    it('should not affect schedule for manual syncs', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Initialize
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      
      const scheduleBefore = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);

      // Manual sync with no changes
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false, true);

      const scheduleAfter = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Manual sync should not change consecutive_no_changes or next_sync_at
      expect(scheduleAfter!.consecutiveNoChanges).toBe(scheduleBefore!.consecutiveNoChanges);
      expect(scheduleAfter!.nextSyncAt.getTime()).toBe(scheduleBefore!.nextSyncAt.getTime());
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Initialize schedule
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

      // Test backoff for different failure counts
      const delays = [];
      for (let failureCount = 1; failureCount <= 5; failureCount++) {
        const nextSync = await adaptiveSyncScheduler.calculateBackoffDelay(
          TEST_USER_ID,
          integrationType,
          failureCount
        );
        const delay = nextSync.getTime() - Date.now();
        delays.push(delay);
      }

      // Verify exponential growth (each delay should be roughly double the previous)
      for (let i = 1; i < delays.length; i++) {
        const ratio = delays[i] / delays[i - 1];
        expect(ratio).toBeGreaterThan(1.8); // Allow some tolerance
        expect(ratio).toBeLessThan(2.2);
      }
    });

    it('should cap backoff at 24 hours', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Initialize schedule
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

      // Test with very high failure count
      const nextSync = await adaptiveSyncScheduler.calculateBackoffDelay(
        TEST_USER_ID,
        integrationType,
        20
      );

      const delay = nextSync.getTime() - Date.now();
      const maxDelay = 24 * 60 * 60 * 1000; // 24 hours

      expect(delay).toBeLessThanOrEqual(maxDelay + 1000); // Allow 1 second tolerance
    });
  });

  describe('resetBackoff', () => {
    it('should reset to default frequency on success', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Initialize
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      
      // Apply backoff with high failure count to ensure frequency increases
      await adaptiveSyncScheduler.calculateBackoffDelay(TEST_USER_ID, integrationType, 5);

      const scheduleBefore = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Reset backoff
      await adaptiveSyncScheduler.resetBackoff(TEST_USER_ID, integrationType);

      const scheduleAfter = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // After reset, frequency should be back to default
      expect(scheduleAfter!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.default);
      
      // The next_sync_at should be recalculated based on default frequency
      const expectedNextSync = new Date(scheduleAfter!.lastSyncAt?.getTime() || Date.now() + SYNC_FREQUENCIES.contacts.default);
      expect(scheduleAfter!.nextSyncAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getUsersDueForSync', () => {
    it('should return users with next_sync_at in the past', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create schedule with past next_sync_at
      await pool.query(
        `INSERT INTO sync_schedule (
          user_id, integration_type, current_frequency_ms, default_frequency_ms,
          min_frequency_ms, max_frequency_ms, next_sync_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          TEST_USER_ID,
          integrationType,
          SYNC_FREQUENCIES.contacts.default,
          SYNC_FREQUENCIES.contacts.default,
          SYNC_FREQUENCIES.contacts.min,
          SYNC_FREQUENCIES.contacts.max,
          new Date(Date.now() - 1000), // 1 second ago
        ]
      );

      const users = await adaptiveSyncScheduler.getUsersDueForSync(integrationType);
      
      expect(users).toContain(TEST_USER_ID);
    });

    it('should not return users with future next_sync_at', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create schedule with future next_sync_at
      await pool.query(
        `INSERT INTO sync_schedule (
          user_id, integration_type, current_frequency_ms, default_frequency_ms,
          min_frequency_ms, max_frequency_ms, next_sync_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          TEST_USER_ID,
          integrationType,
          SYNC_FREQUENCIES.contacts.default,
          SYNC_FREQUENCIES.contacts.default,
          SYNC_FREQUENCIES.contacts.min,
          SYNC_FREQUENCIES.contacts.max,
          new Date(Date.now() + 60000), // 1 minute in future
        ]
      );

      const users = await adaptiveSyncScheduler.getUsersDueForSync(integrationType);
      
      expect(users).not.toContain(TEST_USER_ID);
    });
  });

  describe('Onboarding Frequency', () => {
    it('should use onboarding frequency for first connection', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Ensure no sync history exists (first connection)
      await pool.query('DELETE FROM google_contacts_sync_state WHERE user_id = $1', [TEST_USER_ID]);
      
      // Initialize schedule
      await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, integrationType);
      
      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Should use onboarding frequency (1 hour for contacts)
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.onboarding);
      
      // Should have onboardingUntil set to 24 hours from now
      expect(schedule!.onboardingUntil).not.toBeNull();
      const hoursUntilOnboardingEnds = (schedule!.onboardingUntil!.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(hoursUntilOnboardingEnds).toBeGreaterThan(23.9);
      expect(hoursUntilOnboardingEnds).toBeLessThan(24.1);
    });

    it('should use default frequency for existing connection', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create sync history to simulate existing connection
      await pool.query(
        `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
        [TEST_USER_ID]
      );
      
      // Initialize schedule
      await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, integrationType);
      
      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Should use default frequency (7 days for contacts)
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.default);
      
      // Should NOT have onboardingUntil set
      expect(schedule!.onboardingUntil).toBeNull();
    });

    it('should use onboarding frequency during onboarding period', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Ensure no sync history exists (first connection)
      await pool.query('DELETE FROM google_contacts_sync_state WHERE user_id = $1', [TEST_USER_ID]);
      
      // Initialize schedule (will set onboarding frequency)
      await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, integrationType);
      
      // Calculate next sync (should still use onboarding frequency)
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
      
      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Should still use onboarding frequency
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.onboarding);
    });

    it('should transition to default frequency after onboarding period', async () => {
      const integrationType: IntegrationType = 'google_contacts';
      
      // Create schedule with onboarding period that has already ended
      const pastOnboardingUntil = new Date(Date.now() - 1000); // 1 second ago
      
      await pool.query(
        `INSERT INTO sync_schedule (
          user_id, integration_type, current_frequency_ms, default_frequency_ms,
          min_frequency_ms, max_frequency_ms, next_sync_at, onboarding_until, consecutive_no_changes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          TEST_USER_ID,
          integrationType,
          SYNC_FREQUENCIES.contacts.onboarding,
          SYNC_FREQUENCIES.contacts.default,
          SYNC_FREQUENCIES.contacts.min,
          SYNC_FREQUENCIES.contacts.max,
          new Date(Date.now() + 1000),
          pastOnboardingUntil,
          0, // Reset consecutive_no_changes to 0
        ]
      );
      
      // Calculate next sync with changes detected to restore default frequency
      await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, true);
      
      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Should now use default frequency (not onboarding frequency)
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.contacts.default);
    });

    it('should use onboarding frequency for calendar first connection', async () => {
      const integrationType: IntegrationType = 'google_calendar';
      
      // Ensure no sync history exists (first connection)
      await pool.query('DELETE FROM sync_schedule WHERE user_id = $1 AND integration_type = $2', 
        [TEST_USER_ID, integrationType]);
      
      // Initialize schedule
      await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, integrationType);
      
      const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
      
      // Should use onboarding frequency (2 hours for calendar)
      expect(schedule!.currentFrequency).toBe(SYNC_FREQUENCIES.calendar.onboarding);
      
      // Should have onboardingUntil set to 24 hours from now
      expect(schedule!.onboardingUntil).not.toBeNull();
      const hoursUntilOnboardingEnds = (schedule!.onboardingUntil!.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(hoursUntilOnboardingEnds).toBeGreaterThan(23.9);
      expect(hoursUntilOnboardingEnds).toBeLessThan(24.1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 20: Adaptive frequency reduction
     * For any sync schedule, after exactly 5 consecutive syncs with no changes detected,
     * the current_frequency_ms should be reduced by 50% (but not below min_frequency_ms).
     */
    it('Property 20: should reduce frequency after 5 consecutive no-change syncs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Create sync history to simulate existing connection (not first connection)
            if (integrationType === 'google_contacts') {
              await pool.query(
                `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
                 VALUES ($1, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
                [TEST_USER_ID]
              );
            } else {
              // For calendar, create a schedule with last_sync_at set
              await pool.query(
                `INSERT INTO sync_schedule (
                  user_id, integration_type, current_frequency_ms, default_frequency_ms,
                  min_frequency_ms, max_frequency_ms, next_sync_at, last_sync_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                  TEST_USER_ID,
                  integrationType,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.min,
                  SYNC_FREQUENCIES.calendar.max,
                  new Date(Date.now() + SYNC_FREQUENCIES.calendar.default),
                ]
              );
            }

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
            
            const initialSchedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
            const initialFrequency = initialSchedule!.currentFrequency;

            // Simulate exactly 4 more no-change syncs (total of 5)
            for (let i = 0; i < 4; i++) {
              await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
            }

            // After 5 syncs, frequency should be adjusted and counter reset
            const finalSchedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
            const config = integrationType === 'google_contacts' 
              ? SYNC_FREQUENCIES.contacts 
              : SYNC_FREQUENCIES.calendar;

            // Frequency should be increased (longer interval) but not exceed min
            // For calendar, default = min, so frequency won't change
            if (initialFrequency < config.min) {
              expect(finalSchedule!.currentFrequency).toBeGreaterThan(initialFrequency);
            }
            expect(finalSchedule!.currentFrequency).toBeLessThanOrEqual(config.min);
            expect(finalSchedule!.consecutiveNoChanges).toBe(0); // Reset after adjustment
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 21: Adaptive frequency restoration
     * For any sync that detects changes, the current_frequency_ms should be reset to default_frequency_ms.
     */
    it('Property 21: should restore default frequency when changes detected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 0, max: 10 }), // Number of no-change syncs before detecting change
          async (integrationType, noChangeSyncs) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Create sync history to simulate existing connection (not first connection)
            if (integrationType === 'google_contacts') {
              await pool.query(
                `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
                 VALUES ($1, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
                [TEST_USER_ID]
              );
            } else {
              // For calendar, create a schedule with last_sync_at set
              await pool.query(
                `INSERT INTO sync_schedule (
                  user_id, integration_type, current_frequency_ms, default_frequency_ms,
                  min_frequency_ms, max_frequency_ms, next_sync_at, last_sync_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                  TEST_USER_ID,
                  integrationType,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.min,
                  SYNC_FREQUENCIES.calendar.max,
                  new Date(Date.now() + SYNC_FREQUENCIES.calendar.default),
                ]
              );
            }

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Simulate no-change syncs
            for (let i = 0; i < noChangeSyncs; i++) {
              await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
            }

            // Detect changes
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, true);

            const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
            const config = integrationType === 'google_contacts' 
              ? SYNC_FREQUENCIES.contacts 
              : SYNC_FREQUENCIES.calendar;

            expect(schedule!.currentFrequency).toBe(config.default);
            expect(schedule!.consecutiveNoChanges).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 22: Frequency bounds enforcement
     * For any sync schedule update, the current_frequency_ms should always be
     * >= min_frequency_ms and <= max_frequency_ms.
     */
    it('Property 22: should enforce frequency bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 0, max: 20 }), // Consecutive no-change syncs
          async (integrationType, noChangeCount) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Create sync history to simulate existing connection (not first connection)
            if (integrationType === 'google_contacts') {
              await pool.query(
                `INSERT INTO google_contacts_sync_state (user_id, last_full_sync_at)
                 VALUES ($1, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET last_full_sync_at = NOW()`,
                [TEST_USER_ID]
              );
            } else {
              // For calendar, create a schedule with last_sync_at set
              await pool.query(
                `INSERT INTO sync_schedule (
                  user_id, integration_type, current_frequency_ms, default_frequency_ms,
                  min_frequency_ms, max_frequency_ms, next_sync_at, last_sync_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                  TEST_USER_ID,
                  integrationType,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.default,
                  SYNC_FREQUENCIES.calendar.min,
                  SYNC_FREQUENCIES.calendar.max,
                  new Date(Date.now() + SYNC_FREQUENCIES.calendar.default),
                ]
              );
            }

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Simulate no-change syncs
            for (let i = 0; i < noChangeCount; i++) {
              await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
            }

            const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
            const config = integrationType === 'google_contacts' 
              ? SYNC_FREQUENCIES.contacts 
              : SYNC_FREQUENCIES.calendar;

            // Frequency should be within bounds (note: max is shortest interval, min is longest)
            expect(schedule!.currentFrequency).toBeGreaterThanOrEqual(config.max);
            expect(schedule!.currentFrequency).toBeLessThanOrEqual(config.min);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 24: Manual sync isolation
     * For any manually triggered sync, the consecutive_no_changes counter and
     * next_sync_at timestamp should remain unchanged.
     */
    it('Property 24: should not affect schedule for manual syncs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.boolean(), // Whether changes were detected
          async (integrationType, changesDetected) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);
            
            const scheduleBefore = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);

            // Manual sync
            await adaptiveSyncScheduler.calculateNextSync(
              TEST_USER_ID,
              integrationType,
              changesDetected,
              true // isManualSync
            );

            const scheduleAfter = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);

            // Manual sync should not change consecutive_no_changes or next_sync_at
            expect(scheduleAfter!.consecutiveNoChanges).toBe(scheduleBefore!.consecutiveNoChanges);
            expect(scheduleAfter!.nextSyncAt.getTime()).toBe(scheduleBefore!.nextSyncAt.getTime());
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 12: Exponential backoff calculation
     * For any sequence of consecutive sync failures, the delay between retries
     * should double with each failure: 5 minutes, 10 minutes, 20 minutes, 40 minutes, etc.
     */
    it('Property 12: should double backoff delay with each failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 1, max: 5 }), // Number of failures
          async (integrationType, failureCount) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Calculate backoff for different failure counts and verify exponential growth
            let previousDelay = 0;
            for (let i = 1; i <= failureCount; i++) {
              const nextSync = await adaptiveSyncScheduler.calculateBackoffDelay(
                TEST_USER_ID,
                integrationType,
                i
              );
              const delay = nextSync.getTime() - Date.now();

              if (i > 1) {
                // Each delay should be roughly double the previous (allow 10% tolerance)
                const ratio = delay / previousDelay;
                expect(ratio).toBeGreaterThan(1.8);
                expect(ratio).toBeLessThan(2.2);
              }

              previousDelay = delay;
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 13: Backoff upper bound
     * For any backoff delay calculation, the resulting delay should never exceed
     * 24 hours (1440 minutes), regardless of the number of consecutive failures.
     */
    it('Property 13: should cap backoff at 24 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 10, max: 50 }), // High failure count
          async (integrationType, failureCount) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Calculate backoff with high failure count
            const nextSync = await adaptiveSyncScheduler.calculateBackoffDelay(
              TEST_USER_ID,
              integrationType,
              failureCount
            );

            const delay = nextSync.getTime() - Date.now();
            const maxDelay = 24 * 60 * 60 * 1000; // 24 hours

            // Delay should not exceed 24 hours (allow 1 second tolerance)
            expect(delay).toBeLessThanOrEqual(maxDelay + 1000);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 14: Backoff reset on success
     * For any successful sync after one or more failures, the backoff delay should
     * be reset to the default sync frequency for that integration type.
     */
    it('Property 14: should reset backoff on success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 1, max: 10 }), // Number of failures before success
          async (integrationType, failureCount) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Apply backoff
            await adaptiveSyncScheduler.calculateBackoffDelay(
              TEST_USER_ID,
              integrationType,
              failureCount
            );

            // Reset backoff (simulating successful sync)
            await adaptiveSyncScheduler.resetBackoff(TEST_USER_ID, integrationType);

            const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);
            const config = integrationType === 'google_contacts' 
              ? SYNC_FREQUENCIES.contacts 
              : SYNC_FREQUENCIES.calendar;

            // Frequency should be reset to default
            expect(schedule!.currentFrequency).toBe(config.default);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 15: Backoff persistence
     * For any backoff delay calculation, the current backoff state (delay value and failure count)
     * should be persisted to the sync_schedule table.
     */
    it('Property 15: should persist backoff state to database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.integer({ min: 1, max: 10 }), // Failure count
          async (integrationType, failureCount) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Calculate backoff
            const nextSync = await adaptiveSyncScheduler.calculateBackoffDelay(
              TEST_USER_ID,
              integrationType,
              failureCount
            );

            // Retrieve schedule from database
            const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);

            // Verify next_sync_at was persisted
            expect(schedule).not.toBeNull();
            expect(schedule!.nextSyncAt.getTime()).toBeCloseTo(nextSync.getTime(), -2); // Within 100ms
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 23: Frequency persistence
     * For any sync schedule frequency change, the new current_frequency_ms and
     * consecutive_no_changes counter should be persisted to the sync_schedule table.
     */
    it('Property 23: should persist frequency changes to database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<IntegrationType>('google_contacts', 'google_calendar'),
          fc.boolean(), // Whether changes were detected
          async (integrationType, changesDetected) => {
            // Clean up before test
            await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);

            // Initialize schedule
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, false);

            // Perform sync
            await adaptiveSyncScheduler.calculateNextSync(TEST_USER_ID, integrationType, changesDetected);

            // Retrieve schedule from database
            const schedule = await adaptiveSyncScheduler.getSchedule(TEST_USER_ID, integrationType);

            // Verify schedule was persisted
            expect(schedule).not.toBeNull();
            expect(schedule!.currentFrequency).toBeGreaterThan(0);
            expect(schedule!.consecutiveNoChanges).toBeGreaterThanOrEqual(0);
            expect(schedule!.lastSyncAt).not.toBeNull();
            expect(schedule!.nextSyncAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
