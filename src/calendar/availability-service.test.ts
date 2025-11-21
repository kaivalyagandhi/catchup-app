/**
 * Availability Service Tests
 *
 * Tests for availability parameter configuration and time slot filtering
 */

import { describe, it, expect } from 'vitest';
import * as availabilityService from './availability-service';
import { AvailabilityParams, TimeSlot } from '../types';

describe('Availability Service', () => {
  describe('applyAvailabilityParameters', () => {
    describe('manual time blocks', () => {
      it('should filter slots to only include manual time blocks', () => {
        // Monday Jan 8, 2024, 8am-6pm local time
        const slotStart = new Date(2024, 0, 8, 8, 0, 0, 0);
        const slotEnd = new Date(2024, 0, 8, 18, 0, 0, 0);

        const slots: TimeSlot[] = [
          {
            start: slotStart,
            end: slotEnd,
            timezone: 'UTC',
          },
        ];

        const params: AvailabilityParams = {
          manualTimeBlocks: [
            { dayOfWeek: 1, startTime: '10:00', endTime: '16:00' }, // Monday 10am-4pm
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(1);
        expect(result[0].start.getHours()).toBe(10);
        expect(result[0].end.getHours()).toBe(16);
      });

      it('should exclude slots on days without manual time blocks', () => {
        const mondayStart = new Date(2024, 0, 8, 8, 0, 0, 0); // Monday
        const mondayEnd = new Date(2024, 0, 8, 18, 0, 0, 0);
        const tuesdayStart = new Date(2024, 0, 9, 8, 0, 0, 0); // Tuesday
        const tuesdayEnd = new Date(2024, 0, 9, 18, 0, 0, 0);

        const slots: TimeSlot[] = [
          { start: mondayStart, end: mondayEnd, timezone: 'UTC' },
          { start: tuesdayStart, end: tuesdayEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          manualTimeBlocks: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday only
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(1);
        expect(result[0].start.getDay()).toBe(1); // Monday
      });

      it('should handle multiple time blocks on same day', () => {
        const slotStart = new Date(2024, 0, 8, 8, 0, 0, 0); // Monday 8am
        const slotEnd = new Date(2024, 0, 8, 20, 0, 0, 0); // Monday 8pm

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          manualTimeBlocks: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, // Morning
            { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' }, // Afternoon
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(2);
        expect(result[0].start.getHours()).toBe(9);
        expect(result[0].end.getHours()).toBe(12);
        expect(result[1].start.getHours()).toBe(14);
        expect(result[1].end.getHours()).toBe(17);
      });
    });

    describe('commute windows', () => {
      it('should exclude slots that overlap with commute windows', () => {
        const slot1Start = new Date(2024, 0, 8, 8, 0, 0, 0); // Monday 8am
        const slot1End = new Date(2024, 0, 8, 9, 30, 0, 0); // Monday 9:30am
        const slot2Start = new Date(2024, 0, 8, 10, 0, 0, 0); // Monday 10am
        const slot2End = new Date(2024, 0, 8, 12, 0, 0, 0); // Monday 12pm

        const slots: TimeSlot[] = [
          { start: slot1Start, end: slot1End, timezone: 'UTC' },
          { start: slot2Start, end: slot2End, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          commuteWindows: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }, // Morning commute
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        // First slot overlaps with commute, should be excluded
        // Second slot doesn't overlap, should be included
        expect(result).toHaveLength(1);
        expect(result[0].start.getHours()).toBe(10);
      });

      it('should keep slots that do not overlap with commute windows', () => {
        const slotStart = new Date(2024, 0, 8, 10, 0, 0, 0); // Monday 10am
        const slotEnd = new Date(2024, 0, 8, 12, 0, 0, 0); // Monday 12pm

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          commuteWindows: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(1);
        expect(result[0].start.getHours()).toBe(10);
      });
    });

    describe('nighttime patterns', () => {
      it('should exclude slots that overlap with nighttime', () => {
        const slot1Start = new Date(2024, 0, 8, 21, 0, 0, 0); // Monday 9pm
        const slot1End = new Date(2024, 0, 8, 23, 0, 0, 0); // Monday 11pm
        const slot2Start = new Date(2024, 0, 8, 10, 0, 0, 0); // Monday 10am
        const slot2End = new Date(2024, 0, 8, 12, 0, 0, 0); // Monday 12pm

        const slots: TimeSlot[] = [
          { start: slot1Start, end: slot1End, timezone: 'UTC' },
          { start: slot2Start, end: slot2End, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          nighttimeStart: '22:00',
          nighttimeEnd: '07:00',
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        // First slot overlaps with nighttime start, should be excluded
        // Second slot is during daytime, should be included
        expect(result).toHaveLength(1);
        expect(result[0].start.getHours()).toBe(10);
      });

      it('should keep slots that do not overlap with nighttime', () => {
        const slotStart = new Date(2024, 0, 8, 10, 0, 0, 0); // Monday 10am
        const slotEnd = new Date(2024, 0, 8, 12, 0, 0, 0); // Monday 12pm

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          nighttimeStart: '22:00',
          nighttimeEnd: '07:00',
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(1);
      });
    });

    describe('combined filters', () => {
      it('should apply all filters in sequence', () => {
        const slotStart = new Date(2024, 0, 8, 8, 0, 0, 0); // Monday 8am
        const slotEnd = new Date(2024, 0, 8, 18, 0, 0, 0); // Monday 6pm

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          manualTimeBlocks: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          ],
          commuteWindows: [
            { dayOfWeek: 1, startTime: '07:00', endTime: '08:00' }, // Before manual block
          ],
          nighttimeStart: '22:00',
          nighttimeEnd: '07:00',
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        // Should be filtered to 9am-5pm by manual blocks
        // Commute window 7-8am is before the manual block, so doesn't affect result
        // Nighttime doesn't overlap
        expect(result).toHaveLength(1);
        expect(result[0].start.getHours()).toBe(9);
        expect(result[0].end.getHours()).toBe(17);
      });

      it('should return empty array when all slots are filtered out', () => {
        const slotStart = new Date(2024, 0, 8, 8, 0, 0, 0); // Monday 8am
        const slotEnd = new Date(2024, 0, 8, 9, 0, 0, 0); // Monday 9am

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];

        const params: AvailabilityParams = {
          commuteWindows: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
          ],
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty slots array', () => {
        const slots: TimeSlot[] = [];
        const params: AvailabilityParams = {
          nighttimeStart: '22:00',
          nighttimeEnd: '07:00',
        };

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        expect(result).toHaveLength(0);
      });

      it('should handle empty parameters', () => {
        const slotStart = new Date(2024, 0, 8, 10, 0, 0, 0);
        const slotEnd = new Date(2024, 0, 8, 12, 0, 0, 0);

        const slots: TimeSlot[] = [
          { start: slotStart, end: slotEnd, timezone: 'UTC' },
        ];
        const params: AvailabilityParams = {};

        const result = availabilityService.applyAvailabilityParameters(slots, params);

        // No filters applied, all slots should remain
        expect(result).toHaveLength(1);
      });
    });
  });
});
