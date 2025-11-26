# Entity Extraction Service

## Overview

The `EntityExtractionService` uses Google Gemini API to extract structured contact metadata from voice note transcripts. It supports single contact, generic (unknown contact), and multi-contact extraction scenarios.

## Features

- **Structured JSON Output**: Uses Gemini's `responseSchema` feature to ensure consistent, validated responses
- **Context-Aware Extraction**: Leverages existing contact information for more accurate extraction
- **Multi-Contact Support**: Processes group voice notes mentioning multiple contacts
- **Error Handling**: Returns empty entities on failures, allowing manual entry fallback
- **Type-Safe**: Full TypeScript support with validated entity structures

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  EntityExtractionService                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  extractForContact(transcript, contact)                     │
│  ├─ Build context-aware prompt with existing contact info   │
│  ├─ Call Gemini API with structured schema                  │
│  └─ Return validated ExtractedEntities                      │
│                                                              │
│  extractGeneric(transcript)                                 │
│  ├─ Build generic prompt without contact context            │
│  ├─ Call Gemini API with structured schema                  │
│  └─ Return validated ExtractedEntities                      │
│                                                              │
│  extractForMultipleContacts(transcript, contacts[])         │
│  ├─ Process each contact separately                         │
│  ├─ Build context-aware prompts for each                    │
│  └─ Return Map<contactId, ExtractedEntities>                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Google Gemini API (gemini-2.5-flash)            │
├─────────────────────────────────────────────────────────────┤
│  Configuration:                                              │
│  - responseMimeType: 'application/json'                     │
│  - responseSchema: ENTITY_EXTRACTION_SCHEMA                 │
│  - temperature: 0.2 (consistent extraction)                 │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage - Known Contact

```typescript
import { EntityExtractionService } from './voice/entity-extraction-service';

const service = new EntityExtractionService();

const entities = await service.extractForContact(
  "Had coffee with John. He's into rock climbing now.",
  johnContact
);

console.log(entities);
// {
//   fields: {},
//   tags: ['rock climbing', 'coffee'],
//   groups: [],
//   lastContactDate: '2024-01-15T00:00:00.000Z'
// }
```

### Generic Extraction - Unknown Contact

```typescript
const entities = await service.extractGeneric(
  "Met someone at the gym who's into photography."
);

console.log(entities);
// {
//   fields: {},
//   tags: ['gym', 'photography'],
//   groups: [],
//   lastContactDate: undefined
// }
```

### Multi-Contact Extraction

```typescript
const entitiesMap = await service.extractForMultipleContacts(
  "Had dinner with John and Jane. John talked about his startup, Jane mentioned hiking.",
  [johnContact, janeContact]
);

console.log(entitiesMap.get(johnContact.id));
// { fields: {}, tags: ['startup', 'dinner'], groups: [], ... }

console.log(entitiesMap.get(janeContact.id));
// { fields: {}, tags: ['hiking', 'dinner'], groups: [], ... }
```

## Extracted Entity Structure

```typescript
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
  tags: string[];           // 1-3 word descriptors
  groups: string[];         // Relationship categories
  lastContactDate?: Date;   // Mentioned interaction date
}
```

## Configuration

The service uses the Gemini configuration from `src/integrations/google-gemini-config.ts`:

```typescript
{
  model: 'gemini-2.5-flash',
  temperature: 0.2,          // Low temperature for consistency
  responseMimeType: 'application/json',
  responseSchema: ENTITY_EXTRACTION_SCHEMA
}
```

### Environment Variables

Required:
- `GOOGLE_GEMINI_API_KEY` - Your Gemini API key

Optional:
- `GEMINI_MODEL` - Override default model (default: `gemini-2.5-flash`)

## Error Handling

The service handles errors gracefully:

1. **API Failures**: Returns empty entities instead of throwing
2. **Invalid JSON**: Catches parse errors and returns empty entities
3. **Network Issues**: Logs error and returns empty entities
4. **Per-Contact Failures**: In multi-contact extraction, failed contacts get empty entities while others proceed

```typescript
try {
  const entities = await service.extractForContact(transcript, contact);
  // Always returns ExtractedEntities (may be empty on failure)
} catch (error) {
  // This won't be reached - service returns empty entities instead
}
```

## Prompt Engineering

### Context-Aware Prompt (Known Contact)

The service builds prompts that include existing contact information:

```
Extract contact information from the following voice note transcript about John Doe.

Current contact information:
- Name: John Doe
- Phone: +1234567890
- Existing tags: hiking, photography
- Existing groups: College Friends

Transcript:
[user's voice note]

Extract any NEW information mentioned in the transcript...
```

This helps the model:
- Avoid extracting duplicate information
- Understand context better
- Focus on new/updated information

### Generic Prompt (Unknown Contact)

For unknown contacts, the prompt is simpler:

```
Extract contact information from the following voice note transcript.

Transcript:
[user's voice note]

Extract any information mentioned in the transcript...
```

## Testing

See `src/voice/entity-extraction-example.ts` for comprehensive usage examples.

## Integration Points

The EntityExtractionService integrates with:

1. **VoiceNoteService**: Called after transcription to extract entities
2. **ContactDisambiguationService**: Works with disambiguation results
3. **EnrichmentService**: Provides entities for enrichment proposals
4. **VoiceNoteRepository**: Stores extracted entities with voice notes

## Performance Considerations

- **API Latency**: Gemini API calls typically take 1-3 seconds
- **Multi-Contact Processing**: Sequential processing (not parallel) to avoid rate limits
- **Caching**: Consider caching for identical transcripts (not implemented)
- **Rate Limits**: Gemini API has rate limits - implement backoff if needed

## Future Enhancements

- [ ] Parallel processing for multi-contact extraction with rate limiting
- [ ] Caching layer for identical transcripts
- [ ] Confidence scores for extracted entities
- [ ] Support for custom entity schemas
- [ ] Batch processing for multiple voice notes
- [ ] Streaming extraction for long transcripts

## References

- [Gemini API Structured Output Documentation](https://ai.google.dev/gemini-api/docs/structured-output)
- [Google Generative AI Node.js SDK](https://www.npmjs.com/package/@google/generative-ai)
- Design Document: `.kiro/specs/voice-notes-enhancement/design.md`
- Requirements: `.kiro/specs/voice-notes-enhancement/requirements.md`
