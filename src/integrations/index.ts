/**
 * Integrations Module
 *
 * Responsibilities:
 * - Third-party API clients (Google Calendar, Twilio, SendGrid, OpenAI)
 * - OAuth flow management
 * - API error handling and retry logic
 * - Rate limiting
 */

// Google Contacts Integration
export {
  GoogleContactsOAuthService,
  googleContactsOAuthService,
} from './google-contacts-oauth-service';
export {
  GoogleContactsSyncService,
  googleContactsSyncService,
} from './google-contacts-sync-service';
export {
  GoogleContactsRateLimiter,
  googleContactsRateLimiter,
} from './google-contacts-rate-limiter';

// Repositories
export {
  SyncStateRepository,
  PostgresSyncStateRepository,
  getSyncState,
  upsertSyncState,
  updateSyncToken,
  markSyncInProgress,
  markSyncComplete,
  markSyncFailed,
  type SyncState,
  type SyncResult,
  type SyncError,
} from './sync-state-repository';

export {
  GroupMappingRepository,
  PostgresGroupMappingRepository,
  type GroupMapping,
} from './group-mapping-repository';
