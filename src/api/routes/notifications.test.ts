/**
 * Tests for Notification API Routes
 *
 * Tests GET /api/notifications, GET /api/notifications/unread-count,
 * POST /api/notifications/:id/read, POST /api/notifications/mark-all-read.
 *
 * Requirements: 26.1, 26.2, 26.5, 26.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import notificationsRouter from './notifications';
import { resetNotificationService } from '../../notifications/in-app-notification-service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the auth middleware to inject userId
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return _res.status(401).json({ error: 'No authorization header provided' });
    }
    req.userId = 'test-user-id';
    next();
  },
  AuthenticatedRequest: {},
}));

// Mock the database pool
const mockQuery = vi.fn();
vi.mock('../../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

// ─── App setup ───────────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', notificationsRouter);
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNotifRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'notif-1',
    user_id: 'test-user-id',
    event_type: 'import_complete',
    title: 'Import done',
    description: 'Your import finished',
    action_url: '/imports/123',
    read: false,
    created_at: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  };
}

const AUTH_HEADER = 'Bearer test-token';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Notification API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    resetNotificationService();
    mockQuery.mockReset();
    app = createApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return paginated notifications', async () => {
      const rows = [
        makeNotifRow({ id: 'n1' }),
        makeNotifRow({ id: 'n2', read: true }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.limit).toBe(20);
      expect(res.body.offset).toBe(0);
    });

    it('should respect limit and offset query params', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/notifications?limit=5&offset=10')
        .set('Authorization', AUTH_HEADER);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['test-user-id', 5, 10],
      );
    });

    it('should cap limit at 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/notifications?limit=500')
        .set('Authorization', AUTH_HEADER);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['test-user-id', 100, 0],
      );
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return the unread count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(5);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/notifications/notif-1/read')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if notification not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app)
        .post('/api/notifications/bad-id/read')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Notification not found');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/notifications/notif-1/read');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 3 });

      const res = await request(app)
        .post('/api/notifications/mark-all-read')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/notifications/mark-all-read');
      expect(res.status).toBe(401);
    });
  });
});
