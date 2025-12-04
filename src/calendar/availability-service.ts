/**
 * Availability Service
 *
 * Handles availability parameter configuration and time slot filtering
 * based on user preferences including manual time blocks, commute times,
 * and nighttime patterns.
 *
 * Requirements: 7.6, 7.7, 20.1, 20.2, 20.3, 20.4
 */

import { AvailabilityParams, TimeSlot, TimeBlock, CommuteWindow } from '../types';
import * as availabilityRepository from './availability-repository';
import * as calendarEventsRepository from './calendar-events-repository';

/**
 * Get availability parameters for a user
 *
 * Requirements: 20.1, 20.2, 20.3
 */
export async function getAvailabilityParams(userId: string): Promise<AvailabilityParams | null> {
  return availabilityRepository.getAvailabilityParams(userId);
}

/**
 * Set availability parameters for a user
 *
 * Requirements: 7.6, 20.1, 20.2, 20.3
 */
export async function setAvailabilityParams(
  userId: string,
  params: AvailabilityParams
): Promise<AvailabilityParams> {
  // Validate time formats
  if (params.nighttimeStart && !isValidTimeFormat(params.nighttimeStart)) {
    throw new Error('Invalid nighttime start time format. Expected HH:mm');
  }
  if (params.nighttimeEnd && !isValidTimeFormat(params.nighttimeEnd)) {
    throw new Error('Invalid nighttime end time format. Expected HH:mm');
  }

  // Validate time blocks
  if (params.manualTimeBlocks) {
    for (const block of params.manualTimeBlocks) {
      validateTimeBlock(block);
    }
  }

  // Validate commute windows
  if (params.commuteWindows) {
    for (const window of params.commuteWindows) {
      validateCommuteWindow(window);
    }
  }

  return availabilityRepository.upsertAvailabilityParams(userId, params);
}

/**
 * Apply availability parameters to filter time slots
 *
 * This function takes a list of free time slots and filters them based on
 * user-configured availability parameters including:
 * - Manual time blocks (user-specified available times)
 * - Commute windows (times blocked for commuting)
 * - Nighttime patterns (times blocked for sleep)
 *
 * Requirements: 7.7, 20.4
 */
export function applyAvailabilityParameters(
  slots: TimeSlot[],
  params: AvailabilityParams
): TimeSlot[] {
  let filteredSlots = [...slots];

  // Apply manual time blocks filter (only keep slots that overlap with manual blocks)
  if (params.manualTimeBlocks && params.manualTimeBlocks.length > 0) {
    filteredSlots = filterByManualTimeBlocks(filteredSlots, params.manualTimeBlocks);
  }

  // Apply commute windows filter (remove slots that overlap with commute times)
  if (params.commuteWindows && params.commuteWindows.length > 0) {
    filteredSlots = filterByCommuteWindows(filteredSlots, params.commuteWindows);
  }

  // Apply nighttime filter (remove slots that overlap with nighttime)
  if (params.nighttimeStart && params.nighttimeEnd) {
    filteredSlots = filterByNighttime(filteredSlots, params.nighttimeStart, params.nighttimeEnd);
  }

  return filteredSlots;
}

/**
 * Filter out time slots that overlap with calendar events (busy times)
 *
 * This ensures suggestions are only made during truly free time.
 */
export function filterByCalendarEvents(slots: TimeSlot[], busySlots: TimeSlot[]): TimeSlot[] {
  const result: TimeSlot[] = [];

  for (const slot of slots) {
    let hasConflict = false;

    // Check if this slot overlaps with any busy time
    for (const busySlot of busySlots) {
      if (slotsOverlap(slot, busySlot)) {
        hasConflict = true;
        break;
      }
    }

    // Only include slots that don't conflict with busy times
    if (!hasConflict) {
      result.push(slot);
    }
  }

  return result;
}

/**
 * Check if two time slots overlap
 */
function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start;
}

/**
 * Get truly available time slots by filtering out calendar busy times
 *
 * This is the main function to use when generating suggestions to ensure
 * they don't overlap with existing calendar events.
 */
export async function getAvailableSlots(
  userId: string,
  dateRange: { start: Date; end: Date },
  params?: AvailabilityParams
): Promise<TimeSlot[]> {
  // Get cached calendar events
  const calendarEvents = await calendarEventsRepository.getCachedEvents(
    userId,
    dateRange.start,
    dateRange.end
  );

  // Convert busy events to time slots
  const busySlots: TimeSlot[] = calendarEvents
    .filter((event) => event.isBusy && !event.isAllDay)
    .map((event) => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      timezone: event.timezone,
    }));

  // Generate potential time slots (e.g., business hours)
  const potentialSlots = generatePotentialSlots(dateRange);

  // Filter out busy times
  let availableSlots = filterByCalendarEvents(potentialSlots, busySlots);

  // Apply user availability parameters if provided
  if (params) {
    availableSlots = applyAvailabilityParameters(availableSlots, params);
  }

  return availableSlots;
}

/**
 * Generate potential time slots during reasonable hours
 * (9 AM - 9 PM by default)
 */
function generatePotentialSlots(dateRange: { start: Date; end: Date }): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotDuration = 60; // 1 hour slots
  const startHour = 9; // 9 AM
  const endHour = 21; // 9 PM

  const currentDate = new Date(dateRange.start);
  currentDate.setHours(startHour, 0, 0, 0);

  while (currentDate < dateRange.end) {
    const slotStart = new Date(currentDate);
    const slotEnd = new Date(currentDate);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    // Only add slots within the date range and reasonable hours
    if (
      slotStart >= dateRange.start &&
      slotEnd <= dateRange.end &&
      slotStart.getHours() >= startHour &&
      slotStart.getHours() < endHour
    ) {
      slots.push({
        start: slotStart,
        end: slotEnd,
        timezone: 'UTC', // TODO: Use user's timezone
      });
    }

    // Move to next slot
    currentDate.setMinutes(currentDate.getMinutes() + slotDuration);

    // If we've passed the end hour, jump to next day
    if (currentDate.getHours() >= endHour) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, 0, 0, 0);
    }
  }

  return slots;
}

/**
 * Filter slots to only include those that overlap with manual time blocks
 */
function filterByManualTimeBlocks(slots: TimeSlot[], timeBlocks: TimeBlock[]): TimeSlot[] {
  const result: TimeSlot[] = [];

  for (const slot of slots) {
    const slotDayOfWeek = slot.start.getDay();
    const slotStartTime = getTimeString(slot.start);
    const slotEndTime = getTimeString(slot.end);

    // Check if slot overlaps with any manual time block
    for (const block of timeBlocks) {
      if (block.dayOfWeek === slotDayOfWeek) {
        // Check if there's any overlap
        const overlap = getTimeOverlap(slotStartTime, slotEndTime, block.startTime, block.endTime);

        if (overlap) {
          // Create a new slot for the overlapping portion
          const overlapStart = new Date(slot.start);
          const overlapEnd = new Date(slot.end);

          // Adjust start time if needed
          if (overlap.start !== slotStartTime) {
            const [hours, minutes] = overlap.start.split(':').map(Number);
            overlapStart.setHours(hours, minutes, 0, 0);
          }

          // Adjust end time if needed
          if (overlap.end !== slotEndTime) {
            const [hours, minutes] = overlap.end.split(':').map(Number);
            overlapEnd.setHours(hours, minutes, 0, 0);
          }

          result.push({
            start: overlapStart,
            end: overlapEnd,
            timezone: slot.timezone,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Filter out slots that overlap with commute windows
 */
function filterByCommuteWindows(slots: TimeSlot[], commuteWindows: CommuteWindow[]): TimeSlot[] {
  const result: TimeSlot[] = [];

  for (const slot of slots) {
    const slotDayOfWeek = slot.start.getDay();
    const slotStartTime = getTimeString(slot.start);
    const slotEndTime = getTimeString(slot.end);

    let hasCommuteConflict = false;

    // Check if slot overlaps with any commute window
    for (const window of commuteWindows) {
      if (window.dayOfWeek === slotDayOfWeek) {
        const overlap = getTimeOverlap(
          slotStartTime,
          slotEndTime,
          window.startTime,
          window.endTime
        );

        if (overlap) {
          hasCommuteConflict = true;
          break;
        }
      }
    }

    // Only include slots that don't conflict with commute windows
    if (!hasCommuteConflict) {
      result.push(slot);
    }
  }

  return result;
}

/**
 * Filter out slots that overlap with nighttime hours
 */
function filterByNighttime(
  slots: TimeSlot[],
  nighttimeStart: string,
  nighttimeEnd: string
): TimeSlot[] {
  const result: TimeSlot[] = [];
  const nighttimeStartMinutes = timeToMinutes(nighttimeStart);
  const nighttimeEndMinutes = timeToMinutes(nighttimeEnd);
  const isOvernightNighttime = nighttimeEndMinutes < nighttimeStartMinutes;

  for (const slot of slots) {
    const slotStartTime = getTimeString(slot.start);
    const slotEndTime = getTimeString(slot.end);
    const slotStartMinutes = timeToMinutes(slotStartTime);
    const slotEndMinutes = timeToMinutes(slotEndTime);

    let hasOverlap = false;

    if (isOvernightNighttime) {
      // Nighttime spans midnight (e.g., 22:00 to 07:00)
      // Slot overlaps if:
      // 1. Slot starts before midnight and overlaps with nighttime start (slotEnd > nighttimeStart)
      // 2. Slot ends after midnight and overlaps with nighttime end (slotStart < nighttimeEnd)
      const overlapsStart = slotEndMinutes > nighttimeStartMinutes;
      const overlapsEnd = slotStartMinutes < nighttimeEndMinutes;
      hasOverlap = overlapsStart || overlapsEnd;
    } else {
      // Normal nighttime range (e.g., 01:00 to 05:00)
      const overlap = getTimeOverlap(slotStartTime, slotEndTime, nighttimeStart, nighttimeEnd);
      hasOverlap = overlap !== null;
    }

    // Only include slots that don't overlap with nighttime
    if (!hasOverlap) {
      result.push(slot);
    }
  }

  return result;
}

/**
 * Get time string in HH:mm format from a Date
 */
function getTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Calculate overlap between two time ranges
 * Returns the overlapping time range or null if no overlap
 */
function getTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): { start: string; end: string } | null {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  // Handle overnight ranges (e.g., 22:00 to 06:00)
  const isOvernight1 = end1Minutes < start1Minutes;
  const isOvernight2 = end2Minutes < start2Minutes;

  if (isOvernight1 || isOvernight2) {
    // For overnight ranges, we need special handling
    // This is a simplified version - a full implementation would need more complex logic
    return null;
  }

  // Calculate overlap
  const overlapStart = Math.max(start1Minutes, start2Minutes);
  const overlapEnd = Math.min(end1Minutes, end2Minutes);

  if (overlapStart >= overlapEnd) {
    return null;
  }

  return {
    start: minutesToTime(overlapStart),
    end: minutesToTime(overlapEnd),
  };
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate time block
 */
function validateTimeBlock(block: TimeBlock): void {
  if (block.dayOfWeek < 0 || block.dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }
  if (!isValidTimeFormat(block.startTime)) {
    throw new Error(`Invalid start time format: ${block.startTime}. Expected HH:mm`);
  }
  if (!isValidTimeFormat(block.endTime)) {
    throw new Error(`Invalid end time format: ${block.endTime}. Expected HH:mm`);
  }
}

/**
 * Validate commute window
 */
function validateCommuteWindow(window: CommuteWindow): void {
  if (window.dayOfWeek < 0 || window.dayOfWeek > 6) {
    throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }
  if (!isValidTimeFormat(window.startTime)) {
    throw new Error(`Invalid start time format: ${window.startTime}. Expected HH:mm`);
  }
  if (!isValidTimeFormat(window.endTime)) {
    throw new Error(`Invalid end time format: ${window.endTime}. Expected HH:mm`);
  }
}
