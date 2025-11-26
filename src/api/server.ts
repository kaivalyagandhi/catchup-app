import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer as createHttpServer, Server } from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import authRouter from './routes/auth';
import auditRouter from './routes/audit';
import contactsRouter from './routes/contacts';
import groupsTagsRouter from './routes/groups-tags';
import suggestionsRouter from './routes/suggestions';
import calendarRouter from './routes/calendar';
import calendarApiRouter from './routes/calendar-api';
import googleCalendarOAuthRouter from './routes/google-calendar-oauth';
import voiceNotesRouter from './routes/voice-notes';
import preferencesRouter from './routes/preferences';
import accountRouter from './routes/account';
import testDataRouter from './routes/test-data';
import { apiRateLimiter } from '../utils/rate-limiter';
import { enforceHttps, securityHeaders } from './middleware/security';
import { VoiceNoteWebSocketHandler } from '../voice/websocket-handler';

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
  app.use(express.static('public', {
    setHeaders: (res, path) => {
      // Disable caching for HTML and JS files during development
      if (path.endsWith('.html') || path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint (no rate limiting)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimiter());

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/groups-tags', groupsTagsRouter);
  app.use('/api/suggestions', suggestionsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/calendar/api', calendarApiRouter);
  app.use('/api/calendar/oauth', googleCalendarOAuthRouter);
  app.use('/api/voice-notes', voiceNotesRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/account', accountRouter);
  
  // Test data routes (for development/testing)
  try {
    app.use('/api/test-data', testDataRouter);
    console.log('Test data routes registered');
  } catch (error) {
    console.error('Failed to register test data routes:', error);
  }

  // Serve index.html for all other routes (SPA support)
  app.use((req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile('index.html', { root: 'public' });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function startServer(port: number = 3000): Server {
  const app = createServer();
  const httpServer = createHttpServer(app);
  
  // Set up WebSocket server for voice notes
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/voice-notes'
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
