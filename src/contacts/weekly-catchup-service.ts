/**
 * Weekly Catchup Service
 *
 * Manages weekly contact review sessions for progressive onboarding.
 * Breaks contact management into manageable weekly chunks (10-15 contacts).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import {
  PostgresWeeklyCatchupRepository,
  type WeeklyCatchupSessionRecord,
  type ContactReviewItem,
} from './weekly-catchup-repository';
import { PostgresContactRepository, type DunbarCircle } from './repository';
import { PostgresOnboardingRepository } from './onboarding-repository';
import pool from '../db/connection';

/**
 * Weekly catchup session with progress information
 */
export interface WeeklyCatchupSession {
  id: string;
  userId: string;
  weekNumber: number;
  year: number;
  contactsToReview: ContactReviewItem[];
  reviewedContacts: string[];
  startedAt: Date;
  completedAt?: Date;
  skipped: boolean;
  progress: SessionProgress;
}

/**
 * Session progress information
 */
export interface SessionProgress {
  totalContacts: number;
  reviewedContacts: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // in minutes
}

/**
 * Review action types
 */
export type ReviewAction = 'keep' | 'archive' | 'update_circle' | 'set_preference';

/**
 * Review action data
 */
export interface ReviewActionData {
  action: ReviewAction;
  circle?: DunbarCircle;
  frequencyPreference?: string;
}

/**
 * Weekly Catchup Service Interface
 */
export interface WeeklyCatchupService {
  startSession(userId: string): Promise<WeeklyCatchupSession>;
  getCurrentSession(userId: string): Promise<WeeklyCatchupSession | null>;
  getNextContact(sessionId: string, userId: string): Promise<ContactReviewItem | null>;
  markContactReviewed(
    sessionId: string,
    userId: string,
    contactId: string,
    actionData: ReviewActionData
  ): Promise<void>;
  completeSession(sessionId: string, userId: string): Promise<void>;
  skipSession(sessionId: string, userId: string): Promise<void>;
  getSessionProgress(sessionId: string, userId: string): Promise<SessionProgress>;
}

/**
 * PostgreSQL Weekly Catchup Service Implementation
 */
export class PostgresWeeklyCatchupService implements WeeklyCatchupService {
  private weeklyCatchupRepo: PostgresWeeklyCatchupRepository;
  private contactRepo: PostgresContactRepository;
  private onboardingRepo: PostgresOnboardingRepository;

  constructor(
    weeklyCatchupRepo?: PostgresWeeklyCatchupRepository,
    contactRepo?: PostgresContactRepository,
    onboardingRepo?: PostgresOnboardingRepository
  ) {
    this.weeklyCatchupRepo = weeklyCatchupRepo || new PostgresWeeklyCatchupRepository();
    this.contactRepo = contactRepo || new PostgresContactRepository();
    this.onboardingRepo = onboardingRepo || new PostgresOnboardingRepository();
  }

  /**
   * Start a new weekly catchup session
   * Requirements: 7.1 - Generate session with 10-15 contacts
   */
  async startSession(userId: string): Promise<WeeklyCatchupSession> {
    // Get current week number and year
    const now = new Date();
    const { weekNumber, year } = this.getWeekNumber(now);

    // Check if session already exists for this week
    let session = await this.weeklyCatchupRepo.findByWeek(userId, year, weekNumber);

    if (session && !session.completedAt && !session.skipped) {
      // Return existing incomplete session
      return this.enrichSessionWithProgress(session);
    }

    // Generate new session
    const contactsToReview = await this.generateContactsToReview(userId);

    session = await this.weeklyCatchupRepo.create({
      userId,
      weekNumber,
      year,
      contactsToReview,
    });

    return this.enrichSessionWithProgress(session);
  }

  /**
   * Get current active session
   * Requirements: 7.1
   */
  async getCurrentSession(userId: string): Promise<WeeklyCatchupSession | null> {
    const session = await this.weeklyCatchupRepo.findCurrentSession(userId);

    if (!session) {
      return null;
    }

    return this.enrichSessionWithProgress(session);
  }

  /**
   * Get next contact to review
   * Requirements: 7.2
   */
  async getNextContact(sessionId: string, userId: string): Promise<ContactReviewItem | null> {
    const unreviewedContacts = await this.weeklyCatchupRepo.getUnreviewedContacts(
      sessionId,
      userId
    );

    if (unreviewedContacts.length === 0) {
      return null;
    }

    return unreviewedContacts[0];
  }

  /**
   * Mark contact as reviewed and apply action
   * Requirements: 7.2
   */
  async markContactReviewed(
    sessionId: string,
    userId: string,
    contactId: string,
    actionData: ReviewActionData
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Apply the review action
      await this.applyReviewAction(userId, contactId, actionData);

      // Mark contact as reviewed in session
      await this.weeklyCatchupRepo.markContactReviewed(sessionId, userId, contactId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete the session
   * Requirements: 7.3 - Celebrate completion
   */
  async completeSession(sessionId: string, userId: string): Promise<void> {
    await this.weeklyCatchupRepo.markComplete(sessionId, userId);

    // Update onboarding progress if applicable
    const onboardingState = await this.onboardingRepo.findByUserId(userId);
    if (onboardingState && !onboardingState.completedAt) {
      // Update progress data
      const progressData = onboardingState.progressData || {
        categorizedCount: 0,
        totalCount: 0,
        milestonesReached: [],
        timeSpent: 0,
      };
      const updatedProgressData = {
        ...progressData,
        weeklyCatchupCompleted: ((progressData as any).weeklyCatchupCompleted || 0) + 1,
      };

      await this.onboardingRepo.update(userId, {
        progressData: updatedProgressData,
      });
    }
  }

  /**
   * Skip the session
   * Requirements: 7.4 - Reschedule unreviewed contacts
   */
  async skipSession(sessionId: string, userId: string): Promise<void> {
    // Get unreviewed contacts
    const unreviewedContacts = await this.weeklyCatchupRepo.getUnreviewedContacts(
      sessionId,
      userId
    );

    // Mark session as skipped
    await this.weeklyCatchupRepo.markSkipped(sessionId, userId);

    // If there are unreviewed contacts, they will be included in the next session
    // This is handled automatically by generateContactsToReview which prioritizes
    // contacts from skipped sessions
  }

  /**
   * Get session progress
   * Requirements: 7.2 - Display progress indicators
   */
  async getSessionProgress(sessionId: string, userId: string): Promise<SessionProgress> {
    const session = await this.weeklyCatchupRepo.findById(sessionId, userId);

    if (!session) {
      throw new Error('Session not found');
    }

    return this.calculateProgress(session);
  }

  /**
   * Generate contacts to review for a new session
   * Requirements: 7.1, 7.4, 7.5
   */
  private async generateContactsToReview(userId: string): Promise<ContactReviewItem[]> {
    const contactsToReview: ContactReviewItem[] = [];

    // 1. Get unreviewed contacts from previous skipped sessions
    const recentSessions = await this.weeklyCatchupRepo.findRecentSessions(userId, 5);
    const skippedSessions = recentSessions.filter((s) => s.skipped);

    for (const skippedSession of skippedSessions) {
      const unreviewed = await this.weeklyCatchupRepo.getUnreviewedContacts(
        skippedSession.id,
        userId
      );
      contactsToReview.push(...unreviewed);
    }

    // 2. Get uncategorized contacts (priority)
    const uncategorizedContacts = await this.contactRepo.findUncategorized(userId);

    for (const contact of uncategorizedContacts) {
      if (contactsToReview.length >= 15) break;

      // Skip if already in list
      if (contactsToReview.some((c) => c.contactId === contact.id)) continue;

      contactsToReview.push({
        contactId: contact.id,
        reviewType: 'categorize',
        lastInteraction: contact.lastContactDate || undefined,
        suggestedAction: 'Assign to a circle',
      });
    }

    // 3. Get contacts that need maintenance (haven't been contacted recently)
    if (contactsToReview.length < 15) {
      const maintenanceContacts = await this.getMaintenanceContacts(
        userId,
        15 - contactsToReview.length
      );

      for (const contact of maintenanceContacts) {
        if (contactsToReview.some((c) => c.contactId === contact.id)) continue;

        contactsToReview.push({
          contactId: contact.id,
          reviewType: 'maintain',
          lastInteraction: contact.lastContactDate || undefined,
          suggestedAction: 'Consider reaching out',
        });
      }
    }

    // 4. Get contacts that might need pruning (no recent interaction)
    if (contactsToReview.length < 10) {
      const pruneContacts = await this.getPruneContacts(userId, 15 - contactsToReview.length);

      for (const contact of pruneContacts) {
        if (contactsToReview.some((c) => c.contactId === contact.id)) continue;

        contactsToReview.push({
          contactId: contact.id,
          reviewType: 'prune',
          lastInteraction: contact.lastContactDate || undefined,
          suggestedAction: 'Review if still relevant',
        });
      }
    }

    // Limit to 10-15 contacts
    return contactsToReview.slice(0, 15);
  }

  /**
   * Get contacts that need maintenance
   */
  private async getMaintenanceContacts(userId: string, limit: number): Promise<any[]> {
    // Optimized: Use column projection for minimal data needed
    const result = await pool.query(
      `SELECT 
        id, user_id, name, email, phone, 
        last_contact_date, dunbar_circle, frequency_preference,
        created_at, updated_at
       FROM contacts
       WHERE user_id = $1
         AND archived = false
         AND dunbar_circle IS NOT NULL
         AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '30 days')
       ORDER BY last_contact_date ASC NULLS FIRST
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get contacts that might need pruning
   */
  private async getPruneContacts(userId: string, limit: number): Promise<any[]> {
    // Optimized: Use column projection for minimal data needed
    const result = await pool.query(
      `SELECT 
        id, user_id, name, email, phone,
        last_contact_date, dunbar_circle, frequency_preference,
        created_at, updated_at
       FROM contacts
       WHERE user_id = $1
         AND archived = false
         AND dunbar_circle IS NOT NULL
         AND (last_contact_date IS NULL OR last_contact_date < NOW() - INTERVAL '180 days')
       ORDER BY last_contact_date ASC NULLS FIRST
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Apply review action to contact
   */
  private async applyReviewAction(
    userId: string,
    contactId: string,
    actionData: ReviewActionData
  ): Promise<void> {
    switch (actionData.action) {
      case 'archive':
        await this.contactRepo.archive(contactId, userId);
        break;

      case 'update_circle':
        if (actionData.circle) {
          await this.contactRepo.assignToCircle(contactId, userId, actionData.circle);
        }
        break;

      case 'set_preference':
        if (actionData.frequencyPreference) {
          await this.contactRepo.update(contactId, userId, {
            frequencyPreference: actionData.frequencyPreference as any,
          });
        }
        break;

      case 'keep':
        // No action needed, just mark as reviewed
        break;

      default:
        throw new Error(`Unknown review action: ${actionData.action}`);
    }
  }

  /**
   * Calculate session progress
   */
  private calculateProgress(session: WeeklyCatchupSessionRecord): SessionProgress {
    const totalContacts = session.contactsToReview.length;
    const reviewedContacts = session.reviewedContacts.length;
    const percentComplete = totalContacts > 0 ? (reviewedContacts / totalContacts) * 100 : 100;

    // Estimate 2 minutes per contact
    const remainingContacts = totalContacts - reviewedContacts;
    const estimatedTimeRemaining = remainingContacts * 2;

    return {
      totalContacts,
      reviewedContacts,
      percentComplete: Math.round(percentComplete),
      estimatedTimeRemaining,
    };
  }

  /**
   * Enrich session with progress information
   */
  private enrichSessionWithProgress(session: WeeklyCatchupSessionRecord): WeeklyCatchupSession {
    const progress = this.calculateProgress(session);

    return {
      ...session,
      progress,
    };
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): { weekNumber: number; year: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

    return {
      weekNumber,
      year: d.getUTCFullYear(),
    };
  }
}

// Default instance
const defaultService = new PostgresWeeklyCatchupService();

export const startSession = (userId: string) => defaultService.startSession(userId);
export const getCurrentSession = (userId: string) => defaultService.getCurrentSession(userId);
export const getNextContact = (sessionId: string, userId: string) =>
  defaultService.getNextContact(sessionId, userId);
export const markContactReviewed = (
  sessionId: string,
  userId: string,
  contactId: string,
  actionData: ReviewActionData
) => defaultService.markContactReviewed(sessionId, userId, contactId, actionData);
export const completeSession = (sessionId: string, userId: string) =>
  defaultService.completeSession(sessionId, userId);
export const skipSession = (sessionId: string, userId: string) =>
  defaultService.skipSession(sessionId, userId);
export const getSessionProgress = (sessionId: string, userId: string) =>
  defaultService.getSessionProgress(sessionId, userId);
