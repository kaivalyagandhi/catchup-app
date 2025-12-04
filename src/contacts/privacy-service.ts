/**
 * Privacy Service
 *
 * Handles privacy-related operations including data export and account deletion
 */

import pool from '../db/connection';
import { logAuditEvent, AuditAction } from '../utils/audit-logger';

export interface DataExportOptions {
  userId: string;
  includeContacts?: boolean;
  includeCircleAssignments?: boolean;
  includeOnboardingData?: boolean;
  includeAchievements?: boolean;
  includeWeeklyCatchup?: boolean;
  includeInteractions?: boolean;
  includeVoiceNotes?: boolean;
}

export interface ExportedData {
  exportDate: Date;
  userId: string;
  contacts?: any[];
  circleAssignments?: any[];
  onboardingState?: any;
  achievements?: any[];
  weeklyCatchupSessions?: any[];
  interactions?: any[];
  voiceNotes?: any[];
  groups?: any[];
  tags?: any[];
  preferences?: any;
}

export interface AccountDeletionResult {
  success: boolean;
  deletedRecords: {
    contacts: number;
    circleAssignments: number;
    onboardingState: number;
    achievements: number;
    weeklyCatchupSessions: number;
    interactions: number;
    voiceNotes: number;
    groups: number;
    tags: number;
    suggestions: number;
    oauthTokens: number;
    auditLogs: number;
  };
}

/**
 * Privacy Service Implementation
 */
export class PrivacyService {
  /**
   * Export all user data in a structured format
   */
  async exportUserData(options: DataExportOptions): Promise<ExportedData> {
    const { userId } = options;
    const exportData: ExportedData = {
      exportDate: new Date(),
      userId,
    };

    try {
      // Export contacts
      if (options.includeContacts !== false) {
        const contactsResult = await pool.query(
          `SELECT id, name, phone, email, location, timezone, custom_notes, 
                  frequency_preference, last_contact_date,
                  dunbar_circle, circle_assigned_at, circle_confidence,
                  ai_suggested_circle, archived, created_at, updated_at
           FROM contacts 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );
        exportData.contacts = contactsResult.rows;
      }

      // Export circle assignments history
      if (options.includeCircleAssignments !== false) {
        const assignmentsResult = await pool.query(
          `SELECT id, contact_id, from_circle, to_circle, assigned_by,
                  confidence, assigned_at, reason
           FROM circle_assignments 
           WHERE user_id = $1 
           ORDER BY assigned_at DESC`,
          [userId]
        );
        exportData.circleAssignments = assignmentsResult.rows;
      }

      // Export onboarding state
      if (options.includeOnboardingData !== false) {
        const onboardingResult = await pool.query(
          `SELECT id, current_step, completed_steps, trigger_type,
                  started_at, last_updated_at, completed_at, progress_data
           FROM onboarding_state 
           WHERE user_id = $1`,
          [userId]
        );
        exportData.onboardingState = onboardingResult.rows[0] || null;
      }

      // Export achievements
      if (options.includeAchievements !== false) {
        const achievementsResult = await pool.query(
          `SELECT id, achievement_type, achievement_data, earned_at
           FROM onboarding_achievements 
           WHERE user_id = $1 
           ORDER BY earned_at DESC`,
          [userId]
        );
        exportData.achievements = achievementsResult.rows;
      }

      // Export weekly catchup sessions
      if (options.includeWeeklyCatchup !== false) {
        const catchupResult = await pool.query(
          `SELECT id, week_number, year, contacts_to_review, reviewed_contacts,
                  started_at, completed_at, skipped
           FROM weekly_catchup_sessions 
           WHERE user_id = $1 
           ORDER BY year DESC, week_number DESC`,
          [userId]
        );
        exportData.weeklyCatchupSessions = catchupResult.rows;
      }

      // Export interactions
      if (options.includeInteractions !== false) {
        const interactionsResult = await pool.query(
          `SELECT il.id, il.contact_id, c.name as contact_name, 
                  il.type, il.date, il.notes, il.created_at
           FROM interaction_logs il
           LEFT JOIN contacts c ON il.contact_id = c.id
           WHERE il.user_id = $1 
           ORDER BY il.date DESC`,
          [userId]
        );
        exportData.interactions = interactionsResult.rows;
      }

      // Export voice notes
      if (options.includeVoiceNotes !== false) {
        const voiceNotesResult = await pool.query(
          `SELECT vn.id, vn.transcript, vn.created_at,
                  array_agg(c.name) as mentioned_contacts
           FROM voice_notes vn
           LEFT JOIN voice_note_contacts vnc ON vn.id = vnc.voice_note_id
           LEFT JOIN contacts c ON vnc.contact_id = c.id
           WHERE vn.user_id = $1
           GROUP BY vn.id
           ORDER BY vn.created_at DESC`,
          [userId]
        );
        exportData.voiceNotes = voiceNotesResult.rows;
      }

      // Export groups
      const groupsResult = await pool.query(
        `SELECT id, name, is_default, is_promoted_from_tag, archived, created_at
         FROM groups 
         WHERE user_id = $1 
         ORDER BY name`,
        [userId]
      );
      exportData.groups = groupsResult.rows;

      // Export tags
      const tagsResult = await pool.query(
        `SELECT id, text, source, created_at
         FROM tags 
         WHERE user_id = $1 
         ORDER BY text`,
        [userId]
      );
      exportData.tags = tagsResult.rows;

      // Export preferences
      const preferencesResult = await pool.query(
        `SELECT *
         FROM notification_preferences 
         WHERE user_id = $1`,
        [userId]
      );
      exportData.preferences = preferencesResult.rows[0] || null;

      // Log the export
      await logAuditEvent(AuditAction.DATA_EXPORTED, {
        userId,
        metadata: {
          contactsCount: exportData.contacts?.length || 0,
          includeOptions: options,
        },
        success: true,
      });

      return exportData;
    } catch (error) {
      await logAuditEvent(AuditAction.DATA_EXPORTED, {
        userId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete all user data permanently
   * This operation cannot be undone
   */
  async deleteAccount(userId: string): Promise<AccountDeletionResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result: AccountDeletionResult = {
        success: false,
        deletedRecords: {
          contacts: 0,
          circleAssignments: 0,
          onboardingState: 0,
          achievements: 0,
          weeklyCatchupSessions: 0,
          interactions: 0,
          voiceNotes: 0,
          groups: 0,
          tags: 0,
          suggestions: 0,
          oauthTokens: 0,
          auditLogs: 0,
        },
      };

      // Delete in order to respect foreign key constraints

      // 1. Delete voice note contacts (junction table)
      await client.query(
        `DELETE FROM voice_note_contacts 
         WHERE voice_note_id IN (SELECT id FROM voice_notes WHERE user_id = $1)`,
        [userId]
      );

      // 2. Delete enrichment items
      await client.query(
        `DELETE FROM enrichment_items 
         WHERE voice_note_id IN (SELECT id FROM voice_notes WHERE user_id = $1)`,
        [userId]
      );

      // 3. Delete voice notes
      const voiceNotesResult = await client.query('DELETE FROM voice_notes WHERE user_id = $1', [
        userId,
      ]);
      result.deletedRecords.voiceNotes = voiceNotesResult.rowCount || 0;

      // 4. Delete interaction logs
      const interactionsResult = await client.query(
        'DELETE FROM interaction_logs WHERE user_id = $1',
        [userId]
      );
      result.deletedRecords.interactions = interactionsResult.rowCount || 0;

      // 5. Delete suggestions and related tables
      await client.query(
        `DELETE FROM suggestion_contacts 
         WHERE suggestion_id IN (SELECT id FROM suggestions WHERE user_id = $1)`,
        [userId]
      );
      const suggestionsResult = await client.query('DELETE FROM suggestions WHERE user_id = $1', [
        userId,
      ]);
      result.deletedRecords.suggestions = suggestionsResult.rowCount || 0;

      // 6. Delete contact groups (junction table)
      await client.query(
        `DELETE FROM contact_groups 
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 7. Delete contact tags (junction table)
      await client.query(
        `DELETE FROM contact_tags 
         WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
        [userId]
      );

      // 8. Delete circle assignments
      const circleAssignmentsResult = await client.query(
        'DELETE FROM circle_assignments WHERE user_id = $1',
        [userId]
      );
      result.deletedRecords.circleAssignments = circleAssignmentsResult.rowCount || 0;

      // 9. Delete AI circle overrides
      await client.query('DELETE FROM ai_circle_overrides WHERE user_id = $1', [userId]);

      // 10. Delete contacts
      const contactsResult = await client.query('DELETE FROM contacts WHERE user_id = $1', [
        userId,
      ]);
      result.deletedRecords.contacts = contactsResult.rowCount || 0;

      // 11. Delete groups
      const groupsResult = await client.query('DELETE FROM groups WHERE user_id = $1', [userId]);
      result.deletedRecords.groups = groupsResult.rowCount || 0;

      // 12. Delete tags
      const tagsResult = await client.query('DELETE FROM tags WHERE user_id = $1', [userId]);
      result.deletedRecords.tags = tagsResult.rowCount || 0;

      // 13. Delete weekly catchup sessions
      const catchupResult = await client.query(
        'DELETE FROM weekly_catchup_sessions WHERE user_id = $1',
        [userId]
      );
      result.deletedRecords.weeklyCatchupSessions = catchupResult.rowCount || 0;

      // 14. Delete achievements
      const achievementsResult = await client.query(
        'DELETE FROM onboarding_achievements WHERE user_id = $1',
        [userId]
      );
      result.deletedRecords.achievements = achievementsResult.rowCount || 0;

      // 15. Delete network health scores
      await client.query('DELETE FROM network_health_scores WHERE user_id = $1', [userId]);

      // 16. Delete onboarding state
      const onboardingResult = await client.query(
        'DELETE FROM onboarding_state WHERE user_id = $1',
        [userId]
      );
      result.deletedRecords.onboardingState = onboardingResult.rowCount || 0;

      // 17. Delete notification preferences
      await client.query('DELETE FROM notification_preferences WHERE user_id = $1', [userId]);

      // 18. Delete OAuth tokens
      const oauthResult = await client.query('DELETE FROM oauth_tokens WHERE user_id = $1', [
        userId,
      ]);
      result.deletedRecords.oauthTokens = oauthResult.rowCount || 0;

      // 19. Delete calendar events
      await client.query('DELETE FROM calendar_events WHERE user_id = $1', [userId]);

      // 20. Delete availability params
      await client.query('DELETE FROM availability_params WHERE user_id = $1', [userId]);

      // 21. Delete Google contacts sync state (if table exists)
      try {
        await client.query('DELETE FROM google_contacts_sync_state WHERE user_id = $1', [userId]);
      } catch (error) {
        // Table might not exist, continue
      }

      // 22. Delete Google contact groups (if table exists)
      try {
        await client.query('DELETE FROM google_contact_groups WHERE user_id = $1', [userId]);
      } catch (error) {
        // Table might not exist, continue
      }

      // 23. Delete group mapping suggestions (if table exists)
      try {
        await client.query('DELETE FROM group_mapping_suggestions WHERE user_id = $1', [userId]);
      } catch (error) {
        // Table might not exist, continue
      }

      // 24. Delete audit logs (before logging the deletion to avoid FK issues)
      const auditLogsResult = await client.query('DELETE FROM audit_logs WHERE user_id = $1', [
        userId,
      ]);
      result.deletedRecords.auditLogs = auditLogsResult.rowCount || 0;

      // 25. Finally, delete the user record itself
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      result.success = true;

      // Log the deletion after commit (outside transaction)
      await logAuditEvent(AuditAction.ACCOUNT_DELETED, {
        userId,
        metadata: {
          deletedRecords: result.deletedRecords,
        },
        success: true,
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      // Log the failed deletion attempt
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
   * Verify data isolation - ensure user can only access their own data
   */
  async verifyDataIsolation(
    userId: string,
    resourceId: string,
    resourceType: string
  ): Promise<boolean> {
    let query = '';

    switch (resourceType) {
      case 'contact':
        query = 'SELECT user_id FROM contacts WHERE id = $1';
        break;
      case 'group':
        query = 'SELECT user_id FROM groups WHERE id = $1';
        break;
      case 'tag':
        query = 'SELECT user_id FROM tags WHERE id = $1';
        break;
      case 'voice_note':
        query = 'SELECT user_id FROM voice_notes WHERE id = $1';
        break;
      case 'onboarding_state':
        query = 'SELECT user_id FROM onboarding_state WHERE id = $1';
        break;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    const result = await pool.query(query, [resourceId]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].user_id === userId;
  }

  /**
   * Get privacy notice content
   */
  getPrivacyNotice(): string {
    return `
# CatchUp Privacy Notice

## Your Data, Your Control

CatchUp is designed with privacy at its core. Here's what you need to know:

### What We Store
- Contact information you provide (names, phone numbers, emails)
- Your relationship organization (circles, groups, tags)
- Interaction history you record
- Voice notes and transcriptions
- Your preferences and settings

### How We Use Your Data
- To help you maintain relationships and stay connected
- To provide AI-powered suggestions based on your interaction patterns
- To generate personalized recommendations
- All processing happens securely on our servers

### Your Rights
- **Access**: Export all your data at any time
- **Control**: Modify or delete any information
- **Deletion**: Permanently delete your account and all data
- **Privacy**: Your data is never shared with third parties

### Data Security
- All data is encrypted at rest and in transit
- OAuth tokens are securely encrypted
- Access is strictly controlled by user authentication
- Regular security audits and monitoring

### AI Processing
- AI analysis happens on secure servers
- Your data is never used to train models for other users
- All suggestions are based solely on your own data
- You can override or ignore any AI suggestion

### Third-Party Integrations
- Google Calendar: Read-only access to detect availability
- Google Contacts: Read-only sync (you control when)
- No data is shared with these services beyond authentication

### Data Retention
- Your data is kept as long as your account is active
- You can delete your account at any time
- Upon deletion, all data is permanently removed within 30 days
- Audit logs may be retained for security purposes

### Questions?
Contact us at privacy@catchup.app for any privacy-related questions.

Last updated: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }
}

// Export singleton instance
export const privacyService = new PrivacyService();
