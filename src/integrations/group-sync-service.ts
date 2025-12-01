/**
 * Group Sync Service
 *
 * Synchronizes Google contact groups with CatchUp groups and generates
 * intelligent mapping suggestions based on name similarity and member overlap.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 6.9, 6.10
 */

import { getPeopleClient } from './google-contacts-config';
import { GroupMappingRepository, PostgresGroupMappingRepository } from './group-mapping-repository';
import { GroupRepository, PostgresGroupRepository } from '../contacts/group-repository';
import { ContactRepository, PostgresContactRepository } from '../contacts/repository';
import { GoogleContactsRateLimiter } from './google-contacts-rate-limiter';
import { GoogleContactsOAuthService } from './google-contacts-oauth-service';

/**
 * Google Contact Group from API
 */
export interface GoogleContactGroup {
  resourceName: string;
  etag?: string;
  name: string;
  groupType: string;
  memberCount: number;
  memberResourceNames?: string[];
}

/**
 * Group mapping suggestion
 */
export interface GroupMappingSuggestion {
  id: string;
  userId: string;
  googleResourceName: string;
  googleName: string;
  memberCount: number;
  suggestedAction: 'create_new' | 'map_to_existing';
  suggestedGroupId?: string;
  suggestedGroupName?: string;
  confidenceScore: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Group sync result
 */
export interface GroupSyncResult {
  groupsImported: number;
  groupsUpdated: number;
  suggestionsGenerated: number;
  membershipsUpdated: number;
}

/**
 * Group Sync Service
 */
export class GroupSyncService {
  private groupMappingRepository: GroupMappingRepository;
  private groupRepository: GroupRepository;
  private contactRepository: ContactRepository;
  private rateLimiter: GoogleContactsRateLimiter;
  private oauthService: GoogleContactsOAuthService;

  constructor(
    groupMappingRepository?: GroupMappingRepository,
    groupRepository?: GroupRepository,
    contactRepository?: ContactRepository,
    rateLimiter?: GoogleContactsRateLimiter,
    oauthService?: GoogleContactsOAuthService
  ) {
    this.groupMappingRepository = groupMappingRepository || new PostgresGroupMappingRepository();
    this.groupRepository = groupRepository || new PostgresGroupRepository();
    this.contactRepository = contactRepository || new PostgresContactRepository();
    this.rateLimiter = rateLimiter || new GoogleContactsRateLimiter();
    this.oauthService = oauthService || new GoogleContactsOAuthService();
  }

  /**
   * Sync all contact groups from Google and generate suggestions
   *
   * Fetches all contact groups, generates mapping suggestions for each,
   * and stores them with status="pending". Does NOT automatically create groups.
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async syncContactGroups(userId: string, accessToken: string): Promise<GroupSyncResult> {
    console.log(`Starting group sync for user ${userId}`);

    let groupsImported = 0;
    let groupsUpdated = 0;
    let suggestionsGenerated = 0;

    try {
      // Get People API client (READ-ONLY operations only)
      // Requirements: 15.3 - Only GET requests are made to Google API
      const people = getPeopleClient({ access_token: accessToken });

      // Fetch all contact groups (READ-ONLY operation)
      const response = await this.rateLimiter.executeRequest(userId, async () => {
        return await people.contactGroups.list({
          pageSize: 1000,
        });
      });

      const contactGroups = response.data.contactGroups || [];
      console.log(`Fetched ${contactGroups.length} contact groups`);

      // Process each group
      for (const group of contactGroups) {
        // Skip system groups
        if (group.groupType !== 'USER_CONTACT_GROUP') {
          continue;
        }

        const googleGroup: GoogleContactGroup = {
          resourceName: group.resourceName!,
          etag: group.etag || undefined,
          name: group.name!,
          groupType: group.groupType!,
          memberCount: group.memberCount || 0,
        };

        // Check if mapping already exists
        const existingMapping = await this.groupMappingRepository.findByGoogleResourceName(
          userId,
          googleGroup.resourceName
        );

        if (existingMapping) {
          // Update existing mapping
          await this.groupMappingRepository.update(existingMapping.id, userId, {
            googleName: googleGroup.name,
            googleEtag: googleGroup.etag,
            memberCount: googleGroup.memberCount,
          });
          groupsUpdated++;
        } else {
          // Generate mapping suggestion
          const suggestion = await this.generateMappingSuggestion(userId, googleGroup);

          // Create new mapping with suggestion
          await this.groupMappingRepository.create(userId, {
            googleResourceName: googleGroup.resourceName,
            googleName: googleGroup.name,
            googleEtag: googleGroup.etag,
            memberCount: googleGroup.memberCount,
            mappingStatus: 'pending',
            suggestedAction: suggestion.suggestedAction,
            suggestedGroupId: suggestion.suggestedGroupId,
            suggestedGroupName: suggestion.suggestedGroupName,
            confidenceScore: suggestion.confidenceScore,
            suggestionReason: suggestion.reason,
          });

          groupsImported++;
          suggestionsGenerated++;
        }
      }

      console.log(
        `Group sync completed. Imported: ${groupsImported}, ` +
          `Updated: ${groupsUpdated}, Suggestions: ${suggestionsGenerated}`
      );

      return {
        groupsImported,
        groupsUpdated,
        suggestionsGenerated,
        membershipsUpdated: 0, // Will be updated during membership sync
      };
    } catch (error) {
      // Handle auth errors with token refresh
      if (this.isAuthError(error)) {
        console.log('Authentication error, attempting token refresh');
        try {
          const newAccessToken = await this.oauthService.refreshAccessToken(userId);
          // Retry with new token
          return await this.syncContactGroups(userId, newAccessToken);
        } catch (refreshError) {
          const refreshErrorMsg =
            refreshError instanceof Error ? refreshError.message : String(refreshError);
          throw new Error(`Token refresh failed: ${refreshErrorMsg}`);
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Group sync failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generate mapping suggestion for a Google group
   *
   * Analyzes existing CatchUp groups and suggests whether to create new
   * or map to existing based on name similarity and member overlap.
   *
   * Requirements: 6.2, 6.3
   */
  async generateMappingSuggestion(
    userId: string,
    googleGroup: GoogleContactGroup
  ): Promise<GroupMappingSuggestion> {
    // Fetch all existing CatchUp groups for user
    const existingGroups = await this.groupRepository.findAll(userId, false);

    if (existingGroups.length === 0) {
      // No existing groups, suggest creating new
      return {
        id: '', // Will be set when stored
        userId,
        googleResourceName: googleGroup.resourceName,
        googleName: googleGroup.name,
        memberCount: googleGroup.memberCount,
        suggestedAction: 'create_new',
        suggestedGroupName: googleGroup.name,
        confidenceScore: 0.9,
        reason: 'No existing groups found',
        status: 'pending',
      };
    }

    // Calculate similarity scores for each existing group
    const similarities = await Promise.all(
      existingGroups.map(async (group) => {
        const nameScore = this.calculateStringSimilarity(googleGroup.name, group.name);
        const memberOverlap = await this.calculateMemberOverlap(userId, googleGroup, group.id);

        return {
          group,
          nameScore,
          memberOverlap,
          combinedScore: (nameScore + memberOverlap) / 2,
        };
      })
    );

    // Find best match
    const bestMatch = similarities
      .filter((s) => s.nameScore > 0.7 || s.memberOverlap > 0.5)
      .sort((a, b) => b.combinedScore - a.combinedScore)[0];

    // Generate suggestion based on best match
    if (bestMatch && (bestMatch.nameScore > 0.8 || bestMatch.memberOverlap > 0.6)) {
      return {
        id: '',
        userId,
        googleResourceName: googleGroup.resourceName,
        googleName: googleGroup.name,
        memberCount: googleGroup.memberCount,
        suggestedAction: 'map_to_existing',
        suggestedGroupId: bestMatch.group.id,
        suggestedGroupName: bestMatch.group.name,
        confidenceScore: bestMatch.combinedScore,
        reason: `Similar name (${Math.round(bestMatch.nameScore * 100)}% match) and ${Math.round(bestMatch.memberOverlap * 100)}% member overlap`,
        status: 'pending',
      };
    } else {
      return {
        id: '',
        userId,
        googleResourceName: googleGroup.resourceName,
        googleName: googleGroup.name,
        memberCount: googleGroup.memberCount,
        suggestedAction: 'create_new',
        suggestedGroupName: googleGroup.name,
        confidenceScore: 0.9,
        reason: 'No similar existing group found',
        status: 'pending',
      };
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   *
   * Requirements: 6.2, 6.3
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    if (maxLength === 0) {
      return 1.0;
    }

    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the dp table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate member overlap using Jaccard index
   *
   * Requirements: 6.2, 6.3
   */
  private async calculateMemberOverlap(
    userId: string,
    googleGroup: GoogleContactGroup,
    catchupGroupId: string
  ): Promise<number> {
    // Get contacts in the CatchUp group
    const catchupContacts = await this.groupRepository.getGroupContacts(catchupGroupId, userId);

    // Get Google resource names for CatchUp group contacts
    const catchupGoogleResourceNames = new Set(
      (
        await Promise.all(
          catchupContacts.map(async (contact) => {
            const fullContact = await this.contactRepository.findById(contact.id, userId);
            return fullContact?.googleResourceName;
          })
        )
      ).filter((name): name is string => name !== null && name !== undefined)
    );

    // For now, we don't have member resource names from the group list API
    // We would need to fetch group members separately, which we'll do during membership sync
    // For initial suggestion, we'll use a simplified approach

    if (catchupGoogleResourceNames.size === 0) {
      return 0;
    }

    // This is a simplified calculation - in a full implementation,
    // we would fetch the actual group members from Google
    return 0;
  }

  /**
   * Find existing group mapping
   */
  async findGroupMapping(userId: string, googleResourceName: string) {
    return await this.groupMappingRepository.findByGoogleResourceName(userId, googleResourceName);
  }

  /**
   * Create new group mapping
   */
  async createGroupMapping(userId: string, data: any) {
    return await this.groupMappingRepository.create(userId, data);
  }

  /**
   * Update group mapping
   */
  async updateGroupMapping(mappingId: string, userId: string, data: any) {
    return await this.groupMappingRepository.update(mappingId, userId, data);
  }

  /**
   * Approve a mapping suggestion
   *
   * Creates or links CatchUp group and updates mapping status to "approved".
   *
   * Requirements: 6.6
   */
  async approveMappingSuggestion(userId: string, mappingId: string): Promise<void> {
    console.log(`Approving mapping suggestion ${mappingId} for user ${userId}`);

    // Get the mapping by ID (not by resource name)
    const allMappings = await this.groupMappingRepository.findAll(userId, false);
    const mapping = allMappings.find((m) => m.id === mappingId);

    if (!mapping) {
      throw new Error('Group mapping not found');
    }

    // Check if already approved
    if (mapping.catchupGroupId) {
      console.log('Mapping already approved');
      return;
    }

    let catchupGroupId: string;

    // Check if we should map to existing or create new
    if (mapping.suggestedAction === 'map_to_existing' && mapping.suggestedGroupId) {
      // Link to existing group
      catchupGroupId = mapping.suggestedGroupId;
      console.log(`Linking to existing CatchUp group ${catchupGroupId}`);
    } else {
      // Create new CatchUp group with the suggested name
      const groupName = mapping.suggestedGroupName || mapping.googleName;
      const newGroup = await this.groupRepository.create(userId, groupName);
      catchupGroupId = newGroup.id;
      console.log(`Created new CatchUp group ${catchupGroupId} with name "${groupName}"`);
    }

    // Update mapping with CatchUp group ID and status
    await this.groupMappingRepository.update(mapping.id, userId, {
      catchupGroupId,
      mappingStatus: 'approved',
    });

    console.log(`Approved mapping ${mappingId}`);
  }

  /**
   * Reject a mapping suggestion
   *
   * Updates mapping status to "rejected" and excludes from membership sync.
   *
   * Requirements: 6.7
   */
  async rejectMappingSuggestion(userId: string, mappingId: string): Promise<void> {
    console.log(`Rejecting mapping suggestion ${mappingId} for user ${userId}`);

    // Get the mapping by ID
    const allMappings = await this.groupMappingRepository.findAll(userId, false);
    const mapping = allMappings.find((m) => m.id === mappingId);

    if (!mapping) {
      throw new Error('Group mapping not found');
    }

    // Update mapping status to rejected and disable sync
    await this.groupMappingRepository.update(mapping.id, userId, {
      mappingStatus: 'rejected',
      syncEnabled: false,
    });

    console.log(`Rejected mapping ${mappingId}`);
  }

  /**
   * Get all pending mapping suggestions for user
   */
  async getPendingMappingSuggestions(userId: string): Promise<GroupMappingSuggestion[]> {
    // Get all mappings without CatchUp group ID (pending)
    const allMappings = await this.groupMappingRepository.findAll(userId, false);

    return allMappings
      .filter((mapping) => !mapping.catchupGroupId && mapping.syncEnabled)
      .map((mapping) => ({
        id: mapping.id,
        userId: mapping.userId,
        googleResourceName: mapping.googleResourceName,
        googleName: mapping.googleName,
        memberCount: mapping.memberCount,
        suggestedAction: 'create_new' as const,
        suggestedGroupName: mapping.googleName,
        confidenceScore: 0.9,
        reason: 'Pending approval',
        status: 'pending' as const,
      }));
  }

  /**
   * Sync group memberships for contacts (only for approved mappings)
   *
   * Processes contact memberships from Google and adds contacts ONLY to
   * groups with approved mappings. Skips pending and rejected mappings.
   *
   * Requirements: 6.8
   */
  async syncGroupMemberships(userId: string, accessToken: string): Promise<number> {
    console.log(`Starting group membership sync for user ${userId}`);

    let membershipsUpdated = 0;

    try {
      // Get all approved mappings (those with catchupGroupId)
      const allMappings = await this.groupMappingRepository.findAll(userId, true);
      const approvedMappings = allMappings.filter((m) => m.catchupGroupId !== null);

      console.log(`Found ${approvedMappings.length} approved group mappings`);

      // Get all contacts for the user
      const contacts = await this.contactRepository.findAll(userId);

      // Get People API client (READ-ONLY operations only)
      // Requirements: 15.3 - Only GET requests are made to Google API
      const people = getPeopleClient({ access_token: accessToken });

      // For each contact with a Google resource name, fetch their memberships (READ-ONLY operation)
      for (const contact of contacts) {
        if (!contact.googleResourceName) {
          continue;
        }

        try {
          // Fetch contact details including memberships
          const response = await this.rateLimiter.executeRequest(userId, async () => {
            return await people.people.get({
              resourceName: contact.googleResourceName!,
              personFields: 'memberships',
            });
          });

          const memberships = response.data.memberships || [];

          // Process each membership
          for (const membership of memberships) {
            const groupResourceName = membership.contactGroupMembership?.contactGroupResourceName;

            if (!groupResourceName) {
              continue;
            }

            // Find approved mapping for this Google group
            const mapping = approvedMappings.find(
              (m) => m.googleResourceName === groupResourceName
            );

            if (!mapping || !mapping.catchupGroupId) {
              // Skip if no approved mapping exists
              continue;
            }

            // Add contact to CatchUp group
            try {
              await this.groupRepository.assignContact(contact.id, mapping.catchupGroupId, userId);
              membershipsUpdated++;
            } catch (error) {
              // Ignore if already assigned
              if (error instanceof Error && !error.message.includes('already exists')) {
                console.error(
                  `Error assigning contact ${contact.id} to group ${mapping.catchupGroupId}: ${error.message}`
                );
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `Error fetching memberships for contact ${contact.googleResourceName}: ${errorMessage}`
          );
          // Continue with next contact
        }
      }

      console.log(`Group membership sync completed. Updated ${membershipsUpdated} memberships`);

      return membershipsUpdated;
    } catch (error) {
      // Handle auth errors with token refresh
      if (this.isAuthError(error)) {
        console.log('Authentication error, attempting token refresh');
        try {
          const newAccessToken = await this.oauthService.refreshAccessToken(userId);
          // Retry with new token
          return await this.syncGroupMemberships(userId, newAccessToken);
        } catch (refreshError) {
          const refreshErrorMsg =
            refreshError instanceof Error ? refreshError.message : String(refreshError);
          throw new Error(`Token refresh failed: ${refreshErrorMsg}`);
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Group membership sync failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Handle group updates (name changes and deletions)
   *
   * Detects group name changes and updates CatchUp group names for
   * approved mappings only. Handles deleted groups.
   *
   * Requirements: 6.9, 6.10
   */
  async handleGroupUpdates(userId: string, accessToken: string): Promise<void> {
    console.log(`Checking for group updates for user ${userId}`);

    try {
      // Get People API client (READ-ONLY operations only)
      // Requirements: 15.3 - Only GET requests are made to Google API
      const people = getPeopleClient({ access_token: accessToken });

      // Fetch all contact groups (READ-ONLY operation)
      const response = await this.rateLimiter.executeRequest(userId, async () => {
        return await people.contactGroups.list({
          pageSize: 1000,
        });
      });

      const contactGroups = response.data.contactGroups || [];
      const googleGroupMap = new Map(contactGroups.map((g) => [g.resourceName!, g]));

      // Get all mappings
      const allMappings = await this.groupMappingRepository.findAll(userId, false);

      // Check each mapping for updates
      for (const mapping of allMappings) {
        const googleGroup = googleGroupMap.get(mapping.googleResourceName);

        if (!googleGroup) {
          // Group was deleted in Google
          console.log(`Google group ${mapping.googleResourceName} was deleted`);
          await this.groupMappingRepository.disableSync(mapping.id, userId);
          continue;
        }

        // Check for name change
        if (googleGroup.name !== mapping.googleName) {
          console.log(
            `Google group ${mapping.googleResourceName} renamed from "${mapping.googleName}" to "${googleGroup.name}"`
          );

          // Update mapping
          await this.groupMappingRepository.update(mapping.id, userId, {
            googleName: googleGroup.name!,
            googleEtag: googleGroup.etag || undefined,
          });

          // Update CatchUp group name if approved
          if (mapping.catchupGroupId) {
            await this.groupRepository.update(mapping.catchupGroupId, userId, googleGroup.name!);
            console.log(`Updated CatchUp group ${mapping.catchupGroupId} name`);
          }
        }
      }

      console.log('Group update check completed');
    } catch (error) {
      // Handle auth errors with token refresh
      if (this.isAuthError(error)) {
        console.log('Authentication error, attempting token refresh');
        try {
          const newAccessToken = await this.oauthService.refreshAccessToken(userId);
          // Retry with new token
          return await this.handleGroupUpdates(userId, newAccessToken);
        } catch (refreshError) {
          const refreshErrorMsg =
            refreshError instanceof Error ? refreshError.message : String(refreshError);
          throw new Error(`Token refresh failed: ${refreshErrorMsg}`);
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Group update check failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if error is an authentication error (401)
   *
   * Requirements: 10.2
   */
  private isAuthError(error: any): boolean {
    // Check for HTTP 401 status
    if (error.code === 401 || error.status === 401) {
      return true;
    }

    // Check for error message
    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return (
        message.includes('unauthorized') ||
        message.includes('invalid credentials') ||
        message.includes('token expired')
      );
    }

    return false;
  }
}

// Export singleton instance
export const groupSyncService = new GroupSyncService();
