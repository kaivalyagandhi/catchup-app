/**
 * Tests for AI Enrichment Job Processor
 *
 * Validates: Requirements 6.2, 6.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processAiEnrichment,
  fetchPendingSummaries,
  createBatches,
  buildEnrichmentPrompt,
  parseGeminiResponse,
  updateSummaryEnrichment,
  enrichBatchWithRetry,
} from './ai-enrichment-processor';
import type { AiEnrichmentJobData, PendingSummary } from './ai-enrichment-processor';

// ─── Mock dependencies ───────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

// Mock Gemini client
const mockGenerateContent = vi.fn();
vi.mock('../../integrations/google-gemini-config', () => ({
  initializeGeminiClient: vi.fn().mockReturnValue({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: (...args: any[]) => mockGenerateContent(...args),
    }),
  }),
  DEFAULT_GEMINI_CONFIG: {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  },
}));

// ─── Test data ───────────────────────────────────────────────────────────────

const makeSummary = (overrides: Partial<PendingSummary> = {}): PendingSummary => ({
  id: 'summary-1',
  participantIdentifier: '+15551234567',
  participantDisplayName: 'Alice',
  platform: 'whatsapp',
  messageCount: 50,
  firstMessageDate: new Date('2024-01-01'),
  lastMessageDate: new Date('2024-06-01'),
  avgMessagesPerMonth: 10,
  ...overrides,
});

// ─── createBatches ───────────────────────────────────────────────────────────

describe('createBatches', () => {
  it('should return empty array for empty input', () => {
    expect(createBatches([], 100)).toEqual([]);
  });

  it('should return single batch when items fit', () => {
    const items = [1, 2, 3];
    const batches = createBatches(items, 100);
    expect(batches).toEqual([[1, 2, 3]]);
  });

  it('should split items into correct batch sizes', () => {
    const items = [1, 2, 3, 4, 5];
    const batches = createBatches(items, 2);
    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle batch size of 1', () => {
    const items = ['a', 'b', 'c'];
    const batches = createBatches(items, 1);
    expect(batches).toEqual([['a'], ['b'], ['c']]);
  });
});

// ─── buildEnrichmentPrompt ───────────────────────────────────────────────────

describe('buildEnrichmentPrompt', () => {
  it('should include participant details in prompt', () => {
    const summaries = [makeSummary()];
    const prompt = buildEnrichmentPrompt(summaries);

    expect(prompt).toContain('Alice');
    expect(prompt).toContain('whatsapp');
    expect(prompt).toContain('50 messages');
    expect(prompt).toContain('10 msgs/month');
  });

  it('should use identifier when display name is null', () => {
    const summaries = [makeSummary({ participantDisplayName: null })];
    const prompt = buildEnrichmentPrompt(summaries);

    expect(prompt).toContain('+15551234567');
  });

  it('should number multiple participants', () => {
    const summaries = [
      makeSummary({ id: 's1', participantDisplayName: 'Alice' }),
      makeSummary({ id: 's2', participantDisplayName: 'Bob' }),
    ];
    const prompt = buildEnrichmentPrompt(summaries);

    expect(prompt).toContain('1. Participant: "Alice"');
    expect(prompt).toContain('2. Participant: "Bob"');
  });

  it('should request JSON array response format', () => {
    const prompt = buildEnrichmentPrompt([makeSummary()]);
    expect(prompt).toContain('JSON array');
    expect(prompt).toContain('"topics"');
    expect(prompt).toContain('"sentiment"');
  });
});

// ─── parseGeminiResponse ─────────────────────────────────────────────────────

describe('parseGeminiResponse', () => {
  it('should parse valid response with topics and sentiment', () => {
    const response = JSON.stringify([
      { index: 1, topics: ['family', 'travel'], sentiment: 'positive' },
    ]);

    const results = parseGeminiResponse(response, 1);
    expect(results).toEqual([
      { topics: ['family', 'travel'], sentiment: 'positive' },
    ]);
  });

  it('should handle multiple participants', () => {
    const response = JSON.stringify([
      { index: 1, topics: ['work'], sentiment: 'neutral' },
      { index: 2, topics: ['sports', 'music'], sentiment: 'positive' },
    ]);

    const results = parseGeminiResponse(response, 2);
    expect(results[0]).toEqual({ topics: ['work'], sentiment: 'neutral' });
    expect(results[1]).toEqual({ topics: ['sports', 'music'], sentiment: 'positive' });
  });

  it('should return null for missing indices', () => {
    const response = JSON.stringify([
      { index: 2, topics: ['work'], sentiment: 'neutral' },
    ]);

    const results = parseGeminiResponse(response, 3);
    expect(results[0]).toBeNull();
    expect(results[1]).toEqual({ topics: ['work'], sentiment: 'neutral' });
    expect(results[2]).toBeNull();
  });

  it('should truncate topics to 10', () => {
    const topics = Array.from({ length: 15 }, (_, i) => `topic${i}`);
    const response = JSON.stringify([
      { index: 1, topics, sentiment: 'positive' },
    ]);

    const results = parseGeminiResponse(response, 1);
    expect(results[0]!.topics).toHaveLength(10);
  });

  it('should default to neutral for invalid sentiment', () => {
    const response = JSON.stringify([
      { index: 1, topics: ['work'], sentiment: 'invalid' },
    ]);

    const results = parseGeminiResponse(response, 1);
    expect(results[0]!.sentiment).toBe('neutral');
  });

  it('should return all nulls for invalid JSON', () => {
    const results = parseGeminiResponse('not json', 2);
    expect(results).toEqual([null, null]);
  });

  it('should return all nulls for non-array JSON', () => {
    const results = parseGeminiResponse('{"key": "value"}', 2);
    expect(results).toEqual([null, null]);
  });

  it('should filter non-string topics', () => {
    const response = JSON.stringify([
      { index: 1, topics: ['valid', 123, null, 'also valid'], sentiment: 'positive' },
    ]);

    const results = parseGeminiResponse(response, 1);
    expect(results[0]!.topics).toEqual(['valid', 'also valid']);
  });

  it('should ignore out-of-range indices', () => {
    const response = JSON.stringify([
      { index: 0, topics: ['bad'], sentiment: 'positive' },
      { index: 5, topics: ['bad'], sentiment: 'positive' },
      { index: 1, topics: ['good'], sentiment: 'neutral' },
    ]);

    const results = parseGeminiResponse(response, 2);
    expect(results[0]).toEqual({ topics: ['good'], sentiment: 'neutral' });
    expect(results[1]).toBeNull();
  });
});

// ─── fetchPendingSummaries ───────────────────────────────────────────────────

describe('fetchPendingSummaries', () => {
  it('should return mapped summaries from DB rows', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'sum-1',
            participant_identifier: '+15551234567',
            participant_display_name: 'Alice',
            platform: 'whatsapp',
            message_count: 50,
            first_message_date: new Date('2024-01-01'),
            last_message_date: new Date('2024-06-01'),
            avg_messages_per_month: '10.00',
          },
        ],
      }),
    };

    const summaries = await fetchPendingSummaries(mockPool, 'import-1');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe('sum-1');
    expect(summaries[0].participantDisplayName).toBe('Alice');
    expect(summaries[0].avgMessagesPerMonth).toBe(10);
  });

  it('should return empty array when no pending summaries', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const summaries = await fetchPendingSummaries(mockPool, 'import-1');
    expect(summaries).toEqual([]);
  });

  it('should query with correct import_record_id and status filter', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await fetchPendingSummaries(mockPool, 'import-123');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("ai_enrichment_status = 'pending'"),
      ['import-123'],
    );
  });
});

// ─── updateSummaryEnrichment ─────────────────────────────────────────────────

describe('updateSummaryEnrichment', () => {
  it('should update topics, sentiment, and status on success', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await updateSummaryEnrichment(
      mockPool,
      'sum-1',
      { topics: ['family', 'travel'], sentiment: 'positive' },
      'complete',
    );

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('topics'),
      ['sum-1', JSON.stringify(['family', 'travel']), 'positive', 'complete'],
    );
  });

  it('should only update status on failure', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await updateSummaryEnrichment(mockPool, 'sum-1', null, 'failed');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('ai_enrichment_status'),
      ['sum-1', 'failed'],
    );
    // Should NOT include topics in the query params
    expect(mockPool.query.mock.calls[0][1]).toHaveLength(2);
  });
});

// ─── enrichBatchWithRetry ────────────────────────────────────────────────────

describe('enrichBatchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return results on first successful attempt', async () => {
    const geminiResponse = JSON.stringify([
      { index: 1, topics: ['work'], sentiment: 'neutral' },
    ]);
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => geminiResponse },
    });

    const summaries = [makeSummary()];
    const results = await enrichBatchWithRetry(summaries, 2);

    expect(results[0]).toEqual({ topics: ['work'], sentiment: 'neutral' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const geminiResponse = JSON.stringify([
      { index: 1, topics: ['travel'], sentiment: 'positive' },
    ]);
    mockGenerateContent
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce({
        response: { text: () => geminiResponse },
      });

    const summaries = [makeSummary()];
    const results = await enrichBatchWithRetry(summaries, 2);

    expect(results[0]).toEqual({ topics: ['travel'], sentiment: 'positive' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should return nulls after all retries exhausted', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'));

    const summaries = [makeSummary(), makeSummary({ id: 's2' })];
    const results = await enrichBatchWithRetry(summaries, 2);

    expect(results).toEqual([null, null]);
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });
});

// ─── processAiEnrichment (integration) ───────────────────────────────────────

describe('processAiEnrichment', () => {
  const jobData: AiEnrichmentJobData = {
    importRecordId: 'import-1',
    userId: 'user-1',
    platform: 'whatsapp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty summaries gracefully', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const job = { id: 'job-1', data: jobData, name: 'ai-enrichment' };
    const result = await processAiEnrichment(job);

    expect(result).toEqual({ enrichedCount: 0, failedCount: 0 });

    // Should still mark import as complete
    const completeCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes("status = 'complete'"),
    );
    expect(completeCall).toBeDefined();
  });

  it('should enrich summaries and create notification', async () => {
    // Setup: return pending summaries, then handle updates
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT') && sql.includes('interaction_summaries')) {
        return Promise.resolve({
          rows: [
            {
              id: 'sum-1',
              participant_identifier: '+15551234567',
              participant_display_name: 'Alice',
              platform: 'whatsapp',
              message_count: 50,
              first_message_date: new Date('2024-01-01'),
              last_message_date: new Date('2024-06-01'),
              avg_messages_per_month: '10.00',
            },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    // Mock Gemini response
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify([
          { index: 1, topics: ['family', 'travel'], sentiment: 'positive' },
        ]),
      },
    });

    const job = { id: 'job-1', data: jobData, name: 'ai-enrichment' };
    const result = await processAiEnrichment(job);

    expect(result).toEqual({ enrichedCount: 1, failedCount: 0 });

    // Should create notification
    const notifCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('in_app_notifications'),
    );
    expect(notifCall).toBeDefined();
    expect(notifCall![1]).toContain('user-1');
    expect(notifCall![1]).toContain('ai_enrichment_ready');
  });

  it('should mark import complete even when Gemini fails', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT') && sql.includes('interaction_summaries')) {
        return Promise.resolve({
          rows: [
            {
              id: 'sum-1',
              participant_identifier: '+15551234567',
              participant_display_name: 'Alice',
              platform: 'whatsapp',
              message_count: 50,
              first_message_date: new Date('2024-01-01'),
              last_message_date: new Date('2024-06-01'),
              avg_messages_per_month: '10.00',
            },
          ],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    // Gemini fails all retries — enrichBatchWithRetry returns nulls gracefully
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const job = { id: 'job-1', data: jobData, name: 'ai-enrichment' };
    const result = await processAiEnrichment(job);

    // Should report the summary as failed
    expect(result).toEqual({ enrichedCount: 0, failedCount: 1 });

    // Should update the summary's ai_enrichment_status to 'failed'
    const failCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('ai_enrichment_status') &&
        call[1]?.includes('failed'),
    );
    expect(failCall).toBeDefined();

    // Should still mark import as complete
    const completeCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === 'string' && call[0].includes("status = 'complete'"),
    );
    expect(completeCall).toBeDefined();
  });
});
