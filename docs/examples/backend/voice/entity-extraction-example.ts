/**
 * Entity Extraction Service - Example Usage
 * 
 * Demonstrates how to use the EntityExtractionService to extract
 * structured contact metadata from voice note transcripts.
 */

import { EntityExtractionService } from './entity-extraction-service.js';
import { Contact, TagSource } from '../types/index.js';

/**
 * Example 1: Extract entities for a known contact
 */
async function extractForKnownContact() {
  const service = new EntityExtractionService();

  const contact: Contact = {
    id: '123',
    userId: 'user-456',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    groups: ['College Friends'],
    tags: [{ id: '1', text: 'hiking', source: TagSource.MANUAL, createdAt: new Date() }],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const transcript = `
    Had coffee with John today at the new cafe downtown. 
    He mentioned he's really into rock climbing now and joined a climbing gym.
    He also said he's planning to move to Seattle next month.
    His new Instagram handle is @johndoe_climbs.
  `;

  const entities = await service.extractForContact(transcript, contact);

  console.log('Extracted entities for John:', entities);
  // Expected output:
  // {
  //   fields: {
  //     location: 'Seattle',
  //     instagram: '@johndoe_climbs',
  //     customNotes: 'Joined a climbing gym, planning to move to Seattle'
  //   },
  //   tags: ['rock climbing', 'coffee', 'climbing gym'],
  //   groups: [],
  //   lastContactDate: '2024-01-15T00:00:00.000Z'
  // }
}

/**
 * Example 2: Extract entities for unknown contact (generic)
 */
async function extractGeneric() {
  const service = new EntityExtractionService();

  const transcript = `
    Met someone interesting at the gym today. 
    They're really into photography and travel.
    Mentioned they just got back from Iceland.
  `;

  const entities = await service.extractGeneric(transcript);

  console.log('Extracted generic entities:', entities);
  // Expected output:
  // {
  //   fields: {
  //     customNotes: 'Met at gym, recently traveled to Iceland'
  //   },
  //   tags: ['photography', 'travel', 'gym', 'Iceland'],
  //   groups: [],
  //   lastContactDate: undefined
  // }
}

/**
 * Example 3: Extract entities for multiple contacts
 */
async function extractForMultipleContacts() {
  const service = new EntityExtractionService();

  const john: Contact = {
    id: '123',
    userId: 'user-456',
    name: 'John Doe',
    groups: [],
    tags: [],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const jane: Contact = {
    id: '789',
    userId: 'user-456',
    name: 'Jane Smith',
    groups: [],
    tags: [],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const transcript = `
    Had dinner with John and Jane last night. 
    John talked about his new startup in the fintech space.
    Jane mentioned she's training for a marathon and loves running.
    They're both part of our hiking group.
  `;

  const entitiesMap = await service.extractForMultipleContacts(transcript, [john, jane]);

  console.log('Extracted entities for John:', entitiesMap.get('123'));
  // Expected output:
  // {
  //   fields: { customNotes: 'Working on fintech startup' },
  //   tags: ['startup', 'fintech'],
  //   groups: ['Hiking Group'],
  //   lastContactDate: '2024-01-15T00:00:00.000Z'
  // }

  console.log('Extracted entities for Jane:', entitiesMap.get('789'));
  // Expected output:
  // {
  //   fields: { customNotes: 'Training for marathon' },
  //   tags: ['running', 'marathon'],
  //   groups: ['Hiking Group'],
  //   lastContactDate: '2024-01-15T00:00:00.000Z'
  // }
}

/**
 * Example 4: Error handling
 */
async function handleErrors() {
  const service = new EntityExtractionService();

  const transcript = 'Invalid or empty transcript';

  try {
    const entities = await service.extractGeneric(transcript);
    
    // Even if extraction fails, we get empty entities (not an error thrown)
    console.log('Entities (may be empty on failure):', entities);
    // Output: { fields: {}, tags: [], groups: [], lastContactDate: undefined }
  } catch (error) {
    // This won't be reached - service returns empty entities instead of throwing
    console.error('Unexpected error:', error);
  }
}

// Run examples (uncomment to execute)
// async function runExamples() {
//   console.log('=== Example 1: Known Contact ===');
//   await extractForKnownContact();
//
//   console.log('\n=== Example 2: Generic Extraction ===');
//   await extractGeneric();
//
//   console.log('\n=== Example 3: Multiple Contacts ===');
//   await extractForMultipleContacts();
//
//   console.log('\n=== Example 4: Error Handling ===');
//   await handleErrors();
// }
//
// runExamples().catch(console.error);
