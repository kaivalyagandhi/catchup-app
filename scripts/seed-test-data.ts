/**
 * Seed Test Data Script
 * 
 * Creates test contacts and generates suggestions for testing the UI
 */

import pool from '../src/db/connection';
import { generateTimeboundSuggestions } from '../src/matching/suggestion-service';
import { TimeSlot } from '../src/types';

async function seedTestData(userId: string) {
  console.log('Seeding test data for user:', userId);
  
  // Create test contacts with different scenarios
  const contacts = [
    {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1234567890',
      location: 'San Francisco',
      frequencyPreference: 'weekly',
      lastContactDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      tags: ['tech', 'hiking', 'coffee']
    },
    {
      name: 'Bob Martinez',
      email: 'bob@example.com',
      location: 'New York City',
      frequencyPreference: 'monthly',
      lastContactDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      tags: ['startup', 'basketball', 'music']
    },
    {
      name: 'Carol Chen',
      email: 'carol@example.com',
      phone: '+1987654321',
      location: 'Los Angeles',
      frequencyPreference: 'biweekly',
      lastContactDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      tags: ['design', 'yoga', 'photography']
    },
    {
      name: 'David Kim',
      email: 'david@example.com',
      location: 'Seattle',
      frequencyPreference: 'monthly',
      lastContactDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago (overdue!)
      tags: ['gaming', 'cooking', 'tech']
    },
    {
      name: 'Emma Wilson',
      email: 'emma@example.com',
      location: 'San Francisco',
      frequencyPreference: 'weekly',
      lastContactDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      tags: ['running', 'books', 'coffee']
    }
  ];
  
  console.log(`Creating ${contacts.length} test contacts...`);
  
  for (const contact of contacts) {
    // Insert contact
    const contactResult = await pool.query(
      `INSERT INTO contacts (user_id, name, email, phone, location, timezone, frequency_preference, last_contact_date, custom_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        contact.name,
        contact.email,
        contact.phone || null,
        contact.location,
        inferTimezone(contact.location),
        contact.frequencyPreference,
        contact.lastContactDate,
        `Test contact - Last contacted ${Math.floor((Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
      ]
    );
    
    const contactId = contactResult.rows[0].id;
    console.log(`  ✓ Created ${contact.name} (${contactId})`);
    
    // Add tags
    for (const tagText of contact.tags) {
      await pool.query(
        `INSERT INTO tags (contact_id, text, source)
         VALUES ($1, $2, $3)`,
        [contactId, tagText, 'manual']
      );
    }
  }
  
  // Generate available time slots for the next week
  const availableSlots: TimeSlot[] = [];
  const now = new Date();
  
  // Create slots for next 7 days (weekdays only, 2-4pm)
  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Create afternoon slot (2-4pm)
    const start = new Date(date);
    start.setHours(14, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(16, 0, 0, 0);
    
    availableSlots.push({
      start,
      end,
      timezone: 'America/Los_Angeles'
    });
  }
  
  console.log(`\nGenerating suggestions for ${availableSlots.length} available time slots...`);
  
  // Generate timebound suggestions
  const suggestions = await generateTimeboundSuggestions(userId, availableSlots);
  
  console.log(`\n✓ Created ${suggestions.length} suggestions!`);
  console.log('\nTest data seeding complete!');
  console.log('\nYou should now see:');
  console.log(`  - ${contacts.length} contacts in your Contacts page`);
  console.log(`  - ${suggestions.length} suggestions in your Suggestions page`);
  
  return {
    contactsCreated: contacts.length,
    suggestionsCreated: suggestions.length
  };
}

function inferTimezone(location: string): string {
  const timezones: Record<string, string> = {
    'san francisco': 'America/Los_Angeles',
    'new york': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'seattle': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'boston': 'America/New_York',
    'austin': 'America/Chicago',
    'denver': 'America/Denver'
  };
  
  const key = location.toLowerCase();
  for (const [city, tz] of Object.entries(timezones)) {
    if (key.includes(city)) {
      return tz;
    }
  }
  
  return 'America/Los_Angeles'; // Default
}

// CLI usage
if (require.main === module) {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('Usage: ts-node scripts/seed-test-data.ts <userId>');
    process.exit(1);
  }
  
  seedTestData(userId)
    .then(() => {
      console.log('\n✓ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding test data:', error);
      process.exit(1);
    });
}

export { seedTestData };
