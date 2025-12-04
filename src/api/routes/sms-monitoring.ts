/**
 * SMS/MMS Monitoring API Routes
 *
 * Provides endpoints for accessing monitoring data, metrics, and alerts.
 *
 * Requirements: 9.1 - Monitoring and logging
 */

import { Router, Request, Response } from 'express';
import { smsMonitoringService } from '../../sms/sms-monitoring-service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/sms/monitoring/dashboard
 * Get comprehensive dashboard statistics
 *
 * Query params:
 * - period: 'hour', 'day', 'week', 'month' (default: 'day')
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const period = (req.query.period as string) || 'day';

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 1);
    }

    const statistics = await smsMonitoringService.getUsageStatistics(startDate, endDate);

    res.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      statistics,
    });
  })
);

/**
 * GET /api/sms/monitoring/messages
 * Get message processing metrics
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get(
  '/messages',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const metrics = await smsMonitoringService.getMessageMetrics(startDate, endDate);

    res.json({
      success: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics,
    });
  })
);

/**
 * GET /api/sms/monitoring/ai-performance
 * Get AI API performance metrics
 */
router.get(
  '/ai-performance',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const metrics = smsMonitoringService.getAIPerformanceMetrics();

    res.json({
      success: true,
      metrics,
    });
  })
);

/**
 * GET /api/sms/monitoring/costs
 * Get cost tracking metrics
 */
router.get(
  '/costs',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const metrics = smsMonitoringService.getCostMetrics();

    res.json({
      success: true,
      metrics,
    });
  })
);

/**
 * GET /api/sms/monitoring/alerts
 * Get recent alerts
 *
 * Query params:
 * - limit: Number of alerts to return (default: 10)
 */
router.get(
  '/alerts',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const alerts = smsMonitoringService.getRecentAlerts(limit);

    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  })
);

/**
 * POST /api/sms/monitoring/reset
 * Reset period metrics (admin only)
 */
router.post(
  '/reset',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // In production, add admin role check here
    smsMonitoringService.resetPeriodMetrics();

    res.json({
      success: true,
      message: 'Period metrics reset successfully',
    });
  })
);

export default router;
