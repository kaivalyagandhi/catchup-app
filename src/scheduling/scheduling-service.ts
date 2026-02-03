/**
 * Scheduling Service
 *
 * Business logic for catchup plan operations.
 * Requirements: 2.14, 2.15, 2.16, 2.17, 9.6, 9.7, 10.1, 12.1-12.8
 */

import { v4 as uuidv4 } from 'uuid';
import * as schedulingRepository from './scheduling-repository';
import * as inviteLinkService from './invite-link-service';
import * as notificationService from './scheduling-notification-service';
import {
  CatchupPlan,
  PlanStatus,
  CreatePlanData,
  CreatePlanResult,
  PlanFilters,
  FinalizePlanData,
  InviteLinkWithContact,
} from '../types/scheduling';

/**
 * Maximum allowed date range in days
 */
const MAX_DATE_RANGE_DAYS = 14;

/**
 * Create a new catchup plan
 */
export async function createPlan(data: CreatePlanData): Promise<CreatePlanResult> {
  // Validate date range
  validateDateRange(data.dateRangeStart, data.dateRangeEnd);

  // Validate invitees
  if (!data.invitees || data.invitees.length === 0) {
    throw new Error('At least one invitee is required');
  }

  // Create the plan
  const planId = uuidv4();
  const plan = await schedulingRepository.createPlan({
    id: planId,
    userId: data.userId,
    activityType: data.activityType,
    duration: data.duration,
    dateRangeStart: data.dateRangeStart,
    dateRangeEnd: data.dateRangeEnd,
    location: data.location,
    status: 'draft',
  });

  // Add invitees and generate invite links
  const inviteLinks: InviteLinkWithContact[] = [];
  for (const invitee of data.invitees) {
    const inviteeRecord = await schedulingRepository.addInvitee({
      planId,
      contactId: invitee.contactId,
      attendanceType: invitee.attendanceType,
    });

    // Generate invite link
    const link = await inviteLinkService.generateInviteLink(planId, invitee.contactId);
    inviteLinks.push({
      contactId: invitee.contactId,
      contactName: inviteeRecord.contactName,
      url: link.url || '',
      attendanceType: invitee.attendanceType,
    });
  }

  // Update status to collecting_availability
  await schedulingRepository.updatePlanStatus(planId, 'collecting_availability');

  // Fetch the updated plan with invitees
  const updatedPlan = await schedulingRepository.getPlanById(planId);
  if (!updatedPlan) {
    throw new Error('Failed to retrieve created plan');
  }

  return { plan: updatedPlan, inviteLinks };
}

/**
 * Get plans for a user with optional filters
 */
export async function getPlansByUser(
  userId: string,
  filters?: PlanFilters
): Promise<CatchupPlan[]> {
  return schedulingRepository.getPlansByUser(userId, filters);
}

/**
 * Get a plan by ID with ownership check
 */
export async function getPlanById(
  planId: string,
  userId: string
): Promise<CatchupPlan | null> {
  const plan = await schedulingRepository.getPlanById(planId);

  // Verify ownership
  if (plan && plan.userId !== userId) {
    return null;
  }

  return plan;
}


/**
 * Finalize a plan with selected time
 */
export async function finalizePlan(
  planId: string,
  userId: string,
  data: FinalizePlanData
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Plan is already finalized');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Cannot finalize a cancelled plan');
  }

  // Update plan with finalized details
  const updatedPlan = await schedulingRepository.finalizePlan(planId, {
    finalizedTime: data.finalizedTime,
    location: data.location || plan.location,
    notes: data.notes,
    status: 'scheduled',
  });

  // Notify all participants
  await notificationService.notifyPlanFinalized(planId);

  return updatedPlan;
}

/**
 * Cancel a plan
 */
export async function cancelPlan(planId: string, userId: string): Promise<void> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Plan is already cancelled');
  }

  // Update status
  await schedulingRepository.updatePlanStatus(planId, 'cancelled');

  // Invalidate all invite links
  await inviteLinkService.invalidateLinksForPlan(planId);

  // Notify participants
  await notificationService.notifyPlanCancelled(planId);
}

/**
 * Update a plan (before finalization)
 */
export async function updatePlan(
  planId: string,
  userId: string,
  updates: Partial<CreatePlanData>
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Cannot edit a finalized plan');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Cannot edit a cancelled plan');
  }

  // Validate date range if being updated
  if (updates.dateRangeStart || updates.dateRangeEnd) {
    const startDate = updates.dateRangeStart || plan.dateRangeStart;
    const endDate = updates.dateRangeEnd || plan.dateRangeEnd;
    validateDateRange(startDate, endDate);
  }

  return schedulingRepository.updatePlan(planId, {
    activityType: updates.activityType,
    duration: updates.duration,
    dateRangeStart: updates.dateRangeStart,
    dateRangeEnd: updates.dateRangeEnd,
    location: updates.location,
  });
}

/**
 * Extend the date range of a plan
 */
export async function extendDateRange(
  planId: string,
  userId: string,
  newEndDate: string
): Promise<CatchupPlan> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed' || plan.status === 'cancelled') {
    throw new Error('Cannot extend date range for this plan');
  }

  validateDateRange(plan.dateRangeStart, newEndDate);

  return schedulingRepository.updatePlan(planId, { dateRangeEnd: newEndDate });
}

/**
 * Check if a plan is ready to be finalized (all must-attend have responded)
 */
export async function checkPlanReady(planId: string): Promise<boolean> {
  return schedulingRepository.checkAllMustAttendResponded(planId);
}

/**
 * Add an invitee to an existing plan
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
export async function addInviteeToPlan(
  planId: string,
  userId: string,
  inviteeData: { contactId: string; attendanceType: 'must_attend' | 'nice_to_have' }
): Promise<InviteLinkWithContact> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Cannot edit a finalized plan');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Cannot edit a cancelled plan');
  }

  // Check if invitee already exists
  const existingInvitee = plan.invitees.find(i => i.contactId === inviteeData.contactId);
  if (existingInvitee) {
    throw new Error('Contact is already an invitee');
  }

  // Add the invitee
  const inviteeRecord = await schedulingRepository.addInvitee({
    planId,
    contactId: inviteeData.contactId,
    attendanceType: inviteeData.attendanceType,
  });

  // Generate invite link for the new invitee
  const link = await inviteLinkService.generateInviteLink(planId, inviteeData.contactId);

  return {
    contactId: inviteeData.contactId,
    contactName: inviteeRecord.contactName,
    url: link.url || '',
    attendanceType: inviteeData.attendanceType,
  };
}

/**
 * Remove an invitee from an existing plan
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
export async function removeInviteeFromPlan(
  planId: string,
  userId: string,
  contactId: string
): Promise<void> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Cannot edit a finalized plan');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Cannot edit a cancelled plan');
  }

  // Check if invitee exists
  const existingInvitee = plan.invitees.find(i => i.contactId === contactId);
  if (!existingInvitee) {
    throw new Error('Invitee not found');
  }

  // Ensure at least one invitee remains
  if (plan.invitees.length <= 1) {
    throw new Error('Cannot remove the last invitee');
  }

  // Remove the invitee
  await schedulingRepository.removeInvitee(planId, contactId);

  // Invalidate their invite link
  await inviteLinkService.invalidateLinkForInvitee(planId, contactId);
}

/**
 * Update an invitee's attendance type
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
export async function updateInviteeAttendance(
  planId: string,
  userId: string,
  contactId: string,
  attendanceType: 'must_attend' | 'nice_to_have'
): Promise<void> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status === 'scheduled' || plan.status === 'completed') {
    throw new Error('Cannot edit a finalized plan');
  }

  if (plan.status === 'cancelled') {
    throw new Error('Cannot edit a cancelled plan');
  }

  // Check if invitee exists
  const existingInvitee = plan.invitees.find(i => i.contactId === contactId);
  if (!existingInvitee) {
    throw new Error('Invitee not found');
  }

  await schedulingRepository.updateInviteeAttendance(planId, contactId, attendanceType);
}

/**
 * Update plan status to ready_to_schedule if all must-attend have responded
 */
export async function updatePlanReadyStatus(planId: string): Promise<void> {
  const isReady = await checkPlanReady(planId);
  if (isReady) {
    const plan = await schedulingRepository.getPlanById(planId);
    if (plan && plan.status === 'collecting_availability') {
      await schedulingRepository.updatePlanStatus(planId, 'ready_to_schedule');
      await notificationService.notifyPlanReady(planId);
    }
  }
}

/**
 * Get archived plans for a user
 * Requirements: 10.10 - Show archived plans in Past filter
 */
export async function getArchivedPlans(userId: string): Promise<CatchupPlan[]> {
  return schedulingRepository.getArchivedPlansByUser(userId);
}

/**
 * Auto-archive old plans (completed/scheduled more than 7 days ago)
 * Requirements: 10.10 - Auto-archive completed plans after 7 days
 * This should be called periodically (e.g., on page load or via cron job)
 */
export async function autoArchiveOldPlans(): Promise<number> {
  return schedulingRepository.autoArchiveOldPlans();
}

/**
 * Manually archive a plan
 * Requirements: 10.10 - Allow manual archiving
 */
export async function archivePlan(planId: string, userId: string): Promise<void> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Only allow archiving completed or scheduled plans
  if (plan.status !== 'completed' && plan.status !== 'scheduled' && plan.status !== 'cancelled') {
    throw new Error('Only completed, scheduled, or cancelled plans can be archived');
  }

  await schedulingRepository.manualArchivePlan(planId);
}

/**
 * Unarchive a plan (restore from archive)
 * Requirements: 10.10 - Allow restoring archived plans
 */
export async function unarchivePlan(planId: string, userId: string): Promise<void> {
  // For unarchive, we need to check ownership differently since archived plans
  // are excluded from normal getPlanById
  const archivedPlans = await schedulingRepository.getArchivedPlansByUser(userId);
  const plan = archivedPlans.find(p => p.id === planId);

  if (!plan) {
    throw new Error('Archived plan not found');
  }

  await schedulingRepository.unarchivePlan(planId);
}

/**
 * Send reminders to pending invitees
 * Requirements: 12.5 - Initiator can send reminders to invitees who haven't responded
 */
export async function sendReminders(
  planId: string,
  userId: string
): Promise<{ remindersSent: number; pendingInvitees: string[] }> {
  const plan = await getPlanById(planId, userId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (plan.status !== 'collecting_availability' && plan.status !== 'draft') {
    throw new Error('Reminders can only be sent for plans that are collecting availability');
  }

  // Check if reminders were sent recently (within last hour) to prevent spam
  const lastReminderSent = await schedulingRepository.getLastReminderSent(planId);
  if (lastReminderSent) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastReminderSent > hourAgo) {
      const minutesRemaining = Math.ceil((lastReminderSent.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);
      throw new Error(`Please wait ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} before sending reminders again`);
    }
  }

  // Get pending invitees
  const pendingInvitees = await schedulingRepository.getPendingInvitees(planId);

  if (pendingInvitees.length === 0) {
    throw new Error('All invitees have already responded');
  }

  // Create reminder notifications for the plan initiator (to track that reminders were sent)
  const pendingNames = pendingInvitees.map(inv => inv.contactName);
  const activityLabel = plan.activityType || 'catchup';
  const message = `Reminders sent to ${pendingInvitees.length} pending invitee${pendingInvitees.length !== 1 ? 's' : ''} for your ${activityLabel} plan: ${pendingNames.join(', ')}`;

  await notificationService.createReminderNotification(planId, userId, message);

  // Update last reminder sent timestamp
  await schedulingRepository.updateLastReminderSent(planId);

  return {
    remindersSent: pendingInvitees.length,
    pendingInvitees: pendingNames,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate date range constraints
 */
function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff > MAX_DATE_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
  }

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }
}
