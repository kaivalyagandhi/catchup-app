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

export class OnboardingValidator {
  /**
   * Validate circle assignment
   * Requirements: All requirements (data integrity)
   */
  static validateCircleAssignment(
    contactId: number,
    circle: string | null
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate contact ID
    if (!contactId || typeof contactId !== 'number' || contactId <= 0) {
      errors.push('Invalid contact ID');
    }

    // Validate circle value
    const validCircles = ['inner', 'close', 'active', 'casual', null];
    if (circle !== null && !validCircles.includes(circle)) {
      errors.push(`Invalid circle value: ${circle}. Must be one of: inner, close, active, casual, or null`);
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
        if (
          state.steps.circles.contactsCategorized > state.steps.circles.totalContacts
        ) {
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
        warnings.push(
          'isComplete is true but not all steps are marked complete'
        );
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
  static validateGroupMapping(
    googleGroupId: string,
    catchupGroupId: string
  ): ValidationResult {
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
          warnings.push(
            'Step 2 marked complete but less than 50% of contacts are categorized'
          );
        }
      }
    }

    // Step 3: All mappings must be reviewed
    if (state.steps.groups.complete) {
      if (state.steps.groups.totalMappings > 0) {
        if (state.steps.groups.mappingsReviewed < state.steps.groups.totalMappings) {
          warnings.push(
            'Step 3 marked complete but not all mappings are reviewed'
          );
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

    const showToast = (window as Window & { showToast?: (msg: string, type: string) => void }).showToast;

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

// Export convenience functions
export function validateCircleAssignment(
  contactId: number,
  circle: string | null
): ValidationResult {
  return OnboardingValidator.validateCircleAssignment(contactId, circle);
}

export function validateOnboardingState(
  state: Partial<OnboardingState>
): ValidationResult {
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
