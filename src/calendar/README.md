# Calendar Module

This module handles Google Calendar integration including OAuth, calendar listing, and calendar selection management.

## Features

### Calendar Listing and Selection (Task 5.2)

The calendar module provides functionality to:

1. **List all user calendars** - Fetch all calendars associated with a user's Google account
2. **Select calendars** - Allow users to choose which calendars to use for availability calculations
3. **Manage calendar preferences** - Update calendar selection settings

## Usage

### Syncing Calendars from Google

```typescript
import { syncCalendarsFromGoogle } from './calendar';

// After OAuth authentication, sync calendars from Google to local database
const calendars = await syncCalendarsFromGoogle(
  userId,
  accessToken,
  refreshToken
);
```

### Listing User Calendars

```typescript
import { listUserCalendars } from './calendar';

// Get all calendars for a user from the database
const calendars = await listUserCalendars(userId);

// Calendars are ordered by:
// 1. Primary calendar first
// 2. Then alphabetically by name
```

### Getting Selected Calendars

```typescript
import { getSelectedCalendars } from './calendar';

// Get only the calendars that the user has selected for availability calculations
const selectedCalendars = await getSelectedCalendars(userId);
```

### Setting Selected Calendars

```typescript
import { setSelectedCalendars } from './calendar';

// Set which calendars should be used for availability calculations
// This will deselect all other calendars
const updatedCalendars = await setSelectedCalendars(userId, [
  'calendar-id-1',
  'calendar-id-2',
  'calendar-id-3',
]);
```

### Updating Single Calendar Selection

```typescript
import { updateCalendarSelection } from './calendar';

// Toggle selection for a single calendar
const calendar = await updateCalendarSelection(userId, calendarId, true);
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 7.2**: Display all calendars associated with the user's Google account
- **Requirement 7.3**: Allow user to select multiple calendars for suggestion generation
- **Requirement 7.4**: Allow user to edit which calendars are used for availability calculations

## Database Schema

The module uses the `google_calendars` table:

```sql
CREATE TABLE google_calendars (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    selected BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, calendar_id)
);
```

## API Integration

The module integrates with Google Calendar API v3 to:

1. Fetch calendar list from Google
2. Sync calendar metadata to local database
3. Maintain calendar selection preferences locally

## Error Handling

- **Invalid calendar IDs**: Throws error when trying to select calendars that don't belong to the user
- **Google API failures**: Errors are logged and thrown with descriptive messages
- **Database errors**: Transaction rollback on bulk operations

## Testing

Run tests with:

```bash
npm test -- src/calendar/calendar-service.test.ts
```

Note: Tests require a running PostgreSQL database with the schema initialized.

## Next Steps

- Task 5.4: Implement free time slot detection
- Task 5.6: Implement availability parameter configuration
- Task 5.8: Implement calendar feed publishing
