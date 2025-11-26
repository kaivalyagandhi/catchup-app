# Enrichment Service

The Enrichment Service orchestrates the generation and application of enrichment proposals from voice notes. It supports multi-contact enrichment with separate proposals per contact.

## Features

- **Multi-Contact Support**: Generate enrichment proposals for multiple contacts from a single voice note
- **Transaction Management**: Atomic operations per contact with rollback on failures
- **Tag Management**: Create and associate tags with contacts
- **Group Management**: Create groups and assign contacts to them
- **Field Updates**: Update contact fields with validation
- **Flexible Application**: Apply all or selected enrichment items

## Architecture

```
Voice Note → Entity Extraction → Enrichment Proposal → User Review → Apply Enrichment
                                                                            ↓
                                                                    Contact Updates
```

## Core Concepts

### Enrichment Proposal

An enrichment proposal contains suggested updates to contact metadata extracted from a voice note. Each proposal includes:

- **Voice Note ID**: The source voice note
- **Contact Proposals**: Array of proposals, one per contact
- **Requires Contact Selection**: Flag indicating if manual contact selection is needed

### Contact Enrichment Proposal

A contact-specific proposal includes:

- **Contact ID**: The target contact
- **Contact Name**: Display name
- **Items**: Array of enrichment items (tags, groups, fields, dates)

### Enrichment Item

An atomic unit of proposed change:

- **ID**: Unique identifier
- **Type**: `tag`, `group`, `field`, or `lastContactDate`
- **Action**: `add`, `update`, or `remove`
- **Field**: Field name (for field type)
- **Value**: The proposed value
- **Accepted**: Whether the user accepted this item

## Usage

### Generate Enrichment Proposal

```typescript
import { enrichmentService } from './enrichment-service';
import { ExtractedEntities } from '../types';

// Extracted entities from voice note
const entities = new Map<string, ExtractedEntities>([
  [
    'contact-1',
    {
      fields: { location: 'Seattle' },
      tags: ['hiking', 'photography'],
      groups: ['Outdoor Friends'],
      lastContactDate: new Date('2024-01-15'),
    },
  ],
]);

// Generate proposal
const proposal = await enrichmentService.generateProposal(
  'voice-note-123',
  entities,
  [contact1]
);
```

### Apply Enrichment Proposal

```typescript
// Apply all accepted items
const result = await enrichmentService.applyEnrichment(proposal, 'user-123');

console.log(`Applied: ${result.totalApplied}, Failed: ${result.totalFailed}`);
```

### Modify Proposal Before Applying

```typescript
// Reject specific items
proposal.contactProposals[0].items[0].accepted = false;

// Edit values
proposal.contactProposals[0].items[1].value = 'Updated Value';

// Then apply
const result = await enrichmentService.applyEnrichment(proposal, 'user-123');
```

### Apply Tags Directly

```typescript
await enrichmentService.applyTags(
  'contact-123',
  'user-123',
  ['hiking', 'photography']
);
```

### Apply Groups Directly

```typescript
await enrichmentService.applyGroups(
  'contact-123',
  'user-123',
  ['Outdoor Friends', 'Tech Friends']
);
```

### Apply Field Updates Directly

```typescript
await enrichmentService.applyFieldUpdates('contact-123', 'user-123', {
  location: 'Seattle, WA',
  email: 'john@example.com',
  customNotes: 'Met at tech conference',
});
```

## Transaction Management

The service uses database transactions to ensure atomicity:

1. **Per-Contact Transactions**: Each contact's enrichment is wrapped in a transaction
2. **Rollback on Failure**: If any item fails, all changes for that contact are rolled back
3. **Continue on Error**: Failures for one contact don't affect other contacts
4. **Detailed Results**: Returns success/failure summary for each contact

```typescript
const result = await enrichmentService.applyEnrichment(proposal, userId);

for (const contactResult of result.results) {
  console.log(`Contact: ${contactResult.contactName}`);
  console.log(`  Applied: ${contactResult.appliedItems}`);
  console.log(`  Failed: ${contactResult.failedItems}`);
  if (contactResult.error) {
    console.log(`  Error: ${contactResult.error}`);
  }
}
```

## Validation

The service validates field updates before applying them:

- **Email**: Valid email format
- **Phone**: Valid phone number (7-15 digits)
- **LinkedIn**: Valid LinkedIn URL or username
- **Instagram**: Valid Instagram handle (1-30 characters)
- **X Handle**: Valid X/Twitter handle (1-15 characters)

Invalid values will cause the enrichment item to fail with a descriptive error message.

## Deduplication

The service automatically prevents duplicates:

- **Tags**: Case-insensitive matching against existing tags
- **Groups**: Case-insensitive matching against existing groups
- **Fields**: Updates existing values or adds new ones

## Error Handling

The service handles errors gracefully:

1. **Validation Errors**: Thrown immediately with descriptive messages
2. **Database Errors**: Caught and returned in the result summary
3. **Service Errors**: Logged and returned in the result summary
4. **Partial Success**: Some items can succeed while others fail

## Requirements Mapping

- **Requirement 3.5**: Multi-contact entity extraction and proposal generation
- **Requirement 4.8**: Transaction management for enrichment application
- **Requirement 4.9**: Tag creation and association
- **Requirement 4.10**: Group creation and assignment
- **Requirement 4.11**: Field updates with validation

## Testing

See `enrichment-service.test.ts` for comprehensive unit tests covering:

- Proposal generation for single and multiple contacts
- Deduplication of tags and groups
- Tag application with error handling
- Group creation and assignment
- Field validation and updates

## Examples

See `enrichment-example.ts` for complete working examples of:

- Single contact enrichment
- Multi-contact enrichment
- Direct tag application
- Direct group application
- Direct field updates
