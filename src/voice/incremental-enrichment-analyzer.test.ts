/**
 * Incremental Enrichment Analyzer Tests
 *
 * Unit tests for the IncrementalEnrichmentAnalyzer class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncrementalEnrichmentAnalyzer } from './incremental-enrichment-analyzer';
import { Contact, ExtractedEntities } from '../types';

describe('IncrementalEnrichmentAnalyzer', () => {
  let analyzer: IncrementalEnrichmentAnalyzer;
  let mockExtractionService: any;

  beforeEach(() => {
    // Create mock extraction service
    mockExtractionService = {
      extractGeneric: vi.fn().mockResolvedValue({
        fields: {},
        tags: ['hiking', 'photography'],
        groups: ['Outdoor Friends'],
        lastContactDate: undefined,
      } as ExtractedEntities),
    };

    analyzer = new IncrementalEnrichmentAnalyzer(mockExtractionService, {
      minWordCount: 50,
      pauseThresholdMs: 2000,
      maxPendingWords: 200,
      debounceMs: 500,
    });
  });

  describe('processTranscript', () => {
    it('should not trigger on interim text', async () => {
      const triggered = await analyzer.processTranscript(
        'session-1',
        'This is interim text',
        false
      );

      expect(triggered).toBe(false);
      expect(mockExtractionService.extractGeneric).not.toHaveBeenCalled();
    });

    it('should trigger enrichment when word count threshold is reached', async () => {
      // Generate text with 50+ words
      const text = 'word '.repeat(50).trim();

      const triggered = await analyzer.processTranscript('session-1', text, true);

      expect(triggered).toBe(true);
      expect(mockExtractionService.extractGeneric).toHaveBeenCalledWith(text);
    });

    it('should accumulate text across multiple calls', async () => {
      // Create a fresh analyzer to avoid timing issues
      const freshAnalyzer = new IncrementalEnrichmentAnalyzer(mockExtractionService, {
        minWordCount: 50,
        pauseThresholdMs: 10000, // Set very high to avoid pause trigger
        maxPendingWords: 200,
        debounceMs: 100,
      });
      
      // Add text in chunks - first chunk doesn't trigger (25 < 50)
      await freshAnalyzer.processTranscript('session-1', 'word '.repeat(25).trim(), true);
      
      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Second chunk should trigger since we now have 50 words total
      const triggered = await freshAnalyzer.processTranscript(
        'session-1',
        'word '.repeat(25).trim(),
        true
      );

      expect(triggered).toBe(true);
      expect(mockExtractionService.extractGeneric).toHaveBeenCalled();
    });

    it('should trigger on natural pause after 2 seconds', async () => {
      vi.useFakeTimers();

      // First, trigger an enrichment to set lastAnalyzedAt
      const text1 = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text1, true);

      // Wait for debounce
      vi.advanceTimersByTime(600);

      // Add some text (below threshold)
      await analyzer.processTranscript('session-1', 'Some text here', true);

      // Advance time by 2+ seconds to trigger pause detection
      vi.advanceTimersByTime(2100);

      // Add more text - should trigger due to pause
      const triggered = await analyzer.processTranscript(
        'session-1',
        'More text',
        true
      );

      expect(triggered).toBe(true);

      vi.useRealTimers();
    });

    it('should debounce rapid triggers', async () => {
      vi.useFakeTimers();

      const text = 'word '.repeat(50).trim();

      // First trigger
      await analyzer.processTranscript('session-1', text, true);
      expect(mockExtractionService.extractGeneric).toHaveBeenCalledTimes(1);

      // Immediate second trigger - should be debounced
      vi.advanceTimersByTime(100);
      await analyzer.processTranscript('session-1', text, true);
      expect(mockExtractionService.extractGeneric).toHaveBeenCalledTimes(1);

      // After debounce period
      vi.advanceTimersByTime(500);
      await analyzer.processTranscript('session-1', text, true);
      expect(mockExtractionService.extractGeneric).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for unknown session', () => {
      const suggestions = analyzer.getSuggestions('unknown-session');
      expect(suggestions).toEqual([]);
    });

    it('should return suggestions after enrichment', async () => {
      const text = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text, true);

      const suggestions = analyzer.getSuggestions('session-1');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('type');
      expect(suggestions[0]).toHaveProperty('value');
      expect(suggestions[0]).toHaveProperty('confidence');
    });
  });

  describe('mergeSuggestions', () => {
    it('should deduplicate suggestions by type and value', async () => {
      mockExtractionService.extractGeneric
        .mockResolvedValueOnce({
          fields: {},
          tags: ['hiking'],
          groups: [],
          lastContactDate: undefined,
        })
        .mockResolvedValueOnce({
          fields: {},
          tags: ['hiking', 'photography'],
          groups: [],
          lastContactDate: undefined,
        });

      // First enrichment
      const text1 = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text1, true);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Second enrichment with overlapping tag
      const text2 = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text2, true);

      const suggestions = analyzer.getSuggestions('session-1');
      const tagSuggestions = suggestions.filter((s) => s.type === 'tag');

      // Should have 2 unique tags (hiking, photography)
      expect(tagSuggestions).toHaveLength(2);
      const values = tagSuggestions.map((s) => s.value);
      expect(values).toContain('hiking');
      expect(values).toContain('photography');
    });

    it('should keep highest confidence version when merging', async () => {
      // Create analyzer with custom extraction service that returns different confidences
      const customExtraction = {
        extractGeneric: vi
          .fn()
          .mockResolvedValueOnce({
            fields: {},
            tags: ['hiking'],
            groups: [],
            lastContactDate: undefined,
          })
          .mockResolvedValueOnce({
            fields: {},
            tags: ['hiking'],
            groups: [],
            lastContactDate: undefined,
          }),
      };

      const customAnalyzer = new IncrementalEnrichmentAnalyzer(
        customExtraction as any
      );

      // First enrichment
      const text1 = 'word '.repeat(50).trim();
      await customAnalyzer.processTranscript('session-1', text1, true);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Second enrichment
      const text2 = 'word '.repeat(50).trim();
      await customAnalyzer.processTranscript('session-1', text2, true);

      const suggestions = customAnalyzer.getSuggestions('session-1');
      const hikingSuggestions = suggestions.filter(
        (s) => s.type === 'tag' && s.value === 'hiking'
      );

      // Should have only one hiking suggestion
      expect(hikingSuggestions).toHaveLength(1);
    });
  });

  describe('finalize', () => {
    it('should process remaining pending text', async () => {
      // Create a fresh analyzer with high pause threshold to avoid auto-trigger
      const freshAnalyzer = new IncrementalEnrichmentAnalyzer(mockExtractionService, {
        minWordCount: 50,
        pauseThresholdMs: 10000, // Very high to avoid pause trigger
        maxPendingWords: 200,
        debounceMs: 100,
      });
      
      // Reset mock
      mockExtractionService.extractGeneric.mockClear();
      
      // Add text that doesn't reach threshold
      await freshAnalyzer.processTranscript('session-1', 'Some short text', true);

      // Should not have been called yet (below threshold and no pause)
      expect(mockExtractionService.extractGeneric).not.toHaveBeenCalled();

      // Finalize should process it
      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await freshAnalyzer.finalize('session-1', [contact]);

      // Should have been called during finalize
      expect(mockExtractionService.extractGeneric).toHaveBeenCalledWith(
        'Some short text'
      );
    });

    it('should convert suggestions to ExtractedEntities format', async () => {
      const text = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text, true);

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entitiesMap = await analyzer.finalize('session-1', [contact]);

      expect(entitiesMap.has('contact-1')).toBe(true);
      const entities = entitiesMap.get('contact-1')!;
      expect(entities.tags).toContain('hiking');
      expect(entities.tags).toContain('photography');
      expect(entities.groups).toContain('Outdoor Friends');
    });

    it('should return empty map for unknown session', async () => {
      const entitiesMap = await analyzer.finalize('unknown-session', []);
      expect(entitiesMap.size).toBe(0);
    });

    it('should clean up session state after finalize', async () => {
      const text = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text, true);

      const contact: Contact = {
        id: 'contact-1',
        userId: 'user-1',
        name: 'John Doe',
        groups: [],
        tags: [],
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await analyzer.finalize('session-1', [contact]);

      // Session should be cleaned up
      const suggestions = analyzer.getSuggestions('session-1');
      expect(suggestions).toEqual([]);
    });
  });

  describe('clearSession', () => {
    it('should clear session state', async () => {
      const text = 'word '.repeat(50).trim();
      await analyzer.processTranscript('session-1', text, true);

      analyzer.clearSession('session-1');

      const suggestions = analyzer.getSuggestions('session-1');
      expect(suggestions).toEqual([]);
    });
  });
});
