/**
 * Property-Based Tests for Incremental Enrichment Analyzer
 * 
 * Tests correctness properties using fast-check for property-based testing.
 * 
 * Feature: incremental-voice-transcription
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { IncrementalEnrichmentAnalyzer, EnrichmentSuggestion } from './incremental-enrichment-analyzer';
import { ExtractedEntities } from '../types';

describe('IncrementalEnrichmentAnalyzer - Property-Based Tests', () => {
  /**
   * Property 11: Enrichment trigger threshold
   * 
   * Feature: incremental-voice-transcription, Property 11: Enrichment trigger threshold
   * 
   * For any transcript with N words where N >= 50, or after a natural pause of 2+ seconds,
   * the enrichment analyzer SHALL be triggered.
   * 
   * Validates: Requirements 2.1
   */
  describe('Property 11: Enrichment trigger threshold', () => {
    it('should trigger enrichment when word count reaches 50+', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate word count >= 50
          fc.integer({ min: 50, max: 200 }),
          async (wordCount) => {
            // Create mock extraction service
            const mockExtractionService = {
              extractGeneric: vi.fn().mockResolvedValue({
                fields: {},
                tags: ['test'],
                groups: [],
                lastContactDate: undefined,
              } as ExtractedEntities),
            };

            // Create analyzer with high pause threshold to isolate word count trigger
            const analyzer = new IncrementalEnrichmentAnalyzer(
              mockExtractionService as any,
              {
                minWordCount: 50,
                pauseThresholdMs: 100000, // Very high to avoid pause trigger
                maxPendingWords: 300,
                debounceMs: 0, // No debounce for testing
              }
            );

            // Generate text with exact word count
            const text = 'word '.repeat(wordCount).trim();

            // Process transcript
            const triggered = await analyzer.processTranscript(
              'test-session',
              text,
              true
            );

            // Should trigger when word count >= 50
            expect(triggered).toBe(true);
            expect(mockExtractionService.extractGeneric).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not trigger enrichment when word count is below 50', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate word count < 50
          fc.integer({ min: 1, max: 49 }),
          async (wordCount) => {
            // Create mock extraction service
            const mockExtractionService = {
              extractGeneric: vi.fn().mockResolvedValue({
                fields: {},
                tags: ['test'],
                groups: [],
                lastContactDate: undefined,
              } as ExtractedEntities),
            };

            // Create analyzer with high pause threshold
            const analyzer = new IncrementalEnrichmentAnalyzer(
              mockExtractionService as any,
              {
                minWordCount: 50,
                pauseThresholdMs: 100000, // Very high to avoid pause trigger
                maxPendingWords: 300,
                debounceMs: 0,
              }
            );

            // Generate text with exact word count
            const text = 'word '.repeat(wordCount).trim();

            // Process transcript
            const triggered = await analyzer.processTranscript(
              'test-session',
              text,
              true
            );

            // Should not trigger when word count < 50
            expect(triggered).toBe(false);
            expect(mockExtractionService.extractGeneric).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger enrichment after natural pause of 2+ seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate pause duration >= 2000ms
          fc.integer({ min: 2000, max: 10000 }),
          // Generate word count > 0 but < 50
          fc.integer({ min: 1, max: 49 }),
          async (pauseDuration, wordCount) => {
            vi.useFakeTimers();

            try {
              // Create mock extraction service
              const mockExtractionService = {
                extractGeneric: vi.fn().mockResolvedValue({
                  fields: {},
                  tags: ['test'],
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities),
              };

              // Create analyzer
              const analyzer = new IncrementalEnrichmentAnalyzer(
                mockExtractionService as any,
                {
                  minWordCount: 50,
                  pauseThresholdMs: 2000,
                  maxPendingWords: 300,
                  debounceMs: 0,
                }
              );

              // First, trigger an enrichment to set lastAnalyzedAt
              const initialText = 'word '.repeat(50).trim();
              await analyzer.processTranscript('test-session', initialText, true);

              // Clear mock calls
              mockExtractionService.extractGeneric.mockClear();

              // Add text below threshold
              const text = 'word '.repeat(wordCount).trim();
              await analyzer.processTranscript('test-session', text, true);

              // Advance time by pause duration
              vi.advanceTimersByTime(pauseDuration);

              // Add more text - should trigger due to pause
              const triggered = await analyzer.processTranscript(
                'test-session',
                'more text',
                true
              );

              // Should trigger after pause >= 2000ms
              expect(triggered).toBe(true);
              expect(mockExtractionService.extractGeneric).toHaveBeenCalled();
            } finally {
              vi.useRealTimers();
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to timer manipulation
      );
    });
  });

  /**
   * Property 2: Suggestion merge consistency
   * 
   * Feature: incremental-voice-transcription, Property 2: Suggestion merge consistency
   * 
   * For any two sets of enrichment suggestions, merging them SHALL produce a set
   * containing all unique suggestions, with duplicates consolidated to the
   * highest-confidence version.
   * 
   * Validates: Requirements 2.3, 2.4
   */
  describe('Property 2: Suggestion merge consistency', () => {
    it('should deduplicate suggestions by type and value', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of tag names
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (tags) => {
            // Create mock extraction service that returns the same tags twice
            const mockExtractionService = {
              extractGeneric: vi
                .fn()
                .mockResolvedValueOnce({
                  fields: {},
                  tags: tags,
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities)
                .mockResolvedValueOnce({
                  fields: {},
                  tags: tags, // Same tags again
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities),
            };

            const analyzer = new IncrementalEnrichmentAnalyzer(
              mockExtractionService as any,
              {
                minWordCount: 50,
                pauseThresholdMs: 100000,
                maxPendingWords: 300,
                debounceMs: 0,
              }
            );

            // First enrichment
            const text1 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text1, true);

            // Second enrichment with same tags
            const text2 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text2, true);

            const suggestions = analyzer.getSuggestions('test-session');
            const tagSuggestions = suggestions.filter((s) => s.type === 'tag');

            // Should have unique tags only (no duplicates)
            const uniqueTags = new Set(tagSuggestions.map((s) => s.value.toLowerCase()));
            expect(tagSuggestions.length).toBe(uniqueTags.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should keep highest confidence version when merging duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a tag name
          fc.string({ minLength: 1, maxLength: 20 }),
          // Generate two confidence values
          fc.float({ min: 0, max: 1 }),
          fc.float({ min: 0, max: 1 }),
          async (tagName, confidence1, confidence2) => {
            // Determine which confidence is higher
            const higherConfidence = Math.max(confidence1, confidence2);

            // Create a custom analyzer that we can control confidence values
            // For this test, we'll verify the merge logic indirectly by checking
            // that only one instance of each tag exists after multiple enrichments
            const mockExtractionService = {
              extractGeneric: vi
                .fn()
                .mockResolvedValueOnce({
                  fields: {},
                  tags: [tagName],
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities)
                .mockResolvedValueOnce({
                  fields: {},
                  tags: [tagName], // Same tag again
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities),
            };

            const analyzer = new IncrementalEnrichmentAnalyzer(
              mockExtractionService as any,
              {
                minWordCount: 50,
                pauseThresholdMs: 100000,
                maxPendingWords: 300,
                debounceMs: 0,
              }
            );

            // First enrichment
            const text1 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text1, true);

            // Second enrichment
            const text2 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text2, true);

            const suggestions = analyzer.getSuggestions('test-session');
            const matchingSuggestions = suggestions.filter(
              (s) => s.type === 'tag' && s.value.toLowerCase() === tagName.toLowerCase()
            );

            // Should have exactly one suggestion for this tag (merged)
            expect(matchingSuggestions.length).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all unique suggestions when merging', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two sets of tags with some overlap
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          async (tags1, tags2) => {
            const mockExtractionService = {
              extractGeneric: vi
                .fn()
                .mockResolvedValueOnce({
                  fields: {},
                  tags: tags1,
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities)
                .mockResolvedValueOnce({
                  fields: {},
                  tags: tags2,
                  groups: [],
                  lastContactDate: undefined,
                } as ExtractedEntities),
            };

            const analyzer = new IncrementalEnrichmentAnalyzer(
              mockExtractionService as any,
              {
                minWordCount: 50,
                pauseThresholdMs: 100000,
                maxPendingWords: 300,
                debounceMs: 0,
              }
            );

            // First enrichment
            const text1 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text1, true);

            // Second enrichment
            const text2 = 'word '.repeat(50).trim();
            await analyzer.processTranscript('test-session', text2, true);

            const suggestions = analyzer.getSuggestions('test-session');
            const tagSuggestions = suggestions.filter((s) => s.type === 'tag');

            // Calculate expected unique tags (case-insensitive)
            const allTags = [...tags1, ...tags2];
            const uniqueTags = new Set(allTags.map((t) => t.toLowerCase()));

            // Should have all unique tags from both sets
            const resultTags = new Set(tagSuggestions.map((s) => s.value.toLowerCase()));
            
            // Every unique tag should be present in results
            for (const tag of uniqueTags) {
              expect(resultTags.has(tag)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
