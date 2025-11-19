# CatchUp Relationship Manager - Design Document

## Overview

CatchUp is a relationship management application that helps users maintain meaningful connections by intelligently suggesting when and how to catch up with friends. The system combines calendar integration, voice-based context capture, and smart matching algorithms to reduce coordination friction and facilitate authentic connections.

The application follows a three-phase interaction model:
1. **Context Building**: Users enrich contact profiles through voice notes and manual entry
2. **Intelligent Matching**: The system analyzes calendar availability, relationship history, and shared interests to generate suggestions
3. **Frictionless Action**: Users receive notifications and can act on suggestions through multiple channels (SMS, email, web feed)

**Key Design Principles:**
- **Minimal Friction**: Every interaction should require minimal user effort
- **Privacy-First**: User data remains under their control with explicit consent for integrations
- **Learning System**: The application improves suggestions based on user feedback and dismissal patterns
- **Multi-Channel**: Support interaction through web, SMS, and email to meet users where they are

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────┬──────────────────┬────────────────────────┤
│   Web Interface │   SMS Gateway    │   Email Gateway        │
└────────┬────────┴────────┬─────────┴──────────┬─────────────┘
         │                 │                     │
         └─────────────────┼─────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   API Gateway       │
                └──────────┬──────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Contact │      │Suggestion│      │Calendar │
    │ Service │      │  Engine  │      │ Service │
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                 │
         └────────────────┼─────────────────┘
                          │
                ┌─────────▼─────────┐
                │   Data Layer      │
                ├───────────────────┤
                │ PostgreSQL DB     │
                └───────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐      ┌───▼────┐      ┌───▼────┐
    │ Google  │      │ Voice  │      │  NLP   │
    │Calendar │      │Transcr.│      │Service │
    │   API   │      │Service │      │        │
    └─────────┘      └────────┘      └────────┘
```

### Component Responsibilities

**Contact Service**
- Manages CRUD operations for contacts, groups, and tags
- Handles contact enrichment from voice notes and notification replies
- Maintains interaction history and frequency preferences
- Performs timezone inference from location data

**Suggestion Engine**
- Generates Time-bound and Shared Activity suggestions
- Implements matching logic considering availability, proximity, and relationship context
- Applies priority scoring with recency decay
- Manages suggestion lifecycle (pending, accepted, dismissed, snoozed)

**Calendar Service**
- Integrates with Google Calendar via OAuth
- Identifies free time slots based on user-configured availability parameters
- Publishes iCal/Google Calendar feeds of suggestions
- Detects events suitable for friend invitations

**Notification Service**
- Delivers batch notifications (default: Sunday 9am)
- Sends real-time notifications for event-tied suggestions
- Routes messages through SMS and email channels
- Processes user replies for suggestion actions and contact enrichment

**Voice Processing Service**
- Transcribes audio recordings to text
- Disambiguates contact references
- Extracts entities and attributes via NLP
- Generates confirmation interfaces for enrichment approval

## Components and Interfaces

### Contact Service

```typescript
interface ContactService {
  // Contact CRUD
  createContact(data: ContactCreateData): Promise<Contact>
  updateContact(id: string, data: ContactUpdateData): Promise<Contact>
  getContact(id: string): Promise<Contact>
  listContacts(filters?: ContactFilters): Promise<Contact[]>
  deleteContact(id: string): Promise<void>
  archiveContact(id: string): Promise<void>
  
  // Group management
  createGroup(name: string): Promise<Group>
  updateGroup(id: string, name: string): Promise<Group>
  archiveGroup(id: string): Promise<void>
  assignContactToGroup(contactId: string, groupId: string): Promise<void>
  bulkAssignContactsToGroup(contactIds: string[], groupId: string): Promise<void>
  bulkRemoveContactsFromGroup(contactIds: string[], groupId: string): Promise<void>
  
  // Tag management
  addTag(contactId: string, tag: Tag): Promise<void>
  removeTag(contactId: string, tagId: string): Promise<void>
  updateTag(tagId: string, text: string): Promise<Tag>
  deduplicateTags(contactId: string): Promise<void>
  promoteTagToGroup(tagText: string): Promise<Group>
  
  // Interaction logging
  logInteraction(data: InteractionLogData): Promise<InteractionLog>
  getInteractionHistory(contactId: string): Promise<InteractionLog[]>
  
  // Frequency preferences
  setFrequencyPreference(contactId: string, frequency: FrequencyOption): Promise<void>
  
  // Import
  importFromGoogleContacts(accessToken: string): Promise<ImportResult>
  
  // Account management
  deleteUserAccount(userId: string): Promise<void>
}
```

### Suggestion Engine

```typescript
interface SuggestionEngine {
  // Generation
  generateTimebound Suggestions(): Promise<Suggestion[]>
  generateSharedActivitySuggestions(calendarEvent: CalendarEvent): Promise<Suggestion[]>
  
  // Matching logic
  matchContactsToTimeslot(timeslot: TimeSlot, contacts: Contact[]): Promise<ContactMatch[]>
  calculatePriority(contact: Contact, lastContactDate: Date): number
  applyRecencyDecay(daysSinceContact: number, frequencyPreference: FrequencyOption): number
  
  // Lifecycle management
  acceptSuggestion(id: string): Promise<AcceptResult>
  dismissSuggestion(id: string, reason: DismissalReason): Promise<void>
  snoozeSuggestion(id: string, duration: Duration): Promise<void>
  
  // Feed
  getPendingSuggestions(userId: string): Promise<Suggestion[]>
}
```

### Calendar Service

```typescript
interface CalendarService {
  // OAuth integration
  connectGoogleCalendar(authCode: string): Promise<CalendarConnection>
  listUserCalendars(userId: string): Promise<GoogleCalendar[]>
  setSelectedCalendars(userId: string, calendarIds: string[]): Promise<void>
  refreshCalendarData(userId: string): Promise<void>
  
  // Availability detection
  getFreeTimeSlots(userId: string, dateRange: DateRange): Promise<TimeSlot[]>
  applyAvailabilityParameters(slots: TimeSlot[], params: AvailabilityParams): TimeSlot[]
  
  // Feed publishing
  publishSuggestionFeed(userId: string): Promise<CalendarFeedUrl>
  updateFeedEvent(suggestionId: string): Promise<void>
  
  // Event analysis
  detectInvitableEvents(userId: string): Promise<CalendarEvent[]>
}
```

### Notification Service

```typescript
interface NotificationService {
  // Delivery
  sendBatchNotification(userId: string, suggestions: Suggestion[]): Promise<void>
  sendRealtimeNotification(userId: string, suggestion: Suggestion): Promise<void>
  
  // Configuration
  setNotificationPreferences(userId: string, prefs: NotificationPreferences): Promise<void>
  
  // Reply processing
  processIncomingSMS(from: string, body: string): Promise<void>
  processIncomingEmail(from: string, subject: string, body: string): Promise<void>
  
  // Content generation
  generateNotificationText(suggestion: Suggestion): string
  generateDraftMessage(suggestion: Suggestion): string
}
```

### Voice Processing Service

```typescript
interface VoiceProcessingService {
  // Transcription
  transcribeAudio(audioData: Buffer): Promise<string>
  
  // Entity extraction
  disambiguateContact(transcript: string, userContacts: Contact[]): Promise<Contact | null>
  extractEntities(transcript: string): Promise<ExtractedEntities>
  
  // Enrichment workflow
  generateEnrichmentConfirmation(entities: ExtractedEntities, contact: Contact | null, userContacts: Contact[]): EnrichmentProposal
  applyEnrichment(contactId: string, proposal: EnrichmentProposal): Promise<Contact>
  preferExistingTags(newTags: string[], existingTags: Tag[], similarityThreshold: number): string[]
}
```

## Data Models

### Contact

```typescript
interface Contact {
  id: string
  userId: string
  name: string
  phone?: string
  email?: string
  linkedIn?: string
  instagram?: string
  xHandle?: string
  otherSocialMedia?: Record<string, string>
  location?: string
  timezone?: string  // Auto-inferred from location
  customNotes?: string
  lastContactDate?: Date
  frequencyPreference?: FrequencyOption
  groups: string[]  // Group IDs
  tags: Tag[]
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

enum FrequencyOption {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  FLEXIBLE = 'flexible'
}
```

### Group

```typescript
interface Group {
  id: string
  userId: string
  name: string
  isDefault: boolean  // System-created groups
  isPromotedFromTag: boolean
  archived: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Tag

```typescript
interface Tag {
  id: string
  text: string  // 1-3 words
  source: 'voice_memo' | 'manual' | 'notification_reply'
  createdAt: Date
}
```

### Suggestion

```typescript
interface Suggestion {
  id: string
  userId: string
  contactId: string
  triggerType: 'shared_activity' | 'timebound'
  proposedTimeslot: TimeSlot
  reasoning: string
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed'
  dismissalReason?: string
  calendarEventId?: string  // For shared activity suggestions
  snoozedUntil?: Date
  createdAt: Date
  updatedAt: Date
}

interface TimeSlot {
  start: Date
  end: Date
  timezone: string
}
```

### InteractionLog

```typescript
interface InteractionLog {
  id: string
  userId: string
  contactId: string
  date: Date
  type: 'hangout' | 'call' | 'text' | 'calendar_event'
  notes?: string
  suggestionId?: string  // If created from accepting a suggestion
  createdAt: Date
  // Note: Only stores catchup-related communications, not all messages
}
```

### GoogleCalendar

```typescript
interface GoogleCalendar {
  id: string
  userId: string
  calendarId: string  // Google Calendar ID
  name: string
  description?: string
  selected: boolean  // Whether this calendar is used for suggestions
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}
```

### VoiceNote

```typescript
interface VoiceNote {
  id: string
  userId: string
  audioUrl: string
  transcript: string
  contactId?: string  // Disambiguated contact
  extractedEntities?: ExtractedEntities
  processed: boolean
  createdAt: Date
}

interface ExtractedEntities {
  fields: Record<string, any>  // Contact field updates
  tags: string[]
  groups: string[]
  lastContactDate?: Date
}

interface EnrichmentProposal {
  contactId: string | null  // null if contact needs manual selection
  items: EnrichmentItem[]  // Atomic items for individual review
  requiresContactSelection: boolean
}

interface EnrichmentItem {
  id: string
  type: 'field' | 'tag' | 'group' | 'lastContactDate'
  action: 'add' | 'update' | 'remove'
  field?: string  // For field updates
  value: any
  accepted: boolean
}
```

### AvailabilityParams

```typescript
interface AvailabilityParams {
  manualTimeBlocks?: TimeBlock[]
  commuteWindows?: CommuteWindow[]
  nighttimeStart?: string  // HH:mm format
  nighttimeEnd?: string
}

interface TimeBlock {
  dayOfWeek: number  // 0-6
  startTime: string  // HH:mm
  endTime: string
}

interface CommuteWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}
```

### NotificationPreferences

```typescript
interface NotificationPreferences {
  smsEnabled: boolean
  emailEnabled: boolean
  batchDay: number  // 0-6, default 0 (Sunday)
  batchTime: string  // HH:mm, default "09:00"
  timezone: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Contact Management Properties

**Property 1: Contact field persistence**
*For any* contact with specified fields (name, phone, email, social media handles, location, notes), creating or updating the contact should result in all fields being immediately persisted and retrievable.
**Validates: Requirements 1.1, 1.6**

**Property 2: Timezone inference from location**
*For any* valid location, when a contact's location is set or updated, the system should automatically infer and store a valid timezone corresponding to that location.
**Validates: Requirements 1.2, 1.3**

**Property 3: Multiple group membership**
*For any* contact and any set of groups, assigning the contact to multiple groups should result in all group memberships being preserved and retrievable.
**Validates: Requirements 1.4**

**Property 4: Contact profile completeness**
*For any* contact with associated metadata, the profile view should include all fields: location, inferred timezone, tags, last contact date, and frequency preference.
**Validates: Requirements 1.5**

**Property 5: Complete contact deletion**
*For any* contact with associated data (tags, interactions, group memberships), deleting the contact should remove the contact and all associated data from the system.
**Validates: Requirements 1.7**

### Group Management Properties

**Property 6: Group creation**
*For any* valid group name, creating a group should result in a group entity being persisted with that name.
**Validates: Requirements 2.1**

**Property 7: Group name propagation**
*For any* group with associated contacts, updating the group name should result in all contacts reflecting the new group name.
**Validates: Requirements 2.2**

**Property 7.1: Bulk group assignment**
*For any* set of contacts and a group, bulk adding the contacts to the group should result in all contacts being members of that group.
**Validates: Requirements 2.3**

**Property 7.2: Bulk group removal**
*For any* set of contacts and a group, bulk removing the contacts from the group should result in none of the contacts being members of that group.
**Validates: Requirements 2.4**

**Property 8: Group archival preserves contacts**
*For any* group with member contacts, archiving the group should mark it as archived while preserving all member contacts in the system.
**Validates: Requirements 2.5**

**Property 9: Tag to group promotion**
*For any* tag text, promoting it to a group should create a new group with that name and mark it as system-promoted from tags.
**Validates: Requirements 2.7**

### Voice Note Processing Properties

**Property 10: Voice transcription**
*For any* audio recording, the system should produce a text transcription.
**Validates: Requirements 3.1**

**Property 11: Contact disambiguation**
*For any* voice note transcript mentioning a contact, the system should attempt to identify which contact in the user's network is being referenced, returning null if no match is found.
**Validates: Requirements 3.2**

**Property 11.1: Contact selection on failed disambiguation**
*For any* voice note where contact disambiguation returns null, the system should continue processing and present the user's contact list for manual selection in the confirmation interface.
**Validates: Requirements 3.3**

**Property 12: Entity extraction**
*For any* transcript, the system should extract entities and attributes using natural language parsing.
**Validates: Requirements 3.4**

**Property 13: Enrichment confirmation generation**
*For any* extracted entities, the system should generate a confirmation interface showing which contact fields will be updated, which tags will be added, and which group memberships will change.
**Validates: Requirements 3.5, 3.6**

**Property 13.1: Contact editing in confirmation**
*For any* enrichment confirmation interface, the user should be able to edit the selected contact.
**Validates: Requirements 3.7**

**Property 13.2: Atomic enrichment item presentation**
*For any* enrichment proposal, each item (field update, tag addition, group membership) should be presented atomically for individual selection, editing, acceptance, or removal.
**Validates: Requirements 3.8**

**Property 14: Enrichment modification**
*For any* enrichment proposal, the user should be able to edit field values, tag text, and group assignments before application.
**Validates: Requirements 3.9**

**Property 15: Enrichment application**
*For any* accepted enrichment proposal (from voice notes or notification replies), all proposed changes should be applied: contact fields updated, tags generated and associated (1-3 words each), and group memberships updated.
**Validates: Requirements 3.10, 3.11, 3.12, 22.9, 22.10, 22.11**

**Property 15.1: Existing tag preference**
*For any* set of new tags being generated, when existing tags have similar meaning within a similarity threshold, the system should prefer existing tags over creating new tags.
**Validates: Requirements 3.13**

**Property 16: Tag deduplication**
*For any* set of similar tags, the system should deduplicate based on semantic similarity.
**Validates: Requirements 3.14, 4.4**

### Tag Management Properties

**Property 17: Tag display and metadata**
*For any* contact with tags, the profile should display all tags with their source (voice memo, manual entry, or notification reply).
**Validates: Requirements 4.1, 4.5**

**Property 18: Tag removal**
*For any* tag associated with a contact, removing the tag should delete the association from that contact.
**Validates: Requirements 4.2**

**Property 19: Tag text update**
*For any* tag, updating the tag text should modify the text while preserving the association with the contact.
**Validates: Requirements 4.3**

### Interaction Logging Properties

**Property 20: Interaction logging from suggestion acceptance**
*For any* accepted suggestion, the system should create an interaction log entry with date, time, and type, and update the contact's last contact date.
**Validates: Requirements 5.1, 5.2, 16.3, 22.13**

**Property 21: Manual interaction logging**
*For any* manually logged interaction with date, time, type (hangout, call, text), and notes, all fields should be persisted and the contact's last contact date should be updated.
**Validates: Requirements 5.3**

**Property 21.1: Interaction log scope**
*For any* interaction log, the system should record only catchup-related communications, not all messages between the user and the contact.
**Validates: Requirements 5.4**

**Property 22: Calendar event interaction logging**
*For any* calendar event associated with a contact, the system should optionally create an interaction log entry.
**Validates: Requirements 5.5**

### Frequency Preference Properties

**Property 23: Frequency preference prompting**
*For any* contact without a configured frequency preference, accepting a suggestion or dismissing with reason "met too recently" should trigger a prompt for frequency preference specification.
**Validates: Requirements 6.1, 6.3, 16.4**

**Property 24: Frequency preference options**
*For any* contact, the system should accept and store any of the frequency options: Daily, Weekly, Monthly, Yearly, or Flexible.
**Validates: Requirements 6.2**

**Property 25: Frequency preference affects timing**
*For any* contact with a configured frequency preference, the preference should be used to calculate next connection timing and affect future suggestion generation.
**Validates: Requirements 6.4, 6.5**

### Calendar Integration Properties

**Property 26: Calendar listing**
*For any* user with Google Calendar access granted, the system should display all calendars associated with the user's Google account.
**Validates: Requirements 7.2**

**Property 26.1: Calendar selection**
*For any* user viewing available calendars, the system should allow selection of multiple calendars for suggestion generation.
**Validates: Requirements 7.3**

**Property 26.2: Calendar configuration editing**
*For any* user with selected calendars, the system should allow editing which calendars are used for availability calculations.
**Validates: Requirements 7.4**

**Property 26.3: Free time slot detection**
*For any* calendar with existing events in selected calendars, the system should identify free time slots by analyzing gaps between events.
**Validates: Requirements 7.5**

**Property 27: Availability parameter configuration**
*For any* user, the system should accept and store availability parameters including manual time blocks, commute times, and nighttime patterns.
**Validates: Requirements 7.6, 20.1, 20.2, 20.3**

**Property 28: Availability parameter application**
*For any* set of free time slots and configured availability parameters, the system should filter slots to identify true available time according to the parameters.
**Validates: Requirements 7.7, 20.4**

**Property 29: Availability recalculation on changes**
*For any* calendar data change or availability parameter update, the system should refresh and recalculate availability predictions.
**Validates: Requirements 7.8, 20.5**

### Calendar Feed Properties

**Property 30: Suggestion feed publishing**
*For any* generated suggestion, the system should publish it to a dynamically updating calendar feed.
**Validates: Requirements 8.1**

**Property 31: Feed update on status change**
*For any* suggestion status change (accepted, dismissed, snoozed), the system should immediately update the published calendar feed to reflect the change.
**Validates: Requirements 8.3**

**Property 32: Feed event content**
*For any* suggestion in the calendar feed, the event should display contact name, reasoning, and proposed timeslot.
**Validates: Requirements 8.4**

**Property 33: Event invitation suggestions**
*For any* calendar event with potential for friend invitations, the system should suggest contacts based on geographic proximity, shared interests, and time since last contact.
**Validates: Requirements 8.5**

### Suggestion Generation Properties

**Property 34: Shared activity interest matching**
*For any* calendar event, the system should identify contacts with shared interests related to the event.
**Validates: Requirements 9.1**

**Property 35: Shared activity proximity filtering**
*For any* in-person calendar event, matching contacts should consider geographic proximity.
**Validates: Requirements 9.2**

**Property 36: Shared activity recency consideration**
*For any* calendar event, matching contacts should consider time since last contact.
**Validates: Requirements 9.3**

**Property 37: Shared activity suggestion content**
*For any* shared activity suggestion, the suggestion should include event details, reasoning, and be marked with trigger type "Shared Activity".
**Validates: Requirements 9.4, 9.5**

**Property 38: Timebound suggestion generation**
*For any* contact where time since last contact exceeds the frequency preference threshold, the system should generate a timebound suggestion matched to an available calendar slot.
**Validates: Requirements 10.1, 10.2**

**Property 39: Communication preference respect**
*For any* contact with "IRL preferred" tag, suggestions should be for in-person activities; for contacts with "URL preferred" tag, suggestions should be for phone or video calls.
**Validates: Requirements 10.3, 10.4, 11.4**

**Property 40: Timebound trigger type marking**
*For any* timebound suggestion, the trigger type should be marked as "Time-bound".
**Validates: Requirements 10.5**

**Property 41: Priority calculation with recency decay**
*For any* contact, calculating suggestion priority should apply recency decay based on time since last contact relative to frequency preference.
**Validates: Requirements 11.1**

**Property 42: Availability parameter consideration in matching**
*For any* suggestion matching to timeslots, the system should consider user-configured availability parameters.
**Validates: Requirements 11.2**

**Property 43: Close Friends prioritization**
*For any* timeslot with multiple matching contacts, contacts in the "Close Friends" group should be prioritized over others.
**Validates: Requirements 11.3**

### Notification Delivery Properties

**Property 44: Batch notification delivery**
*For any* configured batch notification time, when that time arrives, the system should send notifications for all pending suggestions without calendar events via the configured channels (SMS primary, email optional).
**Validates: Requirements 12.1, 12.4, 12.5**

**Property 45: Batch notification timing configuration**
*For any* user, the system should accept and store batch notification timing with day of week and time specifications.
**Validates: Requirements 12.2**

**Property 46: Real-time notification delivery**
*For any* suggestion tied to an existing or newly created calendar event, the system should immediately send a real-time notification via configured channels (SMS primary, email optional) and publish to the in-app feed.
**Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

**Property 47: Notification content completeness**
*For any* notification, the text should include proposed timeslot, contact name, reasoning (shared interests, time since last contact, or event context), and action options (accept, dismiss, snooze).
**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Notification Reply Processing Properties

**Property 48: Reply metadata extraction**
*For any* SMS or email reply to a notification, the system should parse the text to extract contact metadata using natural language processing.
**Validates: Requirements 22.1, 22.2, 22.3**

**Property 49: Reply entity association**
*For any* entities extracted from a reply, they should be associated with the contact referenced in the original notification.
**Validates: Requirements 22.4**

**Property 50: Reply enrichment confirmation**
*For any* extracted entities from a reply, the system should send a confirmation message showing which contact fields will be updated, which tags will be added, and which group memberships will change.
**Validates: Requirements 22.5, 22.6**

**Property 51: Reply modification workflow**
*For any* enrichment confirmation, the user should be able to request modifications to specific enrichment items via follow-up reply.
**Validates: Requirements 22.8**

**Property 52: Reply suggestion action processing**
*For any* reply containing suggestion action keywords, the system should update the suggestion state accordingly: acceptance should mark as accepted and create an interaction log; dismissal should mark as dismissed and optionally extract reasoning.
**Validates: Requirements 22.12, 22.13, 22.14**

**Property 53: Reply enrichment persistence**
*For any* accepted enrichment from a reply, the updates should be persisted immediately and a confirmation message sent to the user.
**Validates: Requirements 22.15, 22.16**

### Suggestion Feed Properties

**Property 54: Feed displays pending suggestions**
*For any* user accessing the suggestion feed, all pending suggestions should be displayed with contact name, proposed timeslot, and reasoning.
**Validates: Requirements 15.1, 15.2**

**Property 55: Suggestion removal from feed**
*For any* suggestion that is accepted or dismissed, it should be removed from the pending feed.
**Validates: Requirements 15.4, 17.7**

**Property 56: Suggestion snooze behavior**
*For any* snoozed suggestion, it should be temporarily hidden from the feed and resurface after the configured delay.
**Validates: Requirements 15.5**

### Suggestion Acceptance Properties

**Property 57: Acceptance draft message generation**
*For any* accepted suggestion, the system should generate a draft message personalized with contact name and context.
**Validates: Requirements 16.1**

**Property 58: Acceptance calendar feed addition**
*For any* accepted suggestion, it should be added to the published calendar feed.
**Validates: Requirements 16.2**

### Suggestion Dismissal Properties

**Property 59: Dismissal reason prompt**
*For any* dismissed suggestion, the system should prompt for a dismissal reason with multiple template options based on contact metadata and an option for custom reasons.
**Validates: Requirements 17.1, 17.2, 17.3**

**Property 60: "Met too recently" dismissal handling**
*For any* suggestion dismissed with reason "met too recently", the system should update the contact's last contact date and prompt for frequency preference specification.
**Validates: Requirements 17.5**

**Property 61: Dismissal reason persistence**
*For any* dismissal with a provided reason, the reason should be stored with the suggestion record.
**Validates: Requirements 17.6**

### Contact Import Properties

**Property 62: Google Contacts field extraction**
*For any* Google Contacts import, the system should extract all available fields including name, phone, email, and other metadata.
**Validates: Requirements 19.2**

**Property 63: Contact deduplication**
*For any* imported contacts, the system should deduplicate based on email and phone number.
**Validates: Requirements 19.3**

**Property 63.1: Automatic contact creation from integrations**
*For any* data integration added by the user, the system should create contacts on behalf of the user from the integrated data source.
**Validates: Requirements 19.4**

**Property 64: Calendar-based friend identification**
*For any* imported calendar data, the system should optionally identify friends based on frequency in calendar events.
**Validates: Requirements 19.6**

### Setup Flow Properties

**Property 65: Contact archival on import**
*For any* imported contact marked as not relevant, the system should archive the contact while preserving the record to prevent duplicate imports and maintain restoration capability.
**Validates: Requirements 18.4, 18.5**

### Data Persistence Properties

**Property 66: Immediate entity persistence**
*For any* created or updated entity (contact, group, tag, suggestion, interaction), changes should be persisted to the database immediately.
**Validates: Requirements 21.1**

**Property 67: Suggestion record persistence**
*For any* generated suggestion, the system should store the suggestion record with status tracking.
**Validates: Requirements 21.2**

**Property 68: Interaction history persistence**
*For any* logged interaction, the system should persist the interaction history permanently.
**Validates: Requirements 21.3**

**Property 69: Voice note persistence**
*For any* recorded voice note, the system should store the transcription and extracted metadata.
**Validates: Requirements 21.4**

**Property 70: Session data restoration**
*For any* user session, logging out and logging back in should restore all data without loss (round-trip property for system state).
**Validates: Requirements 21.5**

### Account Management Properties

**Property 71: Complete account deletion**
*For any* user requesting account deletion, the system should remove all user data including contacts, groups, tags, suggestions, interaction logs, voice notes, and configuration data.
**Validates: Requirements 23.1, 23.2**

**Property 72: Account deletion confirmation**
*For any* completed account deletion, the system should confirm removal to the user.
**Validates: Requirements 23.3**

### Test User Properties

**Property 73: Test user functionality**
*For any* test user, the system should support all standard user functionality.
**Validates: Requirements 24.1**

**Property 74: Test user isolation**
*For any* test user, the system should allow validation of product features in isolation from production users.
**Validates: Requirements 24.2**

## Error Handling

### Input Validation

**Location Validation**
- Invalid or ambiguous locations should prompt user for clarification
- Timezone inference failures should fall back to manual timezone selection
- Location updates should validate before applying timezone changes

**Contact Data Validation**
- Phone numbers should be validated for format
- Email addresses should be validated for format
- Social media handles should be validated against platform-specific formats
- Duplicate detection should prevent creating identical contacts

**Voice Note Processing**
- Transcription failures should be logged and user notified
- Contact disambiguation failures should prompt user to manually select contact
- Entity extraction errors should allow manual enrichment entry

**Calendar Integration**
- OAuth failures should provide clear error messages and retry options
- Calendar sync failures should not block other system functionality
- Invalid calendar data should be logged and skipped

### System Errors

**Database Errors**
- Connection failures should trigger automatic retry with exponential backoff
- Transaction failures should roll back changes and notify user
- Data corruption should be detected and logged for manual intervention

**External Service Errors**
- Google Calendar API failures should be handled gracefully with cached data
- SMS/Email delivery failures should be retried and logged
- Transcription service failures should allow manual text entry

**Notification Errors**
- Failed SMS delivery should fall back to email if configured
- Failed email delivery should be logged for manual follow-up
- Reply parsing errors should prompt user for clarification

### Edge Cases

**Timezone Handling**
- Contacts without location should allow manual timezone entry
- Daylight saving time transitions should be handled correctly
- Cross-timezone suggestions should display times in both timezones

**Suggestion Generation**
- Contacts with no interaction history should use account creation date as baseline
- Contacts with no frequency preference should use system default (Monthly)
- Calendar with no free slots should notify user and suggest expanding availability

**Concurrent Updates**
- Simultaneous contact updates should use last-write-wins with conflict detection
- Concurrent suggestion acceptance should prevent double-booking
- Race conditions in notification delivery should be prevented with idempotency keys

## Testing Strategy

### Unit Testing

The system will use unit tests to verify specific examples, edge cases, and error conditions:

**Contact Management**
- Test contact CRUD operations with various field combinations
- Test timezone inference for specific known locations
- Test group assignment and removal
- Test tag management operations
- Test contact deletion cascades

**Suggestion Engine**
- Test priority calculation with specific time gaps and preferences
- Test matching logic with specific contact and event combinations
- Test suggestion lifecycle state transitions
- Test edge cases like no available slots or no matching contacts

**Calendar Integration**
- Test OAuth flow with mock Google Calendar API
- Test free slot detection with various calendar configurations
- Test availability parameter filtering with specific time blocks
- Test feed publishing and updates

**Notification Service**
- Test notification formatting for various suggestion types
- Test batch notification scheduling
- Test real-time notification triggering
- Test reply parsing with specific message formats

**Voice Processing**
- Test transcription with sample audio files
- Test entity extraction with specific transcript examples
- Test contact disambiguation with various name mentions
- Test enrichment confirmation generation

### Property-Based Testing

The system will use property-based testing to verify universal properties across all inputs. We will use **fast-check** for JavaScript/TypeScript as the property-based testing library.

**Configuration Requirements:**
- Each property-based test MUST run a minimum of 100 iterations
- Each property-based test MUST be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: catchup-relationship-manager, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test

**Property Test Coverage:**

The property-based tests will verify all 74 correctness properties defined above, including:

- Contact field persistence across all field combinations
- Timezone inference for all valid locations
- Group and tag operations across all data combinations
- Enrichment application from all sources (voice, replies)
- Suggestion generation and matching across all calendar and contact states
- Notification delivery and reply processing across all message formats
- Calendar integration across all availability configurations
- Data persistence and restoration across all entity types

**Generator Design:**
- Smart generators should constrain to valid input spaces (e.g., valid timezones, valid phone formats)
- Generators should produce edge cases (empty strings, boundary dates, maximum field lengths)
- Generators should produce realistic data distributions (common timezones, typical contact counts)

### Integration Testing

**End-to-End Flows**
- Complete onboarding flow from account creation to first suggestion
- Voice note capture through enrichment application
- Suggestion generation through acceptance and interaction logging
- Notification delivery through reply processing
- Calendar sync through suggestion matching

**External Service Integration**
- Google Calendar OAuth and data sync
- SMS gateway integration
- Email delivery integration
- Transcription service integration
- NLP service integration

### Performance Testing

**Load Testing**
- Test suggestion generation with large contact lists (1000+ contacts)
- Test calendar sync with busy calendars (100+ events per month)
- Test batch notification delivery for many users
- Test concurrent user operations

**Response Time Requirements**
- Contact CRUD operations: < 200ms
- Suggestion generation: < 2s for 100 contacts
- Calendar sync: < 5s for 100 events
- Voice transcription: < 10s for 1-minute audio
- Notification delivery: < 1s

## Implementation Notes

### Technology Stack Recommendations

**Backend**
- Node.js with TypeScript for type safety
- PostgreSQL for relational data storage
- Redis for caching and session management
- Bull for job queue (batch notifications, suggestion generation)

**Frontend**
- React for web interface
- TailwindCSS for styling
- React Query for data fetching and caching

**External Services**
- Google Calendar API for calendar integration
- Google Contacts API for contact import
- Twilio for SMS delivery
- SendGrid for email delivery
- OpenAI Whisper or Google Speech-to-Text for transcription
- OpenAI GPT or similar for NLP entity extraction

### Architecture Decisions

**Microservices vs Monolith**
- Start with a modular monolith for faster development
- Clear service boundaries enable future microservices extraction if needed
- Shared database initially, with service-specific schemas

**Suggestion Generation Strategy**
- Run suggestion generation as scheduled job (e.g., every 6 hours)
- Generate suggestions for all users in batches
- Cache suggestions until they're accepted/dismissed/expired
- Regenerate on significant events (new interaction, preference change)

**Notification Delivery**
- Use job queue for reliable delivery
- Implement retry logic with exponential backoff
- Track delivery status for debugging
- Support webhook callbacks for delivery confirmation

**Calendar Feed Publishing**
- Generate iCal files on-demand with caching
- Use signed URLs with expiration for security
- Update feeds asynchronously when suggestions change
- Support both iCal and Google Calendar subscription formats
- Allow users to select which Google Calendars to sync (store selection in GoogleCalendar table)
- Only scan selected calendars for availability and event detection
- Provide UI for managing calendar selection preferences

**Voice Processing Pipeline**
- Async processing: upload → transcribe → extract → confirm
- Store audio files in object storage (S3 or similar)
- Queue transcription jobs for batch processing
- Cache transcriptions to avoid reprocessing
- Handle failed contact disambiguation by continuing processing and prompting for manual selection
- Present enrichment items atomically for individual review
- Implement tag similarity matching to prefer existing tags (e.g., cosine similarity with threshold of 0.85)

**Data Privacy**
- Encrypt sensitive data at rest (contact info, notes)
- Use secure OAuth flows for third-party integrations
- Implement complete data export and deletion for GDPR compliance
- Account deletion should cascade to all related entities (contacts, groups, tags, suggestions, interactions, voice notes, calendar connections)
- Audit log for sensitive operations
- Support test user creation with isolated data for validation

### Scalability Considerations

**Database Optimization**
- Index frequently queried fields (userId, contactId, status, createdAt)
- Partition large tables by userId for horizontal scaling
- Use connection pooling for efficient resource usage
- Implement read replicas for query-heavy operations

**Caching Strategy**
- Cache contact lists and profiles (TTL: 5 minutes)
- Cache calendar free slots (TTL: 1 hour)
- Cache suggestion lists (invalidate on status change)
- Use Redis for distributed caching across instances

**Background Jobs**
- Suggestion generation: scheduled job every 6 hours
- Batch notifications: scheduled based on user preferences
- Calendar sync: scheduled job every 30 minutes per user
- Voice processing: async job queue with priority levels

**Rate Limiting**
- API rate limits per user to prevent abuse
- External API rate limit handling with backoff
- Notification rate limits to prevent spam
- Voice upload size and frequency limits

