/**
 * Voice Note Repository Tests
 *
 * Tests for voice note repository CRUD operations and multi-contact associations
 * Requirements: 13.1-13.8, 2.2, 2.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import pool from '../db/connection';
import { VoiceNoteRepository } from './voice-repository';
import { PostgresContactRepository } from '../contacts/repository';
import { VoiceNoteStatus } from '../types';

describe('VoiceNoteRepository', () => {
  const repository = new VoiceNoteRepository();
  const contactRepository = new PostgresContactRepository();
  
  let testUserId: string;
  let testContactId1: string;
  let testContactId2: string;

  beforeEach(async () => {
    // Create test user with unique email
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id`,
      [uniqueEmail, 'hash']
    );
    testUserId = userResult.rows[0].id;

    // Create test contacts
    const contact1 = await contactRepository.create(testUserId, {
      name: 'Test Contact 1',
      email: 'contact1@example.com',
    });
    testContactId1 = contact1.id;

    const contact2 = await contactRepository.create(testUserId, {
      name: 'Test Contact 2',
      email: 'contact2@example.com',
    });
    testContactId2 = contact2.id;
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('create', () => {
    it('should create a voice note with default status', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      expect(voiceNote.id).toBeDefined();
      expect(voiceNote.userId).toBe(testUserId);
      expect(voiceNote.transcript).toBe('Test transcript');
      expect(voiceNote.status).toBe('transcribing');
      expect(voiceNote.contacts).toEqual([]);
      expect(voiceNote.createdAt).toBeInstanceOf(Date);
      expect(voiceNote.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a voice note with custom status', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
        status: 'ready',
      });

      expect(voiceNote.status).toBe('ready');
    });

    it('should create a voice note with extracted entities', async () => {
      const entities = {
        'contact-1': {
          fields: { phone: '+1234567890' },
          tags: ['hiking'],
          groups: ['Friends'],
        },
      };

      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
        extractedEntities: entities,
      });

      expect(voiceNote.extractedEntities).toEqual(entities);
    });
  });

  describe('update', () => {
    it('should update voice note status', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      const updated = await repository.update(voiceNote.id, testUserId, {
        status: 'ready',
      });

      expect(updated.status).toBe('ready');
      expect(updated.transcript).toBe('Test transcript');
    });

    it('should update voice note transcript', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Original transcript',
      });

      const updated = await repository.update(voiceNote.id, testUserId, {
        transcript: 'Updated transcript',
      });

      expect(updated.transcript).toBe('Updated transcript');
    });

    it('should update extracted entities', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      const entities = {
        'contact-1': {
          fields: { email: 'test@example.com' },
          tags: ['coding'],
          groups: ['Work'],
        },
      };

      const updated = await repository.update(voiceNote.id, testUserId, {
        extractedEntities: entities,
      });

      expect(updated.extractedEntities).toEqual(entities);
    });

    it('should throw error when voice note not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        repository.update(fakeId, testUserId, { status: 'ready' })
      ).rejects.toThrow('Voice note not found');
    });
  });

  describe('getById', () => {
    it('should retrieve voice note by id', async () => {
      const created = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      const retrieved = await repository.getById(created.id, testUserId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.transcript).toBe('Test transcript');
    });

    it('should return null for non-existent voice note', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const retrieved = await repository.getById(fakeId, testUserId);
      expect(retrieved).toBeNull();
    });

    it('should include associated contacts', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.associateContacts(voiceNote.id, testUserId, [testContactId1]);

      const retrieved = await repository.getById(voiceNote.id, testUserId);

      expect(retrieved?.contacts).toHaveLength(1);
      expect(retrieved?.contacts[0].id).toBe(testContactId1);
    });
  });

  describe('listByUserId', () => {
    it('should list all voice notes for a user', async () => {
      await repository.create({
        userId: testUserId,
        transcript: 'First transcript',
      });

      await repository.create({
        userId: testUserId,
        transcript: 'Second transcript',
      });

      const voiceNotes = await repository.listByUserId(testUserId);

      expect(voiceNotes).toHaveLength(2);
      expect(voiceNotes[0].transcript).toBe('Second transcript'); // Most recent first
      expect(voiceNotes[1].transcript).toBe('First transcript');
    });

    it('should filter by status', async () => {
      await repository.create({
        userId: testUserId,
        transcript: 'Transcribing transcript',
        status: 'transcribing',
      });

      await repository.create({
        userId: testUserId,
        transcript: 'Ready transcript',
        status: 'ready',
      });

      const voiceNotes = await repository.listByUserId(testUserId, {
        status: 'ready',
      });

      expect(voiceNotes).toHaveLength(1);
      expect(voiceNotes[0].transcript).toBe('Ready transcript');
    });

    it('should filter by contact', async () => {
      const voiceNote1 = await repository.create({
        userId: testUserId,
        transcript: 'First transcript',
      });
      await repository.associateContacts(voiceNote1.id, testUserId, [testContactId1]);

      const voiceNote2 = await repository.create({
        userId: testUserId,
        transcript: 'Second transcript',
      });
      await repository.associateContacts(voiceNote2.id, testUserId, [testContactId2]);

      const voiceNotes = await repository.listByUserId(testUserId, {
        contactIds: [testContactId1],
      });

      expect(voiceNotes).toHaveLength(1);
      expect(voiceNotes[0].transcript).toBe('First transcript');
    });

    it('should filter by search text', async () => {
      await repository.create({
        userId: testUserId,
        transcript: 'I went hiking with John',
      });

      await repository.create({
        userId: testUserId,
        transcript: 'Had coffee with Sarah',
      });

      const voiceNotes = await repository.listByUserId(testUserId, {
        searchText: 'hiking',
      });

      expect(voiceNotes).toHaveLength(1);
      expect(voiceNotes[0].transcript).toContain('hiking');
    });
  });

  describe('delete', () => {
    it('should delete a voice note', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.delete(voiceNote.id, testUserId);

      const retrieved = await repository.getById(voiceNote.id, testUserId);
      expect(retrieved).toBeNull();
    });

    it('should throw error when voice note not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        repository.delete(fakeId, testUserId)
      ).rejects.toThrow('Voice note not found');
    });
  });

  describe('associateContacts', () => {
    it('should associate multiple contacts with a voice note', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.associateContacts(voiceNote.id, testUserId, [
        testContactId1,
        testContactId2,
      ]);

      const contacts = await repository.getAssociatedContacts(voiceNote.id, testUserId);

      expect(contacts).toHaveLength(2);
      expect(contacts.map((c) => c.id)).toContain(testContactId1);
      expect(contacts.map((c) => c.id)).toContain(testContactId2);
    });

    it('should handle duplicate associations gracefully', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.associateContacts(voiceNote.id, testUserId, [testContactId1]);
      await repository.associateContacts(voiceNote.id, testUserId, [testContactId1]);

      const contacts = await repository.getAssociatedContacts(voiceNote.id, testUserId);

      expect(contacts).toHaveLength(1);
    });

    it('should throw error when voice note not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        repository.associateContacts(fakeId, testUserId, [testContactId1])
      ).rejects.toThrow('Voice note not found');
    });

    it('should throw error when contact not found', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      const fakeContactId = '00000000-0000-0000-0000-000000000000';
      await expect(
        repository.associateContacts(voiceNote.id, testUserId, [fakeContactId])
      ).rejects.toThrow('One or more contacts not found');
    });
  });

  describe('getAssociatedContacts', () => {
    it('should return empty array when no contacts associated', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      const contacts = await repository.getAssociatedContacts(voiceNote.id, testUserId);

      expect(contacts).toEqual([]);
    });

    it('should return contacts in order of association', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.associateContacts(voiceNote.id, testUserId, [
        testContactId2,
        testContactId1,
      ]);

      const contacts = await repository.getAssociatedContacts(voiceNote.id, testUserId);

      expect(contacts[0].id).toBe(testContactId2);
      expect(contacts[1].id).toBe(testContactId1);
    });
  });

  describe('removeContactAssociation', () => {
    it('should remove a contact association', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await repository.associateContacts(voiceNote.id, testUserId, [
        testContactId1,
        testContactId2,
      ]);

      await repository.removeContactAssociation(voiceNote.id, testUserId, testContactId1);

      const contacts = await repository.getAssociatedContacts(voiceNote.id, testUserId);

      expect(contacts).toHaveLength(1);
      expect(contacts[0].id).toBe(testContactId2);
    });

    it('should throw error when voice note not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        repository.removeContactAssociation(fakeId, testUserId, testContactId1)
      ).rejects.toThrow('Voice note not found');
    });

    it('should throw error when association not found', async () => {
      const voiceNote = await repository.create({
        userId: testUserId,
        transcript: 'Test transcript',
      });

      await expect(
        repository.removeContactAssociation(voiceNote.id, testUserId, testContactId1)
      ).rejects.toThrow('Contact association not found');
    });
  });
});
