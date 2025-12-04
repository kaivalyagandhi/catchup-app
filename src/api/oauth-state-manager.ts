import crypto from 'crypto';

/**
 * OAuth State Manager
 * 
 * Manages OAuth state tokens for CSRF protection during the OAuth flow.
 * States are stored in-memory with expiration and automatic cleanup.
 */

interface OAuthState {
  state: string;
  created_at: Date;
  expires_at: Date;
}

export class OAuthStateManager {
  private states: Map<string, OAuthState>;
  private readonly STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.states = new Map();
    this.startCleanup();
  }

  /**
   * Generate a new cryptographically secure state token
   * @returns The generated state token
   */
  generateState(): string {
    const state = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.STATE_EXPIRATION_MS);

    this.states.set(state, {
      state,
      created_at: now,
      expires_at: expiresAt,
    });

    return state;
  }

  /**
   * Validate a state token and remove it if valid (one-time use)
   * @param state The state token to validate
   * @returns True if the state is valid and not expired, false otherwise
   */
  validateState(state: string): boolean {
    const storedState = this.states.get(state);

    if (!storedState) {
      return false;
    }

    const now = new Date();
    if (now > storedState.expires_at) {
      // State has expired
      this.states.delete(state);
      return false;
    }

    // Valid state - remove it (one-time use for CSRF protection)
    this.states.delete(state);
    return true;
  }

  /**
   * Check if a state exists without consuming it
   * @param state The state token to check
   * @returns True if the state exists and is not expired
   */
  hasState(state: string): boolean {
    const storedState = this.states.get(state);

    if (!storedState) {
      return false;
    }

    const now = new Date();
    if (now > storedState.expires_at) {
      this.states.delete(state);
      return false;
    }

    return true;
  }

  /**
   * Remove expired states from storage
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    const expiredStates: string[] = [];

    for (const [state, data] of this.states.entries()) {
      if (now > data.expires_at) {
        expiredStates.push(state);
      }
    }

    for (const state of expiredStates) {
      this.states.delete(state);
    }

    if (expiredStates.length > 0) {
      console.log(`[OAuthStateManager] Cleaned up ${expiredStates.length} expired state(s)`);
    }
  }

  /**
   * Start automatic cleanup of expired states
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredStates();
    }, this.CLEANUP_INTERVAL_MS);

    // Ensure cleanup timer doesn't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup (useful for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get the number of active states (useful for monitoring)
   */
  getActiveStateCount(): number {
    return this.states.size;
  }

  /**
   * Clear all states (useful for testing)
   */
  clearAll(): void {
    this.states.clear();
  }

  /**
   * Cleanup resources on shutdown
   */
  destroy(): void {
    this.stopCleanup();
    this.clearAll();
  }
}

// Singleton instance
let instance: OAuthStateManager | null = null;

/**
 * Get the singleton instance of OAuthStateManager
 */
export function getOAuthStateManager(): OAuthStateManager {
  if (!instance) {
    instance = new OAuthStateManager();
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetOAuthStateManager(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
