/**
 * Onboarding Input Validation
 *
 * Provides comprehensive validation for all onboarding-related inputs
 * including circle assignments, preferences, and state transitions.
 */

import { ValidationError } from './onboarding-errors';

/**
 * Valid Dunbar circles
 */
export const VALID_CIRCLES = ['inner', 'close', 'active', 'casual', 'acquaintance'] as const;
export type DunbarCircle = (typeof VALID_CIRCLES)[number];

/**
 * Valid onboarding steps
 */
export const VALID_STEPS = [
  'welcome',
  'import_contacts',
  'circle_assignment',
  'preference_setting',
  'group_overlay',
  'completion',
] as const;
export type OnboardingStep = (typeof VALID_STEPS)[number];

/**
 * Valid onboarding triggers
 */
export const VALID_TRIGGERS = ['new_user', 'post_import', 'manage'] as const;
export type OnboardingTrigger = (typeof VALID_TRIGGERS)[number];

/**
 * Valid frequency preferences
 */
export const VALID_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;
export type FrequencyPreference = (typeof VALID_FREQUENCIES)[number];

/**
 * Valid achievement types
 */
export const VALID_ACHIEVEMENT_TYPES = [
  'first_contact_categorized',
  'inner_circle_complete',
  'all_contacts_categorized',
  'week_streak_3',
  'week_streak_10',
  'balanced_network',
  'network_health_excellent',
] as const;
export type AchievementType = (typeof VALID_ACHIEVEMENT_TYPES)[number];

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate circle name
 */
export function validateCircle(circle: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!circle || typeof circle !== 'string') {
    errors.circle = ['Circle is required'];
  } else if (!VALID_CIRCLES.includes(circle as DunbarCircle)) {
    errors.circle = [
      `Invalid circle. Must be one of: ${VALID_CIRCLES.join(', ')}`,
    ];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate onboarding step
 */
export function validateStep(step: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!step || typeof step !== 'string') {
    errors.step = ['Step is required'];
  } else if (!VALID_STEPS.includes(step as OnboardingStep)) {
    errors.step = [`Invalid step. Must be one of: ${VALID_STEPS.join(', ')}`];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate onboarding trigger
 */
export function validateTrigger(trigger: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!trigger || typeof trigger !== 'string') {
    errors.trigger = ['Trigger is required'];
  } else if (!VALID_TRIGGERS.includes(trigger as OnboardingTrigger)) {
    errors.trigger = [
      `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`,
    ];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate frequency preference
 */
export function validateFrequency(frequency: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!frequency || typeof frequency !== 'string') {
    errors.frequency = ['Frequency is required'];
  } else if (!VALID_FREQUENCIES.includes(frequency as FrequencyPreference)) {
    errors.frequency = [
      `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
    ];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate achievement type
 */
export function validateAchievementType(type: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!type || typeof type !== 'string') {
    errors.achievementType = ['Achievement type is required'];
  } else if (!VALID_ACHIEVEMENT_TYPES.includes(type as AchievementType)) {
    errors.achievementType = [
      `Invalid achievement type. Must be one of: ${VALID_ACHIEVEMENT_TYPES.join(', ')}`,
    ];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate contact ID
 */
export function validateContactId(contactId: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!contactId || typeof contactId !== 'string') {
    errors.contactId = ['Contact ID is required'];
  } else if (!isValidUUID(contactId)) {
    errors.contactId = ['Contact ID must be a valid UUID'];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate user ID
 */
export function validateUserId(userId: string): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!userId || typeof userId !== 'string') {
    errors.userId = ['User ID is required'];
  } else if (!isValidUUID(userId)) {
    errors.userId = ['User ID must be a valid UUID'];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate circle assignment input
 */
export interface CircleAssignmentInput {
  contactId: string;
  circle: string;
  confidence?: number;
  userOverride?: boolean;
}

export function validateCircleAssignment(
  input: CircleAssignmentInput
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(input.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate circle
  const circleResult = validateCircle(input.circle);
  if (!circleResult.valid) {
    Object.assign(errors, circleResult.errors);
  }

  // Validate confidence if provided
  if (input.confidence !== undefined) {
    if (
      typeof input.confidence !== 'number' ||
      input.confidence < 0 ||
      input.confidence > 1
    ) {
      errors.confidence = ['Confidence must be a number between 0 and 1'];
    }
  }

  // Validate userOverride if provided
  if (
    input.userOverride !== undefined &&
    typeof input.userOverride !== 'boolean'
  ) {
    errors.userOverride = ['User override must be a boolean'];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate batch circle assignment input
 */
export function validateBatchCircleAssignment(
  assignments: CircleAssignmentInput[]
): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!Array.isArray(assignments)) {
    errors.assignments = ['Assignments must be an array'];
    return { valid: false, errors };
  }

  if (assignments.length === 0) {
    errors.assignments = ['At least one assignment is required'];
    return { valid: false, errors };
  }

  if (assignments.length > 100) {
    errors.assignments = ['Maximum 100 assignments per batch'];
    return { valid: false, errors };
  }

  // Validate each assignment
  assignments.forEach((assignment, index) => {
    const result = validateCircleAssignment(assignment);
    if (!result.valid) {
      Object.keys(result.errors).forEach((key) => {
        const errorKey = `assignments[${index}].${key}`;
        errors[errorKey] = result.errors[key];
      });
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate preference setting input
 */
export interface PreferenceInput {
  contactId: string;
  frequency: string;
  customDays?: number;
}

export function validatePreference(input: PreferenceInput): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(input.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate frequency
  const frequencyResult = validateFrequency(input.frequency);
  if (!frequencyResult.valid) {
    Object.assign(errors, frequencyResult.errors);
  }

  // Validate custom days if provided
  if (input.customDays !== undefined) {
    if (
      typeof input.customDays !== 'number' ||
      input.customDays < 1 ||
      input.customDays > 365
    ) {
      errors.customDays = ['Custom days must be between 1 and 365'];
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate onboarding initialization input
 */
export interface OnboardingInitInput {
  trigger: string;
  source?: string;
  contactCount?: number;
}

export function validateOnboardingInit(
  input: OnboardingInitInput
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate trigger
  const triggerResult = validateTrigger(input.trigger);
  if (!triggerResult.valid) {
    Object.assign(errors, triggerResult.errors);
  }

  // Validate source if provided
  if (input.source !== undefined) {
    const validSources = ['google', 'manual', 'import'];
    if (!validSources.includes(input.source)) {
      errors.source = [
        `Invalid source. Must be one of: ${validSources.join(', ')}`,
      ];
    }
  }

  // Validate contact count if provided
  if (input.contactCount !== undefined) {
    if (
      typeof input.contactCount !== 'number' ||
      input.contactCount < 0 ||
      input.contactCount > 10000
    ) {
      errors.contactCount = ['Contact count must be between 0 and 10000'];
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate progress update input
 */
export interface ProgressUpdateInput {
  step: string;
  data?: any;
}

export function validateProgressUpdate(
  input: ProgressUpdateInput
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate step
  const stepResult = validateStep(input.step);
  if (!stepResult.valid) {
    Object.assign(errors, stepResult.errors);
  }

  // Validate data if provided
  if (input.data !== undefined && typeof input.data !== 'object') {
    errors.data = ['Progress data must be an object'];
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate weekly catchup review input
 */
export interface WeeklyCatchupReviewInput {
  contactId: string;
  action: string;
  newCircle?: string;
  preference?: string;
}

export function validateWeeklyCatchupReview(
  input: WeeklyCatchupReviewInput
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(input.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate action
  const validActions = ['keep', 'archive', 'update_circle', 'set_preference'];
  if (!input.action || !validActions.includes(input.action)) {
    errors.action = [
      `Invalid action. Must be one of: ${validActions.join(', ')}`,
    ];
  }

  // Validate new circle if provided
  if (input.newCircle !== undefined) {
    const circleResult = validateCircle(input.newCircle);
    if (!circleResult.valid) {
      Object.assign(errors, circleResult.errors);
    }
  }

  // Validate preference if provided
  if (input.preference !== undefined) {
    const frequencyResult = validateFrequency(input.preference);
    if (!frequencyResult.valid) {
      Object.assign(errors, frequencyResult.errors);
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Throw validation error if validation fails
 */
export function throwIfInvalid(result: ValidationResult): void {
  if (!result.valid) {
    throw new ValidationError('Validation failed', result.errors);
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, maxLength);
}

/**
 * Sanitize and validate contact IDs array
 */
export function validateContactIds(contactIds: string[]): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!Array.isArray(contactIds)) {
    errors.contactIds = ['Contact IDs must be an array'];
    return { valid: false, errors };
  }

  if (contactIds.length === 0) {
    errors.contactIds = ['At least one contact ID is required'];
    return { valid: false, errors };
  }

  if (contactIds.length > 1000) {
    errors.contactIds = ['Maximum 1000 contact IDs allowed'];
    return { valid: false, errors };
  }

  // Validate each contact ID
  contactIds.forEach((id, index) => {
    if (!isValidUUID(id)) {
      if (!errors.contactIds) {
        errors.contactIds = [];
      }
      errors.contactIds.push(`Invalid UUID at index ${index}: ${id}`);
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
