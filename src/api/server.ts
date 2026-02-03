import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer as createHttpServer, Server } from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import authRouter from './routes/auth';
import auditRouter from './routes/audit';
import contactsRouter from './routes/contacts';
import contactsArchiveRouter from './routes/contacts-archive';
import groupsTagsRouter from './routes/groups-tags';
import suggestionsRouter from './routes/suggestions';
import calendarRouter from './routes/calendar';
import calendarApiRouter from './routes/calendar-api';
import googleCalendarOAuthRouter from './routes/google-calendar-oauth';
import googleContactsOAuthRouter from './routes/google-contacts-oauth';
import googleContactsSyncRouter from './routes/google-contacts-sync';
import googleSSORouter from './routes/google-sso';
import authStatisticsRouter from './routes/auth-statistics';
import voiceNotesRouter from './routes/voice-notes';
import preferencesRouter from './routes/preferences';
import accountRouter from './routes/account';
import testDataRouter from './routes/test-data';
import editsRouter from './routes/edits';
import onboardingRouter from './routes/onboarding';
import circlesRouter from './routes/circles';
import aiSuggestionsRouter from './routes/ai-suggestions';
import aiQuickStartRouter from './routes/ai-quick-start';
import aiBatchRouter from './routes/ai-batch';
import gamificationRouter from './routes/gamification';
import weeklyCatchupRouter from './routes/weekly-catchup';
import privacyRouter from './routes/privacy';
import phoneNumberRouter from './routes/phone-number';
import smsWebhookRouter from './routes/sms-webhook';
import enrichmentItemsRouter from './routes/enrichment-items';
import smsMonitoringRouter from './routes/sms-monitoring';
import smsPerformanceRouter from './routes/sms-performance';
import twilioTestRouter from './routes/twilio-test';
import schedulingRouter from './routes/scheduling';
import schedulingAvailabilityRouter from './routes/scheduling-availability';
import schedulingPreferencesRouter from './routes/scheduling-preferences';
import schedulingNotificationsRouter from './routes/scheduling-notifications';
import calendarWebhooksRouter from './routes/calendar-webhooks';
import manualSyncRouter from './routes/manual-sync';
import adminSyncHealthRouter from './routes/admin-sync-health';
import jobMonitoringRouter from './routes/job-monitoring';
import { apiRateLimiter } from '../utils/rate-limiter';
import { enforceHttps, securityHeaders } from './middleware/security';
import { VoiceNoteWebSocketHandler } from '../voice/websocket-handler';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { isTestModeEnabled } from './middleware/test-mode';
import { getVersionInfo } from '../utils/version';
import pool from '../db/connection';

export function createServer(): Express {
  const app = express();

  // Security middleware
  app.use(enforceHttps);
  app.use(securityHeaders);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory with cache control
  // Exclude index.html so we can inject test mode status server-side
  app.use(
    express.static('public', {
      index: false, // Don't serve index.html automatically
      setHeaders: (res, filePath) => {
        // Disable caching for HTML and JS files during development
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    })
  );

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint (no rate limiting)
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      // Check database connectivity
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      res.json({
        status: 'healthy',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Database connection failed',
      });
    }
  });

  // Debug endpoint to check environment variables (development only)
  app.get('/debug/env', (_req: Request, res: Response) => {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({ error: 'Not available in production' });
      return;
    }
    res.json({
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Not set',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Not set',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'Not set',
      NODE_ENV: process.env.NODE_ENV,
    });
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimiter());

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/auth/google', googleSSORouter);
  app.use('/api/auth/statistics', authStatisticsRouter);
  app.use('/api/audit', auditRouter);
  // Archive routes must come before general contacts routes to avoid /:id matching 'archive'
  app.use('/api/contacts', contactsArchiveRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/groups-tags', groupsTagsRouter);
  app.use('/api/suggestions', suggestionsRouter);
  app.use('/api/calendar/oauth', googleCalendarOAuthRouter);
  app.use('/api/calendar', calendarApiRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/contacts/oauth', googleContactsOAuthRouter);
  app.use('/api/contacts/sync', googleContactsSyncRouter);
  // Alias for google-contacts routes (for backward compatibility)
  app.use('/api/google-contacts', googleContactsSyncRouter);
  app.use('/api/voice-notes', voiceNotesRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/edits', editsRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/circles', circlesRouter);
  app.use('/api/ai', aiSuggestionsRouter);
  app.use('/api/ai', aiQuickStartRouter);
  app.use('/api/ai', aiBatchRouter);
  app.use('/api/gamification', gamificationRouter);
  app.use('/api/weekly-catchup', weeklyCatchupRouter);
  app.use('/api/privacy', privacyRouter);
  app.use('/api/user/phone-number', phoneNumberRouter);
  app.use('/api/sms/webhook', smsWebhookRouter);
  app.use('/api/enrichment-items', enrichmentItemsRouter);
  app.use('/api/sms/monitoring', smsMonitoringRouter);
  app.use('/api/sms/performance', smsPerformanceRouter);
  app.use('/api/twilio/test', twilioTestRouter);

  // Scheduling routes (Group Scheduling feature)
  app.use('/api/scheduling', schedulingRouter);
  app.use('/api/scheduling', schedulingAvailabilityRouter);
  app.use('/api/scheduling', schedulingPreferencesRouter);
  app.use('/api/scheduling', schedulingNotificationsRouter);

  // Webhook routes (Google Calendar push notifications)
  app.use('/api/webhooks', calendarWebhooksRouter);

  // Manual sync routes (Google Sync Optimization feature)
  app.use('/api/sync', manualSyncRouter);

  // Admin routes (protected by requireAdmin middleware)
  app.use('/api/admin', adminSyncHealthRouter);
  app.use('/api/admin/jobs', jobMonitoringRouter);

  // Test data routes (for development/testing)
  try {
    app.use('/api/test-data', testDataRouter);
    console.log('Test data routes registered');
  } catch (error) {
    console.error('Failed to register test data routes:', error);
  }

  // Root route - serve landing page (marketing/welcome page)
  app.get('/', (req: Request, res: Response) => {
    const landingPath = path.join(process.cwd(), 'public', 'landing.html');
    
    fs.readFile(landingPath, 'utf8', (err, html) => {
      if (err) {
        console.error('Error reading landing.html:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);
    });
  });

  // App routes - serve the main application
  // Handle /app and /app/:page routes (SPA routing)
  const serveApp = (req: Request, res: Response) => {
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    
    fs.readFile(indexPath, 'utf8', (err, html) => {
      if (err) {
        console.error('Error reading index.html:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Inject test mode status and version info
      const testModeEnabled = isTestModeEnabled();
      const testModeScript = `<script>window.__TEST_MODE_ENABLED__ = ${testModeEnabled};</script>`;
      const versionInfo = getVersionInfo();
      const versionScript = `<script>window.__VERSION_INFO__ = ${JSON.stringify(versionInfo)};</script>`;
      const modifiedHtml = html.replace('<head>', `<head>\n    ${testModeScript}\n    ${versionScript}`);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(modifiedHtml);
    });
  };
  
  app.get('/app', serveApp);
  app.get('/app/:page', serveApp);

  // Public availability page route (no auth required)
  // Serves the lightweight availability collection page for invitees
  app.get('/availability/:token', (req: Request, res: Response) => {
    const availabilityPath = path.join(process.cwd(), 'public', 'availability.html');
    
    fs.readFile(availabilityPath, 'utf8', (err, html) => {
      if (err) {
        // If availability.html doesn't exist yet, serve a placeholder
        console.error('Error reading availability.html:', err);
        res.status(404).send('Availability page not found');
        return;
      }

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);
    });
  });

  // Serve index.html for all other routes (SPA support)
  // Inject test mode status and version info server-side to avoid flash of unstyled content
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      const indexPath = path.join(process.cwd(), 'public', 'index.html');

      fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) {
          console.error('Error reading index.html:', err);
          res.status(500).send('Internal Server Error');
          return;
        }

        // Inject test mode status as a global variable before other scripts
        const testModeEnabled = isTestModeEnabled();
        const testModeScript = `<script>window.__TEST_MODE_ENABLED__ = ${testModeEnabled};</script>`;

        // Inject version info as a global variable
        const versionInfo = getVersionInfo();
        const versionScript = `<script>window.__VERSION_INFO__ = ${JSON.stringify(versionInfo)};</script>`;

        // Insert both scripts right after the opening <head> tag
        const modifiedHtml = html.replace('<head>', `<head>\n    ${testModeScript}\n    ${versionScript}`);

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(modifiedHtml);
      });
    } else {
      // API route not found - pass to 404 handler
      next();
    }
  });

  // 404 handler for API routes
  app.use('/api', notFoundHandler);

  // Global error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

export function startServer(port: number = 3000): Server {
  const app = createServer();
  const httpServer = createHttpServer(app);

  // Set up WebSocket server for voice notes
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/voice-notes',
  });

  // Initialize WebSocket handler
  new VoiceNoteWebSocketHandler(wss);
  console.log('WebSocket server initialized for voice notes');

  httpServer.listen(port, () => {
    console.log(`CatchUp API server listening on port ${port}`);
    console.log(`WebSocket server ready at ws://localhost:${port}/ws/voice-notes`);
  });

  return httpServer;
}
