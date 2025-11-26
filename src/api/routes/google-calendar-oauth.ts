/**
 * Google Calendar OAuth Routes
 * Handles OAuth flow for Google Calendar integration
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getAuthorizationUrl, getTokensFromCode } from '../../integrations/google-calendar-config';
import { getUserProfile } from '../../integrations/google-calendar-service';
import { upsertToken, getToken, deleteToken } from '../../integrations/oauth-repository';

const router = Router();

/**
 * GET /api/calendar/oauth/authorize
 * Redirect user to Google OAuth consent screen
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const authUrl = getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error generating authorization URL:', errorMsg);
    res.status(500).json({ error: 'Failed to generate authorization URL', details: errorMsg });
  }
});

/**
 * GET /api/calendar/oauth/callback
 * Handle OAuth callback from Google
 * Note: This endpoint requires the user to be authenticated with a valid JWT token
 */
router.get('/callback', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }

    console.log('Exchanging authorization code for tokens...');
    // Exchange code for tokens
    let tokens;
    try {
      tokens = await getTokensFromCode(code);
    } catch (tokenError) {
      const tokenErrorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
      console.error('Failed to exchange code for tokens:', tokenErrorMsg);
      res.status(400).json({ 
        error: 'Failed to exchange authorization code', 
        details: tokenErrorMsg 
      });
      return;
    }

    if (!tokens || !tokens.access_token) {
      console.error('No access token received:', tokens);
      res.status(400).json({ error: 'Failed to obtain access token' });
      return;
    }

    console.log('Getting user profile...');
    // Get user profile to verify
    let profile;
    try {
      profile = await getUserProfile(tokens);
      console.log('User profile retrieved:', { email: profile.email, name: profile.name });
    } catch (profileError) {
      const profileErrorMsg = profileError instanceof Error ? profileError.message : String(profileError);
      console.error('Failed to get user profile:', profileErrorMsg);
      res.status(400).json({ 
        error: 'Failed to get user profile', 
        details: profileErrorMsg 
      });
      return;
    }

    console.log('Storing tokens in database...');
    // Store tokens in database
    try {
      const emailToStore = profile.email || undefined;
      console.log('Storing email:', emailToStore);
      await upsertToken(
        req.userId,
        'google_calendar',
        tokens.access_token,
        tokens.refresh_token || undefined,
        tokens.token_type || undefined,
        tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        tokens.scope || undefined,
        emailToStore
      );
    } catch (dbError) {
      const dbErrorMsg = dbError instanceof Error ? dbError.message : String(dbError);
      console.error('Failed to store tokens in database:', dbErrorMsg);
      res.status(500).json({ 
        error: 'Failed to store calendar connection', 
        details: dbErrorMsg 
      });
      return;
    }

    console.log('Calendar connection successful for user:', req.userId);
    res.json({
      message: 'Google Calendar connected successfully',
      email: profile.email,
      name: profile.name
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Unexpected error in OAuth callback:', errorMsg);
    console.error('Stack:', errorStack);
    res.status(500).json({ error: 'Failed to complete OAuth flow', details: errorMsg });
  }
});

/**
 * GET /api/calendar/oauth/status
 * Check if user has connected Google Calendar
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = await getToken(req.userId, 'google_calendar');
    console.log('Status check - Token retrieved:', { 
      connected: !!token, 
      email: token?.email,
      expiresAt: token?.expiresAt 
    });

    res.json({
      connected: !!token,
      email: token?.email || null,
      expiresAt: token?.expiresAt || null
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(500).json({ error: 'Failed to check OAuth status' });
  }
});

/**
 * DELETE /api/calendar/oauth/disconnect
 * Disconnect Google Calendar
 */
router.delete('/disconnect', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('Disconnecting Google Calendar for user:', req.userId);
    await deleteToken(req.userId, 'google_calendar');
    console.log('Google Calendar disconnected successfully for user:', req.userId);

    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Error disconnecting Google Calendar:', errorMsg);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar', details: errorMsg });
  }
});

export default router;
