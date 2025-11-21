# Voice Processing Module

This module handles voice note processing for the CatchUp application, including audio transcription, entity extraction, contact disambiguation, and enrichment workflows.

## Features

- **Audio Transcription**: Convert voice notes to text using OpenAI Whisper
- **Contact Disambiguation**: Identify which contact a voice note refers to using NLP
- **Entity Extraction**: Extract contact fields, tags, groups, and dates from transcripts
- **Enrichment Confirmation**: Generate atomic enrichment proposals for user review
- **Enrichment Application**: Apply approved enrichments to contact profiles
- **Tag Similarity Matching**: Prefer existing similar tags over creating duplicates

## Components

### Voice Service (`voice-service.ts`)

Main service containing all voice processing functions:

- `transcribeAudio(audioData, filename)` - Transcribe audio to text
- `storeAudioFile(audioData, userId, filename)` - Store audio file (placeholder for S3)
- `disambiguateContact(transcript, userContacts)` - Identify which contact is mentioned
- `extractEntities(transcript, contact?)` - Extract structured data from transcript
- `generateEnrichmentConfirmation(entities, contact, userContacts)` - Create enrichment proposal
- `applyEnrichment(contactId, userId, proposal, services...)` - Apply enrichments to contact
- `preferExistingTags(newTags, existingTags, threshold)` - Find similar existing tags

### Voice Note Repository (`voice-repository.ts`)

Database operations for voice notes:

- `create(userId, audioUrl, transcript, contactId?, entities?)` - Create voice note record
- `update(id, contactId, entities, processed)` - Update voice note with processing results
- `getById(id)` - Retrieve voice note by ID
- `getByUserId(userId)` - Get all voice notes for a user
- `delete(id)` - Delete voice note

## Usage Examples

### Basic Voice Note Processing

```typescript
import {
  transcribeAudio,
  disambiguateContact,
  extractEntities,
  generateEnrichmentConfirmation,
  applyEnrichment,
} from './voice';
import { contactService, tagService, groupService } from '../contacts';

// 1. Transcribe audio
const transcript = await transcribeAudio(audioBuffer, 'note.mp3');

// 2. Identify contact
const userContacts = await contactService.listContacts(userId);
const contact = await disambiguateContact(transcript, userContacts);

// 3. Extract entities
const entities = await extractEntities(transcript, contact);

// 4. Generate enrichment proposal
const proposal = generateEnrichmentConfirmation(entities, contact, userContacts);

// 5. Apply enrichment (after user confirmation)
if (proposal.contactId) {
  await applyEnrichment(
    proposal.contactId,
    userId,
    proposal,
    contactService,
    tagService,
    groupService
  );
}
```

### Manual Contact Selection

When disambiguation fails, allow user to manually select contact:

```typescript
// After disambiguation returns null
if (!contact) {
  // Present userContacts to user for selection
  const selectedContactId = await getUserSelection(userContacts);
  const selectedContact = await contactService.getContact(selectedContactId, userId);
  
  // Continue with selected contact
  const entities = await extractEntities(transcript, selectedContact);
  const proposal = generateEnrichmentConfirmation(entities, selectedContact, userContacts);
  // ... apply enrichment
}
```

### Enrichment Item Review

The enrichment proposal contains atomic items that can be individually reviewed:

```typescript
const proposal = generateEnrichmentConfirmation(entities, contact, userContacts);

// Review and modify items
for (const item of proposal.items) {
  console.log(`${item.type}: ${item.action} - ${item.value}`);
  
  // User can:
  // - Accept (item.accepted = true)
  // - Reject (item.accepted = false)
  // - Edit (item.value = newValue)
}

// Apply only accepted items
await applyEnrichment(contactId, userId, proposal, ...services);
```

## Data Models

### ExtractedEntities

```typescript
interface ExtractedEntities {
  fields: Record<string, any>;  // Contact field updates
  tags: string[];               // Interest tags (1-3 words each)
  groups: string[];             // Group names
  lastContactDate?: Date;       // When last connected
}
```

### EnrichmentProposal

```typescript
interface EnrichmentProposal {
  contactId: string | null;           // null if manual selection needed
  items: EnrichmentItem[];            // Atomic enrichment items
  requiresContactSelection: boolean;  // Whether user must select contact
}
```

### EnrichmentItem

```typescript
interface EnrichmentItem {
  id: string;
  type: 'field' | 'tag' | 'group' | 'lastContactDate';
  action: 'add' | 'update' | 'remove';
  field?: string;      // For field updates
  value: any;
  accepted: boolean;   // User acceptance status
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Required for transcription and entity extraction

### OpenAI Models

- Transcription: `whisper-1`
- Disambiguation: `gpt-4o-mini`
- Entity Extraction: `gpt-4o-mini`

## Error Handling

All functions handle errors gracefully:

- **Transcription failures**: Throw error with message for user notification
- **Disambiguation failures**: Return `null` to allow manual selection
- **Entity extraction failures**: Return empty entities for manual entry
- **Enrichment failures**: Log errors and continue with remaining items

## Testing

Run tests:

```bash
npm test -- src/voice/voice-service.test.ts
```

Tests cover:
- Enrichment proposal generation
- Field updates, tags, and groups
- Contact selection requirements
- Tag preference logic

## Requirements Validation

This module implements the following requirements:

- **3.1**: Audio transcription via OpenAI Whisper
- **3.2, 3.3**: Contact disambiguation with fallback to manual selection
- **3.4**: Entity extraction using NLP
- **3.5-3.9**: Enrichment confirmation workflow with atomic item review
- **3.10-3.13**: Enrichment application with tag preference

## Future Enhancements

- Support for multiple languages in transcription
- Advanced semantic similarity for tag matching (cosine similarity)
- Batch voice note processing
- Audio file compression before storage
- Integration with S3 or similar object storage
- Voice note search and filtering
