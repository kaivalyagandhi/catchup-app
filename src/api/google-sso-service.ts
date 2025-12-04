/**
 * Google SSO Service
 *
 * Handles Google OAuth 2.0 authentication flow
 * - Authorization URL generation
 * - Token exchange
 * - ID token validation
 * - User info extraction
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// OAuth scopes
const SCOPES = ['email', 'profile'];

export interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface GooglePublicKey {
  kid: string;
  n: string;
  e: string;
  alg: string;
  kty: string;
  use: string;
}

export interface GooglePublicKeysResponse {
  keys: GooglePublicKey[];
}

/**
 * Google SSO Error codes
 */
export enum GoogleSSOErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_CODE = 'INVALID_CODE',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  STATE_MISMATCH = 'STATE_MISMATCH',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  EMAIL_CONFLICT = 'EMAIL_CONFLICT',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
}

/**
 * Google SSO Error class
 */
export class GoogleSSOError extends Error {
  constructor(
    message: string,
    public code: GoogleSSOErrorCode,
    public userMessage: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'GoogleSSOError';
  }
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<GoogleSSOErrorCode, string> = {
  [GoogleSSOErrorCode.INVALID_CONFIG]: 'Authentication service is not properly configured',
  [GoogleSSOErrorCode.INVALID_CODE]: 'Invalid authentication code. Please try again.',
  [GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED]:
    'Failed to complete authentication. Please try again.',
  [GoogleSSOErrorCode.INVALID_TOKEN]: 'Invalid authentication token. Please try again.',
  [GoogleSSOErrorCode.TOKEN_EXPIRED]: 'Authentication session expired. Please try again.',
  [GoogleSSOErrorCode.STATE_MISMATCH]: 'Security validation failed. Please try again.',
  [GoogleSSOErrorCode.USER_CREATION_FAILED]: 'Failed to create user account. Please try again.',
  [GoogleSSOErrorCode.EMAIL_CONFLICT]: 'An account with this email already exists.',
  [GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED]:
    'Token signature verification failed. Please try again.',
};

/**
 * Google SSO Service class
 */
export class GoogleSSOService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private publicKeysCache: GooglePublicKeysResponse | null = null;
  private publicKeysCacheExpiry: number = 0;

  constructor() {
    this.validateConfiguration();

    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  }

  /**
   * Validate configuration on service initialization
   */
  private validateConfiguration(): void {
    const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];

    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      throw new GoogleSSOError(
        `Missing required environment variables: ${missing.join(', ')}`,
        GoogleSSOErrorCode.INVALID_CONFIG,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_CONFIG],
        500
      );
    }

    // Validate redirect URI format
    try {
      new URL(process.env.GOOGLE_REDIRECT_URI!);
    } catch (error) {
      throw new GoogleSSOError(
        'GOOGLE_REDIRECT_URI is not a valid URL',
        GoogleSSOErrorCode.INVALID_CONFIG,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_CONFIG],
        500
      );
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   * @param state - CSRF protection state parameter
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state: state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from OAuth callback
   * @returns Token response with access token and ID token
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);

      if (error.response?.data?.error === 'invalid_grant') {
        throw new GoogleSSOError(
          'Invalid authorization code',
          GoogleSSOErrorCode.INVALID_CODE,
          ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_CODE],
          400
        );
      }

      throw new GoogleSSOError(
        `Token exchange failed: ${error.message}`,
        GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED,
        ERROR_MESSAGES[GoogleSSOErrorCode.TOKEN_EXCHANGE_FAILED],
        500
      );
    }
  }

  /**
   * Validate and decode ID token
   * @param idToken - ID token from Google
   * @returns Decoded user information
   */
  async validateAndDecodeToken(idToken: string): Promise<GoogleUserInfo> {
    // First verify the signature
    const isValid = await this.verifyTokenSignature(idToken);

    if (!isValid) {
      // Import audit logger dynamically to avoid circular dependencies
      const { logAuditEvent, AuditAction } = await import('../utils/audit-logger');

      // Log token validation failure
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          error: 'signature_verification_failed',
          method: 'token_validation',
        },
        success: false,
        errorMessage: 'Token signature verification failed',
      });

      throw new GoogleSSOError(
        'Token signature verification failed',
        GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED,
        ERROR_MESSAGES[GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED],
        401
      );
    }

    // Decode the token (without verification since we already verified)
    const decoded = jwt.decode(idToken) as any;

    if (!decoded) {
      throw new GoogleSSOError(
        'Failed to decode ID token',
        GoogleSSOErrorCode.INVALID_TOKEN,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_TOKEN],
        401
      );
    }

    // Import audit logger dynamically to avoid circular dependencies
    const { logAuditEvent, AuditAction } = await import('../utils/audit-logger');

    // Verify issuer
    const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
    if (!validIssuers.includes(decoded.iss)) {
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          error: 'invalid_issuer',
          issuer: decoded.iss,
          method: 'token_validation',
        },
        success: false,
        errorMessage: `Invalid token issuer: ${decoded.iss}`,
      });

      throw new GoogleSSOError(
        `Invalid token issuer: ${decoded.iss}`,
        GoogleSSOErrorCode.INVALID_TOKEN,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_TOKEN],
        401
      );
    }

    // Verify audience (client ID)
    if (decoded.aud !== this.clientId) {
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          error: 'invalid_audience',
          method: 'token_validation',
        },
        success: false,
        errorMessage: 'Token audience does not match client ID',
      });

      throw new GoogleSSOError(
        'Token audience does not match client ID',
        GoogleSSOErrorCode.INVALID_TOKEN,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_TOKEN],
        401
      );
    }

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          error: 'token_expired',
          expiredAt: new Date(decoded.exp * 1000).toISOString(),
          method: 'token_validation',
        },
        success: false,
        errorMessage: 'Token has expired',
      });

      throw new GoogleSSOError(
        'Token has expired',
        GoogleSSOErrorCode.TOKEN_EXPIRED,
        ERROR_MESSAGES[GoogleSSOErrorCode.TOKEN_EXPIRED],
        401
      );
    }

    // Verify email is verified
    if (!decoded.email_verified) {
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: {
          provider: 'google',
          error: 'email_not_verified',
          email: decoded.email,
          method: 'token_validation',
        },
        success: false,
        errorMessage: 'Email is not verified',
      });

      throw new GoogleSSOError(
        'Email is not verified',
        GoogleSSOErrorCode.INVALID_TOKEN,
        ERROR_MESSAGES[GoogleSSOErrorCode.INVALID_TOKEN],
        401
      );
    }

    // Extract user info
    const userInfo: GoogleUserInfo = {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      name: decoded.name,
      picture: decoded.picture,
      given_name: decoded.given_name,
      family_name: decoded.family_name,
    };

    return userInfo;
  }

  /**
   * Verify token signature using Google's public keys
   * @param idToken - ID token to verify
   * @returns True if signature is valid
   */
  async verifyTokenSignature(idToken: string): Promise<boolean> {
    try {
      // Get public keys from Google
      const publicKeys = await this.getGooglePublicKeys();

      // Decode token header to get key ID
      const decodedHeader = jwt.decode(idToken, { complete: true });

      if (!decodedHeader || typeof decodedHeader === 'string') {
        return false;
      }

      const kid = decodedHeader.header.kid;

      // Find matching public key
      const publicKey = publicKeys.keys.find((key) => key.kid === kid);

      if (!publicKey) {
        console.error('No matching public key found for kid:', kid);
        return false;
      }

      // Convert JWK to PEM format
      const pem = this.jwkToPem(publicKey);

      // Verify token signature
      try {
        jwt.verify(idToken, pem, {
          algorithms: ['RS256'],
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
          audience: this.clientId,
        });
        return true;
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError);
        return false;
      }
    } catch (error) {
      console.error('Error verifying token signature:', error);
      return false;
    }
  }

  /**
   * Get Google's public keys for token verification
   * Caches keys for 1 hour
   */
  private async getGooglePublicKeys(): Promise<GooglePublicKeysResponse> {
    const now = Date.now();

    // Return cached keys if still valid
    if (this.publicKeysCache && now < this.publicKeysCacheExpiry) {
      return this.publicKeysCache;
    }

    try {
      const response = await axios.get<GooglePublicKeysResponse>(GOOGLE_CERTS_URL);

      this.publicKeysCache = response.data;
      this.publicKeysCacheExpiry = now + 60 * 60 * 1000; // Cache for 1 hour

      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch Google public keys:', error.message);
      throw new GoogleSSOError(
        'Failed to fetch public keys for token verification',
        GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED,
        ERROR_MESSAGES[GoogleSSOErrorCode.SIGNATURE_VERIFICATION_FAILED],
        500
      );
    }
  }

  /**
   * Convert JWK to PEM format for JWT verification
   */
  private jwkToPem(jwk: GooglePublicKey): string {
    // Convert base64url to base64
    const n = Buffer.from(jwk.n, 'base64url');
    const e = Buffer.from(jwk.e, 'base64url');

    // Create RSA public key
    const key = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: n.toString('base64'),
        e: e.toString('base64'),
      },
      format: 'jwk',
    });

    // Export as PEM
    return key.export({ type: 'spki', format: 'pem' }) as string;
  }

  /**
   * Generate a secure random state parameter for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get user-friendly error message for error code
   */
  static getErrorMessage(code: GoogleSSOErrorCode): string {
    return ERROR_MESSAGES[code] || 'An unexpected error occurred';
  }
}

// Export singleton instance (lazy-loaded)
let _instance: GoogleSSOService | null = null;

export function getGoogleSSOService(): GoogleSSOService {
  if (!_instance) {
    _instance = new GoogleSSOService();
  }
  return _instance;
}

// For backward compatibility
export const googleSSOService = {
  get instance(): GoogleSSOService {
    return getGoogleSSOService();
  },
};
