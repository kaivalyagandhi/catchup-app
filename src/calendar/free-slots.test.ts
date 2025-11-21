/**
 * Free Time Slot Detection Tests
 *
 * Unit tests for free time slot identification logic
 */

import { describe, it, expect } from 'vitest';
import { TimeSlot, DateRange } from '../types';

/**
 * Helper function to identify free slots between busy slots
 * (Extracted from calendar-service.ts for testing)
 */
function identifyFreeSlots(
  busySlots: TimeSlot[],
  dateRange: DateRange,
  timezone: string,
  minSlotDuration: number = 30
): TimeSlot[] {
  const freeSlots: TimeSlot[] = [];

  // Sort busy slots by start time
  const sortedBusySlots = [...busySlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  let currentTime = dateRange.start;

  for (const busySlot of sortedBusySlots) {
    // Skip events that start after the date range ends
    if (busySlot.start >= dateRange.end) {
      continue;
    }

    // If there's a gap between current time and the next busy slot
    if (currentTime < busySlot.start) {
      // Cap the gap end at the date range end
      const gapEnd = busySlot.start < dateRange.end ? busySlot.start : dateRange.end;
      const gapDuration = (gapEnd.getTime() - currentTime.getTime()) / (1000 * 60);

      // Only add if the gap is at least the minimum duration
      if (gapDuration >= minSlotDuration) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(gapEnd),
          timezone,
        });
      }
    }

    // Move current time to the end of this busy slot
    // Handle overlapping events by taking the maximum end time
    if (busySlot.end > currentTime) {
      currentTime = busySlot.end;
    }
  }

  // Check if there's free time after the last event
  if (currentTime < dateRange.end) {
    const gapDuration = (dateRange.end.getTime() - currentTime.getTime()) / (1000 * 60);

    if (gapDuration >= minSlotDuration) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(dateRange.end),
        timezone,
      });
    }
  }

  return freeSlots;
}

describe('Free Time Slot Detection - Core Logic', () => {
  const timezone = 'UTC';

  describe('identifyFreeSlots', () => {
    it('should return entire date range when there are no busy slots', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(1);
      expect(freeSlots[0].start).toEqual(dateRange.start);
      expect(freeSlots[0].end).toEqual(dateRange.end);
      expect(freeSlots[0].timezone).toBe(timezone);
    });

    it('should identify free slots between events', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T14:00:00Z'),
          end: new Date('2024-01-01T15:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(3);
      
      // Free slot before first event
      expect(freeSlots[0].start).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(freeSlots[0].end).toEqual(new Date('2024-01-01T10:00:00Z'));
      
      // Free slot between events
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T11:00:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T14:00:00Z'));
      
      // Free slot after last event
      expect(freeSlots[2].start).toEqual(new Date('2024-01-01T15:00:00Z'));
      expect(freeSlots[2].end).toEqual(new Date('2024-01-01T17:00:00Z'));
    });

    it('should respect minimum slot duration', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T10:45:00Z'), // 15-minute gap after this
          timezone,
        },
        {
          start: new Date('2024-01-01T11:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
          timezone,
        },
      ];

      // With 30-minute minimum, the 15-minute gap should be excluded
      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone, 30);

      expect(freeSlots).toHaveLength(2);
      
      // Should have free slot before first event (60 minutes)
      expect(freeSlots[0].start).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(freeSlots[0].end).toEqual(new Date('2024-01-01T10:00:00Z'));
      
      // Should NOT have the 15-minute gap
      // Should have free slot after last event (5 hours)
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T17:00:00Z'));
    });

    it('should handle overlapping events correctly', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T11:00:00Z'), // Overlaps with previous
          end: new Date('2024-01-01T13:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(2);
      
      // Free slot before first event
      expect(freeSlots[0].start).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(freeSlots[0].end).toEqual(new Date('2024-01-01T10:00:00Z'));
      
      // Free slot after merged overlapping events
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T13:00:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T17:00:00Z'));
    });

    it('should handle events that span entire date range', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T09:00:00Z'),
          end: new Date('2024-01-01T17:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(0);
    });

    it('should handle events outside date range', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T08:00:00Z'), // Before range
          end: new Date('2024-01-01T08:30:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T18:00:00Z'), // After range
          end: new Date('2024-01-01T19:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      // Events outside the date range should be ignored
      // Should return entire date range as free (capped at dateRange.end)
      expect(freeSlots).toHaveLength(1);
      expect(freeSlots[0].start).toEqual(dateRange.start);
      expect(freeSlots[0].end).toEqual(dateRange.end);
    });

    it('should handle unsorted busy slots', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      // Provide busy slots in reverse order
      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T14:00:00Z'),
          end: new Date('2024-01-01T15:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(3);
      
      // Should still identify correct free slots
      expect(freeSlots[0].start).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(freeSlots[0].end).toEqual(new Date('2024-01-01T10:00:00Z'));
      
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T11:00:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T14:00:00Z'));
      
      expect(freeSlots[2].start).toEqual(new Date('2024-01-01T15:00:00Z'));
      expect(freeSlots[2].end).toEqual(new Date('2024-01-01T17:00:00Z'));
    });

    it('should handle back-to-back events with no gaps', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T11:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T11:00:00Z'), // Starts exactly when previous ends
          end: new Date('2024-01-01T12:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      expect(freeSlots).toHaveLength(2);
      
      // Free slot before events
      expect(freeSlots[0].start).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(freeSlots[0].end).toEqual(new Date('2024-01-01T10:00:00Z'));
      
      // Free slot after events
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T17:00:00Z'));
    });

    it('should handle custom minimum slot duration', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T17:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T10:50:00Z'), // 10-minute gap after this
          timezone,
        },
        {
          start: new Date('2024-01-01T11:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
          timezone,
        },
      ];

      // With 5-minute minimum, the 10-minute gap should be included
      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone, 5);

      expect(freeSlots).toHaveLength(3);
      
      // Should include the 10-minute gap
      expect(freeSlots[1].start).toEqual(new Date('2024-01-01T10:50:00Z'));
      expect(freeSlots[1].end).toEqual(new Date('2024-01-01T11:00:00Z'));
    });
  });

  describe('Requirements validation - Free Slot Detection Logic', () => {
    it('should identify gaps between existing events (Requirement 7.5)', () => {
      const dateRange: DateRange = {
        start: new Date('2024-01-01T08:00:00Z'),
        end: new Date('2024-01-01T18:00:00Z'),
      };

      const busySlots: TimeSlot[] = [
        {
          start: new Date('2024-01-01T09:00:00Z'),
          end: new Date('2024-01-01T10:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T11:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
          timezone,
        },
        {
          start: new Date('2024-01-01T15:00:00Z'),
          end: new Date('2024-01-01T16:00:00Z'),
          timezone,
        },
      ];

      const freeSlots = identifyFreeSlots(busySlots, dateRange, timezone);

      // Should identify all gaps
      expect(freeSlots.length).toBeGreaterThan(0);
      
      // Verify gaps are correctly identified
      const gapDurations = freeSlots.map(slot => 
        (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
      );
      
      // Should have gaps of: 60min (before first), 60min (between 1st and 2nd), 
      // 180min (between 2nd and 3rd), 120min (after last)
      expect(gapDurations).toContain(60);
      expect(gapDurations).toContain(180);
      expect(gapDurations).toContain(120);
    });
  });
});
