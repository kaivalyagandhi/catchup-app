import * as fc from 'fast-check';

/**
 * Default configuration for property-based tests
 * Ensures minimum 100 iterations as per design requirements
 */
export const PBT_CONFIG = {
  numRuns: 100,
  verbose: false,
};

/**
 * Extended configuration for more thorough testing
 */
export const PBT_CONFIG_EXTENDED = {
  numRuns: 1000,
  verbose: false,
};

/**
 * Helper function to run property-based tests with default configuration
 */
export function runPropertyTest<T>(
  property: fc.IProperty<T>,
  config: fc.Parameters<T> = PBT_CONFIG
): void {
  fc.assert(property, config);
}

export { fc };
