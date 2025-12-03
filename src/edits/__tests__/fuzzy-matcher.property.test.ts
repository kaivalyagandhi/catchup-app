/**
 * Property-Based Tests for Fuzzy Matcher Service
 *
 * Tests correctness properties defined in the design document.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { FuzzyMatcherService } from '../fuzzy-matcher-service';
import { Contact, Group, FuzzyMatchResult } from '../../types';

// Mock repositories
vi.mock('../../contacts/repository');
vi.mock('../../contacts/group-repository');

describe('Fuzzy Matcher Property Tests', () => {
  let fuzzyMatcher: FuzzyMatcherService;
  let mockContactRepository: any;
  let mockGroupRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContactRepository = {
      findAll: vi.fn(),
    };
    mockGroupRepository = {
      findAll: vi.fn(),
    };
    fuzzyMatcher = new FuzzyMatcherService(mockContactRepository, mockGroupRepository);
  });

  /**
   * **Feature: incremental-chat-edits, Property 7: Fuzzy Search Ordering**
   * For any fuzzy search query, the returned results shall be ordered by
   * similarity score in descending order (highest similarity first).
   * **Validates: Requirements 7.3**
   */
  it('Property 7: Fuzzy Search Ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (userId, query, contactData) => {
          // Create mock contacts
          const contacts: Partial<Contact>[] = contactData.map((c) => ({
            id: c.id,
            userId,
            name: c.name,
            archived: false,
            groups: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          mockContactRepository.findAll.mockResolvedValue(contacts);

          const results = await fuzzyMatcher.searchContacts(userId, query, 20);

          // Results should be sorted by similarity score descending
          for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].similarityScore).toBeGreaterThanOrEqual(results[i].similarityScore);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Similarity score is always between 0 and 1
   */
  it('Similarity score is always between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 100 }),
        (str1, str2) => {
          const score = fuzzyMatcher.calculateSimilarity(str1, str2);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Identical strings have similarity score of 1
   */
  it('Identical strings have similarity score of 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (str) => {
          const score = fuzzyMatcher.calculateSimilarity(str, str);
          expect(score).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Similarity is symmetric
   */
  it('Similarity is symmetric', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (str1, str2) => {
          const score1 = fuzzyMatcher.calculateSimilarity(str1, str2);
          const score2 = fuzzyMatcher.calculateSimilarity(str2, str1);
          expect(score1).toBeCloseTo(score2, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Case insensitivity
   */
  it('Similarity is case insensitive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (str) => {
          const lower = str.toLowerCase();
          const upper = str.toUpperCase();
          const score = fuzzyMatcher.calculateSimilarity(lower, upper);
          expect(score).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Empty strings handling
   */
  it('Empty strings return 0 similarity', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (str) => {
          const score1 = fuzzyMatcher.calculateSimilarity('', str);
          const score2 = fuzzyMatcher.calculateSimilarity(str, '');
          expect(score1).toBe(0);
          expect(score2).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: findBestMatch returns null when no match above threshold
   */
  it('findBestMatch returns null for completely different names', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          // Create contacts with names that won't match "xyz123abc"
          const contacts: Partial<Contact>[] = [
            { id: '1', userId, name: 'John Smith', archived: false, groups: [], tags: [], createdAt: new Date(), updatedAt: new Date() },
            { id: '2', userId, name: 'Jane Doe', archived: false, groups: [], tags: [], createdAt: new Date(), updatedAt: new Date() },
          ];

          mockContactRepository.findAll.mockResolvedValue(contacts);

          // Query with a completely unrelated string
          const result = await fuzzyMatcher.findBestMatch(userId, 'xyz123abc');

          // Should return null since no match is above 0.7 threshold
          expect(result).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test: findBestMatch returns match when similarity is high
   */
  it('findBestMatch returns match for similar names', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 3, maxLength: 50 }),
        async (userId, baseName) => {
          // Create a contact with the exact name
          const contacts: Partial<Contact>[] = [
            { id: '1', userId, name: baseName, archived: false, groups: [], tags: [], createdAt: new Date(), updatedAt: new Date() },
          ];

          mockContactRepository.findAll.mockResolvedValue(contacts);

          // Query with the same name
          const result = await fuzzyMatcher.findBestMatch(userId, baseName);

          // Should return the match since similarity is 1.0
          expect(result).not.toBeNull();
          if (result) {
            expect(result.similarityScore).toBe(1);
            expect(result.name).toBe(baseName);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test: Search results are limited by the limit parameter
   */
  it('Search results respect limit parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 5, max: 30 }),
        async (userId, query, limit, contactCount) => {
          // Create many contacts
          const contacts: Partial<Contact>[] = Array.from({ length: contactCount }, (_, i) => ({
            id: `contact-${i}`,
            userId,
            name: `${query}${i}`, // Names that will match the query
            archived: false,
            groups: [],
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          mockContactRepository.findAll.mockResolvedValue(contacts);

          const results = await fuzzyMatcher.searchContacts(userId, query, limit);

          // Results should not exceed the limit
          expect(results.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 50 }
    );
  });
});
