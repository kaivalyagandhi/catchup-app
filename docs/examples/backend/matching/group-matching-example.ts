/**
 * Group Matching Service Example Usage
 *
 * Demonstrates how to use the GroupMatchingService to identify
 * potential group catchup opportunities.
 */

import { groupMatchingService } from './group-matching-service';
import { contactService } from '../contacts/service';

/**
 * Example: Find potential group catchup opportunities for a user
 */
async function findGroupOpportunities(userId: string) {
  console.log('Finding group catchup opportunities...\n');

  // Get all contacts for the user
  const contacts = await contactService.listContacts(userId);
  console.log(`Found ${contacts.length} contacts\n`);

  // Find potential groups (2-3 contacts with strong shared context)
  const potentialGroups = await groupMatchingService.findPotentialGroups(contacts, 3);

  console.log(`Identified ${potentialGroups.length} potential groups:\n`);

  for (const group of potentialGroups) {
    const contactNames = group.contacts.map((c) => c.name).join(', ');
    console.log(`Group: ${contactNames}`);
    console.log(`  Shared Context Score: ${group.sharedContext.score}/100`);
    console.log(`  Common Groups: ${group.sharedContext.factors.commonGroups.join(', ') || 'None'}`);
    console.log(`  Shared Tags: ${group.sharedContext.factors.sharedTags.join(', ') || 'None'}`);
    console.log(`  Co-mentions in Voice Notes: ${group.sharedContext.factors.coMentionedInVoiceNotes}`);
    console.log(`  Suggested Duration: ${group.suggestedDuration} minutes\n`);
  }
}

/**
 * Example: Calculate shared context for specific contacts
 */
async function analyzeSpecificContacts(userId: string, contactIds: string[]) {
  console.log('Analyzing shared context for specific contacts...\n');

  // Get the contacts
  const contacts = await Promise.all(
    contactIds.map((id) => contactService.getContact(id, userId))
  );

  // Calculate shared context
  const sharedContext = await groupMatchingService.calculateSharedContext(contacts);

  const contactNames = contacts.map((c) => c.name).join(', ');
  console.log(`Contacts: ${contactNames}`);
  console.log(`Shared Context Score: ${sharedContext.score}/100`);
  console.log(`\nBreakdown:`);
  console.log(`  Common Groups: ${sharedContext.factors.commonGroups.join(', ') || 'None'}`);
  console.log(`  Shared Tags: ${sharedContext.factors.sharedTags.join(', ') || 'None'}`);
  console.log(`  Co-mentions in Voice Notes: ${sharedContext.factors.coMentionedInVoiceNotes}`);
  console.log(`  Overlapping Interests: ${sharedContext.factors.overlappingInterests.join(', ') || 'None'}`);
}

/**
 * Example: Analyze voice note co-mentions
 */
async function analyzeCoMentions(userId: string) {
  console.log('Analyzing voice note co-mentions...\n');

  const coMentionMap = await groupMatchingService.analyzeVoiceNoteCoMentions(userId);

  console.log(`Found co-mentions for ${coMentionMap.size} contacts:\n`);

  for (const [contactId, coMentionedWith] of coMentionMap.entries()) {
    const contact = await contactService.getContact(contactId, userId);
    console.log(`${contact.name} was mentioned with ${coMentionedWith.length} other contact(s)`);
  }
}

// Example usage
async function main() {
  const userId = 'example-user-id';

  // Find all potential groups
  await findGroupOpportunities(userId);

  // Analyze specific contacts
  const contactIds = ['contact-1-id', 'contact-2-id', 'contact-3-id'];
  await analyzeSpecificContacts(userId, contactIds);

  // Analyze co-mentions
  await analyzeCoMentions(userId);
}

// Uncomment to run
// main().catch(console.error);
