/**
 * Tests for Onboarding Validation
 *
 * Validates input validation for all onboarding-related operations.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCircle,
  validateStep,
  validateTrigger,
  validateFrequency,
  validateContactId,
  validateUserId,
  validateCircleAssignment,
  validateBatchCircleAssignment,
  validatePreference,
  validateOnboardingInit,
  validateProgressUpdate,
  validateWeeklyCatchupReview,
  validateContactIds,
  isValidUUID,
  sanitizeString,
} from './onboarding-validation';

describe('Onboarding Validation', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('validateCircle', () => {
    it('should accept valid circles', () => {
      const result = validateCircle('inner');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject invalid circles', () => {
      const result = validateCircle('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors.circle).toBeDefined();
    });

    it('should reject empty circle', () => {
      const result = validateCircle('');
      expect(result.valid).toBe(false);
      expect(result.errors.circle).toBeDefined();
    });
  });

  describe('validateStep', () => {
    it('should accept valid steps', () => {
      const result = validateStep('welcome');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid steps', () => {
      const result = validateStep('invalid_step');
      expect(result.valid).toBe(false);
      expect(result.errors.step).toBeDefined();
    });
  });

  describe('validateTrigger', () => {
    it('should accept valid triggers', () => {
      const result = validateTrigger('new_user');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid triggers', () => {
      const result = validateTrigger('invalid_trigger');
      expect(result.valid).toBe(false);
      expect(result.errors.trigger).toBeDefined();
    });
  });

  describe('validateFrequency', () => {
    it('should accept valid frequencies', () => {
      const result = validateFrequency('weekly');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid frequencies', () => {
      const result = validateFrequency('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors.frequency).toBeDefined();
    });
  });

  describe('validateContactId', () => {
    it('should accept valid contact IDs', () => {
      const result = validateContactId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid contact IDs', () => {
      const result = validateContactId('not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.errors.contactId).toBeDefined();
    });
  });

  describe('validateCircleAssignment', () => {
    it('should accept valid assignment', () => {
      const result = validateCircleAssignment({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        circle: 'inner',
        confidence: 0.95,
        userOverride: false,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid contact ID', () => {
      const result = validateCircleAssignment({
        contactId: 'invalid',
        circle: 'inner',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.contactId).toBeDefined();
    });

    it('should reject invalid circle', () => {
      const result = validateCircleAssignment({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        circle: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.circle).toBeDefined();
    });

    it('should reject invalid confidence', () => {
      const result = validateCircleAssignment({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        circle: 'inner',
        confidence: 1.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.confidence).toBeDefined();
    });

    it('should reject invalid userOverride', () => {
      const result = validateCircleAssignment({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        circle: 'inner',
        userOverride: 'yes' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.userOverride).toBeDefined();
    });
  });

  describe('validateBatchCircleAssignment', () => {
    it('should accept valid batch', () => {
      const result = validateBatchCircleAssignment([
        {
          contactId: '550e8400-e29b-41d4-a716-446655440000',
          circle: 'inner',
        },
        {
          contactId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          circle: 'close',
        },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject non-array', () => {
      const result = validateBatchCircleAssignment('not-an-array' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.assignments).toBeDefined();
    });

    it('should reject empty array', () => {
      const result = validateBatchCircleAssignment([]);
      expect(result.valid).toBe(false);
      expect(result.errors.assignments).toBeDefined();
    });

    it('should reject too many assignments', () => {
      const assignments = Array.from({ length: 101 }, (_, i) => ({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        circle: 'inner',
      }));
      const result = validateBatchCircleAssignment(assignments);
      expect(result.valid).toBe(false);
      expect(result.errors.assignments).toBeDefined();
    });

    it('should validate each assignment', () => {
      const result = validateBatchCircleAssignment([
        {
          contactId: 'invalid',
          circle: 'inner',
        },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors['assignments[0].contactId']).toBeDefined();
    });
  });

  describe('validatePreference', () => {
    it('should accept valid preference', () => {
      const result = validatePreference({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        frequency: 'weekly',
        customDays: 7,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid custom days', () => {
      const result = validatePreference({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        frequency: 'weekly',
        customDays: 500,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.customDays).toBeDefined();
    });
  });

  describe('validateOnboardingInit', () => {
    it('should accept valid init', () => {
      const result = validateOnboardingInit({
        trigger: 'new_user',
        source: 'google',
        contactCount: 50,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid source', () => {
      const result = validateOnboardingInit({
        trigger: 'new_user',
        source: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.source).toBeDefined();
    });

    it('should reject invalid contact count', () => {
      const result = validateOnboardingInit({
        trigger: 'new_user',
        contactCount: 20000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.contactCount).toBeDefined();
    });
  });

  describe('validateProgressUpdate', () => {
    it('should accept valid update', () => {
      const result = validateProgressUpdate({
        step: 'circle_assignment',
        data: { categorized: 10 },
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid data type', () => {
      const result = validateProgressUpdate({
        step: 'circle_assignment',
        data: 'not-an-object' as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.data).toBeDefined();
    });
  });

  describe('validateWeeklyCatchupReview', () => {
    it('should accept valid review', () => {
      const result = validateWeeklyCatchupReview({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'keep',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = validateWeeklyCatchupReview({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.action).toBeDefined();
    });

    it('should validate new circle when provided', () => {
      const result = validateWeeklyCatchupReview({
        contactId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'update_circle',
        newCircle: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.circle).toBeDefined();
    });
  });

  describe('validateContactIds', () => {
    it('should accept valid contact IDs', () => {
      const result = validateContactIds([
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject non-array', () => {
      const result = validateContactIds('not-an-array' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.contactIds).toBeDefined();
    });

    it('should reject empty array', () => {
      const result = validateContactIds([]);
      expect(result.valid).toBe(false);
      expect(result.errors.contactIds).toBeDefined();
    });

    it('should reject too many IDs', () => {
      const ids = Array.from({ length: 1001 }, () => '550e8400-e29b-41d4-a716-446655440000');
      const result = validateContactIds(ids);
      expect(result.valid).toBe(false);
      expect(result.errors.contactIds).toBeDefined();
    });

    it('should reject invalid UUIDs', () => {
      const result = validateContactIds([
        '550e8400-e29b-41d4-a716-446655440000',
        'invalid-uuid',
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.contactIds).toBeDefined();
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('hello<script>alert("xss")</script>world')).toBe(
        'helloscriptalert("xss")/scriptworld'
      );
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitizeString(longString, 100);
      expect(result.length).toBe(100);
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });
  });
});
