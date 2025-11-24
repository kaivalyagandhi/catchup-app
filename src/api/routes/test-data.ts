/**
 * Test Data Routes
 * 
 * Endpoints for seeding test data and generating suggestions for testing
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { generateTimeboundSuggestions } from '../../matching/suggestion-service';
import { TimeSlot } from '../../types';
import pool from '../../db/connection';

const router = Router();

/**
 * Helper function to infer timezone from location
 */
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

/**
 * POST /api/test-data/seed
 * Seed test contacts and generate suggestions
 */
router.post('/seed', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const userId = req.userId;
    
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
    
    let contactsCreated = 0;
    
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
      contactsCreated++;
      
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
    
    // Generate timebound suggestions
    const suggestions = await generateTimeboundSuggestions(userId, availableSlots);
    
    res.json({
      message: 'Test data seeded successfully',
      contactsCreated,
      suggestionsCreated: suggestions.length
    });
  } catch (error) {
    console.error('Error seeding test data:', error);
    res.status(500).json({ 
      error: 'Failed to seed test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/test-data/generate-suggestions
 * Generate suggestions for existing contacts
 */
router.post('/generate-suggestions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
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
    
    const suggestions = await generateTimeboundSuggestions(req.userId, availableSlots);
    
    res.json({
      message: 'Suggestions generated successfully',
      suggestionsCreated: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
