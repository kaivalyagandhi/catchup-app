import { describe, it, expect } from 'vitest';
import { fc, PBT_CONFIG, runPropertyTest } from './test-helpers';

describe('Test Setup Verification', () => {
  it('should run unit tests correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should run property-based tests with fast-check', () => {
    // Simple property: reversing a string twice returns the original
    runPropertyTest(
      fc.property(fc.string(), (str) => {
        const reversed = str.split('').reverse().join('');
        const doubleReversed = reversed.split('').reverse().join('');
        return doubleReversed === str;
      }),
      PBT_CONFIG
    );
  });

  it('should verify PBT_CONFIG has minimum 100 iterations', () => {
    expect(PBT_CONFIG.numRuns).toBeGreaterThanOrEqual(100);
  });
});
