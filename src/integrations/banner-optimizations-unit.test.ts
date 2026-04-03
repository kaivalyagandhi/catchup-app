/**
 * Banner Optimizations Unit Tests
 * 
 * Feature: 034-ui-banner-optimizations
 * 
 * Unit tests for z-index values, OAuth URL params, missing refresh token warning,
 * health endpoint triggers refresh, and default position when hidden.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calculateHeaderOffset } from './banner-offset';

describe('034-ui-banner-optimizations Unit Tests', () => {
  describe('Z-index values (Req 1.2)', () => {
    it('should have banner z-index (900) lower than header controls z-index (1000)', () => {
      const bannerCss = fs.readFileSync(
        path.resolve(__dirname, '../../public/css/sync-warning-banner.css'),
        'utf-8'
      );
      const appShellCss = fs.readFileSync(
        path.resolve(__dirname, '../../public/css/app-shell.css'),
        'utf-8'
      );

      // Extract banner z-index
      const bannerZIndexMatch = bannerCss.match(/\.sync-warning-banner\s*\{[^}]*z-index:\s*(\d+)/);
      expect(bannerZIndexMatch).not.toBeNull();
      const bannerZIndex = parseInt(bannerZIndexMatch![1], 10);

      // Extract header controls z-index from the combined rule
      const headerZIndexMatch = appShellCss.match(
        /\.theme-toggle,\s*\n?\s*#notification-bell-fixed\s*\{[^}]*z-index:\s*(\d+)/
      );
      expect(headerZIndexMatch).not.toBeNull();
      const headerZIndex = parseInt(headerZIndexMatch![1], 10);

      expect(bannerZIndex).toBe(900);
      expect(headerZIndex).toBe(1000);
      expect(bannerZIndex).toBeLessThan(headerZIndex);
    });

    it('should not use !important on header control z-index', () => {
      const appShellCss = fs.readFileSync(
        path.resolve(__dirname, '../../public/css/app-shell.css'),
        'utf-8'
      );

      // Find the combined z-index rule for header controls
      const headerZIndexSection = appShellCss.match(
        /\/\* Ensure buttons are above the sync warning banner \*\/\s*\n\s*\.theme-toggle,\s*\n\s*#notification-bell-fixed\s*\{[^}]*\}/
      );
      expect(headerZIndexSection).not.toBeNull();
      // Should not contain !important in the z-index line
      expect(headerZIndexSection![0]).not.toContain('!important');
    });
  });

  describe('OAuth URL params (Req 4.1, 4.2)', () => {
    it('should include access_type=offline and prompt=consent in authorization URL config', () => {
      const configSource = fs.readFileSync(
        path.resolve(__dirname, './google-contacts-config.ts'),
        'utf-8'
      );

      // Verify access_type: 'offline' is present in generateAuthUrl call
      expect(configSource).toContain("access_type: 'offline'");
      // Verify prompt: 'consent' is present
      expect(configSource).toContain("prompt: 'consent'");
    });
  });

  describe('Missing refresh token warning (Req 4.4)', () => {
    it('should have warning log code for missing refresh_token in handleCallback', () => {
      const oauthServiceSource = fs.readFileSync(
        path.resolve(__dirname, './google-contacts-oauth-service.ts'),
        'utf-8'
      );

      // Verify the warning log exists for missing refresh_token
      expect(oauthServiceSource).toContain('did not include a refresh_token');
      expect(oauthServiceSource).toContain('if (!credentials.refresh_token)');
      // Verify notification creation is called
      expect(oauthServiceSource).toContain("createNotification(userId, 'google_contacts', 'token_invalid')");
    });
  });

  describe('Health endpoint triggers refresh (Req 6.1)', () => {
    it('should call checkTokenHealth before getComprehensiveSyncHealth in comprehensive-health route', () => {
      const routeSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/api/routes/google-contacts-sync.ts'),
        'utf-8'
      );

      // Verify checkTokenHealth calls exist
      expect(routeSource).toContain("tokenHealthMonitor.checkTokenHealth(req.userId, 'google_contacts')");
      expect(routeSource).toContain("tokenHealthMonitor.checkTokenHealth(req.userId, 'google_calendar')");

      // Verify they're wrapped in try/catch
      expect(routeSource).toContain('Token refresh attempt failed, returning pre-refresh status');

      // Verify checkTokenHealth appears before getComprehensiveSyncHealth
      const checkIndex = routeSource.indexOf('checkTokenHealth');
      const healthIndex = routeSource.indexOf('getComprehensiveSyncHealth');
      expect(checkIndex).toBeLessThan(healthIndex);
    });
  });

  describe('Default position when hidden (Req 1.4)', () => {
    it('should set header controls to top: 20px when banner is hidden', () => {
      // When banner is hidden (not visible)
      expect(calculateHeaderOffset(false, 0)).toBe(20);
      expect(calculateHeaderOffset(false, 50)).toBe(20);
      expect(calculateHeaderOffset(false, 100)).toBe(20);
    });
  });

  describe('10-minute refresh window (Req 2.1)', () => {
    it('should use 10-minute window in getAccessToken', () => {
      const oauthServiceSource = fs.readFileSync(
        path.resolve(__dirname, './google-contacts-oauth-service.ts'),
        'utf-8'
      );

      // Verify 10-minute window
      expect(oauthServiceSource).toContain('10 * 60 * 1000');
      expect(oauthServiceSource).toContain('within 10 minutes');
      // Verify old 5-minute window is gone
      expect(oauthServiceSource).not.toContain('within 5 minutes');
    });
  });

  describe('Error classification in refreshExpiringTokens (Req 5.1-5.5)', () => {
    it('should use classifyRefreshError in refreshExpiringTokens', () => {
      const monitorSource = fs.readFileSync(
        path.resolve(__dirname, './token-health-monitor.ts'),
        'utf-8'
      );

      // Verify classifyRefreshError is called in the catch block
      expect(monitorSource).toContain('this.classifyRefreshError(error)');
      // Verify non-recoverable handling
      expect(monitorSource).toContain("classification === 'non-recoverable'");
      // Verify transient handling with consecutive_failures
      expect(monitorSource).toContain('consecutive_failures');
      // Verify 3-strike escalation
      expect(monitorSource).toContain('newFailures >= 3');
    });
  });

  describe('Banner gated on revoked status (Req 3.1-3.3)', () => {
    it('should only treat revoked as invalid_token in checkSyncAvailability', () => {
      const degradationSource = fs.readFileSync(
        path.resolve(__dirname, './graceful-degradation-service.ts'),
        'utf-8'
      );

      // Verify only revoked triggers invalid_token
      expect(degradationSource).toContain("tokenHealth.status === 'revoked'");
      // Verify expired is NOT treated as invalid_token
      expect(degradationSource).not.toContain("['expired', 'revoked']");
    });
  });
});
