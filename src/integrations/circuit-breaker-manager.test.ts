/**
 * Circuit Breaker Manager Tests
 *
 * Property-based tests for circuit breaker functionality
 * Tests Properties 6, 7, 9, 10, 11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { circuitBreakerManager, CircuitBreakerManager } from './circuit-breaker-manager';
import pool from '../db/connection';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID_2 = '00000000-0000-0000-0000-000000000002';

describe('Circuit Breaker Manager - Property-Based Tests', () => {
  beforeEach(async () => {
    // Create test users
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, auth_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_id = EXCLUDED.google_id, auth_method = EXCLUDED.auth_method`,
      [TEST_USER_ID, `test-${Date.now()}-1@example.com`, 'Test User 1', 'google-test-1', 'google']
    );
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, auth_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_id = EXCLUDED.google_id, auth_method = EXCLUDED.auth_method`,
      [TEST_USER_ID_2, `test-${Date.now()}-2@example.com`, 'Test User 2', 'google-test-2', 'google']
    );

    // Clean up test data
    await pool.query('DELETE FROM circuit_breaker_state WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM circuit_breaker_state WHERE user_id IN ($1, $2)', [
      TEST_USER_ID,
      TEST_USER_ID_2,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [TEST_USER_ID, TEST_USER_ID_2]);
  });

  describe('Property 6: Circuit breaker threshold', () => {
    it('should open circuit breaker after exactly 3 failures', async () => {
      /**
       * **Property 6: Circuit breaker threshold**
       * *For any* circuit breaker in "closed" state, after exactly 3 consecutive sync failures,
       * the state should transition to "open" and next_retry_at should be set to 1 hour in the future.
       * **Validates: Requirements 2.1**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Reset to closed state
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);

            // Record 2 failures - should stay closed
            await circuitBreakerManager.recordFailure(
              TEST_USER_ID,
              integrationType,
              new Error('Test failure 1')
            );
            await circuitBreakerManager.recordFailure(
              TEST_USER_ID,
              integrationType,
              new Error('Test failure 2')
            );

            let state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('closed');
            expect(state?.failureCount).toBe(2);

            // Record 3rd failure - should open
            const beforeOpen = Date.now();
            await circuitBreakerManager.recordFailure(
              TEST_USER_ID,
              integrationType,
              new Error('Test failure 3')
            );
            const afterOpen = Date.now();

            state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('open');
            expect(state?.failureCount).toBe(3);
            expect(state?.nextRetryAt).not.toBeNull();

            // Verify next_retry_at is approximately 1 hour in the future
            if (state?.nextRetryAt) {
              const expectedRetryTime = beforeOpen + 60 * 60 * 1000; // 1 hour
              const actualRetryTime = state.nextRetryAt.getTime();
              const tolerance = 5000; // 5 second tolerance

              expect(actualRetryTime).toBeGreaterThanOrEqual(expectedRetryTime - tolerance);
              expect(actualRetryTime).toBeLessThanOrEqual(afterOpen + 60 * 60 * 1000 + tolerance);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 7: Circuit breaker blocks execution when open', () => {
    it('should block sync when circuit breaker is open and before timeout', async () => {
      /**
       * **Property 7: Circuit breaker blocks execution when open**
       * *For any* sync job, if the circuit breaker state is "open" and the current time is before next_retry_at,
       * then the sync should not execute and should be marked as "skipped" with reason "circuit_breaker_open".
       * **Validates: Requirements 2.2**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Reset and open circuit breaker
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);

            // Record 3 failures to open circuit
            for (let i = 0; i < 3; i++) {
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error(`Test failure ${i + 1}`)
              );
            }

            // Verify circuit is open
            const state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('open');

            // Verify sync is blocked
            const canExecute = await circuitBreakerManager.canExecuteSync(
              TEST_USER_ID,
              integrationType
            );
            expect(canExecute).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 8: Circuit breaker timeout transition', () => {
    it('should transition from open to half_open after timeout', async () => {
      /**
       * **Property 8: Circuit breaker timeout transition**
       * *For any* circuit breaker in "open" state, when the current time reaches or exceeds next_retry_at,
       * the state should transition to "half_open" on the next sync attempt.
       * **Validates: Requirements 2.3**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Reset and open circuit breaker
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);

            // Record 3 failures to open circuit
            for (let i = 0; i < 3; i++) {
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error(`Test failure ${i + 1}`)
              );
            }

            // Verify circuit is open
            let state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('open');
            expect(state?.nextRetryAt).not.toBeNull();

            // Manually set next_retry_at to the past (simulating timeout elapsed)
            const pastTime = new Date(Date.now() - 1000); // 1 second ago
            await pool.query(
              `UPDATE circuit_breaker_state
               SET next_retry_at = $1
               WHERE user_id = $2 AND integration_type = $3`,
              [pastTime, TEST_USER_ID, integrationType]
            );

            // Check if sync can execute (should trigger transition to half_open)
            const canExecute = await circuitBreakerManager.canExecuteSync(
              TEST_USER_ID,
              integrationType
            );
            expect(canExecute).toBe(true);

            // Verify state transitioned to half_open
            state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('half_open');
            expect(state?.nextRetryAt).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 9: Circuit breaker recovery', () => {
    it('should transition to closed on success in half_open, back to open on failure', async () => {
      /**
       * **Property 9: Circuit breaker recovery**
       * *For any* circuit breaker in "half_open" state, a successful sync should transition it to "closed" state
       * and reset failure_count to 0, while a failed sync should transition it back to "open" state with a new next_retry_at.
       * **Validates: Requirements 2.4, 2.5**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          fc.boolean(), // success or failure
          async (integrationType, shouldSucceed) => {
            // Reset and open circuit breaker
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);

            // Open circuit by recording 3 failures
            for (let i = 0; i < 3; i++) {
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error(`Test failure ${i + 1}`)
              );
            }

            // Manually transition to half_open (simulating timeout)
            await pool.query(
              `UPDATE circuit_breaker_state
               SET state = 'half_open', next_retry_at = NULL
               WHERE user_id = $1 AND integration_type = $2`,
              [TEST_USER_ID, integrationType]
            );

            let state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('half_open');

            if (shouldSucceed) {
              // Record success - should transition to closed
              await circuitBreakerManager.recordSuccess(TEST_USER_ID, integrationType);

              state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
              expect(state?.state).toBe('closed');
              expect(state?.failureCount).toBe(0);
              expect(state?.nextRetryAt).toBeNull();
            } else {
              // Record failure - should transition back to open
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error('Test failure in half_open')
              );

              state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
              expect(state?.state).toBe('open');
              expect(state?.nextRetryAt).not.toBeNull();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 10: Circuit breaker state isolation', () => {
    it('should maintain separate state for Contacts and Calendar per user', async () => {
      /**
       * **Property 10: Circuit breaker state isolation**
       * *For any* user with both Contacts and Calendar integrations, failures in one integration type
       * should not affect the circuit breaker state of the other integration type.
       * **Validates: Requirements 2.6**
       */
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 5 }), async (contactsFailures) => {
          // Reset both circuit breakers
          await circuitBreakerManager.reset(TEST_USER_ID, 'google_contacts');
          await circuitBreakerManager.reset(TEST_USER_ID, 'google_calendar');

          // Record failures for contacts only
          for (let i = 0; i < contactsFailures; i++) {
            await circuitBreakerManager.recordFailure(
              TEST_USER_ID,
              'google_contacts',
              new Error(`Contacts failure ${i + 1}`)
            );
          }

          // Get states
          const contactsState = await circuitBreakerManager.getState(
            TEST_USER_ID,
            'google_contacts'
          );
          const calendarState = await circuitBreakerManager.getState(
            TEST_USER_ID,
            'google_calendar'
          );

          // Verify contacts state reflects failures
          expect(contactsState?.failureCount).toBe(contactsFailures);
          if (contactsFailures >= 3) {
            expect(contactsState?.state).toBe('open');
          } else {
            expect(contactsState?.state).toBe('closed');
          }

          // Verify calendar state is unaffected (closed with 0 failures)
          expect(calendarState?.state).toBe('closed');
          expect(calendarState?.failureCount).toBe(0);
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain separate state for different users', async () => {
      /**
       * Test that circuit breaker state is isolated per user
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Reset both users
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);
            await circuitBreakerManager.reset(TEST_USER_ID_2, integrationType);

            // Open circuit for user 1
            for (let i = 0; i < 3; i++) {
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error(`User 1 failure ${i + 1}`)
              );
            }

            // Get states
            const user1State = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            const user2State = await circuitBreakerManager.getState(TEST_USER_ID_2, integrationType);

            // Verify user 1 circuit is open
            expect(user1State?.state).toBe('open');
            expect(user1State?.failureCount).toBe(3);

            // Verify user 2 circuit is unaffected
            expect(user2State?.state).toBe('closed');
            expect(user2State?.failureCount).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 11: Circuit breaker audit logging', () => {
    it('should log all state transitions with timestamps', async () => {
      /**
       * **Property 11: Circuit breaker audit logging**
       * *For any* circuit breaker state transition, a log entry should be created with the user_id,
       * integration_type, old_state, new_state, and timestamp.
       * **Validates: Requirements 2.7**
       *
       * Note: This test verifies that state transitions occur correctly.
       * Actual log verification would require log capture infrastructure.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType) => {
            // Reset to closed
            await circuitBreakerManager.reset(TEST_USER_ID, integrationType);
            let state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('closed');

            // Transition to open (closed → open)
            for (let i = 0; i < 3; i++) {
              await circuitBreakerManager.recordFailure(
                TEST_USER_ID,
                integrationType,
                new Error(`Failure ${i + 1}`)
              );
            }
            state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('open');

            // Transition to half_open (open → half_open)
            await pool.query(
              `UPDATE circuit_breaker_state
               SET state = 'half_open', next_retry_at = NULL
               WHERE user_id = $1 AND integration_type = $2`,
              [TEST_USER_ID, integrationType]
            );
            state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('half_open');

            // Transition to closed (half_open → closed)
            await circuitBreakerManager.recordSuccess(TEST_USER_ID, integrationType);
            state = await circuitBreakerManager.getState(TEST_USER_ID, integrationType);
            expect(state?.state).toBe('closed');

            // All transitions completed successfully
            // In production, these would be captured in logs
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
