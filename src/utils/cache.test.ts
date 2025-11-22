import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  getCache,
  setCache,
  deleteCache,
  existsCache,
  getOrSetCache,
  CacheKeys,
  CacheTTL,
  invalidateContactCache,
  invalidateSuggestionCache,
  invalidateCalendarCache,
  closeCache,
} from './cache';

describe('Cache Utility', () => {
  const testUserId = 'test-user-123';
  const testContactId = 'test-contact-456';
  const testKey = 'test:key';

  beforeEach(async () => {
    // Clean up test keys before each test
    await deleteCache(testKey);
    await deleteCache(CacheKeys.CONTACT_LIST(testUserId));
    await deleteCache(CacheKeys.CONTACT_PROFILE(testContactId));
    await deleteCache(CacheKeys.SUGGESTION_LIST(testUserId));
  });

  afterAll(async () => {
    // Close Redis connection after all tests
    await closeCache();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get a value from cache', async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };
      await setCache(testKey, testData);

      const cached = await getCache(testKey);
      expect(cached).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const cached = await getCache('non-existent-key');
      expect(cached).toBeNull();
    });

    it('should delete a value from cache', async () => {
      await setCache(testKey, { data: 'test' });
      await deleteCache(testKey);

      const cached = await getCache(testKey);
      expect(cached).toBeNull();
    });

    it('should check if key exists', async () => {
      await setCache(testKey, { data: 'test' });
      const exists = await existsCache(testKey);
      expect(exists).toBe(true);

      await deleteCache(testKey);
      const notExists = await existsCache(testKey);
      expect(notExists).toBe(false);
    });

    it('should set cache with TTL', async () => {
      await setCache(testKey, { data: 'test' }, 1); // 1 second TTL
      
      const cached = await getCache(testKey);
      expect(cached).toEqual({ data: 'test' });

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expired = await getCache(testKey);
      expect(expired).toBeNull();
    });
  });

  describe('getOrSetCache', () => {
    it('should load data if not in cache', async () => {
      let loaderCalled = false;
      const loader = async () => {
        loaderCalled = true;
        return { data: 'loaded' };
      };

      const result = await getOrSetCache(testKey, loader);
      expect(result).toEqual({ data: 'loaded' });
      expect(loaderCalled).toBe(true);
    });

    it('should return cached data without calling loader', async () => {
      await setCache(testKey, { data: 'cached' });

      let loaderCalled = false;
      const loader = async () => {
        loaderCalled = true;
        return { data: 'loaded' };
      };

      const result = await getOrSetCache(testKey, loader);
      expect(result).toEqual({ data: 'cached' });
      expect(loaderCalled).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate contact cache', async () => {
      await setCache(CacheKeys.CONTACT_LIST(testUserId), [{ id: '1' }]);
      await setCache(CacheKeys.CONTACT_PROFILE(testContactId), { name: 'John' });

      await invalidateContactCache(testUserId, testContactId);

      const listCache = await getCache(CacheKeys.CONTACT_LIST(testUserId));
      const profileCache = await getCache(CacheKeys.CONTACT_PROFILE(testContactId));

      expect(listCache).toBeNull();
      expect(profileCache).toBeNull();
    });

    it('should invalidate suggestion cache', async () => {
      await setCache(CacheKeys.SUGGESTION_LIST(testUserId), [{ id: '1' }]);

      await invalidateSuggestionCache(testUserId);

      const cached = await getCache(CacheKeys.SUGGESTION_LIST(testUserId));
      expect(cached).toBeNull();
    });

    it('should invalidate calendar cache', async () => {
      await setCache(CacheKeys.CALENDAR_FREE_SLOTS(testUserId, '2024-01-01'), []);
      await setCache(CacheKeys.CALENDAR_FREE_SLOTS(testUserId, '2024-01-02'), []);

      await invalidateCalendarCache(testUserId);

      const cache1 = await getCache(CacheKeys.CALENDAR_FREE_SLOTS(testUserId, '2024-01-01'));
      const cache2 = await getCache(CacheKeys.CALENDAR_FREE_SLOTS(testUserId, '2024-01-02'));

      expect(cache1).toBeNull();
      expect(cache2).toBeNull();
    });
  });

  describe('Cache Keys and TTL', () => {
    it('should have correct cache key formats', () => {
      expect(CacheKeys.CONTACT_LIST('user1')).toBe('contact:list:user1');
      expect(CacheKeys.CONTACT_PROFILE('contact1')).toBe('contact:profile:contact1');
      expect(CacheKeys.CALENDAR_FREE_SLOTS('user1', '2024-01-01')).toBe('calendar:slots:user1:2024-01-01');
      expect(CacheKeys.SUGGESTION_LIST('user1')).toBe('suggestion:list:user1');
    });

    it('should have correct TTL values', () => {
      expect(CacheTTL.CONTACT_LIST).toBe(5 * 60); // 5 minutes
      expect(CacheTTL.CONTACT_PROFILE).toBe(5 * 60); // 5 minutes
      expect(CacheTTL.CALENDAR_FREE_SLOTS).toBe(60 * 60); // 1 hour
      expect(CacheTTL.SUGGESTION_LIST).toBe(0); // No TTL
    });
  });
});
