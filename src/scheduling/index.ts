/**
 * Scheduling Module
 *
 * Exports all scheduling-related repositories and services.
 */

// Repositories
export * as schedulingRepository from './scheduling-repository';
export * as inviteLinkRepository from './invite-link-repository';
export * as availabilityRepository from './availability-repository';
export * as preferencesRepository from './preferences-repository';
export * as notificationRepository from './notification-repository';

// Services
export * as schedulingService from './scheduling-service';
export * as inviteLinkService from './invite-link-service';
export * as availabilityCollectionService from './availability-collection-service';
export * as conflictResolutionService from './conflict-resolution-service';
export * as schedulingPreferencesService from './scheduling-preferences-service';
export * as schedulingNotificationService from './scheduling-notification-service';

// Re-export types for convenience
export * from '../types/scheduling';
