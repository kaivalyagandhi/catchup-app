/**
 * SMS/MMS Performance Monitoring API
 * 
 * Provides endpoints for monitoring performance metrics,
 * cache statistics, and connection pool health.
 * 
 * Requirements: All (Performance monitoring)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import {
  getCacheStats,
  resetMetrics,
  checkPoolHealth,
} from '../../sms/performance-optimizer';
import { connectionPoolManager } from '../../sms/connection-pool-manager';
import { smsMonitoringService } from '../../sms/sms-monitoring-service';

const router = Router();

/**
 * GET /api/sms/performance/stats
 * Get comprehensive performance statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const cacheStats = getCacheStats();
    const poolHealth = await checkPoolHealth();
    const connectionPools = connectionPoolManager.getAllStats();
    const monitoringStats = smsMonitoringService.getStats();

    res.json({
      success: true,
      data: {
        cache: cacheStats,
        database: poolHealth,
        connectionPools,
        monitoring: monitoringStats,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * GET /api/sms/performance/cache
 * Get cache statistics
 */
router.get(
  '/cache',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/sms/performance/database
 * Get database connection pool health
 */
router.get(
  '/database',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const health = await checkPoolHealth();

    res.json({
      success: true,
      data: health,
    });
  })
);

/**
 * GET /api/sms/performance/connections
 * Get external API connection pool statistics
 */
router.get(
  '/connections',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = connectionPoolManager.getAllStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * POST /api/sms/performance/reset
 * Reset performance metrics (admin only)
 */
router.post(
  '/reset',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    resetMetrics();
    smsMonitoringService.resetStats();

    res.json({
      success: true,
      message: 'Performance metrics reset',
    });
  })
);

/**
 * GET /api/sms/performance/health
 * Health check endpoint for load balancers
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const poolHealth = await checkPoolHealth();
    const cacheStats = getCacheStats();

    const healthy =
      poolHealth.healthy &&
      poolHealth.waitingClients < 5 && // Less than 5 waiting clients
      cacheStats.metrics.hitRate > 50; // Cache hit rate above 50%

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? 'healthy' : 'degraded',
        database: poolHealth,
        cacheHitRate: cacheStats.metrics.hitRate,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;
