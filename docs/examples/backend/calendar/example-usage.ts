/**
 * Example Usage of Calendar Service
 *
 * This file demonstrates how to use the calendar listing and selection functionality
 * in a real application scenario.
 */

import {
  syncCalendarsFromGoogle,
  listUserCalendars,
  getSelectedCalendars,
  setSelectedCalendars,
  updateCalendarSelection,
} from './calendar-service';

/**
 * Example: Complete calendar setup flow for a new user
 */
export async function exampleCalendarSetupFlow(
  userId: string,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  console.log('=== Calendar Setup Flow ===\n');

  // Step 1: Sync calendars from Google after OAuth
  console.log('Step 1: Syncing calendars from Google...');
  const syncedCalendars = await syncCalendarsFromGoogle(userId, accessToken, refreshToken);
  console.log(`Synced ${syncedCalendars.length} calendars from Google\n`);

  // Step 2: Display all available calendars to the user
  console.log('Step 2: Displaying available calendars...');
  const allCalendars = await listUserCalendars(userId);
  allCalendars.forEach((cal) => {
    console.log(`  - ${cal.name} (${cal.calendarId})${cal.isPrimary ? ' [PRIMARY]' : ''}`);
  });
  console.log();

  // Step 3: User selects which calendars to use for availability
  console.log('Step 3: User selects calendars for availability calculations...');
  const calendarIdsToSelect = allCalendars
    .filter((cal) => cal.isPrimary || cal.name.includes('Work'))
    .map((cal) => cal.calendarId);

  await setSelectedCalendars(userId, calendarIdsToSelect);
  console.log(`Selected ${calendarIdsToSelect.length} calendars\n`);

  // Step 4: Verify selected calendars
  console.log('Step 4: Verifying selected calendars...');
  const selectedCalendars = await getSelectedCalendars(userId);
  selectedCalendars.forEach((cal) => {
    console.log(`  ✓ ${cal.name}`);
  });
  console.log();
}

/**
 * Example: User edits calendar selection
 */
export async function exampleEditCalendarSelection(userId: string): Promise<void> {
  console.log('=== Edit Calendar Selection ===\n');

  // Get current selection
  console.log('Current selected calendars:');
  const currentSelection = await getSelectedCalendars(userId);
  currentSelection.forEach((cal) => {
    console.log(`  ✓ ${cal.name}`);
  });
  console.log();

  // Get all calendars
  const allCalendars = await listUserCalendars(userId);

  // User wants to add "Family" calendar
  const familyCalendar = allCalendars.find((cal) => cal.name.includes('Family'));
  if (familyCalendar) {
    console.log(`Adding "${familyCalendar.name}" to selection...`);
    await updateCalendarSelection(userId, familyCalendar.calendarId, true);
  }

  // User wants to remove "Work" calendar
  const workCalendar = allCalendars.find((cal) => cal.name.includes('Work'));
  if (workCalendar) {
    console.log(`Removing "${workCalendar.name}" from selection...`);
    await updateCalendarSelection(userId, workCalendar.calendarId, false);
  }

  // Show updated selection
  console.log('\nUpdated selected calendars:');
  const updatedSelection = await getSelectedCalendars(userId);
  updatedSelection.forEach((cal) => {
    console.log(`  ✓ ${cal.name}`);
  });
  console.log();
}

/**
 * Example: Bulk calendar selection update
 */
export async function exampleBulkCalendarUpdate(userId: string): Promise<void> {
  console.log('=== Bulk Calendar Selection Update ===\n');

  const allCalendars = await listUserCalendars(userId);

  // User wants to select only personal calendars (not work)
  const personalCalendarIds = allCalendars
    .filter((cal) => !cal.name.toLowerCase().includes('work'))
    .map((cal) => cal.calendarId);

  console.log('Selecting only personal calendars...');
  await setSelectedCalendars(userId, personalCalendarIds);

  const selectedCalendars = await getSelectedCalendars(userId);
  console.log(`\nSelected ${selectedCalendars.length} personal calendars:`);
  selectedCalendars.forEach((cal) => {
    console.log(`  ✓ ${cal.name}`);
  });
  console.log();
}

/**
 * Example: Display calendar information for UI
 */
export async function exampleDisplayCalendarInfo(userId: string): Promise<void> {
  console.log('=== Calendar Information Display ===\n');

  const calendars = await listUserCalendars(userId);

  console.log('Available Calendars:\n');
  calendars.forEach((cal) => {
    const badges = [];
    if (cal.isPrimary) badges.push('PRIMARY');
    if (cal.selected) badges.push('SELECTED');

    const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';

    console.log(`${cal.name}${badgeStr}`);
    console.log(`  ID: ${cal.calendarId}`);
    if (cal.description) {
      console.log(`  Description: ${cal.description}`);
    }
    console.log(`  Created: ${cal.createdAt.toLocaleDateString()}`);
    console.log();
  });
}

/**
 * Example: Error handling
 */
export async function exampleErrorHandling(userId: string): Promise<void> {
  console.log('=== Error Handling Examples ===\n');

  try {
    // Attempt to select invalid calendar IDs
    console.log('Attempting to select invalid calendar IDs...');
    await setSelectedCalendars(userId, ['invalid-id-1', 'invalid-id-2']);
  } catch (error) {
    console.log(`✗ Error caught: ${(error as Error).message}\n`);
  }

  try {
    // Attempt to update non-existent calendar
    console.log('Attempting to update non-existent calendar...');
    const result = await updateCalendarSelection(userId, 'non-existent-id', true);
    if (result === null) {
      console.log('✗ Calendar not found (returned null)\n');
    }
  } catch (error) {
    console.log(`✗ Error caught: ${(error as Error).message}\n`);
  }
}

// Example API endpoint handlers (pseudo-code)
export const calendarApiHandlers = {
  /**
   * GET /api/calendars
   * List all calendars for the authenticated user
   */
  async listCalendars(req: { userId: string }): Promise<any> {
    const calendars = await listUserCalendars(req.userId);
    return {
      success: true,
      data: calendars,
    };
  },

  /**
   * GET /api/calendars/selected
   * Get selected calendars for the authenticated user
   */
  async getSelected(req: { userId: string }): Promise<any> {
    const calendars = await getSelectedCalendars(req.userId);
    return {
      success: true,
      data: calendars,
    };
  },

  /**
   * PUT /api/calendars/selection
   * Update calendar selection
   */
  async updateSelection(req: { userId: string; calendarIds: string[] }): Promise<any> {
    try {
      const calendars = await setSelectedCalendars(req.userId, req.calendarIds);
      return {
        success: true,
        data: calendars,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },

  /**
   * PATCH /api/calendars/:calendarId
   * Toggle selection for a single calendar
   */
  async toggleCalendar(req: {
    userId: string;
    calendarId: string;
    selected: boolean;
  }): Promise<any> {
    const calendar = await updateCalendarSelection(req.userId, req.calendarId, req.selected);

    if (!calendar) {
      return {
        success: false,
        error: 'Calendar not found',
      };
    }

    return {
      success: true,
      data: calendar,
    };
  },

  /**
   * POST /api/calendars/sync
   * Sync calendars from Google
   */
  async syncFromGoogle(req: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<any> {
    try {
      const calendars = await syncCalendarsFromGoogle(
        req.userId,
        req.accessToken,
        req.refreshToken
      );
      return {
        success: true,
        data: calendars,
        message: `Synced ${calendars.length} calendars from Google`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};
