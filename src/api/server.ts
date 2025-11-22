import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import auditRouter from './routes/audit';
import contactsRouter from './routes/contacts';
import suggestionsRouter from './routes/suggestions';
import calendarRouter from './routes/calendar';
import voiceNotesRouter from './routes/voice-notes';
import preferencesRouter from './routes/preferences';
import accountRouter from './routes/account';
import { apiRateLimiter } from '../utils/rate-limiter';
import { enforceHttps, securityHeaders } from './middleware/security';

export function createServer(): Express {
  const app = express();

  // Security middleware
  app.use(enforceHttps);
  app.use(securityHeaders);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory
  app.use(express.static('public'));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint (no rate limiting)
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiRateLimiter());

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/suggestions', suggestionsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/voice-notes', voiceNotesRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/account', accountRouter);

  // Serve index.html for all other routes (SPA support)
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile('index.html', { root: 'public' });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createServer();
  
  app.listen(port, () => {
    console.log(`CatchUp API server listening on port ${port}`);
  });
}
