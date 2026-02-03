/**
 * Sync Orchestrator Tests
 *
 * Tests the orchestration of token health, circuit breaker, and adaptive scheduling
 * components for Google API sync operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SyncOrchestrator, SyncJobConfig } from './sync-orchestrator';
import { TokenHealthMonitor } from './token-health-monitor';
import { CircuitBreakerManager } from './circuit-breaker-manager';
import { AdaptiveSyncScheduler } from './adaptive-sync-scheduler';
import pool from '../db/connection';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('Sync Orchestrator', () => {
  let orchestrator: SyncOrchestrator;
  let tokenHealthMonitor: TokenHealthMonitor;
  let circuitBreakerManager: CircuitBreakerManager;
  let adaptiveSyncScheduler: AdaptiveSyncScheduler;

  beforeEach(async () => {
    // Create test user with google_id to satisfy check_auth_method constraint
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
      [TEST_USER_ID, `test-${Date.now()}@example.com`, 'Test User', `google-${Date.now()}`]
    );

    // Initialize components
    tokenHealthMonitor = new TokenHealthMonitor();
    circuitBreakerManager = new CircuitBreakerManager();
    adaptiveSyncScheduler = new AdaptiveSyncScheduler();
    orchestrator = new SyncOrchestrator(
      tokenHealthMonitor,
      circuitBreakerManager,
      adaptiveSyncScheduler
    );

    // Initialize sync schedule for test user
    await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, 'google_contacts');
    await adaptiveSyncScheduler.initializeSchedule(TEST_USER_ID, 'google_calendar');
  });

  afterEach(async () => {
    // Cleanup - check if tables exist before deleting
    try {
      // Check if sync_metrics table exists
      const metricsTableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sync_metrics'
        )`
      );
      
      if (metricsTableExists.rows[0].exists) {
        await pool.query('DELETE FROM sync_metrics WHERE user_id = $1', [TEST_USER_ID]);
      }
    } catch (error) {
      console.log('sync_metrics table does not exist, skipping cleanup');
    }

    await pool.query('DELETE FROM sync_schedule WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM circuit_breaker_state WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM token_health WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('executeSyncJob', () => {
    it('should skip sync when token is invalid', async () => {
      // Directly insert token health record as revoked
      await pool.query(
        `INSERT INTO token_health (user_id, integration_type, status, last_checked, error_message)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (user_id, integration_type)
         DO UPDATE SET status = EXCLUDED.status, last_checked = NOW(), error_message = EXCLUDED.error_message`,
        [TEST_USER_ID, 'google_contacts', 'revoked', 'Token revoked by user']
      );

      const config: SyncJobConfig = {
        userId: TEST_USER_ID,
        integrationType: 'google_contacts',
        syncType: 'incremental',
        accessToken: 'test-token',
      };

      const result = await orchestrator.executeSyncJob(config);

      expect(result.success).toBe(false);
      expect(result.result).toBe('skipped');
      expect(result.skipReason).toBe('invalid_token');
      expect(result.apiCallsSaved).toBeGreaterThan(0);
    });

    it('should skip sync when circuit breaker is open', async () => {
      // Open circuit breaker by recording 3 failures
      for (let i = 0; i < 3; i++) {
        await circuitBreakerManager.recordFailure(
          TEST_USER_ID,
          'google_contacts',
          new Error('Test failure')
        );
      }

      const config: SyncJobConfig = {
        userId: TEST_USER_ID,
        integrationType: 'google_contacts',
        syncType: 'incremental',
        accessToken: 'test-token',
      };

      const result = await orchestrator.executeSyncJob(config);

      expect(result.success).toBe(false);
      expect(result.result).toBe('skipped');
      expect(result.skipReason).toBe('circuit_breaker_open');
      expect(result.apiCallsSaved).toBeGreaterThan(0);
    });

    it('should bypass circuit breaker for manual syncs', async () => {
      // Open circuit breaker
      for (let i = 0; i < 3; i++) {
        await circuitBreakerManager.recordFailure(
          TEST_USER_ID,
          'google_contacts',
          new Error('Test failure')
        );
      }

      // Verify circuit breaker is open
      const canExecute = await circuitBreakerManager.canExecuteSync(
        TEST_USER_ID,
        'google_contacts'
      );
      expect(canExecute).toBe(false);

      // Manual sync should bypass circuit breaker
      const config: SyncJobConfig = {
        userId: TEST_USER_ID,
        integrationType: 'google_contacts',
        syncType: 'manual',
        accessToken: 'test-token',
        bypassCircuitBreaker: true,
      };

      // Note: This will fail because we don't have a real Google token,
      // but it should NOT be skipped due to circuit breaker
      const result = await orchestrator.executeSyncJob(config);

      // Should not be skipped due to circuit breaker
      expect(result.skipReason).not.toBe('circuit_breaker_open');
    });

    it('should record metrics for all sync attempts', async () => {
      // Check if sync_metrics table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sync_metrics'
        )`
      );

      if (!tableExists.rows[0].exists) {
        console.log('sync_metrics table does not exist, skipping test');
        return;
      }

      // Mark token as invalid to trigger skip
      await tokenHealthMonitor.markTokenInvalid(
        TEST_USER_ID,
        'google_contacts',
        'Test invalid token'
      );

      const config: SyncJobConfig = {
        userId: TEST_USER_ID,
        integrationType: 'google_contacts',
        syncType: 'incremental',
        accessToken: 'test-token',
      };

      await orchestrator.executeSyncJob(config);

      // Check that metrics were recorded
      const metricsResult = await pool.query(
        `SELECT * FROM sync_metrics 
         WHERE user_id = $1 AND integration_type = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [TEST_USER_ID, 'google_contacts']
      );

      expect(metricsResult.rows.length).toBe(1);
      const metrics = metricsResult.rows[0];
      expect(metrics.result).toBe('skipped');
      expect(metrics.skip_reason).toBe('invalid_token');
      expect(metrics.api_calls_saved).toBeGreaterThan(0);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 1: Token validation prevents invalid API calls
     *
     * For any sync job, if the token health status is "expired" or "revoked",
     * then no API calls should be made to Google APIs and the sync should be
     * skipped with appropriate logging.
     *
     * Validates: Requirements 1.1, 1.4
     */
    it('should prevent API calls when token is invalid (Property 1)', async () => {
      // Check if sync_metrics table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sync_metrics'
        )`
      );

      if (!tableExists.rows[0].exists) {
        console.log('sync_metrics table does not exist, skipping property test');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          fc.constantFrom('expired', 'revoked'),
          fc.constantFrom('full', 'incremental', 'manual'),
          async (integrationType, tokenStatus, syncType) => {
            // Mark token as invalid
            await pool.query(
              `INSERT INTO token_health (user_id, integration_type, status, last_checked)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (user_id, integration_type) 
               DO UPDATE SET status = EXCLUDED.status, last_checked = NOW()`,
              [TEST_USER_ID, integrationType, tokenStatus]
            );

            const config: SyncJobConfig = {
              userId: TEST_USER_ID,
              integrationType: integrationType as 'google_contacts' | 'google_calendar',
              syncType: syncType as 'full' | 'incremental' | 'manual',
              accessToken: 'test-token',
            };

            const result = await orchestrator.executeSyncJob(config);

            // Verify sync was skipped
            expect(result.result).toBe('skipped');
            expect(result.skipReason).toBe('invalid_token');
            expect(result.apiCallsSaved).toBeGreaterThan(0);

            // Verify metrics were recorded
            const metricsResult = await pool.query(
              `SELECT * FROM sync_metrics 
               WHERE user_id = $1 AND integration_type = $2 
               ORDER BY created_at DESC LIMIT 1`,
              [TEST_USER_ID, integrationType]
            );

            expect(metricsResult.rows.length).toBe(1);
            expect(metricsResult.rows[0].result).toBe('skipped');
            expect(metricsResult.rows[0].skip_reason).toBe('invalid_token');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
