/**
 * Token Health Notification Service Tests
 * 
 * Tests for notification creation, retrieval, and management.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import pool from '../db/connection';
import { TokenHealthNotificationService } from './token-health-notification-service';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const notificationService = new TokenHealthNotificationService();

describe('Token Health Notification Service', () => {
  beforeEach(async () => {
    // Create test user
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, auth_provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_id = EXCLUDED.google_id`,
      [TEST_USER_ID, uniqueEmail, 'Test User', 'test-google-id', 'google']
    );
  });

  afterEach(async () => {
    // Cleanup
    await pool.query('DELETE FROM token_health_notifications WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('createNotification', () => {
    it('should create token_invalid notification with correct template', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      expect(notification.userId).toBe(TEST_USER_ID);
      expect(notification.integrationType).toBe('google_contacts');
      expect(notification.notificationType).toBe('token_invalid');
      expect(notification.message).toContain('Google Contacts');
      expect(notification.message).toContain('disconnected');
      expect(notification.reAuthLink).toContain('/api/contacts/google/authorize');
      expect(notification.resolvedAt).toBeNull();
    });

    it('should create token_expiring_soon notification with correct template', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_calendar',
        'token_expiring_soon'
      );

      expect(notification.userId).toBe(TEST_USER_ID);
      expect(notification.integrationType).toBe('google_calendar');
      expect(notification.notificationType).toBe('token_expiring_soon');
      expect(notification.message).toContain('Google Calendar');
      expect(notification.message).toContain('expire soon');
      expect(notification.reAuthLink).toContain('/api/calendar/google/authorize');
      expect(notification.resolvedAt).toBeNull();
    });

    it('should include integration type in notification message', async () => {
      const contactsNotification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      const calendarNotification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_calendar',
        'token_invalid'
      );

      expect(contactsNotification.message).toContain('Google Contacts');
      expect(calendarNotification.message).toContain('Google Calendar');
    });

    it('should not create duplicate notifications for same user and integration', async () => {
      // Create first notification
      const first = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      // Try to create second notification
      const second = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_expiring_soon'
      );

      // Should update existing notification, not create new one
      expect(second.id).toBe(first.id);
      expect(second.notificationType).toBe('token_expiring_soon');
    });
  });

  describe('getUnresolvedNotification', () => {
    it('should return null when no unresolved notifications exist', async () => {
      const notification = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(notification).toBeNull();
    });

    it('should return unresolved notification', async () => {
      await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      const notification = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(notification).not.toBeNull();
      expect(notification!.resolvedAt).toBeNull();
    });

    it('should not return resolved notifications', async () => {
      await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      await notificationService.resolveNotifications(TEST_USER_ID, 'google_contacts');

      const notification = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(notification).toBeNull();
    });
  });

  describe('getNotificationsNeedingReminders', () => {
    it('should return notifications older than 7 days without reminders', async () => {
      // Create notification and backdate it
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      // Backdate the notification to 8 days ago
      await pool.query(
        `UPDATE token_health_notifications 
         SET created_at = NOW() - INTERVAL '8 days'
         WHERE id = $1`,
        [notification.id]
      );

      const needingReminders = await notificationService.getNotificationsNeedingReminders();

      expect(needingReminders.length).toBeGreaterThan(0);
      expect(needingReminders.some(n => n.id === notification.id)).toBe(true);
    });

    it('should not return notifications less than 7 days old', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      const needingReminders = await notificationService.getNotificationsNeedingReminders();

      expect(needingReminders.some(n => n.id === notification.id)).toBe(false);
    });

    it('should not return notifications that already have reminders sent', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      // Backdate and mark reminder sent
      await pool.query(
        `UPDATE token_health_notifications 
         SET created_at = NOW() - INTERVAL '8 days',
             reminder_sent_at = NOW()
         WHERE id = $1`,
        [notification.id]
      );

      const needingReminders = await notificationService.getNotificationsNeedingReminders();

      expect(needingReminders.some(n => n.id === notification.id)).toBe(false);
    });

    it('should not return resolved notifications', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      // Backdate and resolve
      await pool.query(
        `UPDATE token_health_notifications 
         SET created_at = NOW() - INTERVAL '8 days',
             resolved_at = NOW()
         WHERE id = $1`,
        [notification.id]
      );

      const needingReminders = await notificationService.getNotificationsNeedingReminders();

      expect(needingReminders.some(n => n.id === notification.id)).toBe(false);
    });
  });

  describe('markReminderSent', () => {
    it('should mark reminder as sent', async () => {
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      await notificationService.markReminderSent(notification.id);

      const updated = await notificationService.getNotificationById(notification.id);

      expect(updated!.reminderSentAt).not.toBeNull();
    });
  });

  describe('resolveNotifications', () => {
    it('should resolve all unresolved notifications for user and integration', async () => {
      await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      const resolvedCount = await notificationService.resolveNotifications(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(resolvedCount).toBe(1);

      const unresolved = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(unresolved).toBeNull();
    });

    it('should not resolve notifications for different integration', async () => {
      await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      await notificationService.createNotification(
        TEST_USER_ID,
        'google_calendar',
        'token_invalid'
      );

      await notificationService.resolveNotifications(TEST_USER_ID, 'google_contacts');

      const contactsUnresolved = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_contacts'
      );

      const calendarUnresolved = await notificationService.getUnresolvedNotification(
        TEST_USER_ID,
        'google_calendar'
      );

      expect(contactsUnresolved).toBeNull();
      expect(calendarUnresolved).not.toBeNull();
    });

    it('should return count of resolved notifications', async () => {
      await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      const count = await notificationService.resolveNotifications(
        TEST_USER_ID,
        'google_contacts'
      );

      expect(count).toBe(1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 16: Notification creation on token failure
     * For any token health status change to "expired" or "revoked", 
     * a notification should be created for the user with type "token_invalid".
     */
    it('Property 16: should create notification on token failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType: 'google_contacts' | 'google_calendar') => {
            // Create notification for token failure
            const notification = await notificationService.createNotification(
              TEST_USER_ID,
              integrationType,
              'token_invalid'
            );

            // Verify notification was created
            expect(notification).toBeDefined();
            expect(notification.userId).toBe(TEST_USER_ID);
            expect(notification.integrationType).toBe(integrationType);
            expect(notification.notificationType).toBe('token_invalid');
            expect(notification.resolvedAt).toBeNull();

            // Cleanup
            await pool.query('DELETE FROM token_health_notifications WHERE id = $1', [notification.id]);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 17: Notification completeness
     * For any token-related notification, it should include both a re-authentication 
     * link and the specific integration type affected.
     */
    it('Property 17: should include re-auth link and integration type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          fc.constantFrom('token_invalid', 'token_expiring_soon'),
          async (
            integrationType: 'google_contacts' | 'google_calendar',
            notificationType: 'token_invalid' | 'token_expiring_soon'
          ) => {
            const notification = await notificationService.createNotification(
              TEST_USER_ID,
              integrationType,
              notificationType
            );

            // Verify re-auth link is present
            expect(notification.reAuthLink).toBeDefined();
            expect(notification.reAuthLink).toContain('/api/');
            expect(notification.reAuthLink).toContain('/google/');

            // Verify integration type is in message
            const integrationName = integrationType === 'google_contacts' 
              ? 'Google Contacts' 
              : 'Google Calendar';
            expect(notification.message).toContain(integrationName);

            // Cleanup
            await pool.query('DELETE FROM token_health_notifications WHERE id = $1', [notification.id]);
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Property 18: Notification reminders
     * For any user with an unresolved token_invalid notification older than 7 days, 
     * a reminder notification should be created.
     */
    it('Property 18: should identify notifications needing reminders', async () => {
      // Create notification and backdate it
      const notification = await notificationService.createNotification(
        TEST_USER_ID,
        'google_contacts',
        'token_invalid'
      );

      await pool.query(
        `UPDATE token_health_notifications 
         SET created_at = NOW() - INTERVAL '8 days'
         WHERE id = $1`,
        [notification.id]
      );

      // Get notifications needing reminders
      const needingReminders = await notificationService.getNotificationsNeedingReminders();

      // Verify this notification is in the list
      expect(needingReminders.some(n => n.id === notification.id)).toBe(true);
      expect(needingReminders.find(n => n.id === notification.id)!.reminderSentAt).toBeNull();
    });

    /**
     * Property 19: Notification cleanup
     * For any user who successfully re-authenticates, all token_invalid notifications 
     * for that integration type should be marked as resolved or deleted.
     */
    it('Property 19: should cleanup notifications on re-authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('google_contacts', 'google_calendar'),
          async (integrationType: 'google_contacts' | 'google_calendar') => {
            // Create notification
            await notificationService.createNotification(
              TEST_USER_ID,
              integrationType,
              'token_invalid'
            );

            // Verify unresolved notification exists
            const beforeReauth = await notificationService.getUnresolvedNotification(
              TEST_USER_ID,
              integrationType
            );
            expect(beforeReauth).not.toBeNull();

            // Simulate re-authentication by resolving notifications
            await notificationService.resolveNotifications(TEST_USER_ID, integrationType);

            // Verify no unresolved notifications remain
            const afterReauth = await notificationService.getUnresolvedNotification(
              TEST_USER_ID,
              integrationType
            );
            expect(afterReauth).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
