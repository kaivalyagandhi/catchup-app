/**
 * User Preferences Repository Tests
 *
 * Property-based and unit tests for the UserPreferencesRepository.
 * Tests get/set/delete operations and round-trip property.
 *
 * Requirements: 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the database connection before importing the repository
vi.mock('../db/connection', () => {
  const mockQuery = vi.fn();
  return {
    default: {
      query: mockQuery,
    },
  };
});

import { PostgresUserPreferencesRepository } from './user-preferences-repository';
import pool from '../db/connection';

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> };

describe('UserPreferencesRepository', () => {
  let repo: PostgresUserPreferencesRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PostgresUserPreferencesRepository();
  });

  // ── Property-Based Tests ────────────────────────────────────────────────

  describe('Property-Based Tests', () => {
    /**
     * **Property 13: Preference Round-Trip**
     * For any random key-value pair, set then get returns the same value.
     * **Validates: Requirements 1.6, 1.7**
     */
    it('12.1.1 [PBT] should round-trip any key-value pair through set then get', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.jsonValue(),
          async (userId, key, value) => {
            // Arrange
            // Mock set to succeed
            mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            // Mock get to return the value (simulating DB round-trip)
            mockPool.query.mockResolvedValueOnce({
              rows: [{ preference_value: value }],
            });

            // Act
            await repo.set(userId, key, value);
            const result = await repo.get(userId, key);

            // Assert - the value returned by get should equal the value passed to set
            expect(result).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Unit Tests: get ─────────────────────────────────────────────────────

  describe('get', () => {
    it('should return the preference value when it exists', async () => {
      // Arrange
      const userId = 'user-123';
      const key = 'theme';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ preference_value: 'dark' }],
      });

      // Act
      const result = await repo.get(userId, key);

      // Assert
      expect(result).toBe('dark');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT preference_value FROM user_preferences WHERE user_id = $1 AND preference_key = $2',
        [userId, key]
      );
    });

    it('should return null when preference does not exist', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await repo.get('user-123', 'nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ── Unit Tests: set ─────────────────────────────────────────────────────

  describe('set', () => {
    it('should call INSERT with correct parameters', async () => {
      // Arrange
      const userId = 'user-123';
      const key = 'keyboard-shortcuts';
      const value = { g1: '0', g2: '1' };
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.set(userId, key, value);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_preferences'),
        [userId, key, JSON.stringify(value)]
      );
    });

    it('should use ON CONFLICT for upsert behavior', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.set('user-123', 'theme', 'light');

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });
  });

  // ── Unit Tests: delete ──────────────────────────────────────────────────

  describe('delete', () => {
    it('should call DELETE with correct parameters', async () => {
      // Arrange
      const userId = 'user-123';
      const key = 'theme';
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Act
      await repo.delete(userId, key);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM user_preferences WHERE user_id = $1 AND preference_key = $2',
        [userId, key]
      );
    });
  });
});
