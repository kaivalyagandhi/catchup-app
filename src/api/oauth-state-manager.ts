import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * OAuth State Manager
 *
 * Manages OAuth state tokens for CSRF protection during the OAuth flow.
 * Uses JWT-based stateless tokens that work across serverless instances.
 * Falls back to in-memory storage for local development.
 */

interface OAuthState {
  state: string;
  created_at: Date;
  expires_at: Date;
}

interface JWTStatePayload {
  nonce: string;
  iat: number;
  exp: number;
}

export class OAuthStateManager {
  private states: Map<string, OAuthState>;
  private usedStates: Set<string>; // Track used states to prevent replay
  private readonly STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly jwtSecret: string;
  private readonly useStatelessMode: boolean;

  constructor() {
    this.states = new Map();
    this.usedStates = new Set();
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    // Use stateless mode in production (Cloud Run) or when explicitly enabled
    this.useStatelessMode =
      process.env.NODE_ENV === 'production' || process.env.STATELESS_OAUTH === 'true';

    if (!this.useStatelessMode) {
      this.startCleanup();
    }

    console.log(
      `[OAuthStateManager] Initialized in ${this.useStatelessMode ? 'stateless (JWT)' : 'stateful (in-memory)'} mode`
    );
  }

  /**
   * Generate a new cryptographically secure state token
   * @returns The generated state token
   */
  generateState(): string {
    if (this.useStatelessMode) {
      // Generate a JWT-based state token that's self-validating
      const nonce = crypto.randomBytes(16).toString('hex');
      const token = jwt.sign({ nonce } as JWTStatePayload, this.jwtSecret, { expiresIn: '10m' });
      return token;
    }

    // Fallback to in-memory for local development
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
    if (this.useStatelessMode) {
      try {
        // Verify the JWT signature and expiration
        const decoded = jwt.verify(state, this.jwtSecret) as JWTStatePayload;

        // Check if this state has already been used (replay protection)
        // Use a hash of the nonce to save memory
        const stateHash = crypto
          .createHash('sha256')
          .update(decoded.nonce)
          .digest('hex')
          .substring(0, 16);
        if (this.usedStates.has(stateHash)) {
          console.log('[OAuthStateManager] State already used (replay attempt)');
          return false;
        }

        // Mark as used
        this.usedStates.add(stateHash);

        // Clean up old used states periodically (keep last 1000)
        if (this.usedStates.size > 1000) {
          const entries = Array.from(this.usedStates);
          this.usedStates = new Set(entries.slice(-500));
        }

        return true;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          console.log('[OAuthStateManager] State token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
          console.log('[OAuthStateManager] Invalid state token');
        } else {
          console.error('[OAuthStateManager] State validation error:', error);
        }
        return false;
      }
    }

    // Fallback to in-memory validation
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
    if (this.useStatelessMode) {
      try {
        jwt.verify(state, this.jwtSecret);
        return true;
      } catch {
        return false;
      }
    }

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
    this.usedStates.clear();
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
