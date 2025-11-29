# Design Document

## Overview

The Google Contacts Sync feature enables CatchUp users to seamlessly import and synchronize their contacts from Google Contacts. This integration leverages the Google People API v1 to provide both initial full imports and efficient incremental synchronization. The design emphasizes data integrity, security, performance, and user experience while handling edge cases like rate limiting, token expiration, and large contact lists.

The system architecture follows a layered approach with clear separation between OAuth management, sync orchestration, data persistence, and API routes. The design reuses existing infrastructure (OAuth token storage, encryption) while introducing new components for sync state management and contact group mapping.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Settings UI  │  │  Sync Status │  │ Contact List │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ HTTP/REST        │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────┐
│                      API Routes Layer                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ OAuth Routes     │  │  Sync Routes     │                │
│  │ /oauth/authorize │  │  /sync/full      │                │
│  │ /oauth/callback  │  │  /sync/increment │                │
│  │ /oauth/status    │  │  /sync/status    │                │
│  │ /oauth/disconnect│  │                  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
┌───────────▼──────────────────────▼──────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ OAuth Service        │  │ Sync Service         │        │
│  │ - Authorization URL  │  │ - Full Sync          │        │
│  │ - Token Exchange     │  │ - Incremental Sync   │        │
│  │ - Token Refresh      │  │ - Sync State Mgmt    │        │
│  └──────────┬───────────┘  └──────────┬───────────┘        │
│             │                          │                     │
│  ┌──────────▼──────────────────────────▼───────────┐       │
│  │         Import Service (Enhanced)                │       │
│  │  - Contact Import with Metadata                  │       │
│  │  - Deduplication Logic                           │       │
│  │  - Source Tracking                               │       │
│  └──────────┬───────────────────────────────────────┘       │
│             │                                                │
│  ┌──────────▼──────────────────────────────────────┐       │
│  │      Group Sync Service                          │       │
│  │  - Import Contact Groups                         │       │
│  │  - Map to CatchUp Groups                         │       │
│  │  - Sync Memberships                              │       │
│  └──────────┬───────────────────────────────────────┘       │
└─────────────┼────────────────────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────────────────────┐
│                  Repository Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ OAuth Repo   │  │ Contact Repo │  │ Sync State   │      │
│  │              │  │              │  │ Repo         │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                    PostgreSQL Database                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ oauth_tokens     │  │ contacts         │                 │
│  │ (encrypted)      │  │ (with source)    │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ sync_state       │  │ group_mappings   │                 │
│  └──────────────────┘  └──────────────────┘                 │
└───────────────────────────────────────────────────────────────┘
          │
          │ HTTPS
          │
┌─────────▼─────────────────────────────────────────────────────┐
│              Google People API v1                              │
│  - /people/me/connections (contacts)                           │
│  - /contactGroups (groups)                                     │
└────────────────────────────────────────────────────────────────┘
```

### Background Jobs Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Job Scheduler                              │
│  ┌────────────────────────────────────────────────┐          │
│  │  Cron: Daily (once per day)                    │          │
│  │  - Find users with google_contacts connected   │          │
│  │  - Queue incremental sync job for each user    │          │
│  └────────────────────┬───────────────────────────┘          │
└───────────────────────┼──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                    Job Queue (Bull)                           │
│  ┌────────────────────────────────────────────────┐          │
│  │  google-contacts-sync queue                    │          │
│  │  - Job: { userId, syncType }                   │          │
│  │  - Concurrency: 5                              │          │
│  │  - Retry: 3 attempts with backoff              │          │
│  └────────────────────┬───────────────────────────┘          │
└───────────────────────┼──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                 Sync Job Processor                            │
│  1. Retrieve OAuth token                                      │
│  2. Execute sync (full or incremental)                        │
│  3. Update sync state                                         │
│  4. Handle errors and retries                                 │
└───────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Google Contacts OAuth Service

**Purpose**: Manage OAuth 2.0 authentication flow for Google Contacts access.

**Interface**:
```typescript
interface GoogleContactsOAuthService {
  // Generate authorization URL for user consent
  getAuthorizationUrl(): string;
  
  // Exchange authorization code for tokens
  handleCallback(code: string, userId: string): Promise<OAuthTokens>;
  
  // Refresh expired access token
  refreshAccessToken(userId: string): Promise<string>;
  
  // Check if user has connected Google Contacts
  isConnected(userId: string): Promise<boolean>;
  
  // Disconnect and revoke tokens
  disconnect(userId: string): Promise<void>;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}
```

**Dependencies**:
- OAuth2Client from google-auth-library
- OAuthRepository for token storage
- Encryption utilities

### 2. Google Contacts Sync Service

**Purpose**: Orchestrate full and incremental synchronization of contacts.

**Interface**:
```typescript
interface GoogleContactsSyncService {
  // Perform full synchronization of all contacts
  performFullSync(userId: string, accessToken: string): Promise<SyncResult>;
  
  // Perform incremental sync using sync token
  performIncrementalSync(userId: string, accessToken: string): Promise<SyncResult>;
  
  // Get current sync state for user
  getSyncState(userId: string): Promise<SyncState | null>;
  
  // Store sync token after successful sync
  storeSyncToken(userId: string, syncToken: string): Promise<void>;
  
  // Handle sync token expiration (410 error)
  handleTokenExpiration(userId: string, accessToken: string): Promise<SyncResult>;
}

interface SyncResult {
  contactsImported?: number;
  contactsUpdated?: number;
  contactsDeleted?: number;
  groupsImported?: number;
  syncToken?: string;
  duration: number;
  errors: SyncError[];
}

interface SyncState {
  userId: string;
  syncToken: string | null;
  lastFullSyncAt: Date | null;
  lastIncrementalSyncAt: Date | null;
  totalContactsSynced: number;
  lastSyncStatus: 'pending' | 'in_progress' | 'success' | 'failed';
  lastSyncError: string | null;
}

interface SyncError {
  contactResourceName?: string;
  errorMessage: string;
  errorCode?: string;
}
```

**Dependencies**:
- Google People API client
- ImportService for contact processing
- GroupSyncService for group handling
- SyncStateRepository
- RateLimiter

### 3. Enhanced Import Service

**Purpose**: Import individual contacts with Google metadata tracking.

**Interface**:
```typescript
interface ImportService {
  // Import a single contact from Google Person object
  importContact(userId: string, person: GooglePerson): Promise<Contact>;
  
  // Find contact by Google resource name
  findByGoogleResourceName(userId: string, resourceName: string): Promise<Contact | null>;
  
  // Update existing contact with new data
  updateContact(contactId: string, userId: string, data: ContactData): Promise<Contact>;
  
  // Handle deleted contact from Google
  handleDeletedContact(userId: string, resourceName: string): Promise<void>;
  
  // Extract contact data from Google Person object
  extractContactData(person: GooglePerson): ContactData;
}

interface ContactData {
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  linkedinUrl: string | null;
  address: string | null;
  source: 'manual' | 'google' | 'calendar' | 'voice_note';
  googleResourceName?: string;
  googleEtag?: string;
  lastSyncedAt?: Date;
}

interface GooglePerson {
  resourceName: string;
  etag: string;
  names?: Array<{ displayName: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value: string; metadata?: { primary?: boolean } }>;
  phoneNumbers?: Array<{ value: string; metadata?: { primary?: boolean } }>;
  organizations?: Array<{ name?: string; title?: string }>;
  urls?: Array<{ value: string; type?: string }>;
  addresses?: Array<{ formattedValue?: string }>;
  memberships?: Array<{ contactGroupMembership?: { contactGroupResourceName: string } }>;
  metadata?: { deleted?: boolean };
}
```

**Dependencies**:
- ContactRepository
- Validation utilities
- Deduplication logic

### 4. Group Sync Service

**Purpose**: Synchronize Google contact groups with CatchUp groups and generate intelligent mapping suggestions.

**Interface**:
```typescript
interface GroupSyncService {
  // Sync all contact groups from Google and generate suggestions
  syncContactGroups(userId: string, accessToken: string): Promise<GroupSyncResult>;
  
  // Generate mapping suggestions for a Google group
  generateMappingSuggestion(userId: string, googleGroup: GoogleContactGroup): Promise<GroupMappingSuggestion>;
  
  // Find existing group mapping
  findGroupMapping(userId: string, googleResourceName: string): Promise<GroupMapping | null>;
  
  // Create new group mapping
  createGroupMapping(userId: string, mapping: GroupMappingData): Promise<GroupMapping>;
  
  // Update group mapping
  updateGroupMapping(mappingId: string, data: Partial<GroupMappingData>): Promise<GroupMapping>;
  
  // Approve a mapping suggestion
  approveMappingSuggestion(userId: string, suggestionId: string): Promise<GroupMapping>;
  
  // Reject a mapping suggestion
  rejectMappingSuggestion(userId: string, suggestionId: string): Promise<void>;
  
  // Get all pending mapping suggestions for user
  getPendingMappingSuggestions(userId: string): Promise<GroupMappingSuggestion[]>;
  
  // Sync group memberships for contacts (only for approved mappings)
  syncGroupMemberships(userId: string, contacts: Contact[]): Promise<void>;
}

interface GroupSyncResult {
  groupsImported: number;
  groupsUpdated: number;
  suggestionsGenerated: number;
  membershipsUpdated: number;
}

interface GroupMapping {
  id: string;
  userId: string;
  catchupGroupId: string | null;
  googleResourceName: string;
  googleName: string;
  googleEtag: string | null;
  memberCount: number;
  mappingStatus: 'pending' | 'approved' | 'rejected';
  lastSyncedAt: Date | null;
}

interface GroupMappingSuggestion {
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

interface GroupMappingData {
  catchupGroupId?: string;
  googleResourceName: string;
  googleName: string;
  googleEtag?: string;
  memberCount?: number;
  mappingStatus?: 'pending' | 'approved' | 'rejected';
}
```

**Dependencies**:
- Google People API client (read-only)
- GroupRepository
- GroupMappingRepository
- String similarity algorithm (for name matching)
- Contact overlap analysis

### 5. Rate Limiter

**Purpose**: Enforce API rate limits to prevent quota exhaustion.

**Interface**:
```typescript
interface RateLimiter {
  // Execute request with rate limiting
  executeRequest<T>(request: () => Promise<T>): Promise<T>;
  
  // Check if request can be made now
  canMakeRequest(): boolean;
  
  // Wait for available slot
  waitForSlot(): Promise<void>;
  
  // Handle rate limit error with backoff
  handleRateLimitError(): Promise<void>;
}
```

**Configuration**:
- Requests per minute per user: 500
- Requests per minute project-wide: 3000
- Backoff strategy: Exponential (1s, 2s, 4s, 8s, 16s, max 30s)

### 6. Sync State Repository

**Purpose**: Persist and retrieve sync state information.

**Interface**:
```typescript
interface SyncStateRepository {
  // Get sync state for user
  getSyncState(userId: string): Promise<SyncState | null>;
  
  // Create or update sync state
  upsertSyncState(userId: string, state: Partial<SyncState>): Promise<SyncState>;
  
  // Update sync token
  updateSyncToken(userId: string, syncToken: string): Promise<void>;
  
  // Mark sync as in progress
  markSyncInProgress(userId: string): Promise<void>;
  
  // Mark sync as complete
  markSyncComplete(userId: string, result: SyncResult): Promise<void>;
  
  // Mark sync as failed
  markSyncFailed(userId: string, error: string): Promise<void>;
}
```

## Data Models

### Database Schema Changes

#### 1. Contacts Table Enhancement

```sql
ALTER TABLE contacts 
  ADD COLUMN source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN google_resource_name VARCHAR(255),
  ADD COLUMN google_etag VARCHAR(255),
  ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_contacts_google_resource_name ON contacts(google_resource_name);
CREATE UNIQUE INDEX idx_contacts_user_google_resource 
  ON contacts(user_id, google_resource_name) 
  WHERE google_resource_name IS NOT NULL;
```

**Fields**:
- `source`: Origin of contact (manual, google, calendar, voice_note)
- `google_resource_name`: Google's unique identifier (e.g., "people/c1234567890")
- `google_etag`: ETag for optimistic concurrency control
- `last_synced_at`: Timestamp of last sync from Google

#### 2. Google Contacts Sync State Table

```sql
CREATE TABLE google_contacts_sync_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_token TEXT,
    last_full_sync_at TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    total_contacts_synced INTEGER DEFAULT 0,
    last_sync_status VARCHAR(50) DEFAULT 'pending',
    last_sync_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_google_contacts_sync_state_user_id 
  ON google_contacts_sync_state(user_id);
```

**Purpose**: Track synchronization state per user including sync tokens and status.

#### 3. Google Contact Groups Mapping Table

```sql
CREATE TABLE google_contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catchup_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    google_resource_name VARCHAR(255) NOT NULL,
    google_name VARCHAR(255) NOT NULL,
    google_etag VARCHAR(255),
    google_group_type VARCHAR(50) DEFAULT 'USER_CONTACT_GROUP',
    member_count INTEGER DEFAULT 0,
    mapping_status VARCHAR(50) DEFAULT 'pending',
    suggested_action VARCHAR(50),
    suggested_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    suggested_group_name VARCHAR(255),
    confidence_score DECIMAL(3,2),
    suggestion_reason TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, google_resource_name)
);

CREATE INDEX idx_google_contact_groups_user_id 
  ON google_contact_groups(user_id);
CREATE INDEX idx_google_contact_groups_catchup_group_id 
  ON google_contact_groups(catchup_group_id);
CREATE INDEX idx_google_contact_groups_mapping_status 
  ON google_contact_groups(mapping_status);
```

**Purpose**: Map Google contact groups to CatchUp groups, store mapping suggestions, and track approval status.

**New Fields**:
- `mapping_status`: Approval state (pending, approved, rejected)
- `suggested_action`: Recommendation type (create_new, map_to_existing)
- `suggested_group_id`: Existing CatchUp group to map to (if applicable)
- `suggested_group_name`: Suggested name for new group (if creating)
- `confidence_score`: AI confidence in the suggestion (0.00-1.00)
- `suggestion_reason`: Human-readable explanation of the suggestion

### Entity Relationships

```
users (1) ──────< (N) oauth_tokens
  │                     (provider: 'google_contacts')
  │
  ├──────< (1) google_contacts_sync_state
  │
  ├──────< (N) contacts
  │              (source: 'google', google_resource_name, google_etag)
  │
  ├──────< (N) groups
  │
  └──────< (N) google_contact_groups
                 │
                 └──────> (1) groups (catchup_group_id)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

Before defining the correctness properties, I've analyzed the testable acceptance criteria to eliminate redundancy:

**Redundancies Identified:**
- Properties 2.7 and 13.4 both test that duplicates result in updates rather than creates - these can be combined
- Properties 2.4 and 6.3 both test metadata storage - can be combined into a single comprehensive property
- Properties 3.5 and 2.5 both test sync token storage - can be combined
- Properties 5.1, 5.2, 5.3 all test contact source display - can be combined into one comprehensive property
- Properties 7.2 and 11.4 both test token deletion on disconnect - redundant
- Properties 13.1, 13.2, 13.3 test deduplication order - can be combined into one property about the deduplication algorithm

**Consolidated Properties:**
After reflection, we'll focus on unique, high-value properties that provide comprehensive validation without redundancy.

### Correctness Properties

Property 1: OAuth token encryption round-trip
*For any* OAuth token string, encrypting then decrypting the token should return the original token value
**Validates: Requirements 1.3, 11.1**

Property 2: OAuth callback triggers full sync
*For any* successful OAuth callback, a full synchronization job should be queued for the user
**Validates: Requirements 2.1**

Property 3: Full sync pagination completeness
*For any* contact list size, performing a full sync should fetch all pages until no nextPageToken is returned
**Validates: Requirements 2.2, 12.2**

Property 4: Contact field extraction completeness
*For any* Google Person object with populated fields, extracting contact data should include all specified fields (name, email, phone, organization, URL, address, memberships)
**Validates: Requirements 2.3**

Property 5: Google metadata storage
*For any* imported contact or group, the Google resource name, ETag, and source designation should be stored correctly
**Validates: Requirements 2.4, 6.3**

Property 6: Sync token persistence
*For any* completed sync (full or incremental), the returned sync token should be stored in the sync state table
**Validates: Requirements 2.5, 3.5**

Property 7: Deduplication prevents duplicates
*For any* contact import where a matching contact exists (by resource name, email, or phone), the system should update the existing contact rather than create a new one, and the total contact count should not increase
**Validates: Requirements 2.6, 2.7, 13.1, 13.2, 13.3, 13.4**

Property 8: Sync result accuracy
*For any* completed sync, the returned SyncResult should accurately reflect the number of contacts imported, updated, and deleted
**Validates: Requirements 2.8, 4.3**

Property 9: Incremental sync uses sync token
*For any* user with a stored sync token, performing a sync should use the incremental sync API with the sync token parameter
**Validates: Requirements 3.1, 3.2**

Property 10: Deleted contacts are archived
*For any* contact with metadata.deleted=true from Google, the contact should be archived or soft-deleted in CatchUp
**Validates: Requirements 3.3**

Property 11: Contact updates preserve data
*For any* contact updated during sync, the contact data should match the Google data while preserving manually added CatchUp-specific fields
**Validates: Requirements 3.4, 13.5**

Property 12: Concurrent sync prevention
*For any* user, when multiple sync requests are made simultaneously, only one sync should execute at a time and subsequent requests should be queued
**Validates: Requirements 4.5**

Property 13: Contact source filtering
*For any* contact list, filtering by source="google" should return only contacts with that source designation
**Validates: Requirements 5.3**

Property 14: Source designation persistence
*For any* Google-sourced contact, editing the contact should not change the source field from "google"
**Validates: Requirements 5.4**

Property 15: Group import completeness
*For any* full sync, all user-created contact groups from Google should be imported and have corresponding CatchUp groups created
**Validates: Requirements 6.1, 6.2**

Property 16: Group membership sync
*For any* contact with Google group memberships, the contact should be added to the corresponding CatchUp groups
**Validates: Requirements 6.4**

Property 17: Group name synchronization
*For any* Google group that has been renamed, the next sync should update the corresponding CatchUp group name to match
**Validates: Requirements 6.5**

Property 18: Disconnect removes tokens
*For any* user who disconnects Google Contacts, all OAuth tokens for the google_contacts provider should be deleted from the database
**Validates: Requirements 7.2, 11.4**

Property 19: Disconnect preserves contacts
*For any* user who disconnects, existing contacts should remain in the database but sync metadata should be cleared
**Validates: Requirements 7.4**

Property 20: Reconnect triggers full sync
*For any* user who reconnects after disconnection, a full synchronization should be initiated
**Validates: Requirements 7.5**

Property 21: Rate limiting enforcement
*For any* user, making more than 500 API requests within a 60-second window should result in throttling and delayed execution
**Validates: Requirements 9.1, 9.3**

Property 22: Network error retry with backoff
*For any* network error during sync, the system should retry up to 3 times with exponentially increasing delays
**Validates: Requirements 10.1**

Property 23: Token refresh on expiration
*For any* API request with an expired access token, the system should attempt to refresh the token using the refresh token
**Validates: Requirements 10.2**

Property 24: Error isolation during import
*For any* contact that fails to import, the error should be logged and the sync should continue processing remaining contacts
**Validates: Requirements 10.4**

Property 25: Sync error persistence
*For any* sync that fails completely, the error details should be stored in the sync state table with status='failed'
**Validates: Requirements 10.5**

Property 26: Batch database operations
*For any* sync importing multiple contacts, database inserts and updates should be batched to minimize the number of database round-trips
**Validates: Requirements 12.3**

Property 27: Group mapping suggestions are generated
*For any* Google contact group imported during full sync, a mapping suggestion should be generated and stored with status "pending"
**Validates: Requirements 6.1, 6.2, 6.3**

Property 28: Approved mappings create groups
*For any* pending mapping suggestion that is approved, the system should create or link the CatchUp group and update the mapping status to "approved"
**Validates: Requirements 6.6**

Property 29: Rejected mappings exclude groups
*For any* pending mapping suggestion that is rejected, the system should update the status to "rejected" and exclude the group from membership sync
**Validates: Requirements 6.7**

Property 30: Only approved mappings sync memberships
*For any* contact with Google group memberships, the contact should only be added to CatchUp groups with "approved" mapping status
**Validates: Requirements 6.8**

Property 31: Read-only API operations
*For any* API call to Google People API, the system should use only GET requests and never POST, PUT, PATCH, or DELETE operations
**Validates: Requirements 15.2, 15.3**

Property 32: Local edits stay local
*For any* contact edited in CatchUp, the changes should be persisted only to the local database and no API calls should be made to Google Contacts
**Validates: Requirements 15.4**

## Group Mapping Suggestion Algorithm

### Overview

The group mapping suggestion system analyzes Google contact groups and recommends whether to create new CatchUp groups or map to existing ones. This prevents automatic pollution of the user's group structure while maintaining organizational benefits.

### Suggestion Generation Process

```typescript
async function generateMappingSuggestion(
  userId: string, 
  googleGroup: GoogleContactGroup
): Promise<GroupMappingSuggestion> {
  // 1. Fetch all existing CatchUp groups for user
  const existingGroups = await groupRepository.findByUserId(userId);
  
  // 2. Calculate similarity scores
  const similarities = existingGroups.map(group => ({
    group,
    nameScore: calculateStringSimilarity(googleGroup.name, group.name),
    memberOverlap: calculateMemberOverlap(googleGroup, group)
  }));
  
  // 3. Find best match
  const bestMatch = similarities
    .filter(s => s.nameScore > 0.7 || s.memberOverlap > 0.5)
    .sort((a, b) => (b.nameScore + b.memberOverlap) - (a.nameScore + a.memberOverlap))[0];
  
  // 4. Generate suggestion
  if (bestMatch && (bestMatch.nameScore > 0.8 || bestMatch.memberOverlap > 0.6)) {
    return {
      suggestedAction: 'map_to_existing',
      suggestedGroupId: bestMatch.group.id,
      suggestedGroupName: bestMatch.group.name,
      confidenceScore: (bestMatch.nameScore + bestMatch.memberOverlap) / 2,
      reason: `Similar name (${Math.round(bestMatch.nameScore * 100)}% match) and ${Math.round(bestMatch.memberOverlap * 100)}% member overlap`
    };
  } else {
    return {
      suggestedAction: 'create_new',
      suggestedGroupName: googleGroup.name,
      confidenceScore: 0.9,
      reason: 'No similar existing group found'
    };
  }
}
```

### Similarity Algorithms

**Name Similarity (Levenshtein Distance)**
```typescript
function calculateStringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(
    str1.toLowerCase().trim(), 
    str2.toLowerCase().trim()
  );
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}
```

**Member Overlap (Jaccard Index)**
```typescript
function calculateMemberOverlap(
  googleGroup: GoogleContactGroup, 
  catchupGroup: Group
): number {
  const googleMembers = new Set(googleGroup.memberResourceNames);
  const catchupMembers = new Set(
    catchupGroup.contacts
      .filter(c => c.googleResourceName)
      .map(c => c.googleResourceName)
  );
  
  const intersection = new Set(
    [...googleMembers].filter(m => catchupMembers.has(m))
  );
  const union = new Set([...googleMembers, ...catchupMembers]);
  
  return intersection.size / union.size;
}
```

### Confidence Scoring

- **High Confidence (0.8-1.0)**: Strong name match OR high member overlap
- **Medium Confidence (0.6-0.8)**: Moderate name match AND some member overlap
- **Low Confidence (0.0-0.6)**: Weak signals, suggest creating new group

### User Review Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Full Sync Triggered                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          Fetch Google Contact Groups                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│     For Each Group: Generate Mapping Suggestion              │
│     - Analyze existing CatchUp groups                        │
│     - Calculate similarity scores                            │
│     - Store suggestion with status="pending"                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          User Views Settings Page                            │
│     - Display all pending suggestions                        │
│     - Show confidence scores and reasons                     │
│     - Provide approve/reject actions                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  User Approves   │    │  User Rejects    │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Create/Link      │    │ Mark as Rejected │
│ CatchUp Group    │    │ Exclude from     │
│ Update status    │    │ Membership Sync  │
│ to "approved"    │    └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Sync Group       │
│ Memberships      │
└──────────────────┘
```

## Error Handling

### Error Categories and Strategies

#### 1. OAuth Errors

**Token Expiration**
- Detection: 401 Unauthorized response from Google API
- Handling: Attempt token refresh using refresh token
- Fallback: If refresh fails, mark connection as disconnected and notify user
- User Action: Reconnect Google Contacts account

**Invalid Grant**
- Detection: OAuth callback with invalid authorization code
- Handling: Display error message to user
- User Action: Retry OAuth flow

**Scope Insufficient**
- Detection: 403 Forbidden with insufficient permissions
- Handling: Log error and notify user
- User Action: Reconnect with proper scopes

#### 2. API Errors

**Rate Limiting (429)**
- Detection: 429 Too Many Requests response
- Handling: Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
- Retry: Up to 5 attempts
- Logging: Log rate limit events for monitoring

**Sync Token Expiration (410)**
- Detection: 410 Gone response when using sync token
- Handling: Automatically trigger full synchronization
- Logging: Log token expiration event
- Recovery: Full sync establishes new sync token

**Network Errors**
- Detection: Connection timeout, DNS failure, network unreachable
- Handling: Retry up to 3 times with exponential backoff
- Logging: Log network errors with context
- Fallback: Mark sync as failed if all retries exhausted

**Server Errors (5xx)**
- Detection: 500, 502, 503, 504 responses
- Handling: Retry up to 3 times with exponential backoff
- Logging: Log server errors
- Fallback: Mark sync as failed

#### 3. Data Validation Errors

**Missing Required Fields**
- Detection: Contact missing name or all contact methods
- Handling: Log warning and skip contact
- Continue: Process remaining contacts

**Invalid Data Format**
- Detection: Malformed email, phone, or URL
- Handling: Log validation error and skip field
- Continue: Import contact with valid fields only

**Duplicate Detection Conflicts**
- Detection: Multiple potential matches during deduplication
- Handling: Use first match found (resource name > email > phone priority)
- Logging: Log ambiguous matches for review

#### 4. Database Errors

**Connection Failure**
- Detection: Database connection timeout or error
- Handling: Retry database operation up to 3 times
- Fallback: Mark sync as failed and log error
- Alert: Trigger monitoring alert for database issues

**Constraint Violations**
- Detection: Unique constraint or foreign key violation
- Handling: Log error with details
- Continue: Skip problematic record and continue sync

**Transaction Failures**
- Detection: Transaction rollback or deadlock
- Handling: Retry transaction up to 3 times
- Fallback: Mark sync as failed

### Error Response Format

```typescript
interface SyncError {
  code: string;
  message: string;
  contactResourceName?: string;
  timestamp: Date;
  retryable: boolean;
  userAction?: string;
}

// Example error responses
const errors = {
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'OAuth token has expired',
    retryable: true,
    userAction: 'Reconnect your Google Contacts account'
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'API rate limit exceeded',
    retryable: true,
    userAction: 'Sync will retry automatically'
  },
  SYNC_TOKEN_EXPIRED: {
    code: 'SYNC_TOKEN_EXPIRED',
    message: 'Sync token expired, performing full sync',
    retryable: true,
    userAction: 'None - automatic recovery'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
    retryable: true,
    userAction: 'Check internet connection and retry'
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Contact data validation failed',
    retryable: false,
    userAction: 'Contact will be skipped'
  }
};
```

### Error Logging

All errors should be logged with:
- Error code and message
- User ID
- Timestamp
- Request context (sync type, contact resource name)
- Stack trace (for unexpected errors)
- Retry attempt number

## Testing Strategy

### Unit Testing

**OAuth Service Tests**
- Authorization URL generation with correct parameters
- Token exchange with valid authorization code
- Token refresh with valid refresh token
- Token encryption and decryption
- Error handling for invalid tokens

**Sync Service Tests**
- Full sync pagination logic
- Incremental sync with sync token
- Sync token storage and retrieval
- Sync state management (in_progress, success, failed)
- Error handling for 410 (token expiration)

**Import Service Tests**
- Contact data extraction from Google Person objects
- Deduplication logic (resource name, email, phone)
- Metadata storage (resource name, etag, source)
- Handling of deleted contacts
- Validation error handling

**Group Sync Service Tests**
- Group import and mapping creation
- Group membership synchronization
- Group name updates
- Handling of deleted groups

**Rate Limiter Tests**
- Request throttling at 500 requests/minute
- Exponential backoff on 429 errors
- Window reset behavior
- Concurrent request handling

### Property-Based Testing

The testing framework for this project is **fast-check** (TypeScript/JavaScript property-based testing library).

**Configuration**: Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Test Annotations**: Each property-based test must include a comment explicitly referencing the correctness property from the design document using this format:
```typescript
// Feature: google-contacts-sync, Property 1: OAuth token encryption round-trip
```

**Property Test Examples**:

```typescript
import fc from 'fast-check';

// Feature: google-contacts-sync, Property 1: OAuth token encryption round-trip
test('OAuth token encryption round-trip', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 10 }), (token) => {
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
      expect(encrypted).not.toBe(token);
    }),
    { numRuns: 100 }
  );
});

// Feature: google-contacts-sync, Property 7: Deduplication prevents duplicates
test('Deduplication prevents duplicates', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.array(fc.record({
        name: fc.string(),
        email: fc.emailAddress(),
        phone: fc.string()
      })),
      async (contacts) => {
        const initialCount = await getContactCount(userId);
        
        // Import contacts twice
        await importContacts(userId, contacts);
        await importContacts(userId, contacts);
        
        const finalCount = await getContactCount(userId);
        expect(finalCount).toBe(initialCount + contacts.length);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: google-contacts-sync, Property 21: Rate limiting enforcement
test('Rate limiting enforcement', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 501, max: 600 }),
      async (requestCount) => {
        const startTime = Date.now();
        const requests = Array(requestCount).fill(null).map(() => 
          rateLimiter.executeRequest(() => Promise.resolve())
        );
        
        await Promise.all(requests);
        const duration = Date.now() - startTime;
        
        // Should take at least 60 seconds due to rate limiting
        expect(duration).toBeGreaterThanOrEqual(60000);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End OAuth Flow**
- Complete OAuth flow from authorization to token storage
- Token encryption verification
- Sync trigger after OAuth completion

**Full Sync Integration**
- Mock Google API responses with multiple pages
- Verify all contacts imported
- Verify sync token stored
- Verify group mappings created

**Incremental Sync Integration**
- Mock changed contacts response
- Verify only changed contacts processed
- Verify sync token updated
- Verify deleted contacts archived

**Background Job Integration**
- Verify scheduled sync jobs execute
- Verify job retry on failure
- Verify concurrent job handling

### Mock Data Strategy

**Google API Response Mocks**
```typescript
const mockGooglePerson = {
  resourceName: 'people/c1234567890',
  etag: '%EgUBAgMFBw==',
  names: [{ displayName: 'John Doe', givenName: 'John', familyName: 'Doe' }],
  emailAddresses: [{ value: 'john@example.com', metadata: { primary: true } }],
  phoneNumbers: [{ value: '+1234567890', metadata: { primary: true } }],
  organizations: [{ name: 'Acme Corp', title: 'Engineer' }],
  urls: [{ value: 'https://linkedin.com/in/johndoe', type: 'profile' }],
  memberships: [{
    contactGroupMembership: { contactGroupResourceName: 'contactGroups/group1' }
  }]
};

const mockContactGroup = {
  resourceName: 'contactGroups/group1',
  etag: '%EgUBAgMFBw==',
  name: 'Friends',
  groupType: 'USER_CONTACT_GROUP',
  memberCount: 10
};
```

**Test Fixtures**
- Various contact structures (minimal, complete, missing fields)
- Edge cases (no name, no email, no phone)
- Large contact lists (1000+ contacts)
- Pagination scenarios (multiple pages)
- Error responses (401, 403, 429, 410, 500)

### Manual Testing Checklist

- [ ] Connect Google Contacts account via OAuth
- [ ] Verify initial full sync imports all contacts
- [ ] Verify contact source indicators display correctly
- [ ] Trigger manual sync and verify updates
- [ ] Verify automatic sync runs once daily
- [ ] Add contact in Google, verify it syncs to CatchUp
- [ ] Update contact in Google, verify changes sync
- [ ] Delete contact in Google, verify it archives in CatchUp
- [ ] Rename group in Google, verify CatchUp group updates
- [ ] Disconnect Google Contacts, verify tokens removed
- [ ] Reconnect Google Contacts, verify full sync triggers
- [ ] Test with large contact list (500+ contacts)
- [ ] Verify sync status displays correctly
- [ ] Verify error messages for failed syncs
- [ ] Test rate limiting with rapid sync requests

## Performance Considerations

### Optimization Strategies

**Pagination**
- Use maximum page size (1000) for full sync
- Use smaller page size (100) for incremental sync
- Fetch pages in parallel where possible (with rate limiting)

**Database Operations**
- Batch inserts and updates (100 contacts per batch)
- Use transactions for consistency
- Create indexes on frequently queried fields (source, google_resource_name)
- Use connection pooling

**Caching**
- Cache group mappings in memory during sync
- Cache sync state to reduce database queries
- Use Redis for distributed caching if available

**Background Processing**
- Use job queue (Bull) for async sync operations
- Set appropriate concurrency limits (5 concurrent syncs)
- Implement job prioritization (manual > automatic)

### Performance Targets

- Full sync: < 2 minutes for 500 contacts
- Incremental sync: < 30 seconds for 50 changes
- OAuth flow: < 5 seconds from callback to token storage
- Manual sync trigger: < 1 second to queue job
- API response time: < 500ms for status endpoints

### Monitoring Metrics

- Sync duration (p50, p95, p99)
- Sync success rate
- API error rate by type
- Rate limit hit frequency
- Database query performance
- Job queue depth and processing time

## One-Way Sync Guarantees

### Read-Only Architecture

The Google Contacts integration is designed as a **strictly one-way, read-only sync** from Google to CatchUp. This architecture ensures that:

1. **No data is ever written back to Google Contacts**
2. **User's Google data remains completely unchanged**
3. **All edits in CatchUp stay local**

### Implementation Safeguards

**OAuth Scope Restrictions**
```typescript
const GOOGLE_CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',  // Read-only access
  'https://www.googleapis.com/auth/contacts.other.readonly'  // Read-only other contacts
];

// NEVER request write scopes:
// ❌ 'https://www.googleapis.com/auth/contacts' (read/write)
```

**API Client Configuration**
```typescript
class GoogleContactsClient {
  // Only allow GET requests
  private async makeRequest(method: 'GET', endpoint: string) {
    if (method !== 'GET') {
      throw new Error('Only GET requests are allowed for Google Contacts');
    }
    // ... make request
  }
  
  // Explicitly disable write methods
  async createContact() {
    throw new Error('Creating contacts in Google is not supported');
  }
  
  async updateContact() {
    throw new Error('Updating contacts in Google is not supported');
  }
  
  async deleteContact() {
    throw new Error('Deleting contacts in Google is not supported');
  }
}
```

**Local Edit Handling**
```typescript
// When user edits a contact in CatchUp
async function updateContact(contactId: string, updates: ContactData) {
  // 1. Update local database only
  await contactRepository.update(contactId, updates);
  
  // 2. NEVER call Google API
  // ❌ await googleContactsClient.updateContact(...)
  
  // 3. Preserve Google metadata for future syncs
  // Keep google_resource_name, google_etag intact
}
```

### UI Transparency

**Settings Page Notice**
```
┌─────────────────────────────────────────────────────────────┐
│  Google Contacts Integration                                 │
│                                                              │
│  ℹ️  One-Way Sync (Read-Only)                               │
│  CatchUp imports your contacts from Google but never        │
│  modifies your Google Contacts. All edits you make in       │
│  CatchUp stay local and won't affect your Google account.   │
│                                                              │
│  ✓ Your Google Contacts remain unchanged                    │
│  ✓ Safe to connect without risk of data loss                │
│  ✓ Disconnect anytime without affecting Google              │
└─────────────────────────────────────────────────────────────┘
```

**Sync Status Display**
```
Last sync: 2 hours ago
Contacts synced: 247
Status: ✓ Connected (Read-Only)

Your Google Contacts remain unchanged
```

### Testing Verification

**Property-Based Test**
```typescript
// Feature: google-contacts-sync, Property 31: Read-only API operations
test('All Google API calls are read-only', () => {
  fc.assert(
    fc.property(fc.array(fc.string()), async (contactIds) => {
      const apiCalls = await captureApiCalls(async () => {
        await syncService.performFullSync(userId, accessToken);
      });
      
      // Verify all calls are GET requests
      expect(apiCalls.every(call => call.method === 'GET')).toBe(true);
      
      // Verify no write operations
      const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
      expect(apiCalls.some(call => writeOperations.includes(call.method))).toBe(false);
    }),
    { numRuns: 100 }
  );
});
```

## Security Considerations

### Data Protection

**Token Security**
- Encrypt OAuth tokens at rest using AES-256
- Use environment variable for encryption key
- Rotate encryption keys periodically
- Never log tokens in plaintext

**API Communication**
- Use HTTPS for all Google API requests
- Validate SSL certificates
- Use secure OAuth redirect URIs

**Access Control**
- Verify user ownership before sync operations
- Validate JWT tokens on all API endpoints
- Implement rate limiting per user
- Prevent unauthorized access to sync endpoints

### Privacy Compliance

**GDPR Requirements**
- Provide clear consent for data access
- Allow users to disconnect and delete data
- Implement data export functionality
- Maintain audit logs of data access

**Data Minimization**
- Request only required OAuth scopes
- Import only necessary contact fields
- Delete tokens on disconnect
- Implement data retention policies

### Audit Logging

Log the following events:
- OAuth connection and disconnection
- Sync operations (start, complete, fail)
- Token refresh attempts
- API errors and rate limits
- Data access and modifications

## Deployment Considerations

### Environment Variables

```bash
# Google OAuth (can reuse Calendar credentials)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CONTACTS_REDIRECT_URI=https://yourdomain.com/api/contacts/oauth/callback

# Encryption
ENCRYPTION_KEY=your_encryption_key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/catchup_db

# Job Queue
REDIS_URL=redis://localhost:6379
```

### Database Migrations

Run migrations in order:
1. `010_add_google_contacts_sync.sql` - Add contact source tracking
2. `011_create_google_contacts_sync_state.sql` - Create sync state table
3. `012_create_google_contact_groups.sql` - Create group mapping table

### Google Cloud Console Setup

1. Enable People API in Google Cloud Console
2. Configure OAuth consent screen with contacts scope
3. Add authorized redirect URIs
4. Monitor API quotas and usage

### Monitoring and Alerts

**Alerts to Configure**:
- Sync failure rate > 5%
- API error rate > 1%
- Sync duration > 5 minutes
- Token refresh failure
- Database connection errors

**Dashboards**:
- Sync operations per hour
- Success/failure rates
- API quota usage
- Job queue metrics
- Error distribution by type

## Future Enhancements

### Phase 2 Features

**Two-Way Sync**
- Push CatchUp contact changes to Google
- Sync tags as Google contact labels
- Handle bidirectional conflicts

**Real-Time Sync**
- Implement Google push notifications (webhooks)
- Receive instant updates on contact changes
- Reduce sync latency to seconds

**Selective Sync**
- Choose specific contact groups to sync
- Filter by contact attributes
- Exclude certain contacts from sync

**Smart Merge**
- AI-powered duplicate detection
- Automatic merge suggestions
- Confidence scoring for matches

### Advanced Features

**Multi-Account Support**
- Sync from multiple Google accounts
- Merge contacts across accounts
- Account-specific settings

**Sync Analytics**
- Dashboard showing sync health
- Contact growth over time
- Sync performance trends
- Error analysis and insights

**Enhanced Group Management**
- Bidirectional group sync
- Group hierarchy support
- Bulk group operations
