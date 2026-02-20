/**
 * LRU Cache Implementation
 *
 * Provides size-limited, memory-efficient caching using LRU eviction policy.
 * Acts as a first-layer cache before Redis to reduce network calls and improve performance.
 *
 * Requirements: Memory Optimization Phase 3, Tasks 3.1-3.3
 */

import { LRUCache } from 'lru-cache';

/**
 * Calculate approximate size of an object in bytes
 */
function calculateSize(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }

  // For strings, use length as approximation
  if (typeof value === 'string') {
    return value.length * 2; // UTF-16 characters are 2 bytes
  }

  // For objects and arrays, use JSON string length as approximation
  try {
    return JSON.stringify(value).length * 2;
  } catch (error) {
    // If JSON.stringify fails (circular references, etc.), use a default size
    return 1024; // 1KB default
  }
}

/**
 * Contact Cache Configuration
 *
 * Stores contact data with size-limited LRU eviction.
 * - Max 1000 entries
 * - Max 50MB total size
 * - 1 hour TTL
 */
export const contactCache = new LRUCache<string, any>({
  max: 1000, // Maximum 1000 contacts
  maxSize: 50 * 1024 * 1024, // Maximum 50MB
  sizeCalculation: (contact) => calculateSize(contact),
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true, // LRU behavior - update age when accessed
  updateAgeOnHas: false, // Don't update age on existence check
  allowStale: false, // Don't return stale entries
});

/**
 * Calendar Event Cache Configuration
 *
 * Stores calendar events with size-limited LRU eviction.
 * - Max 5000 entries
 * - Max 100MB total size
 * - 24 hour TTL
 */
export const calendarEventCache = new LRUCache<string, any>({
  max: 5000, // Maximum 5000 event arrays
  maxSize: 100 * 1024 * 1024, // Maximum 100MB
  sizeCalculation: (events) => calculateSize(events),
  ttl: 1000 * 60 * 60 * 24, // 24 hour TTL
  updateAgeOnGet: true,
  updateAgeOnHas: false,
  allowStale: false,
});

/**
 * Suggestion Cache Configuration
 *
 * Stores suggestion lists with size-limited LRU eviction.
 * - Max 500 entries
 * - Max 25MB total size
 * - 30 minute TTL
 */
export const suggestionCache = new LRUCache<string, any>({
  max: 500, // Maximum 500 suggestion lists
  maxSize: 25 * 1024 * 1024, // Maximum 25MB
  sizeCalculation: (suggestions) => calculateSize(suggestions),
  ttl: 1000 * 60 * 30, // 30 minute TTL
  updateAgeOnGet: true,
  updateAgeOnHas: false,
  allowStale: false,
});

/**
 * User Preferences Cache Configuration
 *
 * Stores user preferences with size-limited LRU eviction.
 * - Max 1000 entries
 * - Max 10MB total size
 * - 10 minute TTL
 */
export const userPreferencesCache = new LRUCache<string, any>({
  max: 1000, // Maximum 1000 user preference objects
  maxSize: 10 * 1024 * 1024, // Maximum 10MB
  sizeCalculation: (prefs) => calculateSize(prefs),
  ttl: 1000 * 60 * 10, // 10 minute TTL
  updateAgeOnGet: true,
  updateAgeOnHas: false,
  allowStale: false,
});

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    contacts: {
      size: contactCache.size,
      calculatedSize: contactCache.calculatedSize,
      maxSize: contactCache.max,
      maxBytes: 50 * 1024 * 1024,
      utilizationPercent: ((contactCache.calculatedSize || 0) / (50 * 1024 * 1024)) * 100,
    },
    calendarEvents: {
      size: calendarEventCache.size,
      calculatedSize: calendarEventCache.calculatedSize,
      maxSize: calendarEventCache.max,
      maxBytes: 100 * 1024 * 1024,
      utilizationPercent:
        ((calendarEventCache.calculatedSize || 0) / (100 * 1024 * 1024)) * 100,
    },
    suggestions: {
      size: suggestionCache.size,
      calculatedSize: suggestionCache.calculatedSize,
      maxSize: suggestionCache.max,
      maxBytes: 25 * 1024 * 1024,
      utilizationPercent: ((suggestionCache.calculatedSize || 0) / (25 * 1024 * 1024)) * 100,
    },
    userPreferences: {
      size: userPreferencesCache.size,
      calculatedSize: userPreferencesCache.calculatedSize,
      maxSize: userPreferencesCache.max,
      maxBytes: 10 * 1024 * 1024,
      utilizationPercent:
        ((userPreferencesCache.calculatedSize || 0) / (10 * 1024 * 1024)) * 100,
    },
  };
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  contactCache.clear();
  calendarEventCache.clear();
  suggestionCache.clear();
  userPreferencesCache.clear();
}

/**
 * Log cache statistics
 */
export function logCacheStats(): void {
  const stats = getCacheStats();
  console.log('[LRU Cache Stats]', {
    contacts: `${stats.contacts.size}/${stats.contacts.maxSize} entries, ${(stats.contacts.calculatedSize! / 1024 / 1024).toFixed(2)}MB/${(stats.contacts.maxBytes / 1024 / 1024).toFixed(0)}MB (${stats.contacts.utilizationPercent.toFixed(1)}%)`,
    calendarEvents: `${stats.calendarEvents.size}/${stats.calendarEvents.maxSize} entries, ${(stats.calendarEvents.calculatedSize! / 1024 / 1024).toFixed(2)}MB/${(stats.calendarEvents.maxBytes / 1024 / 1024).toFixed(0)}MB (${stats.calendarEvents.utilizationPercent.toFixed(1)}%)`,
    suggestions: `${stats.suggestions.size}/${stats.suggestions.maxSize} entries, ${(stats.suggestions.calculatedSize! / 1024 / 1024).toFixed(2)}MB/${(stats.suggestions.maxBytes / 1024 / 1024).toFixed(0)}MB (${stats.suggestions.utilizationPercent.toFixed(1)}%)`,
    userPreferences: `${stats.userPreferences.size}/${stats.userPreferences.maxSize} entries, ${(stats.userPreferences.calculatedSize! / 1024 / 1024).toFixed(2)}MB/${(stats.userPreferences.maxBytes / 1024 / 1024).toFixed(0)}MB (${stats.userPreferences.utilizationPercent.toFixed(1)}%)`,
  });
}
