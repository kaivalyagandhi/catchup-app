/**
 * Authentication Routes
 *
 * Handles user registration, login, and password management
 */

import { Router, Request, Response } from 'express';
import { registerUser, loginUser, changePassword, getUserById } from '../auth-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { enforceTestMode, getTestModeStatus } from '../middleware/test-mode';

const router = Router();

/**
 * GET /api/auth/test-mode
 * Get test mode status
 *
 * Returns whether test mode is enabled and which authentication methods are available
 */
router.get('/test-mode', (req: Request, res: Response) => {
  const status = getTestModeStatus();
  res.json(status);
});

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Note: This endpoint is only available when TEST_MODE is enabled
 */
router.post('/register', enforceTestMode, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { user, token } = await registerUser(email, password);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

/**
 * POST /api/auth/login
 * Login user
 *
 * Note: This endpoint is only available when TEST_MODE is enabled
 */
router.post('/login', enforceTestMode, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { user, token } = await loginUser(email, password);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      authProvider: user.authProvider,
      profilePictureUrl: user.profilePictureUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * GET /api/auth/last-login
 * Get the last login timestamp for the current user
 */
router.get('/last-login', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { getUserAuditLogs, AuditAction } = await import('../../utils/audit-logger');

    // Get the most recent login event (excluding the current session)
    const logs = await getUserAuditLogs(req.userId, {
      actions: [AuditAction.USER_LOGIN],
      limit: 2, // Get 2 to exclude current session
    });

    // If we have at least 2 login events, return the second one (previous login)
    // If we only have 1, return null (this is the first login)
    const lastLogin = logs.length >= 2 ? logs[1].timestamp : null;

    res.json({ lastLogin });
  } catch (error) {
    console.error('Error getting last login:', error);
    res.status(500).json({ error: 'Failed to get last login' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    await changePassword(req.userId, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
});

export default router;
