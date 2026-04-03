/**
 * Banner Display Logic
 * 
 * Pure function extracted from SyncWarningBanner.checkSyncHealth()
 * for testability. Determines if the reconnection banner should be shown.
 * 
 * Feature: 034-ui-banner-optimizations
 */

export type TokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'revoked';

export interface IntegrationHealth {
  available: boolean;
  requiresReauth: boolean;
  tokenStatus?: TokenStatus;
}

/**
 * Determine if the reconnection banner should be shown based on health data.
 * Returns true only when tokenStatus is 'revoked'.
 * For 'expired' and 'expiring_soon', the background refresh handles recovery.
 */
export function shouldShowReconnectionBanner(
  contactsHealth: IntegrationHealth,
  calendarHealth: IntegrationHealth
): boolean {
  return contactsHealth.tokenStatus === 'revoked' || calendarHealth.tokenStatus === 'revoked';
}
