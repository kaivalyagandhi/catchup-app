/**
 * Cloud Tasks Job Handler
 * 
 * Single endpoint to handle all job types with OIDC authentication and idempotency.
 * Receives HTTP POST requests from Cloud Tasks and routes to appropriate job processors.
 */

import express, { Request, Response, NextFunction } from 'express';
import { IdempotencyManager } from '../jobs/idempotency';

const router = express.Router();

// Middleware: Validate OIDC token
async function validateOIDCToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Jobs] Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized: Missing OIDC token' });
  }

  // Cloud Run automatically validates OIDC tokens
  // If we reach here, token is valid
  // Additional validation can be added if needed
  
  next();
}

// Middleware: Check idempotency
async function checkIdempotency(req: Request, res: Response, next: NextFunction) {
  const { idempotencyKey } = req.body;
  
  if (!idempotencyKey) {
    console.error('[Jobs] Missing idempotency key');
    return res.status(400).json({ error: 'Missing idempotency key' });
  }

  try {
    const processed = await IdempotencyManager.isProcessed(idempotencyKey);
    
    if (processed) {
      console.log(`[Jobs] Duplicate request detected: ${idempotencyKey}`);
      const cachedResult = await IdempotencyManager.getCachedResult(idempotencyKey);
      return res.status(200).json({ 
        success: true, 
        duplicate: true,
        message: 'Task already processed',
        result: cachedResult
      });
    }
    
    next();
  } catch (error: any) {
    console.error('[Jobs] Error checking idempotency:', error);
    // Fail open: allow request if Redis is down
    next();
  }
}

// Middleware: Log Cloud Tasks headers
function logCloudTasksHeaders(req: Request, res: Response, next: NextFunction) {
  const headers = {
    queueName: req.headers['x-cloudtasks-queuename'],
    taskName: req.headers['x-cloudtasks-taskname'],
    retryCount: req.headers['x-cloudtasks-taskretrycount'],
    executionCount: req.headers['x-cloudtasks-taskexecutioncount'],
    eta: req.headers['x-cloudtasks-tasketa']
  };
  
  console.log('[Jobs] Cloud Tasks headers:', headers);
  next();
}

// Apply middleware
router.use(validateOIDCToken);
router.use(logCloudTasksHeaders);
router.use(checkIdempotency);

// Job handler endpoint
router.post('/jobs/:jobName', async (req: Request, res: Response) => {
  const { jobName } = req.params;
  const { data, idempotencyKey } = req.body;
  const startTime = Date.now();
  
  console.log(`[Jobs] Starting job: ${jobName}`, { data, idempotencyKey });
  
  try {
    // Route to appropriate job processor
    const result = await executeJob(jobName, data);
    
    // Mark idempotency key as processed (24 hour TTL)
    await IdempotencyManager.markProcessed(idempotencyKey);
    await IdempotencyManager.cacheResult(idempotencyKey, result);
    
    const duration = Date.now() - startTime;
    console.log(`[Jobs] Completed job: ${jobName} (${duration}ms)`);
    
    res.status(200).json({ success: true, result, duration });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Jobs] Error in job ${jobName} (${duration}ms):`, error);
    
    // Determine if error is retryable
    if (isRetryableError(error)) {
      // Return 5xx for transient errors (Cloud Tasks will retry)
      res.status(500).json({ 
        error: error.message,
        retryable: true,
        duration
      });
    } else {
      // Return 4xx for permanent errors (Cloud Tasks won't retry)
      res.status(400).json({ 
        error: error.message,
        retryable: false,
        duration
      });
    }
  }
});

// Execute job based on job name
async function executeJob(jobName: string, data: any): Promise<any> {
  // Create a minimal Job-like object for processors that expect it
  const mockJob = {
    id: `cloud-tasks-${Date.now()}`,
    data,
    name: jobName,
  };

  switch (jobName) {
    case 'token-refresh':
      const { processTokenRefresh } = await import('../jobs/processors/token-refresh-processor');
      return await processTokenRefresh(mockJob as any);
      
    case 'calendar-sync':
      const { processCalendarSync } = await import('../jobs/processors/calendar-sync-processor');
      return await processCalendarSync(mockJob as any);
      
    case 'google-contacts-sync':
      const { processGoogleContactsSync } = await import('../jobs/processors/google-contacts-sync-processor');
      return await processGoogleContactsSync(mockJob as any);
      
    case 'adaptive-sync':
      const { processAdaptiveSync } = await import('../jobs/processors/adaptive-sync-processor');
      return await processAdaptiveSync(mockJob as any);
      
    case 'webhook-renewal':
      const { processWebhookRenewal } = await import('../jobs/processors/webhook-renewal-processor');
      return await processWebhookRenewal(mockJob as any);
      
    case 'suggestion-regeneration':
      const { processSuggestionRegeneration } = await import('../jobs/processors/suggestion-regeneration');
      return await processSuggestionRegeneration(mockJob as any);
      
    case 'batch-notifications':
      const { processBatchNotification } = await import('../jobs/processors/batch-notification-processor');
      return await processBatchNotification(mockJob as any);
      
    case 'suggestion-generation':
      const { processSuggestionGeneration } = await import('../jobs/processors/suggestion-generation-processor');
      return await processSuggestionGeneration(mockJob as any);
      
    case 'webhook-health-check':
      const { processWebhookHealthCheck } = await import('../jobs/processors/webhook-health-check-processor');
      return await processWebhookHealthCheck(mockJob as any);
      
    case 'notification-reminder':
      const { processNotificationReminder } = await import('../jobs/processors/notification-reminder-processor');
      return await processNotificationReminder(mockJob as any);
      
    case 'token-health-reminder':
      const { processTokenHealthReminder } = await import('../jobs/processors/token-health-reminder-processor');
      return await processTokenHealthReminder(mockJob as any);
      
    default:
      throw new Error(`Unknown job type: ${jobName}`);
  }
}

// Determine if error is retryable
function isRetryableError(error: any): boolean {
  // Network errors, timeouts, rate limits are retryable
  if (error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP 429, 503, 5xx are retryable
  if (error.statusCode === 429 || 
      error.statusCode === 503 ||
      (error.statusCode >= 500 && error.statusCode < 600)) {
    return true;
  }
  
  // Database connection errors are retryable
  if (error.message?.includes('connection') || 
      error.message?.includes('timeout')) {
    return true;
  }
  
  // Everything else is permanent
  return false;
}

export default router;
