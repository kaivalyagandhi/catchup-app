/**
 * Tests for InAppNotificationService
 *
 * Unit tests for create, getUnread, getAll, markAsRead, markAllAsRead,
 * getUnreadCount, deleteOlderThan, and the NotificationChannel abstraction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import {
  InAppNotificationServiceImpl,
  InAppChannel,
  type NotificationChannel,
  type InAppNotification,
  type NotificationEventType,
  resetNotificationService,
} from './in-app-notification-service';

// ─── Mock pool helper ────────────────────────────────────────────────────────

function createMockPool() {
  return {
    query: vi.fn(),
  } as unknown as Pool;
}

function makeRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'notif-1',
    user_id: 'user-1',
    event_type: 'import_complete',
    title: 'Import done',
    description: 'Your import finished',
    action_url: '/imports/123',
    read: false,
    created_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InAppNotificationServiceImpl', () => {
  let pool: Pool;
  let svc: InAppNotificationServiceImpl;

  beforeEach(() => {
    resetNotificationService();
    pool = createMockPool();
    svc = new InAppNotificationServiceImpl(pool);
  });

  describe('create', () => {
    it('should insert a notification and return the mapped object', async () => {
      const row = makeRow();
      (pool.query as any).mockResolvedValueOnce({ rows: [row] });

      const result = await svc.create(
        'user-1',
        'import_complete',
        'Import done',
        'Your import finished',
        '/imports/123',
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO in_app_notifications'),
        ['user-1', 'import_complete', 'Import done', 'Your import finished', '/imports/123'],
      );
      expect(result).toEqual({
        id: 'notif-1',
        userId: 'user-1',
        eventType: 'import_complete',
        title: 'Import done',
        description: 'Your import finished',
        actionUrl: '/imports/123',
        read: false,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });
    });

    it('should pass null for actionUrl when not provided', async () => {
      const row = makeRow({ action_url: null });
      (pool.query as any).mockResolvedValueOnce({ rows: [row] });

      const result = await svc.create('user-1', 'import_failed', 'Failed', 'Oops');

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 'import_failed', 'Failed', 'Oops', null],
      );
      expect(result.actionUrl).toBeUndefined();
    });

    it('should fan out to all registered channels', async () => {
      const row = makeRow();
      (pool.query as any).mockResolvedValueOnce({ rows: [row] });

      const mockChannel: NotificationChannel = { send: vi.fn().mockResolvedValue(undefined) };
      svc.addChannel(mockChannel);

      await svc.create('user-1', 'import_complete', 'Done', 'Desc');

      // Default InAppChannel + our mock
      expect(mockChannel.send).toHaveBeenCalledOnce();
      expect(mockChannel.send).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'notif-1' }));
    });

    it('should not throw if a channel fails', async () => {
      const row = makeRow();
      (pool.query as any).mockResolvedValueOnce({ rows: [row] });

      const failingChannel: NotificationChannel = {
        send: vi.fn().mockRejectedValue(new Error('channel down')),
      };
      svc.addChannel(failingChannel);

      // Should not throw
      const result = await svc.create('user-1', 'import_complete', 'Done', 'Desc');
      expect(result.id).toBe('notif-1');
    });
  });

  describe('getUnread', () => {
    it('should return unread notifications sorted by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'n2', read: false, created_at: new Date('2025-01-02') }),
        makeRow({ id: 'n1', read: false, created_at: new Date('2025-01-01') }),
      ];
      (pool.query as any).mockResolvedValueOnce({ rows });

      const result = await svc.getUnread('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = FALSE'),
        ['user-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('n2');
    });
  });

  describe('getAll', () => {
    it('should return paginated notifications with defaults', async () => {
      (pool.query as any).mockResolvedValueOnce({ rows: [makeRow()] });

      await svc.getAll('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-1', 20, 0],
      );
    });

    it('should respect custom limit and offset', async () => {
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      await svc.getAll('user-1', 5, 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 5, 10],
      );
    });
  });

  describe('markAsRead', () => {
    it('should update the notification to read', async () => {
      (pool.query as any).mockResolvedValueOnce({ rowCount: 1 });

      await svc.markAsRead('user-1', 'notif-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET read = TRUE'),
        ['notif-1', 'user-1'],
      );
    });

    it('should throw if notification not found', async () => {
      (pool.query as any).mockResolvedValueOnce({ rowCount: 0 });

      await expect(svc.markAsRead('user-1', 'bad-id')).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      (pool.query as any).mockResolvedValueOnce({ rowCount: 5 });

      await svc.markAllAsRead('user-1');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('read = FALSE'),
        ['user-1'],
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      (pool.query as any).mockResolvedValueOnce({ rows: [{ count: 7 }] });

      const count = await svc.getUnreadCount('user-1');

      expect(count).toBe(7);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete notifications older than the given days', async () => {
      (pool.query as any).mockResolvedValueOnce({ rowCount: 3 });

      const deleted = await svc.deleteOlderThan(30);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 day' * $1"),
        [30],
      );
      expect(deleted).toBe(3);
    });

    it('should return 0 when no rows deleted', async () => {
      (pool.query as any).mockResolvedValueOnce({ rowCount: 0 });

      const deleted = await svc.deleteOlderThan(30);
      expect(deleted).toBe(0);
    });
  });
});

describe('InAppChannel', () => {
  it('should implement NotificationChannel interface (no-op for in-app)', async () => {
    const pool = createMockPool();
    const channel = new InAppChannel(pool);

    // Should not throw
    await channel.send('user-1', {
      id: 'n1',
      userId: 'user-1',
      eventType: 'import_complete',
      title: 'Test',
      description: 'Test desc',
      read: false,
      createdAt: new Date(),
    });
  });
});
