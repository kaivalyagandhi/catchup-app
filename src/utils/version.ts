/**
 * Version Utility
 *
 * Provides centralized access to application version information.
 * Version is set at build time via Docker ARG and passed as ENV variable.
 *
 * Format:
 * - Production: YYYY.MM.DD.BUILD (e.g., 2025.12.04.a1b2c3d4)
 * - Development: dev-YYYY.MM.DD-COMMIT (e.g., dev-2025.12.04-f1e2d3c4)
 * - Local: dev-local (fallback)
 */

interface VersionInfo {
  version: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isLocal: boolean;
  timestamp: string;
}

/**
 * Get the application version from environment variable
 * @returns The application version string
 */
export function getVersion(): string {
  return process.env.APP_VERSION || 'dev-local';
}

/**
 * Check if running in production (tagged with "prod")
 * @returns True if production build
 */
export function isProductionVersion(): boolean {
  const version = getVersion();
  // Production versions match pattern: YYYY.MM.DD.BUILD
  return /^\d{4}\.\d{2}\.\d{2}\.[a-f0-9]{8}$/.test(version);
}

/**
 * Check if running in development
 * @returns True if development build
 */
export function isDevelopmentVersion(): boolean {
  const version = getVersion();
  return version.startsWith('dev-');
}

/**
 * Check if running locally (not from CI/CD)
 * @returns True if local development
 */
export function isLocalVersion(): boolean {
  return getVersion() === 'dev-local';
}

/**
 * Get detailed version information
 * @returns Complete version information object
 */
export function getVersionInfo(): VersionInfo {
  const version = getVersion();

  return {
    version,
    isProduction: isProductionVersion(),
    isDevelopment: isDevelopmentVersion(),
    isLocal: isLocalVersion(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format version for display
 * @returns Human-readable version string
 */
export function getDisplayVersion(): string {
  const version = getVersion();

  if (isProductionVersion()) {
    return `v${version}`;
  }

  if (isLocalVersion()) {
    return 'Development (Local)';
  }

  // Development builds: dev-YYYY.MM.DD-COMMIT
  return `Development ${version}`;
}
