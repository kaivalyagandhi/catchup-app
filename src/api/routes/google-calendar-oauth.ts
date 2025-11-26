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
    console.error('Error generating authorization URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/calendar/oauth/callback
 * Handle OAuth callback from Google
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

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      res.status(400).json({ error: 'Failed to obtain access token' });
      return;
    }

    // Get user profile to verify
    const profile = await getUserProfile(tokens);

    // Store tokens in database
    await upsertToken(
      req.userId,
      'google_calendar',
      tokens.access_token,
      tokens.refresh_token,
      tokens.token_type,
      tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      tokens.scope
    );

    res.json({
      message: 'Google Calendar connected successfully',
      email: profile.email,
      name: profile.name
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
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

    res.json({
      connected: !!token,
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

    await deleteToken(req.userId, 'google_calendar');

    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

export default router;
