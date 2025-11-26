# Group Matching Service

The Group Matching Service identifies potential group catchup opportunities by analyzing shared context between contacts.

## Overview

This service helps the CatchUp application suggest group meetings (2-3 contacts) when contacts share strong connections through:
- Common group memberships
- Shared tags/interests
- Co-mentions in voice notes
- Recent group interactions

## Requirements

Implements requirements: 8.3, 8.4, 8.5, 8.6, 9.3, 9.4

## Shared Context Scoring Algorithm

The service calculates a shared context score (0-100) based on four factors:

### 1. Common Group Memberships (30 points max)
- 10 points per shared group
- Example: If contacts are both in "College Friends" and "Hiking Group", they get 20 points

### 2. Shared Tags/Interests (30 points max)
- 5 points per shared tag
- Example: If contacts both have tags "hiking", "photography", "coffee", they get 15 points

### 3. Co-mentions in Voice Notes (25 points max)
- 5 points per voice note where contacts are mentioned together
- Example: If user recorded 3 voice notes mentioning both contacts, they get 15 points

### 4. Recent Group Interactions (15 points max)
- 5 points per group interaction in the last 90 days
- Example: If contacts were mentioned together in 2 recent voice notes, they get 10 points

### Threshold

**Group Suggestion Threshold: 50 points**

Only groups scoring 50+ points are suggested for group catchups. Below this threshold, individual suggestions are generated instead.

## Key Methods

### `calculateSharedContext(contacts: Contact[]): Promise<SharedContextScore>`

Calculates the shared context score for a group of contacts.

**Parameters:**
- `contacts`: Array of 2-3 Contact objects

**Returns:**
```typescript
{
  score: number,        // 0-100
  factors: {
    commonGroups: string[],
    sharedTags: string[],
    coMentionedInVoiceNotes: number,
    overlappingInterests: string[]
  }
}
```

**Example:**
```typescript
const contacts = [contact1, contact2, contact3];
const sharedContext = await groupMatchingService.calculateSharedContext(contacts);

if (sharedContext.score >= GROUP_SUGGESTION_THRESHOLD) {
  console.log('Strong shared context - suggest group catchup!');
  console.log(`Common groups: ${sharedContext.factors.commonGroups.join(', ')}`);
}
```

### `findPotentialGroups(userContacts: Contact[], maxGroupSize: number): Promise<ContactGroup[]>`

Identifies all potential groups from a user's contact list.

**Parameters:**
- `userContacts`: All contacts for the user
- `maxGroupSize`: Maximum group size (default: 3)

**Returns:**
Array of ContactGroup objects sorted by shared context score (highest first):
```typescript
{
  contacts: Contact[],
  sharedContext: SharedContextScore,
  suggestedDuration: number  // minutes (60 for 2 people, 90 for 3)
}
```

**Example:**
```typescript
const allContacts = await contactService.listContacts(userId);
const potentialGroups = await groupMatchingService.findPotentialGroups(allContacts, 3);

for (const group of potentialGroups) {
  console.log(`Suggest meeting with: ${group.contacts.map(c => c.name).join(', ')}`);
  console.log(`Duration: ${group.suggestedDuration} minutes`);
  console.log(`Score: ${group.sharedContext.score}`);
}
```

### `analyzeVoiceNoteCoMentions(userId: string): Promise<Map<string, string[]>>`

Analyzes voice notes to find which contacts are frequently mentioned together.

**Parameters:**
- `userId`: User ID

**Returns:**
Map of contact ID to array of contact IDs they were mentioned with

**Example:**
```typescript
const coMentionMap = await groupMatchingService.analyzeVoiceNoteCoMentions(userId);

for (const [contactId, coMentionedWith] of coMentionMap.entries()) {
  console.log(`Contact ${contactId} was mentioned with ${coMentionedWith.length} others`);
}
```

## Usage in Suggestion Generation

The Group Matching Service is used by the Suggestion Service to generate balanced suggestions:

```typescript
import { groupMatchingService, GROUP_SUGGESTION_THRESHOLD } from './group-matching-service';

// 1. Get all contacts
const contacts = await contactService.listContacts(userId);

// 2. Find potential groups
const potentialGroups = await groupMatchingService.findPotentialGroups(contacts, 3);

// 3. Generate group suggestions for high-scoring groups
for (const group of potentialGroups) {
  if (group.sharedContext.score >= GROUP_SUGGESTION_THRESHOLD) {
    // Create group suggestion
    const suggestion = await createGroupSuggestion(group);
  }
}

// 4. Generate individual suggestions for remaining contacts
// (contacts not in any group suggestion)
```

## Group Size Constraints

**Property 5: Group suggestion membership constraints**

- Minimum group size: 2 contacts
- Maximum group size: 3 contacts
- Groups of 2: Suggested duration 60 minutes
- Groups of 3: Suggested duration 90 minutes

## Performance Considerations

- The service generates all possible combinations of 2-3 contacts
- For N contacts, this generates:
  - C(N, 2) = N × (N-1) / 2 pairs
  - C(N, 3) = N × (N-1) × (N-2) / 6 triplets
- Example: 50 contacts → 1,225 pairs + 19,600 triplets = 20,825 combinations
- Only combinations scoring 50+ are returned
- Consider caching results for large contact lists

## Database Queries

The service performs several database queries:

1. **Co-mention counting**: Finds voice notes mentioning all contacts in a group
2. **Recent interactions**: Finds voice notes from last 90 days with all contacts
3. **Co-mention analysis**: Aggregates all contact pairs mentioned together

All queries are optimized with proper indexes on:
- `voice_note_contacts.voice_note_id`
- `voice_note_contacts.contact_id`
- `voice_notes.user_id`
- `voice_notes.recording_timestamp`

## Testing

See `group-matching-example.ts` for usage examples.

Property-based tests validate:
- **Property 4**: Shared context score reflects all factors correctly
- **Property 5**: Group size is between 2-3 contacts
- **Property 8**: Threshold enforcement (50+ for groups, below for individuals)

## Future Enhancements

1. **Machine Learning**: Train model to predict successful group meetups
2. **Temporal Patterns**: Identify contacts who meet regularly as a group
3. **Location Clustering**: Suggest groups based on geographic proximity
4. **Activity Matching**: Suggest groups for specific activities (hiking, dinner, etc.)
5. **Dynamic Thresholds**: Adjust threshold based on user's contact network size
