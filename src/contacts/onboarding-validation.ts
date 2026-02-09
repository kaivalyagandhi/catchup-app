/**
 * Onboarding Validation
 *
 * Validates circle assignments, onboarding state updates, and other
 * onboarding-related data to ensure data integrity.
 *
 * Requirements: All requirements (data integrity)
 */

import { OnboardingState } from './onboarding-state-manager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimpleValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Valid values
const VALID_CIRCLES = ['inner', 'close', 'active', 'casual'];
const VALID_STEPS = ['welcome', 'integrations', 'circle_assignment', 'group_mapping', 'complete'];
const VALID_TRIGGERS = ['new_user', 'google_import', 'manual'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
const VALID_SOURCES = ['google', 'manual', 'csv'];
const VALID_ACTIONS = ['keep', 'archive', 'update_circle', 'update_frequency'];

// Helper functions
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function sanitizeString(value: string, maxLength: number = 1000): string {
  // Trim whitespace
  let sanitized = value.trim();

  // Remove HTML tags but keep the tag names (for security logging)
  sanitized = sanitized.replace(/<([^>]*)>/g, '$1');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// Simple validation functions
export function validateCircle(circle: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!circle || circle.trim() === '') {
    errors.circle = 'Circle is required';
  } else if (!VALID_CIRCLES.includes(circle)) {
    errors.circle = `Invalid circle. Must be one of: ${VALID_CIRCLES.join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep(step: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!step || !VALID_STEPS.includes(step)) {
    errors.step = `Invalid step. Must be one of: ${VALID_STEPS.join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateTrigger(trigger: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!trigger || !VALID_TRIGGERS.includes(trigger)) {
    errors.trigger = `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateFrequency(frequency: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
    errors.frequency = `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateContactId(contactId: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!contactId || !isValidUUID(contactId)) {
    errors.contactId = 'Invalid contact ID. Must be a valid UUID';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateUserId(userId: string): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!userId || !isValidUUID(userId)) {
    errors.userId = 'Invalid user ID. Must be a valid UUID';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCircleAssignment(assignment: {
  contactId: string;
  circle: string;
  confidence?: number;
  userOverride?: boolean;
}): SimpleValidationResult {
  const errors: Record<string, string> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(assignment.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate circle
  const circleResult = validateCircle(assignment.circle);
  if (!circleResult.valid) {
    Object.assign(errors, circleResult.errors);
  }

  // Validate confidence if provided
  if (assignment.confidence !== undefined) {
    if (
      typeof assignment.confidence !== 'number' ||
      assignment.confidence < 0 ||
      assignment.confidence > 1
    ) {
      errors.confidence = 'Confidence must be a number between 0 and 1';
    }
  }

  // Validate userOverride if provided
  if (assignment.userOverride !== undefined && typeof assignment.userOverride !== 'boolean') {
    errors.userOverride = 'userOverride must be a boolean';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateBatchCircleAssignment(assignments: any): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!Array.isArray(assignments)) {
    errors.assignments = 'Assignments must be an array';
    return { valid: false, errors };
  }

  if (assignments.length === 0) {
    errors.assignments = 'Assignments array cannot be empty';
    return { valid: false, errors };
  }

  if (assignments.length > 100) {
    errors.assignments = 'Cannot assign more than 100 contacts at once';
    return { valid: false, errors };
  }

  // Validate each assignment
  assignments.forEach((assignment, index) => {
    const result = validateCircleAssignment(assignment);
    if (!result.valid) {
      Object.keys(result.errors).forEach((key) => {
        errors[`assignments[${index}].${key}`] = result.errors[key];
      });
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePreference(preference: {
  contactId: string;
  frequency: string;
  customDays?: number;
}): SimpleValidationResult {
  const errors: Record<string, string> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(preference.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate frequency
  const frequencyResult = validateFrequency(preference.frequency);
  if (!frequencyResult.valid) {
    Object.assign(errors, frequencyResult.errors);
  }

  // Validate custom days if provided
  if (preference.customDays !== undefined) {
    if (
      typeof preference.customDays !== 'number' ||
      preference.customDays < 1 ||
      preference.customDays > 365
    ) {
      errors.customDays = 'Custom days must be a number between 1 and 365';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateOnboardingInit(init: {
  trigger: string;
  source?: string;
  contactCount?: number;
}): SimpleValidationResult {
  const errors: Record<string, string> = {};

  // Validate trigger
  const triggerResult = validateTrigger(init.trigger);
  if (!triggerResult.valid) {
    Object.assign(errors, triggerResult.errors);
  }

  // Validate source if provided
  if (init.source && !VALID_SOURCES.includes(init.source)) {
    errors.source = `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`;
  }

  // Validate contact count if provided
  if (init.contactCount !== undefined) {
    if (
      typeof init.contactCount !== 'number' ||
      init.contactCount < 0 ||
      init.contactCount > 10000
    ) {
      errors.contactCount = 'Contact count must be a number between 0 and 10000';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProgressUpdate(update: {
  step: string;
  data: any;
}): SimpleValidationResult {
  const errors: Record<string, string> = {};

  // Validate step
  const stepResult = validateStep(update.step);
  if (!stepResult.valid) {
    Object.assign(errors, stepResult.errors);
  }

  // Validate data
  if (typeof update.data !== 'object' || update.data === null || Array.isArray(update.data)) {
    errors.data = 'Data must be an object';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateWeeklyCatchupReview(review: {
  contactId: string;
  action: string;
  newCircle?: string;
}): SimpleValidationResult {
  const errors: Record<string, string> = {};

  // Validate contact ID
  const contactIdResult = validateContactId(review.contactId);
  if (!contactIdResult.valid) {
    Object.assign(errors, contactIdResult.errors);
  }

  // Validate action
  if (!review.action || !VALID_ACTIONS.includes(review.action)) {
    errors.action = `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`;
  }

  // Validate new circle if provided
  if (review.newCircle) {
    const circleResult = validateCircle(review.newCircle);
    if (!circleResult.valid) {
      errors.circle = circleResult.errors.circle;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateContactIds(contactIds: any): SimpleValidationResult {
  const errors: Record<string, string> = {};

  if (!Array.isArray(contactIds)) {
    errors.contactIds = 'Contact IDs must be an array';
    return { valid: false, errors };
  }

  if (contactIds.length === 0) {
    errors.contactIds = 'Contact IDs array cannot be empty';
    return { valid: false, errors };
  }

  if (contactIds.length > 1000) {
    errors.contactIds = 'Cannot process more than 1000 contact IDs at once';
    return { valid: false, errors };
  }

  // Validate each ID
  const invalidIds = contactIds.filter((id) => !isValidUUID(id));
  if (invalidIds.length > 0) {
    errors.contactIds = `Invalid UUIDs found: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export class OnboardingValidator {
  /**
   * Validate circle assignment
   * Requirements: All requirements (data integrity)
   */
  static validateCircleAssignment(contactId: number, circle: string | null): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate contact ID
    if (!contactId || typeof contactId !== 'number' || contactId <= 0) {
      errors.push('Invalid contact ID');
    }

    // Validate circle value
    const validCircles = ['inner', 'close', 'active', 'casual', null];
    if (circle !== null && !validCircles.includes(circle)) {
      errors.push(
        `Invalid circle value: ${circle}. Must be one of: inner, close, active, casual, or null`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate onboarding state structure
   * Requirements: All requirements (data integrity)
   */
  static validateOnboardingState(state: Partial<OnboardingState>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate userId
    if (!state.userId || typeof state.userId !== 'string' || state.userId.trim() === '') {
      errors.push('userId is required and must be a non-empty string');
    }

    // Validate currentStep
    if (state.currentStep !== undefined) {
      if (![1, 2, 3].includes(state.currentStep)) {
        errors.push('currentStep must be 1, 2, or 3');
      }
    }

    // Validate isComplete
    if (state.isComplete !== undefined && typeof state.isComplete !== 'boolean') {
      errors.push('isComplete must be a boolean');
    }

    // Validate steps structure
    if (state.steps) {
      // Validate integrations step
      if (state.steps.integrations) {
        if (typeof state.steps.integrations.complete !== 'boolean') {
          errors.push('steps.integrations.complete must be a boolean');
        }
        if (typeof state.steps.integrations.googleCalendar !== 'boolean') {
          errors.push('steps.integrations.googleCalendar must be a boolean');
        }
        if (typeof state.steps.integrations.googleContacts !== 'boolean') {
          errors.push('steps.integrations.googleContacts must be a boolean');
        }
      }

      // Validate circles step
      if (state.steps.circles) {
        if (typeof state.steps.circles.complete !== 'boolean') {
          errors.push('steps.circles.complete must be a boolean');
        }
        if (
          typeof state.steps.circles.contactsCategorized !== 'number' ||
          state.steps.circles.contactsCategorized < 0
        ) {
          errors.push('steps.circles.contactsCategorized must be a non-negative number');
        }
        if (
          typeof state.steps.circles.totalContacts !== 'number' ||
          state.steps.circles.totalContacts < 0
        ) {
          errors.push('steps.circles.totalContacts must be a non-negative number');
        }

        // Validate logical consistency
        if (state.steps.circles.contactsCategorized > state.steps.circles.totalContacts) {
          errors.push('contactsCategorized cannot exceed totalContacts');
        }
      }

      // Validate groups step
      if (state.steps.groups) {
        if (typeof state.steps.groups.complete !== 'boolean') {
          errors.push('steps.groups.complete must be a boolean');
        }
        if (
          typeof state.steps.groups.mappingsReviewed !== 'number' ||
          state.steps.groups.mappingsReviewed < 0
        ) {
          errors.push('steps.groups.mappingsReviewed must be a non-negative number');
        }
        if (
          typeof state.steps.groups.totalMappings !== 'number' ||
          state.steps.groups.totalMappings < 0
        ) {
          errors.push('steps.groups.totalMappings must be a non-negative number');
        }

        // Validate logical consistency
        if (state.steps.groups.mappingsReviewed > state.steps.groups.totalMappings) {
          errors.push('mappingsReviewed cannot exceed totalMappings');
        }
      }
    }

    // Validate timestamps
    if (state.createdAt && !(state.createdAt instanceof Date)) {
      errors.push('createdAt must be a Date object');
    }
    if (state.updatedAt && !(state.updatedAt instanceof Date)) {
      errors.push('updatedAt must be a Date object');
    }
    if (state.dismissedAt && !(state.dismissedAt instanceof Date)) {
      errors.push('dismissedAt must be a Date object');
    }

    // Validate logical consistency of completion
    if (state.isComplete && state.steps) {
      if (
        !state.steps.integrations?.complete ||
        !state.steps.circles?.complete ||
        !state.steps.groups?.complete
      ) {
        warnings.push('isComplete is true but not all steps are marked complete');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate circle capacity
   * Requirements: All requirements (data integrity)
   */
  static validateCircleCapacity(
    circle: 'inner' | 'close' | 'active' | 'casual',
    currentCount: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const capacities = {
      inner: 10,
      close: 25,
      active: 50,
      casual: 100,
    };

    const capacity = capacities[circle];

    if (currentCount < 0) {
      errors.push('Circle count cannot be negative');
    }

    if (currentCount > capacity) {
      warnings.push(
        `${circle} circle is over capacity (${currentCount}/${capacity}). Consider rebalancing for better relationship management.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate group mapping
   * Requirements: All requirements (data integrity)
   */
  static validateGroupMapping(googleGroupId: string, catchupGroupId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!googleGroupId || typeof googleGroupId !== 'string' || googleGroupId.trim() === '') {
      errors.push('googleGroupId is required and must be a non-empty string');
    }

    if (!catchupGroupId || typeof catchupGroupId !== 'string' || catchupGroupId.trim() === '') {
      errors.push('catchupGroupId is required and must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate step completion logic
   * Requirements: 2.5, 3.5, 5.5
   */
  static validateStepCompletion(state: OnboardingState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Both integrations must be connected
    if (state.steps.integrations.complete) {
      if (!state.steps.integrations.googleCalendar || !state.steps.integrations.googleContacts) {
        errors.push('Step 1 marked complete but not all integrations are connected');
      }
    }

    // Step 2: At least 50% of contacts must be categorized
    if (state.steps.circles.complete) {
      if (state.steps.circles.totalContacts > 0) {
        const percentCategorized =
          state.steps.circles.contactsCategorized / state.steps.circles.totalContacts;
        if (percentCategorized < 0.5) {
          warnings.push('Step 2 marked complete but less than 50% of contacts are categorized');
        }
      }
    }

    // Step 3: All mappings must be reviewed
    if (state.steps.groups.complete) {
      if (state.steps.groups.totalMappings > 0) {
        if (state.steps.groups.mappingsReviewed < state.steps.groups.totalMappings) {
          warnings.push('Step 3 marked complete but not all mappings are reviewed');
        }
      }
    }

    // Overall completion: All steps must be complete
    if (state.isComplete) {
      if (
        !state.steps.integrations.complete ||
        !state.steps.circles.complete ||
        !state.steps.groups.complete
      ) {
        errors.push('Onboarding marked complete but not all steps are complete');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Show validation errors to user
   */
  static showValidationErrors(result: ValidationResult): void {
    if (typeof window === 'undefined') return;

    const showToast = (window as Window & { showToast?: (msg: string, type: string) => void })
      .showToast;

    if (typeof showToast === 'function') {
      // Show errors
      result.errors.forEach((error) => {
        showToast(error, 'error');
      });

      // Show warnings
      result.warnings.forEach((warning) => {
        showToast(warning, 'warning');
      });
    } else {
      // Fallback to console
      result.errors.forEach((error) => console.error('Validation error:', error));
      result.warnings.forEach((warning) => console.warn('Validation warning:', warning));
    }
  }
}

// Export convenience functions for OnboardingValidator class methods
export function validateOnboardingStateComplex(state: Partial<OnboardingState>): ValidationResult {
  return OnboardingValidator.validateOnboardingState(state);
}

export function validateCircleCapacity(
  circle: 'inner' | 'close' | 'active' | 'casual',
  currentCount: number
): ValidationResult {
  return OnboardingValidator.validateCircleCapacity(circle, currentCount);
}

export function validateGroupMapping(
  googleGroupId: string,
  catchupGroupId: string
): ValidationResult {
  return OnboardingValidator.validateGroupMapping(googleGroupId, catchupGroupId);
}

export function validateStepCompletion(state: OnboardingState): ValidationResult {
  return OnboardingValidator.validateStepCompletion(state);
}

export function showValidationErrors(result: ValidationResult): void {
  return OnboardingValidator.showValidationErrors(result);
}
