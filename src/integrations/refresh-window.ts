/**
 * Refresh Window Logic
 * 
 * Pure function extracted from GoogleContactsOAuthService.getAccessToken()
 * for testability. Determines if a token needs refresh based on expiry time.
 * 
 * Feature: 034-ui-banner-optimizations
 */

/**
 * Determine if a token should be refreshed based on its expiry time.
 * Returns true if the token expires within 10 minutes of the given current time.
 */
export function shouldRefreshToken(expiresAt: Date | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  return expiresAt < tenMinutesFromNow;
}
