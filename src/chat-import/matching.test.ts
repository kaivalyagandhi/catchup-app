/**
 * Tests for Contact Matching Engine
 *
 * Validates: Requirements 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Participant } from './parser';
import {
  stringSimilarity,
  levenshteinDistance,
  classifyTier,
  findBestMatch,
  matchParticipantsAgainstContacts,
  createMatchingEngine,
  fetchUserContacts,
  type ContactRow,
  type ContactMatch,
  type MatchTier,
} from './matching';

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

function makeContact(overrides: Partial<ContactRow> = {}): ContactRow {
  return {
    id: 'contact-1',
    name: 'Alice Smith',
    phone: null,
    email: null,
    instagram: null,
    x_handle: null,
    linked_in: null,
    ...overrides,
  };
}

// ─── levenshteinDistance ─────────────────────────────────────────────────────

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('should return length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('should compute correct distance for single edit', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
    expect(levenshteinDistance('cat', 'at')).toBe(1);
  });

  it('should compute correct distance for multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('should be symmetric', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(levenshteinDistance('xyz', 'abc'));
  });
});

// ─── stringSimilarity ───────────────────────────────────────────────────────

describe('stringSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(stringSimilarity('Alice', 'Alice')).toBe(1.0);
  });

  it('should be case-insensitive', () => {
    expect(stringSimilarity('Alice', 'alice')).toBe(1.0);
  });

  it('should trim whitespace', () => {
    expect(stringSimilarity('  Alice  ', 'Alice')).toBe(1.0);
  });

  it('should return 0.0 when one string is empty', () => {
    expect(stringSimilarity('', 'hello')).toBe(0.0);
    expect(stringSimilarity('hello', '')).toBe(0.0);
  });

  it('should return high similarity for similar names', () => {
    const sim = stringSimilarity('Michael', 'Micheal');
    // Levenshtein: 2 edits on 7 chars → 5/7 ≈ 0.71
    expect(sim).toBeGreaterThan(0.7);
  });

  it('should return low similarity for very different strings', () => {
    const sim = stringSimilarity('Alice', 'Zebra');
    expect(sim).toBeLessThan(0.5);
  });
});

// ─── classifyTier ───────────────────────────────────────────────────────────

describe('classifyTier', () => {
  it('should classify confidence >= 0.7 as auto', () => {
    expect(classifyTier(0.7)).toBe('auto');
    expect(classifyTier(0.85)).toBe('auto');
    expect(classifyTier(0.95)).toBe('auto');
    expect(classifyTier(1.0)).toBe('auto');
  });

  it('should classify confidence 0.5-0.7 as likely', () => {
    expect(classifyTier(0.5)).toBe('likely');
    expect(classifyTier(0.6)).toBe('likely');
    expect(classifyTier(0.69)).toBe('likely');
  });

  it('should classify confidence < 0.5 as unmatched', () => {
    expect(classifyTier(0.0)).toBe('unmatched');
    expect(classifyTier(0.3)).toBe('unmatched');
    expect(classifyTier(0.49)).toBe('unmatched');
  });
});

// ─── findBestMatch ──────────────────────────────────────────────────────────

describe('findBestMatch', () => {
  it('should match by phone number (E.164) with confidence 0.95', () => {
    const participant = makeParticipant({
      identifier: '+15551234567',
      identifierType: 'phone',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', phone: '+15551234567' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.95);
    expect(result.matchReason).toBe('Phone exact match (E.164)');
  });

  it('should normalize phone numbers before matching', () => {
    const participant = makeParticipant({
      identifier: '+1 (555) 123-4567',
      identifierType: 'phone',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', phone: '5551234567' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.95);
  });

  it('should match by email (case-insensitive) with confidence 0.90', () => {
    const participant = makeParticipant({
      identifier: 'Alice@Example.COM',
      identifierType: 'email',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', email: 'alice@example.com' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.90);
    expect(result.matchReason).toBe('Email exact match (case-insensitive)');
  });

  it('should match by social handle with confidence 0.85', () => {
    const participant = makeParticipant({
      identifier: '@alice_smith',
      identifierType: 'username',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', instagram: 'alice_smith' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.85);
    expect(result.matchReason).toBe('Social handle exact match');
  });

  it('should match social handle against x_handle', () => {
    const participant = makeParticipant({
      identifier: 'alice_tweets',
      identifierType: 'username',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', x_handle: 'alice_tweets' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.85);
  });

  it('should match social handle against linked_in', () => {
    const participant = makeParticipant({
      identifier: 'alicesmith',
      identifierType: 'username',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice', linked_in: 'alicesmith' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.85);
  });

  it('should return likely match for similar names', () => {
    const participant = makeParticipant({
      identifier: 'mike_s',
      identifierType: 'display_name',
      displayName: 'Mike S',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Mike Smith' })];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.matchReason).toContain('Name fuzzy match');
  });

  it('should return unmatched for no contacts', () => {
    const participant = makeParticipant();
    const result = findBestMatch(participant, []);
    expect(result.contactId).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.matchReason).toBe('No match found');
  });

  it('should return unmatched for very different names', () => {
    const participant = makeParticipant({
      identifier: 'xyz_user',
      identifierType: 'display_name',
      displayName: 'Xyz User',
    });
    const contacts = [makeContact({ id: 'c1', name: 'Alice Smith' })];

    const result = findBestMatch(participant, contacts);
    // With very different names, raw similarity should be < 0.5
    expect(result.confidence).toBe(0);
    expect(result.contactId).toBeNull();
  });

  it('should prefer phone match over name match', () => {
    const participant = makeParticipant({
      identifier: '+15551234567',
      identifierType: 'phone',
      displayName: 'Alice',
    });
    const contacts = [
      makeContact({ id: 'c1', name: 'Alice Smith', phone: '+15551234567' }),
      makeContact({ id: 'c2', name: 'Alice' }),
    ];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.95);
  });

  it('should prefer email match over name match', () => {
    const participant = makeParticipant({
      identifier: 'alice@test.com',
      identifierType: 'email',
      displayName: 'Alice',
    });
    const contacts = [
      makeContact({ id: 'c1', name: 'Alice', email: 'alice@test.com' }),
      makeContact({ id: 'c2', name: 'Alice' }),
    ];

    const result = findBestMatch(participant, contacts);
    expect(result.contactId).toBe('c1');
    expect(result.confidence).toBe(0.90);
  });
});

// ─── matchParticipantsAgainstContacts ───────────────────────────────────────

describe('matchParticipantsAgainstContacts', () => {
  it('should return empty array for no participants', () => {
    const result = matchParticipantsAgainstContacts([], []);
    expect(result).toEqual([]);
  });

  it('should classify each participant into the correct tier', () => {
    const participants: Participant[] = [
      makeParticipant({ identifier: '+15551234567', identifierType: 'phone' }),
      makeParticipant({ identifier: 'mike_s', identifierType: 'display_name', displayName: 'Mike S' }),
      makeParticipant({ identifier: 'unknown_xyz', identifierType: 'display_name', displayName: 'Unknown Xyz' }),
    ];
    const contacts: ContactRow[] = [
      makeContact({ id: 'c1', name: 'Alice Smith', phone: '+15551234567' }),
      makeContact({ id: 'c2', name: 'Mike Smith' }),
    ];

    const results = matchParticipantsAgainstContacts(participants, contacts);

    expect(results).toHaveLength(3);

    // Phone match → auto
    expect(results[0].tier).toBe('auto');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].contactId).toBe('c1');

    // Name fuzzy match → likely
    expect(results[1].tier).toBe('likely');
    expect(results[1].confidence).toBeGreaterThanOrEqual(0.5);
    expect(results[1].confidence).toBeLessThan(0.7);

    // No match → unmatched
    expect(results[2].tier).toBe('unmatched');
    expect(results[2].confidence).toBe(0);
    expect(results[2].contactId).toBeNull();
  });

  it('should return one ContactMatch per participant', () => {
    const participants = [
      makeParticipant({ identifier: 'a@test.com', identifierType: 'email' }),
      makeParticipant({ identifier: 'b@test.com', identifierType: 'email' }),
    ];
    const contacts = [makeContact({ id: 'c1', name: 'A', email: 'a@test.com' })];

    const results = matchParticipantsAgainstContacts(participants, contacts);
    expect(results).toHaveLength(2);
    expect(results[0].participant.identifier).toBe('a@test.com');
    expect(results[1].participant.identifier).toBe('b@test.com');
  });

  it('should preserve participant reference in result', () => {
    const participant = makeParticipant({ identifier: '+15559999999', identifierType: 'phone' });
    const results = matchParticipantsAgainstContacts([participant], []);

    expect(results[0].participant).toBe(participant);
  });
});

// ─── createMatchingEngine (with mocked DB) ──────────────────────────────────

describe('createMatchingEngine', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: 'c1', name: 'Alice Smith', phone: '+15551234567', email: 'alice@test.com', instagram: null, x_handle: null, linked_in: null },
          { id: 'c2', name: 'Bob Jones', phone: null, email: 'bob@test.com', instagram: 'bobjones', x_handle: null, linked_in: null },
        ],
      }),
    };
  });

  it('should query contacts for the given userId', async () => {
    const engine = createMatchingEngine(mockPool);
    await engine.matchParticipants('user-123', []);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, name, phone, email'),
      ['user-123'],
    );
  });

  it('should match participants against fetched contacts', async () => {
    const engine = createMatchingEngine(mockPool);
    const participants = [
      makeParticipant({ identifier: '+15551234567', identifierType: 'phone' }),
      makeParticipant({ identifier: 'bobjones', identifierType: 'username' }),
    ];

    const results = await engine.matchParticipants('user-123', participants);

    expect(results).toHaveLength(2);
    expect(results[0].tier).toBe('auto');
    expect(results[0].contactId).toBe('c1');
    expect(results[1].tier).toBe('auto');
    expect(results[1].contactId).toBe('c2');
  });

  it('should return unmatched when no contacts exist', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const engine = createMatchingEngine(mockPool);
    const results = await engine.matchParticipants('user-123', [
      makeParticipant({ identifier: '+15559999999', identifierType: 'phone' }),
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].tier).toBe('unmatched');
    expect(results[0].contactId).toBeNull();
  });
});
