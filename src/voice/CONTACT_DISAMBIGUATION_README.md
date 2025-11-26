# Contact Disambiguation Service

## Overview

The Contact Disambiguation Service identifies which contacts are mentioned in voice note transcripts. It uses Google Gemini API for name extraction and fuzzy matching algorithms to map extracted names to the user's contact list.

## Features

- **Multi-contact identification**: Supports multiple people mentioned in a single voice note
- **Fuzzy name matching**: Handles typos, nicknames, and partial names using Levenshtein distance
- **Partial match support**: Returns candidates for user review when confidence is moderate
- **Fallback to manual selection**: Returns empty array when no matches found, triggering manual selection UI

## Architecture

```
Voice Note Transcript
        ↓
[Gemini API] → Extract person names
        ↓
[Fuzzy Matching] → Match to user's contacts
        ↓
[Confidence Scoring] → Classify matches
        ↓
Result: {matches, partialMatches, unmatchedNames}
```

## Usage

### Basic Disambiguation

```typescript
import { ContactDisambiguationService } from './voice/contact-disambiguation-service';

const service = new ContactDisambiguationService();

// Disambiguate contacts from transcript
const contacts = await service.disambiguate(
  "Had lunch with John and Jane today",
  userContactList
);

// Returns: [johnContact, janeContact]
```

### Detailed Disambiguation (with partial matches)

```typescript
const result = await service.disambiguateDetailed(
  "Met with Sara at the coffee shop",
  userContactList
);

console.log('High-confidence matches:', result.matches);
console.log('Partial matches for review:', result.partialMatches);
console.log('Unmatched names:', result.unmatchedNames);
```

### Name Extraction Only

```typescript
const names = await service.identifyContactNames(
  "Had dinner with Tom, Lisa, and David"
);
// Returns: ["Tom", "Lisa", "David"]
```

## Matching Algorithm

### Confidence Thresholds

- **Exact Match (≥0.9)**: Automatically matched, high confidence
- **Partial Match (0.6-0.9)**: Returned as candidates for user review
- **No Match (<0.6)**: Returned as unmatched name

### Matching Strategies

1. **Exact Match**: Name matches contact name exactly (case-insensitive)
   - Score: 1.0
   - Example: "john smith" → "John Smith"

2. **Fuzzy Match**: Uses Levenshtein distance for similar names
   - Score: 0.5-1.0 based on similarity
   - Example: "jon smith" → "John Smith" (typo)

3. **Partial Match**: Matches parts of names (first name, last name)
   - Score: 0.7-0.85
   - Example: "john" → "John Smith"
   - Example: "chris" → "Christopher Martinez"

### Levenshtein Distance

The service uses Levenshtein distance to measure string similarity:
- Counts minimum single-character edits (insertions, deletions, substitutions)
- Converts distance to similarity score (0-1)
- Handles typos and minor variations

## API Reference

### `disambiguate(transcript, userContacts)`

Identifies contacts mentioned in transcript and returns high-confidence matches.

**Parameters:**
- `transcript` (string): Voice note transcript text
- `userContacts` (Contact[]): User's contact list

**Returns:** `Promise<Contact[]>`
- Array of matched contacts
- Empty array if no matches found (triggers manual selection)

### `disambiguateDetailed(transcript, userContacts)`

Returns detailed disambiguation result including partial matches.

**Parameters:**
- `transcript` (string): Voice note transcript text
- `userContacts` (Contact[]): User's contact list

**Returns:** `Promise<DisambiguationResult>`

```typescript
interface DisambiguationResult {
  matches: Contact[];           // High-confidence matches
  partialMatches: PartialMatch[]; // Candidates for user review
  unmatchedNames: string[];     // Names that couldn't be matched
}

interface PartialMatch {
  extractedName: string;
  candidates: ContactMatch[];
}

interface ContactMatch {
  contact: Contact;
  score: number;        // 0-1, higher is better
  reason: string;       // "Exact name match", "Similar name", etc.
}
```

### `identifyContactNames(transcript)`

Extracts person names from transcript using Gemini API.

**Parameters:**
- `transcript` (string): Voice note transcript text

**Returns:** `Promise<string[]>`
- Array of person names mentioned
- Empty array if no names found

## Integration with Voice Note Flow

```typescript
// 1. User records voice note
const transcript = await transcriptionService.transcribe(audioChunks);

// 2. Disambiguate contacts
const contacts = await disambiguationService.disambiguate(
  transcript,
  userContacts
);

if (contacts.length === 0) {
  // 3a. No matches - show manual contact selection UI
  showContactSelectionUI(transcript);
} else {
  // 3b. Matches found - proceed to entity extraction
  for (const contact of contacts) {
    const entities = await entityExtractionService.extractForContact(
      transcript,
      contact
    );
    // Generate enrichment proposals...
  }
}
```

## Error Handling

The service handles errors gracefully:

- **Gemini API failures**: Returns empty array, allows manual entry
- **Invalid JSON responses**: Logs error and returns empty array
- **Network issues**: Throws error to be handled by caller

```typescript
try {
  const contacts = await service.disambiguate(transcript, userContacts);
  // Process contacts...
} catch (error) {
  console.error('Disambiguation failed:', error);
  // Fallback to manual contact selection
  showContactSelectionUI(transcript);
}
```

## Configuration

### Custom Gemini Model

```typescript
import { getContactNameModel } from '../integrations/google-gemini-config';

const customModel = getContactNameModel({
  temperature: 0.1,  // Lower for more consistent extraction
  maxOutputTokens: 1024,
});

const service = new ContactDisambiguationService(customModel);
```

### Adjusting Thresholds

Thresholds are defined as private constants in the service:

```typescript
private readonly EXACT_MATCH_THRESHOLD = 0.9;
private readonly PARTIAL_MATCH_THRESHOLD = 0.6;
private readonly MAX_CANDIDATES = 3;
```

To adjust, modify the service class or create a subclass.

## Testing

### Unit Tests

Test the matching algorithms with known inputs:

```typescript
describe('ContactDisambiguationService', () => {
  it('should match exact names', async () => {
    const service = new ContactDisambiguationService();
    const contacts = await service.disambiguate(
      "Met with John Smith",
      [{ name: "John Smith", ... }]
    );
    expect(contacts).toHaveLength(1);
  });

  it('should handle fuzzy matching', async () => {
    const service = new ContactDisambiguationService();
    const contacts = await service.disambiguate(
      "Met with Jon Smith", // Typo
      [{ name: "John Smith", ... }]
    );
    expect(contacts).toHaveLength(1);
  });

  it('should identify multiple contacts', async () => {
    const service = new ContactDisambiguationService();
    const contacts = await service.disambiguate(
      "Had lunch with Alice and Bob",
      [
        { name: "Alice Johnson", ... },
        { name: "Bob Williams", ... }
      ]
    );
    expect(contacts).toHaveLength(2);
  });
});
```

### Integration Tests

Test with real Gemini API:

```typescript
it('should extract names from real transcript', async () => {
  const service = new ContactDisambiguationService();
  const names = await service.identifyContactNames(
    "Went hiking with Sarah and Mike yesterday"
  );
  expect(names).toContain("Sarah");
  expect(names).toContain("Mike");
});
```

## Requirements Validation

This service implements the following requirements:

- **Requirement 2.1**: Identifies multiple contacts mentioned in voice note transcripts
- **Requirement 2.2**: Associates all identified contacts with the voice note
- **Requirement 2.3**: Returns empty array when disambiguation fails, triggering manual selection UI

## Performance Considerations

- **Gemini API calls**: One API call per transcript (extracts all names at once)
- **Fuzzy matching**: O(n*m) where n = number of extracted names, m = number of user contacts
- **Levenshtein distance**: O(len1 * len2) for each comparison

For large contact lists (>1000 contacts), consider:
- Caching contact name variations
- Pre-computing name embeddings
- Using more efficient string matching algorithms

## Future Enhancements

- **Nickname mapping**: Maintain user-defined nickname → full name mappings
- **Context-aware matching**: Use recent interactions to boost match scores
- **Learning from corrections**: Track user corrections to improve matching
- **Phonetic matching**: Use Soundex or Metaphone for phonetically similar names
