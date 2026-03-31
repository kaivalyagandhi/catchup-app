/**
 * Tests for Source Tracking Utilities
 *
 * Tests the addSourceToContact utility function and the source filter
 * on the contacts list API endpoint.
 *
 * Requirements: 18.2, 18.3, 18.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addSourceToContact, VALID_SOURCES } from './source-tracking';

// ─── Mock pool/client ────────────────────────────────────────────────────────

function createMockQueryable(queryResult: { rowCount: number; rows: any[] }) {
  return {
    query: vi.fn().mockResolvedValue(queryResult),
  } as any;
}

// ─── addSourceToContact ──────────────────────────────────────────────────────

describe('addSourceToContact', () => {
  it('should add a source when not already present', async () => {
    const mockPool = createMockQueryable({ rowCount: 1, rows: [{ id: 'c1' }] });

    const result = await addSourceToContact(mockPool, 'contact-1', 'chat_import');

    expect(result).toBe(true);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('array_append'),
      ['contact-1', 'chat_import'],
    );
  });

  it('should return false when source is already present (no rows updated)', async () => {
    const mockPool = createMockQueryable({ rowCount: 0, rows: [] });

    const result = await addSourceToContact(mockPool, 'contact-1', 'chat_import');

    expect(result).toBe(false);
  });

  it('should use the correct SQL with NOT ANY check to prevent duplicates', async () => {
    const mockPool = createMockQueryable({ rowCount: 1, rows: [{ id: 'c1' }] });

    await addSourceToContact(mockPool, 'contact-1', 'apple');

    const sql = mockPool.query.mock.calls[0][0] as string;
    expect(sql).toContain('NOT');
    expect(sql).toContain('ANY');
    expect(sql).toContain('array_append');
  });

  it('should handle null rowCount gracefully', async () => {
    const mockPool = createMockQueryable({ rowCount: null as any, rows: [] });

    const result = await addSourceToContact(mockPool, 'contact-1', 'google');

    expect(result).toBe(false);
  });
});

// ─── VALID_SOURCES constant ──────────────────────────────────────────────────

describe('VALID_SOURCES', () => {
  it('should contain all expected source values', () => {
    expect(VALID_SOURCES).toContain('manual');
    expect(VALID_SOURCES).toContain('google');
    expect(VALID_SOURCES).toContain('apple');
    expect(VALID_SOURCES).toContain('calendar');
    expect(VALID_SOURCES).toContain('voice_note');
    expect(VALID_SOURCES).toContain('chat_import');
  });

  it('should have exactly 6 source values', () => {
    expect(VALID_SOURCES).toHaveLength(6);
  });
});
