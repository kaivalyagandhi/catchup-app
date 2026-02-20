# Design Document: Test Data Generation UI

## Overview

This feature enhances the CatchUp application's test data generation capabilities by providing granular control over test data generation and removal in the user preferences panel. Users can selectively generate or remove specific types of test data (contacts, calendar events, suggestions, group suggestions, and voice notes) with a clear status display showing counts of both test and real data. The system will provide developers with a flexible way to populate the application with realistic test data while maintaining the ability to reset specific data types independently.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Preferences Panel                                      │ │
│  │ ┌──────────────────────────────────────────────────┐  │ │
│  │ │ Test Data Management Section                     │  │ │
│  │ │ ┌────────────────────────────────────────────┐  │  │ │
│  │ │ │ Status Panel (Test vs Real Counts)         │  │  │ │
│  │ │ │ - Contacts: 15 test / 42 real              │  │  │ │
│  │ │ │ - Calendar Events: 20 test / 5 real        │  │  │ │
│  │ │ │ - Suggestions: 10 test / 3 real            │  │  │ │
│  │ │ │ - Group Suggestions: 5 test / 1 real       │  │  │ │
│  │ │ │ - Voice Notes: 8 test / 2 real             │  │  │ │
│  │ │ └────────────────────────────────────────────┘  │  │ │
│  │ │ ┌────────────────────────────────────────────┐  │  │ │
│  │ │ │ Data Type Controls (Repeating)             │  │  │ │
│  │ │ │ [Generate] [Remove] Contacts               │  │  │ │
│  │ │ │ [Generate] [Remove] Calendar Events        │  │  │ │
│  │ │ │ [Generate] [Remove] Suggestions            │  │  │ │
│  │ │ │ [Generate] [Remove] Group Suggestions      │  │  │ │
│  │ │ │ [Generate] [Remove] Voice Notes            │  │  │ │
│  │ │ └────────────────────────────────────────────┘  │  │ │
│  │ └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/test-data                                       │  │
│  │ - POST /generate/:dataType (contacts, calendar, etc) │  │
│  │ - POST /remove/:dataType                             │  │
│  │ - GET /status                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Test Data Service                                    │  │
│  │ - generateContacts()                                 │  │
│  │ - generateCalendarEvents()                           │  │
│  │ - generateSuggestions()                              │  │
│  │ - generateGroupSuggestions()                         │  │
│  │ - generateVoiceNotes()                               │  │
│  │ - removeContacts()                                   │  │
│  │ - removeCalendarEvents()                             │  │
│  │ - removeSuggestions()                                │  │
│  │ - removeGroupSuggestions()                           │  │
│  │ - removeVoiceNotes()                                 │  │
│  │ - getStatus()                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Contact Repo | Calendar Repo | Suggestion Repo      │  │
│  │ Voice Repo | Tag Repo | Group Repo                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  contacts | tags | groups | calendar_events | suggestions   │
│  voice_notes | voice_note_contacts | enrichment_items       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Test Data Service

**Purpose**: Provide granular control over test data generation and removal for each data type independently.

**Interface**:
```typescript
interface TestDataService {
  generateContacts(userId: string): Promise<GenerateResult>;
  generateCalendarEvents(userId: string): Promise<GenerateResult>;
  generateSuggestions(userId: string): Promise<GenerateResult>;
  generateGroupSuggestions(userId: string): Promise<GenerateResult>;
  generateVoiceNotes(userId: string): Promise<GenerateResult>;
  
  removeContacts(userId: string): Promise<RemoveResult>;
  removeCalendarEvents(userId: string): Promise<RemoveResult>;
  removeSuggestions(userId: string): Promise<RemoveResult>;
  removeGroupSuggestions(userId: string): Promise<RemoveResult>;
  removeVoiceNotes(userId: string): Promise<RemoveResult>;
  
  getStatus(userId: string): Promise<StatusResult>;
}

interface GenerateResult {
  success: boolean;
  itemsCreated: number;
  message: string;
}

interface RemoveResult {
  success: boolean;
  itemsDeleted: number;
  message: string;
}

interface StatusResult {
  contacts: { test: number; real: number };
  calendarEvents: { test: number; real: number };
  suggestions: { test: number; real: number };
  groupSuggestions: { test: number; real: number };
  voiceNotes: { test: number; real: number };
}
```

**Responsibilities**:
- Generate realistic contact data with varied attributes
- Create test groups and assign contacts to them
- Generate tags for contacts
- Create calendar events representing user availability
- Generate suggestions based on contacts and availability
- Generate group suggestions with shared context
- Generate voice notes with co-mentions
- Remove specific types of test data independently
- Track test data vs real data counts
- Maintain referential integrity during deletion

### 2. Test Data Management UI Component

**Purpose**: Provide a preferences panel interface for managing test data generation and removal.

**Interface**:
```typescript
interface TestDataManagementUI {
  renderStatusPanel(status: StatusResult): HTMLElement;
  renderControlsPanel(): HTMLElement;
  onGenerateClick(dataType: DataType): Promise<void>;
  onRemoveClick(dataType: DataType): Promise<void>;
  updateStatus(status: StatusResult): void;
  showLoadingState(dataType: DataType): void;
  showSuccessMessage(dataType: DataType, result: GenerateResult): void;
  showErrorMessage(dataType: DataType, error: Error): void;
}

type DataType = 'contacts' | 'calendarEvents' | 'suggestions' | 'groupSuggestions' | 'voiceNotes';

interface StatusPanel {
  contacts: { test: number; real: number };
  calendarEvents: { test: number; real: number };
  suggestions: { test: number; real: number };
  groupSuggestions: { test: number; real: number };
  voiceNotes: { test: number; real: number };
}
```

**Responsibilities**:
- Display status counts for each data type
- Render generate/remove buttons for each data type
- Handle button clicks and API calls
- Show loading states during operations
- Display success/error messages
- Refresh status counts after operations
- Provide visual feedback to user

### 3. Test Data Metadata Tracking

**Purpose**: Track which data items are test data vs real data.

**Interface**:
```typescript
interface TestDataMetadata {
  id: string;
  userId: string;
  entityType: 'contact' | 'group' | 'tag' | 'calendar_event' | 'suggestion' | 'voice_note';
  entityId: string;
  createdAt: Date;
}
```

**Responsibilities**:
- Mark all generated test data with metadata
- Enable filtering of test vs real data
- Support cleanup operations
- Maintain referential integrity

## Data Models

### Contact
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
  tags: Tag[];
  groupIds: string[];
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

### Suggestion
```typescript
interface Suggestion {
  id: string;
  userId: string;
  contactId: string;
  startTime: Date;
  endTime: Date;
  reasoning: string;
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed';
  source: 'algorithm' | 'test';
  createdAt: Date;
}
```

### Voice Note
```typescript
interface VoiceNote {
  id: string;
  userId: string;
  transcription: string;
  recordedAt: Date;
  source: 'user' | 'test';
  createdAt: Date;
}
```

### Test Data Metadata
```typescript
interface TestDataMetadata {
  id: string;
  userId: string;
  entityType: 'contact' | 'group' | 'tag' | 'calendar_event' | 'suggestion' | 'voice_note';
  entityId: string;
  createdAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Status panel displays all data types
*For any* user with test data management UI rendered, the status panel should display counts for all five data types (contacts, calendar events, suggestions, group suggestions, voice notes).
**Validates: Requirements 1.2**

### Property 2: Status counts match database
*For any* data type, the displayed test count should equal the actual count of test data in the database for that type.
**Validates: Requirements 1.4**

### Property 3: Real counts match database
*For any* data type, the displayed real count should equal the actual count of real data in the database for that type.
**Validates: Requirements 1.5**

### Property 4: Generate/Remove buttons present for all types
*For any* test data management UI, each of the five data types should have both a "Generate" and "Remove" button.
**Validates: Requirements 1.6**

### Property 5: Test contact data validity
*For any* generated test contact, the contact should have a non-empty name, a valid email format, a real location from the city dataset, and a valid frequency preference.
**Validates: Requirements 2.2**

### Property 6: Test contact date variance
*For any* set of generated test contacts, the last contact dates should have sufficient variance (standard deviation > 0).
**Validates: Requirements 2.3**

### Property 7: Test contact tags presence
*For any* generated test contact, the contact should have at least one tag with non-empty text.
**Validates: Requirements 2.4**

### Property 8: Test contact group assignment
*For any* generated test contact, the contact should be assigned to at least one group.
**Validates: Requirements 2.5**

### Property 9: Timezone inference correctness
*For any* location string that matches a known city in the dataset, the inferred timezone should match the expected timezone for that city.
**Validates: Requirements 2.6**

### Property 10: Calendar events creation
*For any* calendar event generation operation, the calendar_events table should contain new test records after generation.
**Validates: Requirements 3.1**

### Property 11: Calendar events span multiple days
*For any* set of generated calendar events, the events should span at least 2 different dates.
**Validates: Requirements 3.2**

### Property 12: Calendar events include weekdays and weekends
*For any* set of generated calendar events, the events should include at least one weekday and at least one weekend day.
**Validates: Requirements 3.3**

### Property 13: Calendar events time variance
*For any* set of generated calendar events, the start times should have sufficient variance (at least 2 different hours of the day).
**Validates: Requirements 3.4**

### Property 14: Suggestion generation completeness
*For any* generated suggestion, the suggestion should have both a valid contact ID and a valid time slot with start and end times.
**Validates: Requirements 4.2**

### Property 15: Suggestion reasoning presence
*For any* generated suggestion, the reasoning field should be non-empty.
**Validates: Requirements 4.3**

### Property 16: Suggestion count accuracy
*For any* suggestion generation operation, the returned count should equal the actual number of suggestions created in the database.
**Validates: Requirements 4.5**

### Property 17: Group suggestion contact membership
*For any* generated group suggestion, the suggestion should include between 2 and 3 contacts.
**Validates: Requirements 5.2**

### Property 18: Group suggestion shared context
*For any* generated group suggestion, the shared context score should be present and non-null.
**Validates: Requirements 5.3**

### Property 19: Group suggestion reasoning presence
*For any* generated group suggestion, the reasoning field should be non-empty.
**Validates: Requirements 5.4**

### Property 20: Group suggestion count accuracy
*For any* group suggestion generation operation, the returned count should equal the actual number of group suggestions created in the database.
**Validates: Requirements 5.5**

### Property 21: Voice note creation
*For any* voice note generation operation, the voice_notes table should contain new test records after generation.
**Validates: Requirements 6.1**

### Property 22: Voice note contact associations
*For any* generated voice note, the voice note should be associated with at least one contact.
**Validates: Requirements 6.2**

### Property 23: Voice note transcriptions and entities
*For any* generated voice note, the transcription should be non-empty and entities should be present.
**Validates: Requirements 6.3**

### Property 24: Voice note co-mentions
*For any* set of generated voice notes, at least one voice note should mention multiple contacts.
**Validates: Requirements 6.4**

### Property 25: Voice note timestamp variance
*For any* set of generated voice notes, the recording timestamps should have sufficient variance (span at least 7 days).
**Validates: Requirements 6.5**

### Property 26: Test data removal completeness
*For any* data type, after clicking the "Remove" button, the count of test data for that type should be 0.
**Validates: Requirements 7.1**

### Property 27: Cascading deletion for contacts
*For any* test contacts removed, their associated test tags and group assignments should also be removed.
**Validates: Requirements 7.2**

### Property 28: Real data preservation
*For any* test data removal operation, the count of real data should remain unchanged.
**Validates: Requirements 7.6**

### Property 29: Status counts refresh after operations
*For any* test data generation or removal operation, the displayed status counts should be updated to reflect the new database state.
**Validates: Requirements 8.4**

### Property 30: Authentication requirement
*For any* test data endpoint, calling it without an authentication token should return a 401 status code.
**Validates: Requirements 9.2**

### Property 31: User ID validation
*For any* test data endpoint, calling it without a user ID should return a 400 status code.
**Validates: Requirements 9.3**

### Property 32: Production endpoint disabling
*For any* test data endpoint, when the ENABLE_TEST_DATA_ENDPOINTS environment variable is false, the endpoint should return a 403 status code.
**Validates: Requirements 9.5**

### Property 33: Test data idempotency
*For any* user, calling the generate function for a data type twice should not result in duplicate data (same name/email for contacts, same timestamp for events, etc.).
**Validates: Requirements 10.1**

### Property 34: Test data metadata tracking
*For any* generated test data, the data should be marked with test metadata for tracking purposes.
**Validates: Requirements 10.3**

### Property 35: Selective test data removal
*For any* test data removal operation, only data marked as test data should be removed, not real data.
**Validates: Requirements 10.5**

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

A new table is required to track test data metadata:

```sql
CREATE TABLE test_data_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_test_data_metadata_user_id ON test_data_metadata(user_id);
CREATE INDEX idx_test_data_metadata_entity_type ON test_data_metadata(entity_type);
```

This table enables:
- Tracking which data items are test data
- Filtering test vs real data counts
- Selective cleanup of test data
- Idempotency checks

### API Route Organization

Organize test data endpoints under `/api/test-data/*`:
- `POST /api/test-data/generate/:dataType` - Generate specific type of test data
  - dataType: 'contacts' | 'calendarEvents' | 'suggestions' | 'groupSuggestions' | 'voiceNotes'
- `POST /api/test-data/remove/:dataType` - Remove specific type of test data
- `GET /api/test-data/status` - Get status counts for all data types

### UI Implementation

1. **Preferences Panel**: Add "Test Data Management" section
2. **Status Panel**: Display test vs real counts for each data type
3. **Control Buttons**: Generate and Remove buttons for each data type
4. **Feedback**: Loading states, success/error messages
5. **Auto-refresh**: Update counts after operations

### Environment Configuration

Add optional environment variable to disable test data endpoints in production:
```
ENABLE_TEST_DATA_ENDPOINTS=true
```

## Performance Considerations

1. **Batch Operations**: Use batch inserts for test data generation
2. **Transaction Management**: Use database transactions to ensure atomicity
3. **Caching**: Invalidate relevant caches after test data operations
4. **Query Optimization**: Use indexes on test_data_metadata table for fast filtering

## Security Considerations

1. **Authentication**: All test data endpoints require authentication
2. **Authorization**: Users can only generate/clear test data for their own account
3. **Production Safety**: Test data endpoints can be disabled in production via environment variable
4. **Input Validation**: Validate all input parameters to prevent injection attacks
5. **Rate Limiting**: Apply rate limiting to test data endpoints to prevent abuse
6. **Data Isolation**: Ensure test data operations only affect the authenticated user's data
