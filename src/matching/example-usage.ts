/**
 * Suggestion Engine Example Usage
 *
 * Demonstrates how to use the suggestion engine to:
 * - Calculate priority scores for contacts
 * - Match contacts to available timeslots
 * - Generate timebound suggestions
 * - Generate shared activity suggestions
 * - Manage suggestion lifecycle (accept, dismiss, snooze)
 * - Display pending suggestions
 */

import {
  calculatePriority,
  applyRecencyDecay,
  matchContactsToTimeslot,
  generateTimeboundSuggestions,
  generateSharedActivitySuggestions,
  acceptSuggestion,
  dismissSuggestion,
  snoozeSuggestion,
  getPendingSuggestions,
  generateDismissalReasonTemplates,
} from './suggestion-service';
import { Contact, FrequencyOption, TimeSlot, TagSource } from '../types';

/**
 * Example 1: Calculate priority for a contact
 */
async function exampleCalculatePriority() {
  console.log('=== Example 1: Calculate Priority ===\n');

  const contact: Contact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    location: 'San Francisco',
    timezone: 'America/Los_Angeles',
    frequencyPreference: FrequencyOption.WEEKLY,
    groups: ['Close Friends'],
    tags: [
      { id: 't1', text: 'hiking', source: TagSource.MANUAL, createdAt: new Date() },
      { id: 't2', text: 'coffee', source: TagSource.MANUAL, createdAt: new Date() },
    ],
    archived: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date(),
  };

  // Last contacted 14 days ago
  const lastContactDate = new Date();
  lastContactDate.setDate(lastContactDate.getDate() - 14);

  const priority = calculatePriority(contact, lastContactDate);

  console.log(`Contact: ${contact.name}`);
  console.log(`Frequency Preference: ${contact.frequencyPreference}`);
  console.log(`Days Since Last Contact: 14`);
  console.log(`Priority Score: ${priority.toFixed(2)}`);
  console.log(
    `\nInterpretation: Higher scores indicate higher priority for connection.`
  );
  console.log(
    `Since it's been 14 days (exceeding the 7-day weekly threshold), the priority is elevated.\n`
  );
}

/**
 * Example 2: Match contacts to a timeslot
 */
async function exampleMatchContacts() {
  console.log('=== Example 2: Match Contacts to Timeslot ===\n');

  const contacts: Contact[] = [
    {
      id: 'contact-1',
      userId: 'user-1',
      name: 'Alice Johnson',
      frequencyPreference: FrequencyOption.WEEKLY,
      lastContactDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      groups: ['Close Friends'],
      tags: [{ id: 't1', text: 'hiking', source: TagSource.MANUAL, createdAt: new Date() }],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'contact-2',
      userId: 'user-1',
      name: 'Bob Smith',
      frequencyPreference: FrequencyOption.MONTHLY,
      lastContactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      groups: ['Friends'],
      tags: [{ id: 't2', text: 'coffee', source: TagSource.MANUAL, createdAt: new Date() }],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'contact-3',
      userId: 'user-1',
      name: 'Carol Davis',
      frequencyPreference: FrequencyOption.WEEKLY,
      lastContactDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      groups: ['Close Friends'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const timeslot: TimeSlot = {
    start: new Date('2024-01-20T14:00:00Z'),
    end: new Date('2024-01-20T15:00:00Z'),
    timezone: 'UTC',
  };

  const matches = await matchContactsToTimeslot('user-1', timeslot, contacts);

  console.log(`Available Timeslot: ${timeslot.start.toLocaleString()}`);
  console.log(`\nMatched Contacts (sorted by priority):\n`);

  matches.forEach((match, index) => {
    console.log(`${index + 1}. ${match.contact.name}`);
    console.log(`   Priority: ${match.priority.toFixed(2)}`);
    console.log(`   Groups: ${match.contact.groups.join(', ')}`);
    console.log(`   Reasoning: ${match.reasoning}`);
    console.log();
  });

  console.log(
    'Note: Close Friends are prioritized even with similar priority scores.\n'
  );
}

/**
 * Example 3: Generate timebound suggestions
 */
async function exampleGenerateTimeboundSuggestions() {
  console.log('=== Example 3: Generate Timebound Suggestions ===\n');

  const availableSlots: TimeSlot[] = [
    {
      start: new Date('2024-01-20T10:00:00Z'),
      end: new Date('2024-01-20T11:00:00Z'),
      timezone: 'UTC',
    },
    {
      start: new Date('2024-01-20T14:00:00Z'),
      end: new Date('2024-01-20T15:00:00Z'),
      timezone: 'UTC',
    },
    {
      start: new Date('2024-01-21T16:00:00Z'),
      end: new Date('2024-01-21T17:00:00Z'),
      timezone: 'UTC',
    },
  ];

  console.log('Available Time Slots:');
  availableSlots.forEach((slot, i) => {
    console.log(`  ${i + 1}. ${slot.start.toLocaleString()}`);
  });

  console.log(
    '\nGenerating suggestions for contacts who need connection based on frequency preferences...'
  );
  console.log(
    '(In a real scenario, this would query the database and create suggestions)\n'
  );

  // Note: This would actually call the database in production
  // const suggestions = await generateTimeboundSuggestions('user-1', availableSlots);

  console.log('Example Output:');
  console.log('- Suggestion 1: Connect with Alice Johnson on Jan 20 at 10:00 AM');
  console.log('  Reasoning: It\'s been a while since you connected (weekly preference)');
  console.log('- Suggestion 2: Connect with Bob Smith on Jan 20 at 2:00 PM');
  console.log('  Reasoning: It\'s been a while since you connected (monthly preference)\n');
}

/**
 * Example 4: Generate shared activity suggestions
 */
async function exampleGenerateSharedActivitySuggestions() {
  console.log('=== Example 4: Generate Shared Activity Suggestions ===\n');

  const eventDetails = {
    title: 'Hiking at Mount Tamalpais',
    description: 'Morning hike with great views',
    location: 'Mill Valley, CA',
    start: new Date('2024-01-27T09:00:00Z'),
    end: new Date('2024-01-27T12:00:00Z'),
    timezone: 'America/Los_Angeles',
  };

  console.log('Calendar Event:');
  console.log(`  Title: ${eventDetails.title}`);
  console.log(`  Location: ${eventDetails.location}`);
  console.log(`  Time: ${eventDetails.start.toLocaleString()}\n`);

  console.log(
    'Analyzing contacts for shared interests and proximity...'
  );
  console.log(
    '(In a real scenario, this would query the database and create suggestions)\n'
  );

  // Note: This would actually call the database in production
  // const suggestions = await generateSharedActivitySuggestions(
  //   'user-1',
  //   'event-123',
  //   eventDetails
  // );

  console.log('Example Output:');
  console.log('- Suggestion: Invite Alice Johnson');
  console.log('  Reasoning: Hiking at Mount Tamalpais: Shared interests: hiking; Located in San Francisco');
  console.log('- Suggestion: Invite David Lee');
  console.log('  Reasoning: Hiking at Mount Tamalpais: Shared interests: outdoors; Haven\'t connected in 45 days\n');
}

/**
 * Example 5: Accept a suggestion
 */
async function exampleAcceptSuggestion() {
  console.log('=== Example 5: Accept a Suggestion ===\n');

  console.log('Accepting suggestion to connect with Alice Johnson...\n');

  // Note: This would actually call the database in production
  // const result = await acceptSuggestion('suggestion-123', 'user-1');

  console.log('Result:');
  console.log('  Status: Accepted');
  console.log('  Draft Message: "Hey Alice! It\'s been a while! Would you be free to catch up on Saturday, January 20 at 10:00 AM?"');
  console.log('  Interaction Log: Created');
  console.log('  Calendar Feed: Updated\n');
}

/**
 * Example 6: Dismiss a suggestion
 */
async function exampleDismissSuggestion() {
  console.log('=== Example 6: Dismiss a Suggestion ===\n');

  const contact: Contact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'Alice Johnson',
    location: 'San Francisco',
    frequencyPreference: FrequencyOption.WEEKLY,
    groups: [],
    tags: [],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const templates = generateDismissalReasonTemplates(contact);

  console.log('Available dismissal reason templates:');
  templates.forEach((template, i) => {
    console.log(`  ${i + 1}. ${template}`);
  });

  console.log('\nDismissing suggestion with reason: "Met too recently"\n');

  // Note: This would actually call the database in production
  // const result = await dismissSuggestion('suggestion-123', 'user-1', 'Met too recently');

  console.log('Result:');
  console.log('  Status: Dismissed');
  console.log('  Contact last contact date: Updated to now');
  console.log('  Action: Prompt user for frequency preference if not set\n');
}

/**
 * Example 7: Snooze a suggestion
 */
async function exampleSnoozeSuggestion() {
  console.log('=== Example 7: Snooze a Suggestion ===\n');

  console.log('Snoozing suggestion for 24 hours...\n');

  // Note: This would actually call the database in production
  // const result = await snoozeSuggestion('suggestion-123', 'user-1', 24);

  const snoozeUntil = new Date();
  snoozeUntil.setHours(snoozeUntil.getHours() + 24);

  console.log('Result:');
  console.log('  Status: Snoozed');
  console.log(`  Will resurface at: ${snoozeUntil.toLocaleString()}`);
  console.log('  Note: Suggestion will automatically return to pending status when time arrives\n');
}

/**
 * Example 8: Get pending suggestions
 */
async function exampleGetPendingSuggestions() {
  console.log('=== Example 8: Get Pending Suggestions ===\n');

  console.log('Fetching pending suggestions for user...\n');

  // Note: This would actually call the database in production
  // const suggestions = await getPendingSuggestions('user-1');

  console.log('Pending Suggestions:');
  console.log('  1. Connect with Alice Johnson');
  console.log('     Time: Saturday, January 20 at 10:00 AM');
  console.log('     Reasoning: It\'s been a while since you connected (weekly preference)');
  console.log('     Type: Timebound');
  console.log();
  console.log('  2. Invite Bob Smith to Hiking at Mount Tamalpais');
  console.log('     Time: Saturday, January 27 at 9:00 AM');
  console.log('     Reasoning: Shared interests: hiking; Located in San Francisco');
  console.log('     Type: Shared Activity');
  console.log();
  console.log('Note: Snoozed suggestions that have passed their snooze time are automatically included.\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        CatchUp Suggestion Engine - Example Usage          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await exampleCalculatePriority();
  await exampleMatchContacts();
  await exampleGenerateTimeboundSuggestions();
  await exampleGenerateSharedActivitySuggestions();
  await exampleAcceptSuggestion();
  await exampleDismissSuggestion();
  await exampleSnoozeSuggestion();
  await exampleGetPendingSuggestions();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Examples Complete                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  exampleCalculatePriority,
  exampleMatchContacts,
  exampleGenerateTimeboundSuggestions,
  exampleGenerateSharedActivitySuggestions,
  exampleAcceptSuggestion,
  exampleDismissSuggestion,
  exampleSnoozeSuggestion,
  exampleGetPendingSuggestions,
};
