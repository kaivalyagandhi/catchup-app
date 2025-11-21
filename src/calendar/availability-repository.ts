/**
 * Availability Parameters Repository
 *
 * Handles database operations for user availability parameters
 */

import pool from '../db/connection';
import { AvailabilityParams, TimeBlock, CommuteWindow } from '../types';

export interface AvailabilityParamsRow {
  id: string;
  user_id: string;
  manual_time_blocks: any;
  commute_windows: any;
  nighttime_start: string | null;
  nighttime_end: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to AvailabilityParams interface
 */
function rowToAvailabilityParams(row: AvailabilityParamsRow): AvailabilityParams {
  return {
    manualTimeBlocks: row.manual_time_blocks || undefined,
    commuteWindows: row.commute_windows || undefined,
    nighttimeStart: row.nighttime_start || undefined,
    nighttimeEnd: row.nighttime_end || undefined,
  };
}

/**
 * Get availability parameters for a user
 */
export async function getAvailabilityParams(
  userId: string
): Promise<AvailabilityParams | null> {
  const result = await pool.query<AvailabilityParamsRow>(
    'SELECT * FROM availability_params WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return rowToAvailabilityParams(result.rows[0]);
}

/**
 * Create or update availability parameters for a user
 */
export async function upsertAvailabilityParams(
  userId: string,
  params: AvailabilityParams
): Promise<AvailabilityParams> {
  const result = await pool.query<AvailabilityParamsRow>(
    `INSERT INTO availability_params (
      user_id,
      manual_time_blocks,
      commute_windows,
      nighttime_start,
      nighttime_end
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      manual_time_blocks = EXCLUDED.manual_time_blocks,
      commute_windows = EXCLUDED.commute_windows,
      nighttime_start = EXCLUDED.nighttime_start,
      nighttime_end = EXCLUDED.nighttime_end,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      userId,
      params.manualTimeBlocks ? JSON.stringify(params.manualTimeBlocks) : null,
      params.commuteWindows ? JSON.stringify(params.commuteWindows) : null,
      params.nighttimeStart || null,
      params.nighttimeEnd || null,
    ]
  );

  return rowToAvailabilityParams(result.rows[0]);
}

/**
 * Delete availability parameters for a user
 */
export async function deleteAvailabilityParams(userId: string): Promise<void> {
  await pool.query('DELETE FROM availability_params WHERE user_id = $1', [userId]);
}
