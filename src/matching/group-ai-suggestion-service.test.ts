/**
 * Group AI Suggestion Service Tests
 *
 * Property-based tests and unit tests for the GroupAISuggestionService.
 * Covers confidence bounds, signal weights, fuzzy matching, and Google group label matching.
 *
 * Requirements: 2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  PostgresGroupAISuggestionService,
  SIGNAL_WEIGHTS,
  type SignalBreakdown,
} from './group-ai-suggestion-service';

// Mock the database connection
vi.mock('../db/connection', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('GroupAISuggestionService', () => {
  let service: PostgresGroupAISuggestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockFeedbackRepo = {
      recordFeedback: vi.fn(),
      getRejectedGroups: vi.fn().mockResolvedValue([]),
      getFeedbackForContact: vi.fn().mockResolvedValue([]),
    };
    service = new PostgresGroupAISuggestionService(mockFeedbackRepo);
  });

  // ── Property-Based Tests ────────────────────────────────────────────────

  describe('Property-Based Tests', () => {
    /**
     * **Property 2: Group Suggestion Confidence Bounds**
     * For any random signal inputs, confidence score is always within [0, 100].
     * **Validates: Requirements 2.1**
     */
    it('3.8.1 [PBT] should always produce confidence scores within [0, 100] for any signal inputs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          (googleGroupMatch, interactionFrequency, calendarCoAttendance, sharedTags, contactMetadata) => {
            // Arrange
            const signals: SignalBreakdown = {
              googleGroupMatch,
              interactionFrequency,
              calendarCoAttendance,
              sharedTags,
              contactMetadata,
            };

            // Act
            const confidence = service.computeConfidence(signals);

            // Assert
            expect(confidence).toBeGreaterThanOrEqual(0);
            expect(confidence).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Property 3: Signal Weight Sum**
     * Signal weights always sum to 1.0 regardless of configuration.
     * **Validates: Requirements 2.3**
     */
    it('3.8.2 [PBT] should have signal weights that sum to exactly 1.0', () => {
      fc.assert(
        fc.property(
          fc.constant(SIGNAL_WEIGHTS),
          (weights) => {
            // Arrange
            const weightValues = Object.values(weights);

            // Act
            const sum = weightValues.reduce((acc, w) => acc + w, 0);

            // Assert
            expect(sum).toBeCloseTo(1.0, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Unit Tests: computeConfidence ───────────────────────────────────────

  describe('computeConfidence', () => {
    it('should return 0 when all signals are 0', () => {
      // Arrange
      const signals: SignalBreakdown = {
        googleGroupMatch: 0,
        interactionFrequency: 0,
        calendarCoAttendance: 0,
        sharedTags: 0,
        contactMetadata: 0,
      };

      // Act
      const confidence = service.computeConfidence(signals);

      // Assert
      expect(confidence).toBe(0);
    });

    it('should return 100 when all signals are 100', () => {
      // Arrange
      const signals: SignalBreakdown = {
        googleGroupMatch: 100,
        interactionFrequency: 100,
        calendarCoAttendance: 100,
        sharedTags: 100,
        contactMetadata: 100,
      };

      // Act
      const confidence = service.computeConfidence(signals);

      // Assert
      expect(confidence).toBe(100);
    });

    it('should weight googleGroupMatch at 35%', () => {
      // Arrange
      const signals: SignalBreakdown = {
        googleGroupMatch: 100,
        interactionFrequency: 0,
        calendarCoAttendance: 0,
        sharedTags: 0,
        contactMetadata: 0,
      };

      // Act
      const confidence = service.computeConfidence(signals);

      // Assert
      expect(confidence).toBe(35);
    });
  });

  // ── Unit Tests: fuzzyMatchScore ─────────────────────────────────────────

  describe('fuzzyMatchScore', () => {
    it('should return 100 for exact match', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('family', 'family');

      // Assert
      expect(score).toBe(100);
    });

    it('should return 80 when one string contains the other', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('work friends', 'work');

      // Assert
      expect(score).toBe(80);
    });

    it('should return 80 when the other string contains the first', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('work', 'work friends');

      // Assert
      expect(score).toBe(80);
    });

    it('should return 70 for Levenshtein distance ≤ 2', () => {
      // Arrange / Act — "famly" is distance 1 from "family"
      const score = service.fuzzyMatchScore('famly', 'family');

      // Assert
      expect(score).toBe(70);
    });

    it('should return 0 for no match', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('engineering', 'basketball');

      // Assert
      expect(score).toBe(0);
    });
  });

  // ── Unit Tests: Google group label matching ─────────────────────────────

  describe('Google group label matching', () => {
    it('should give full score for exact case-insensitive Google group label match', () => {
      // The fuzzyMatchScore is used internally for Google group matching.
      // Exact match (case-insensitive comparison happens before calling fuzzyMatchScore
      // with lowercased strings).

      // Arrange / Act
      const score = service.fuzzyMatchScore('family', 'family');

      // Assert — exact match returns 100
      expect(score).toBe(100);
    });

    it('should give contains score when Google label is a substring of group name', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('college', 'college friends');

      // Assert — contains returns 80
      expect(score).toBe(80);
    });

    it('should give contains score when group name is a substring of Google label', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('close friends from college', 'close friends');

      // Assert — contains returns 80
      expect(score).toBe(80);
    });

    it('should give near-match score for minor typos in Google label', () => {
      // Arrange / Act — "freinds" is distance 2 from "friends"
      const score = service.fuzzyMatchScore('freinds', 'friends');

      // Assert — Levenshtein ≤ 2 returns 70
      expect(score).toBe(70);
    });

    it('should return 0 for completely unrelated Google label and group name', () => {
      // Arrange / Act
      const score = service.fuzzyMatchScore('soccer team', 'book club');

      // Assert
      expect(score).toBe(0);
    });
  });
});
