/**
 * Tests for InteractionSummary generation from ParseResult
 *
 * Validates: Requirements 6.1, 6.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateInteractionSummaries,
  computeAvgMessagesPerMonth,
  storeInteractionSummaries,
  type InteractionSummaryInput,
} from './interaction-summary-generator';
import type { ParseResult } from './parser';

// ─── Helper factories ────────────────────────────────────────────────────────

function makeParseResult(overrides: Partial<ParseResult> = {}): ParseResult {
  return {
    platform: 'whatsapp',
    participants: [],
    messages: [],
    errors: [],
    ...overrides,
  };
}

const IMPORT_RECORD_ID = '00000000-0000-0000-0000-000000000001';

// ─── generateInteractionSummaries ────────────────────────────────────────────

describe('generateInteractionSummaries', () => {
  it('should return empty array for no messages', () => {
    const result = generateInteractionSummaries(makeParseResult(), IMPORT_RECORD_ID);
    expect(result).toEqual([]);
  });

  it('should generate one summary per unique participant', () => {
    const parseResult = makeParseResult({
      participants: [
        { identifier: '+15551234567', identifierType: 'phone', displayName: 'Alice', messageCount: 2, firstMessageDate: new Date('2024-01-01'), lastMessageDate: new Date('2024-03-01') },
        { identifier: '+15559876543', identifierType: 'phone', displayName: 'Bob', messageCount: 1, firstMessageDate: new Date('2024-02-01'), lastMessageDate: new Date('2024-02-01') },
      ],
      messages: [
        { sender: '+15551234567', content: 'Hello', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: '+15551234567', content: 'How are you?', timestamp: new Date('2024-03-01'), isSystemMessage: false },
        { sender: '+15559876543', content: 'Hi there', timestamp: new Date('2024-02-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);

    expect(summaries).toHaveLength(2);
    const alice = summaries.find((s) => s.participantIdentifier === '+15551234567');
    const bob = summaries.find((s) => s.participantIdentifier === '+15559876543');

    expect(alice).toBeDefined();
    expect(alice!.messageCount).toBe(2);
    expect(alice!.participantDisplayName).toBe('Alice');
    expect(alice!.firstMessageDate).toEqual(new Date('2024-01-01'));
    expect(alice!.lastMessageDate).toEqual(new Date('2024-03-01'));

    expect(bob).toBeDefined();
    expect(bob!.messageCount).toBe(1);
    expect(bob!.participantDisplayName).toBe('Bob');
  });

  it('should skip system messages (isSystemMessage flag)', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: 'alice', content: 'Hello', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'system', content: 'Alice joined', timestamp: new Date('2024-01-01'), isSystemMessage: true },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].participantIdentifier).toBe('alice');
  });

  it('should skip __system__ sender', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: '__system__', content: 'Group created', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'alice', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(1);
  });

  it('should skip __self__ sender', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: '__self__', content: 'My own message', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'bob', content: 'Reply', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].participantIdentifier).toBe('bob');
  });

  it('should normalize participant identifiers', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: '+1 (555) 123-4567', content: 'Hello', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: '+15551234567', content: 'Again', timestamp: new Date('2024-02-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    // Both messages should be grouped under the same normalized phone
    expect(summaries).toHaveLength(1);
    expect(summaries[0].participantIdentifier).toBe('+15551234567');
    expect(summaries[0].messageCount).toBe(2);
    expect(summaries[0].identifierType).toBe('phone');
  });

  it('should normalize email identifiers to lowercase', () => {
    const parseResult = makeParseResult({
      platform: 'facebook',
      messages: [
        { sender: 'Alice@Example.COM', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'alice@example.com', content: 'Hello', timestamp: new Date('2024-02-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].participantIdentifier).toBe('alice@example.com');
    expect(summaries[0].identifierType).toBe('email');
  });

  it('should compute correct first and last message dates', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: 'alice', content: 'msg1', timestamp: new Date('2024-03-15'), isSystemMessage: false },
        { sender: 'alice', content: 'msg2', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'alice', content: 'msg3', timestamp: new Date('2024-06-20'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].firstMessageDate).toEqual(new Date('2024-01-01'));
    expect(summaries[0].lastMessageDate).toEqual(new Date('2024-06-20'));
  });

  it('should set platform from ParseResult', () => {
    const parseResult = makeParseResult({
      platform: 'instagram',
      messages: [
        { sender: 'user1', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries[0].platform).toBe('instagram');
  });

  it('should set importRecordId on all summaries', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: 'alice', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
        { sender: 'bob', content: 'Hey', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries).toHaveLength(2);
    summaries.forEach((s) => expect(s.importRecordId).toBe(IMPORT_RECORD_ID));
  });

  it('should initialize topics as empty array and sentiment as null', () => {
    const parseResult = makeParseResult({
      messages: [
        { sender: 'alice', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries[0].topics).toEqual([]);
    expect(summaries[0].sentiment).toBeNull();
  });

  it('should look up displayName from participants array', () => {
    const parseResult = makeParseResult({
      participants: [
        { identifier: 'jdoe', identifierType: 'username', displayName: 'John Doe', messageCount: 1, firstMessageDate: new Date('2024-01-01'), lastMessageDate: new Date('2024-01-01') },
      ],
      messages: [
        { sender: 'jdoe', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries[0].participantDisplayName).toBe('John Doe');
  });

  it('should handle participants with no displayName', () => {
    const parseResult = makeParseResult({
      participants: [
        { identifier: '+15551234567', identifierType: 'phone', messageCount: 1, firstMessageDate: new Date('2024-01-01'), lastMessageDate: new Date('2024-01-01') },
      ],
      messages: [
        { sender: '+15551234567', content: 'Hi', timestamp: new Date('2024-01-01'), isSystemMessage: false },
      ],
    });

    const summaries = generateInteractionSummaries(parseResult, IMPORT_RECORD_ID);
    expect(summaries[0].participantDisplayName).toBeUndefined();
  });
});

// ─── computeAvgMessagesPerMonth ──────────────────────────────────────────────

describe('computeAvgMessagesPerMonth', () => {
  it('should use minimum 1 month for same-day conversations', () => {
    const date = new Date('2024-01-15');
    const avg = computeAvgMessagesPerMonth(10, date, date);
    expect(avg).toBe(10);
  });

  it('should compute correctly for multi-month span', () => {
    const first = new Date('2024-01-01');
    const last = new Date('2024-07-01'); // ~6 months
    const avg = computeAvgMessagesPerMonth(60, first, last);
    // 60 messages / ~5.93 months ≈ 10.12
    expect(avg).toBeGreaterThan(9);
    expect(avg).toBeLessThan(11);
  });

  it('should compute correctly for exactly 1 month span', () => {
    const first = new Date('2024-01-01');
    const last = new Date('2024-01-31'); // ~30 days ≈ 1 month
    const avg = computeAvgMessagesPerMonth(30, first, last);
    // 30 days / 30.44 ≈ 0.986 months → clamped to 1 → 30/1 = 30
    expect(avg).toBe(30);
  });

  it('should handle single message', () => {
    const date = new Date('2024-06-15');
    const avg = computeAvgMessagesPerMonth(1, date, date);
    expect(avg).toBe(1);
  });

  it('should handle large time spans', () => {
    const first = new Date('2020-01-01');
    const last = new Date('2024-01-01'); // ~48 months
    const avg = computeAvgMessagesPerMonth(480, first, last);
    // 480 / ~47.3 ≈ 10.15
    expect(avg).toBeGreaterThan(9);
    expect(avg).toBeLessThan(11);
  });
});

// ─── storeInteractionSummaries ───────────────────────────────────────────────

describe('storeInteractionSummaries', () => {
  let mockPool: any;
  let mockClient: any;
  let queryResults: any[];

  beforeEach(() => {
    queryResults = [];
    mockClient = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        // Return a mock row for INSERT RETURNING
        const result = queryResults.shift() || {
          rows: [{ id: 'generated-uuid', created_at: new Date('2024-01-01T00:00:00Z') }],
        };
        return Promise.resolve(result);
      }),
      release: vi.fn(),
    };
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };
  });

  it('should return empty array for empty input', async () => {
    const result = await storeInteractionSummaries(mockPool, []);
    expect(result).toEqual([]);
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('should insert summaries in a transaction', async () => {
    const summary: InteractionSummaryInput = {
      importRecordId: IMPORT_RECORD_ID,
      participantIdentifier: '+15551234567',
      participantDisplayName: 'Alice',
      identifierType: 'phone',
      platform: 'whatsapp',
      messageCount: 42,
      firstMessageDate: new Date('2024-01-01'),
      lastMessageDate: new Date('2024-06-01'),
      avgMessagesPerMonth: 8.4,
      topics: [],
      sentiment: null,
    };

    queryResults = [
      { rows: [{ id: 'uuid-1', created_at: new Date('2024-07-01T00:00:00Z') }] },
    ];

    const result = await storeInteractionSummaries(mockPool, [summary]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('uuid-1');
    expect(result[0].createdAt).toEqual(new Date('2024-07-01T00:00:00Z'));
    expect(result[0].participantIdentifier).toBe('+15551234567');
    expect(result[0].messageCount).toBe(42);

    // Verify transaction flow: BEGIN, INSERT, COMMIT
    const calls = mockClient.query.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[1][0]).toContain('INSERT INTO interaction_summaries');
    expect(calls[2][0]).toBe('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should pass correct parameters to INSERT', async () => {
    const summary: InteractionSummaryInput = {
      importRecordId: IMPORT_RECORD_ID,
      participantIdentifier: 'alice@example.com',
      participantDisplayName: 'Alice Smith',
      identifierType: 'email',
      platform: 'facebook',
      messageCount: 10,
      firstMessageDate: new Date('2024-01-15'),
      lastMessageDate: new Date('2024-05-20'),
      avgMessagesPerMonth: 2.33,
      topics: [],
      sentiment: null,
    };

    await storeInteractionSummaries(mockPool, [summary]);

    const insertCall = mockClient.query.mock.calls[1];
    const params = insertCall[1];
    expect(params[0]).toBe(IMPORT_RECORD_ID);
    expect(params[1]).toBe('alice@example.com');
    expect(params[2]).toBe('Alice Smith');
    expect(params[3]).toBe('email');
    expect(params[4]).toBe('facebook');
    expect(params[5]).toBe(10);
    expect(params[6]).toEqual(new Date('2024-01-15'));
    expect(params[7]).toEqual(new Date('2024-05-20'));
    expect(params[8]).toBe(2.33);
    expect(params[9]).toBe('[]');
    expect(params[10]).toBeNull();
  });

  it('should rollback on error and release client', async () => {
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('INSERT')) return Promise.reject(new Error('DB error'));
      return Promise.resolve();
    });

    const summary: InteractionSummaryInput = {
      importRecordId: IMPORT_RECORD_ID,
      participantIdentifier: 'alice',
      identifierType: 'username',
      platform: 'twitter',
      messageCount: 1,
      firstMessageDate: new Date('2024-01-01'),
      lastMessageDate: new Date('2024-01-01'),
      avgMessagesPerMonth: 1,
      topics: [],
      sentiment: null,
    };

    await expect(storeInteractionSummaries(mockPool, [summary])).rejects.toThrow('DB error');

    const calls = mockClient.query.mock.calls.map((c: any[]) =>
      typeof c[0] === 'string' ? c[0] : 'INSERT',
    );
    expect(calls).toContain('BEGIN');
    expect(calls).toContain('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should handle multiple summaries in one transaction', async () => {
    const summaries: InteractionSummaryInput[] = [
      {
        importRecordId: IMPORT_RECORD_ID,
        participantIdentifier: 'alice',
        identifierType: 'username',
        platform: 'instagram',
        messageCount: 5,
        firstMessageDate: new Date('2024-01-01'),
        lastMessageDate: new Date('2024-03-01'),
        avgMessagesPerMonth: 2.5,
        topics: [],
        sentiment: null,
      },
      {
        importRecordId: IMPORT_RECORD_ID,
        participantIdentifier: 'bob',
        identifierType: 'username',
        platform: 'instagram',
        messageCount: 3,
        firstMessageDate: new Date('2024-02-01'),
        lastMessageDate: new Date('2024-04-01'),
        avgMessagesPerMonth: 1.5,
        topics: [],
        sentiment: null,
      },
    ];

    queryResults = [
      { rows: [{ id: 'uuid-1', created_at: new Date('2024-07-01') }] },
      { rows: [{ id: 'uuid-2', created_at: new Date('2024-07-01') }] },
    ];

    const result = await storeInteractionSummaries(mockPool, summaries);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('uuid-1');
    expect(result[1].id).toBe('uuid-2');

    // BEGIN + 2 INSERTs + COMMIT = 4 calls
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it('should handle null displayName', async () => {
    const summary: InteractionSummaryInput = {
      importRecordId: IMPORT_RECORD_ID,
      participantIdentifier: '+15551234567',
      identifierType: 'phone',
      platform: 'whatsapp',
      messageCount: 1,
      firstMessageDate: new Date('2024-01-01'),
      lastMessageDate: new Date('2024-01-01'),
      avgMessagesPerMonth: 1,
      topics: [],
      sentiment: null,
    };

    await storeInteractionSummaries(mockPool, [summary]);

    const insertCall = mockClient.query.mock.calls[1];
    const params = insertCall[1];
    // participantDisplayName should be null when undefined
    expect(params[2]).toBeNull();
  });
});
