/**
 * Streaming Contact Repository Tests
 *
 * Tests for async generator-based contact streaming
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamingContactRepository, MinimalContact } from './streaming-repository';
import pool from '../db/connection';
import { FrequencyOption } from '../types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('StreamingContactRepository', () => {
  let repository: StreamingContactRepository;

  beforeEach(async () => {
    repository = new StreamingContactRepository();

    // Create test user with google_id to satisfy check constraint
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    await pool.query(
      `INSERT INTO users (id, email, name, google_id, auth_provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, google_id = EXCLUDED.google_id`,
      [TEST_USER_ID, uniqueEmail, 'Test User', 'test-google-id', 'google']
    );
  });

  afterEach(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  describe('streamContacts', () => {
    it('should stream contacts in batches', async () => {
      // Create 25 test contacts
      for (let i = 0; i < 25; i++) {
        await pool.query(
          `INSERT INTO contacts (user_id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [TEST_USER_ID, `Contact ${i}`]
        );
      }

      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID, { batchSize: 10 })) {
        batches.push(batch);
      }

      // Should have 3 batches: 10, 10, 5
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(10);
      expect(batches[1].length).toBe(10);
      expect(batches[2].length).toBe(5);
    });

    it('should return empty when no contacts exist', async () => {
      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      expect(batches.length).toBe(0);
    });

    it('should respect batch size', async () => {
      // Create 5 test contacts
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO contacts (user_id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [TEST_USER_ID, `Contact ${i}`]
        );
      }

      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID, { batchSize: 2 })) {
        batches.push(batch);
      }

      // Should have 3 batches: 2, 2, 1
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(2);
      expect(batches[1].length).toBe(2);
      expect(batches[2].length).toBe(1);
    });

    it('should order by last_contact_date by default', async () => {
      // Create contacts with different last contact dates
      await pool.query(
        `INSERT INTO contacts (user_id, name, last_contact_date, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [TEST_USER_ID, 'Recent Contact', new Date('2024-01-15')]
      );
      await pool.query(
        `INSERT INTO contacts (user_id, name, last_contact_date, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [TEST_USER_ID, 'Old Contact', new Date('2023-01-01')]
      );
      await pool.query(
        `INSERT INTO contacts (user_id, name, last_contact_date, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [TEST_USER_ID, 'Never Contacted', null]
      );

      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts.length).toBe(3);
      // Nulls first, then oldest to newest
      expect(allContacts[0].name).toBe('Never Contacted');
      expect(allContacts[1].name).toBe('Old Contact');
      expect(allContacts[2].name).toBe('Recent Contact');
    });

    it('should support custom ordering', async () => {
      // Create contacts
      await pool.query(
        `INSERT INTO contacts (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [TEST_USER_ID, 'Zebra']
      );
      await pool.query(
        `INSERT INTO contacts (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [TEST_USER_ID, 'Apple']
      );

      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID, {
        orderBy: 'name',
        orderDirection: 'ASC',
      })) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts[0].name).toBe('Apple');
      expect(allContacts[1].name).toBe('Zebra');
    });

    it('should exclude archived contacts', async () => {
      // Create active contact
      await pool.query(
        `INSERT INTO contacts (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [TEST_USER_ID, 'Active Contact']
      );

      // Create archived contact
      await pool.query(
        `INSERT INTO contacts (user_id, name, archived_at, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW(), NOW())`,
        [TEST_USER_ID, 'Archived Contact']
      );

      const batches: any[][] = [];
      for await (const batch of repository.streamContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts.length).toBe(1);
      expect(allContacts[0].name).toBe('Active Contact');
    });
  });

  describe('streamMinimalContacts', () => {
    it('should stream minimal contact data', async () => {
      // Create test contact with full data
      await pool.query(
        `INSERT INTO contacts (
          user_id, name, email, phone, linked_in, instagram, 
          custom_notes, last_contact_date, frequency_preference,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          TEST_USER_ID,
          'Full Contact',
          'test@example.com',
          '+1234567890',
          'linkedin.com/in/test',
          '@test',
          'Some notes',
          new Date('2024-01-01'),
          FrequencyOption.WEEKLY,
        ]
      );

      const batches: MinimalContact[][] = [];
      for await (const batch of repository.streamMinimalContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts.length).toBe(1);

      const contact = allContacts[0];
      // Should have minimal fields only
      expect(contact).toHaveProperty('id');
      expect(contact).toHaveProperty('name');
      expect(contact).toHaveProperty('lastContactDate');
      expect(contact).toHaveProperty('frequencyPreference');
      expect(contact).toHaveProperty('groups');
      expect(contact).toHaveProperty('archived');

      // Should NOT have full contact fields
      expect(contact).not.toHaveProperty('email');
      expect(contact).not.toHaveProperty('phone');
      expect(contact).not.toHaveProperty('customNotes');
    });

    it('should include group IDs', async () => {
      // Create contact
      const contactResult = await pool.query(
        `INSERT INTO contacts (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id`,
        [TEST_USER_ID, 'Contact with Groups']
      );
      const contactId = contactResult.rows[0].id;

      // Create groups
      const group1Result = await pool.query(
        `INSERT INTO groups (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id`,
        [TEST_USER_ID, 'Group 1']
      );
      const group1Id = group1Result.rows[0].id;

      const group2Result = await pool.query(
        `INSERT INTO groups (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id`,
        [TEST_USER_ID, 'Group 2']
      );
      const group2Id = group2Result.rows[0].id;

      // Associate contact with groups
      await pool.query(
        `INSERT INTO contact_groups (contact_id, group_id, created_at)
         VALUES ($1, $2, NOW()), ($1, $3, NOW())`,
        [contactId, group1Id, group2Id]
      );

      const batches: MinimalContact[][] = [];
      for await (const batch of repository.streamMinimalContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts.length).toBe(1);
      expect(allContacts[0].groups).toHaveLength(2);
      expect(allContacts[0].groups).toContain(group1Id);
      expect(allContacts[0].groups).toContain(group2Id);
    });

    it('should handle contacts with no groups', async () => {
      await pool.query(
        `INSERT INTO contacts (user_id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [TEST_USER_ID, 'Contact without Groups']
      );

      const batches: MinimalContact[][] = [];
      for await (const batch of repository.streamMinimalContacts(TEST_USER_ID)) {
        batches.push(batch);
      }

      const allContacts = batches.flat();
      expect(allContacts.length).toBe(1);
      expect(allContacts[0].groups).toEqual([]);
    });

    it('should respect batch size for minimal contacts', async () => {
      // Create 15 test contacts
      for (let i = 0; i < 15; i++) {
        await pool.query(
          `INSERT INTO contacts (user_id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [TEST_USER_ID, `Contact ${i}`]
        );
      }

      const batches: MinimalContact[][] = [];
      for await (const batch of repository.streamMinimalContacts(TEST_USER_ID, { batchSize: 5 })) {
        batches.push(batch);
      }

      // Should have 3 batches of 5 each
      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(5);
      expect(batches[1].length).toBe(5);
      expect(batches[2].length).toBe(5);
    });
  });

  describe('streamWithCursor', () => {
    it('should delegate to streamContacts for now', async () => {
      // Create test contacts
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO contacts (user_id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [TEST_USER_ID, `Contact ${i}`]
        );
      }

      const batches: any[][] = [];
      for await (const batch of repository.streamWithCursor(TEST_USER_ID, { batchSize: 2 })) {
        batches.push(batch);
      }

      // Should work like streamContacts
      expect(batches.length).toBeGreaterThan(0);
      const allContacts = batches.flat();
      expect(allContacts.length).toBe(5);
    });
  });

  describe('Memory efficiency', () => {
    it('should not accumulate all contacts in memory', async () => {
      // Create 100 test contacts
      for (let i = 0; i < 100; i++) {
        await pool.query(
          `INSERT INTO contacts (user_id, name, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [TEST_USER_ID, `Contact ${i}`]
        );
      }

      const memoryBefore = process.memoryUsage().heapUsed;
      let batchCount = 0;

      for await (const batch of repository.streamContacts(TEST_USER_ID, { batchSize: 10 })) {
        batchCount++;
        // Process batch immediately (don't accumulate)
        expect(batch.length).toBeGreaterThan(0);
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDiff = memoryAfter - memoryBefore;

      // Memory increase should be minimal (< 10MB for 100 contacts)
      expect(memoryDiff).toBeLessThan(10 * 1024 * 1024);
      expect(batchCount).toBe(10); // 100 contacts / 10 per batch
    });
  });
});
