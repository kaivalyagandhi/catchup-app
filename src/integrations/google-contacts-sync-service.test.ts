/**
 * Google Contacts Sync Service Tests
 * 
 * Tests for the sync service core functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleContactsSyncService } from './google-contacts-sync-service';
import { GoogleContactsOAuthService } from './google-contacts-oauth-service';
import { ImportServiceImpl } from '../contacts/import-service';
import { GoogleContactsRateLimiter } from './google-contacts-rate-limiter';
import { PostgresSyncStateRepository } from './sync-state-repository';
import { PostgresContactRepository } from '../contacts/repository';

describe('GoogleContactsSyncService', () => {
  let syncService: GoogleContactsSyncService;
  let mockOAuthService: any;
  let mockImportService: any;
  let mockRateLimiter: any;
  let mockSyncStateRepository: any;
  let mockContactRepository: any;

  beforeEach(() => {
    // Create mock services
    mockOAuthService = {
      refreshAccessToken: vi.fn(),
    };

    mockImportService = {
      importContact: vi.fn(),
      handleDeletedContact: vi.fn(),
    };

    mockRateLimiter = {
      executeRequest: vi.fn((userId, request) => request()),
    };

    mockSyncStateRepository = {
      getSyncState: vi.fn(),
      markSyncInProgress: vi.fn(),
      markSyncComplete: vi.fn(),
      markSyncFailed: vi.fn(),
      updateSyncToken: vi.fn(),
    };

    mockContactRepository = {};

    syncService = new GoogleContactsSyncService(
      mockOAuthService,
      mockImportService,
      mockRateLimiter,
      mockSyncStateRepository,
      mockContactRepository
    );
  });

  describe('constructor', () => {
    it('should create an instance with provided dependencies', () => {
      expect(syncService).toBeInstanceOf(GoogleContactsSyncService);
    });

    it('should create an instance with default dependencies', () => {
      const service = new GoogleContactsSyncService();
      expect(service).toBeInstanceOf(GoogleContactsSyncService);
    });
  });

  describe('getSyncState', () => {
    it('should return sync state for user', async () => {
      const mockState = {
        id: '1',
        userId: 'user-1',
        syncToken: 'token-123',
        lastFullSyncAt: new Date(),
        lastIncrementalSyncAt: null,
        totalContactsSynced: 100,
        lastSyncStatus: 'success' as const,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSyncStateRepository.getSyncState.mockResolvedValue(mockState);

      const result = await syncService.getSyncState('user-1');

      expect(result).toEqual(mockState);
      expect(mockSyncStateRepository.getSyncState).toHaveBeenCalledWith('user-1');
    });

    it('should return null if no sync state exists', async () => {
      mockSyncStateRepository.getSyncState.mockResolvedValue(null);

      const result = await syncService.getSyncState('user-1');

      expect(result).toBeNull();
    });
  });

  describe('storeSyncToken', () => {
    it('should store sync token for user', async () => {
      await syncService.storeSyncToken('user-1', 'new-token-456');

      expect(mockSyncStateRepository.updateSyncToken).toHaveBeenCalledWith(
        'user-1',
        'new-token-456'
      );
    });
  });

  describe('handleTokenExpiration', () => {
    it('should clear expired token and trigger full sync', async () => {
      // Mock the performFullSync method
      const mockFullSyncResult = {
        contactsImported: 50,
        duration: 5000,
        errors: [],
      };

      vi.spyOn(syncService, 'performFullSync').mockResolvedValue(mockFullSyncResult);

      const result = await syncService.handleTokenExpiration('user-1', 'access-token');

      expect(mockSyncStateRepository.updateSyncToken).toHaveBeenCalledWith('user-1', '');
      expect(syncService.performFullSync).toHaveBeenCalledWith('user-1', 'access-token');
      expect(result).toEqual(mockFullSyncResult);
    });
  });
});
