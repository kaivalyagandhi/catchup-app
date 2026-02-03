/**
 * Invite Link Service
 *
 * Business logic for invite link operations.
 * Requirements: 3.1, 3.2, 3.3, 3.8, 3.9, 3.10
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as inviteLinkRepository from './invite-link-repository';
import { InviteLink, InviteLinkValidation } from '../types/scheduling';

/**
 * Base URL for invite links (from environment or default)
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Link expiry in days
 */
const LINK_EXPIRY_DAYS = 30;

/**
 * Generate a new invite link for an invitee
 */
export async function generateInviteLink(
  planId: string,
  contactId: string
): Promise<InviteLink> {
  // Generate secure token (URL-safe base64)
  const token = crypto.randomBytes(32).toString('base64url');

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LINK_EXPIRY_DAYS);

  // Create link record
  const link = await inviteLinkRepository.createLink({
    id: uuidv4(),
    planId,
    contactId,
    token,
    expiresAt,
    accessedAt: null,
    submittedAt: null,
  });

  return {
    ...link,
    url: `${BASE_URL}/availability/${token}`,
  };
}

/**
 * Validate an invite link token
 */
export async function validateInviteLink(token: string): Promise<InviteLinkValidation> {
  const link = await inviteLinkRepository.getLinkByToken(token);

  if (!link) {
    return { valid: false, error: 'Invalid invite link' };
  }

  // Check expiry
  if (new Date() > new Date(link.expiresAt)) {
    return { valid: false, error: 'Invite link has expired' };
  }

  // Check if plan is still active
  try {
    const planStatus = await inviteLinkRepository.getPlanStatus(link.planId);
    
    if (planStatus.status === 'cancelled') {
      return { valid: false, error: 'This plan has been cancelled' };
    }

    if (planStatus.status === 'scheduled' || planStatus.status === 'completed') {
      return { valid: false, error: 'This plan has already been finalized' };
    }
  } catch (error) {
    return { valid: false, error: 'Plan not found' };
  }

  // Track access (first time only)
  await inviteLinkRepository.trackAccess(link.id);

  return {
    valid: true,
    planId: link.planId,
    contactId: link.contactId,
    contactName: link.contactName,
  };
}

/**
 * Regenerate an invite link (invalidates old one)
 */
export async function regenerateInviteLink(
  planId: string,
  contactId: string
): Promise<InviteLink> {
  // Invalidate existing link
  await inviteLinkRepository.invalidateLink(planId, contactId);

  // Generate new link
  return generateInviteLink(planId, contactId);
}

/**
 * Invalidate all links for a plan
 */
export async function invalidateLinksForPlan(planId: string): Promise<void> {
  await inviteLinkRepository.invalidateAllLinksForPlan(planId);
}

/**
 * Get all links for a plan
 */
export async function getLinksForPlan(planId: string): Promise<InviteLink[]> {
  const links = await inviteLinkRepository.getLinksForPlan(planId);
  return links.map((link) => ({
    ...link,
    url: `${BASE_URL}/availability/${link.token}`,
  }));
}

/**
 * Mark a link as having availability submitted
 */
export async function markLinkSubmitted(token: string): Promise<void> {
  const link = await inviteLinkRepository.getLinkByToken(token);
  if (link) {
    await inviteLinkRepository.markSubmitted(link.id);
  }
}

/**
 * Check if a link has been accessed
 */
export async function hasLinkBeenAccessed(
  planId: string,
  contactId: string
): Promise<boolean> {
  const link = await inviteLinkRepository.getLinkByPlanAndContact(planId, contactId);
  return link?.accessedAt !== null && link?.accessedAt !== undefined;
}

/**
 * Check if availability has been submitted for a link
 */
export async function hasAvailabilityBeenSubmitted(
  planId: string,
  contactId: string
): Promise<boolean> {
  const link = await inviteLinkRepository.getLinkByPlanAndContact(planId, contactId);
  return link?.submittedAt !== null && link?.submittedAt !== undefined;
}

/**
 * Invalidate the invite link for a specific invitee
 * Requirements: 12.1 - When removing an invitee, invalidate their link
 */
export async function invalidateLinkForInvitee(
  planId: string,
  contactId: string
): Promise<void> {
  await inviteLinkRepository.invalidateLink(planId, contactId);
}
