/**
 * Token Health Notification Service
 * 
 * Manages notifications for OAuth token health issues.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */

import pool from '../db/connection';

export interface TokenHealthNotification {
  id: string;
  userId: string;
  integrationType: 'google_contacts' | 'google_calendar';
  notificationType: 'token_invalid' | 'token_expiring_soon';
  message: string;
  reAuthLink: string;
  resolvedAt: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  subject: string;
  message: string;
}

/**
 * Token Health Notification Service
 */
export class TokenHealthNotificationService {
  /**
   * Generate re-authentication link for an integration
   */
  private generateReAuthLink(integrationType: 'google_contacts' | 'google_calendar'): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    
    if (integrationType === 'google_contacts') {
      return `${baseUrl}/api/contacts/google/authorize`;
    } else {
      return `${baseUrl}/api/calendar/google/authorize`;
    }
  }

  /**
   * Get notification template for token invalid
   * Requirements: 4.1, 4.2, 4.6
   */
  private getTokenInvalidTemplate(integrationType: 'google_contacts' | 'google_calendar'): NotificationTemplate {
    const integrationName = integrationType === 'google_contacts' ? 'Google Contacts' : 'Google Calendar';
    
    return {
      subject: `${integrationName} Connection Needs Attention`,
      message: `Your ${integrationName} connection has been disconnected and needs to be reconnected. ` +
               `This may be because you revoked access or your authorization expired. ` +
               `Please reconnect to continue syncing your ${integrationType === 'google_contacts' ? 'contacts' : 'calendar'}.`
    };
  }

  /**
   * Get notification template for token expiring soon
   * Requirements: 4.1, 4.2, 4.6
   */
  private getTokenExpiringSoonTemplate(integrationType: 'google_contacts' | 'google_calendar'): NotificationTemplate {
    const integrationName = integrationType === 'google_contacts' ? 'Google Contacts' : 'Google Calendar';
    
    return {
      subject: `${integrationName} Connection Expiring Soon`,
      message: `Your ${integrationName} connection will expire soon. ` +
               `To ensure uninterrupted syncing, please reconnect your account.`
    };
  }

  /**
   * Create a notification for token issues
   * Requirements: 4.1, 4.2, 4.6
   */
  async createNotification(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar',
    notificationType: 'token_invalid' | 'token_expiring_soon'
  ): Promise<TokenHealthNotification> {
    // Get template
    const template = notificationType === 'token_invalid'
      ? this.getTokenInvalidTemplate(integrationType)
      : this.getTokenExpiringSoonTemplate(integrationType);

    // Generate re-auth link
    const reAuthLink = this.generateReAuthLink(integrationType);

    // Check if unresolved notification already exists
    const existing = await this.getUnresolvedNotification(userId, integrationType);
    if (existing) {
      // Update existing notification instead of creating duplicate
      return this.updateNotification(existing.id, notificationType, template.message);
    }

    // Create new notification
    const result = await pool.query(
      `INSERT INTO token_health_notifications 
       (user_id, integration_type, notification_type, message, re_auth_link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, integrationType, notificationType, template.message, reAuthLink]
    );

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Update an existing notification
   */
  private async updateNotification(
    notificationId: string,
    notificationType: 'token_invalid' | 'token_expiring_soon',
    message: string
  ): Promise<TokenHealthNotification> {
    const result = await pool.query(
      `UPDATE token_health_notifications 
       SET notification_type = $1, message = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [notificationType, message, notificationId]
    );

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Get unresolved notification for user and integration
   */
  async getUnresolvedNotification(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<TokenHealthNotification | null> {
    const result = await pool.query(
      `SELECT * FROM token_health_notifications
       WHERE user_id = $1 AND integration_type = $2 AND resolved_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, integrationType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Get all unresolved notifications for a user
   */
  async getUnresolvedNotifications(userId: string): Promise<TokenHealthNotification[]> {
    const result = await pool.query(
      `SELECT * FROM token_health_notifications
       WHERE user_id = $1 AND resolved_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Get notifications needing reminders (unresolved and older than 7 days)
   * Requirements: 4.3
   */
  async getNotificationsNeedingReminders(): Promise<TokenHealthNotification[]> {
    const result = await pool.query(
      `SELECT * FROM token_health_notifications
       WHERE resolved_at IS NULL 
       AND reminder_sent_at IS NULL
       AND created_at < NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC`
    );

    return result.rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Mark reminder as sent
   * Requirements: 4.3
   */
  async markReminderSent(notificationId: string): Promise<void> {
    await pool.query(
      `UPDATE token_health_notifications 
       SET reminder_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  }

  /**
   * Resolve all notifications for a user and integration (on re-authentication)
   * Requirements: 4.4
   */
  async resolveNotifications(
    userId: string,
    integrationType: 'google_contacts' | 'google_calendar'
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE token_health_notifications 
       SET resolved_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND integration_type = $2 AND resolved_at IS NULL`,
      [userId, integrationType]
    );

    return result.rowCount || 0;
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string): Promise<TokenHealthNotification | null> {
    const result = await pool.query(
      `SELECT * FROM token_health_notifications WHERE id = $1`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Map database row to TokenHealthNotification
   */
  private mapRowToNotification(row: any): TokenHealthNotification {
    return {
      id: row.id,
      userId: row.user_id,
      integrationType: row.integration_type,
      notificationType: row.notification_type,
      message: row.message,
      reAuthLink: row.re_auth_link,
      resolvedAt: row.resolved_at,
      reminderSentAt: row.reminder_sent_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const tokenHealthNotificationService = new TokenHealthNotificationService();
