/**
 * Group Matching Service
 *
 * Business logic for identifying potential group catchup opportunities.
 * Analyzes shared context between contacts including:
 * - Common group memberships
 * - Shared tags/interests
 * - Co-mentions in voice notes
 * - Recent group interactions
 *
 * Requirements: 8.3, 8.4, 8.5, 8.6, 9.3, 9.4
 */

import pool from '../db/connection';
import { Contact } from '../types';

/**
 * Shared context score breakdown
 */
export interface SharedContextScore {
  score: number; // 0-100
  factors: {
    commonGroups: string[];
    sharedTags: string[];
    coMentionedInVoiceNotes: number;
    overlappingInterests: string[];
  };
}

/**
 * Contact group with shared context
 */
export interface ContactGroup {
  contacts: Contact[];
  sharedContext: SharedContextScore;
  suggestedDuration: number; // minutes
}

/**
 * Group suggestion threshold (50+ points)
 * Requirements: 9.3, 9.4
 */
export const GROUP_SUGGESTION_THRESHOLD = 50;

/**
 * Group Matching Service
 */
export class GroupMatchingService {
  /**
   * Calculate shared context score for a group of contacts
   *
   * Requirements: 8.4, 8.5, 8.6, 9.3, 9.4
   * Property 4: Shared context identification
   *
   * Scoring breakdown:
   * - Common group memberships: 30 points max (10 points per group)
   * - Shared tags/interests: 30 points max (5 points per tag)
   * - Co-mentions in voice notes: 25 points max (5 points per co-mention)
   * - Recent group interactions: 15 points max (5 points per interaction)
   */
  async calculateSharedContext(contacts: Contact[]): Promise<SharedContextScore> {
    if (contacts.length < 2) {
      return {
        score: 0,
        factors: {
          commonGroups: [],
          sharedTags: [],
          coMentionedInVoiceNotes: 0,
          overlappingInterests: [],
        },
      };
    }

    let score = 0;
    const factors = {
      commonGroups: [] as string[],
      sharedTags: [] as string[],
      coMentionedInVoiceNotes: 0,
      overlappingInterests: [] as string[],
    };

    // Find common groups (30 points max)
    const commonGroups = this.findCommonGroups(contacts);
    factors.commonGroups = commonGroups;
    score += Math.min(commonGroups.length * 10, 30);

    // Find shared tags (30 points max)
    const sharedTags = this.findSharedTags(contacts);
    factors.sharedTags = sharedTags;
    factors.overlappingInterests = sharedTags; // Tags represent interests
    score += Math.min(sharedTags.length * 5, 30);

    // Count co-mentions in voice notes (25 points max)
    const contactIds = contacts.map((c) => c.id);
    const coMentions = await this.countCoMentions(contactIds);
    factors.coMentionedInVoiceNotes = coMentions;
    score += Math.min(coMentions * 5, 25);

    // Count recent group interactions (15 points max)
    const recentGroupInteractions = await this.countRecentGroupInteractions(contactIds);
    score += Math.min(recentGroupInteractions * 5, 15);

    return {
      score,
      factors,
    };
  }

  /**
   * Find potential groups from contact list
   *
   * Requirements: 8.3, 9.7
   * Property 5: Group suggestion membership constraints
   *
   * Identifies groups of 2-3 contacts with strong shared context.
   * Returns groups sorted by shared context score (highest first).
   */
  async findPotentialGroups(
    userContacts: Contact[],
    maxGroupSize: number = 3
  ): Promise<ContactGroup[]> {
    const potentialGroups: ContactGroup[] = [];

    // Generate all combinations of 2-3 contacts
    for (let size = 2; size <= Math.min(maxGroupSize, 3); size++) {
      const combinations = this.generateCombinations(userContacts, size);

      for (const contacts of combinations) {
        // Calculate shared context
        const sharedContext = await this.calculateSharedContext(contacts);

        // Only include groups that meet the threshold
        if (sharedContext.score >= GROUP_SUGGESTION_THRESHOLD) {
          // Suggest longer duration for larger groups
          const suggestedDuration = size === 2 ? 60 : 90; // 60 min for 2, 90 min for 3

          potentialGroups.push({
            contacts,
            sharedContext,
            suggestedDuration,
          });
        }
      }
    }

    // Sort by score (highest first)
    potentialGroups.sort((a, b) => b.sharedContext.score - a.sharedContext.score);

    return potentialGroups;
  }

  /**
   * Analyze voice notes for co-mentioned contacts
   *
   * Requirements: 8.6
   *
   * Returns a map of contact ID to array of contact IDs they were mentioned with.
   */
  async analyzeVoiceNoteCoMentions(userId: string): Promise<Map<string, string[]>> {
    const result = await pool.query(
      `SELECT vnc1.contact_id as contact1, vnc2.contact_id as contact2, COUNT(*) as mention_count
       FROM voice_note_contacts vnc1
       JOIN voice_note_contacts vnc2 ON vnc1.voice_note_id = vnc2.voice_note_id
       JOIN voice_notes vn ON vnc1.voice_note_id = vn.id
       WHERE vn.user_id = $1
         AND vnc1.contact_id < vnc2.contact_id
       GROUP BY vnc1.contact_id, vnc2.contact_id
       ORDER BY mention_count DESC`,
      [userId]
    );

    const coMentionMap = new Map<string, string[]>();

    for (const row of result.rows) {
      const contact1 = row.contact1;
      const contact2 = row.contact2;

      // Add bidirectional mapping
      if (!coMentionMap.has(contact1)) {
        coMentionMap.set(contact1, []);
      }
      coMentionMap.get(contact1)!.push(contact2);

      if (!coMentionMap.has(contact2)) {
        coMentionMap.set(contact2, []);
      }
      coMentionMap.get(contact2)!.push(contact1);
    }

    return coMentionMap;
  }

  /**
   * Find common groups across all contacts
   * Requirements: 8.4
   */
  private findCommonGroups(contacts: Contact[]): string[] {
    if (contacts.length === 0) return [];

    // Start with first contact's groups
    const commonGroups = new Set(contacts[0].groups);

    // Intersect with each subsequent contact's groups
    for (let i = 1; i < contacts.length; i++) {
      const contactGroups = new Set(contacts[i].groups);
      for (const group of commonGroups) {
        if (!contactGroups.has(group)) {
          commonGroups.delete(group);
        }
      }
    }

    return Array.from(commonGroups);
  }

  /**
   * Find shared tags across all contacts
   * Requirements: 8.5
   */
  private findSharedTags(contacts: Contact[]): string[] {
    if (contacts.length === 0) return [];

    // Start with first contact's tags
    const sharedTags = new Set(contacts[0].tags.map((t) => t.text));

    // Intersect with each subsequent contact's tags
    for (let i = 1; i < contacts.length; i++) {
      const contactTags = new Set(contacts[i].tags.map((t) => t.text));
      for (const tag of sharedTags) {
        if (!contactTags.has(tag)) {
          sharedTags.delete(tag);
        }
      }
    }

    return Array.from(sharedTags);
  }

  /**
   * Count how many times contacts were mentioned together in voice notes
   * Requirements: 8.6
   */
  private async countCoMentions(contactIds: string[]): Promise<number> {
    if (contactIds.length < 2) return 0;

    // Query to find voice notes that mention all these contacts
    const result = await pool.query(
      `SELECT COUNT(DISTINCT vn.id) as co_mention_count
       FROM voice_notes vn
       WHERE (
         SELECT COUNT(DISTINCT vnc.contact_id)
         FROM voice_note_contacts vnc
         WHERE vnc.voice_note_id = vn.id
           AND vnc.contact_id = ANY($1)
       ) = $2`,
      [contactIds, contactIds.length]
    );

    return parseInt(result.rows[0]?.co_mention_count || '0', 10);
  }

  /**
   * Count recent group interactions (within last 90 days)
   * Requirements: 8.6
   */
  private async countRecentGroupInteractions(contactIds: string[]): Promise<number> {
    if (contactIds.length < 2) return 0;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // This is a simplified version - in production, you'd need a way to track group interactions
    // For now, we'll use voice notes as a proxy for group interactions
    const result = await pool.query(
      `SELECT COUNT(DISTINCT vn.id) as interaction_count
       FROM voice_notes vn
       WHERE vn.recording_timestamp >= $1
         AND (
           SELECT COUNT(DISTINCT vnc.contact_id)
           FROM voice_note_contacts vnc
           WHERE vnc.voice_note_id = vn.id
             AND vnc.contact_id = ANY($2)
         ) = $3`,
      [ninetyDaysAgo, contactIds, contactIds.length]
    );

    return parseInt(result.rows[0]?.interaction_count || '0', 10);
  }

  /**
   * Generate all combinations of contacts of a given size
   */
  private generateCombinations(contacts: Contact[], size: number): Contact[][] {
    const result: Contact[][] = [];

    const combine = (start: number, current: Contact[]) => {
      if (current.length === size) {
        result.push([...current]);
        return;
      }

      for (let i = start; i < contacts.length; i++) {
        current.push(contacts[i]);
        combine(i + 1, current);
        current.pop();
      }
    };

    combine(0, []);
    return result;
  }
}

// Export singleton instance
export const groupMatchingService = new GroupMatchingService();
