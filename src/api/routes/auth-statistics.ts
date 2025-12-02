/**
 * Authentication Statistics API Routes
 * 
 * Provides statistics on authentication methods usage
 * Requirements: 7.3
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, UserRole } from '../middleware/auth';
import pool from '../../db/connection';

const router = Router();

/**
 * Authentication statistics interface
 */
export interface AuthStatistics {
  totalAuthentications: number;
  googleSSOAuthentications: number;
  emailPasswordAuthentications: number;
  googleSSOPercentage: number;
  emailPasswordPercentage: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  breakdown: {
    successful: {
      googleSSO: number;
      emailPassword: number;
    };
    failed: {
      googleSSO: number;
      emailPassword: number;
    };
  };
}

/**
 * GET /api/auth/statistics
 * Get authentication statistics
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional, defaults to 30 days ago)
 * - endDate: ISO 8601 date string (optional, defaults to now)
 * - userId: Filter by specific user (admin only)
 * 
 * Requires authentication
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Parse query parameters
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const filterUserId = req.query.userId as string | undefined;

    // Only admins can query other users' statistics
    if (filterUserId && filterUserId !== req.userId && req.userRole !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Use the requesting user's ID if no filter specified
    const targetUserId = filterUserId || req.userId;

    // Query authentication statistics from audit logs
    const statistics = await getAuthenticationStatistics(targetUserId, startDate, endDate);

    res.json(statistics);
  } catch (error) {
    console.error('[Auth Statistics] Error fetching statistics:', error);
    res.status(500).json({
      error: {
        code: 'STATISTICS_ERROR',
        message: 'Failed to retrieve authentication statistics',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
    });
  }
});

/**
 * GET /api/auth/statistics/global
 * Get global authentication statistics (admin only)
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional, defaults to 30 days ago)
 * - endDate: ISO 8601 date string (optional, defaults to now)
 * 
 * Requires admin authentication
 */
router.get('/global', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Only admins can access global statistics
    if (req.userRole !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Parse query parameters
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // Query global authentication statistics (all users)
    const statistics = await getAuthenticationStatistics(null, startDate, endDate);

    res.json(statistics);
  } catch (error) {
    console.error('[Auth Statistics] Error fetching global statistics:', error);
    res.status(500).json({
      error: {
        code: 'STATISTICS_ERROR',
        message: 'Failed to retrieve global authentication statistics',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
    });
  }
});

/**
 * Get authentication statistics from audit logs
 * 
 * @param userId - User ID to filter by (null for global statistics)
 * @param startDate - Start of time range
 * @param endDate - End of time range
 * @returns Authentication statistics
 */
async function getAuthenticationStatistics(
  userId: string | null,
  startDate: Date,
  endDate: Date
): Promise<AuthStatistics> {
  // Build query with optional user filter
  let query = `
    SELECT 
      action,
      success,
      metadata->>'authProvider' as auth_provider,
      metadata->>'method' as method,
      COUNT(*) as count
    FROM audit_logs
    WHERE action IN ('user_login', 'user_registered', 'failed_login_attempt')
      AND created_at >= $1
      AND created_at <= $2
  `;

  const params: any[] = [startDate, endDate];

  if (userId) {
    query += ' AND user_id = $3';
    params.push(userId);
  }

  query += `
    GROUP BY action, success, auth_provider, method
  `;

  const result = await pool.query<{
    action: string;
    success: boolean;
    auth_provider: string | null;
    method: string | null;
    count: string;
  }>(query, params);

  // Initialize counters
  let googleSSOSuccessful = 0;
  let googleSSOFailed = 0;
  let emailPasswordSuccessful = 0;
  let emailPasswordFailed = 0;

  // Process results
  for (const row of result.rows) {
    const count = parseInt(row.count, 10);
    const authProvider = row.auth_provider || 'email';
    const method = row.method;
    const isSuccess = row.success;

    // Determine if this is Google SSO or email/password
    const isGoogleSSO = authProvider === 'google' || method === 'google_sso';

    if (isGoogleSSO) {
      if (isSuccess) {
        googleSSOSuccessful += count;
      } else {
        googleSSOFailed += count;
      }
    } else {
      if (isSuccess) {
        emailPasswordSuccessful += count;
      } else {
        emailPasswordFailed += count;
      }
    }
  }

  // Calculate totals
  const totalGoogleSSO = googleSSOSuccessful + googleSSOFailed;
  const totalEmailPassword = emailPasswordSuccessful + emailPasswordFailed;
  const totalAuthentications = totalGoogleSSO + totalEmailPassword;

  // Calculate percentages
  const googleSSOPercentage = totalAuthentications > 0
    ? (totalGoogleSSO / totalAuthentications) * 100
    : 0;
  const emailPasswordPercentage = totalAuthentications > 0
    ? (totalEmailPassword / totalAuthentications) * 100
    : 0;

  return {
    totalAuthentications,
    googleSSOAuthentications: totalGoogleSSO,
    emailPasswordAuthentications: totalEmailPassword,
    googleSSOPercentage: Math.round(googleSSOPercentage * 100) / 100, // Round to 2 decimal places
    emailPasswordPercentage: Math.round(emailPasswordPercentage * 100) / 100,
    timeRange: {
      start: startDate,
      end: endDate,
    },
    breakdown: {
      successful: {
        googleSSO: googleSSOSuccessful,
        emailPassword: emailPasswordSuccessful,
      },
      failed: {
        googleSSO: googleSSOFailed,
        emailPassword: emailPasswordFailed,
      },
    },
  };
}

export default router;
