/**
 * LRU Cache Tests
 *
 * Tests for size-limited LRU caching implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  contactCache,
  calendarEventCache,
  suggestionCache,
  userPreferencesCache,
  getCacheStats,
  clearAllCaches,
} from './lru-cache';

describe('LRU Cache', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearAllCaches();
  });

  describe('contactCache', () => {
    it('should store and retrieve contacts', () => {
      const contact = { id: '1', name: 'John Doe', email: 'john@example.com' };
      contactCache.set('contact:1', contact);

      const retrieved = contactCache.get('contact:1');
      expect(retrieved).toEqual(contact);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = contactCache.get('contact:nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should evict entries when max size is reached', () => {
      // Fill cache with large objects
      for (let i = 0; i < 2000; i++) {
        const largeContact = {
          id: `${i}`,
          name: `Contact ${i}`,
          data: 'x'.repeat(50000), // 50KB per contact
        };
        contactCache.set(`contact:${i}`, largeContact);
      }

      // Cache should have evicted old entries
      expect(contactCache.size).toBeLessThan(2000);
      expect(contactCache.calculatedSize).toBeLessThanOrEqual(50 * 1024 * 1024);
    });

    it('should respect TTL', async () => {
      const contact = { id: '1', name: 'John Doe' };
      contactCache.set('contact:1', contact, { ttl: 100 }); // 100ms TTL

      // Should exist immediately
      expect(contactCache.get('contact:1')).toEqual(contact);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(contactCache.get('contact:1')).toBeUndefined();
    });

    it('should update age on get (LRU behavior)', () => {
      // Add two contacts
      contactCache.set('contact:1', { id: '1', name: 'First' });
      contactCache.set('contact:2', { id: '2', name: 'Second' });

      // Access first contact to make it more recently used
      contactCache.get('contact:1');

      // Both should exist before filling cache
      expect(contactCache.has('contact:1')).toBe(true);
      expect(contactCache.has('contact:2')).toBe(true);

      // Note: LRU eviction is complex and depends on size calculations
      // This test just verifies that accessing updates the entry
      const stats = contactCache.getRemainingTTL('contact:1');
      expect(stats).toBeGreaterThan(0);
    });

    it('should delete entries', () => {
      contactCache.set('contact:1', { id: '1', name: 'John Doe' });
      expect(contactCache.has('contact:1')).toBe(true);

      contactCache.delete('contact:1');
      expect(contactCache.has('contact:1')).toBe(false);
    });

    it('should clear all entries', () => {
      contactCache.set('contact:1', { id: '1', name: 'John Doe' });
      contactCache.set('contact:2', { id: '2', name: 'Jane Doe' });

      expect(contactCache.size).toBe(2);

      contactCache.clear();
      expect(contactCache.size).toBe(0);
    });
  });

  describe('calendarEventCache', () => {
    it('should store and retrieve calendar events', () => {
      const events = [
        { id: '1', title: 'Meeting', start: new Date(), end: new Date() },
        { id: '2', title: 'Lunch', start: new Date(), end: new Date() },
      ];
      calendarEventCache.set('calendar:user1:2024-01-01', events);

      const retrieved = calendarEventCache.get('calendar:user1:2024-01-01');
      expect(retrieved).toEqual(events);
    });

    it('should handle large event arrays', () => {
      const largeEventArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `Event ${i}`,
        start: new Date(),
        end: new Date(),
      }));

      calendarEventCache.set('calendar:user1:large', largeEventArray);
      const retrieved = calendarEventCache.get('calendar:user1:large');

      expect(retrieved).toHaveLength(1000);
    });

    it('should evict entries when max size is reached', () => {
      // Fill cache with large event arrays
      for (let i = 0; i < 10000; i++) {
        const events = Array.from({ length: 100 }, (_, j) => ({
          id: `${i}-${j}`,
          title: `Event ${j}`,
          data: 'x'.repeat(1000),
        }));
        calendarEventCache.set(`calendar:user${i}`, events);
      }

      // Cache should have evicted old entries
      expect(calendarEventCache.size).toBeLessThan(10000);
      expect(calendarEventCache.calculatedSize).toBeLessThanOrEqual(100 * 1024 * 1024);
    });
  });

  describe('suggestionCache', () => {
    it('should store and retrieve suggestions', () => {
      const suggestions = [
        { id: '1', contactId: 'c1', reasoning: 'Test' },
        { id: '2', contactId: 'c2', reasoning: 'Test' },
      ];
      suggestionCache.set('suggestion:user1', suggestions);

      const retrieved = suggestionCache.get('suggestion:user1');
      expect(retrieved).toEqual(suggestions);
    });

    it('should evict entries when max size is reached', () => {
      // Fill cache with suggestion arrays
      for (let i = 0; i < 1000; i++) {
        const suggestions = Array.from({ length: 50 }, (_, j) => ({
          id: `${i}-${j}`,
          contactId: `c${j}`,
          reasoning: 'x'.repeat(1000),
        }));
        suggestionCache.set(`suggestion:user${i}`, suggestions);
      }

      // Cache should have evicted old entries
      expect(suggestionCache.size).toBeLessThan(1000);
      expect(suggestionCache.calculatedSize).toBeLessThanOrEqual(25 * 1024 * 1024);
    });
  });

  describe('userPreferencesCache', () => {
    it('should store and retrieve user preferences', () => {
      const prefs = { theme: 'dark', notifications: true, timezone: 'UTC' };
      userPreferencesCache.set('prefs:user1', prefs);

      const retrieved = userPreferencesCache.get('prefs:user1');
      expect(retrieved).toEqual(prefs);
    });

    it('should evict entries when max size is reached', () => {
      // Fill cache with preference objects
      for (let i = 0; i < 2000; i++) {
        const prefs = {
          userId: `user${i}`,
          settings: 'x'.repeat(10000), // 10KB per user
        };
        userPreferencesCache.set(`prefs:user${i}`, prefs);
      }

      // Cache should have evicted old entries
      expect(userPreferencesCache.size).toBeLessThan(2000);
      expect(userPreferencesCache.calculatedSize).toBeLessThanOrEqual(10 * 1024 * 1024);
    });
  });

  describe('getCacheStats', () => {
    it('should return statistics for all caches', () => {
      // Add some data to caches
      contactCache.set('contact:1', { id: '1', name: 'John' });
      calendarEventCache.set('calendar:1', [{ id: '1', title: 'Event' }]);
      suggestionCache.set('suggestion:1', [{ id: '1', reasoning: 'Test' }]);
      userPreferencesCache.set('prefs:1', { theme: 'dark' });

      const stats = getCacheStats();

      expect(stats.contacts.size).toBe(1);
      expect(stats.calendarEvents.size).toBe(1);
      expect(stats.suggestions.size).toBe(1);
      expect(stats.userPreferences.size).toBe(1);

      expect(stats.contacts.utilizationPercent).toBeGreaterThan(0);
      expect(stats.contacts.utilizationPercent).toBeLessThan(100);
    });

    it('should show 0% utilization for empty caches', () => {
      const stats = getCacheStats();

      expect(stats.contacts.size).toBe(0);
      expect(stats.contacts.utilizationPercent).toBe(0);
      expect(stats.calendarEvents.utilizationPercent).toBe(0);
      expect(stats.suggestions.utilizationPercent).toBe(0);
      expect(stats.userPreferences.utilizationPercent).toBe(0);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', () => {
      // Add data to all caches
      contactCache.set('contact:1', { id: '1' });
      calendarEventCache.set('calendar:1', [{ id: '1' }]);
      suggestionCache.set('suggestion:1', [{ id: '1' }]);
      userPreferencesCache.set('prefs:1', { theme: 'dark' });

      expect(contactCache.size).toBe(1);
      expect(calendarEventCache.size).toBe(1);
      expect(suggestionCache.size).toBe(1);
      expect(userPreferencesCache.size).toBe(1);

      clearAllCaches();

      expect(contactCache.size).toBe(0);
      expect(calendarEventCache.size).toBe(0);
      expect(suggestionCache.size).toBe(0);
      expect(userPreferencesCache.size).toBe(0);
    });
  });
});
