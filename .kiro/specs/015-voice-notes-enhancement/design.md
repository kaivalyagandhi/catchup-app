# Design Document

## Overview

This design enhances the CatchUp voice notes feature to provide real-time audio transcription, support multiple contacts per voice note, enable group catchup suggestions, and deliver a comprehensive web-based UI. The system replaces OpenAI dependencies with Google Cloud services (Speech-to-Text for transcription and Gemini API for entity extraction), providing a unified Google Cloud integration strategy.

### Key Components

1. **Real-time Audio Transcription**: Browser-based microphone capture streaming to Google Cloud Speech-to-Text API
2. **Entity Extraction**: Google Gemini API with structured JSON output for extracting contact metadata
3. **Multi-Contact Support**: Voice notes can reference and enrich multiple contacts simultaneously
4. **Group Suggestion Engine**: Intelligent matching algorithm that balances group (2-3 contacts) and individual suggestions
5. **Web UI**: Complete interface for recording, reviewing, and managing voice notes with enrichment proposals

### Technology Stack

- **Frontend**: React components with MediaRecorder API for audio capture
- **Backend**: Node.js/TypeScript services
- **Transcription**: Google Cloud Speech-to-Text API (streaming recognition)
- **Entity Extraction**: Google Gemini 2.5 Flash API with JSON schema
- **Database**: PostgreSQL with junction tables for multi-contact associations
- **Real-time Updates**: WebSocket for live transcription display


## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Audio Recording  │  │ Transcript       │  │ Enrichment    │ │
│  │ Interface        │→ │ Display          │→ │ Review UI     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     ↑                      ↑         │
│           │ Audio Chunks        │ WebSocket            │ HTTP    │
└───────────┼─────────────────────┼──────────────────────┼─────────┘
            ↓                     │                      │
┌───────────────────────────────────────────────────────────────────┐
│                      Backend Services (Node.js)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ Voice Note       │  │ Transcription    │  │ Entity          ││
│  │ Service          │→ │ Service          │→ │ Extraction      ││
│  └──────────────────┘  └──────────────────┘  │ Service         ││
│           │                     │             └─────────────────┘│
│           │                     ↓                      │          │
│           │            ┌──────────────────┐           │          │
│           │            │ Contact          │←──────────┘          │
│           │            │ Disambiguation   │                      │
│           │            └──────────────────┘                      │
│           ↓                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ Enrichment       │  │ Suggestion       │  │ Group Matching  ││
│  │ Service          │  │ Service          │  │ Service         ││
│  └──────────────────┘  └──────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────────┘
            │                     │                      │
            ↓                     ↓                      ↓
┌───────────────────────────────────────────────────────────────────┐
│                    External Services                               │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ Google Cloud     │  │ Google Gemini    │                      │
│  │ Speech-to-Text   │  │ API              │                      │
│  └──────────────────┘  └──────────────────┘                      │
└───────────────────────────────────────────────────────────────────┘
            │                     │
            ↓                     ↓
┌───────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ voice_notes      │  │ voice_note_      │  │ contacts        ││
│  │                  │  │ contacts         │  │                 ││
│  └──────────────────┘  └──────────────────┘  └─────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Recording Phase**:
   - User clicks record button in browser
   - MediaRecorder captures audio chunks
   - Audio chunks stream to backend via WebSocket
   - Backend forwards chunks to Google Speech-to-Text API
   - Interim transcripts stream back to UI in real-time

2. **Processing Phase**:
   - Final transcript sent to Contact Disambiguation Service
   - Disambiguation identifies mentioned contacts (or prompts user selection)
   - For each contact, Entity Extraction Service calls Gemini API
   - Extracted entities compiled into enrichment proposals

3. **Review Phase**:
   - Enrichment proposals displayed in UI grouped by contact
   - User reviews, edits, accepts/rejects individual items
   - Accepted items applied to contact records

4. **Suggestion Phase**:
   - Group Matching Service analyzes shared context from voice notes
   - Suggestion Service generates balanced mix of group and individual suggestions
   - Suggestions delivered via feed, notifications, and calendar



## Components and Interfaces

### 1. Voice Note Service

**Responsibilities**: Orchestrate voice note creation, processing, and persistence

**Key Methods**:
```typescript
interface VoiceNoteService {
  // Create a new voice note session
  createSession(userId: string): Promise<VoiceNoteSession>;
  
  // Process streaming audio chunks
  processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<void>;
  
  // Finalize voice note and trigger processing
  finalizeVoiceNote(sessionId: string): Promise<VoiceNote>;
  
  // Get voice note by ID
  getVoiceNote(id: string, userId: string): Promise<VoiceNote>;
  
  // List voice notes with filters
  listVoiceNotes(userId: string, filters: VoiceNoteFilters): Promise<VoiceNote[]>;
  
  // Delete voice note
  deleteVoiceNote(id: string, userId: string): Promise<void>;
}
```

### 2. Transcription Service (Google Speech-to-Text)

**Responsibilities**: Stream audio to Google Cloud Speech-to-Text and return transcripts

**Key Methods**:
```typescript
interface TranscriptionService {
  // Initialize streaming recognition session
  startStream(config: StreamingConfig): Promise<TranscriptionStream>;
  
  // Send audio chunk to stream
  sendAudioChunk(stream: TranscriptionStream, chunk: Buffer): Promise<void>;
  
  // Close stream and get final transcript
  closeStream(stream: TranscriptionStream): Promise<string>;
  
  // Handle interim results callback
  onInterimResult(callback: (text: string) => void): void;
  
  // Handle final result callback
  onFinalResult(callback: (text: string) => void): void;
}

interface StreamingConfig {
  encoding: 'LINEAR16';
  sampleRateHertz: 16000;
  languageCode: string; // e.g., 'en-US'
  interimResults: boolean;
}
```

**Implementation Details**:
- Use `@google-cloud/speech` npm package
- Configure with service account credentials or API key
- Handle reconnection on stream errors
- Buffer audio chunks if stream is temporarily unavailable

### 3. Entity Extraction Service (Google Gemini API)

**Responsibilities**: Extract structured contact metadata from transcripts using Gemini

**Key Methods**:
```typescript
interface EntityExtractionService {
  // Extract entities for a single contact
  extractForContact(
    transcript: string,
    contact: Contact
  ): Promise<ExtractedEntities>;
  
  // Extract entities when contact is unknown
  extractGeneric(transcript: string): Promise<ExtractedEntities>;
  
  // Extract entities for multiple contacts
  extractForMultipleContacts(
    transcript: string,
    contacts: Contact[]
  ): Promise<Map<string, ExtractedEntities>>;
}

interface ExtractedEntities {
  fields: {
    phone?: string;
    email?: string;
    linkedIn?: string;
    instagram?: string;
    xHandle?: string;
    location?: string;
    customNotes?: string;
  };
  tags: string[];
  groups: string[];
  lastContactDate?: Date;
}
```

**Gemini API Integration**:
```typescript
// JSON Schema for entity extraction
const entitySchema = {
  type: 'object',
  properties: {
    fields: {
      type: 'object',
      properties: {
        phone: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        linkedIn: { type: 'string', nullable: true },
        instagram: { type: 'string', nullable: true },
        xHandle: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        customNotes: { type: 'string', nullable: true }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '1-3 word tags describing interests or characteristics'
    },
    groups: {
      type: 'array',
      items: { type: 'string' },
      description: 'Group names like "College Friends" or "Work Friends"'
    },
    lastContactDate: {
      type: 'string',
      format: 'date-time',
      nullable: true
    }
  },
  required: ['fields', 'tags', 'groups']
};

// API call configuration
const geminiConfig = {
  model: 'gemini-2.5-flash',
  responseMimeType: 'application/json',
  responseJsonSchema: entitySchema
};
```

### 4. Contact Disambiguation Service

**Responsibilities**: Identify which contacts are mentioned in a transcript

**Key Methods**:
```typescript
interface ContactDisambiguationService {
  // Identify contacts mentioned in transcript
  disambiguate(
    transcript: string,
    userContacts: Contact[]
  ): Promise<Contact[]>;
  
  // Use Gemini to identify contact names
  identifyContactNames(transcript: string): Promise<string[]>;
  
  // Match identified names to user's contacts
  matchToContacts(
    names: string[],
    userContacts: Contact[]
  ): Promise<Contact[]>;
}
```

**Implementation Strategy**:
- Use Gemini API to extract person names from transcript
- Fuzzy match names against user's contact list
- Return all matched contacts (supporting multiple contacts per voice note)
- Return empty array if no matches found (triggers manual selection UI)

### 5. Enrichment Service

**Responsibilities**: Generate and apply enrichment proposals

**Key Methods**:
```typescript
interface EnrichmentService {
  // Generate enrichment proposal for multiple contacts
  generateProposal(
    entities: Map<string, ExtractedEntities>,
    contacts: Contact[],
    userContacts: Contact[]
  ): Promise<EnrichmentProposal>;
  
  // Apply accepted enrichment items
  applyEnrichment(
    proposal: EnrichmentProposal,
    userId: string
  ): Promise<Contact[]>;
  
  // Apply tags to contact
  applyTags(
    contactId: string,
    userId: string,
    tags: string[],
    source: 'voice_memo'
  ): Promise<void>;
  
  // Apply groups to contact (create if needed)
  applyGroups(
    contactId: string,
    userId: string,
    groupNames: string[]
  ): Promise<void>;
  
  // Apply field updates to contact
  applyFieldUpdates(
    contactId: string,
    userId: string,
    fields: Record<string, any>
  ): Promise<void>;
}

interface EnrichmentProposal {
  voiceNoteId: string;
  contactProposals: ContactEnrichmentProposal[];
  requiresContactSelection: boolean;
}

interface ContactEnrichmentProposal {
  contactId: string | null;
  contactName: string;
  items: EnrichmentItem[];
}

interface EnrichmentItem {
  id: string;
  type: 'field' | 'tag' | 'group' | 'lastContactDate';
  action: 'add' | 'update';
  field?: string;
  value: any;
  accepted: boolean;
}
```

### 6. Group Matching Service

**Responsibilities**: Identify potential group catchup opportunities

**Key Methods**:
```typescript
interface GroupMatchingService {
  // Calculate shared context score for a group of contacts
  calculateSharedContext(contacts: Contact[]): Promise<SharedContextScore>;
  
  // Find potential groups from contact list
  findPotentialGroups(
    userContacts: Contact[],
    maxGroupSize: number
  ): Promise<ContactGroup[]>;
  
  // Analyze voice notes for co-mentioned contacts
  analyzeVoiceNoteCoMentions(userId: string): Promise<Map<string, string[]>>;
}

interface SharedContextScore {
  score: number; // 0-100
  factors: {
    commonGroups: string[];
    sharedTags: string[];
    coMentionedInVoiceNotes: number;
    overlappingInterests: string[];
  };
}

interface ContactGroup {
  contacts: Contact[];
  sharedContext: SharedContextScore;
  suggestedDuration: number; // minutes
}
```

**Scoring Algorithm**:
```typescript
function calculateSharedContextScore(contacts: Contact[]): number {
  let score = 0;
  
  // Common group memberships (30 points max)
  const commonGroups = findCommonGroups(contacts);
  score += Math.min(commonGroups.length * 10, 30);
  
  // Shared tags/interests (30 points max)
  const sharedTags = findSharedTags(contacts);
  score += Math.min(sharedTags.length * 5, 30);
  
  // Co-mentioned in voice notes (25 points max)
  const coMentions = countCoMentions(contacts);
  score += Math.min(coMentions * 5, 25);
  
  // Recent interactions together (15 points max)
  const recentGroupInteractions = countRecentGroupInteractions(contacts);
  score += Math.min(recentGroupInteractions * 5, 15);
  
  return score;
}

// Threshold for group suggestions: 50+ points
const GROUP_SUGGESTION_THRESHOLD = 50;
```

### 7. Suggestion Service (Enhanced)

**Responsibilities**: Generate balanced mix of group and individual suggestions

**Key Methods**:
```typescript
interface SuggestionService {
  // Generate suggestions for a user
  generateSuggestions(userId: string): Promise<Suggestion[]>;
  
  // Generate individual suggestion
  generateIndividualSuggestion(
    contact: Contact,
    userId: string
  ): Promise<Suggestion | null>;
  
  // Generate group suggestion
  generateGroupSuggestion(
    group: ContactGroup,
    userId: string
  ): Promise<Suggestion | null>;
  
  // Balance group and individual suggestions
  balanceSuggestions(
    individual: Suggestion[],
    group: Suggestion[]
  ): Suggestion[];
}

interface Suggestion {
  id: string;
  type: 'individual' | 'group';
  contacts: Contact[]; // Single contact for individual, 2-3 for group
  timeslot: TimeSlot;
  reasoning: string;
  sharedContext?: SharedContextScore; // For group suggestions
  priority: number;
  triggerType: 'time-bound' | 'shared-activity';
}
```

**Balancing Strategy**:
- Generate both individual and group suggestions
- Sort all suggestions by priority score
- Ensure no contact appears in multiple suggestions in the same batch
- Prefer group suggestions when shared context score > threshold
- Include mix of both types in final suggestion list

### 8. Enrichment Application Process

**Workflow**:
1. User reviews enrichment proposals in UI
2. User accepts/rejects individual items
3. User clicks "Apply Selected"
4. System processes accepted items by type:

**Tag Application**:
```typescript
async function applyTags(contactId: string, userId: string, tags: string[]): Promise<void> {
  for (const tagText of tags) {
    // Check if tag already exists for this user
    let tag = await tagService.findByText(userId, tagText);
    
    // Create tag if it doesn't exist
    if (!tag) {
      tag = await tagService.create(userId, tagText);
    }
    
    // Associate tag with contact (with source tracking)
    await tagService.associateWithContact(tag.id, contactId, 'voice_memo');
  }
}
```

**Group Application**:
```typescript
async function applyGroups(contactId: string, userId: string, groupNames: string[]): Promise<void> {
  for (const groupName of groupNames) {
    // Check if group already exists for this user
    let group = await groupService.findByName(userId, groupName);
    
    // Create group if it doesn't exist
    if (!group) {
      group = await groupService.create(userId, groupName);
    }
    
    // Assign contact to group (if not already assigned)
    const isAssigned = await groupService.isContactInGroup(contactId, group.id);
    if (!isAssigned) {
      await groupService.assignContactToGroup(contactId, group.id, userId);
    }
  }
}
```

**Field Updates**:
```typescript
async function applyFieldUpdates(contactId: string, userId: string, fields: Record<string, any>): Promise<void> {
  // Validate field values
  const validatedFields = validateContactFields(fields);
  
  // Update contact record
  await contactService.updateContact(contactId, userId, validatedFields);
  
  // If location changed, recalculate timezone
  if (validatedFields.location) {
    const timezone = await timezoneService.inferFromLocation(validatedFields.location);
    if (timezone) {
      await contactService.updateContact(contactId, userId, { timezone });
    }
  }
}
```

**Transaction Management**:
- All enrichment applications for a single contact wrapped in database transaction
- If any operation fails, rollback all changes for that contact
- Continue processing other contacts even if one fails
- Return summary of successes and failures



## Data Models

### Database Schema

```sql
-- Voice notes table
CREATE TABLE voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  recording_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  -- Status: 'recording', 'transcribing', 'extracting', 'ready', 'applied', 'error'
  extracted_entities JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction table for voice note to contacts (many-to-many)
CREATE TABLE voice_note_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  enrichment_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(voice_note_id, contact_id)
);

-- Enrichment items table (for tracking what was proposed and accepted)
CREATE TABLE enrichment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_note_id UUID NOT NULL REFERENCES voice_notes(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'field', 'tag', 'group', 'lastContactDate'
  action VARCHAR(10) NOT NULL, -- 'add', 'update'
  field_name VARCHAR(50),
  value TEXT NOT NULL,
  accepted BOOLEAN DEFAULT TRUE,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enhanced suggestions table to support groups
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'individual', 'group'
  timeslot_start TIMESTAMP NOT NULL,
  timeslot_end TIMESTAMP NOT NULL,
  reasoning TEXT NOT NULL,
  shared_context JSONB, -- For group suggestions
  priority INTEGER NOT NULL,
  trigger_type VARCHAR(20) NOT NULL, -- 'time-bound', 'shared-activity'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status: 'pending', 'accepted', 'dismissed', 'snoozed'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction table for suggestions to contacts (supports both individual and group)
CREATE TABLE suggestion_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(suggestion_id, contact_id)
);

-- Indexes for performance
CREATE INDEX idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_status ON voice_notes(status);
CREATE INDEX idx_voice_note_contacts_voice_note_id ON voice_note_contacts(voice_note_id);
CREATE INDEX idx_voice_note_contacts_contact_id ON voice_note_contacts(contact_id);
CREATE INDEX idx_enrichment_items_voice_note_id ON enrichment_items(voice_note_id);
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestion_contacts_suggestion_id ON suggestion_contacts(suggestion_id);
CREATE INDEX idx_suggestion_contacts_contact_id ON suggestion_contacts(contact_id);
```

### TypeScript Types

```typescript
// Voice Note
interface VoiceNote {
  id: string;
  userId: string;
  transcript: string;
  recordingTimestamp: Date;
  status: VoiceNoteStatus;
  extractedEntities?: Record<string, ExtractedEntities>;
  contacts: Contact[];
  createdAt: Date;
  updatedAt: Date;
}

type VoiceNoteStatus = 
  | 'recording' 
  | 'transcribing' 
  | 'extracting' 
  | 'ready' 
  | 'applied' 
  | 'error';

// Voice Note Session (for active recording)
interface VoiceNoteSession {
  id: string;
  userId: string;
  transcriptionStream: TranscriptionStream;
  interimTranscript: string;
  finalTranscript: string;
  startTime: Date;
}

// Filters for listing voice notes
interface VoiceNoteFilters {
  contactIds?: string[];
  status?: VoiceNoteStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}

// Suggestion (enhanced for groups)
interface Suggestion {
  id: string;
  userId: string;
  type: 'individual' | 'group';
  contacts: Contact[];
  timeslot: {
    start: Date;
    end: Date;
  };
  reasoning: string;
  sharedContext?: SharedContextScore;
  priority: number;
  triggerType: 'time-bound' | 'shared-activity';
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed';
  createdAt: Date;
  updatedAt: Date;
}
```



## UI Components

### 1. Voice Note Recording Interface

**Component**: `VoiceNoteRecorder.tsx`

**Features**:
- Microphone permission request button
- Record/Stop button with visual recording indicator (pulsing red dot)
- Real-time transcript display with interim (gray) and final (black) text
- Audio waveform visualization
- Recording duration timer
- Cancel recording option

**State Management**:
```typescript
interface RecorderState {
  status: 'idle' | 'requesting-permission' | 'recording' | 'processing';
  interimTranscript: string;
  finalTranscript: string;
  duration: number;
  error?: string;
}
```

### 2. Enrichment Review Interface

**Component**: `EnrichmentReview.tsx`

**Features**:
- Grouped by contact with contact avatar/name headers
- Expandable/collapsible sections per contact
- Checkbox for each enrichment item (accept/reject)
- Inline editing for field values
- Visual indicators for item type (field/tag/group/date)
- Bulk actions: Accept All, Reject All, Apply Selected
- Summary of changes before applying

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Enrichment Proposal                             │
├─────────────────────────────────────────────────┤
│ ▼ John Doe                                      │
│   ☑ Add Tag: "hiking"                    [Edit] │
│   ☑ Add Tag: "photography"               [Edit] │
│   ☑ Update Location: "Seattle, WA"       [Edit] │
│   ☐ Add Group: "Outdoor Friends"         [Edit] │
├─────────────────────────────────────────────────┤
│ ▼ Jane Smith                                    │
│   ☑ Add Tag: "hiking"                    [Edit] │
│   ☑ Update Last Contact: "2024-01-15"    [Edit] │
├─────────────────────────────────────────────────┤
│ [Accept All] [Reject All] [Apply Selected]     │
└─────────────────────────────────────────────────┘
```

### 3. Contact Selection UI

**Component**: `ContactSelector.tsx`

**Features**:
- Search bar with real-time filtering
- Multi-select checkboxes
- Contact cards showing name, avatar, groups, tags
- Filter by group or tag
- Selected contacts counter
- Confirm selection button

### 4. Voice Notes History View

**Component**: `VoiceNotesHistory.tsx`

**Features**:
- List view with cards for each voice note
- Transcript preview (first 100 characters)
- Associated contacts with avatars
- Recording date/time
- Status badge (processing/ready/applied)
- Enrichment summary (e.g., "3 tags added, 2 fields updated")
- Expand to view full transcript and enrichment details
- Search across transcripts
- Filter by contact, date range, status
- Delete voice note action

### 5. Enhanced Suggestions Feed

**Component**: `SuggestionsFeed.tsx`

**Features for Group Suggestions**:
- Visual distinction: Group suggestions have multiple avatar circles overlapping
- Contact names listed (e.g., "John, Jane, and Mike")
- Shared context badge (e.g., "🏔️ Hiking Friends")
- Reasoning text explaining the grouping
- Individual contact tooltips on hover
- Accept/Dismiss actions
- "Remove from group" option for each contact
- Converts to individual suggestion if only one contact remains

**Layout Example**:
```
┌─────────────────────────────────────────────────┐
│ 🏔️ Hiking Friends                               │
│ ┌─┐┌─┐┌─┐                                       │
│ │J││J││M│  John, Jane, and Mike                 │
│ └─┘└─┘└─┘                                       │
│                                                  │
│ Saturday, 2:00 PM - 4:00 PM                     │
│                                                  │
│ These friends share hiking interests and were   │
│ mentioned together in your recent voice note.   │
│ It's been 3 weeks since you all hung out.       │
│                                                  │
│ [Accept] [Dismiss] [Modify Group ▼]             │
└─────────────────────────────────────────────────┘
```

### 6. Processing Status Indicators

**Component**: `StatusIndicator.tsx`

**Visual States**:
- Recording: Pulsing red microphone icon
- Transcribing: Animated text waves
- Extracting: Spinning gear icon
- Ready: Green checkmark
- Applied: Blue checkmark with "Changes saved"
- Error: Red X with error message



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Multi-contact association completeness
*For any* voice note with N identified contacts, the voice note record should be associated with exactly N contacts in the database
**Validates: Requirements 2.2**

### Property 2: Entity extraction per contact
*For any* voice note with N contacts, entity extraction should produce N separate entity results
**Validates: Requirements 3.1, 3.5**

### Property 3: Shared information propagation
*For any* information marked as applicable to all contacts, that information should appear in the enrichment proposal for every associated contact
**Validates: Requirements 3.3**

### Property 4: Shared context identification
*For any* set of contacts with common group memberships, overlapping tags, or co-mentions in voice notes, the shared context score should reflect all these factors
**Validates: Requirements 8.4, 8.5, 8.6**

### Property 5: Group suggestion membership constraints
*For any* group suggestion, the number of contacts should be between 2 and 3 inclusive
**Validates: Requirements 8.3, 9.7**

### Property 6: Group suggestion frequency validation
*For any* group suggestion, all member contacts should have exceeded their frequency preference threshold
**Validates: Requirements 8.7**

### Property 7: Suggestion type balance
*For any* batch of generated suggestions, both individual and group suggestion types should be present when eligible contacts exist for both
**Validates: Requirements 8.1, 9.1**

### Property 8: Shared context threshold enforcement
*For any* potential group with shared context score above the threshold (50), a group suggestion should be generated; below the threshold, individual suggestions should be generated
**Validates: Requirements 9.5, 9.6, 8.12**

### Property 9: Contact uniqueness in suggestion batch
*For any* batch of suggestions, no contact should appear in more than one suggestion
**Validates: Requirements 9.9**

### Property 10: Voice note persistence round-trip
*For any* voice note created with transcript, contacts, and entities, retrieving it from the database should return equivalent data
**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 11: Enrichment item acceptance filtering
*For any* enrichment proposal, only items marked as accepted should be applied to contact records
**Validates: Requirements 4.8**

### Property 12: Group suggestion contact removal
*For any* group suggestion with N contacts, removing M contacts (where M < N-1) should result in a group with N-M contacts; removing all but one should convert to an individual suggestion
**Validates: Requirements 14.8, 14.9**

### Property 13: Tag enrichment application
*For any* accepted tag enrichment item, the tag should be created (if it doesn't exist) and associated with the corresponding contact
**Validates: Requirements 4.9**

### Property 14: Group enrichment application
*For any* accepted group enrichment item, the group should be created (if it doesn't exist) and the corresponding contact should be assigned to that group
**Validates: Requirements 4.10**

### Property 15: Field enrichment application
*For any* accepted field enrichment item, the corresponding contact field should be updated with the proposed value
**Validates: Requirements 4.11**



## Error Handling

### 1. Microphone Permission Denied
**Scenario**: User denies microphone access
**Handling**:
- Display clear error message: "Microphone access is required to record voice notes"
- Provide instructions to enable permissions in browser settings
- Show alternative: "You can also type notes manually"

### 2. Transcription Service Errors
**Scenario**: Google Speech-to-Text API fails or times out
**Handling**:
- Retry with exponential backoff (3 attempts)
- If all retries fail, save partial transcript
- Notify user: "Transcription incomplete. You can edit the transcript manually."
- Allow user to continue with partial transcript or cancel

### 3. Entity Extraction Failures
**Scenario**: Gemini API fails or returns invalid JSON
**Handling**:
- Log error for debugging
- Return empty entities structure
- Allow user to manually enter enrichment data
- Display: "Automatic extraction unavailable. Please review and add information manually."

### 4. Contact Disambiguation Failures
**Scenario**: No contacts identified or ambiguous matches
**Handling**:
- Automatically show contact selection UI
- Pre-filter contacts based on partial matches if available
- Allow user to select one or multiple contacts
- Provide "Skip" option to save voice note without contact association

### 5. Network Connectivity Issues
**Scenario**: Internet connection lost during recording/processing
**Handling**:
- Buffer audio locally during recording
- Queue transcription requests when connection restored
- Show offline indicator
- Retry failed API calls automatically when online

### 6. Database Persistence Errors
**Scenario**: Database write fails
**Handling**:
- Retry transaction (3 attempts)
- If fails, cache data in browser localStorage
- Notify user: "Changes saved locally. Will sync when connection is restored."
- Implement background sync when connection available

### 7. Invalid Enrichment Data
**Scenario**: User enters invalid data (e.g., malformed email)
**Handling**:
- Validate input in real-time
- Show inline error messages
- Prevent submission until valid
- Provide format examples (e.g., "example@email.com")

### 8. Group Suggestion Conflicts
**Scenario**: Contact appears in multiple potential groups
**Handling**:
- Select group with highest shared context score
- Ensure contact appears in only one suggestion per batch
- Log alternative groups for future suggestions



## Testing Strategy

### Unit Testing

**Target Coverage**: Core business logic, data transformations, scoring algorithms

**Key Test Areas**:
1. **Shared Context Scoring**:
   - Test score calculation with various combinations of factors
   - Verify threshold enforcement (50+ for groups)
   - Test edge cases (no shared context, maximum shared context)

2. **Entity Extraction Parsing**:
   - Test JSON schema validation
   - Test handling of missing/null fields
   - Test array field parsing (tags, groups)

3. **Enrichment Proposal Generation**:
   - Test item creation for different entity types
   - Test multi-contact proposal generation
   - Test acceptance filtering

4. **Contact Disambiguation**:
   - Test name matching algorithms
   - Test fuzzy matching with typos
   - Test multiple contact identification

5. **Suggestion Balancing**:
   - Test mix of group and individual suggestions
   - Test contact uniqueness enforcement
   - Test priority sorting

**Testing Framework**: Vitest

### Property-Based Testing

**Target Coverage**: Universal properties that should hold across all inputs

**Key Properties to Test**:
- Property 1: Multi-contact association completeness
- Property 2: Entity extraction per contact
- Property 3: Shared information propagation
- Property 7: Suggestion type balance
- Property 9: Contact uniqueness in suggestion batch
- Property 10: Voice note persistence round-trip

**Testing Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

**Example Property Test**:
```typescript
import fc from 'fast-check';

describe('Property 1: Multi-contact association completeness', () => {
  it('should associate voice note with exactly N contacts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contactArbitrary(), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 10 }),
        async (contacts, transcript) => {
          // Create voice note with N contacts
          const voiceNote = await voiceNoteService.create({
            userId: testUserId,
            transcript,
            contacts
          });
          
          // Retrieve associations
          const associations = await db.query(
            'SELECT * FROM voice_note_contacts WHERE voice_note_id = $1',
            [voiceNote.id]
          );
          
          // Verify exactly N associations
          expect(associations.rows.length).toBe(contacts.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Target Coverage**: API integrations, database operations, end-to-end flows

**Key Test Areas**:
1. **Google Speech-to-Text Integration**:
   - Test streaming audio chunks
   - Test interim and final result handling
   - Test error recovery and reconnection
   - Mock API responses for consistent testing

2. **Google Gemini API Integration**:
   - Test entity extraction with various transcripts
   - Test JSON schema validation
   - Test error handling for invalid responses
   - Mock API responses for consistent testing

3. **Database Operations**:
   - Test voice note CRUD operations
   - Test junction table associations
   - Test transaction rollback on errors
   - Test concurrent access scenarios

4. **End-to-End Voice Note Flow**:
   - Record → Transcribe → Disambiguate → Extract → Review → Apply
   - Test with single and multiple contacts
   - Test with disambiguation failures
   - Test with partial data

5. **Suggestion Generation Flow**:
   - Test group identification
   - Test suggestion balancing
   - Test calendar slot matching
   - Test priority calculation

**Testing Framework**: Vitest with supertest for API testing

### UI Component Testing

**Target Coverage**: React components, user interactions, state management

**Key Test Areas**:
1. **VoiceNoteRecorder**:
   - Test microphone permission flow
   - Test recording start/stop
   - Test real-time transcript updates
   - Test error states

2. **EnrichmentReview**:
   - Test item acceptance/rejection
   - Test inline editing
   - Test bulk actions
   - Test multi-contact grouping

3. **ContactSelector**:
   - Test search filtering
   - Test multi-select
   - Test group/tag filtering

4. **SuggestionsFeed**:
   - Test group vs individual rendering
   - Test contact removal from groups
   - Test accept/dismiss actions
   - Test group-to-individual conversion

**Testing Framework**: React Testing Library with Vitest

### Manual Testing Checklist

**Browser Compatibility**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Microphone Testing**:
- [ ] Test with different microphone devices
- [ ] Test with background noise
- [ ] Test with multiple speakers
- [ ] Test with various accents

**Real-world Scenarios**:
- [ ] Record voice note about group hangout (3 friends)
- [ ] Record voice note with unclear names (test disambiguation)
- [ ] Record voice note with rich metadata (tags, groups, dates)
- [ ] Test enrichment review with many items
- [ ] Test voice notes history with 20+ notes
- [ ] Test suggestion feed with mix of group and individual suggestions

**Performance Testing**:
- [ ] Test with 100+ contacts
- [ ] Test with 50+ voice notes
- [ ] Test real-time transcription latency
- [ ] Test suggestion generation time

