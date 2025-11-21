/**
 * Contacts Module
 *
 * Responsibilities:
 * - Contact CRUD operations
 * - Group management
 * - Tag operations and deduplication
 * - Interaction logging
 * - Frequency preference management
 */

// Export contact service
export { ContactService, ContactServiceImpl, contactService } from './service';

// Export repository interfaces
export {
  ContactRepository,
  PostgresContactRepository,
  ContactCreateData,
  ContactUpdateData,
  ContactFilters,
} from './repository';

// Export validation functions
export {
  validateEmail,
  validatePhone,
  validateLinkedIn,
  validateInstagram,
  validateXHandle,
  validateName,
  validateContactData,
  ValidationResult,
} from './validation';

// Export timezone service
export { TimezoneService, TimezoneServiceImpl, timezoneService } from './timezone-service';

// Export group service
export { GroupService, GroupServiceImpl, groupService } from './group-service';

// Export group repository
export { GroupRepository, PostgresGroupRepository } from './group-repository';

// Export tag service
export { TagService, TagServiceImpl, tagService } from './tag-service';

// Export tag repository
export { TagRepository, PostgresTagRepository } from './tag-repository';

// Export interaction service
export {
  InteractionService,
  InteractionServiceImpl,
  interactionService,
} from './interaction-service';

// Export interaction repository
export {
  InteractionRepository,
  PostgresInteractionRepository,
  InteractionLogData,
} from './interaction-repository';

// Export frequency service
export { FrequencyService, FrequencyServiceImpl, frequencyService } from './frequency-service';
