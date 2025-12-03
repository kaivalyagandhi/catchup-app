/**
 * Edits Module
 *
 * Exports all edit-related services, repositories, and types.
 */

export { EditRepository, CreatePendingEditData, UpdatePendingEditData } from './edit-repository';
export { EditHistoryRepository, CreateEditHistoryData } from './edit-history-repository';
export { SessionManager, ChatSessionRepository } from './session-manager';
export { EditService, CreateEditParams, EditUpdates } from './edit-service';
export { FuzzyMatcherService } from './fuzzy-matcher-service';
