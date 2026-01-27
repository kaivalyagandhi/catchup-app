/**
 * Contact Repository Tests
 * 
 * Tests for source filtering and source designation persistence
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresContactRepository, ContactCreateData } from './repository';
import pool from '../db/connection';

describe('ContactRepository - Source Filtering', () => {
  const repository = new PostgresContactRepository();
  let testUserId: string;
  let googleContactId: string;
  let manualContactId: string;

  beforeAll(async () => {
    // Create a test user with required google_id and auth_provider
    const userResult = await pool.query(
      `INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['test-source-filter@example.com', 'Test User', `google_test_${Date.now()}`, 'google']
    );
    testUserId = userResult.rows[0].id;

    // Create a Google-sourced contact
    const googleContact: ContactCreateData = {
      name: 'Google Contact',
      email: 'google@example.com',
      source: 'google',
      googleResourceName: 'people/test123',
      googleEtag: 'etag123',
    };
    const googleResult = await repository.create(testUserId, googleContact);
    googleContactId = googleResult.id;

    // Create a manual contact
    const manualContact: ContactCreateData = {
      name: 'Manual Contact',
      email: 'manual@example.com',
      source: 'manual',
    };
    const manualResult = await repository.create(testUserId, manualContact);
    manualContactId = manualResult.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('should filter contacts by source using findBySource', async () => {
    const googleContacts = await repository.findBySource(testUserId, 'google');
    
    expect(googleContacts).toHaveLength(1);
    expect(googleContacts[0].name).toBe('Google Contact');
    expect(googleContacts[0].source).toBe('google');
    expect(googleContacts[0].googleResourceName).toBe('people/test123');
  });

  it('should filter contacts by source using findAll with filters', async () => {
    const googleContacts = await repository.findAll(testUserId, { source: 'google' });
    
    expect(googleContacts).toHaveLength(1);
    expect(googleContacts[0].name).toBe('Google Contact');
    expect(googleContacts[0].source).toBe('google');
  });

  it('should return only manual contacts when filtering by manual source', async () => {
    const manualContacts = await repository.findBySource(testUserId, 'manual');
    
    expect(manualContacts).toHaveLength(1);
    expect(manualContacts[0].name).toBe('Manual Contact');
    expect(manualContacts[0].source).toBe('manual');
  });

  it('should preserve source designation when updating a Google contact', async () => {
    // Update the Google contact without specifying source
    const updated = await repository.update(googleContactId, testUserId, {
      name: 'Updated Google Contact',
      phone: '+1234567890',
    });

    expect(updated.source).toBe('google');
    expect(updated.name).toBe('Updated Google Contact');
    expect(updated.googleResourceName).toBe('people/test123');
  });

  it('should preserve source designation when updating a manual contact', async () => {
    // Update the manual contact without specifying source
    const updated = await repository.update(manualContactId, testUserId, {
      name: 'Updated Manual Contact',
      email: 'updated-manual@example.com',
    });

    expect(updated.source).toBe('manual');
    expect(updated.name).toBe('Updated Manual Contact');
  });

  it('should return empty array when no contacts match the source filter', async () => {
    const calendarContacts = await repository.findBySource(testUserId, 'calendar');
    
    expect(calendarContacts).toHaveLength(0);
  });

  it('should combine source filter with other filters in findAll', async () => {
    // Create an archived Google contact
    const archivedGoogleContact: ContactCreateData = {
      name: 'Archived Google Contact',
      email: 'archived-google@example.com',
      source: 'google',
      googleResourceName: 'people/archived123',
    };
    const archivedResult = await repository.create(testUserId, archivedGoogleContact);
    await repository.archive(archivedResult.id, testUserId);

    // Filter for non-archived Google contacts
    const activeGoogleContacts = await repository.findAll(testUserId, {
      source: 'google',
      archived: false,
    });

    expect(activeGoogleContacts).toHaveLength(1);
    expect(activeGoogleContacts[0].name).toBe('Updated Google Contact');

    // Clean up
    await pool.query('DELETE FROM contacts WHERE id = $1', [archivedResult.id]);
  });
});
