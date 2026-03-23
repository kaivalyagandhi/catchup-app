/**
 * User Preferences Repository
 *
 * Data access layer for the user_preferences key-value store table.
 */

import pool from '../db/connection';

/**
 * User Preferences Repository Interface
 */
export interface UserPreferencesRepository {
  get(userId: string, key: string): Promise<any | null>;
  set(userId: string, key: string, value: any): Promise<void>;
  delete(userId: string, key: string): Promise<void>;
}

/**
 * PostgreSQL User Preferences Repository Implementation
 */
export class PostgresUserPreferencesRepository implements UserPreferencesRepository {
  async get(userId: string, key: string): Promise<any | null> {
    const result = await pool.query(
      'SELECT preference_value FROM user_preferences WHERE user_id = $1 AND preference_key = $2',
      [userId, key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].preference_value;
  }

  async set(userId: string, key: string, value: any): Promise<void> {
    await pool.query(
      `INSERT INTO user_preferences (user_id, preference_key, preference_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, preference_key)
       DO UPDATE SET preference_value = $3, updated_at = NOW()`,
      [userId, key, JSON.stringify(value)]
    );
  }

  async delete(userId: string, key: string): Promise<void> {
    await pool.query(
      'DELETE FROM user_preferences WHERE user_id = $1 AND preference_key = $2',
      [userId, key]
    );
  }
}

// Default instance
const defaultRepository = new PostgresUserPreferencesRepository();

export const get = (userId: string, key: string) => defaultRepository.get(userId, key);
export const set = (userId: string, key: string, value: any) =>
  defaultRepository.set(userId, key, value);
export const del = (userId: string, key: string) => defaultRepository.delete(userId, key);
