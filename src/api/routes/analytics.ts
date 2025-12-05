/**
 * Analytics API Routes
 * 
 * Endpoints for tracking and retrieving analytics data
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Database connection (should be imported from db module)
let pool: Pool;

export function setPool(dbPool: Pool) {
  pool = dbPool;
}

/**
 * POST /api/analytics/onboarding
 * Track an onboarding event
 */
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const { userId, eventType, timestamp, metadata } = req.body;

    // Validate required fields
    if (!userId || !eventType || !timestamp) {
      return res.status(400).json({
        error: 'Missing required fields: userId, eventType, timestamp',
      });
    }

    // Insert event into database
    await pool.query(
      `INSERT INTO onboarding_analytics_events 
       (user_id, event_type, timestamp, metadata, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, eventType, timestamp, JSON.stringify(metadata || {})]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking onboarding event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * GET /api/analytics/onboarding/stats
 * Get onboarding completion statistics
 */
router.get('/onboarding/stats', async (req: Request, res: Response) => {
  try {
    // Get completion stats
    const completionResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'onboarding_started' THEN user_id END) as started,
        COUNT(DISTINCT CASE WHEN event_type = 'onboarding_completed' THEN user_id END) as completed
      FROM onboarding_analytics_events
    `);

    const { started, completed } = completionResult.rows[0];
    const completionRate = started > 0 ? (completed / started) * 100 : 0;

    // Get average time to complete
    const timeResult = await pool.query(`
      SELECT 
        AVG((metadata->>'timeToCompleteMinutes')::numeric) as avg_time_minutes
      FROM onboarding_analytics_events
      WHERE event_type = 'onboarding_completed'
        AND metadata->>'timeToCompleteMinutes' IS NOT NULL
    `);

    const averageTimeMinutes = timeResult.rows[0]?.avg_time_minutes || 0;

    res.json({
      started: parseInt(started),
      completed: parseInt(completed),
      completionRate: Math.round(completionRate * 100) / 100,
      averageTimeMinutes: Math.round(averageTimeMinutes * 100) / 100,
    });
  } catch (error) {
    console.error('Error getting onboarding stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/analytics/onboarding/funnel
 * Get step completion funnel
 */
router.get('/onboarding/funnel', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'step_1_started' THEN user_id END) as step1_started,
        COUNT(DISTINCT CASE WHEN event_type = 'step_1_completed' THEN user_id END) as step1_completed,
        COUNT(DISTINCT CASE WHEN event_type = 'step_2_started' THEN user_id END) as step2_started,
        COUNT(DISTINCT CASE WHEN event_type = 'step_2_completed' THEN user_id END) as step2_completed,
        COUNT(DISTINCT CASE WHEN event_type = 'step_3_started' THEN user_id END) as step3_started,
        COUNT(DISTINCT CASE WHEN event_type = 'step_3_completed' THEN user_id END) as step3_completed
      FROM onboarding_analytics_events
    `);

    const row = result.rows[0];
    res.json({
      step1Started: parseInt(row.step1_started),
      step1Completed: parseInt(row.step1_completed),
      step2Started: parseInt(row.step2_started),
      step2Completed: parseInt(row.step2_completed),
      step3Started: parseInt(row.step3_started),
      step3Completed: parseInt(row.step3_completed),
    });
  } catch (error) {
    console.error('Error getting funnel data:', error);
    res.status(500).json({ error: 'Failed to get funnel data' });
  }
});

/**
 * GET /api/analytics/onboarding/dismissals
 * Get dismissal and resume statistics
 */
router.get('/onboarding/dismissals', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'onboarding_dismissed' THEN user_id END) as dismissed,
        COUNT(DISTINCT CASE WHEN event_type = 'onboarding_resumed' THEN user_id END) as resumed
      FROM onboarding_analytics_events
    `);

    const { dismissed, resumed } = result.rows[0];
    const resumeRate = dismissed > 0 ? (resumed / dismissed) * 100 : 0;

    res.json({
      dismissed: parseInt(dismissed),
      resumed: parseInt(resumed),
      resumeRate: Math.round(resumeRate * 100) / 100,
    });
  } catch (error) {
    console.error('Error getting dismissal stats:', error);
    res.status(500).json({ error: 'Failed to get dismissal stats' });
  }
});

/**
 * GET /api/analytics/onboarding/ai-suggestions
 * Get AI suggestion acceptance rate
 */
router.get('/onboarding/ai-suggestions', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN event_type = 'ai_suggestion_accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN event_type = 'ai_suggestion_rejected' THEN 1 END) as rejected
      FROM onboarding_analytics_events
    `);

    const { accepted, rejected } = result.rows[0];
    const total = parseInt(accepted) + parseInt(rejected);
    const acceptanceRate = total > 0 ? (parseInt(accepted) / total) * 100 : 0;

    res.json({
      accepted: parseInt(accepted),
      rejected: parseInt(rejected),
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    });
  } catch (error) {
    console.error('Error getting AI suggestion stats:', error);
    res.status(500).json({ error: 'Failed to get AI suggestion stats' });
  }
});

/**
 * GET /api/analytics/onboarding/user/:userId
 * Get all events for a specific user
 */
router.get('/onboarding/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT event_type, timestamp, metadata, created_at
       FROM onboarding_analytics_events
       WHERE user_id = $1
       ORDER BY timestamp ASC`,
      [userId]
    );

    res.json({
      userId,
      events: result.rows,
    });
  } catch (error) {
    console.error('Error getting user events:', error);
    res.status(500).json({ error: 'Failed to get user events' });
  }
});

/**
 * GET /api/analytics/onboarding/dashboard
 * Get comprehensive dashboard data
 */
router.get('/onboarding/dashboard', async (req: Request, res: Response) => {
  try {
    // Get all stats in parallel
    const [completionStats, funnelStats, dismissalStats, aiStats] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN event_type = 'onboarding_started' THEN user_id END) as started,
          COUNT(DISTINCT CASE WHEN event_type = 'onboarding_completed' THEN user_id END) as completed,
          AVG((metadata->>'timeToCompleteMinutes')::numeric) as avg_time_minutes
        FROM onboarding_analytics_events
      `),
      pool.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN event_type = 'step_1_completed' THEN user_id END) as step1,
          COUNT(DISTINCT CASE WHEN event_type = 'step_2_completed' THEN user_id END) as step2,
          COUNT(DISTINCT CASE WHEN event_type = 'step_3_completed' THEN user_id END) as step3
        FROM onboarding_analytics_events
      `),
      pool.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN event_type = 'onboarding_dismissed' THEN user_id END) as dismissed,
          COUNT(DISTINCT CASE WHEN event_type = 'onboarding_resumed' THEN user_id END) as resumed
        FROM onboarding_analytics_events
      `),
      pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type = 'ai_suggestion_accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN event_type = 'ai_suggestion_rejected' THEN 1 END) as rejected
        FROM onboarding_analytics_events
      `),
    ]);

    const completion = completionStats.rows[0];
    const funnel = funnelStats.rows[0];
    const dismissal = dismissalStats.rows[0];
    const ai = aiStats.rows[0];

    const started = parseInt(completion.started);
    const completed = parseInt(completion.completed);
    const completionRate = started > 0 ? (completed / started) * 100 : 0;

    const dismissed = parseInt(dismissal.dismissed);
    const resumed = parseInt(dismissal.resumed);
    const resumeRate = dismissed > 0 ? (resumed / dismissed) * 100 : 0;

    const aiAccepted = parseInt(ai.accepted);
    const aiRejected = parseInt(ai.rejected);
    const aiTotal = aiAccepted + aiRejected;
    const aiAcceptanceRate = aiTotal > 0 ? (aiAccepted / aiTotal) * 100 : 0;

    res.json({
      completion: {
        started,
        completed,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTimeMinutes: Math.round((completion.avg_time_minutes || 0) * 100) / 100,
      },
      funnel: {
        step1Completed: parseInt(funnel.step1),
        step2Completed: parseInt(funnel.step2),
        step3Completed: parseInt(funnel.step3),
      },
      dismissal: {
        dismissed,
        resumed,
        resumeRate: Math.round(resumeRate * 100) / 100,
      },
      aiSuggestions: {
        accepted: aiAccepted,
        rejected: aiRejected,
        acceptanceRate: Math.round(aiAcceptanceRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
