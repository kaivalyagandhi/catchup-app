/**
 * Account Service
 *
 * Handles account-level operations including account deletion and test user management.
 * Requirements: 23.1-23.3, 24.1-24.2
 */

import pool from '../db/connection';
import { logAuditEvent, AuditAction } from '../utils/audit-logger';
import { accountDeletionService } from '../sms/account-deletion-service';

/**
 * Account Service Interface
 */
export interface AccountService {
  deleteUserAccount(userId: string): Promise<void>;
  clearAllUserData(userId: string): Promise<ClearDataResult>;
  createTestUser(email: string, name?: string): Promise<TestUser>;
  isTestUser(userId: string): Promise<boolean>;
  exportUserData(userId: string, format: 'json' | 'csv'): Promise<UserDataExport>;
}

export interface ClearDataResult {
  contactsDeleted: number;
  groupsDeleted: number;
  tagsDeleted: number;
  suggestionsDeleted: number;
  interactionLogsDeleted: number;
  voiceNotesDeleted: number;
  calendarEventsDeleted: number;
}

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  isTestUser: boolean;
  createdAt: Date;
}

export interface UserDataExport {
  format: 'json' | 'csv';
  data: any;
  filename: string;
  contentType: string;
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

      // Delete SMS/MMS-related data first (phone numbers, enrichments, temp files)
      // Requirement 10.5: Account deletion cascade for SMS/MMS data
      const smsResult = await accountDeletionService.deleteUserSMSData(userId);
      console.log(`SMS/MMS data deletion result:`, {
        phoneNumbersDeleted: smsResult.phoneNumbersDeleted,
        enrichmentsDeleted: smsResult.enrichmentsDeleted,
        tempFilesDeleted: smsResult.tempFilesDeleted,
        errors: smsResult.errors,
      });

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
      // - user_phone_numbers (already deleted above, but CASCADE ensures cleanup)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      // Log audit event for account deletion
      await logAuditEvent(AuditAction.ACCOUNT_DELETED, {
        userId,
        metadata: { email: userEmail },
        success: true,
      });

      // Log successful deletion (in production, this would send confirmation email)
      console.log(`Account deleted successfully for user: ${userEmail} (${userId})`);
    } catch (error) {
      await client.query('ROLLBACK');

      // Log failed deletion attempt
      await logAuditEvent(AuditAction.ACCOUNT_DELETED, {
        userId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clear all user data while keeping the account active
   *
   * Deletes all user data including:
   * - Contacts (and associated groups, tags via junction tables)
   * - Groups
   * - Tags (via contact_tags junction)
   * - Suggestions
   * - Interaction logs
   * - Voice notes
   * - Calendar events
   *
   * But preserves:
   * - User account
   * - OAuth tokens
   * - Notification preferences
   * - Availability parameters
   */
  async clearAllUserData(userId: string): Promise<ClearDataResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify user exists
      const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Delete in proper order to maintain referential integrity

      // 1. Delete enrichment items (references voice_notes and includes SMS/MMS enrichments)
      const enrichmentResult = await client.query(
        `DELETE FROM enrichment_items
         WHERE voice_note_id IN (SELECT id FROM voice_notes WHERE user_id = $1)
         OR user_id = $1`,
        [userId]
      );

      // 2. Delete voice notes (voice_note_contacts cascades)
      const voiceNotesResult = await client.query('DELETE FROM voice_notes WHERE user_id = $1', [
        userId,
      ]);

      // 3. Delete suggestions (suggestion_contacts cascades)
      const suggestionsResult = await client.query('DELETE FROM suggestions WHERE user_id = $1', [
        userId,
      ]);

      // 4. Delete interaction logs
      const interactionLogsResult = await client.query(
        'DELETE FROM interaction_logs WHERE user_id = $1',
        [userId]
      );

      // 5. Delete calendar events
      const calendarEventsResult = await client.query(
        'DELETE FROM calendar_events WHERE user_id = $1',
        [userId]
      );

      // 6. Delete contact_tags associations
      await client.query(
        `DELETE FROM contact_tags
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 7. Delete contact_groups associations
      await client.query(
        `DELETE FROM contact_groups
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 8. Delete contacts
      const contactsResult = await client.query('DELETE FROM contacts WHERE user_id = $1', [
        userId,
      ]);

      // 9. Delete groups (only if they have no other contacts)
      const groupsResult = await client.query(
        `DELETE FROM groups
         WHERE user_id = $1
         AND id NOT IN (SELECT DISTINCT group_id FROM contact_groups)`,
        [userId]
      );

      // 10. Delete orphaned tags (tags with no contact associations)
      const tagsResult = await client.query(
        `DELETE FROM tags 
         WHERE user_id = $1
         AND id NOT IN (
          SELECT DISTINCT tag_id FROM contact_tags
        )`,
        [userId]
      );

      await client.query('COMMIT');

      const result: ClearDataResult = {
        contactsDeleted: contactsResult.rowCount || 0,
        groupsDeleted: groupsResult.rowCount || 0,
        tagsDeleted: tagsResult.rowCount || 0,
        suggestionsDeleted: suggestionsResult.rowCount || 0,
        interactionLogsDeleted: interactionLogsResult.rowCount || 0,
        voiceNotesDeleted: voiceNotesResult.rowCount || 0,
        calendarEventsDeleted: calendarEventsResult.rowCount || 0,
      };

      // Log audit event for data clearing
      await logAuditEvent(AuditAction.DATA_CLEARED, {
        userId,
        metadata: result,
        success: true,
      });

      console.log(`All user data cleared successfully for user: ${userId}`, result);
      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      // Log failed clearing attempt
      await logAuditEvent(AuditAction.DATA_CLEARED, {
        userId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

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

      // Create user with is_test_user flag and required google_id/auth_provider
      const result = await client.query(
        `INSERT INTO users (email, name, google_id, auth_provider, is_test_user)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, email, name, is_test_user, created_at`,
        [
          email,
          name || null,
          `google_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          'google',
        ]
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
    const result = await pool.query('SELECT is_test_user FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0].is_test_user || false;
  }

  /**
   * Export all user data for GDPR compliance
   *
   * Exports complete user data including:
   * - User account information
   * - All contacts with metadata
   * - Groups
   * - Suggestions
   * - Interaction logs
   * - Voice notes
   * - Preferences (availability and notifications)
   *
   * Supports both JSON and CSV formats.
   *
   * Requirements: All (compliance)
   */
  async exportUserData(userId: string, format: 'json' | 'csv' = 'json'): Promise<UserDataExport> {
    const client = await pool.connect();
    try {
      // Verify user exists
      const userResult = await client.query(
        'SELECT id, email, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Fetch all user data
      const [
        contacts,
        groups,
        suggestions,
        interactions,
        voiceNotes,
        availabilityPrefs,
        notificationPrefs,
      ] = await Promise.all([
        this.fetchUserContacts(client, userId),
        this.fetchUserGroups(client, userId),
        this.fetchUserSuggestions(client, userId),
        this.fetchUserInteractions(client, userId),
        this.fetchUserVoiceNotes(client, userId),
        this.fetchAvailabilityPreferences(client, userId),
        this.fetchNotificationPreferences(client, userId),
      ]);

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
        },
        contacts,
        groups,
        suggestions,
        interactionLogs: interactions,
        voiceNotes,
        preferences: {
          availability: availabilityPrefs,
          notifications: notificationPrefs,
        },
        exportedAt: new Date().toISOString(),
      };

      // Log audit event for data export
      await logAuditEvent(AuditAction.DATA_EXPORTED, {
        userId,
        metadata: { format, recordCount: contacts.length },
        success: true,
      });

      if (format === 'json') {
        return {
          format: 'json',
          data: JSON.stringify(exportData, null, 2),
          filename: `catchup_export_${userId}_${Date.now()}.json`,
          contentType: 'application/json',
        };
      } else {
        // Convert to CSV format (multiple CSV files in a structure)
        const csvData = this.convertToCSV(exportData);
        return {
          format: 'csv',
          data: csvData,
          filename: `catchup_export_${userId}_${Date.now()}.csv`,
          contentType: 'text/csv',
        };
      }
    } catch (error) {
      // Log failed export attempt
      await logAuditEvent(AuditAction.DATA_EXPORTED, {
        userId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  private async fetchUserContacts(
    client: any,
    userId: string
  ): Promise<Array<Record<string, any>>> {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.phone, c.email, c.linkedin, c.instagram, c.x_handle,
        c.location, c.timezone, c.custom_notes, c.last_contact_date,
        c.frequency_preference, c.archived, c.created_at, c.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', t.id, 'text', t.text, 'source', t.source)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        COALESCE(
          json_agg(DISTINCT g.name) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as groups
      FROM contacts c
      LEFT JOIN contact_tags ct ON c.id = ct.contact_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      LEFT JOIN contact_groups cg ON c.id = cg.contact_id
      LEFT JOIN groups g ON cg.group_id = g.id
      WHERE c.user_id = $1
      GROUP BY c.id`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      linkedIn: row.linkedin,
      instagram: row.instagram,
      xHandle: row.x_handle,
      location: row.location,
      timezone: row.timezone,
      customNotes: row.custom_notes,
      lastContactDate: row.last_contact_date,
      frequencyPreference: row.frequency_preference,
      tags: row.tags,
      groups: row.groups,
      archived: row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private async fetchUserGroups(client: any, userId: string): Promise<Array<Record<string, any>>> {
    const result = await client.query(
      `SELECT id, name, is_default, is_promoted_from_tag, archived, created_at, updated_at
       FROM groups
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      isDefault: row.is_default,
      isPromotedFromTag: row.is_promoted_from_tag,
      archived: row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private async fetchUserSuggestions(
    client: any,
    userId: string
  ): Promise<Array<Record<string, any>>> {
    const result = await client.query(
      `SELECT 
        s.id, s.contact_id, c.name as contact_name,
        s.trigger_type, s.proposed_timeslot_start, s.proposed_timeslot_end,
        s.proposed_timeslot_timezone, s.reasoning, s.status,
        s.dismissal_reason, s.calendar_event_id, s.snoozed_until,
        s.created_at, s.updated_at
       FROM suggestions s
       LEFT JOIN contacts c ON s.contact_id = c.id
       WHERE s.user_id = $1`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      contactId: row.contact_id,
      contactName: row.contact_name,
      triggerType: row.trigger_type,
      proposedTimeslot: {
        start: row.proposed_timeslot_start,
        end: row.proposed_timeslot_end,
        timezone: row.proposed_timeslot_timezone,
      },
      reasoning: row.reasoning,
      status: row.status,
      dismissalReason: row.dismissal_reason,
      calendarEventId: row.calendar_event_id,
      snoozedUntil: row.snoozed_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  private async fetchUserInteractions(
    client: any,
    userId: string
  ): Promise<Array<Record<string, any>>> {
    const result = await client.query(
      `SELECT 
        i.id, i.contact_id, c.name as contact_name,
        i.date, i.type, i.notes, i.suggestion_id, i.created_at
       FROM interaction_logs i
       LEFT JOIN contacts c ON i.contact_id = c.id
       WHERE i.user_id = $1
       ORDER BY i.date DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      contactId: row.contact_id,
      contactName: row.contact_name,
      date: row.date,
      type: row.type,
      notes: row.notes,
      suggestionId: row.suggestion_id,
      createdAt: row.created_at,
    }));
  }

  private async fetchUserVoiceNotes(
    client: any,
    userId: string
  ): Promise<Array<Record<string, any>>> {
    const result = await client.query(
      `SELECT 
        v.id, v.audio_url, v.transcript, v.contact_id,
        c.name as contact_name, v.extracted_entities,
        v.processed, v.created_at
       FROM voice_notes v
       LEFT JOIN contacts c ON v.contact_id = c.id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      audioUrl: row.audio_url,
      transcript: row.transcript,
      contactId: row.contact_id,
      contactName: row.contact_name,
      extractedEntities: row.extracted_entities,
      processed: row.processed,
      createdAt: row.created_at,
    }));
  }

  private async fetchAvailabilityPreferences(client: any, userId: string): Promise<any> {
    const result = await client.query(
      `SELECT manual_time_blocks, commute_windows, nighttime_start, nighttime_end
       FROM availability_params
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      manualTimeBlocks: row.manual_time_blocks,
      commuteWindows: row.commute_windows,
      nighttimeStart: row.nighttime_start,
      nighttimeEnd: row.nighttime_end,
    };
  }

  private async fetchNotificationPreferences(client: any, userId: string): Promise<any> {
    const result = await client.query(
      `SELECT sms_enabled, email_enabled, batch_day, batch_time, timezone
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      smsEnabled: row.sms_enabled,
      emailEnabled: row.email_enabled,
      batchDay: row.batch_day,
      batchTime: row.batch_time,
      timezone: row.timezone,
    };
  }

  private convertToCSV(data: any): string {
    // For CSV format, we'll create a simplified flat structure
    // In a real implementation, this would create multiple CSV files in a ZIP
    const lines: string[] = [];

    // Contacts CSV
    lines.push('=== CONTACTS ===');
    lines.push(
      'ID,Name,Email,Phone,Location,Timezone,Last Contact Date,Frequency Preference,Archived'
    );
    data.contacts.forEach((contact: any) => {
      lines.push(
        [
          contact.id,
          this.escapeCSV(contact.name),
          this.escapeCSV(contact.email || ''),
          this.escapeCSV(contact.phone || ''),
          this.escapeCSV(contact.location || ''),
          this.escapeCSV(contact.timezone || ''),
          contact.lastContactDate || '',
          contact.frequencyPreference || '',
          contact.archived,
        ].join(',')
      );
    });

    lines.push('');
    lines.push('=== GROUPS ===');
    lines.push('ID,Name,Is Default,Archived');
    data.groups.forEach((group: any) => {
      lines.push([group.id, this.escapeCSV(group.name), group.isDefault, group.archived].join(','));
    });

    lines.push('');
    lines.push('=== SUGGESTIONS ===');
    lines.push('ID,Contact Name,Trigger Type,Status,Created At');
    data.suggestions.forEach((suggestion: any) => {
      lines.push(
        [
          suggestion.id,
          this.escapeCSV(suggestion.contactName || ''),
          suggestion.triggerType,
          suggestion.status,
          suggestion.createdAt,
        ].join(',')
      );
    });

    lines.push('');
    lines.push('=== INTERACTION LOGS ===');
    lines.push('ID,Contact Name,Date,Type,Notes');
    data.interactionLogs.forEach((log: any) => {
      lines.push(
        [
          log.id,
          this.escapeCSV(log.contactName || ''),
          log.date,
          log.type,
          this.escapeCSV(log.notes || ''),
        ].join(',')
      );
    });

    return lines.join('\n');
  }

  private escapeCSV(value: string): string {
    if (!value) return '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

// Export singleton instance
export const accountService = new AccountServiceImpl();
