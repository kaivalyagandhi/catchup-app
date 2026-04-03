/**
 * ConnectionGoalService
 *
 * Manages user-defined connection goals that influence suggestion scoring.
 * Users can set up to 2 active goals; the service extracts keywords from
 * goal text and computes goal-relevance scores for contacts.
 *
 * Requirements: 15.3, 15.4, 15.8, 16.1, 16.3, 16.4, 16.5, 16.6
 */

import pool from '../db/connection';
import { ConnectionGoal, Contact } from '../types';

/**
 * Common English stopwords to filter out during keyword extraction.
 */
const STOPWORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as',
  'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
  'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'can', 'will', 'just', 'don', 'should', 'now',
  'want', 'need', 'like', 'would', 'could', 'get', 'got',
  'find', 'looking', 'make', 'new', 'old',
]);

/** Keywords that indicate a social-nature goal */
const SOCIAL_KEYWORDS = new Set(['friends', 'social', 'reconnect']);

/** Keywords that indicate a professional-nature goal */
const PROFESSIONAL_KEYWORDS = new Set([
  'network', 'career', 'mentor', 'job', 'freelance',
]);

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row DP for space efficiency
  const prev = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= lb; j++) {
      const temp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
      }
      prevDiag = temp;
    }
  }

  return prev[lb];
}

export class ConnectionGoalService {
  /**
   * Extract keywords from goal text using simple NLP.
   * Splits on non-alphanumeric characters, lowercases, filters stopwords
   * and words ≤ 3 chars. Falls back to whitespace split (words > 3 chars)
   * if the primary extraction yields an empty array.
   */
  extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));

    if (words.length > 0) {
      // Deduplicate
      return [...new Set(words)];
    }

    // Fallback: whitespace split, words > 3 chars
    const fallback = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    return [...new Set(fallback)];
  }

  /**
   * Create a new connection goal, enforcing max 2 active goals.
   *
   * @throws Error with statusCode 400 if text is empty
   * @throws Error with statusCode 409 if 2 active goals already exist
   */
  async createGoal(userId: string, text: string): Promise<ConnectionGoal> {
    if (!text || !text.trim()) {
      const error = new Error('Goal text is required');
      (error as any).statusCode = 400;
      throw error;
    }

    // Check active goal count
    const countResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM connection_goals
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (parseInt(countResult.rows[0].cnt, 10) >= 2) {
      const error = new Error('Maximum of 2 active goals allowed');
      (error as any).statusCode = 409;
      throw error;
    }

    const keywords = this.extractKeywords(text.trim());

    const result = await pool.query(
      `INSERT INTO connection_goals (user_id, text, keywords, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, user_id, text, keywords, status, created_at, updated_at`,
      [userId, text.trim(), keywords]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get active goals for a user.
   */
  async getActiveGoals(userId: string): Promise<ConnectionGoal[]> {
    const result = await pool.query(
      `SELECT id, user_id, text, keywords, status, created_at, updated_at
       FROM connection_goals
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => this.mapRow(row));
  }

  /**
   * Archive a goal.
   *
   * @throws Error with statusCode 404 if goal not found
   */
  async archiveGoal(goalId: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE connection_goals
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [goalId, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error('Goal not found');
      (error as any).statusCode = 404;
      throw error;
    }
  }

  /**
   * Compute goal relevance score (0–100) for a contact against active goals.
   *
   * Scoring formula:
   *  - +30 per tag/group name matching a goal keyword (exact or Levenshtein ≤ 2)
   *  - +20 per enrichment topic overlapping with goal keywords
   *  - +25 if contact's Dunbar circle matches goal nature
   *    (inner/close for social goals, active/casual for professional goals)
   *  - Cap at 100
   *
   * @param contact The contact to score
   * @param goals Active connection goals
   * @param enrichmentTopics Optional enrichment topics for the contact
   */
  computeGoalRelevance(
    contact: Contact,
    goals: ConnectionGoal[],
    enrichmentTopics: string[] = []
  ): number {
    if (goals.length === 0) return 0;

    let score = 0;

    // Collect all keywords from all goals
    const allKeywords: string[] = [];
    for (const goal of goals) {
      allKeywords.push(...goal.keywords);
    }

    if (allKeywords.length === 0) return 0;

    const keywordsLower = allKeywords.map((k) => k.toLowerCase());

    // +30 per tag text matching a goal keyword (exact or Levenshtein ≤ 2)
    const tagTexts = (contact.tags || []).map((t) => t.text.toLowerCase());
    for (const tagText of tagTexts) {
      for (const keyword of keywordsLower) {
        if (
          tagText === keyword ||
          levenshteinDistance(tagText, keyword) <= 2
        ) {
          score += 30;
          break; // Only count each tag once
        }
      }
    }

    // +30 per group name matching a goal keyword (exact or Levenshtein ≤ 2)
    const groupNames = (contact.groups || []).map((g) => g.toLowerCase());
    for (const groupName of groupNames) {
      for (const keyword of keywordsLower) {
        if (
          groupName === keyword ||
          levenshteinDistance(groupName, keyword) <= 2
        ) {
          score += 30;
          break; // Only count each group once
        }
      }
    }

    // +20 per enrichment topic overlapping with goal keywords
    const topicsLower = enrichmentTopics.map((t) => t.toLowerCase());
    for (const topic of topicsLower) {
      for (const keyword of keywordsLower) {
        if (
          topic === keyword ||
          levenshteinDistance(topic, keyword) <= 2
        ) {
          score += 20;
          break; // Only count each topic once
        }
      }
    }

    // +25 if Dunbar circle matches goal nature
    if (contact.dunbarCircle) {
      const circle = contact.dunbarCircle;
      for (const goal of goals) {
        const goalKeywordsLower = goal.keywords.map((k) => k.toLowerCase());

        const isSocial = goalKeywordsLower.some((k) => SOCIAL_KEYWORDS.has(k));
        const isProfessional = goalKeywordsLower.some((k) =>
          PROFESSIONAL_KEYWORDS.has(k)
        );

        if (
          isSocial &&
          (circle === 'inner' || circle === 'close')
        ) {
          score += 25;
          break; // Only apply circle bonus once
        }

        if (
          isProfessional &&
          (circle === 'active' || circle === 'casual')
        ) {
          score += 25;
          break; // Only apply circle bonus once
        }
      }
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Map a database row to a ConnectionGoal object.
   */
  private mapRow(row: any): ConnectionGoal {
    return {
      id: row.id,
      userId: row.user_id,
      text: row.text,
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
