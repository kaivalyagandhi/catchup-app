# Backend API Requirements for Group Suggestions UI

## Overview
This document specifies the backend API changes required to support the group suggestions UI implementation completed in Task 16.

## Required API Changes

### 1. Update Suggestion Data Model

#### Current Structure (Individual Only)
```typescript
{
  id: string,
  userId: string,
  contactId: string,  // Single contact
  triggerType: 'shared_activity' | 'timebound',
  proposedTimeslot: { start: Date, end: Date },
  reasoning: string,
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed',
  priority: number,
  // ... other fields
}
```

#### Required Structure (Group Support)
```typescript
{
  id: string,
  userId: string,
  type: 'individual' | 'group',  // NEW: Suggestion type
  contactId: string,              // KEEP: For backward compatibility
  contacts: Contact[],            // NEW: Array of 1-3 contacts
  triggerType: 'shared_activity' | 'timebound',
  proposedTimeslot: { start: Date, end: Date },
  reasoning: string,
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed',
  priority: number,
  sharedContext?: SharedContextScore,  // NEW: For group suggestions
  // ... other fields
}
```

#### SharedContextScore Structure
```typescript
interface SharedContextScore {
  score: number;  // 0-100, threshold for group: 50+
  factors: {
    commonGroups: string[];           // Group names (not IDs)
    sharedTags: string[];             // Tag texts (not IDs)
    coMentionedInVoiceNotes: number;  // Count of co-mentions
    overlappingInterests: string[];   // Additional shared interests
  };
}
```

#### Contact Structure (Must Include)
```typescript
interface Contact {
  id: string,
  name: string,
  email?: string,
  phone?: string,
  location?: string,
  frequencyPreference?: string,
  groups: string[],      // Group IDs
  tags: Tag[]            // Tag objects with id and text
}
```

### 2. Update GET /api/suggestions/all Endpoint

#### Current Response
```json
[
  {
    "id": "sugg-123",
    "userId": "user-456",
    "contactId": "contact-789",
    "triggerType": "timebound",
    "proposedTimeslot": {
      "start": "2025-11-30T14:00:00Z",
      "end": "2025-11-30T16:00:00Z"
    },
    "reasoning": "It's been 4 weeks...",
    "status": "pending",
    "priority": 120
  }
]
```

#### Required Response (With Group Support)
```json
[
  {
    "id": "sugg-123",
    "userId": "user-456",
    "type": "group",
    "contactId": "contact-1",  // First contact for backward compatibility
    "contacts": [
      {
        "id": "contact-1",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "location": "Seattle, WA",
        "frequencyPreference": "weekly",
        "groups": ["group-1", "group-2"],
        "tags": [
          { "id": "tag-1", "text": "hiking" },
          { "id": "tag-2", "text": "photography" }
        ]
      },
      {
        "id": "contact-2",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "location": "Seattle, WA",
        "frequencyPreference": "weekly",
        "groups": ["group-1", "group-2"],
        "tags": [
          { "id": "tag-1", "text": "hiking" },
          { "id": "tag-3", "text": "cooking" }
        ]
      }
    ],
    "sharedContext": {
      "score": 75,
      "factors": {
        "commonGroups": ["Outdoor Friends", "College Buddies"],
        "sharedTags": ["hiking"],
        "coMentionedInVoiceNotes": 3,
        "overlappingInterests": ["hiking", "nature"]
      }
    },
    "triggerType": "shared_activity",
    "proposedTimeslot": {
      "start": "2025-11-30T14:00:00Z",
      "end": "2025-11-30T16:00:00Z"
    },
    "reasoning": "These friends share hiking interests and were mentioned together in your recent voice notes.",
    "status": "pending",
    "priority": 150
  },
  {
    "id": "sugg-456",
    "userId": "user-456",
    "type": "individual",
    "contactId": "contact-3",
    "contacts": [
      {
        "id": "contact-3",
        "name": "Sarah Williams",
        "email": "sarah@example.com",
        "location": "San Francisco, CA",
        "frequencyPreference": "monthly",
        "groups": ["group-3"],
        "tags": [
          { "id": "tag-4", "text": "coffee" },
          { "id": "tag-5", "text": "books" }
        ]
      }
    ],
    "triggerType": "timebound",
    "proposedTimeslot": {
      "start": "2025-11-28T10:00:00Z",
      "end": "2025-11-28T11:00:00Z"
    },
    "reasoning": "It's been 4 weeks since you last connected with Sarah.",
    "status": "pending",
    "priority": 120
  }
]
```

#### Implementation Notes
1. **Populate contacts array**: Always include full contact objects
2. **Calculate shared context**: For group suggestions only
3. **Set type field**: 'group' for 2-3 contacts, 'individual' for 1
4. **Maintain contactId**: Set to first contact ID for backward compatibility
5. **Include priority**: Used for sorting in UI
6. **Resolve group names**: Convert group IDs to names in sharedContext
7. **Resolve tag texts**: Include tag objects with text field

### 3. New Endpoint: POST /api/suggestions/:id/remove-contact

#### Purpose
Remove a contact from a group suggestion. If only one contact remains, convert to individual suggestion.

#### Request
```http
POST /api/suggestions/sugg-123/remove-contact
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-456",
  "contactId": "contact-2"
}
```

#### Success Response (Contact Removed)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "convertedToIndividual": false,
  "suggestion": {
    "id": "sugg-123",
    "type": "group",
    "contacts": [
      { "id": "contact-1", "name": "John Doe", ... },
      { "id": "contact-3", "name": "Mike Johnson", ... }
    ],
    // ... other fields
  }
}
```

#### Success Response (Converted to Individual)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "convertedToIndividual": true,
  "suggestion": {
    "id": "sugg-123",
    "type": "individual",
    "contactId": "contact-1",
    "contacts": [
      { "id": "contact-1", "name": "John Doe", ... }
    ],
    "sharedContext": null,  // Removed for individual
    // ... other fields
  }
}
```

#### Error Responses
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Contact not found in this suggestion"
}
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Cannot remove the only contact from a suggestion"
}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Suggestion not found"
}
```

#### Implementation Logic
```typescript
async function removeContactFromSuggestion(
  suggestionId: string,
  userId: string,
  contactId: string
): Promise<RemoveContactResult> {
  // 1. Fetch suggestion
  const suggestion = await getSuggestion(suggestionId, userId);
  
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }
  
  // 2. Verify contact is in suggestion
  const contactIndex = suggestion.contacts.findIndex(c => c.id === contactId);
  
  if (contactIndex === -1) {
    throw new Error('Contact not found in this suggestion');
  }
  
  // 3. Check if this is the only contact
  if (suggestion.contacts.length === 1) {
    throw new Error('Cannot remove the only contact from a suggestion');
  }
  
  // 4. Remove contact
  suggestion.contacts.splice(contactIndex, 1);
  
  // 5. Check if conversion needed
  let convertedToIndividual = false;
  
  if (suggestion.contacts.length === 1) {
    // Convert to individual
    suggestion.type = 'individual';
    suggestion.contactId = suggestion.contacts[0].id;
    suggestion.sharedContext = null;
    convertedToIndividual = true;
    
    // Update reasoning
    suggestion.reasoning = generateIndividualReasoning(suggestion.contacts[0]);
  } else {
    // Recalculate shared context
    suggestion.sharedContext = calculateSharedContext(suggestion.contacts);
    
    // Update reasoning
    suggestion.reasoning = generateGroupReasoning(suggestion.contacts, suggestion.sharedContext);
  }
  
  // 6. Update in database
  await updateSuggestion(suggestion);
  
  // 7. Return result
  return {
    success: true,
    convertedToIndividual,
    suggestion
  };
}
```

### 4. Update POST /api/suggestions/:id/accept Endpoint

#### Current Behavior
Accepts suggestion for single contact.

#### Required Behavior
Accept suggestion for all contacts in group.

#### Implementation Changes
```typescript
async function acceptSuggestion(suggestionId: string, userId: string) {
  const suggestion = await getSuggestion(suggestionId, userId);
  
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }
  
  // Update suggestion status
  suggestion.status = 'accepted';
  await updateSuggestion(suggestion);
  
  // Create interaction logs for ALL contacts
  for (const contact of suggestion.contacts) {
    await createInteractionLog({
      userId,
      contactId: contact.id,
      date: suggestion.proposedTimeslot.start,
      type: 'hangout',
      suggestionId: suggestion.id
    });
  }
  
  // If group, optionally create calendar event with all contacts
  if (suggestion.type === 'group') {
    await createGroupCalendarEvent(suggestion);
  }
  
  return { success: true, suggestion };
}
```

### 5. Database Schema Updates

#### suggestions Table
```sql
ALTER TABLE suggestions
ADD COLUMN type VARCHAR(20) DEFAULT 'individual',
ADD COLUMN shared_context JSONB;

-- Add index for type
CREATE INDEX idx_suggestions_type ON suggestions(type);
```

#### suggestion_contacts Table (New)
```sql
CREATE TABLE suggestion_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(suggestion_id, contact_id)
);

CREATE INDEX idx_suggestion_contacts_suggestion_id ON suggestion_contacts(suggestion_id);
CREATE INDEX idx_suggestion_contacts_contact_id ON suggestion_contacts(contact_id);
```

### 6. Shared Context Calculation

#### Algorithm
```typescript
function calculateSharedContext(contacts: Contact[]): SharedContextScore {
  let score = 0;
  const factors = {
    commonGroups: [],
    sharedTags: [],
    coMentionedInVoiceNotes: 0,
    overlappingInterests: []
  };
  
  // 1. Find common groups (30 points max)
  const groupSets = contacts.map(c => new Set(c.groups));
  const commonGroupIds = Array.from(groupSets[0]).filter(groupId =>
    groupSets.every(set => set.has(groupId))
  );
  
  factors.commonGroups = await resolveGroupNames(commonGroupIds);
  score += Math.min(factors.commonGroups.length * 10, 30);
  
  // 2. Find shared tags (30 points max)
  const tagSets = contacts.map(c => new Set(c.tags.map(t => t.text)));
  const sharedTagTexts = Array.from(tagSets[0]).filter(tagText =>
    tagSets.every(set => set.has(tagText))
  );
  
  factors.sharedTags = sharedTagTexts;
  score += Math.min(factors.sharedTags.length * 5, 30);
  
  // 3. Count co-mentions in voice notes (25 points max)
  const contactIds = contacts.map(c => c.id);
  const coMentions = await countVoiceNoteCoMentions(contactIds);
  
  factors.coMentionedInVoiceNotes = coMentions;
  score += Math.min(coMentions * 5, 25);
  
  // 4. Recent group interactions (15 points max)
  const recentGroupInteractions = await countRecentGroupInteractions(contactIds);
  score += Math.min(recentGroupInteractions * 5, 15);
  
  // 5. Overlapping interests (derived from tags)
  factors.overlappingInterests = factors.sharedTags;
  
  return { score, factors };
}
```

#### Helper Functions
```typescript
async function countVoiceNoteCoMentions(contactIds: string[]): Promise<number> {
  // Query voice_note_contacts table
  // Count voice notes that have ALL these contacts
  const result = await pool.query(`
    SELECT COUNT(DISTINCT voice_note_id) as count
    FROM (
      SELECT voice_note_id
      FROM voice_note_contacts
      WHERE contact_id = ANY($1)
      GROUP BY voice_note_id
      HAVING COUNT(DISTINCT contact_id) = $2
    ) subquery
  `, [contactIds, contactIds.length]);
  
  return result.rows[0].count;
}

async function countRecentGroupInteractions(contactIds: string[]): Promise<number> {
  // Query interaction_logs table
  // Count interactions in last 90 days where all contacts were involved
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // This is complex - may need a group_interactions table
  // For now, return 0 or implement based on your schema
  return 0;
}

async function resolveGroupNames(groupIds: string[]): Promise<string[]> {
  if (groupIds.length === 0) return [];
  
  const result = await pool.query(
    'SELECT name FROM groups WHERE id = ANY($1)',
    [groupIds]
  );
  
  return result.rows.map(row => row.name);
}
```

### 7. Group Suggestion Generation

#### When to Generate Group Suggestions
```typescript
async function generateSuggestions(userId: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  
  // 1. Get all contacts
  const contacts = await getContacts(userId);
  
  // 2. Generate individual suggestions
  const individualSuggestions = await generateIndividualSuggestions(contacts);
  suggestions.push(...individualSuggestions);
  
  // 3. Find potential groups (2-3 contacts)
  const potentialGroups = await findPotentialGroups(contacts);
  
  // 4. Generate group suggestions
  for (const group of potentialGroups) {
    const sharedContext = calculateSharedContext(group.contacts);
    
    // Only create group suggestion if score >= 50
    if (sharedContext.score >= 50) {
      const groupSuggestion = await createGroupSuggestion(
        userId,
        group.contacts,
        sharedContext
      );
      suggestions.push(groupSuggestion);
    }
  }
  
  // 5. Balance suggestions (ensure contact uniqueness)
  const balancedSuggestions = balanceSuggestions(suggestions);
  
  // 6. Sort by priority
  balancedSuggestions.sort((a, b) => b.priority - a.priority);
  
  return balancedSuggestions;
}
```

#### Finding Potential Groups
```typescript
async function findPotentialGroups(contacts: Contact[]): Promise<ContactGroup[]> {
  const groups: ContactGroup[] = [];
  
  // Try all combinations of 2-3 contacts
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      // Pair
      groups.push({ contacts: [contacts[i], contacts[j]] });
      
      // Triple
      for (let k = j + 1; k < contacts.length; k++) {
        groups.push({ contacts: [contacts[i], contacts[j], contacts[k]] });
      }
    }
  }
  
  return groups;
}
```

#### Balancing Suggestions
```typescript
function balanceSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const balanced: Suggestion[] = [];
  const usedContactIds = new Set<string>();
  
  // Sort by priority first
  suggestions.sort((a, b) => b.priority - a.priority);
  
  for (const suggestion of suggestions) {
    const contactIds = suggestion.contacts.map(c => c.id);
    
    // Check if any contact is already used
    const hasUsedContact = contactIds.some(id => usedContactIds.has(id));
    
    if (!hasUsedContact) {
      balanced.push(suggestion);
      contactIds.forEach(id => usedContactIds.add(id));
    }
  }
  
  return balanced;
}
```

## Testing Requirements

### Unit Tests
1. Test shared context calculation
2. Test contact removal logic
3. Test conversion to individual
4. Test group suggestion generation
5. Test suggestion balancing

### Integration Tests
1. Test GET /api/suggestions/all with groups
2. Test POST /api/suggestions/:id/remove-contact
3. Test POST /api/suggestions/:id/accept for groups
4. Test database schema changes

### End-to-End Tests
1. Generate group suggestions
2. Display in UI
3. Remove contact from group
4. Accept group suggestion
5. Verify interaction logs created

## Migration Plan

### Phase 1: Database Schema
1. Add new columns to suggestions table
2. Create suggestion_contacts junction table
3. Run migration scripts
4. Verify data integrity

### Phase 2: Backend Logic
1. Implement shared context calculation
2. Implement group suggestion generation
3. Update existing endpoints
4. Implement new remove-contact endpoint

### Phase 3: Testing
1. Unit tests
2. Integration tests
3. Manual testing with UI

### Phase 4: Deployment
1. Deploy database changes
2. Deploy backend changes
3. Monitor for errors
4. Gather feedback

## Performance Considerations

1. **Shared Context Calculation**: Cache results for 1 hour
2. **Group Finding**: Limit to contacts with recent activity
3. **Database Queries**: Use indexes on junction tables
4. **API Response Size**: Consider pagination for large result sets

## Security Considerations

1. **Authorization**: Verify userId owns suggestion
2. **Validation**: Validate contactId exists in suggestion
3. **Rate Limiting**: Limit remove-contact calls
4. **Input Sanitization**: Sanitize all user inputs

## Backward Compatibility

1. **contactId field**: Maintained for legacy clients
2. **Individual suggestions**: Still work as before
3. **API versioning**: Consider /api/v2 if breaking changes needed
4. **Graceful degradation**: Old clients ignore new fields

## Documentation Updates

1. Update API documentation
2. Add examples for group suggestions
3. Document shared context algorithm
4. Provide migration guide
5. Update Postman collection

## Support & Monitoring

1. Log all remove-contact operations
2. Monitor shared context scores
3. Track group suggestion acceptance rates
4. Alert on errors
5. Gather user feedback
