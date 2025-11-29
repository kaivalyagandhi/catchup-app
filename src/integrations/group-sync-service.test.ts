/**
 * Group Sync Service Tests
 *
 * Tests for group synchronization, mapping suggestions, and group updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupSyncService } from './group-sync-service';
import { GroupMappingRepository } from './group-mapping-repository';
import { GroupRepository } from '../contacts/group-repository';
import { ContactRepository } from '../contacts/repository';
import { GoogleContactsRateLimiter } from './google-contacts-rate-limiter';

// Mock the getPeopleClient function
const mockContactGroupsList = vi.fn();

vi.mock('./google-contacts-config', () => ({
  getPeopleClient: vi.fn(() => ({
    contactGroups: {
      list: mockContactGroupsList,
    },
  })),
}));

describe('GroupSyncService - Group Update Handling', () => {
  let groupSyncService: GroupSyncService;
  let mockGroupMappingRepository: any;
  let mockGroupRepository: any;
  let mockContactRepository: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockContactGroupsList.mockReset();

    // Create mock repositories
    mockGroupMappingRepository = {
      findAll: vi.fn(),
      update: vi.fn(),
      disableSync: vi.fn(),
    };

    mockGroupRepository = {
      update: vi.fn(),
    };

    mockContactRepository = {};

    mockRateLimiter = {
      executeRequest: vi.fn((userId, fn) => fn()),
    };

    // Create service with mocks
    groupSyncService = new GroupSyncService(
      mockGroupMappingRepository,
      mockGroupRepository,
      mockContactRepository,
      mockRateLimiter
    );
  });

  describe('handleGroupUpdates', () => {
    it('should detect and update group name changes for approved mappings', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token';

      // Mock existing mapping with old name
      const existingMapping = {
        id: 'mapping-1',
        userId,
        catchupGroupId: 'catchup-group-1',
        googleResourceName: 'contactGroups/group1',
        googleName: 'Old Friends',
        googleEtag: 'old-etag',
        memberCount: 5,
        mappingStatus: 'approved',
        syncEnabled: true,
      };

      mockGroupMappingRepository.findAll.mockResolvedValue([existingMapping]);

      // Mock Google API response with updated group name
      mockContactGroupsList.mockResolvedValue({
        data: {
          contactGroups: [
            {
              resourceName: 'contactGroups/group1',
              name: 'New Friends',
              etag: 'new-etag',
              groupType: 'USER_CONTACT_GROUP',
              memberCount: 5,
            },
          ],
        },
      });

      mockGroupMappingRepository.update.mockResolvedValue({});
      mockGroupRepository.update.mockResolvedValue({});

      // Execute
      await groupSyncService.handleGroupUpdates(userId, accessToken);

      // Verify mapping was updated with new name
      expect(mockGroupMappingRepository.update).toHaveBeenCalledWith(
        'mapping-1',
        userId,
        {
          googleName: 'New Friends',
          googleEtag: 'new-etag',
        }
      );

      // Verify CatchUp group was updated (because mapping is approved)
      expect(mockGroupRepository.update).toHaveBeenCalledWith(
        'catchup-group-1',
        userId,
        'New Friends'
      );
    });

    it('should update mapping but not CatchUp group for pending mappings', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token';

      // Mock pending mapping (no catchupGroupId)
      const pendingMapping = {
        id: 'mapping-2',
        userId,
        catchupGroupId: null,
        googleResourceName: 'contactGroups/group2',
        googleName: 'Old Colleagues',
        googleEtag: 'old-etag',
        memberCount: 10,
        mappingStatus: 'pending',
        syncEnabled: true,
      };

      mockGroupMappingRepository.findAll.mockResolvedValue([pendingMapping]);

      // Mock Google API response with updated group name
      mockContactGroupsList.mockResolvedValue({
        data: {
          contactGroups: [
            {
              resourceName: 'contactGroups/group2',
              name: 'New Colleagues',
              etag: 'new-etag',
              groupType: 'USER_CONTACT_GROUP',
              memberCount: 10,
            },
          ],
        },
      });

      mockGroupMappingRepository.update.mockResolvedValue({});

      // Execute
      await groupSyncService.handleGroupUpdates(userId, accessToken);

      // Verify mapping was updated
      expect(mockGroupMappingRepository.update).toHaveBeenCalledWith(
        'mapping-2',
        userId,
        {
          googleName: 'New Colleagues',
          googleEtag: 'new-etag',
        }
      );

      // Verify CatchUp group was NOT updated (because mapping is pending)
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should handle deleted groups by disabling sync', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token';

      // Mock mapping for a group that will be deleted
      const deletedGroupMapping = {
        id: 'mapping-3',
        userId,
        catchupGroupId: 'catchup-group-3',
        googleResourceName: 'contactGroups/group3',
        googleName: 'Deleted Group',
        googleEtag: 'etag',
        memberCount: 3,
        mappingStatus: 'approved',
        syncEnabled: true,
      };

      mockGroupMappingRepository.findAll.mockResolvedValue([deletedGroupMapping]);

      // Mock Google API response WITHOUT the deleted group
      mockContactGroupsList.mockResolvedValue({
        data: {
          contactGroups: [], // Group no longer exists
        },
      });

      mockGroupMappingRepository.disableSync.mockResolvedValue(undefined);

      // Execute
      await groupSyncService.handleGroupUpdates(userId, accessToken);

      // Verify sync was disabled for the deleted group
      expect(mockGroupMappingRepository.disableSync).toHaveBeenCalledWith('mapping-3', userId);

      // Verify no updates were attempted
      expect(mockGroupMappingRepository.update).not.toHaveBeenCalled();
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
    });

    it('should handle multiple groups with mixed updates and deletions', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token';

      // Mock multiple mappings
      const mappings = [
        {
          id: 'mapping-1',
          userId,
          catchupGroupId: 'catchup-group-1',
          googleResourceName: 'contactGroups/group1',
          googleName: 'Old Name 1',
          googleEtag: 'etag1',
          memberCount: 5,
          mappingStatus: 'approved',
          syncEnabled: true,
        },
        {
          id: 'mapping-2',
          userId,
          catchupGroupId: null,
          googleResourceName: 'contactGroups/group2',
          googleName: 'Old Name 2',
          googleEtag: 'etag2',
          memberCount: 10,
          mappingStatus: 'pending',
          syncEnabled: true,
        },
        {
          id: 'mapping-3',
          userId,
          catchupGroupId: 'catchup-group-3',
          googleResourceName: 'contactGroups/group3',
          googleName: 'Deleted Group',
          googleEtag: 'etag3',
          memberCount: 3,
          mappingStatus: 'approved',
          syncEnabled: true,
        },
      ];

      mockGroupMappingRepository.findAll.mockResolvedValue(mappings);

      // Mock Google API response with some groups updated, one deleted
      mockContactGroupsList.mockResolvedValue({
        data: {
          contactGroups: [
            {
              resourceName: 'contactGroups/group1',
              name: 'New Name 1',
              etag: 'new-etag1',
              groupType: 'USER_CONTACT_GROUP',
              memberCount: 5,
            },
            {
              resourceName: 'contactGroups/group2',
              name: 'New Name 2',
              etag: 'new-etag2',
              groupType: 'USER_CONTACT_GROUP',
              memberCount: 10,
            },
            // group3 is missing (deleted)
          ],
        },
      });

      mockGroupMappingRepository.update.mockResolvedValue({});
      mockGroupRepository.update.mockResolvedValue({});
      mockGroupMappingRepository.disableSync.mockResolvedValue(undefined);

      // Execute
      await groupSyncService.handleGroupUpdates(userId, accessToken);

      // Verify updates for group1 (approved)
      expect(mockGroupMappingRepository.update).toHaveBeenCalledWith('mapping-1', userId, {
        googleName: 'New Name 1',
        googleEtag: 'new-etag1',
      });
      expect(mockGroupRepository.update).toHaveBeenCalledWith(
        'catchup-group-1',
        userId,
        'New Name 1'
      );

      // Verify updates for group2 (pending - no CatchUp group update)
      expect(mockGroupMappingRepository.update).toHaveBeenCalledWith('mapping-2', userId, {
        googleName: 'New Name 2',
        googleEtag: 'new-etag2',
      });

      // Verify group3 was disabled (deleted)
      expect(mockGroupMappingRepository.disableSync).toHaveBeenCalledWith('mapping-3', userId);

      // Verify correct number of calls
      expect(mockGroupMappingRepository.update).toHaveBeenCalledTimes(2);
      expect(mockGroupRepository.update).toHaveBeenCalledTimes(1); // Only for approved mapping
      expect(mockGroupMappingRepository.disableSync).toHaveBeenCalledTimes(1);
    });

    it('should not update anything if no changes detected', async () => {
      const userId = 'user-123';
      const accessToken = 'access-token';

      // Mock mapping with current name
      const unchangedMapping = {
        id: 'mapping-1',
        userId,
        catchupGroupId: 'catchup-group-1',
        googleResourceName: 'contactGroups/group1',
        googleName: 'Same Name',
        googleEtag: 'same-etag',
        memberCount: 5,
        mappingStatus: 'approved',
        syncEnabled: true,
      };

      mockGroupMappingRepository.findAll.mockResolvedValue([unchangedMapping]);

      // Mock Google API response with same name
      mockContactGroupsList.mockResolvedValue({
        data: {
          contactGroups: [
            {
              resourceName: 'contactGroups/group1',
              name: 'Same Name',
              etag: 'same-etag',
              groupType: 'USER_CONTACT_GROUP',
              memberCount: 5,
            },
          ],
        },
      });

      // Execute
      await groupSyncService.handleGroupUpdates(userId, accessToken);

      // Verify no updates were made
      expect(mockGroupMappingRepository.update).not.toHaveBeenCalled();
      expect(mockGroupRepository.update).not.toHaveBeenCalled();
      expect(mockGroupMappingRepository.disableSync).not.toHaveBeenCalled();
    });
  });
});
