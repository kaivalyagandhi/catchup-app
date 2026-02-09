/**
 * Availability Collection Service
 *
 * Business logic for collecting and managing availability.
 * Requirements: 4.10, 5.2, 5.3, 6.3, 6.4, 6.5
 */

import * as availabilityRepository from './availability-repository';
import * as schedulingRepository from './scheduling-repository';
import * as inviteLinkService from './invite-link-service';
import * as notificationService from './scheduling-notification-service';
import * as schedulingService from './scheduling-service';
import {
  InviteeAvailability,
  InitiatorAvailability,
  SubmitAvailabilityData,
  SlotOverlap,
  AvailableParticipant,
  PublicPlanInfo,
} from '../types/scheduling';

/**
 * Submit availability for an invitee (via public link)
 */
export async function submitAvailability(
  token: string,
  data: SubmitAvailabilityData
): Promise<InviteeAvailability> {
  // Validate the invite link
  const validation = await inviteLinkService.validateInviteLink(token);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid invite link');
  }

  const { planId, contactId } = validation;
  if (!planId) {
    throw new Error('Plan ID not found');
  }

  // Save the availability
  const availability = await availabilityRepository.saveAvailability({
    planId,
    contactId: contactId || undefined,
    inviteeName: data.name,
    timezone: data.timezone,
    availableSlots: data.availableSlots,
  });

  // Mark the link as submitted
  await inviteLinkService.markLinkSubmitted(token);

  // Mark the invitee as responded
  if (contactId) {
    await schedulingRepository.markInviteeResponded(planId, contactId);
  }

  // Notify the plan initiator
  await notificationService.notifyAvailabilitySubmitted(planId, data.name);

  // Check if plan is ready to finalize
  await schedulingService.updatePlanReadyStatus(planId);

  return availability;
}

/**
 * Get public plan info for availability page (no auth required)
 */
export async function getPublicPlanInfo(token: string): Promise<PublicPlanInfo> {
  // Validate the invite link
  const validation = await inviteLinkService.validateInviteLink(token);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid invite link');
  }

  const { planId, contactId, contactName } = validation;
  if (!planId) {
    throw new Error('Plan ID not found');
  }

  // Get plan details
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  // Get existing availability if any
  let existingAvailability: string[] | undefined;
  if (contactId) {
    const existing = await availabilityRepository.getAvailabilityByContact(planId, contactId);
    if (existing) {
      existingAvailability = existing.availableSlots;
    }
  }

  // Get initiator name (we'd need to join with users table, for now use placeholder)
  const initiatorName = 'Your friend'; // TODO: Fetch from users table

  return {
    initiatorName,
    activityType: plan.activityType,
    duration: plan.duration,
    dateRangeStart: plan.dateRangeStart,
    dateRangeEnd: plan.dateRangeEnd,
    inviteeName: contactName,
    existingAvailability,
  };
}

/**
 * Save initiator availability
 */
export async function saveInitiatorAvailability(
  planId: string,
  userId: string,
  availableSlots: string[],
  source: 'manual' | 'calendar' = 'manual'
): Promise<InitiatorAvailability> {
  // Verify plan ownership
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new Error('Plan not found or access denied');
  }

  return availabilityRepository.saveInitiatorAvailability({
    planId,
    userId,
    availableSlots,
    source,
  });
}

/**
 * Get all availability for a plan (for dashboard)
 */
export async function getAvailabilityForPlan(
  planId: string,
  userId: string
): Promise<{
  initiatorAvailability: string[];
  inviteeAvailability: InviteeAvailability[];
}> {
  // Verify plan ownership
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new Error('Plan not found or access denied');
  }

  const initiator = await availabilityRepository.getInitiatorAvailability(planId, userId);
  const invitees = await availabilityRepository.getAvailabilityForPlan(planId);

  return {
    initiatorAvailability: initiator?.availableSlots || [],
    inviteeAvailability: invitees,
  };
}

/**
 * Calculate overlaps for all time slots
 */
export async function calculateOverlaps(
  planId: string,
  userId: string
): Promise<Map<string, SlotOverlap>> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new Error('Plan not found or access denied');
  }

  const { initiatorAvailability, inviteeAvailability } = await getAvailabilityForPlan(
    planId,
    userId
  );

  // Get all unique time slots
  const allSlots = new Set<string>();
  initiatorAvailability.forEach((s) => allSlots.add(s));
  inviteeAvailability.forEach((ia) => ia.availableSlots.forEach((s) => allSlots.add(s)));

  // Calculate overlap for each slot
  const overlaps = new Map<string, SlotOverlap>();
  const mustAttendInvitees = plan.invitees.filter((i) => i.attendanceType === 'must_attend');
  const totalMustAttend = mustAttendInvitees.length + 1; // +1 for initiator

  allSlots.forEach((slot) => {
    const availableParticipants: AvailableParticipant[] = [];
    let mustAttendCount = 0;

    // Check initiator
    if (initiatorAvailability.includes(slot)) {
      availableParticipants.push({ name: 'You', isMustAttend: true });
      mustAttendCount++;
    }

    // Check each invitee
    inviteeAvailability.forEach((ia) => {
      if (ia.availableSlots.includes(slot)) {
        const invitee = plan.invitees.find((i) => i.contactId === ia.contactId);
        const isMustAttend = invitee?.attendanceType === 'must_attend';
        availableParticipants.push({
          name: ia.inviteeName,
          isMustAttend,
        });
        if (isMustAttend) {
          mustAttendCount++;
        }
      }
    });

    overlaps.set(slot, {
      availableCount: availableParticipants.length,
      mustAttendCount,
      totalMustAttend,
      isPerfectOverlap: mustAttendCount === totalMustAttend,
      availableParticipants,
    });
  });

  return overlaps;
}

/**
 * Get slots with perfect overlap (all must-attend available)
 */
export async function getPerfectOverlapSlots(planId: string, userId: string): Promise<string[]> {
  const overlaps = await calculateOverlaps(planId, userId);
  const perfectSlots: string[] = [];

  overlaps.forEach((overlap, slot) => {
    if (overlap.isPerfectOverlap) {
      perfectSlots.push(slot);
    }
  });

  return perfectSlots.sort();
}

/**
 * Get slots with near-perfect overlap (missing 1 must-attend)
 */
export async function getNearOverlapSlots(
  planId: string,
  userId: string
): Promise<{ slot: string; missingAttendees: string[] }[]> {
  const plan = await schedulingRepository.getPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new Error('Plan not found or access denied');
  }

  const overlaps = await calculateOverlaps(planId, userId);
  const nearSlots: { slot: string; missingAttendees: string[] }[] = [];

  overlaps.forEach((overlap, slot) => {
    if (overlap.mustAttendCount === overlap.totalMustAttend - 1) {
      // Find who's missing
      const { initiatorAvailability, inviteeAvailability } = {
        initiatorAvailability: [] as string[],
        inviteeAvailability: [] as InviteeAvailability[],
      };

      const missingAttendees: string[] = [];

      // Check if initiator is missing
      if (!overlap.availableParticipants.some((p) => p.name === 'You')) {
        missingAttendees.push('You');
      }

      // Check which must-attend invitees are missing
      plan.invitees
        .filter((i) => i.attendanceType === 'must_attend')
        .forEach((invitee) => {
          if (!overlap.availableParticipants.some((p) => p.name === invitee.contactName)) {
            missingAttendees.push(invitee.contactName);
          }
        });

      nearSlots.push({ slot, missingAttendees });
    }
  });

  return nearSlots.sort((a, b) => a.slot.localeCompare(b.slot));
}
