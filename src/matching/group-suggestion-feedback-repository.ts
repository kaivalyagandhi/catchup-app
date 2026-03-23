/**
 * Group Suggestion Feedback Repository
 *
 * Data access layer for the group_suggestion_feedback table.
 * Tracks user feedback (accepted/rejected) on AI-powered group placement suggestions.
 */

import pool from '../db/connection';

/**
 * Group Suggestion Feedback record
 */
export interface GroupSuggestionFeedback {
  id: string;
  userId: string;
  contactId: string;
  groupId: string;
  suggestionType: string;
  feedback: 'accepted' | 'rejected';
  createdAt: Date;
}

/**
 * Group Suggestion Feedback Repository Interface
 */
export interface GroupSuggestionFeedbackRepository {
  recordFeedback(
    userId: string,
    contactId: string,
    groupId: string,
    feedback: 'accepted' | 'rejected'
  ): Promise<void>;
  getRejectedGroups(userId: string, contactId: string): Promise<string[]>;
  getFeedbackForContact(userId: string, contactId: string): Promise<GroupSuggestionFeedback[]>;
}

/**
 * PostgreSQL Group Suggestion Feedback Repository Implementation
 */
export class PostgresGroupSuggestionFeedbackRepository
  implements GroupSuggestionFeedbackRepository
{
  async recordFeedback(
    userId: string,
    contactId: string,
    groupId: string,
    feedback: 'accepted' | 'rejected'
  ): Promise<void> {
    await pool.query(
      `INSERT INTO group_suggestion_feedback (user_id, contact_id, group_id, feedback)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, contact_id, group_id)
       DO UPDATE SET feedback = $4, created_at = NOW()`,
      [userId, contactId, groupId, feedback]
    );
  }

  async getRejectedGroups(userId: string, contactId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT group_id FROM group_suggestion_feedback
       WHERE user_id = $1 AND contact_id = $2 AND feedback = 'rejected'`,
      [userId, contactId]
    );

    return result.rows.map((row: any) => row.group_id);
  }

  async getFeedbackForContact(
    userId: string,
    contactId: string
  ): Promise<GroupSuggestionFeedback[]> {
    const result = await pool.query(
      `SELECT * FROM group_suggestion_feedback
       WHERE user_id = $1 AND contact_id = $2
       ORDER BY created_at DESC`,
      [userId, contactId]
    );

    return result.rows.map((row: any) => this.mapRowToFeedback(row));
  }

  private mapRowToFeedback(row: any): GroupSuggestionFeedback {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      groupId: row.group_id,
      suggestionType: row.suggestion_type,
      feedback: row.feedback as 'accepted' | 'rejected',
      createdAt: new Date(row.created_at),
    };
  }
}

// Default instance
const defaultRepository = new PostgresGroupSuggestionFeedbackRepository();

export const recordFeedback = (
  userId: string,
  contactId: string,
  groupId: string,
  feedback: 'accepted' | 'rejected'
) => defaultRepository.recordFeedback(userId, contactId, groupId, feedback);

export const getRejectedGroups = (userId: string, contactId: string) =>
  defaultRepository.getRejectedGroups(userId, contactId);

export const getFeedbackForContact = (userId: string, contactId: string) =>
  defaultRepository.getFeedbackForContact(userId, contactId);
