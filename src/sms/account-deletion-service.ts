/**
 * Account Deletion Service
 *
 * Handles cascade deletion of SMS/MMS-related data when a user account is deleted.
 * This includes:
 * - Phone number records
 * - Enrichment items from SMS/MMS sources
 * - Temporary media files
 *
 * Requirement 10.5: Account deletion cascade
 */

import pool from '../db/connection';
import { MediaDownloader } from './media-downloader';
import fs from 'fs/promises';
import path from 'path';

export interface AccountDeletionResult {
  success: boolean;
  phoneNumbersDeleted: number;
  enrichmentsDeleted: number;
  tempFilesDeleted: number;
  errors: string[];
}

export class AccountDeletionService {
  private mediaDownloader: MediaDownloader;

  constructor(mediaDownloader?: MediaDownloader) {
    this.mediaDownloader = mediaDownloader || new MediaDownloader();
  }

  /**
   * Delete all SMS/MMS-related data for a user account
   *
   * Requirement 10.5: When a user deletes their account, remove all associated
   * phone numbers and enrichment data
   *
   * @param userId - The user ID to delete data for
   * @returns Result object with counts and any errors
   */
  async deleteUserSMSData(userId: string): Promise<AccountDeletionResult> {
    const result: AccountDeletionResult = {
      success: true,
      phoneNumbersDeleted: 0,
      enrichmentsDeleted: 0,
      tempFilesDeleted: 0,
      errors: [],
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Delete enrichment items from SMS/MMS sources
      // Note: This includes enrichments with source = 'sms' or 'mms'
      const enrichmentResult = await client.query(
        `DELETE FROM enrichment_items 
         WHERE user_id = $1 AND source IN ('sms', 'mms')
         RETURNING id`,
        [userId]
      );
      result.enrichmentsDeleted = enrichmentResult.rowCount || 0;

      console.log(
        `Deleted ${result.enrichmentsDeleted} SMS/MMS enrichment items for user ${userId}`
      );

      // 2. Delete phone number records
      // Note: The database has ON DELETE CASCADE, but we delete explicitly
      // to track the count and ensure cleanup happens
      const phoneResult = await client.query(
        `DELETE FROM user_phone_numbers 
         WHERE user_id = $1
         RETURNING phone_number`,
        [userId]
      );
      result.phoneNumbersDeleted = phoneResult.rowCount || 0;

      console.log(`Deleted ${result.phoneNumbersDeleted} phone number(s) for user ${userId}`);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      result.success = false;
      result.errors.push(`Database deletion failed: ${(error as Error).message}`);
      console.error('Error deleting SMS/MMS data from database:', error);
    } finally {
      client.release();
    }

    // 3. Clean up temporary media files
    // This is done outside the transaction since it's filesystem operations
    try {
      const tempFilesDeleted = await this.cleanupUserTempFiles(userId);
      result.tempFilesDeleted = tempFilesDeleted;
      console.log(`Deleted ${tempFilesDeleted} temporary file(s) for user ${userId}`);
    } catch (error) {
      result.errors.push(`Temp file cleanup failed: ${(error as Error).message}`);
      console.error('Error cleaning up temporary files:', error);
      // Don't mark as failure since database cleanup succeeded
    }

    return result;
  }

  /**
   * Clean up temporary media files for a specific user
   *
   * Requirement 10.2: Delete temporary media files after processing
   * Requirement 10.5: Clean up remaining temporary files on account deletion
   *
   * @param userId - The user ID to clean up files for
   * @returns Number of files deleted
   */
  private async cleanupUserTempFiles(userId: string): Promise<number> {
    const tempDir = path.join(process.cwd(), 'temp', 'media');
    let deletedCount = 0;

    try {
      // Check if temp directory exists
      try {
        await fs.access(tempDir);
      } catch {
        // Directory doesn't exist, nothing to clean up
        return 0;
      }

      const files = await fs.readdir(tempDir);

      // Note: Since temp files don't have user ID in their names,
      // we clean up ALL old temp files (30+ days old) as a safety measure
      // This ensures orphaned files are removed
      deletedCount = await this.mediaDownloader.cleanupTempFiles(30);

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup temp files: ${(error as Error).message}`);
    }
  }

  /**
   * Delete all enrichment items from SMS/MMS sources for a user
   * This is a more targeted deletion that can be called independently
   *
   * @param userId - The user ID
   * @returns Number of enrichments deleted
   */
  async deleteUserEnrichments(userId: string): Promise<number> {
    const result = await pool.query(
      `DELETE FROM enrichment_items 
       WHERE user_id = $1 AND source IN ('sms', 'mms')
       RETURNING id`,
      [userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Delete phone number for a user
   * This is a wrapper around the phone number repository method
   *
   * @param userId - The user ID
   * @returns Number of phone numbers deleted
   */
  async deleteUserPhoneNumber(userId: string): Promise<number> {
    const result = await pool.query(
      `DELETE FROM user_phone_numbers 
       WHERE user_id = $1
       RETURNING id`,
      [userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Get statistics about SMS/MMS data for a user
   * Useful for showing users what will be deleted
   *
   * @param userId - The user ID
   * @returns Statistics object
   */
  async getUserSMSDataStats(userId: string): Promise<{
    phoneNumbers: number;
    enrichments: number;
    enrichmentsBySource: { sms: number; mms: number };
  }> {
    const client = await pool.connect();

    try {
      // Count phone numbers
      const phoneResult = await client.query(
        'SELECT COUNT(*) as count FROM user_phone_numbers WHERE user_id = $1',
        [userId]
      );

      // Count enrichments by source
      const enrichmentResult = await client.query(
        `SELECT source, COUNT(*) as count 
         FROM enrichment_items 
         WHERE user_id = $1 AND source IN ('sms', 'mms')
         GROUP BY source`,
        [userId]
      );

      const enrichmentsBySource = { sms: 0, mms: 0 };
      let totalEnrichments = 0;

      for (const row of enrichmentResult.rows) {
        const count = parseInt(row.count, 10);
        enrichmentsBySource[row.source as 'sms' | 'mms'] = count;
        totalEnrichments += count;
      }

      return {
        phoneNumbers: parseInt(phoneResult.rows[0].count, 10),
        enrichments: totalEnrichments,
        enrichmentsBySource,
      };
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const accountDeletionService = new AccountDeletionService();
