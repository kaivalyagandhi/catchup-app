/**
 * Account Service Tests
 *
 * Tests for account deletion and test user management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AccountServiceImpl } from './account-service';
import { ContactServiceImpl } from './service';
import { GroupServiceImpl } from './group-service';
import { TagServiceImpl } from './tag-service';
import { InteractionServiceImpl } from './interaction-service';
import pool from '../db/connection';

describe('AccountService', () => {
  let accountService: AccountServiceImpl;
  let contactService: ContactServiceImpl;
  let groupService: GroupServiceImpl;
  let tagService: TagServiceImpl;
  let interactionService: InteractionServiceImpl;
  let testUserId: string;
  let testUserEmail: string;

  beforeEach(async () => {
    accountService = new AccountServiceImpl();
    contactService = new ContactServiceImpl();
    groupService = new GroupServiceImpl();
    tagService = new TagServiceImpl();
    interactionService = new InteractionServiceImpl();

    // Create a test user with more unique identifier
    testUserEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const result = await pool.query(
      'INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUserEmail, 'Test User', `google_test_${Date.now()}`, 'google']
    );
    testUserId = result.rows[0].id;
  });

  afterEach(async () => {
    // Clean up test user if it still exists
    try {
      await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    } catch (error) {
      // Ignore errors if user was already deleted
    }
  });

  describe('deleteUserAccount', () => {
    it('should delete user and all associated data', async () => {
      // Create test data
      const contact = await contactService.createContact(testUserId, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York',
      });

      const group = await groupService.createGroup(testUserId, 'Friends');
      await groupService.assignContactToGroup(contact.id, group.id, testUserId);

      await tagService.addTag(contact.id, testUserId, 'hiking', 'manual');

      await interactionService.logInteraction(
        testUserId,
        contact.id,
        new Date(),
        'hangout',
        'Coffee meetup'
      );

      // Create preferences
      await pool.query(
        `INSERT INTO notification_preferences (user_id, sms_enabled, email_enabled)
         VALUES ($1, true, false)`,
        [testUserId]
      );

      await pool.query(
        `INSERT INTO availability_params (user_id, nighttime_start, nighttime_end)
         VALUES ($1, '22:00', '07:00')`,
        [testUserId]
      );

      // Delete account
      await accountService.deleteUserAccount(testUserId);

      // Verify user is deleted
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
      expect(userResult.rows.length).toBe(0);

      // Verify contacts are deleted
      const contactsResult = await pool.query('SELECT * FROM contacts WHERE user_id = $1', [
        testUserId,
      ]);
      expect(contactsResult.rows.length).toBe(0);

      // Verify groups are deleted
      const groupsResult = await pool.query('SELECT * FROM groups WHERE user_id = $1', [
        testUserId,
      ]);
      expect(groupsResult.rows.length).toBe(0);

      // Verify interaction logs are deleted
      const interactionsResult = await pool.query(
        'SELECT * FROM interaction_logs WHERE user_id = $1',
        [testUserId]
      );
      expect(interactionsResult.rows.length).toBe(0);

      // Verify preferences are deleted
      const prefsResult = await pool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [testUserId]
      );
      expect(prefsResult.rows.length).toBe(0);

      const availResult = await pool.query(
        'SELECT * FROM availability_params WHERE user_id = $1',
        [testUserId]
      );
      expect(availResult.rows.length).toBe(0);
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(accountService.deleteUserAccount(nonExistentUserId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should delete user with no associated data', async () => {
      // Delete user with no contacts, groups, etc.
      await accountService.deleteUserAccount(testUserId);

      // Verify user is deleted
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
      expect(userResult.rows.length).toBe(0);
    });

    it('should delete user with multiple contacts and complex relationships', async () => {
      // Create multiple contacts
      const contact1 = await contactService.createContact(testUserId, {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const contact2 = await contactService.createContact(testUserId, {
        name: 'Bob',
        email: 'bob@example.com',
      });

      // Create multiple groups
      const group1 = await groupService.createGroup(testUserId, 'Close Friends');
      const group2 = await groupService.createGroup(testUserId, 'Work');

      // Assign contacts to groups
      await groupService.assignContactToGroup(contact1.id, group1.id, testUserId);
      await groupService.assignContactToGroup(contact1.id, group2.id, testUserId);
      await groupService.assignContactToGroup(contact2.id, group2.id, testUserId);

      // Add tags
      await tagService.addTag(contact1.id, testUserId, 'tech', 'manual');
      await tagService.addTag(contact2.id, testUserId, 'sports', 'manual');

      // Log interactions
      await interactionService.logInteraction(testUserId, contact1.id, new Date(), 'call');

      await interactionService.logInteraction(testUserId, contact2.id, new Date(), 'text');

      // Delete account
      await accountService.deleteUserAccount(testUserId);

      // Verify everything is deleted
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
      expect(userResult.rows.length).toBe(0);

      const contactsResult = await pool.query('SELECT * FROM contacts WHERE user_id = $1', [
        testUserId,
      ]);
      expect(contactsResult.rows.length).toBe(0);

      const groupsResult = await pool.query('SELECT * FROM groups WHERE user_id = $1', [
        testUserId,
      ]);
      expect(groupsResult.rows.length).toBe(0);

      const interactionsResult = await pool.query(
        'SELECT * FROM interaction_logs WHERE user_id = $1',
        [testUserId]
      );
      expect(interactionsResult.rows.length).toBe(0);
    });
  });

  describe('createTestUser', () => {
    it('should create a test user with is_test_user flag', async () => {
      const email = `test-user-${Date.now()}@example.com`;
      const name = 'Test User';

      const testUser = await accountService.createTestUser(email, name);

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe(email);
      expect(testUser.name).toBe(name);
      expect(testUser.isTestUser).toBe(true);
      expect(testUser.createdAt).toBeInstanceOf(Date);

      // Verify in database
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [testUser.id]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].is_test_user).toBe(true);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    });

    it('should create a test user without name', async () => {
      const email = `test-user-${Date.now()}@example.com`;

      const testUser = await accountService.createTestUser(email);

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toBe(email);
      expect(testUser.name).toBeUndefined();
      expect(testUser.isTestUser).toBe(true);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    });

    it('should support all standard user functionality for test users', async () => {
      const email = `test-user-${Date.now()}@example.com`;
      const testUser = await accountService.createTestUser(email, 'Test User');

      // Test user should be able to create contacts
      const contact = await contactService.createContact(testUser.id, {
        name: 'Test Contact',
        email: 'contact@example.com',
      });
      expect(contact.id).toBeDefined();
      expect(contact.userId).toBe(testUser.id);

      // Test user should be able to create groups
      const group = await groupService.createGroup(testUser.id, 'Test Group');
      expect(group.id).toBeDefined();
      expect(group.userId).toBe(testUser.id);

      // Test user should be able to assign contacts to groups
      await groupService.assignContactToGroup(contact.id, group.id, testUser.id);

      // Test user should be able to add tags
      await tagService.addTag(contact.id, testUser.id, 'test-tag', 'manual');

      // Test user should be able to log interactions
      const interaction = await interactionService.logInteraction(
        testUser.id,
        contact.id,
        new Date(),
        'hangout'
      );
      expect(interaction.id).toBeDefined();

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    });
  });

  describe('isTestUser', () => {
    it('should return true for test users', async () => {
      const email = `test-user-${Date.now()}@example.com`;
      const testUser = await accountService.createTestUser(email);

      const result = await accountService.isTestUser(testUser.id);
      expect(result).toBe(true);

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    });

    it('should return false for regular users', async () => {
      const result = await accountService.isTestUser(testUserId);
      expect(result).toBe(false);
    });

    it('should throw error if user does not exist', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';

      await expect(accountService.isTestUser(nonExistentUserId)).rejects.toThrow('User not found');
    });
  });
});
