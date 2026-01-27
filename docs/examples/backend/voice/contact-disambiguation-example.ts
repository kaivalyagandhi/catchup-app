/**
 * Contact Disambiguation Service - Example Usage
 * 
 * Demonstrates how to use the ContactDisambiguationService to identify
 * contacts mentioned in voice note transcripts.
 */

import { ContactDisambiguationService } from './contact-disambiguation-service.js';
import { Contact } from '../types/index.js';

/**
 * Example: Basic contact disambiguation
 */
async function basicDisambiguation() {
  const service = new ContactDisambiguationService();

  // Sample user contacts
  const userContacts: Contact[] = [
    {
      id: '1',
      userId: 'user-123',
      name: 'John Smith',
      phone: '+1234567890',
      email: 'john@example.com',
      groups: ['Work Friends'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      userId: 'user-123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      groups: ['College Friends'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      userId: 'user-123',
      name: 'Mike Johnson',
      groups: [],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Voice note transcript mentioning multiple contacts
  const transcript = "Had lunch with John and Jane today. We talked about the project.";

  // Disambiguate contacts
  const contacts = await service.disambiguate(transcript, userContacts);

  console.log('Matched contacts:', contacts.map(c => c.name));
  // Expected output: ['John Smith', 'Jane Doe']
}

/**
 * Example: Detailed disambiguation with partial matches
 */
async function detailedDisambiguation() {
  const service = new ContactDisambiguationService();

  const userContacts: Contact[] = [
    {
      id: '1',
      userId: 'user-123',
      name: 'Sarah Williams',
      groups: [],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      userId: 'user-123',
      name: 'Sara Johnson',
      groups: [],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Transcript with ambiguous name (could match Sarah or Sara)
  const transcript = "Met with Sara at the coffee shop";

  // Get detailed result
  const result = await service.disambiguateDetailed(transcript, userContacts);

  console.log('High-confidence matches:', result.matches.map(c => c.name));
  console.log('Partial matches requiring review:');
  result.partialMatches.forEach(pm => {
    console.log(`  "${pm.extractedName}" could be:`);
    pm.candidates.forEach(candidate => {
      console.log(`    - ${candidate.contact.name} (score: ${candidate.score.toFixed(2)}, ${candidate.reason})`);
    });
  });
  console.log('Unmatched names:', result.unmatchedNames);
}

/**
 * Example: Handling no matches (triggers manual selection)
 */
async function noMatchesExample() {
  const service = new ContactDisambiguationService();

  const userContacts: Contact[] = [
    {
      id: '1',
      userId: 'user-123',
      name: 'Alice Brown',
      groups: [],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Transcript mentioning someone not in contacts
  const transcript = "Met a new person named Bob at the conference";

  const contacts = await service.disambiguate(transcript, userContacts);

  if (contacts.length === 0) {
    console.log('No matches found - trigger manual contact selection UI');
    
    // Get detailed result to see what names were extracted
    const result = await service.disambiguateDetailed(transcript, userContacts);
    console.log('Extracted names:', result.unmatchedNames);
    // Expected: ['Bob']
  }
}

/**
 * Example: Multi-contact voice note
 */
async function multiContactExample() {
  const service = new ContactDisambiguationService();

  const userContacts: Contact[] = [
    {
      id: '1',
      userId: 'user-123',
      name: 'Tom Anderson',
      groups: ['Hiking Buddies'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      userId: 'user-123',
      name: 'Lisa Chen',
      groups: ['Hiking Buddies'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      userId: 'user-123',
      name: 'David Park',
      groups: ['Hiking Buddies'],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Voice note about group activity
  const transcript = `
    Went hiking with Tom, Lisa, and David yesterday. 
    Tom brought his new camera and took amazing photos.
    Lisa shared some trail mix she made.
    David led us to a great viewpoint.
  `;

  const contacts = await service.disambiguate(transcript, userContacts);

  console.log('Group voice note - matched contacts:', contacts.map(c => c.name));
  // Expected: ['Tom Anderson', 'Lisa Chen', 'David Park']
  console.log('This voice note will be associated with all', contacts.length, 'contacts');
}

/**
 * Example: Fuzzy matching with typos
 */
async function fuzzyMatchingExample() {
  const service = new ContactDisambiguationService();

  const userContacts: Contact[] = [
    {
      id: '1',
      userId: 'user-123',
      name: 'Christopher Martinez',
      groups: [],
      tags: [],
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Transcript with nickname/shortened name
  const transcript = "Caught up with Chris today";

  const contacts = await service.disambiguate(transcript, userContacts);

  console.log('Fuzzy match result:', contacts.map(c => c.name));
  // Expected: ['Christopher Martinez'] (partial name match)
}

/**
 * Example: Name extraction only
 */
async function nameExtractionExample() {
  const service = new ContactDisambiguationService();

  const transcripts = [
    "Had coffee with Emma and Oliver",
    "Went to the park today", // No names
    "Called my mom", // Relationship term
    "Met with Dr. Smith and Professor Johnson", // Titles
  ];

  for (const transcript of transcripts) {
    const names = await service.identifyContactNames(transcript);
    console.log(`"${transcript}"`);
    console.log('  Extracted names:', names);
  }
}

// Run examples
async function runExamples() {
  console.log('=== Basic Disambiguation ===');
  await basicDisambiguation();
  
  console.log('\n=== Detailed Disambiguation ===');
  await detailedDisambiguation();
  
  console.log('\n=== No Matches Example ===');
  await noMatchesExample();
  
  console.log('\n=== Multi-Contact Example ===');
  await multiContactExample();
  
  console.log('\n=== Fuzzy Matching Example ===');
  await fuzzyMatchingExample();
  
  console.log('\n=== Name Extraction Example ===');
  await nameExtractionExample();
}

// Execute if run directly
if (process.argv[1] && process.argv[1].includes('contact-disambiguation-example')) {
  runExamples().catch(console.error);
}
