/**
 * Onboarding Repository
 *
 * Data access layer for onboarding state operations.
 * Manages user progress through the contact onboarding flow.
 *
 * The actual database schema (migration 030) uses a simplified 3-step model:
 *   user_id (PK), is_complete, current_step (integer 1-3), dismissed_at,
 *   integrations_complete, google_calendar_connected, google_contacts_connected,
 *   circles_complete, contacts_categorized, total_contacts,
 *   groups_complete, mappings_reviewed, total_mappings,
 *   created_at, updated_at
 *
 * This repository maps between the simplified schema and the OnboardingStateRecord
 * interface expected by the rest of the application.
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
    progressiveFlow?: boolean;
    optionalSteps?: string[];
    redirectTo?: string;
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

// --- Mapping helpers between string steps and integer steps ---

/** Map string step name to integer step number (1-3). */
function stepNameToNumber(step: OnboardingStep): number {
  switch (step) {
    case 'welcome':
    case 'import_contacts':
      return 1; // Step 1: Integrations
    case 'circle_assignment':
    case 'preference_setting':
      return 2; // Step 2: Circles
    case 'group_overlay':
      return 3; // Step 3: Groups
    case 'completion':
      return 3;
    default:
      return 1;
  }
}

/**
 * Map integer step number to string step name.
 * Uses integrations_complete to distinguish welcome from import_contacts
 * (both map to step 1).
 */
function stepNumberToName(step: number, isComplete: boolean, integrationsComplete: boolean): OnboardingStep {
  if (isComplete) return 'completion';
  switch (step) {
    case 1:
      return integrationsComplete ? 'circle_assignment' : 'welcome';
    case 2:
      return 'circle_assignment';
    case 3:
      return 'group_overlay';
    default:
      return 'welcome';
  }
}

/** Derive completed steps from the boolean flags in the DB row */
function deriveCompletedSteps(row: any): string[] {
  const steps: string[] = [];
  if (row.integrations_complete) {
    steps.push('welcome', 'import_contacts');
  }
  if (row.circles_complete) {
    steps.push('circle_assignment', 'preference_setting');
  }
  if (row.groups_complete) {
    steps.push('group_overlay');
  }
  if (row.is_complete) {
    steps.push('completion');
  }
  return steps;
}

/**
 * PostgreSQL Onboarding Repository Implementation
 *
 * Works with the simplified 3-step schema from migration 030.
 */
export class PostgresOnboardingRepository implements OnboardingRepository {
  /**
   * Create new onboarding state for a user
   * Requirements: 1.5
   */
  async create(data: OnboardingStateCreateData): Promise<OnboardingStateRecord> {
    const currentStep = data.currentStep || 'welcome';
    const stepNum = stepNameToNumber(currentStep);
    const categorizedCount = data.progressData?.categorizedCount ?? 0;
    const totalCount = data.progressData?.totalCount ?? 0;

    const result = await pool.query(
      `INSERT INTO onboarding_state (
        user_id, current_step, contacts_categorized, total_contacts
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_step = EXCLUDED.current_step,
        contacts_categorized = EXCLUDED.contacts_categorized,
        total_contacts = EXCLUDED.total_contacts,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [data.userId, stepNum, categorizedCount, totalCount],
    );

    return this.mapRowToOnboardingState(result.rows[0], data.triggerType);
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
        [userId],
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Onboarding state not found');
      }

      const row = currentResult.rows[0];

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.currentStep !== undefined) {
        updates.push(`current_step = $${paramCount++}`);
        values.push(stepNameToNumber(data.currentStep));
      }

      if (data.completedSteps !== undefined) {
        // Map completed steps to boolean flags
        if (data.completedSteps.includes('import_contacts') || data.completedSteps.includes('welcome')) {
          updates.push(`integrations_complete = $${paramCount++}`);
          values.push(true);
        }
        if (data.completedSteps.includes('circle_assignment') || data.completedSteps.includes('preference_setting')) {
          updates.push(`circles_complete = $${paramCount++}`);
          values.push(true);
        }
        if (data.completedSteps.includes('group_overlay')) {
          updates.push(`groups_complete = $${paramCount++}`);
          values.push(true);
        }
      }

      if (data.progressData !== undefined) {
        if (data.progressData.categorizedCount !== undefined) {
          updates.push(`contacts_categorized = $${paramCount++}`);
          values.push(data.progressData.categorizedCount);
        }
        if (data.progressData.totalCount !== undefined) {
          updates.push(`total_contacts = $${paramCount++}`);
          values.push(data.progressData.totalCount);
        }
      }

      if (data.completedAt !== undefined) {
        updates.push(`is_complete = $${paramCount++}`);
        values.push(true);
      }

      if (updates.length === 0) {
        await client.query('COMMIT');
        return this.mapRowToOnboardingState(row);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(userId);
      const result = await client.query(
        `UPDATE onboarding_state
         SET ${updates.join(', ')}
         WHERE user_id = $${paramCount}
         RETURNING *`,
        values,
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

      // Map step name to the corresponding boolean column
      let column: string | null = null;
      if (step === 'welcome' || step === 'import_contacts') {
        column = 'integrations_complete';
      } else if (step === 'circle_assignment' || step === 'preference_setting') {
        column = 'circles_complete';
      } else if (step === 'group_overlay') {
        column = 'groups_complete';
      }

      if (!column) {
        await client.query('COMMIT');
        return;
      }

      const result = await client.query(
        `UPDATE onboarding_state
         SET ${column} = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId],
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
       SET is_complete = TRUE,
           current_step = 3,
           integrations_complete = TRUE,
           circles_complete = TRUE,
           groups_complete = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId],
    );

    if (result.rowCount === 0) {
      throw new Error('Onboarding state not found');
    }
  }

  /**
   * Map database row to OnboardingStateRecord.
   * Translates the simplified 3-step schema to the application interface.
   */
  private mapRowToOnboardingState(
    row: any,
    triggerType?: OnboardingTriggerType,
  ): OnboardingStateRecord {
    const completedSteps = deriveCompletedSteps(row);
    const isComplete = !!row.is_complete;

    return {
      id: row.user_id, // PK is user_id in the simplified schema
      userId: row.user_id,
      currentStep: stepNumberToName(row.current_step, isComplete, !!row.integrations_complete),
      completedSteps,
      triggerType: triggerType || 'new_user',
      startedAt: new Date(row.created_at),
      lastUpdatedAt: new Date(row.updated_at),
      completedAt: isComplete ? new Date(row.updated_at) : undefined,
      progressData: {
        categorizedCount: row.contacts_categorized || 0,
        totalCount: row.total_contacts || 0,
        milestonesReached: isComplete ? ['completion'] : [],
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
