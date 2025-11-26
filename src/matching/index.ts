/**
 * Matching Module
 *
 * Exports suggestion engine functionality including:
 * - Priority calculation and recency decay
 * - Contact-to-timeslot matching
 * - Timebound and shared activity suggestion generation
 * - Suggestion lifecycle management (accept, dismiss, snooze)
 * - Suggestion feed display
 * - Group matching and shared context analysis
 */

export * from './suggestion-service';
export * from './suggestion-repository';
export * from './group-matching-service';
