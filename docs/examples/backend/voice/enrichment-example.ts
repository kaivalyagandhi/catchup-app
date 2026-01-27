/**
 * Enrichment Service Example Usage
 *
 * Demonstrates how to use the EnrichmentService to generate and apply
 * enrichment proposals from voice notes.
 */

import { enrichmentService } from './enrichment-service';
import { contactService } from '../contacts/service';
import { ExtractedEntities } from '../types';

/**
 * Example: Generate and apply enrichment for a single contact
 */
async function singleContactEnrichmentExample() {
  console.log('=== Single Contact Enrichment Example ===\n');

  const userId = 'user-123';
  const voiceNoteId = 'voice-note-456';

  // Get the contact
  const contact = await contactService.getContact('contact-789', userId);
  console.log(`Contact: ${contact.name}`);

  // Extracted entities from voice note
  const entities = new Map<string, ExtractedEntities>([
    [
      contact.id,
      {
        fields: {
          location: 'Seattle, WA',
          customNotes: 'Met at tech conference',
        },
        tags: ['technology', 'startups', 'coffee'],
        groups: ['Tech Friends'],
        lastContactDate: new Date('2024-01-15'),
      },
    ],
  ]);

  // Generate enrichment proposal
  const proposal = await enrichmentService.generateProposal(
    voiceNoteId,
    entities,
    [contact]
  );

  console.log('\nGenerated Proposal:');
  console.log(`- Voice Note ID: ${proposal.voiceNoteId}`);
  console.log(`- Contact Proposals: ${proposal.contactProposals.length}`);

  for (const contactProposal of proposal.contactProposals) {
    console.log(`\n  Contact: ${contactProposal.contactName}`);
    console.log(`  Items: ${contactProposal.items.length}`);

    for (const item of contactProposal.items) {
      console.log(
        `    - ${item.type}: ${item.action} ${item.field || ''} = ${item.value}`
      );
    }
  }

  // Apply enrichment (all items accepted by default)
  const result = await enrichmentService.applyEnrichment(proposal, userId);

  console.log('\nApplication Result:');
  console.log(`- Success: ${result.success}`);
  console.log(`- Total Applied: ${result.totalApplied}`);
  console.log(`- Total Failed: ${result.totalFailed}`);

  for (const contactResult of result.results) {
    console.log(`\n  Contact: ${contactResult.contactName}`);
    console.log(`    - Applied: ${contactResult.appliedItems}`);
    console.log(`    - Failed: ${contactResult.failedItems}`);
    if (contactResult.error) {
      console.log(`    - Error: ${contactResult.error}`);
    }
  }
}

/**
 * Example: Generate and apply enrichment for multiple contacts
 */
async function multiContactEnrichmentExample() {
  console.log('\n\n=== Multi-Contact Enrichment Example ===\n');

  const userId = 'user-123';
  const voiceNoteId = 'voice-note-789';

  // Get contacts
  const contact1 = await contactService.getContact('contact-1', userId);
  const contact2 = await contactService.getContact('contact-2', userId);

  console.log(`Contacts: ${contact1.name}, ${contact2.name}`);

  // Extracted entities for both contacts
  const entities = new Map<string, ExtractedEntities>([
    [
      contact1.id,
      {
        fields: {},
        tags: ['hiking', 'photography'],
        groups: ['Outdoor Friends'],
        lastContactDate: new Date('2024-01-15'),
      },
    ],
    [
      contact2.id,
      {
        fields: { email: 'jane@example.com' },
        tags: ['hiking', 'travel'],
        groups: ['Outdoor Friends'],
        lastContactDate: new Date('2024-01-15'),
      },
    ],
  ]);

  // Generate enrichment proposal
  const proposal = await enrichmentService.generateProposal(
    voiceNoteId,
    entities,
    [contact1, contact2]
  );

  console.log('\nGenerated Proposal:');
  console.log(`- Voice Note ID: ${proposal.voiceNoteId}`);
  console.log(`- Contact Proposals: ${proposal.contactProposals.length}`);

  for (const contactProposal of proposal.contactProposals) {
    console.log(`\n  Contact: ${contactProposal.contactName}`);
    console.log(`  Items: ${contactProposal.items.length}`);

    for (const item of contactProposal.items) {
      console.log(
        `    - ${item.type}: ${item.action} ${item.field || ''} = ${item.value}`
      );
    }
  }

  // Modify proposal: reject some items
  proposal.contactProposals[0].items[0].accepted = false; // Reject first item for contact 1

  // Apply enrichment
  const result = await enrichmentService.applyEnrichment(proposal, userId);

  console.log('\nApplication Result:');
  console.log(`- Success: ${result.success}`);
  console.log(`- Total Applied: ${result.totalApplied}`);
  console.log(`- Total Failed: ${result.totalFailed}`);

  for (const contactResult of result.results) {
    console.log(`\n  Contact: ${contactResult.contactName}`);
    console.log(`    - Applied: ${contactResult.appliedItems}`);
    console.log(`    - Failed: ${contactResult.failedItems}`);
  }
}

/**
 * Example: Apply tags directly
 */
async function applyTagsExample() {
  console.log('\n\n=== Apply Tags Example ===\n');

  const userId = 'user-123';
  const contactId = 'contact-789';

  const tags = ['hiking', 'photography', 'coffee'];

  console.log(`Applying tags to contact: ${tags.join(', ')}`);

  await enrichmentService.applyTags(contactId, userId, tags);

  console.log('Tags applied successfully!');
}

/**
 * Example: Apply groups directly
 */
async function applyGroupsExample() {
  console.log('\n\n=== Apply Groups Example ===\n');

  const userId = 'user-123';
  const contactId = 'contact-789';

  const groups = ['Outdoor Friends', 'Tech Friends'];

  console.log(`Applying groups to contact: ${groups.join(', ')}`);

  await enrichmentService.applyGroups(contactId, userId, groups);

  console.log('Groups applied successfully!');
}

/**
 * Example: Apply field updates directly
 */
async function applyFieldUpdatesExample() {
  console.log('\n\n=== Apply Field Updates Example ===\n');

  const userId = 'user-123';
  const contactId = 'contact-789';

  const fields = {
    location: 'Seattle, WA',
    email: 'john@example.com',
    customNotes: 'Met at tech conference',
  };

  console.log('Applying field updates:');
  for (const [field, value] of Object.entries(fields)) {
    console.log(`  - ${field}: ${value}`);
  }

  await enrichmentService.applyFieldUpdates(contactId, userId, fields);

  console.log('\nField updates applied successfully!');
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await singleContactEnrichmentExample();
    await multiContactEnrichmentExample();
    await applyTagsExample();
    await applyGroupsExample();
    await applyFieldUpdatesExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();

export {
  singleContactEnrichmentExample,
  multiContactEnrichmentExample,
  applyTagsExample,
  applyGroupsExample,
  applyFieldUpdatesExample,
};
