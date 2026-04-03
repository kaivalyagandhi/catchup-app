/**
 * SuggestionPauseService
 *
 * Manages temporary pauses on suggestion generation per user.
 * Users can pause suggestions for 1–4 weeks and resume early.
 *
 * Requirements: 11.3, 11.4, 11.6, 11.7, 11.8, 11.9, 11.10
 */

import pool from '../db/connection';
import { SuggestionPause } from '../types';

export class SuggestionPauseService {
  /**
   * Create a pause for 1–4 weeks.
   * Validates weeks range and rejects if already paused.
   *
   * @throws Error with message "Weeks must be between 1 and 4" for invalid weeks
   * @throws Error with statusCode 409 if already paused
   */
  async createPause(userId: string, weeks: number): Promise<SuggestionPause> {
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
      const error = new Error('Weeks must be between 1 and 4');
      (error as any).statusCode = 400;
      throw error;
    }

    // Check for existing active pause
    const existing = await this.getActivePause(userId);
    if (existing) {
      const error = new Error('Suggestions are already paused');
      (error as any).statusCode = 409;
      throw error;
    }

    const result = await pool.query(
      `INSERT INTO suggestion_pauses (user_id, pause_start, pause_end)
       VALUES ($1, NOW(), NOW() + ($2 || ' weeks')::INTERVAL)
       RETURNING id, user_id, pause_start, pause_end, created_at`,
      [userId, weeks.toString()]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get active pause (if any). Returns null if no active pause or expired.
   * Cleans up expired records asynchronously.
   */
  async getActivePause(userId: string): Promise<SuggestionPause | null> {
    const result = await pool.query(
      `SELECT id, user_id, pause_start, pause_end, created_at
       FROM suggestion_pauses
       WHERE user_id = $1 AND pause_end > NOW()`,
      [userId]
    );

    if (result.rows.length > 0) {
      return this.mapRow(result.rows[0]);
    }

    // Clean up expired records asynchronously (fire-and-forget)
    this.cleanupExpired(userId).catch((err) => {
      console.error('Failed to clean up expired pause records:', err);
    });

    return null;
  }

  /**
   * Resume early by deleting the active pause.
   *
   * @throws Error with statusCode 404 if no active pause found
   */
  async resumeEarly(userId: string): Promise<void> {
    const result = await pool.query(
      `DELETE FROM suggestion_pauses
       WHERE user_id = $1 AND pause_end > NOW()`,
      [userId]
    );

    if (result.rowCount === 0) {
      const error = new Error('No active pause found');
      (error as any).statusCode = 404;
      throw error;
    }
  }

  /**
   * Check if suggestions are currently paused for a user.
   */
  async isPaused(userId: string): Promise<boolean> {
    const activePause = await this.getActivePause(userId);
    return activePause !== null;
  }

  /**
   * Clean up expired pause records for a user.
   */
  private async cleanupExpired(userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM suggestion_pauses
       WHERE user_id = $1 AND pause_end <= NOW()`,
      [userId]
    );
  }

  /**
   * Map a database row to a SuggestionPause object.
   */
  private mapRow(row: any): SuggestionPause {
    return {
      id: row.id,
      userId: row.user_id,
      pauseStart: new Date(row.pause_start),
      pauseEnd: new Date(row.pause_end),
      createdAt: new Date(row.created_at),
    };
  }
}
