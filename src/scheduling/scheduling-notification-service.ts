/**
 * Scheduling Notification Service
 *
 * Business logic for scheduling notifications.
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import * as notificationRepository from './notification-repository';
import * as schedulingRepository from './scheduling-repository';
import { SchedulingNotification, SchedulingNotificationType } from '../types/scheduling';

/**
 * Notify plan initiator when an invitee submits availability
 */
export async function notifyAvailabilitySubmitted(
  planId: string,
  inviteeName: string
): Promise<SchedulingNotification> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const message = `${inviteeName} has submitted their availability for your catchup plan.`;

  return notificationRepository.createNotification({
    userId: plan.userId,
    planId,
    type: 'availability_submitted',
    message,
  });
}

/**
 * Notify plan initiator when all must-attend invitees have responded
 */
export async function notifyPlanReady(planId: string): Promise<SchedulingNotification> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const activityLabel = plan.activityType || 'catchup';
  const message = `All required participants have responded! Your ${activityLabel} plan is ready to finalize.`;

  return notificationRepository.createNotification({
    userId: plan.userId,
    planId,
    type: 'plan_ready',
    message,
  });
}

/**
 * Notify all participants when a plan is finalized
 */
export async function notifyPlanFinalized(planId: string): Promise<void> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const activityLabel = plan.activityType || 'catchup';
  const timeStr = plan.finalizedTime
    ? new Date(plan.finalizedTime).toLocaleString()
    : 'TBD';

  // Notify the plan initiator
  await notificationRepository.createNotification({
    userId: plan.userId,
    planId,
    type: 'plan_finalized',
    message: `Your ${activityLabel} has been scheduled for ${timeStr}.`,
  });

  // Note: We don't notify invitees via in-app notifications since they may not have accounts
  // The initiator is expected to share the finalized time via their preferred messaging app
}

/**
 * Notify participants when a plan is cancelled
 */
export async function notifyPlanCancelled(planId: string): Promise<void> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  const activityLabel = plan.activityType || 'catchup';

  // Notify the plan initiator
  await notificationRepository.createNotification({
    userId: plan.userId,
    planId,
    type: 'plan_cancelled',
    message: `Your ${activityLabel} plan has been cancelled.`,
  });
}

/**
 * Create a reminder notification
 */
export async function createReminderNotification(
  planId: string,
  userId: string,
  message: string
): Promise<SchedulingNotification> {
  return notificationRepository.createNotification({
    userId,
    planId,
    type: 'reminder_sent',
    message,
  });
}

/**
 * Get notifications for a user
 */
export async function getNotificationsByUser(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<SchedulingNotification[]> {
  return notificationRepository.getNotificationsByUser(userId, options);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  return notificationRepository.markAsRead(notificationId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  return notificationRepository.markAllAsRead(userId);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return notificationRepository.getUnreadCount(userId);
}
