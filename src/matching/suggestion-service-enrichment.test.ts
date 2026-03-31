/**
 * Suggestion Service Enrichment Tests
 *
 * Tests for enrichment data signals in the AI suggestion engine.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeWeightedScore,
  detectFrequencyTrend,
  DEFAULT_SIGNAL_WEIGHTS,
  SuggestionSignalWeights,
  EnrichmentSignal,
} from './suggestion-service';
import { Contact, FrequencyOption } from '../types';

// Mock pool for DB queries
vi.mock('../db/connection', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock('../utils/cache', () => ({
  getOrSetCache: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  CacheKeys: { SUGGESTION_LIST: () => 'test' },
  CacheTTL: { SUGGESTION_LIST: 60 },
  invalidateSuggestionCache: vi.fn(),
}));

const baseContact: Contact = {
  id: 'c1',
  userId: 'u1',
  name: 'Test Contact',
  groups: [],
  tags: [],
  sources: [],
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Suggestion Service — Enrichment Signals', () => {
  describe('detectFrequencyTrend', () => {
    it('should return stable when no records', () => {
      expect(detectFrequencyTrend(0, [])).toBe('stable');
    });

    it('should return declining when no recent activity', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 4);

      const records = [
        { avg_messages_per_month: '10', last_message_date: sixMonthsAgo.toISOString() },
      ];
      expect(detectFrequencyTrend(10, records)).toBe('declining');
    });

    it('should return stable when recent activity matches average', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 5);

      const records = [
        { avg_messages_per_month: '10', last_message_date: recent.toISOString() },
      ];
      expect(detectFrequencyTrend(10, records)).toBe('stable');
    });

    it('should return increasing when recent activity is much higher', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 5);

      const records = [
        { avg_messages_per_month: '20', last_message_date: recent.toISOString() },
      ];
      // overallAvg = 5, recentAvg = 20, ratio = 4.0 > 1.5
      expect(detectFrequencyTrend(5, records)).toBe('increasing');
    });
  });

  describe('computeWeightedScore', () => {
    const currentDate = new Date('2024-06-15T12:00:00Z');

    it('should produce a score between 0 and 100 with enrichment data', () => {
      const enrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 15,
        lastMessageDate: new Date('2024-06-01'),
        sentimentTrend: 'positive',
        frequencyTrend: 'stable',
        topPlatform: 'whatsapp',
        totalMessageCount: 500,
      };

      const { score } = computeWeightedScore(baseContact, enrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should produce a valid score without enrichment data (Req 17.5)', () => {
      const { score, contribution } = computeWeightedScore(
        baseContact, null, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(contribution.hasEnrichmentData).toBe(false);
      expect(contribution.enrichmentScore).toBe(0);
    });

    it('should re-weight remaining signals when no enrichment data', () => {
      const { contribution } = computeWeightedScore(
        baseContact, null, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );
      // Enrichment weight should be 0
      expect(contribution.weights.enrichmentData).toBe(0);
      // Remaining weights should sum to ~1.0
      const sum = contribution.weights.interactionLogs +
        contribution.weights.calendarData +
        contribution.weights.contactMetadata;
      expect(sum).toBeCloseTo(1.0, 1);
    });

    it('should boost score for declining frequency (Req 17.2)', () => {
      const stableEnrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 10,
        lastMessageDate: new Date('2024-06-01'),
        sentimentTrend: 'neutral',
        frequencyTrend: 'stable',
        topPlatform: 'whatsapp',
        totalMessageCount: 200,
      };

      const decliningEnrichment: EnrichmentSignal = {
        ...stableEnrichment,
        frequencyTrend: 'declining',
      };

      const { score: stableScore } = computeWeightedScore(
        baseContact, stableEnrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );
      const { score: decliningScore, contribution } = computeWeightedScore(
        baseContact, decliningEnrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );

      expect(decliningScore).toBeGreaterThan(stableScore);
      expect(contribution.decliningFrequency).toBe(true);
    });

    it('should include sentiment in reasoning when negative (Req 17.3)', () => {
      const negativeEnrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 10,
        lastMessageDate: new Date('2024-06-01'),
        sentimentTrend: 'negative',
        frequencyTrend: 'stable',
        topPlatform: 'instagram',
        totalMessageCount: 100,
      };

      const { reasoning, contribution } = computeWeightedScore(
        baseContact, negativeEnrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );

      expect(reasoning).toContain('negative tone');
      expect(contribution.negativeSentiment).toBe(true);
    });

    it('should not include sentiment in reasoning when positive', () => {
      const positiveEnrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 10,
        lastMessageDate: new Date('2024-06-01'),
        sentimentTrend: 'positive',
        frequencyTrend: 'stable',
        topPlatform: 'whatsapp',
        totalMessageCount: 100,
      };

      const { reasoning, contribution } = computeWeightedScore(
        baseContact, positiveEnrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );

      expect(reasoning).not.toContain('negative tone');
      expect(contribution.negativeSentiment).toBe(false);
    });

    it('should log signal contributions (Req 17.6)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      computeWeightedScore(baseContact, null, DEFAULT_SIGNAL_WEIGHTS, currentDate);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SuggestionEngine]'),
      );
      consoleSpy.mockRestore();
    });

    it('should use custom weights correctly', () => {
      const customWeights: SuggestionSignalWeights = {
        enrichmentData: 0.5,
        interactionLogs: 0.2,
        calendarData: 0.2,
        contactMetadata: 0.1,
      };

      const enrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 20,
        lastMessageDate: new Date('2024-06-10'),
        sentimentTrend: 'positive',
        frequencyTrend: 'stable',
        topPlatform: 'whatsapp',
        totalMessageCount: 1000,
      };

      const { contribution } = computeWeightedScore(
        baseContact, enrichment, customWeights, currentDate,
      );

      expect(contribution.weights.enrichmentData).toBe(0.5);
      expect(contribution.weights.interactionLogs).toBe(0.2);
    });

    it('should include platform info in reasoning when enrichment exists', () => {
      const enrichment: EnrichmentSignal = {
        contactId: 'c1',
        avgMessagesPerMonth: 10,
        lastMessageDate: new Date('2024-06-01'),
        sentimentTrend: 'neutral',
        frequencyTrend: 'stable',
        topPlatform: 'whatsapp',
        totalMessageCount: 500,
      };

      const { reasoning } = computeWeightedScore(
        baseContact, enrichment, DEFAULT_SIGNAL_WEIGHTS, currentDate,
      );

      expect(reasoning).toContain('whatsapp');
      expect(reasoning).toContain('500 messages');
    });
  });

  describe('DEFAULT_SIGNAL_WEIGHTS', () => {
    it('should sum to 1.0 (Req 17.4)', () => {
      const sum = DEFAULT_SIGNAL_WEIGHTS.enrichmentData +
        DEFAULT_SIGNAL_WEIGHTS.interactionLogs +
        DEFAULT_SIGNAL_WEIGHTS.calendarData +
        DEFAULT_SIGNAL_WEIGHTS.contactMetadata;
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should have correct default values', () => {
      expect(DEFAULT_SIGNAL_WEIGHTS.enrichmentData).toBe(0.25);
      expect(DEFAULT_SIGNAL_WEIGHTS.interactionLogs).toBe(0.35);
      expect(DEFAULT_SIGNAL_WEIGHTS.calendarData).toBe(0.25);
      expect(DEFAULT_SIGNAL_WEIGHTS.contactMetadata).toBe(0.15);
    });
  });
});
