# Design Document: Test Data Generation UI

## Overview

This feature enhances the CatchUp application's test data generation capabilities by consolidating and improving the test data generation endpoints, adding calendar event generation, and fixing UI issues with tags, groups, and suggestion filtering. The system will provide developers with a comprehensive way to populate the application with realistic test data that reflects real-world usage patterns.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                        │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Contacts Page  │  │ Suggestions  │  │ Test Data       │ │
│  │ - Tag Display  │  │ Page         │  │ Controls        │ │
│  │ - Group Display│  │ - Filters    │  │ - Seed Button   │ │
│  │ - Tag/Group    │  │ - Status     │  │ - Generate Btn  │ │
│  │   Management   │  │   Badges     │  │ - Clear Button  │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                     │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ /api/contacts  │  │ /api/        │  │ /api/test-data  │ │
│  │ - CRUD         │  │ suggestions  │  │ - seed          │ │
│  │ - Tags         │  │ - Filters    │  │ - generate      │ │
│  │ - Groups       │  │ - Actions    │  │ - clear         │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Contact        │  │ Suggestion   │  │ Test Data       │ │
│  │ Service        │  │ Service      │  │ Generator       │ │
│  │ - Tag Service  │  │ - Matching   │  │ - Contact Gen   │ │
│  │ - Group Svc    │  │ - Filtering  │  │ - Calendar Gen  │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Contact Repo   │  │ Suggestion   │  │ Calendar Repo   │ │
│  │ Tag Repo       │  │ Repo         │  │                 │ │
│  │ Group Repo     │  │              │  │                 │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  contacts | tags | groups | contact_groups | contact_tags   │
│  calendar_events | suggestions                               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Test Data Generator Service

**Purpose**: Generate realistic test data for contacts, calendar events, and suggestions.

**Interface**:
```typescript
interface TestDataGenerator {
  seedTestData(userId: string, options?: SeedOptions): Promise<SeedResult>;
  generateSuggestions(userId: string, options?: GenerateOptions): Promise<GenerateResult>;
  clearTestData(userId: string): Promise<ClearResult>;
}

interface SeedOptions {
  contactCount?: number;
  includeCalendarEvents?: boolean;
  includeSuggestions?: boolean;
}

interface SeedResult {
  contactsCreated: number;
  groupsCreated: number;
  tagsCreated: number;
  calendarEventsCreated: number;
  suggestionsCreated: number;
}

interface GenerateOptions {
  daysAhead?: number;
  slotsPerDay?: number;
}

interface GenerateResult {
  suggestionsCreated: number;
  suggestions: Suggestion[];
}

interface ClearResult {
  contactsDeleted: number;
  groupsDeleted: number;
  tagsDeleted: number;
  calendarEventsDeleted: number;
  suggestionsDeleted: number;
}
```

**Responsibilities**:
- Generate realistic contact data with varied attributes
- Create test groups and assign contacts to them
- Generate tags for contacts
- Create calendar events representing user availability
- Generate suggestions based on contacts and availability
- Clean up test data

### 2. Calendar Event Generator

**Purpose**: Generate realistic calendar events for testing time-bound suggestions.

**Interface**:
```typescript
interface CalendarEventGenerator {
  generateAvailabilitySlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    options?: SlotOptions
  ): Promise<CalendarEvent[]>;
}

interface SlotOptions {
  includeWeekends?: boolean;
  timesOfDay?: TimeOfDay[];
  slotDuration?: number; // minutes
}

enum TimeOfDay {
  Morning = 'morning',    // 8am-12pm
  Afternoon = 'afternoon', // 12pm-5pm
  Evening = 'evening'      // 5pm-9pm
}

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAvailable: boolean;
}
```

### 3. Tag and Group Management UI

**Purpose**: Display and manage tags and groups in the contacts UI.

**Interface**:
```typescript
interface TagGroupUI {
  renderTags(tags: Tag[]): HTMLElement;
  renderGroups(groups: Group[]): HTMLElement;
  addTagToContact(contactId: string, tagText: string): Promise<void>;
  removeTagFromContact(contactId: string, tagId: string): Promise<void>;
  assignContactToGroup(contactId: string, groupId: string): Promise<void>;
  removeContactFromGroup(contactId: string, groupId: string): Promise<void>;
}

interface Tag {
  id: string;
  text: string;
  source: 'manual' | 'ai' | 'imported';
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  createdAt: Date;
}
```

### 4. Suggestion Filter UI

**Purpose**: Filter suggestions by status in the UI.

**Interface**:
```typescript
interface SuggestionFilterUI {
  filterSuggestions(status: SuggestionStatus | 'all'): void;
  setActiveFilter(status: SuggestionStatus | 'all'): void;
  renderFilteredSuggestions(suggestions: Suggestion[]): void;
}

enum SuggestionStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Dismissed = 'dismissed',
  Snoozed = 'snoozed'
}
```

## Data Models

### Contact (Enhanced)
```typescript
interface Contact {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  timezone?: string;
  frequencyPreference?: FrequencyOption;
  lastContactDate?: Date;
  customNotes?: string;
  tags: Tag[];           // Enhanced: Include tags
  groupIds: string[];    // Enhanced: Include group IDs
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Calendar Event
```typescript
interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAvailable: boolean;
  source: 'google' | 'manual' | 'test';
  createdAt: Date;
}
```

### Test Data Metadata
```typescript
interface TestDataMetadata {
  id: string;
  userId: string;
  entityType: 'contact' | 'group' | 'tag' | 'calendar_event' | 'suggestion';
  entityId: string;
  createdAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Test contact data validity
*For any* generated test contact, the contact should have a non-empty name, a valid email format (if email is provided), a real location from the city dataset, and a valid frequency preference from the allowed options.
**Validates: Requirements 1.2**

### Property 2: Test contact date variance
*For any* set of generated test contacts, the last contact dates should have sufficient variance (standard deviation > 0) to simulate different relationship states.
**Validates: Requirements 1.3**

### Property 3: Test contact tags presence
*For any* generated test contact, the contact should have at least one tag with non-empty text.
**Validates: Requirements 1.4**

### Property 4: Test contact group assignment
*For any* generated test contact, the contact should be assigned to at least one group.
**Validates: Requirements 1.5**

### Property 5: Timezone inference correctness
*For any* location string that matches a known city in the dataset, the inferred timezone should match the expected timezone for that city.
**Validates: Requirements 1.6**

### Property 6: Calendar events creation
*For any* test data generation operation, if calendar event generation is enabled, the calendar_events table should contain new records after generation.
**Validates: Requirements 2.1**

### Property 7: Calendar events span multiple days
*For any* set of generated calendar events, the events should span at least 2 different dates.
**Validates: Requirements 2.2**

### Property 8: Calendar events include weekdays and weekends
*For any* set of generated calendar events with weekend inclusion enabled, the events should include at least one weekday and at least one weekend day.
**Validates: Requirements 2.3**

### Property 9: Calendar events time variance
*For any* set of generated calendar events, the start times should have sufficient variance (at least 2 different hours of the day).
**Validates: Requirements 2.4**

### Property 10: Suggestion generation completeness
*For any* generated suggestion, the suggestion should have both a valid contact ID and a valid time slot with start and end times.
**Validates: Requirements 3.2**

### Property 11: Suggestion reasoning presence
*For any* generated suggestion, the reasoning field should be non-empty.
**Validates: Requirements 3.3**

### Property 12: Suggestion count accuracy
*For any* suggestion generation operation, the returned count should equal the actual number of suggestions created in the database.
**Validates: Requirements 3.5**

### Property 13: Test data idempotency
*For any* user, calling the seed test data function twice should not result in duplicate contacts (contacts with identical names and emails).
**Validates: Requirements 4.1**

### Property 14: Test data cleanup completeness
*For any* user with test data, calling the clear test data function should remove all test data records from all related tables (contacts, tags, groups, calendar_events, suggestions).
**Validates: Requirements 4.4**

### Property 15: API response format consistency
*For any* test data endpoint, the response should include a success indicator and details about the operation (counts or error messages).
**Validates: Requirements 4.5**

### Property 16: Authentication requirement
*For any* test data endpoint, calling it without an authentication token should return a 401 status code.
**Validates: Requirements 6.2**

### Property 17: User ID validation
*For any* test data endpoint, calling it without a user ID should return a 400 status code.
**Validates: Requirements 6.3**

### Property 18: Suggestion filtering correctness
*For any* status value, filtering suggestions by that status should return only suggestions with that exact status.
**Validates: Requirements 7.1**

### Property 19: Tag display completeness
*For any* contact with tags, the rendered HTML should contain all tag texts from the contact's tags array.
**Validates: Requirements 8.1**

### Property 20: Group display completeness
*For any* contact with groups, the rendered HTML should contain all group names from the contact's groups.
**Validates: Requirements 8.2**

### Property 21: Empty tag/group section hiding
*For any* contact without tags or groups, the rendered HTML should not contain empty tag or group section elements.
**Validates: Requirements 8.5**

### Property 22: Tag persistence
*For any* valid tag text, adding it to a contact through the UI should result in the tag being saved to the database and associated with the contact.
**Validates: Requirements 9.3**

### Property 23: Group assignment persistence
*For any* valid group, assigning it to a contact through the UI should result in the association being saved to the database.
**Validates: Requirements 9.4**

### Property 24: Tag/group removal persistence
*For any* tag or group associated with a contact, removing it through the UI should result in the association being deleted from the database.
**Validates: Requirements 9.5**

### Property 25: Group suggestion contact membership
*For any* generated group suggestion, the suggestion should include between 2 and 3 contacts.
**Validates: Requirements 10.4**

### Property 26: Group suggestion shared context
*For any* generated group suggestion, the shared context score should be at least 50 points (the threshold).
**Validates: Requirements 10.5**

### Property 27: Voice note contact associations
*For any* generated voice note, the voice note should be associated with at least one contact.
**Validates: Requirements 11.2**

### Property 28: Voice note co-mentions
*For any* set of generated voice notes, at least one voice note should mention multiple contacts (co-mention).
**Validates: Requirements 11.4**

### Property 29: Voice note timestamp variance
*For any* set of generated voice notes, the recording timestamps should have sufficient variance (span at least 7 days).
**Validates: Requirements 11.5**

### Property 30: Complete test data cleanup
*For any* user with test data, clearing test data should remove all records from all tables (contacts, tags, groups, calendar_events, suggestions, voice_notes, voice_note_contacts).
**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

## Error Handling

### Test Data Generation Errors

1. **Database Transaction Failures**
   - Use database transactions for all test data operations
   - Rollback on any error to maintain consistency
   - Return detailed error messages to the client

2. **Duplicate Data Prevention**
   - Check for existing test data before generation
   - Use unique constraints on email addresses
   - Provide clear error messages when duplicates are detected

3. **Invalid Input Handling**
   - Validate all input parameters (userId, options)
   - Return 400 Bad Request for invalid inputs
   - Provide descriptive error messages

### UI Error Handling

1. **API Call Failures**
   - Display user-friendly error messages
   - Log detailed errors to console
   - Provide retry options for transient failures

2. **Authentication Errors**
   - Redirect to login on 401 errors
   - Clear invalid tokens from localStorage
   - Display appropriate error messages

3. **Data Loading Errors**
   - Show error states in UI components
   - Provide refresh/retry buttons
   - Log errors for debugging

## Testing Strategy

### Unit Tests

Unit tests will cover:
- Test data generation functions (contact generation, calendar event generation)
- Timezone inference logic
- Tag and group management functions
- Suggestion filtering logic
- API endpoint input validation
- Error handling paths

### Property-Based Tests

Property-based tests will use **fast-check** (TypeScript/JavaScript property-based testing library) to verify the correctness properties defined above. Each property will be implemented as a separate test with a minimum of 100 iterations.

**Configuration**:
```typescript
import fc from 'fast-check';

// Example property test configuration
fc.assert(
  fc.property(
    fc.array(contactArbitrary, { minLength: 1, maxLength: 10 }),
    (contacts) => {
      // Property assertion
    }
  ),
  { numRuns: 100 }
);
```

**Test Organization**:
- `src/api/routes/test-data.test.ts` - API endpoint tests
- `src/contacts/test-data-generator.test.ts` - Test data generation logic tests
- `src/calendar/calendar-event-generator.test.ts` - Calendar event generation tests
- `public/js/app.test.ts` - UI filtering and rendering tests (if UI testing framework is added)

**Property Test Tags**:
Each property-based test will be tagged with a comment referencing the design document:
```typescript
// Feature: test-data-generation-ui, Property 1: Test contact data validity
```

### Integration Tests

Integration tests will cover:
- End-to-end test data generation flow
- API endpoint integration with database
- UI interaction with API endpoints
- Tag and group CRUD operations
- Suggestion filtering with real data

### Manual Testing

Manual testing checklist:
- [ ] Click "Seed Test Data" button and verify contacts are created
- [ ] Verify tags and groups are displayed in contact cards
- [ ] Click suggestion filter buttons and verify filtering works
- [ ] Add tags and groups to contacts through UI
- [ ] Remove tags and groups from contacts through UI
- [ ] Generate suggestions and verify they appear
- [ ] Clear test data and verify cleanup

## Implementation Notes

### Database Schema Updates

No schema changes are required. The existing schema already supports:
- Contacts with tags and groups
- Calendar events
- Suggestions with status

### API Route Organization

Move test data endpoints from `/api/suggestions/test/*` to `/api/test-data/*`:
- `POST /api/test-data/seed` - Seed test contacts, groups, tags, calendar events, and suggestions
- `POST /api/test-data/generate-suggestions` - Generate suggestions for existing contacts
- `POST /api/test-data/clear` - Clear all test data for a user

### UI Enhancements

1. **Contact Cards**: Add tag and group display sections
2. **Contact Form**: Add tag and group management inputs
3. **Suggestion Filters**: Fix filtering logic to properly filter by status
4. **Test Data Controls**: Ensure buttons call correct endpoints

### Environment Configuration

Add optional environment variable to disable test data endpoints in production:
```
ENABLE_TEST_DATA_ENDPOINTS=false
```

## Performance Considerations

1. **Batch Operations**: Use batch inserts for test data generation
2. **Transaction Management**: Use database transactions to ensure atomicity
3. **Caching**: Invalidate relevant caches after test data operations
4. **Pagination**: Consider pagination for large test data sets

## Security Considerations

1. **Authentication**: All test data endpoints require authentication
2. **Authorization**: Users can only generate/clear test data for their own account
3. **Production Safety**: Test data endpoints can be disabled in production
4. **Input Validation**: Validate all input parameters to prevent injection attacks
5. **Rate Limiting**: Apply rate limiting to test data endpoints to prevent abuse
