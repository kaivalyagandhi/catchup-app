/**
 * Job Monitoring API Routes
 *
 * Provides endpoints for monitoring job queues, metrics, and health.
 * Protected by admin middleware.
 *
 * Requirements: 10.4
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/admin';
import {
  getAllQueueMetrics,
  getQueueMetrics,
  checkQueueBacklog,
  checkFailureRate,
  getFailedJobs,
  retryFailedJobs,
  cleanupCompletedJobs,
  getMonitoringReport,
} from '../../jobs/job-monitoring-service';

const router = Router();

/**
 * GET /api/admin/jobs/metrics
 *
 * Get metrics for all job queues
 */
router.get('/metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const metrics = await getAllQueueMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error getting job metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job metrics',
    });
  }
});

/**
 * GET /api/admin/jobs/metrics/:queueName
 *
 * Get metrics for a specific queue
 */
router.get('/metrics/:queueName', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const metrics = await getQueueMetrics(queueName);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    res.json({
      success: true,
      metrics,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error getting queue metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue metrics',
    });
  }
});

/**
 * GET /api/admin/jobs/backlog
 *
 * Check for queue backlog and get alerts
 */
router.get('/backlog', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await checkQueueBacklog();

    res.json({
      success: true,
      ...result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error checking queue backlog:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check queue backlog',
    });
  }
});

/**
 * GET /api/admin/jobs/failure-rate/:queueName
 *
 * Check failure rate for a specific queue
 */
router.get('/failure-rate/:queueName', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const result = await checkFailureRate(queueName);

    res.json({
      success: true,
      queueName,
      ...result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error checking failure rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check failure rate',
    });
  }
});

/**
 * GET /api/admin/jobs/failed/:queueName
 *
 * Get failed jobs for a specific queue
 */
router.get('/failed/:queueName', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const failedJobs = await getFailedJobs(queueName, limit);

    res.json({
      success: true,
      queueName,
      failedJobs,
      count: failedJobs.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error getting failed jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get failed jobs',
    });
  }
});

/**
 * POST /api/admin/jobs/retry/:queueName
 *
 * Retry all failed jobs in a queue
 */
router.post('/retry/:queueName', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const retriedCount = await retryFailedJobs(queueName);

    res.json({
      success: true,
      queueName,
      retriedCount,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry failed jobs',
    });
  }
});

/**
 * POST /api/admin/jobs/cleanup
 *
 * Clean up old completed jobs
 */
router.post('/cleanup', requireAdmin, async (req: Request, res: Response) => {
  try {
    const olderThanMs = parseInt(req.body.olderThanMs) || 24 * 60 * 60 * 1000; // Default: 24 hours
    const cleanedCount = await cleanupCompletedJobs(olderThanMs);

    res.json({
      success: true,
      cleanedCount,
      olderThanMs,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up jobs',
    });
  }
});

/**
 * GET /api/admin/jobs/report
 *
 * Get comprehensive monitoring report
 */
router.get('/report', requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await getMonitoringReport();

    res.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error('Error getting monitoring report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring report',
    });
  }
});

export default router;
