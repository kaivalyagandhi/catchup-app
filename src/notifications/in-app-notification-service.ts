/**
 * In-App Notification Service
 *
 * Provides CRUD operations for in-app notifications and a delivery channel
 * abstraction so email/push channels can be added later.
 *
 * Requirements: 26.1, 26.4, 26.8
 */

import type { Pool } from 'pg';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationEventType =
  | 'import_complete'
  | 'import_failed'
  | 'ai_enrichment_ready'
  | 'export_reminder'
  | 'sync_conflict'
  | 'pending_enrichments_reminder';

export interface InAppNotification {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  description: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Delivery channel abstraction (Req 26.8).
 * In-app is the first implementation; email/push can be added later.
 */
export interface NotificationChannel {
  send(userId: string, notification: InAppNotification): Promise<void>;
}

export interface InAppNotificationService {
  create(
    userId: string,
    eventType: NotificationEventType,
    title: string,
    description: string,
    actionUrl?: string,
  ): Promise<InAppNotification>;
  getUnread(userId: string): Promise<InAppNotification[]>;
  getAll(userId: string, limit?: number, offset?: number): Promise<InAppNotification[]>;
  markAsRead(userId: string, notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  deleteOlderThan(days: number): Promise<number>;
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function rowToNotification(row: any): InAppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as NotificationEventType,
    title: row.title,
    description: row.description || '',
    actionUrl: row.action_url || undefined,
    read: row.read,
    createdAt: new Date(row.created_at),
  };
}

// ─── In-App Channel ──────────────────────────────────────────────────────────

/**
 * In-app notification channel — stores notifications in the database.
 * This is the default (and currently only) channel.
 */
export class InAppChannel implements NotificationChannel {
  constructor(private db: Pool) {}

  async send(_userId: string, _notification: InAppNotification): Promise<void> {
    // The notification is already persisted by the service's create() method.
    // This channel is a no-op beyond persistence. Future channels (email, push)
    // would perform their delivery here.
  }
}

// ─── Service Implementation ──────────────────────────────────────────────────

export class InAppNotificationServiceImpl implements InAppNotificationService {
  private channels: NotificationChannel[] = [];

  constructor(private db: Pool) {
    // Register the default in-app channel
    this.channels.push(new InAppChannel(db));
  }

  /** Register an additional delivery channel (email, push, etc.) */
  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  async create(
    userId: string,
    eventType: NotificationEventType,
    title: string,
    description: string,
    actionUrl?: string,
  ): Promise<InAppNotification> {
    const { rows } = await this.db.query(
      `INSERT INTO in_app_notifications (user_id, event_type, title, description, action_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, eventType, title, description, actionUrl || null],
    );

    const notification = rowToNotification(rows[0]);

    // Fan-out to all registered channels
    for (const channel of this.channels) {
      try {
        await channel.send(userId, notification);
      } catch (err) {
        console.error(`[Notifications] Channel delivery failed:`, err);
      }
    }

    return notification;
  }

  async getUnread(userId: string): Promise<InAppNotification[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM in_app_notifications
       WHERE user_id = $1 AND read = FALSE
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(rowToNotification);
  }

  async getAll(userId: string, limit = 20, offset = 0): Promise<InAppNotification[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM in_app_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows.map(rowToNotification);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const { rowCount } = await this.db.query(
      `UPDATE in_app_notifications SET read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
    if (rowCount === 0) {
      throw new Error('Notification not found');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE in_app_notifications SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM in_app_notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
    return rows[0].count;
  }

  async deleteOlderThan(days: number): Promise<number> {
    const { rowCount } = await this.db.query(
      `DELETE FROM in_app_notifications
       WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [days],
    );
    return rowCount ?? 0;
  }
}

// ─── Singleton factory ───────────────────────────────────────────────────────

let _instance: InAppNotificationServiceImpl | null = null;

export function getNotificationService(db: Pool): InAppNotificationServiceImpl {
  if (!_instance) {
    _instance = new InAppNotificationServiceImpl(db);
  }
  return _instance;
}

/** Reset singleton — for testing only */
export function resetNotificationService(): void {
  _instance = null;
}
