/**
 * Account Service
 *
 * Handles account-level operations including account deletion and test user management.
 * Requirements: 23.1-23.3, 24.1-24.2
 */

import pool from '../db/connection';

/**
 * Account Service Interface
 */
export interface AccountService {
  deleteUserAccount(userId: string): Promise<void>;
  createTestUser(email: string, name?: string): Promise<TestUser>;
  isTestUser(userId: string): Promise<boolean>;
}

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  isTestUser: boolean;
  createdAt: Date;
}

/**
 * Account Service Implementation
 */
export class AccountServiceImpl implements AccountService {
  /**
   * Delete a user account and all associated data
   * 
   * Cascade deletes all user data including:
   * - Contacts (and associated groups, tags via junction tables)
   * - Groups
   * - Tags (via contact_tags junction)
   * - Suggestions
   * - Interaction logs
   * - Voice notes
   * - Google calendar connections
   * - Availability parameters
   * - Notification preferences
   * - OAuth tokens
   * 
   * Requirements: 23.1, 23.2, 23.3
   * Property 71: Complete account deletion
   * Property 72: Account deletion confirmation
   */
  async deleteUserAccount(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify user exists
      const userResult = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userEmail = userResult.rows[0].email;

      // Delete user (CASCADE will handle all related data)
      // The ON DELETE CASCADE constraints in the schema will automatically delete:
      // - contacts (which cascades to contact_groups and contact_tags)
      // - groups
      // - interaction_logs
      // - suggestions
      // - voice_notes
      // - google_calendars
      // - availability_params
      // - notification_preferences
      // - oauth_tokens
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      // Log successful deletion (in production, this would send confirmation email)
      console.log(`Account deleted successfully for user: ${userEmail} (${userId})`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a test user for validation purposes
   * 
   * Test users are isolated from production users and support all standard functionality.
   * 
   * Requirements: 24.1, 24.2
   * Property 73: Test user functionality
   * Property 74: Test user isolation
   */
  async createTestUser(email: string, name?: string): Promise<TestUser> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user with is_test_user flag
      const result = await client.query(
        `INSERT INTO users (email, name, is_test_user)
         VALUES ($1, $2, true)
         RETURNING id, email, name, is_test_user, created_at`,
        [email, name || null]
      );

      await client.query('COMMIT');

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        name: row.name || undefined,
        isTestUser: row.is_test_user,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a user is a test user
   * 
   * Used to ensure test users are isolated from production operations.
   */
  async isTestUser(userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT is_test_user FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0].is_test_user || false;
  }
}

// Export singleton instance
export const accountService = new AccountServiceImpl();
