/**
 * Tests for Import Parse Job Processor
 *
 * Validates: Requirements 6.1, 6.2, 7.1, 11.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectParser, processImportParse, fetchRawContent } from './import-parse-processor';
import type { ImportParseJobData } from './import-parse-processor';

// ─── Mock dependencies ───────────────────────────────────────────────────────

// Mock pool
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();

vi.mock('../../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: (...args: any[]) => mockConnect(...args),
  },
}));

// Mock Cloud Tasks
vi.mock('../cloud-tasks-client', () => ({
  CloudTasksQueue: class MockCloudTasksQueue {
    add = vi.fn().mockResolvedValue('task-id');
  },
}));

// Mock parsers
vi.mock('../../chat-import/whatsapp-parser', () => ({
  parseWhatsAppText: vi.fn().mockReturnValue({
    platform: 'whatsapp',
    participants: [
      { identifier: '+15551234567', identifierType: 'phone', displayName: 'Alice', messageCount: 5, firstMessageDate: new Date('2024-01-01'), lastMessageDate: new Date('2024-06-01') },
    ],
    messages: [
      { sender: '+15551234567', content: 'Hello', timestamp: new Date('2024-01-01'), isSystemMessage: false },
    ],
    errors: [],
  }),
}));

vi.mock('../../chat-import/instagram-parser', () => ({
  parseInstagramJson: vi.fn().mockReturnValue({
    platform: 'instagram',
    participants: [],
    messages: [],
    errors: [],
  }),
}));

vi.mock('../../chat-import/imessage-parser', () => ({
  parseIMessageCsv: vi.fn().mockReturnValue({
    platform: 'imessage',
    participants: [],
    messages: [],
    errors: [],
  }),
}));

vi.mock('../../chat-import/facebook-parser', () => ({
  parseFacebookJson: vi.fn().mockReturnValue({
    platform: 'facebook',
    participants: [],
    messages: [],
    errors: [],
  }),
}));

vi.mock('../../chat-import/twitter-parser', () => ({
  parseTwitterJson: vi.fn().mockReturnValue({
    platform: 'twitter',
    participants: [],
    messages: [],
    errors: [],
  }),
}));

vi.mock('../../chat-import/google-messages-parser', () => ({
  parseGoogleMessagesXml: vi.fn().mockReturnValue({
    platform: 'google_messages',
    participants: [],
    messages: [],
    errors: [],
  }),
}));

// Mock interaction summary generator
vi.mock('../../chat-import/interaction-summary-generator', () => ({
  generateInteractionSummaries: vi.fn().mockReturnValue([
    {
      importRecordId: 'import-1',
      participantIdentifier: '+15551234567',
      participantDisplayName: 'Alice',
      identifierType: 'phone',
      platform: 'whatsapp',
      messageCount: 5,
      firstMessageDate: new Date('2024-01-01'),
      lastMessageDate: new Date('2024-06-01'),
      avgMessagesPerMonth: 1.0,
      topics: [],
      sentiment: null,
    },
  ]),
  storeInteractionSummaries: vi.fn().mockResolvedValue([
    {
      id: 'summary-1',
      importRecordId: 'import-1',
      participantIdentifier: '+15551234567',
      participantDisplayName: 'Alice',
      identifierType: 'phone',
      platform: 'whatsapp',
      messageCount: 5,
      firstMessageDate: new Date('2024-01-01'),
      lastMessageDate: new Date('2024-06-01'),
      avgMessagesPerMonth: 1.0,
      topics: [],
      sentiment: null,
      createdAt: new Date(),
    },
  ]),
}));

// Mock matching engine
vi.mock('../../chat-import/matching', () => ({
  createMatchingEngine: vi.fn().mockReturnValue({
    matchParticipants: vi.fn().mockResolvedValue([
      {
        participant: { identifier: '+15551234567', identifierType: 'phone', displayName: 'Alice', messageCount: 5, firstMessageDate: new Date('2024-01-01'), lastMessageDate: new Date('2024-06-01') },
        contactId: 'contact-1',
        contactName: 'Alice Smith',
        confidence: 0.95,
        tier: 'auto',
        matchReason: 'Phone exact match (E.164)',
      },
    ]),
  }),
}));

// Mock match persistence
vi.mock('../../chat-import/match-persistence', () => ({
  persistMatchResults: vi.fn().mockResolvedValue({ autoCount: 1, likelyCount: 0, unmatchedCount: 0 }),
  flagSmartSuggestions: vi.fn().mockResolvedValue(0),
  updateImportRecordStats: vi.fn().mockResolvedValue(undefined),
}));

// ─── selectParser ────────────────────────────────────────────────────────────

describe('selectParser', () => {
  it('should return whatsapp parser for whatsapp platform', () => {
    const parser = selectParser('whatsapp');
    expect(parser).toBeDefined();
    expect(typeof parser).toBe('function');
  });

  it('should return instagram parser for instagram platform', () => {
    const parser = selectParser('instagram');
    expect(parser).toBeDefined();
  });

  it('should return imessage parser for imessage platform', () => {
    const parser = selectParser('imessage');
    expect(parser).toBeDefined();
  });

  it('should return facebook parser for facebook platform', () => {
    const parser = selectParser('facebook');
    expect(parser).toBeDefined();
  });

  it('should return twitter parser for twitter platform', () => {
    const parser = selectParser('twitter');
    expect(parser).toBeDefined();
  });

  it('should return google_messages parser for google_messages platform', () => {
    const parser = selectParser('google_messages');
    expect(parser).toBeDefined();
  });

  it('should throw for unsupported platform', () => {
    expect(() => selectParser('tiktok' as any)).toThrow('Unsupported platform: tiktok');
  });
});

// ─── fetchRawContent ─────────────────────────────────────────────────────────

describe('fetchRawContent', () => {
  it('should return file content as string from Buffer', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({
        rows: [{ raw_content: Buffer.from('Hello World', 'utf-8') }],
      }),
    };

    const content = await fetchRawContent(mockPool, 'import-1');
    expect(content).toBe('Hello World');
  });

  it('should throw when import record not found', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await expect(fetchRawContent(mockPool, 'nonexistent')).rejects.toThrow(
      'Import record not found: nonexistent',
    );
  });

  it('should throw when raw_content is null', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({
        rows: [{ raw_content: null }],
      }),
    };

    await expect(fetchRawContent(mockPool, 'import-1')).rejects.toThrow(
      'No raw content found for import record: import-1',
    );
  });

  it('should handle string raw_content (non-Buffer)', async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({
        rows: [{ raw_content: 'plain text content' }],
      }),
    };

    const content = await fetchRawContent(mockPool, 'import-1');
    expect(content).toBe('plain text content');
  });
});

// ─── processImportParse ──────────────────────────────────────────────────────

describe('processImportParse', () => {
  const jobData: ImportParseJobData = {
    importRecordId: 'import-1',
    userId: 'user-1',
    platform: 'whatsapp',
    fileHash: 'abc123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock pool for processImportParse
    mockQuery.mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('SELECT raw_content')) {
        return Promise.resolve({
          rows: [{ raw_content: Buffer.from('[1/1/24, 10:00:00 AM] Alice: Hello', 'utf-8') }],
        });
      }
      // Default: return empty result for UPDATE/INSERT queries
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    mockConnect.mockResolvedValue({
      query: mockClientQuery.mockResolvedValue({ rows: [] }),
      release: mockClientRelease,
    });
  });

  it('should process a valid import and return stats', async () => {
    const job = { id: 'job-1', data: jobData, name: 'import-parse' };
    const result = await processImportParse(job);

    expect(result).toEqual({
      totalParticipants: 1,
      autoMatched: 1,
      likelyMatched: 0,
      unmatched: 0,
    });
  });

  it('should update import_record status to parsed', async () => {
    const job = { id: 'job-1', data: jobData, name: 'import-parse' };
    await processImportParse(job);

    // Check that status was updated to 'parsed' and raw_content cleared
    const parsedCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes("status = 'parsed'"),
    );
    expect(parsedCall).toBeDefined();
    expect(parsedCall![1]).toContain('import-1');
  });

  it('should clear raw_content after parsing (Req 12.6)', async () => {
    const job = { id: 'job-1', data: jobData, name: 'import-parse' };
    await processImportParse(job);

    const clearCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('raw_content = NULL'),
    );
    expect(clearCall).toBeDefined();
  });

  it('should create import_complete notification', async () => {
    const job = { id: 'job-1', data: jobData, name: 'import-parse' };
    await processImportParse(job);

    const notifCall = mockQuery.mock.calls.find(
      (call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('in_app_notifications'),
    );
    expect(notifCall).toBeDefined();
    expect(notifCall![1]).toContain('user-1');
    expect(notifCall![1]).toContain('import_complete');
  });

  it('should mark import as failed on error', async () => {
    // Make raw_content fetch fail
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('SELECT raw_content')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });

    const job = { id: 'job-1', data: jobData, name: 'import-parse' };

    await expect(processImportParse(job)).rejects.toThrow('Import record not found');

    const failCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes("status = 'failed'"),
    );
    expect(failCall).toBeDefined();
  });
});
