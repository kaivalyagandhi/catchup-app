/**
 * Scheduling Preferences Service
 *
 * Business logic for user scheduling preferences.
 * Requirements: 16.1-16.12
 */

import * as preferencesRepository from './preferences-repository';
import {
  SchedulingPreferences,
  ActivityType,
  TimeRange,
  CreatePlanData,
} from '../types/scheduling';

/**
 * Maximum number of favorite locations
 */
const MAX_FAVORITE_LOCATIONS = 10;

/**
 * Get user scheduling preferences
 */
export async function getPreferences(
  userId: string
): Promise<SchedulingPreferences | null> {
  return preferencesRepository.getPreferences(userId);
}

/**
 * Save user scheduling preferences
 */
export async function savePreferences(
  userId: string,
  data: {
    preferredDays?: number[];
    preferredTimeRanges?: TimeRange[];
    preferredDurations?: number[];
    favoriteLocations?: string[];
    defaultActivityType?: ActivityType;
    applyByDefault?: boolean;
  }
): Promise<SchedulingPreferences> {
  // Validate preferred days (0-6)
  if (data.preferredDays) {
    const invalidDays = data.preferredDays.filter((d) => d < 0 || d > 6);
    if (invalidDays.length > 0) {
      throw new Error('Invalid day values. Days must be 0-6 (Sunday-Saturday)');
    }
  }

  // Validate time ranges
  if (data.preferredTimeRanges) {
    for (const range of data.preferredTimeRanges) {
      if (!isValidTimeFormat(range.start) || !isValidTimeFormat(range.end)) {
        throw new Error('Invalid time format. Use HH:mm format');
      }
      if (range.start >= range.end) {
        throw new Error('Start time must be before end time');
      }
    }
  }

  // Validate durations (positive numbers)
  if (data.preferredDurations) {
    const invalidDurations = data.preferredDurations.filter((d) => d <= 0);
    if (invalidDurations.length > 0) {
      throw new Error('Durations must be positive numbers');
    }
  }

  // Validate favorite locations count
  if (data.favoriteLocations && data.favoriteLocations.length > MAX_FAVORITE_LOCATIONS) {
    throw new Error(`Maximum ${MAX_FAVORITE_LOCATIONS} favorite locations allowed`);
  }

  return preferencesRepository.savePreferences({
    userId,
    ...data,
  });
}

/**
 * Apply preferences to plan creation data
 */
export async function applyPreferencesToPlan(
  userId: string,
  planData: Partial<CreatePlanData>
): Promise<Partial<CreatePlanData>> {
  const preferences = await getPreferences(userId);
  if (!preferences) {
    return planData;
  }

  const appliedData = { ...planData };

  // Apply default activity type if not set
  if (!appliedData.activityType && preferences.defaultActivityType) {
    appliedData.activityType = preferences.defaultActivityType;
  }

  // Apply default duration if not set
  if (!appliedData.duration && preferences.preferredDurations.length > 0) {
    appliedData.duration = preferences.preferredDurations[0];
  }

  return appliedData;
}

/**
 * Add a favorite location
 */
export async function addFavoriteLocation(
  userId: string,
  location: string
): Promise<SchedulingPreferences> {
  const preferences = await getPreferences(userId);
  const currentCount = preferences?.favoriteLocations.length || 0;

  if (currentCount >= MAX_FAVORITE_LOCATIONS) {
    throw new Error(`Maximum ${MAX_FAVORITE_LOCATIONS} favorite locations allowed`);
  }

  // Check for duplicates
  if (preferences?.favoriteLocations.includes(location)) {
    throw new Error('Location already exists in favorites');
  }

  return preferencesRepository.addFavoriteLocation(userId, location);
}

/**
 * Remove a favorite location
 */
export async function removeFavoriteLocation(
  userId: string,
  location: string
): Promise<SchedulingPreferences | null> {
  return preferencesRepository.removeFavoriteLocation(userId, location);
}

/**
 * Check if preferences should be auto-applied
 */
export async function shouldApplyByDefault(userId: string): Promise<boolean> {
  const preferences = await getPreferences(userId);
  return preferences?.applyByDefault ?? false;
}

/**
 * Get suggested time slots based on preferences
 */
export async function getSuggestedTimeSlots(
  userId: string,
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<string[]> {
  const preferences = await getPreferences(userId);
  if (!preferences) {
    return [];
  }

  const suggestedSlots: string[] = [];
  const startDate = new Date(dateRangeStart);
  const endDate = new Date(dateRangeEnd);

  // Generate slots for each day in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Check if this day is preferred
    if (
      preferences.preferredDays.length === 0 ||
      preferences.preferredDays.includes(dayOfWeek)
    ) {
      // Generate slots for preferred time ranges
      for (const range of preferences.preferredTimeRanges) {
        const slots = generateSlotsForRange(d, range);
        suggestedSlots.push(...slots);
      }

      // If no time ranges specified, generate default slots (9am-5pm)
      if (preferences.preferredTimeRanges.length === 0) {
        const defaultRange: TimeRange = { start: '09:00', end: '17:00' };
        const slots = generateSlotsForRange(d, defaultRange);
        suggestedSlots.push(...slots);
      }
    }
  }

  return suggestedSlots;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
}

/**
 * Generate 30-minute slots for a time range on a specific date
 */
function generateSlotsForRange(date: Date, range: TimeRange): string[] {
  const slots: string[] = [];
  const dateStr = date.toISOString().split('T')[0];

  const [startHour, startMin] = range.start.split(':').map(Number);
  const [endHour, endMin] = range.end.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(`${dateStr}_${timeStr}`);

    // Advance by 30 minutes
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour++;
    }
  }

  return slots;
}
