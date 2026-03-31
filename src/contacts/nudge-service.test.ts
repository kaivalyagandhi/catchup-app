/**
 * Nudge Service Tests
 *
 * Tests for nudge visibility logic and dismissal cooldown.
 * Requirements: 2.4, 2.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pool before importing the service
const mockQuery = vi.fn();
vi.mock('../db/connection', () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

import { getVisibleNudges, dismissNudge, isNudgeDismissed } from './nudge-service';

describe('Nudge Service', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('getVisibleNudges', () => {
    it('should return get_deeper_insights when user has no imports and no dismissal', async () => {
      // No dismissals
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // No imports
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
      // Uncategorized contacts (for organize_circles check)
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '5' }] });
      // Circled contacts (for set_frequency check)
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
      // With frequency (for set_frequency check)
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
      // Completed imports (for import_more check)
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

      const nudges = await getVisibleNudges('user1');
      expect(nudges.some((n) => n.type === 'get_deeper_insights')).toBe(true);
    });

    it('should return organize_circles when uncategorized > 10', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No dismissals
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] }); // Has imports (skip get_deeper_insights)
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '15' }] }); // 15 uncategorized
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // No circled
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // No freq
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // No completed imports

      const nudges = await getVisibleNudges('user1');
      expect(nudges.some((n) => n.type === 'organize_circles')).toBe(true);
    });

    it('should not return organize_circles when uncategorized <= 10', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '5' }] }); // Only 5 uncategorized
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

      const nudges = await getVisibleNudges('user1');
      expect(nudges.some((n) => n.type === 'organize_circles')).toBe(false);
    });

    it('should not return dismissed nudges within cooldown', async () => {
      // Dismissal active for get_deeper_insights
      mockQuery.mockResolvedValueOnce({ rows: [{ nudge_type: 'get_deeper_insights' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '5' }] }); // uncategorized
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // circled
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // freq
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // completed imports

      const nudges = await getVisibleNudges('user1');
      expect(nudges.some((n) => n.type === 'get_deeper_insights')).toBe(false);
    });

    it('should return import_more after first completed import', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No dismissals
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] }); // Has imports
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '5' }] }); // uncategorized
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // circled
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] }); // freq
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] }); // 1 completed import platform

      const nudges = await getVisibleNudges('user1');
      expect(nudges.some((n) => n.type === 'import_more')).toBe(true);
    });
  });

  describe('dismissNudge', () => {
    it('should store dismissal with 7-day cooldown', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'd1',
          user_id: 'user1',
          nudge_type: 'get_deeper_insights',
          dismissed_at: now,
          show_again_after: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        }],
      });

      const result = await dismissNudge('user1', 'get_deeper_insights');
      expect(result.nudgeType).toBe('get_deeper_insights');
      expect(result.showAgainAfter.getTime()).toBeGreaterThan(now.getTime());

      // Verify the query was called with correct params
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nudge_dismissals'),
        expect.arrayContaining(['user1', 'get_deeper_insights']),
      );
    });
  });

  describe('isNudgeDismissed', () => {
    it('should return true when dismissal is active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await isNudgeDismissed('user1', 'organize_circles');
      expect(result).toBe(true);
    });

    it('should return false when no active dismissal', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await isNudgeDismissed('user1', 'organize_circles');
      expect(result).toBe(false);
    });
  });
});
