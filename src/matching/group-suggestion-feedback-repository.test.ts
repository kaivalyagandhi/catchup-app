/**
 * Group Suggestion Feedback Repository Tests
 *
 * Unit tests for the GroupSuggestionFeedbackRepository.
 * Tests recordFeedback, getRejectedGroups, getFeedbackForContact, and uniqueness constraint.
 *
 * Requirements: 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database connection before importing the repository
vi.mock('../db/connection', () => {
  const mockQuery = vi.fn();
  return {
    default: {
      query: mockQuery,
    },
  };
});

import { PostgresGroupSuggestionFeedbackRepository } from './group-suggestion-feedback-repository';
import pool from '../db/connection';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

describe('GroupSuggestionFeedbackRepository', () => {
  let repo: PostgresGroupSuggestionFeedbackRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PostgresGroupSuggestionFeedbackRepository();
  });

  // ── recordFeedback ──────────────────────────────────────────────────────

  describe('recordFeedback', () => {
    it('should call INSERT with correct SQL and parameters for accepted feedback', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.recordFeedback('user-1', 'contact-1', 'group-1', 'accepted');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO group_suggestion_feedback'),
        ['user-1', 'contact-1', 'group-1', 'accepted']
      );
    });

    it('should call INSERT with correct SQL and parameters for rejected feedback', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.recordFeedback('user-1', 'contact-1', 'group-1', 'rejected');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO group_suggestion_feedback'),
        ['user-1', 'contact-1', 'group-1', 'rejected']
      );
    });

    it('should use ON CONFLICT to handle uniqueness constraint (upsert)', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.recordFeedback('user-1', 'contact-1', 'group-1', 'accepted');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id, contact_id, group_id)'),
        expect.any(Array)
      );
    });
  });

  // ── getRejectedGroups ───────────────────────────────────────────────────

  describe('getRejectedGroups', () => {
    it('should return only rejected group IDs', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { group_id: 'group-1' },
          { group_id: 'group-3' },
        ],
      });

      // Act
      const result = await repo.getRejectedGroups('user-1', 'contact-1');

      // Assert
      expect(result).toEqual(['group-1', 'group-3']);
    });

    it('should query with correct SQL filtering for rejected feedback', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await repo.getRejectedGroups('user-1', 'contact-1');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("feedback = 'rejected'"),
        ['user-1', 'contact-1']
      );
    });

    it('should return empty array when no rejected groups exist', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repo.getRejectedGroups('user-1', 'contact-1');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ── getFeedbackForContact ───────────────────────────────────────────────

  describe('getFeedbackForContact', () => {
    it('should return all feedback entries for a contact', async () => {
      // Arrange
      const now = new Date();
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'fb-1',
            user_id: 'user-1',
            contact_id: 'contact-1',
            group_id: 'group-1',
            suggestion_type: 'ai',
            feedback: 'accepted',
            created_at: now.toISOString(),
          },
          {
            id: 'fb-2',
            user_id: 'user-1',
            contact_id: 'contact-1',
            group_id: 'group-2',
            suggestion_type: 'ai',
            feedback: 'rejected',
            created_at: now.toISOString(),
          },
        ],
      });

      // Act
      const result = await repo.getFeedbackForContact('user-1', 'contact-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].feedback).toBe('accepted');
      expect(result[0].groupId).toBe('group-1');
      expect(result[1].feedback).toBe('rejected');
      expect(result[1].groupId).toBe('group-2');
    });

    it('should query with correct SQL and parameters', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await repo.getFeedbackForContact('user-1', 'contact-1');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND contact_id = $2'),
        ['user-1', 'contact-1']
      );
    });

    it('should order results by created_at DESC', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      await repo.getFeedbackForContact('user-1', 'contact-1');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no feedback exists', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repo.getFeedbackForContact('user-1', 'contact-1');

      // Assert
      expect(result).toEqual([]);
    });

    it('should correctly map row fields to camelCase properties', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'fb-1',
            user_id: 'user-1',
            contact_id: 'contact-1',
            group_id: 'group-1',
            suggestion_type: 'ai',
            feedback: 'accepted',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      // Act
      const result = await repo.getFeedbackForContact('user-1', 'contact-1');

      // Assert
      expect(result[0]).toEqual({
        id: 'fb-1',
        userId: 'user-1',
        contactId: 'contact-1',
        groupId: 'group-1',
        suggestionType: 'ai',
        feedback: 'accepted',
        createdAt: expect.any(Date),
      });
    });
  });
});
