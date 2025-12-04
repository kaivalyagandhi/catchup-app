/**
 * Google SSO API Routes
 * 
 * Handles Google Single Sign-On OAuth 2.0 flow
 * - Authorization URL generation
 * - OAuth callback handling
 * - Token exchange (alternative flow)
 * - Connection status checking
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getGoogleSSOService, GoogleSSOError, GoogleSSOErrorCode } from '../google-sso-service';
import { getOAuthStateManager } from '../oauth-state-manager';
import { authenticateWithGoogle } from '../auth-service';
import { logAuditEvent, AuditAction } from '../../utils/audit-logger';
import { checkRateLimit, RateLimitConfig } from '../../utils/rate-limiter';
import { googleSSOErrorHandler } from '../google-sso-error-handler';

const router = Router();

// Rate limit configurations for OAuth endpoints
const RATE_LIMITS = {
  AUTHORIZE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute per IP
    keyPrefix: 'ratelimit:google-sso:authorize',
  } as RateLimitConfig,
  CALLBACK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute per IP
    keyPrefix: 'ratelimit:google-sso:callback',
  } as RateLimitConfig,
  TOKEN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute per IP
    keyPrefix: 'ratelimit:google-sso:token',
  } as RateLimitConfig,
};

/**
 * Rate limiting middleware factory
 */
function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: Function) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const identifier = req.ip || 'unknown';
    const result = await checkRateLimit(identifier, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 0);
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: result.retryAfter,
        },
      });
    }

    next();
  };
}

/**
 * GET /api/auth/google/authorize
 * Generate Google OAuth authorization URL
 * 
 * Returns the URL to redirect the user to for Google authentication
 */
router.get('/authorize', createRateLimiter(RATE_LIMITS.AUTHORIZE), (req: Request, res: Response) => {
  try {
    const googleSSOService = getGoogleSSOService();
    const stateManager = getOAuthStateManager();

    // Generate CSRF protection state
    const state = stateManager.generateState();

    // Generate authorization URL
    const authUrl = googleSSOService.getAuthorizationUrl(state);

    console.log('[Google SSO] Authorization URL generated');

    res.json({
      authUrl,
      state, // Return state so client can verify it in callback
    });
  } catch (error) {
    // Log error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/authorize',
      action: 'generate_auth_url',
    });

    // Format and send error response
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback from Google
 * 
 * Query parameters:
 * - code: Authorization code from Google
 * - state: CSRF protection state parameter
 * - error: Error code if authorization failed
 */
router.get('/callback', createRateLimiter(RATE_LIMITS.CALLBACK), async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      console.error('[Google SSO] OAuth error:', oauthError);
      
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: { 
          provider: 'google',
          error: oauthError,
          method: 'oauth_callback'
        },
        success: false,
        errorMessage: `OAuth error: ${oauthError}`,
      });

      res.status(400).json({
        error: {
          code: 'OAUTH_ERROR',
          message: 'Google authentication was cancelled or failed',
          details: process.env.NODE_ENV === 'development' ? String(oauthError) : undefined,
        },
      });
      return;
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.INVALID_CODE,
          message: 'Authorization code is required',
        },
      });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.STATE_MISMATCH,
          message: 'State parameter is required',
        },
      });
      return;
    }

    // Verify state for CSRF protection
    const stateManager = getOAuthStateManager();
    const isValidState = stateManager.validateState(state);

    if (!isValidState) {
      console.error('[Google SSO] Invalid or expired state');
      
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: { 
          provider: 'google',
          error: 'state_mismatch',
          method: 'oauth_callback'
        },
        success: false,
        errorMessage: 'State validation failed',
      });

      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.STATE_MISMATCH,
          message: 'Security validation failed. Please try again.',
        },
      });
      return;
    }

    console.log('[Google SSO] Exchanging authorization code for tokens...');

    // Exchange code for tokens
    const googleSSOService = getGoogleSSOService();
    const tokenResponse = await googleSSOService.exchangeCodeForToken(code);

    console.log('[Google SSO] Validating ID token...');

    // Validate and decode ID token
    const userInfo = await googleSSOService.validateAndDecodeToken(tokenResponse.id_token);

    console.log('[Google SSO] User authenticated:', { email: userInfo.email, sub: userInfo.sub });

    // Authenticate or create user
    const { user, token, isNewUser } = await authenticateWithGoogle(userInfo);

    console.log('[Google SSO] User logged in:', { 
      userId: user.id, 
      email: user.email,
      isNewUser 
    });

    // Redirect to frontend with token and user info in URL
    // Frontend will extract and store authentication data
    const redirectUrl = `/?auth_success=true&token=${encodeURIComponent(token)}&userId=${user.id}&userEmail=${encodeURIComponent(user.email)}&isNewUser=${isNewUser}`;
    res.redirect(redirectUrl);
  } catch (error) {
    // Log error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/callback',
      action: 'oauth_callback',
      code: req.query.code ? 'present' : 'missing',
      state: req.query.state ? 'present' : 'missing',
    });

    // Log failed authentication attempt
    await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
      metadata: { 
        provider: 'google',
        method: 'oauth_callback',
        error: error instanceof Error ? error.message : String(error)
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Format and send error response with guidance
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    
    // Add retry guidance to the message
    if (errorResponse.error && error instanceof Error) {
      errorResponse.error.message = googleSSOErrorHandler.getMessageWithGuidance(error);
    }
    
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * POST /api/auth/google/token
 * Alternative token exchange flow for SPAs
 * 
 * Request body:
 * - code: Authorization code from Google
 * - state: CSRF protection state parameter
 */
router.post('/token', createRateLimiter(RATE_LIMITS.TOKEN), async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.INVALID_CODE,
          message: 'Authorization code is required',
        },
      });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.STATE_MISMATCH,
          message: 'State parameter is required',
        },
      });
      return;
    }

    // Verify state for CSRF protection
    const stateManager = getOAuthStateManager();
    const isValidState = stateManager.validateState(state);

    if (!isValidState) {
      console.error('[Google SSO] Invalid or expired state');
      
      await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
        metadata: { 
          provider: 'google',
          error: 'state_mismatch',
          method: 'token_exchange'
        },
        success: false,
        errorMessage: 'State validation failed',
      });

      res.status(400).json({
        error: {
          code: GoogleSSOErrorCode.STATE_MISMATCH,
          message: 'Security validation failed. Please try again.',
        },
      });
      return;
    }

    console.log('[Google SSO] Exchanging authorization code for tokens (POST)...');

    // Exchange code for tokens
    const googleSSOService = getGoogleSSOService();
    const tokenResponse = await googleSSOService.exchangeCodeForToken(code);

    console.log('[Google SSO] Validating ID token...');

    // Validate and decode ID token
    const userInfo = await googleSSOService.validateAndDecodeToken(tokenResponse.id_token);

    console.log('[Google SSO] User authenticated:', { email: userInfo.email, sub: userInfo.sub });

    // Authenticate or create user
    const { user, token, isNewUser } = await authenticateWithGoogle(userInfo);

    console.log('[Google SSO] User logged in:', { 
      userId: user.id, 
      email: user.email,
      isNewUser 
    });

    // Return JWT token and user info
    res.json({
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
        authProvider: user.authProvider,
      },
      isNewUser,
    });
  } catch (error) {
    // Log error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/token',
      action: 'token_exchange',
      code: req.body.code ? 'present' : 'missing',
      state: req.body.state ? 'present' : 'missing',
    });

    // Log failed authentication attempt
    await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
      metadata: { 
        provider: 'google',
        method: 'token_exchange',
        error: error instanceof Error ? error.message : String(error)
      },
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Format and send error response with guidance
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    
    // Add retry guidance to the message
    if (errorResponse.error && error instanceof Error) {
      errorResponse.error.message = googleSSOErrorHandler.getMessageWithGuidance(error);
    }
    
    res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /api/auth/google/status
 * Check Google SSO connection status for authenticated user
 * 
 * Requires authentication
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Query user's Google SSO status
    const { hasGoogleSSO } = await import('../auth-service');
    const hasGoogle = await hasGoogleSSO(req.userId);

    // Get user details
    const { getUserById } = await import('../auth-service');
    const user = await getUserById(req.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      connected: hasGoogle,
      email: user.email,
      name: user.name || null,
      profilePictureUrl: user.profilePictureUrl || null,
      authProvider: user.authProvider || 'email',
      createdAt: user.createdAt,
    });
  } catch (error) {
    // Log error with context
    googleSSOErrorHandler.logError(error as Error, req, {
      endpoint: '/status',
      action: 'check_status',
      userId: req.userId,
    });

    // Format and send error response
    const errorResponse = googleSSOErrorHandler.formatError(error as Error);
    const statusCode = error instanceof GoogleSSOError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
  }
});

export default router;
