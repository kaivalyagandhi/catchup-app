/**
 * Tests for Match Result Persistence
 *
 * Validates: Requirements 7.1, 7.3, 7.4, 7.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContactMatch } from './matching';
import type { Participant } from './parser';
import {
  persistMatchResults,
  flagSmartSuggestions,
  updateImportRecordStats,
  type InteractionSummaryMap,
} from './match-persistence';

// ─── Helper factories ────────────────────────────────────────────────────────

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    identifier: '+15551234567',
    identifierType: 'phone',
    displayName: 'Alice',
    messageCount: 10,
    firstMessageDate: new Date('2024-01-01'),
    lastMessageDate: new Date('2024-06-01'),
    ...overrides,
  };
}

function makeMatch(overrides: Partial<ContactMatch> = {}): ContactMatch {
  return {
    participant: makeParticipant(),
    contactId: 'contact-1',
    contactName: 'Alice Smith',
    confidence: 0.95,
    tier: 'auto',
    matchReason: 'Phone exact match (E.164)',
    ...overrides,
  };
}

function createMockClient() {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
  return client;
}

function createMockPool(client: ReturnType<typeof createMockClient>) {
  return {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  } as any;
}

// ─── persistMatchResults ────────────────────────────────────────────────────

describe('persistMatchResults', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockPool: any;
  let summaryMap: InteractionSummaryMap;

  beforeEach(() => {
    mockClient = createMockClient();
    mockPool = createMockPool(mockClient);
    summaryMap = new Map([
      ['+15551234567', 'summary-1'],
      ['mike_s', 'summary-2'],
      ['unknown_xyz', 'summary-3'],
    ]);
  });

  it('should insert auto-matches into enrichment_records', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: '+15551234567' }),
        contactId: 'contact-1',
        tier: 'auto',
        confidence: 0.95,
      }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp',
    );

    expect(result.autoCount).toBe(1);
    expect(result.likelyCount).toBe(0);
    expect(result.unmatchedCount).toBe(0);

    // BEGIN, INSERT enrichment_record, addSourceToContact, COMMIT
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    const insertCall = mockClient.query.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO enrichment_records');
    expect(insertCall[1]).toContain('contact-1');
    expect(insertCall[1]).toContain('user-1');
    expect(insertCall[1]).toContain('import-1');
    expect(insertCall[1]).toContain('summary-1');
    expect(insertCall[1]).toContain('whatsapp');
  });

  it('should insert likely matches into pending_enrichments with correct fields', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: 'mike_s', identifierType: 'display_name', displayName: 'Mike S' }),
        contactId: 'contact-2',
        tier: 'likely',
        confidence: 0.62,
        matchReason: 'Name fuzzy match (similarity: 0.60)',
      }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'instagram',
    );

    expect(result.likelyCount).toBe(1);

    const insertCall = mockClient.query.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO pending_enrichments');
    const params = insertCall[1];
    expect(params[0]).toBe('user-1');           // user_id
    expect(params[1]).toBe('import-1');         // import_record_id
    expect(params[2]).toBe('summary-2');        // interaction_summary_id
    expect(params[3]).toBe('mike_s');           // participant_identifier
    expect(params[4]).toBe('Mike S');           // participant_display_name
    expect(params[5]).toBe('instagram');        // platform
    expect(params[6]).toBe('likely');           // match_tier
    expect(params[7]).toBe('contact-2');        // suggested_contact_id
    expect(params[8]).toBe(0.62);              // confidence
    expect(params[10]).toBe('pending');         // status
  });

  it('should insert unmatched into pending_enrichments with null suggested_contact_id', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: 'unknown_xyz', identifierType: 'display_name', displayName: 'Unknown' }),
        contactId: null,
        contactName: null,
        tier: 'unmatched',
        confidence: 0,
        matchReason: 'No match found',
      }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp',
    );

    expect(result.unmatchedCount).toBe(1);

    const insertCall = mockClient.query.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO pending_enrichments');
    const params = insertCall[1];
    expect(params[6]).toBe('unmatched');  // match_tier
    expect(params[7]).toBeNull();         // suggested_contact_id
  });

  it('should sort unmatched by message_count descending before insert', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: 'unknown_xyz', messageCount: 5 }),
        contactId: null, tier: 'unmatched', confidence: 0,
      }),
      makeMatch({
        participant: makeParticipant({ identifier: 'mike_s', messageCount: 50 }),
        contactId: null, tier: 'unmatched', confidence: 0,
      }),
    ];

    await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp',
    );

    // BEGIN + 2 inserts + COMMIT = 4 calls
    expect(mockClient.query).toHaveBeenCalledTimes(4);

    // First insert should be the higher message_count participant
    const firstInsert = mockClient.query.mock.calls[1][1];
    expect(firstInsert[3]).toBe('mike_s');   // participant_identifier
    expect(firstInsert[11]).toBe(50);        // message_count

    const secondInsert = mockClient.query.mock.calls[2][1];
    expect(secondInsert[3]).toBe('unknown_xyz');
    expect(secondInsert[11]).toBe(5);
  });

  it('should handle mixed tiers in a single call', async () => {
    const matches: ContactMatch[] = [
      makeMatch({ participant: makeParticipant({ identifier: '+15551234567' }), tier: 'auto', contactId: 'c1' }),
      makeMatch({ participant: makeParticipant({ identifier: 'mike_s' }), tier: 'likely', contactId: 'c2', confidence: 0.6 }),
      makeMatch({ participant: makeParticipant({ identifier: 'unknown_xyz' }), tier: 'unmatched', contactId: null, confidence: 0 }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'facebook',
    );

    expect(result.autoCount).toBe(1);
    expect(result.likelyCount).toBe(1);
    expect(result.unmatchedCount).toBe(1);

    // BEGIN + 3 inserts + 1 addSourceToContact + COMMIT = 6 calls
    expect(mockClient.query).toHaveBeenCalledTimes(6);
  });

  it('should skip auto-match if interaction summary not found in map', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: 'not-in-map' }),
        tier: 'auto', contactId: 'c1',
      }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp',
    );

    expect(result.autoCount).toBe(1);
    // BEGIN + COMMIT only (no insert since summary not found)
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });

  it('should skip auto-match if contactId is null', async () => {
    const matches: ContactMatch[] = [
      makeMatch({
        participant: makeParticipant({ identifier: '+15551234567' }),
        tier: 'auto', contactId: null,
      }),
    ];

    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp',
    );

    expect(result.autoCount).toBe(1);
    // BEGIN + COMMIT only
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });

  it('should rollback on error', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

    const matches: ContactMatch[] = [
      makeMatch({ participant: makeParticipant({ identifier: '+15551234567' }), tier: 'auto', contactId: 'c1' }),
    ];

    await expect(
      persistMatchResults(mockPool, 'import-1', 'user-1', matches, summaryMap, 'whatsapp'),
    ).rejects.toThrow('DB error');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should return zero counts for empty matches array', async () => {
    const result = await persistMatchResults(
      mockPool, 'import-1', 'user-1', [], summaryMap, 'whatsapp',
    );

    expect(result).toEqual({ autoCount: 0, likelyCount: 0, unmatchedCount: 0 });
    // BEGIN + COMMIT only
    expect(mockClient.query).toHaveBeenCalledTimes(2);
  });
});

// ─── flagSmartSuggestions ───────────────────────────────────────────────────

describe('flagSmartSuggestions', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
  });

  it('should flag top 20% of unmatched by message_count', async () => {
    // 10 unmatched → top 20% = 2
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // COUNT
      .mockResolvedValueOnce({ rowCount: 2 });             // UPDATE

    const flagged = await flagSmartSuggestions(mockPool, 'import-1');

    expect(flagged).toBe(2);

    const updateCall = mockPool.query.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE pending_enrichments');
    expect(updateCall[0]).toContain("match_reason = 'smart_suggestion'");
    expect(updateCall[0]).toContain('ORDER BY message_count DESC');
    expect(updateCall[1]).toEqual(['import-1', 2]); // LIMIT 2
  });

  it('should flag at least 1 when there are any unmatched', async () => {
    // 3 unmatched → ceil(3 * 0.2) = 1
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '3' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const flagged = await flagSmartSuggestions(mockPool, 'import-1');

    expect(flagged).toBe(1);
    const updateCall = mockPool.query.mock.calls[1];
    expect(updateCall[1][1]).toBe(1); // LIMIT 1
  });

  it('should return 0 when no unmatched exist', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const flagged = await flagSmartSuggestions(mockPool, 'import-1');

    expect(flagged).toBe(0);
    expect(mockPool.query).toHaveBeenCalledTimes(1); // only COUNT, no UPDATE
  });

  it('should compute correct top 20% for 1 unmatched', async () => {
    // 1 unmatched → max(1, ceil(0.2)) = 1
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const flagged = await flagSmartSuggestions(mockPool, 'import-1');
    expect(flagged).toBe(1);
  });

  it('should compute correct top 20% for 100 unmatched', async () => {
    // 100 unmatched → ceil(100 * 0.2) = 20
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: '100' }] })
      .mockResolvedValueOnce({ rowCount: 20 });

    const flagged = await flagSmartSuggestions(mockPool, 'import-1');
    expect(flagged).toBe(20);
    expect(mockPool.query.mock.calls[1][1][1]).toBe(20);
  });
});

// ─── updateImportRecordStats ────────────────────────────────────────────────

describe('updateImportRecordStats', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };
  });

  it('should update import_record with correct statistics', async () => {
    await updateImportRecordStats(mockPool, 'import-1', 5, 3, 2);

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain('UPDATE import_records');
    expect(params[0]).toBe('import-1');  // id
    expect(params[1]).toBe(5);           // auto_matched
    expect(params[2]).toBe(3);           // likely_matched
    expect(params[3]).toBe(2);           // unmatched
    expect(params[4]).toBe(10);          // total_participants (5+3+2)
  });

  it('should handle zero counts', async () => {
    await updateImportRecordStats(mockPool, 'import-1', 0, 0, 0);

    const params = mockPool.query.mock.calls[0][1];
    expect(params[1]).toBe(0);
    expect(params[2]).toBe(0);
    expect(params[3]).toBe(0);
    expect(params[4]).toBe(0);
  });
});
