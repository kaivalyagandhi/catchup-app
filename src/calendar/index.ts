/**
 * Calendar Module
 *
 * Responsibilities:
 * - OAuth integration with Google Calendar
 * - Availability detection and free time slot identification
 * - iCal feed generation for calendar subscription
 * - Event analysis for friend invitation suggestions
 */

// Export calendar service functions
export {
  listUserCalendarsFromGoogle,
  syncCalendarsFromGoogle,
  listUserCalendars,
  getSelectedCalendars,
  setSelectedCalendars,
  updateCalendarSelection,
  getFreeTimeSlots,
  refreshCalendarData,
  getAvailabilityParams,
  setAvailabilityParams,
  applyAvailabilityParameters,
} from './calendar-service';

// Export calendar repository functions
export {
  getUserCalendars,
  getSelectedCalendars as getSelectedCalendarsFromDb,
  upsertCalendar,
  updateCalendarSelection as updateCalendarSelectionInDb,
  setSelectedCalendars as setSelectedCalendarsInDb,
  deleteUserCalendars,
} from './calendar-repository';

// Export availability repository functions
export {
  getAvailabilityParams as getAvailabilityParamsFromDb,
  upsertAvailabilityParams,
  deleteAvailabilityParams,
} from './availability-repository';

// Export availability service functions
export {
  getAvailabilityParams as getAvailabilityParamsService,
  setAvailabilityParams as setAvailabilityParamsService,
  applyAvailabilityParameters as applyAvailabilityParametersService,
} from './availability-service';

// Export calendar feed functions
export {
  publishSuggestionFeed,
  generateFeedContent,
  updateFeedEvent,
  verifySignedToken,
  CalendarFeedUrl,
} from './feed-service';

// Export suggestion repository functions
export {
  getUserSuggestions,
  getSuggestionById,
} from './suggestion-repository';
