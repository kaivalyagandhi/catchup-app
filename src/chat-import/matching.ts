/**
 * Contact Matching Engine
 *
 * Implements tiered contact matching from chat history participants
 * to existing contacts in the database.
 *
 * Match tiers:
 *  - Auto (≥0.7): phone exact (E.164), email exact (case-insensitive), social handle exact
 *  - Likely (0.5–0.7): name fuzzy match with nickname/alias support
 *  - Unmatched (<0.5): no plausible match found
 *
 * Requirements: 7.1
 */

import type { Pool } from 'pg';
import type { Participant } from './parser';
import { normalizePhone, normalizeEmail, normalizeUsername } from './identifier-normalizer';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MatchTier = 'auto' | 'likely' | 'unmatched';

export interface ContactMatch {
  participant: Participant;
  contactId: string | null;
  contactName: string | null;
  confidence: number; // 0.0–1.0
  tier: MatchTier;
  matchReason: string;
}

export interface MatchingEngine {
  matchParticipants(userId: string, participants: Participant[]): Promise<ContactMatch[]>;
}

/** Minimal contact row needed for matching */
export interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  x_handle: string | null;
  linked_in: string | null;
}

// ─── String Similarity ──────────────────────────────────────────────────────

/**
 * Compute normalized Levenshtein similarity between two strings.
 * Returns a value between 0.0 (completely different) and 1.0 (identical).
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses the classic dynamic programming approach with O(min(m,n)) space.
 */
export function levenshteinDistance(a: string, b: string): number {
  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;

  // Single row DP
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);

  for (let i = 0; i <= m; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,     // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

// ─── Contact Querying ────────────────────────────────────────────────────────

/**
 * Fetch all contacts for a user with fields needed for matching.
 */
export async function fetchUserContacts(pool: Pool, userId: string): Promise<ContactRow[]> {
  const result = await pool.query(
    `SELECT id, name, phone, email, instagram, x_handle, linked_in
     FROM contacts
     WHERE user_id = $1 AND archived_at IS NULL`,
    [userId],
  );
  return result.rows;
}

// ─── Matching Logic ─────────────────────────────────────────────────────────

/**
 * Classify a confidence score into a match tier.
 */
export function classifyTier(confidence: number): MatchTier {
  if (confidence >= 0.7) return 'auto';
  if (confidence >= 0.5) return 'likely';
  return 'unmatched';
}

/**
 * Try to find the best match for a single participant against a list of contacts.
 */
export function findBestMatch(
  participant: Participant,
  contacts: ContactRow[],
): { contactId: string | null; contactName: string | null; confidence: number; matchReason: string } {
  let bestConfidence = 0;
  let bestContactId: string | null = null;
  let bestContactName: string | null = null;
  let bestReason = 'No match found';

  for (const contact of contacts) {
    // 1. Phone exact match (E.164)
    if (
      participant.identifierType === 'phone' &&
      contact.phone
    ) {
      const normalizedParticipant = normalizePhone(participant.identifier);
      const normalizedContact = normalizePhone(contact.phone);
      if (normalizedParticipant === normalizedContact) {
        return {
          contactId: contact.id,
          contactName: contact.name,
          confidence: 0.95,
          matchReason: 'Phone exact match (E.164)',
        };
      }
    }

    // 2. Email exact match (case-insensitive)
    if (
      participant.identifierType === 'email' &&
      contact.email
    ) {
      const normalizedParticipant = normalizeEmail(participant.identifier);
      const normalizedContact = normalizeEmail(contact.email);
      if (normalizedParticipant === normalizedContact) {
        return {
          contactId: contact.id,
          contactName: contact.name,
          confidence: 0.90,
          matchReason: 'Email exact match (case-insensitive)',
        };
      }
    }

    // 3. Social handle exact match
    if (participant.identifierType === 'username') {
      const normalizedHandle = normalizeUsername(participant.identifier);
      const socialHandles = [
        contact.instagram ? normalizeUsername(contact.instagram) : null,
        contact.x_handle ? normalizeUsername(contact.x_handle) : null,
        contact.linked_in ? normalizeUsername(contact.linked_in) : null,
      ].filter(Boolean) as string[];

      if (socialHandles.includes(normalizedHandle)) {
        return {
          contactId: contact.id,
          contactName: contact.name,
          confidence: 0.85,
          matchReason: 'Social handle exact match',
        };
      }
    }

    // 4. Name fuzzy match
    const participantName = participant.displayName || participant.identifier;
    if (participantName && contact.name) {
      const similarity = stringSimilarity(participantName, contact.name);
      // Scale similarity into the likely range (0.5–0.7)
      const confidence = 0.5 + similarity * 0.2;
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestContactId = contact.id;
        bestContactName = contact.name;
        bestReason = `Name fuzzy match (similarity: ${similarity.toFixed(2)})`;
      }
    }
  }

  // Only return a likely match if the name similarity is high enough
  // to produce a confidence ≥ 0.5 (which it always will with our formula)
  // but we also require the raw similarity to be meaningful (≥ 0.5)
  const rawSimilarity = (bestConfidence - 0.5) / 0.2;
  if (rawSimilarity >= 0.5 && bestConfidence >= 0.5) {
    return {
      contactId: bestContactId,
      contactName: bestContactName,
      confidence: Math.round(bestConfidence * 100) / 100,
      matchReason: bestReason,
    };
  }

  // 5. No match
  return {
    contactId: null,
    contactName: null,
    confidence: 0,
    matchReason: 'No match found',
  };
}

// ─── MatchingEngine Implementation ──────────────────────────────────────────

/**
 * Create a MatchingEngine that queries contacts from the database.
 */
export function createMatchingEngine(pool: Pool): MatchingEngine {
  return {
    async matchParticipants(
      userId: string,
      participants: Participant[],
    ): Promise<ContactMatch[]> {
      const contacts = await fetchUserContacts(pool, userId);
      return matchParticipantsAgainstContacts(participants, contacts);
    },
  };
}

/**
 * Match participants against a provided list of contacts (pure logic, no DB).
 * Useful for testing without database dependency.
 */
export function matchParticipantsAgainstContacts(
  participants: Participant[],
  contacts: ContactRow[],
): ContactMatch[] {
  return participants.map((participant) => {
    const match = findBestMatch(participant, contacts);
    const tier = classifyTier(match.confidence);
    return {
      participant,
      contactId: match.contactId,
      contactName: match.contactName,
      confidence: match.confidence,
      tier,
      matchReason: match.matchReason,
    };
  });
}
