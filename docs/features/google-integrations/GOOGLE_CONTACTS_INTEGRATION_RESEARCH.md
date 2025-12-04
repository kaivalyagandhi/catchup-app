# Google Contacts Integration Research & Implementation Guide

## Executive Summary

This document provides comprehensive research and recommendations for implementing a full Google Contacts integration in CatchUp, including contact import/sync, contact groups, and metadata management. The analysis covers current implementation status, API capabilities, architecture recommendations, and a roadmap for feature development.

## Current Implementation Status

### What's Already Implemented

**Import Service** (`src/contacts/import-service.ts`)
- Basic one-time import from Google Contacts using People API v1
- OAuth2 authentication with access token
- Extracts: names, emails, phones, LinkedIn URLs, organizations, biographies, addresses
- Deduplication logic based on email and phone number matching
- Error handling for individual contact import failures

**Onboarding Service** (`src/contacts/onboarding-service.ts`)
- Preview imported contacts before finalizing
- Archival workflow for marking contacts as not relevant
- Restore archived contacts functionality

**Database Schema**
- `contacts` table with `archived` boolean field
- `oauth_tokens` table stores provider credentials with scope field
- No tracking of import source (manual vs automatic)
- No sync token storage for incremental updates
- No Google contact group mapping

### What's Missing

1. **Contact Source Tracking**: No way to identify if a contact was imported from Google or created manually
2. **Sync Functionality**: No incremental sync using sync tokens
3. **Contact Groups Import**: Google contact groups are not imported or mapped
4. **Bidirectional Sync**: No ability to push changes back to Google
5. **Metadata Preservation**: Google resource names and ETags not stored
6. **Sync State Management**: No tracking of last sync time or sync tokens
7. **OAuth Scope**: Current implementation may not request contacts scope
8. **API Routes**: No dedicated OAuth flow for Google Contacts (separate from Calendar)


## Google People API Capabilities

### Core Endpoints

**Contacts Management**
- `GET /v1/people/me/connections` - List all user contacts with pagination
- `POST /v1/people:createContact` - Create new contact
- `PATCH /v1/{resourceName}:updateContact` - Update existing contact
- `DELETE /v1/{resourceName}:deleteContact` - Delete contact
- `POST /v1/people:batchCreateContacts` - Batch create (up to 200 contacts)
- `POST /v1/people:batchUpdateContacts` - Batch update contacts
- `POST /v1/people:batchDeleteContacts` - Batch delete contacts
- `GET /v1/people:searchContacts` - Search contacts (requires warmup request)

**Contact Groups**
- `GET /v1/contactGroups` - List all contact groups
- `POST /v1/contactGroups` - Create new contact group
- `GET /v1/contactGroups/{resourceName}` - Get specific group
- `PUT /v1/contactGroups/{resourceName}` - Update group name
- `DELETE /v1/contactGroups/{resourceName}` - Delete group
- `POST /v1/contactGroups/{resourceName}/members:modify` - Add/remove members

**Other Contacts**
- `GET /v1/otherContacts` - List "Other contacts" (not in contact groups)
- `POST /v1/otherContacts/{resourceName}:copyOtherContactToMyContactsGroup` - Move to main contacts

### Sync Capabilities

**Incremental Sync with Sync Tokens**
- Initial request: `GET /v1/people/me/connections?requestSyncToken=true&personFields=...`
- Returns `nextSyncToken` on last page
- Subsequent sync: `GET /v1/people/me/connections?syncToken={token}&personFields=...`
- Deleted contacts returned with `metadata.deleted=true`
- Sync tokens expire after 7 days
- On expiration (410 error), full sync required
- All parameters must match initial request when using sync token

**Pagination**
- `pageSize`: 1-1000 contacts per page (default 100)
- `pageToken`: For retrieving subsequent pages
- `nextPageToken`: Returned when more results available

### Available Person Fields

**Core Fields**
- `names` - Display name, given name, family name
- `emailAddresses` - Email with primary flag
- `phoneNumbers` - Phone with primary flag
- `addresses` - Physical addresses
- `organizations` - Company, title, department
- `biographies` - About/bio text
- `urls` - Websites including LinkedIn
- `photos` - Profile photos

**Additional Fields**
- `birthdays`, `events`, `relations`, `nicknames`
- `interests`, `skills`, `occupations`
- `memberships` - Contact group memberships
- `metadata` - Source info, ETags, update time, deleted flag
- `userDefined` - Custom fields

### OAuth Scopes Required

**Read-Only Access**
- `https://www.googleapis.com/auth/contacts.readonly`

**Read-Write Access**
- `https://www.googleapis.com/auth/contacts`


## Recommended Architecture

### Database Schema Changes

**1. Add Contact Source Tracking**

```sql
-- Add to contacts table
ALTER TABLE contacts ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE contacts ADD COLUMN google_resource_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN google_etag VARCHAR(255);
ALTER TABLE contacts ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_contacts_google_resource_name ON contacts(google_resource_name);
```

**2. Create Sync State Table**

```sql
CREATE TABLE IF NOT EXISTS google_contacts_sync_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_token TEXT,
    last_full_sync_at TIMESTAMP WITH TIME ZONE,
    last_incremental_sync_at TIMESTAMP WITH TIME ZONE,
    total_contacts_synced INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_google_contacts_sync_state_user_id ON google_contacts_sync_state(user_id);
```

**3. Create Contact Group Mapping Table**

```sql
CREATE TABLE IF NOT EXISTS google_contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catchup_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    google_resource_name VARCHAR(255) NOT NULL,
    google_name VARCHAR(255) NOT NULL,
    google_etag VARCHAR(255),
    member_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, google_resource_name)
);

CREATE INDEX idx_google_contact_groups_user_id ON google_contact_groups(user_id);
CREATE INDEX idx_google_contact_groups_catchup_group_id ON google_contact_groups(catchup_group_id);
CREATE INDEX idx_google_contact_groups_google_resource_name ON google_contact_groups(google_resource_name);
```

**4. Update OAuth Tokens Table**

The existing `oauth_tokens` table already has a `scope` field, but ensure it stores the contacts scope:
- For read-only: `https://www.googleapis.com/auth/contacts.readonly`
- For read-write: `https://www.googleapis.com/auth/contacts`

### Service Layer Architecture

**1. Google Contacts OAuth Service** (`src/integrations/google-contacts-oauth.ts`)
- Handle OAuth flow specifically for Google Contacts
- Request appropriate scopes
- Store tokens with provider name `google_contacts`
- Reuse existing OAuth token repository

**2. Google Contacts Sync Service** (`src/integrations/google-contacts-sync-service.ts`)
- Manage sync state (full sync vs incremental)
- Handle sync token lifecycle
- Coordinate contact and group synchronization
- Handle 410 errors (expired sync tokens)
- Implement retry logic with exponential backoff

**3. Enhanced Import Service** (`src/contacts/import-service.ts`)
- Add `source` parameter to track import origin
- Store Google metadata (resource name, etag)
- Support both full import and incremental sync
- Handle contact updates (not just creates)
- Map Google contact groups to CatchUp groups

**4. Contact Group Sync Service** (`src/contacts/google-group-sync-service.ts`)
- Import Google contact groups
- Map to CatchUp groups
- Sync group memberships
- Handle group renames and deletions


### API Routes

**OAuth Flow** (`src/api/routes/google-contacts-oauth.ts`)
```
GET  /api/contacts/oauth/authorize      - Get authorization URL
GET  /api/contacts/oauth/callback       - Handle OAuth callback
GET  /api/contacts/oauth/status         - Check connection status
DELETE /api/contacts/oauth/disconnect   - Disconnect Google Contacts
```

**Sync Operations** (`src/api/routes/google-contacts-sync.ts`)
```
POST /api/contacts/sync/full            - Trigger full sync
POST /api/contacts/sync/incremental     - Trigger incremental sync
GET  /api/contacts/sync/status          - Get sync status
GET  /api/contacts/sync/history         - Get sync history
```

**Contact Groups** (`src/api/routes/google-contacts-groups.ts`)
```
GET  /api/contacts/google-groups        - List Google contact groups
POST /api/contacts/google-groups/sync   - Sync contact groups
GET  /api/contacts/google-groups/:id/map - Get group mapping
POST /api/contacts/google-groups/:id/map - Map to CatchUp group
```

### Sync Strategy

**Initial Import (Full Sync)**
1. User authorizes Google Contacts OAuth
2. Request all contacts with `requestSyncToken=true`
3. Paginate through all results
4. For each contact:
   - Check if exists by `google_resource_name`
   - If exists: update if etag changed
   - If not: create with `source='google'`
   - Store resource name and etag
5. Store `nextSyncToken` in sync state table
6. Import contact groups and memberships
7. Mark `last_full_sync_at` timestamp

**Incremental Sync**
1. Retrieve stored `sync_token` from database
2. Request changes: `GET /v1/people/me/connections?syncToken={token}`
3. Process changed contacts:
   - If `metadata.deleted=true`: soft delete or archive
   - Otherwise: update existing contact
4. Store new `nextSyncToken`
5. Mark `last_incremental_sync_at` timestamp
6. Handle 410 error: trigger full sync

**Sync Frequency**
- Manual: User-triggered via UI
- Automatic: Background job every 6-12 hours
- Webhook (future): Real-time updates via Google push notifications

**Conflict Resolution**
- Google is source of truth for imported contacts
- Local changes to Google-imported contacts can be:
  - Option A: Overwritten on sync (simpler)
  - Option B: Flagged for user review (complex)
  - Recommended: Option A with clear UI indication


## Implementation Phases

### Phase 1: Foundation (Core Sync Infrastructure)

**Goals**: Enable basic contact sync with source tracking

**Tasks**:
1. Database migrations for source tracking and sync state
2. Update contacts table schema
3. Create sync state table
4. Add indexes for performance

**Deliverables**:
- Migration script: `00X_add_google_contacts_sync.sql`
- Updated contact model with source field
- Sync state repository

**Estimated Effort**: 2-3 days

### Phase 2: OAuth & Initial Import

**Goals**: Allow users to connect Google Contacts and perform initial import

**Tasks**:
1. Create Google Contacts OAuth service
2. Implement OAuth flow (authorize, callback, disconnect)
3. Add contacts scope to OAuth request
4. Create API routes for OAuth
5. Update import service to store Google metadata
6. Implement full sync logic
7. Add UI for connecting Google Contacts

**Deliverables**:
- `google-contacts-oauth.ts` service
- `google-contacts-oauth.ts` routes
- Enhanced import service with metadata storage
- OAuth connection UI component

**Estimated Effort**: 4-5 days

### Phase 3: Incremental Sync

**Goals**: Enable efficient incremental updates

**Tasks**:
1. Create sync service for managing sync state
2. Implement incremental sync logic
3. Handle sync token expiration (410 errors)
4. Add background job for automatic sync
5. Create sync status API endpoints
6. Add UI for manual sync trigger and status

**Deliverables**:
- `google-contacts-sync-service.ts`
- Sync API routes
- Background sync job
- Sync status UI

**Estimated Effort**: 5-6 days

### Phase 4: Contact Groups Integration

**Goals**: Import and sync Google contact groups

**Tasks**:
1. Create contact group mapping table
2. Implement group sync service
3. Map Google groups to CatchUp groups
4. Sync group memberships
5. Handle group CRUD operations
6. Add UI for group mapping

**Deliverables**:
- Migration for group mapping table
- `google-group-sync-service.ts`
- Group sync API routes
- Group mapping UI

**Estimated Effort**: 4-5 days

### Phase 5: Advanced Features (Optional)

**Goals**: Enhanced sync capabilities and user experience

**Tasks**:
1. Conflict detection and resolution UI
2. Selective sync (choose which groups to sync)
3. Two-way sync (push changes to Google)
4. Batch operations optimization
5. Sync analytics and reporting
6. Webhook support for real-time updates

**Deliverables**:
- Conflict resolution UI
- Selective sync configuration
- Two-way sync service
- Webhook handler

**Estimated Effort**: 6-8 days


## Technical Considerations

### Performance Optimization

**Pagination Strategy**
- Use `pageSize=1000` for initial import (maximum allowed)
- Use `pageSize=100` for incremental syncs (default)
- Implement parallel page fetching with rate limiting

**Batch Operations**
- Use batch create/update APIs when possible (up to 200 contacts)
- Group database operations in transactions
- Implement bulk insert/update queries

**Caching**
- Cache contact group mappings in memory
- Use Redis for sync state if available
- Implement ETags for conditional requests

**Rate Limiting**
- Google People API quotas:
  - 600 requests per minute per user
  - 3000 requests per minute per project
- Implement exponential backoff on rate limit errors
- Queue sync requests during high load

### Error Handling

**Sync Token Expiration (410 Gone)**
```typescript
try {
  await incrementalSync(userId, syncToken);
} catch (error) {
  if (error.code === 410) {
    // Sync token expired, trigger full sync
    await fullSync(userId);
  }
}
```

**Network Failures**
- Retry with exponential backoff (3 attempts)
- Store partial sync progress
- Resume from last successful page

**Data Validation**
- Validate required fields before import
- Handle missing or malformed data gracefully
- Log validation errors for debugging

**Conflict Detection**
- Compare ETags before updating
- Handle concurrent modifications
- Provide user feedback on conflicts

### Security Considerations

**OAuth Token Storage**
- Tokens already encrypted at rest (existing implementation)
- Use separate provider name: `google_contacts`
- Rotate tokens on security events
- Implement token refresh logic

**Data Privacy**
- Only request minimum required scopes
- Allow users to disconnect and delete synced data
- Comply with GDPR data deletion requests
- Audit log all sync operations

**Access Control**
- Verify user ownership before sync operations
- Validate OAuth tokens on each request
- Implement rate limiting per user
- Prevent unauthorized access to sync endpoints


### Testing Strategy

**Unit Tests**
- OAuth flow (authorize, callback, token refresh)
- Sync service logic (full sync, incremental sync)
- Contact deduplication and merging
- Group mapping logic
- Error handling scenarios

**Integration Tests**
- End-to-end OAuth flow
- Full sync with mock Google API
- Incremental sync with changes
- Sync token expiration handling
- Group sync and membership updates

**Mock Data**
- Create test fixtures for Google API responses
- Mock sync tokens and pagination
- Simulate various contact structures
- Test edge cases (no name, no email, etc.)

**Manual Testing Checklist**
- [ ] Connect Google Contacts account
- [ ] Import contacts successfully
- [ ] Verify contact source tracking
- [ ] Trigger manual sync
- [ ] Verify incremental updates
- [ ] Import contact groups
- [ ] Map groups to CatchUp groups
- [ ] Handle sync token expiration
- [ ] Disconnect Google Contacts
- [ ] Verify data cleanup on disconnect

### Monitoring & Observability

**Metrics to Track**
- Sync success/failure rate
- Sync duration (full vs incremental)
- Number of contacts synced per user
- API error rates by type
- Sync token expiration frequency
- Group sync statistics

**Logging**
- Log all sync operations with timestamps
- Log API errors with context
- Track sync state transitions
- Monitor OAuth token refresh events

**Alerts**
- High sync failure rate (>5%)
- Sync duration exceeds threshold (>5 minutes)
- Repeated 410 errors (token expiration)
- OAuth token refresh failures
- API rate limit exceeded


## User Experience Considerations

### UI/UX Requirements

**Connection Flow**
1. Settings page with "Connect Google Contacts" button
2. OAuth consent screen (Google-hosted)
3. Callback with loading state
4. Success message with import preview
5. Option to start initial sync immediately

**Sync Status Display**
- Connection status indicator (connected/disconnected)
- Last sync timestamp
- Sync in progress indicator
- Number of contacts synced
- Manual sync button
- Disconnect button with confirmation

**Contact Source Indicators**
- Badge or icon showing "Google" source
- Tooltip explaining sync behavior
- Visual distinction between manual and imported contacts
- Warning when editing Google-synced contacts

**Group Mapping Interface**
- List of Google contact groups
- Dropdown to map to CatchUp groups
- Option to create new CatchUp group
- Bulk mapping actions
- Sync status per group

**Error States**
- Clear error messages for sync failures
- Actionable steps for resolution
- Retry button for failed syncs
- Support contact for persistent issues

### User Settings

**Sync Preferences**
- Enable/disable automatic sync
- Sync frequency (hourly, daily, manual only)
- Choose which groups to sync
- Conflict resolution preference
- Notification preferences for sync events

**Data Management**
- View sync history
- Export synced contacts
- Delete all Google-synced contacts
- Re-import from scratch option


## Code Examples

### OAuth Configuration

```typescript
// src/integrations/google-contacts-config.ts
import { google } from 'googleapis';

export function createContactsOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Contacts OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getContactsAuthorizationUrl(): string {
  const oauth2Client = createContactsOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
}
```

### Full Sync Implementation

```typescript
// src/integrations/google-contacts-sync-service.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleContactsSyncService {
  async performFullSync(userId: string, accessToken: string): Promise<SyncResult> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const people = google.people({ version: 'v1', auth });
    const contacts: Contact[] = [];
    let pageToken: string | undefined;
    let syncToken: string | undefined;

    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata',
        requestSyncToken: !pageToken, // Only request on first page
        pageToken
      });

      const connections = response.data.connections || [];
      
      for (const person of connections) {
        const contact = await this.importContact(userId, person);
        contacts.push(contact);
      }

      pageToken = response.data.nextPageToken || undefined;
      
      // Sync token only on last page
      if (!pageToken && response.data.nextSyncToken) {
        syncToken = response.data.nextSyncToken;
      }
    } while (pageToken);

    // Store sync token
    await this.storeSyncToken(userId, syncToken!);

    return {
      contactsImported: contacts.length,
      syncToken
    };
  }

  private async importContact(userId: string, person: any): Promise<Contact> {
    const contactData = {
      name: this.extractName(person),
      email: this.extractEmail(person),
      phone: this.extractPhone(person),
      source: 'google',
      google_resource_name: person.resourceName,
      google_etag: person.etag,
      last_synced_at: new Date()
    };

    // Check if contact exists
    const existing = await this.findByGoogleResourceName(
      userId, 
      person.resourceName
    );

    if (existing) {
      return await this.updateContact(existing.id, userId, contactData);
    } else {
      return await this.createContact(userId, contactData);
    }
  }
}
```

### Incremental Sync Implementation

```typescript
async performIncrementalSync(userId: string, accessToken: string): Promise<SyncResult> {
  const syncState = await this.getSyncState(userId);
  
  if (!syncState?.sync_token) {
    // No sync token, perform full sync
    return await this.performFullSync(userId, accessToken);
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const people = google.people({ version: 'v1', auth });
  const updated: Contact[] = [];
  const deleted: string[] = [];
  let pageToken: string | undefined;
  let newSyncToken: string | undefined;

  try {
    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata',
        syncToken: syncState.sync_token,
        pageToken
      });

      const connections = response.data.connections || [];
      
      for (const person of connections) {
        if (person.metadata?.deleted) {
          // Handle deleted contact
          await this.handleDeletedContact(userId, person.resourceName);
          deleted.push(person.resourceName);
        } else {
          // Update or create contact
          const contact = await this.importContact(userId, person);
          updated.push(contact);
        }
      }

      pageToken = response.data.nextPageToken || undefined;
      
      if (!pageToken && response.data.nextSyncToken) {
        newSyncToken = response.data.nextSyncToken;
      }
    } while (pageToken);

    // Update sync token
    await this.storeSyncToken(userId, newSyncToken!);

    return {
      contactsUpdated: updated.length,
      contactsDeleted: deleted.length,
      syncToken: newSyncToken
    };
  } catch (error: any) {
    if (error.code === 410) {
      // Sync token expired, perform full sync
      console.log('Sync token expired, performing full sync');
      return await this.performFullSync(userId, accessToken);
    }
    throw error;
  }
}
```

### Contact Group Sync

```typescript
async syncContactGroups(userId: string, accessToken: string): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const people = google.people({ version: 'v1', auth });
  
  const response = await people.contactGroups.list({
    pageSize: 1000
  });

  const groups = response.data.contactGroups || [];
  
  for (const googleGroup of groups) {
    // Skip system groups
    if (googleGroup.groupType !== 'USER_CONTACT_GROUP') {
      continue;
    }

    // Check if group mapping exists
    const mapping = await this.findGroupMapping(userId, googleGroup.resourceName);
    
    if (!mapping) {
      // Create new CatchUp group
      const catchupGroup = await this.createGroup(userId, googleGroup.name);
      
      // Create mapping
      await this.createGroupMapping(userId, {
        catchup_group_id: catchupGroup.id,
        google_resource_name: googleGroup.resourceName,
        google_name: googleGroup.name,
        google_etag: googleGroup.etag,
        member_count: googleGroup.memberCount || 0
      });
    } else {
      // Update existing mapping if name changed
      if (mapping.google_name !== googleGroup.name) {
        await this.updateGroupMapping(mapping.id, {
          google_name: googleGroup.name,
          google_etag: googleGroup.etag
        });
      }
    }
  }
}
```


## Environment Variables

Add to `.env` file:

```bash
# Google Contacts OAuth (can reuse Calendar credentials if same project)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CONTACTS_REDIRECT_URI=http://localhost:3000/api/contacts/oauth/callback

# Production
# GOOGLE_CONTACTS_REDIRECT_URI=https://yourdomain.com/api/contacts/oauth/callback
```

Add to `.env.example`:

```bash
# Google Contacts OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CONTACTS_REDIRECT_URI=http://localhost:3000/api/contacts/oauth/callback
```

## Google Cloud Console Setup

### Enable People API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new one)
3. Navigate to "APIs & Services" > "Library"
4. Search for "People API"
5. Click "Enable"

### Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Add scopes:
   - `https://www.googleapis.com/auth/contacts.readonly` (or `.contacts` for read-write)
   - `https://www.googleapis.com/auth/userinfo.email`
3. Add test users if in development mode

### Update OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Edit your existing OAuth 2.0 Client ID (or create new)
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/contacts/oauth/callback` (development)
   - `https://yourdomain.com/api/contacts/oauth/callback` (production)

### API Quotas

**People API Quotas (default)**:
- Queries per day: 3,000,000
- Queries per minute per user: 600
- Queries per minute: 3,000

**Monitor Usage**:
- Go to "APIs & Services" > "Dashboard"
- Click on "People API"
- View quota usage and set alerts


## Migration Scripts

### Migration 1: Add Contact Source Tracking

```sql
-- Migration: Add Google Contacts sync support to contacts table
-- File: scripts/migrations/010_add_google_contacts_sync.sql

-- Add source tracking columns to contacts table
ALTER TABLE contacts 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS google_resource_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_etag VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_google_resource_name ON contacts(google_resource_name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_synced_at ON contacts(last_synced_at);

-- Add constraint to ensure google_resource_name is unique per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_google_resource 
  ON contacts(user_id, google_resource_name) 
  WHERE google_resource_name IS NOT NULL;

-- Update existing contacts to have 'manual' source
UPDATE contacts SET source = 'manual' WHERE source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN contacts.source IS 'Source of contact: manual, google, calendar, voice_note';
COMMENT ON COLUMN contacts.google_resource_name IS 'Google People API resource name (e.g., people/c1234567890)';
COMMENT ON COLUMN contacts.google_etag IS 'Google etag for optimistic concurrency control';
COMMENT ON COLUMN contacts.last_synced_at IS 'Last time contact was synced from Google';
```

### Migration 2: Create Sync State Table

```sql
-- Migration: Create Google Contacts sync state table
-- File: scripts/migrations/011_create_google_contacts_sync_state.sql

-- Create sync state table
CREATE TABLE IF NOT EXISTS google_contacts_sync_state (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_user_id 
  ON google_contacts_sync_state(user_id);
CREATE INDEX IF NOT EXISTS idx_google_contacts_sync_state_last_sync 
  ON google_contacts_sync_state(last_incremental_sync_at);

-- Add trigger for updated_at
CREATE TRIGGER update_google_contacts_sync_state_updated_at 
  BEFORE UPDATE ON google_contacts_sync_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE google_contacts_sync_state IS 'Tracks Google Contacts sync state per user';
COMMENT ON COLUMN google_contacts_sync_state.sync_token IS 'Google sync token for incremental updates';
COMMENT ON COLUMN google_contacts_sync_state.last_sync_status IS 'Status: pending, in_progress, success, failed';
```

### Migration 3: Create Contact Group Mapping Table

```sql
-- Migration: Create Google contact groups mapping table
-- File: scripts/migrations/012_create_google_contact_groups.sql

-- Create contact group mapping table
CREATE TABLE IF NOT EXISTS google_contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catchup_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    google_resource_name VARCHAR(255) NOT NULL,
    google_name VARCHAR(255) NOT NULL,
    google_etag VARCHAR(255),
    google_group_type VARCHAR(50) DEFAULT 'USER_CONTACT_GROUP',
    member_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, google_resource_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_user_id 
  ON google_contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_catchup_group_id 
  ON google_contact_groups(catchup_group_id);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_google_resource_name 
  ON google_contact_groups(google_resource_name);
CREATE INDEX IF NOT EXISTS idx_google_contact_groups_sync_enabled 
  ON google_contact_groups(sync_enabled);

-- Add trigger for updated_at
CREATE TRIGGER update_google_contact_groups_updated_at 
  BEFORE UPDATE ON google_contact_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE google_contact_groups IS 'Maps Google contact groups to CatchUp groups';
COMMENT ON COLUMN google_contact_groups.catchup_group_id IS 'Linked CatchUp group (NULL if not mapped)';
COMMENT ON COLUMN google_contact_groups.google_resource_name IS 'Google contactGroups resource name';
COMMENT ON COLUMN google_contact_groups.sync_enabled IS 'Whether to sync this group';
```


## Dependencies

### NPM Packages (Already Installed)

```json
{
  "googleapis": "^140.0.0",
  "google-auth-library": "^9.0.0"
}
```

No additional packages required - reuse existing Google API client.

## API Rate Limiting Strategy

### Implementation

```typescript
// src/integrations/google-contacts-rate-limiter.ts
export class GoogleContactsRateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private requestsPerMinute = 500; // Conservative limit (600 max)
  private requestCount = 0;
  private windowStart = Date.now();

  async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    
    try {
      const result = await request();
      this.incrementCount();
      return result;
    } catch (error: any) {
      if (error.code === 429) {
        // Rate limit exceeded, wait and retry
        await this.backoff();
        return this.executeRequest(request);
      }
      throw error;
    }
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    if (elapsed >= 60000) {
      // Reset window
      this.requestCount = 0;
      this.windowStart = now;
      return;
    }

    if (this.requestCount >= this.requestsPerMinute) {
      // Wait until window resets
      const waitTime = 60000 - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }

  private incrementCount(): void {
    this.requestCount++;
  }

  private async backoff(): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, this.requestCount % 5), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

## Background Sync Job

### Implementation

```typescript
// src/jobs/processors/google-contacts-sync-processor.ts
import { Job } from 'bull';
import { GoogleContactsSyncService } from '../../integrations/google-contacts-sync-service';
import { OAuthRepository } from '../../integrations/oauth-repository';

export interface GoogleContactsSyncJobData {
  userId: string;
  syncType: 'full' | 'incremental';
}

export async function processGoogleContactsSync(
  job: Job<GoogleContactsSyncJobData>
): Promise<void> {
  const { userId, syncType } = job.data;
  
  console.log(`Starting ${syncType} sync for user ${userId}`);

  try {
    // Get OAuth token
    const oauthRepo = new OAuthRepository();
    const token = await oauthRepo.getToken(userId, 'google_contacts');

    if (!token) {
      throw new Error(`No Google Contacts OAuth token found for user ${userId}`);
    }

    // Perform sync
    const syncService = new GoogleContactsSyncService();
    let result;

    if (syncType === 'full') {
      result = await syncService.performFullSync(userId, token.access_token);
    } else {
      result = await syncService.performIncrementalSync(userId, token.access_token);
    }

    console.log(`Sync completed for user ${userId}:`, result);
    
    // Update job progress
    await job.progress(100);
  } catch (error) {
    console.error(`Sync failed for user ${userId}:`, error);
    throw error;
  }
}

// Schedule automatic syncs
export function scheduleGoogleContactsSyncs(): void {
  const syncQueue = getQueue('google-contacts-sync');

  // Schedule incremental sync every 6 hours for all connected users
  syncQueue.add(
    'scheduled-sync',
    {},
    {
      repeat: {
        cron: '0 */6 * * *' // Every 6 hours
      }
    }
  );
}

// Process scheduled sync
export async function processScheduledSync(): Promise<void> {
  const oauthRepo = new OAuthRepository();
  const users = await oauthRepo.getUsersWithProvider('google_contacts');

  for (const userId of users) {
    const syncQueue = getQueue('google-contacts-sync');
    await syncQueue.add('sync', {
      userId,
      syncType: 'incremental'
    });
  }
}
```


## Comparison with Existing Calendar Integration

### Similarities

| Aspect | Calendar | Contacts |
|--------|----------|----------|
| OAuth Provider | Google | Google |
| OAuth Client | Can reuse same credentials | Can reuse same credentials |
| Token Storage | `oauth_tokens` table | `oauth_tokens` table (different provider) |
| API Client | `googleapis` package | `googleapis` package |
| Token Encryption | Yes | Yes |
| Refresh Logic | Automatic | Automatic |

### Differences

| Aspect | Calendar | Contacts |
|--------|----------|----------|
| API | Google Calendar API v3 | Google People API v1 |
| OAuth Scope | `calendar.readonly` | `contacts.readonly` or `contacts` |
| Provider Name | `google_calendar` | `google_contacts` |
| Sync Strategy | Event caching | Full + incremental sync |
| Sync Token | Not used | Critical for incremental sync |
| Data Volume | Events (time-bound) | Contacts (all history) |
| Update Frequency | Real-time via webhooks | Periodic background sync |
| Resource Names | Calendar IDs, Event IDs | People resource names |
| ETags | Not stored | Required for conflict detection |

### Reusable Components

**Can Reuse**:
- OAuth token repository (`src/integrations/oauth-repository.ts`)
- OAuth encryption logic
- Token refresh mechanism
- Error handling patterns
- Rate limiting approach

**Need New**:
- OAuth routes (different callback URL)
- Sync service (different API)
- Sync state management
- Contact group mapping
- Background sync jobs


## Risks & Mitigation

### Technical Risks

**Risk: Sync Token Expiration**
- **Impact**: Requires full re-sync (expensive)
- **Probability**: Medium (7-day expiration)
- **Mitigation**: 
  - Schedule syncs more frequently than 7 days
  - Monitor token age and proactively refresh
  - Optimize full sync performance

**Risk: API Rate Limiting**
- **Impact**: Sync failures, degraded UX
- **Probability**: Medium (large contact lists)
- **Mitigation**:
  - Implement rate limiter with backoff
  - Use batch operations where possible
  - Queue syncs during off-peak hours

**Risk: Data Conflicts**
- **Impact**: User confusion, data loss
- **Probability**: Low (if Google is source of truth)
- **Mitigation**:
  - Clear UI indicating sync behavior
  - Use ETags for conflict detection
  - Provide conflict resolution UI (Phase 5)

**Risk: Large Contact Lists**
- **Impact**: Long sync times, timeouts
- **Probability**: Medium (some users have 1000+ contacts)
- **Mitigation**:
  - Implement pagination properly
  - Use background jobs for syncs
  - Show progress indicators
  - Optimize database bulk operations

### Product Risks

**Risk: User Confusion About Sync**
- **Impact**: Support burden, poor UX
- **Probability**: High
- **Mitigation**:
  - Clear onboarding flow
  - Visual indicators for synced contacts
  - Help documentation
  - In-app tooltips

**Risk: Privacy Concerns**
- **Impact**: User distrust, legal issues
- **Probability**: Low
- **Mitigation**:
  - Clear privacy policy
  - Transparent data usage
  - Easy disconnect option
  - GDPR compliance

**Risk: Duplicate Contacts**
- **Impact**: Cluttered contact list
- **Probability**: Medium
- **Mitigation**:
  - Robust deduplication logic
  - Merge suggestions UI
  - Manual merge tools


## Success Metrics

### Technical Metrics

- **Sync Success Rate**: >95% of syncs complete successfully
- **Sync Duration**: 
  - Full sync: <2 minutes for 500 contacts
  - Incremental sync: <30 seconds
- **API Error Rate**: <1% of API calls fail
- **Token Refresh Success**: >99% of token refreshes succeed
- **Data Accuracy**: 100% of synced contacts match Google data

### Product Metrics

- **Adoption Rate**: % of users who connect Google Contacts
- **Active Sync Users**: % of connected users with recent sync
- **Contact Import Volume**: Average contacts imported per user
- **Sync Frequency**: Average time between syncs
- **Disconnect Rate**: % of users who disconnect integration
- **Support Tickets**: Number of sync-related support requests

### User Experience Metrics

- **Time to First Sync**: <2 minutes from OAuth to first contact
- **Sync Visibility**: Users understand sync status
- **Error Recovery**: Users can resolve sync errors without support
- **Satisfaction**: User satisfaction with sync feature (survey)

## Future Enhancements

### Phase 6: Advanced Features

**Two-Way Sync**
- Push CatchUp contact changes to Google
- Sync tags as Google contact labels
- Sync groups as Google contact groups
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

**Sync Analytics**
- Dashboard showing sync health
- Contact growth over time
- Sync performance trends
- Error analysis and insights

**Multi-Account Support**
- Sync from multiple Google accounts
- Merge contacts across accounts
- Account-specific settings


## References & Resources

### Official Documentation

- [Google People API Overview](https://developers.google.com/people)
- [People API REST Reference](https://developers.google.com/people/api/rest)
- [People API v1 Contacts Guide](https://developers.google.com/people/v1/contacts)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [People API Quotas](https://developers.google.com/people/v1/how-tos/quota)
- [Contact Groups API](https://developers.google.com/people/api/rest/v1/contactGroups)

### Code Examples

- [People API Quickstart](https://developers.google.com/people/quickstart/nodejs)
- [Sync Contacts Example](https://developers.google.com/people/v1/contacts#list_the_users_contacts_that_have_changed)
- [Batch Operations](https://developers.google.com/people/v1/batch)

### Related CatchUp Documentation

- [Google Calendar Integration](./src/integrations/GOOGLE_CALENDAR_README.md)
- [Contact Onboarding Implementation](./src/contacts/ONBOARDING_IMPLEMENTATION.md)
- [Google Cloud Setup Guide](./GOOGLE_CLOUD_SETUP_GUIDE.md)
- [Database Setup Guide](./.kiro/steering/database-setup.md)
- [Security Standards](./.kiro/steering/security.md)

### NPM Packages

- [googleapis](https://www.npmjs.com/package/googleapis) - Google APIs Node.js Client
- [google-auth-library](https://www.npmjs.com/package/google-auth-library) - Google Auth Library

## Appendix: API Request Examples

### Full Sync Request

```http
GET /v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata&pageSize=1000&requestSyncToken=true HTTP/1.1
Host: people.googleapis.com
Authorization: Bearer {access_token}
```

### Incremental Sync Request

```http
GET /v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata&syncToken={sync_token} HTTP/1.1
Host: people.googleapis.com
Authorization: Bearer {access_token}
```

### List Contact Groups

```http
GET /v1/contactGroups?pageSize=1000 HTTP/1.1
Host: people.googleapis.com
Authorization: Bearer {access_token}
```

### Create Contact

```http
POST /v1/people:createContact HTTP/1.1
Host: people.googleapis.com
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "names": [
    {
      "givenName": "John",
      "familyName": "Doe"
    }
  ],
  "emailAddresses": [
    {
      "value": "john.doe@example.com"
    }
  ],
  "phoneNumbers": [
    {
      "value": "+1234567890"
    }
  ]
}
```

### Update Contact

```http
PATCH /v1/{resourceName}:updateContact?updatePersonFields=emailAddresses HTTP/1.1
Host: people.googleapis.com
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "resourceName": "people/c1234567890",
  "etag": "%EgUBAgMFBw==",
  "emailAddresses": [
    {
      "value": "newemail@example.com"
    }
  ]
}
```

## Conclusion

This research document provides a comprehensive foundation for implementing Google Contacts integration in CatchUp. The phased approach allows for incremental development while maintaining system stability. Key priorities are:

1. **Phase 1-2**: Establish foundation and basic import (MVP)
2. **Phase 3**: Enable efficient incremental sync (Core feature)
3. **Phase 4**: Add contact groups support (Enhanced UX)
4. **Phase 5+**: Advanced features based on user feedback

The implementation leverages existing OAuth infrastructure while adding new sync capabilities. With proper error handling, rate limiting, and user experience design, this integration will significantly enhance CatchUp's value proposition by reducing manual contact entry and keeping contact data up-to-date automatically.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-27  
**Author**: Kiro AI Assistant  
**Status**: Ready for Spec Creation
