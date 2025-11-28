/**
 * Job Scheduler Tests
 * 
 * Tests for Google Contacts sync scheduling functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as scheduler from './scheduler';
import * as oauthRepository from '../integrations/oauth-repository';
import { googleContactsSyncQueue } from './queue';

// Mock dependencies
vi.mock('../integrations/oauth-repository');
vi.mock('./queue', () => ({
  googleContactsSyncQueue: {
    add: vi.fn(),
    getRepeatableJobs: vi.fn(),
    removeRepeatableByKey: vi.fn(),
  },
  suggestionGenerationQueue: {
    add: vi.fn(),
    getRepeatableJobs: vi.fn(),
    removeRepeatableByKey: vi.fn(),
  },
  batchNotificationQueue: {
    add: vi.fn(),
    getRepeatableJobs: vi.fn(),
    removeRepeatableByKey: vi.fn(),
  },
  calendarSyncQueue: {
    add: vi.fn(),
    getRepeatableJobs: vi.fn(),
    removeRepeatableByKey: vi.fn(),
  },
}));

describe('Google Contacts Sync Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleGoogleContactsSync', () => {
    it('should schedule sync for all users with Google Contacts connected', async () => {
      // Mock users with Google Contacts
      const mockUserIds = ['user1', 'user2', 'user3'];
      vi.mocked(oauthRepository.getUsersWithProvider).mockResolvedValue(mockUserIds);
      vi.mocked(googleContactsSyncQueue.add).mockResolvedValue({} as any);

      await scheduler.scheduleGoogleContactsSync();

      // Verify getUsersWithProvider was called with correct provider
      expect(oauthRepository.getUsersWithProvider).toHaveBeenCalledWith('google_contacts');

      // Verify a job was scheduled for each user
      expect(googleContactsSyncQueue.add).toHaveBeenCalledTimes(3);

      // Verify job data structure
      for (let i = 0; i < mockUserIds.length; i++) {
        expect(googleContactsSyncQueue.add).toHaveBeenNthCalledWith(
          i + 1,
          {
            userId: mockUserIds[i],
            syncType: 'incremental',
          },
          expect.objectContaining({
            repeat: {
              cron: '0 2 * * *', // Daily at 2 AM
              tz: 'UTC',
            },
            jobId: `google-contacts-sync-${mockUserIds[i]}`,
          })
        );
      }
    });

    it('should handle errors for individual users gracefully', async () => {
      const mockUserIds = ['user1', 'user2'];
      vi.mocked(oauthRepository.getUsersWithProvider).mockResolvedValue(mockUserIds);
      
      // Mock first user succeeds, second fails
      vi.mocked(googleContactsSyncQueue.add)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Queue error'));

      // Should not throw
      await expect(scheduler.scheduleGoogleContactsSync()).resolves.not.toThrow();

      // Both users should be attempted
      expect(googleContactsSyncQueue.add).toHaveBeenCalledTimes(2);
    });

    it('should handle empty user list', async () => {
      vi.mocked(oauthRepository.getUsersWithProvider).mockResolvedValue([]);

      await scheduler.scheduleGoogleContactsSync();

      expect(googleContactsSyncQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('scheduleUserGoogleContactsSync', () => {
    it('should schedule sync for a specific user', async () => {
      const userId = 'test-user-123';
      vi.mocked(googleContactsSyncQueue.getRepeatableJobs).mockResolvedValue([]);
      vi.mocked(googleContactsSyncQueue.add).mockResolvedValue({} as any);

      await scheduler.scheduleUserGoogleContactsSync(userId);

      // Verify job was scheduled
      expect(googleContactsSyncQueue.add).toHaveBeenCalledWith(
        {
          userId,
          syncType: 'incremental',
        },
        expect.objectContaining({
          repeat: {
            cron: '0 2 * * *',
            tz: 'UTC',
          },
          jobId: `google-contacts-sync-${userId}`,
        })
      );
    });

    it('should remove existing job before scheduling new one', async () => {
      const userId = 'test-user-123';
      const existingJob = {
        id: `google-contacts-sync-${userId}`,
        key: 'existing-key',
      };

      vi.mocked(googleContactsSyncQueue.getRepeatableJobs).mockResolvedValue([existingJob] as any);
      vi.mocked(googleContactsSyncQueue.add).mockResolvedValue({} as any);

      await scheduler.scheduleUserGoogleContactsSync(userId);

      // Verify existing job was removed
      expect(googleContactsSyncQueue.removeRepeatableByKey).toHaveBeenCalledWith('existing-key');

      // Verify new job was scheduled
      expect(googleContactsSyncQueue.add).toHaveBeenCalled();
    });
  });

  describe('removeUserGoogleContactsSync', () => {
    it('should remove scheduled sync for a specific user', async () => {
      const userId = 'test-user-123';
      const existingJob = {
        id: `google-contacts-sync-${userId}`,
        key: 'job-key-123',
      };

      vi.mocked(googleContactsSyncQueue.getRepeatableJobs).mockResolvedValue([existingJob] as any);

      await scheduler.removeUserGoogleContactsSync(userId);

      expect(googleContactsSyncQueue.removeRepeatableByKey).toHaveBeenCalledWith('job-key-123');
    });

    it('should handle case when no job exists', async () => {
      const userId = 'test-user-123';
      vi.mocked(googleContactsSyncQueue.getRepeatableJobs).mockResolvedValue([]);

      // Should not throw
      await expect(scheduler.removeUserGoogleContactsSync(userId)).resolves.not.toThrow();

      expect(googleContactsSyncQueue.removeRepeatableByKey).not.toHaveBeenCalled();
    });

    it('should only remove jobs matching the user ID', async () => {
      const userId = 'test-user-123';
      const jobs = [
        { id: 'google-contacts-sync-other-user', key: 'key1' },
        { id: `google-contacts-sync-${userId}`, key: 'key2' },
        { id: 'google-contacts-sync-another-user', key: 'key3' },
      ];

      vi.mocked(googleContactsSyncQueue.getRepeatableJobs).mockResolvedValue(jobs as any);

      await scheduler.removeUserGoogleContactsSync(userId);

      // Only the matching job should be removed
      expect(googleContactsSyncQueue.removeRepeatableByKey).toHaveBeenCalledTimes(1);
      expect(googleContactsSyncQueue.removeRepeatableByKey).toHaveBeenCalledWith('key2');
    });
  });
});
