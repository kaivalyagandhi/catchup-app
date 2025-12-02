import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OAuthStateManager, resetOAuthStateManager } from './oauth-state-manager';

describe('OAuthStateManager', () => {
  let manager: OAuthStateManager;

  beforeEach(() => {
    resetOAuthStateManager();
    manager = new OAuthStateManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('generateState', () => {
    it('should generate a unique state token', () => {
      const state1 = manager.generateState();
      const state2 = manager.generateState();

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
      expect(state1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate cryptographically secure random tokens', () => {
      const states = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        states.add(manager.generateState());
      }

      // All states should be unique
      expect(states.size).toBe(iterations);
    });

    it('should store the generated state', () => {
      const state = manager.generateState();
      expect(manager.hasState(state)).toBe(true);
    });
  });

  describe('validateState', () => {
    it('should validate a valid state token', () => {
      const state = manager.generateState();
      expect(manager.validateState(state)).toBe(true);
    });

    it('should return false for non-existent state', () => {
      expect(manager.validateState('non-existent-state')).toBe(false);
    });

    it('should consume the state token on validation (one-time use)', () => {
      const state = manager.generateState();
      
      // First validation should succeed
      expect(manager.validateState(state)).toBe(true);
      
      // Second validation should fail (state was consumed)
      expect(manager.validateState(state)).toBe(false);
    });

    it('should return false for expired state', async () => {
      // Create a manager with very short expiration for testing
      const shortExpirationManager = new OAuthStateManager();
      
      // Override the expiration time for testing
      (shortExpirationManager as any).STATE_EXPIRATION_MS = 100; // 100ms
      
      const state = shortExpirationManager.generateState();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortExpirationManager.validateState(state)).toBe(false);
      
      shortExpirationManager.destroy();
    });
  });

  describe('hasState', () => {
    it('should return true for existing state', () => {
      const state = manager.generateState();
      expect(manager.hasState(state)).toBe(true);
    });

    it('should return false for non-existent state', () => {
      expect(manager.hasState('non-existent-state')).toBe(false);
    });

    it('should not consume the state token', () => {
      const state = manager.generateState();
      
      // Check state multiple times
      expect(manager.hasState(state)).toBe(true);
      expect(manager.hasState(state)).toBe(true);
      
      // State should still be valid
      expect(manager.validateState(state)).toBe(true);
    });

    it('should return false for expired state', async () => {
      const shortExpirationManager = new OAuthStateManager();
      (shortExpirationManager as any).STATE_EXPIRATION_MS = 100;
      
      const state = shortExpirationManager.generateState();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortExpirationManager.hasState(state)).toBe(false);
      
      shortExpirationManager.destroy();
    });
  });

  describe('cleanup', () => {
    it('should automatically clean up expired states', async () => {
      const shortCleanupManager = new OAuthStateManager();
      
      // Stop the default cleanup and set new intervals
      shortCleanupManager.stopCleanup();
      (shortCleanupManager as any).STATE_EXPIRATION_MS = 100;
      (shortCleanupManager as any).CLEANUP_INTERVAL_MS = 200;
      
      // Generate some states
      shortCleanupManager.generateState();
      shortCleanupManager.generateState();
      
      expect(shortCleanupManager.getActiveStateCount()).toBe(2);
      
      // Restart cleanup with new interval
      (shortCleanupManager as any).startCleanup();
      
      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(shortCleanupManager.getActiveStateCount()).toBe(0);
      
      shortCleanupManager.destroy();
    });

    it('should stop cleanup when stopCleanup is called', () => {
      manager.stopCleanup();
      expect((manager as any).cleanupTimer).toBeNull();
    });
  });

  describe('getActiveStateCount', () => {
    it('should return the number of active states', () => {
      expect(manager.getActiveStateCount()).toBe(0);
      
      manager.generateState();
      expect(manager.getActiveStateCount()).toBe(1);
      
      manager.generateState();
      expect(manager.getActiveStateCount()).toBe(2);
    });

    it('should decrease count when states are validated', () => {
      const state = manager.generateState();
      expect(manager.getActiveStateCount()).toBe(1);
      
      manager.validateState(state);
      expect(manager.getActiveStateCount()).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should remove all states', () => {
      manager.generateState();
      manager.generateState();
      manager.generateState();
      
      expect(manager.getActiveStateCount()).toBe(3);
      
      manager.clearAll();
      
      expect(manager.getActiveStateCount()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should stop cleanup and clear all states', () => {
      manager.generateState();
      manager.generateState();
      
      expect(manager.getActiveStateCount()).toBe(2);
      
      manager.destroy();
      
      expect(manager.getActiveStateCount()).toBe(0);
      expect((manager as any).cleanupTimer).toBeNull();
    });
  });

  describe('CSRF protection', () => {
    it('should prevent state reuse attacks', () => {
      const state = manager.generateState();
      
      // Attacker tries to reuse the state
      expect(manager.validateState(state)).toBe(true);
      expect(manager.validateState(state)).toBe(false);
    });

    it('should prevent timing attacks with expired states', async () => {
      const shortExpirationManager = new OAuthStateManager();
      (shortExpirationManager as any).STATE_EXPIRATION_MS = 100;
      
      const state = shortExpirationManager.generateState();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Both should return false, no timing difference
      const start1 = Date.now();
      const result1 = shortExpirationManager.validateState(state);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      const result2 = shortExpirationManager.validateState('non-existent');
      const time2 = Date.now() - start2;
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      
      // Timing should be similar (within 10ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
      
      shortExpirationManager.destroy();
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent state generation', () => {
      const states = new Set<string>();
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            const state = manager.generateState();
            states.add(state);
            resolve();
          })
        );
      }
      
      return Promise.all(promises).then(() => {
        expect(states.size).toBe(50);
      });
    });

    it('should handle concurrent validation', () => {
      const state = manager.generateState();
      const results: boolean[] = [];
      
      // Try to validate the same state concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            const result = manager.validateState(state);
            results.push(result);
            resolve();
          })
        );
      }
      
      return Promise.all(promises).then(() => {
        // Only one validation should succeed
        const successCount = results.filter(r => r === true).length;
        expect(successCount).toBe(1);
      });
    });
  });
});
