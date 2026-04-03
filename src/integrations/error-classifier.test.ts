/**
 * Error Classifier Tests
 * 
 * Feature: 034-ui-banner-optimizations, Property 9: Error classifier correctness
 * 
 * Tests that the error classifier correctly maps HTTP errors to non-recoverable or transient.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TokenHealthMonitor } from './token-health-monitor';

const monitor = TokenHealthMonitor.getInstance();

describe('Error Classifier', () => {
  /**
   * Feature: 034-ui-banner-optimizations, Property 9: Error classifier correctness
   * 
   * For any error response from Google's token endpoint, the error classifier should map:
   * - HTTP 400 with invalid_grant → non-recoverable
   * - HTTP 401 → non-recoverable
   * - HTTP 5xx → transient
   * - Network timeouts → transient
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3**
   */
  it('P9: should correctly classify HTTP errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Non-recoverable: 400 with invalid_grant
          fc.constant({ type: 'invalid_grant_400', expected: 'non-recoverable' as const }),
          // Non-recoverable: 401
          fc.constant({ type: '401', expected: 'non-recoverable' as const }),
          // Transient: 5xx
          fc.integer({ min: 500, max: 599 }).map(status => ({
            type: `5xx_${status}`,
            expected: 'transient' as const,
            status,
          })),
          // Transient: network errors
          fc.constantFrom('ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'ECONNRESET').map(code => ({
            type: `network_${code}`,
            expected: 'transient' as const,
            code,
          }))
        ),
        (testCase) => {
          let error: any;

          if (testCase.type === 'invalid_grant_400') {
            error = { response: { status: 400, data: { error: 'invalid_grant' } }, message: 'Request failed' };
          } else if (testCase.type === '401') {
            error = { response: { status: 401 }, message: 'Unauthorized' };
          } else if (testCase.type.startsWith('5xx_')) {
            const status = (testCase as any).status;
            error = { response: { status }, message: `Server error ${status}` };
          } else if (testCase.type.startsWith('network_')) {
            const code = (testCase as any).code;
            error = { code, message: `Network error: ${code}` };
          }

          const result = monitor.classifyRefreshError(error);
          expect(result).toBe(testCase.expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify timeout message errors as transient', () => {
    const error = new Error('Request timeout after 30000ms');
    expect(monitor.classifyRefreshError(error)).toBe('transient');
  });

  it('should classify invalid_grant in message as non-recoverable', () => {
    const error = new Error('Failed to refresh: invalid_grant');
    expect(monitor.classifyRefreshError(error)).toBe('non-recoverable');
  });

  it('should classify unknown errors as non-recoverable', () => {
    expect(monitor.classifyRefreshError('some string error')).toBe('non-recoverable');
    expect(monitor.classifyRefreshError(null)).toBe('non-recoverable');
    expect(monitor.classifyRefreshError(undefined)).toBe('non-recoverable');
  });
});
