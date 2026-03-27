/**
 * Calendar Module
 *
 * Responsibilities:
 * - OAuth integration with Google Calendar
 * - Calendar sync and event storage for background enrichment
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
