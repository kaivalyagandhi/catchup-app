/**
 * Frequency Preference Service
 *
 * Business logic layer for managing contact frequency preferences.
 */

import pool from '../db/connection';
import { FrequencyOption } from '../types';

/**
 * Frequency Service Interface
 */
export interface FrequencyService {
  setFrequencyPreference(
    contactId: string,
    userId: string,
    frequency: FrequencyOption
  ): Promise<void>;
  getFrequencyPreference(contactId: string, userId: string): Promise<FrequencyOption | null>;
}

/**
 * Frequency Service Implementation
 */
export class FrequencyServiceImpl implements FrequencyService {
  async setFrequencyPreference(
    contactId: string,
    userId: string,
    frequency: FrequencyOption
  ): Promise<void> {
    // Validate inputs
    if (!contactId || !userId) {
      throw new Error('Contact ID and User ID are required');
    }

    if (!frequency) {
      throw new Error('Frequency preference is required');
    }

    // Validate frequency option
    const validFrequencies = Object.values(FrequencyOption);
    if (!validFrequencies.includes(frequency)) {
      throw new Error(`Invalid frequency option. Must be one of: ${validFrequencies.join(', ')}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact belongs to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      // Update frequency preference
      await client.query(
        `UPDATE contacts
         SET frequency_preference = $1
         WHERE id = $2 AND user_id = $3`,
        [frequency, contactId, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getFrequencyPreference(contactId: string, userId: string): Promise<FrequencyOption | null> {
    if (!contactId || !userId) {
      throw new Error('Contact ID and User ID are required');
    }

    const result = await pool.query(
      'SELECT frequency_preference FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Contact not found');
    }

    return result.rows[0].frequency_preference || null;
  }
}

// Export singleton instance
export const frequencyService = new FrequencyServiceImpl();
