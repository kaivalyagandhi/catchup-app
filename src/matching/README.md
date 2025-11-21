# Suggestion Engine Module

The suggestion engine is responsible for generating intelligent connection suggestions based on calendar availability, relationship history, and shared interests.

## Features

### Priority Calculation
- **Recency Decay**: Calculates priority scores based on time since last contact relative to frequency preferences
- **Frequency Thresholds**: Supports Daily, Weekly, Monthly, Yearly, and Flexible preferences
- **Exponential Decay**: Uses logarithmic scaling to prevent extreme priority values

### Contact Matching
- **Multi-Factor Matching**: Considers priority, group membership, and communication preferences
- **Close Friends Prioritization**: Automatically prioritizes contacts in "Close Friends" group
- **Reasoning Generation**: Provides context for why each contact is suggested

### Suggestion Generation

#### Timebound Suggestions
- Generated when time since last contact exceeds frequency threshold
- Matched to available calendar slots
- Marked with `TIMEBOUND` trigger type

#### Shared Activity Suggestions
- Generated for calendar events suitable for friend invitations
- Matches contacts based on:
  - Shared interests (tags)
  - Geographic proximity
  - Time since last contact
- Marked with `SHARED_ACTIVITY` trigger type

### Suggestion Lifecycle

#### Accept
- Updates suggestion status to `ACCEPTED`
- Generates personalized draft message
- Creates interaction log entry
- Adds to calendar feed

#### Dismiss
- Updates suggestion status to `DISMISSED`
- Stores dismissal reason
- Special handling for "met too recently" (updates last contact date)
- Prompts for frequency preference if not set

#### Snooze
- Updates suggestion status to `SNOOZED`
- Sets resurface time
- Automatically returns to pending when time arrives

### Suggestion Feed
- Displays all pending suggestions
- Handles snoozed suggestions that should resurface
- Supports filtering by status, trigger type, and contact

## Usage

### Calculate Priority

```typescript
import { calculatePriority } from './matching';
import { FrequencyOption } from '../types';

const contact = {
  id: 'contact-1',
  userId: 'user-1',
  name: 'Alice',
  frequencyPreference: FrequencyOption.WEEKLY,
  // ... other fields
};

const lastContactDate = new Date('2024-01-01');
const priority = calculatePriority(contact, lastContactDate);

console.log(`Priority: ${priority}`);
// Higher scores indicate higher priority for connection
```

### Match Contacts to Timeslot

```typescript
import { matchContactsToTimeslot } from './matching';

const timeslot = {
  start: new Date('2024-01-20T14:00:00Z'),
  end: new Date('2024-01-20T15:00:00Z'),
  timezone: 'UTC',
};

const matches = await matchContactsToTimeslot('user-1', timeslot, contacts);

matches.forEach(match => {
  console.log(`${match.contact.name}: ${match.priority}`);
  console.log(`Reasoning: ${match.reasoning}`);
});
```

### Generate Timebound Suggestions

```typescript
import { generateTimeboundSuggestions } from './matching';

const availableSlots = [
  {
    start: new Date('2024-01-20T10:00:00Z'),
    end: new Date('2024-01-20T11:00:00Z'),
    timezone: 'UTC',
  },
  // ... more slots
];

const suggestions = await generateTimeboundSuggestions('user-1', availableSlots);

console.log(`Generated ${suggestions.length} suggestions`);
```

### Generate Shared Activity Suggestions

```typescript
import { generateSharedActivitySuggestions } from './matching';

const eventDetails = {
  title: 'Hiking at Mount Tamalpais',
  description: 'Morning hike with great views',
  location: 'Mill Valley, CA',
  start: new Date('2024-01-27T09:00:00Z'),
  end: new Date('2024-01-27T12:00:00Z'),
  timezone: 'America/Los_Angeles',
};

const suggestions = await generateSharedActivitySuggestions(
  'user-1',
  'event-123',
  eventDetails
);

suggestions.forEach(suggestion => {
  console.log(`Invite ${suggestion.contactId}`);
  console.log(`Reasoning: ${suggestion.reasoning}`);
});
```

### Accept Suggestion

```typescript
import { acceptSuggestion } from './matching';

const result = await acceptSuggestion('suggestion-123', 'user-1');

console.log(`Status: ${result.suggestion.status}`);
console.log(`Draft Message: ${result.draftMessage}`);
console.log(`Interaction Log: ${result.interactionLog.id}`);
```

### Dismiss Suggestion

```typescript
import { dismissSuggestion, generateDismissalReasonTemplates } from './matching';

// Get suggested reasons
const templates = generateDismissalReasonTemplates(contact);
console.log('Suggested reasons:', templates);

// Dismiss with reason
const suggestion = await dismissSuggestion(
  'suggestion-123',
  'user-1',
  'Met too recently'
);

console.log(`Status: ${suggestion.status}`);
```

### Snooze Suggestion

```typescript
import { snoozeSuggestion } from './matching';

// Snooze for 24 hours
const suggestion = await snoozeSuggestion('suggestion-123', 'user-1', 24);

console.log(`Snoozed until: ${suggestion.snoozedUntil}`);
```

### Get Pending Suggestions

```typescript
import { getPendingSuggestions } from './matching';

const suggestions = await getPendingSuggestions('user-1');

suggestions.forEach(suggestion => {
  console.log(`${suggestion.contactId} at ${suggestion.proposedTimeslot.start}`);
  console.log(`Reasoning: ${suggestion.reasoning}`);
});
```

## Requirements Mapping

This module implements the following requirements:

### Priority Calculation
- **Requirement 11.1**: Priority calculation with recency decay
- **Property 41**: Priority calculation with recency decay

### Contact Matching
- **Requirement 11.2**: Availability parameter consideration in matching
- **Requirement 11.3**: Close Friends prioritization
- **Requirement 11.4**: Communication preference respect
- **Property 42**: Availability parameter consideration in matching
- **Property 43**: Close Friends prioritization
- **Property 39**: Communication preference respect

### Timebound Suggestions
- **Requirement 10.1**: Generate suggestions when frequency threshold exceeded
- **Requirement 10.2**: Match suggestions to available calendar slots
- **Requirement 10.5**: Mark trigger type as timebound
- **Property 38**: Timebound suggestion generation

### Shared Activity Suggestions
- **Requirement 8.5**: Event invitation suggestions
- **Requirement 9.1**: Shared interest matching
- **Requirement 9.2**: Proximity filtering
- **Requirement 9.3**: Recency consideration
- **Requirement 9.4**: Event details in reasoning
- **Requirement 9.5**: Trigger type marking
- **Property 34**: Shared activity interest matching
- **Property 35**: Shared activity proximity filtering
- **Property 36**: Shared activity recency consideration
- **Property 37**: Shared activity suggestion content

### Suggestion Acceptance
- **Requirement 16.1**: Draft message generation
- **Requirement 16.2**: Calendar feed addition
- **Requirement 16.3**: Interaction log creation
- **Property 57**: Acceptance draft message generation
- **Property 58**: Acceptance calendar feed addition
- **Property 20**: Interaction logging from suggestion acceptance

### Suggestion Dismissal
- **Requirement 17.1**: Dismissal reason prompt
- **Requirement 17.2**: Reason templates
- **Requirement 17.5**: "Met too recently" handling
- **Requirement 17.6**: Reason persistence
- **Property 59**: Dismissal reason prompt
- **Property 60**: "Met too recently" dismissal handling
- **Property 61**: Dismissal reason persistence

### Suggestion Feed
- **Requirement 15.1**: Display pending suggestions
- **Requirement 15.5**: Snooze behavior
- **Property 54**: Feed displays pending suggestions
- **Property 56**: Suggestion snooze behavior

## Testing

Run tests with:

```bash
npm test -- src/matching/suggestion-service.test.ts
```

The test suite includes:
- Unit tests for priority calculation
- Unit tests for recency decay
- Unit tests for contact matching
- Unit tests for dismissal reason templates
- Integration tests for suggestion lifecycle

## Architecture

### Service Layer (`suggestion-service.ts`)
- Business logic for suggestion generation and management
- Priority calculation algorithms
- Contact matching logic
- Lifecycle management (accept, dismiss, snooze)

### Repository Layer (`suggestion-repository.ts`)
- Data access for suggestions
- CRUD operations
- Query filtering

### Types
- Defined in `../types/index.ts`
- Includes `Suggestion`, `SuggestionStatus`, `TriggerType`, etc.

## Future Enhancements

1. **Machine Learning**: Use ML to improve matching accuracy based on user behavior
2. **Advanced NLP**: Better keyword extraction for shared activity matching
3. **Geocoding**: Proper distance calculation for proximity matching
4. **Optimization**: Cache priority calculations for frequently accessed contacts
5. **Analytics**: Track suggestion acceptance rates to improve algorithms
