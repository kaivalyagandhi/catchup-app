/**
 * Onboarding Repository
 *
 * Data access layer for onboarding state operations.
 * Manages user progress through the contact onboarding flow.
 *
 * Requirements: 1.5, 3.3, 7.1, 8.3, 12.2, 12.5
 */

import pool from '../db/connection';

/**
 * Onboarding step types
 */
export type OnboardingStep =
  | 'welcome'
  | 'import_contacts'
  | 'circle_assignment'
  | 'preference_setting'
  | 'group_overlay'
  | 'completion';

/**
 * Onboarding trigger types
 */
export type OnboardingTriggerType = 'new_user' | 'post_import' | 'manage' | 'manual';

/**
 * Onboarding state record from database
 */
export interface OnboardingStateRecord {
  id: string;
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: string[];
  triggerType: OnboardingTriggerType;
  startedAt: Date;
  lastUpdatedAt: Date;
  completedAt?: Date;
  progressData: {
    categorizedCount: number;
    totalCount: number;
    milestonesReached: string[];
    timeSpent: number;
  };
}

/**
 * Data for creating onboarding state
 */
export interface OnboardingStateCreateData {
  userId: string;
  triggerType: OnboardingTriggerType;
  currentStep?: OnboardingStep;
  progressData?: Partial<OnboardingStateRecord['progressData']>;
}

/**
 * Data for updating onboarding state
 */
export interface OnboardingStateUpdateData {
  currentStep?: OnboardingStep;
  completedSteps?: string[];
  progressData?: Partial<OnboardingStateRecord['progressData']>;
  completedAt?: Date;
}

/**
 * Onboarding Repository Interface
 */
export interface OnboardingRepository {
  create(data: OnboardingStateCreateData): Promise<OnboardingStateRecord>;
  update(userId: string, data: OnboardingStateUpdateData): Promise<OnboardingStateRecord>;
  findByUserId(userId: string): Promise<OnboardingStateRecord | null>;
  delete(userId: string): Promise<void>;
  markStepComplete(userId: string, step: string): Promise<void>;
  markComplete(userId: string): Promise<void>;
}

/**
 * PostgreSQL Onboarding Repository Implementation
 */
export class PostgresOnboardingRepository implements OnboardingRepository {
  /**
   * Create new onboarding state for a user
   * Requirements: 1.5
   */
  async create(data: OnboardingStateCreateData): Promise<OnboardingStateRecord> {
    const currentStep = data.currentStep || 'welcome';
    const progressData = {
      categorizedCount: 0,
      totalCount: 0,
      milestonesReached: [],
      timeSpent: 0,
      ...data.progressData,
    };

    const result = await pool.query(
      `INSERT INTO onboarding_state (
        user_id, current_step, trigger_type, progress_data
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_step = EXCLUDED.current_step,
        trigger_type = EXCLUDED.trigger_type,
        progress_data = EXCLUDED.progress_data,
        last_updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [data.userId, currentStep, data.triggerType, JSON.stringify(progressData)]
    );

    return this.mapRowToOnboardingState(result.rows[0]);
  }

  /**
   * Update onboarding state
   * Requirements: 1.5
   */
  async update(userId: string, data: OnboardingStateUpdateData): Promise<OnboardingStateRecord> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state
      const currentResult = await client.query(
        'SELECT * FROM onboarding_state WHERE user_id = $1',
        [userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Onboarding state not found');
      }

      const current = this.mapRowToOnboardingState(currentResult.rows[0]);

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.currentStep !== undefined) {
        updates.push(`current_step = $${paramCount++}`);
        values.push(data.currentStep);
      }

      if (data.completedSteps !== undefined) {
        updates.push(`completed_steps = $${paramCount++}`);
        values.push(JSON.stringify(data.completedSteps));
      }

      if (data.progressData !== undefined) {
        const mergedProgressData = {
          ...current.progressData,
          ...data.progressData,
        };
        updates.push(`progress_data = $${paramCount++}`);
        values.push(JSON.stringify(mergedProgressData));
      }

      if (data.completedAt !== undefined) {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(data.completedAt);
      }

      if (updates.length === 0) {
        await client.query('COMMIT');
        return current;
      }

      values.push(userId);
      const result = await client.query(
        `UPDATE onboarding_state 
         SET ${updates.join(', ')}
         WHERE user_id = $${paramCount}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');
      return this.mapRowToOnboardingState(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find onboarding state by user ID
   * Requirements: 1.5
   */
  async findByUserId(userId: string): Promise<OnboardingStateRecord | null> {
    const result = await pool.query('SELECT * FROM onboarding_state WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOnboardingState(result.rows[0]);
  }

  /**
   * Delete onboarding state
   * Used when user completes onboarding or resets
   */
  async delete(userId: string): Promise<void> {
    await pool.query('DELETE FROM onboarding_state WHERE user_id = $1', [userId]);
  }

  /**
   * Mark a step as complete
   * Requirements: 1.5
   */
  async markStepComplete(userId: string, step: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE onboarding_state
         SET completed_steps = 
           CASE 
             WHEN completed_steps @> $2::jsonb THEN completed_steps
             ELSE completed_steps || $2::jsonb
           END
         WHERE user_id = $1
         RETURNING *`,
        [userId, JSON.stringify([step])]
      );

      if (result.rows.length === 0) {
        throw new Error('Onboarding state not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark onboarding as complete
   * Requirements: 1.5
   */
  async markComplete(userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE onboarding_state
       SET completed_at = CURRENT_TIMESTAMP,
           current_step = 'completion'
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Onboarding state not found');
    }
  }

  /**
   * Map database row to OnboardingStateRecord
   */
  private mapRowToOnboardingState(row: any): OnboardingStateRecord {
    return {
      id: row.id,
      userId: row.user_id,
      currentStep: row.current_step as OnboardingStep,
      completedSteps: row.completed_steps || [],
      triggerType: row.trigger_type as OnboardingTriggerType,
      startedAt: new Date(row.started_at),
      lastUpdatedAt: new Date(row.last_updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      progressData: row.progress_data || {
        categorizedCount: 0,
        totalCount: 0,
        milestonesReached: [],
        timeSpent: 0,
      },
    };
  }
}

// Default instance for backward compatibility
const defaultRepository = new PostgresOnboardingRepository();

export const create = (data: OnboardingStateCreateData) => defaultRepository.create(data);
export const update = (userId: string, data: OnboardingStateUpdateData) =>
  defaultRepository.update(userId, data);
export const findByUserId = (userId: string) => defaultRepository.findByUserId(userId);
export const deleteState = (userId: string) => defaultRepository.delete(userId);
export const markStepComplete = (userId: string, step: string) =>
  defaultRepository.markStepComplete(userId, step);
export const markComplete = (userId: string) => defaultRepository.markComplete(userId);
