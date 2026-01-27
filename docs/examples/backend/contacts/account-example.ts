/**
 * Account Management Example Usage
 *
 * Demonstrates how to use the account management service for
 * account deletion and test user creation.
 */

import { accountService, contactService, groupService } from './index';

/**
 * Example: Delete a user account
 */
async function deleteAccountExample() {
  const userId = 'user-123';

  try {
    // Delete the user account and all associated data
    await accountService.deleteUserAccount(userId);
    console.log('Account deleted successfully');
  } catch (error) {
    console.error('Failed to delete account:', error);
  }
}

/**
 * Example: Create and use a test user
 */
async function testUserExample() {
  try {
    // Create a test user
    const testUser = await accountService.createTestUser(
      'test@example.com',
      'Test User'
    );
    console.log('Test user created:', testUser);

    // Test users support all standard functionality
    const contact = await contactService.createContact(testUser.id, {
      name: 'Test Contact',
      email: 'contact@example.com',
      phone: '+1234567890',
    });
    console.log('Contact created for test user:', contact);

    const group = await groupService.createGroup(testUser.id, 'Test Group');
    console.log('Group created for test user:', group);

    // Check if user is a test user
    const isTest = await accountService.isTestUser(testUser.id);
    console.log('Is test user:', isTest); // true

    // Clean up test user when done
    await accountService.deleteUserAccount(testUser.id);
    console.log('Test user cleaned up');
  } catch (error) {
    console.error('Test user example failed:', error);
  }
}

/**
 * Example: Validate test user isolation
 */
async function testUserIsolationExample() {
  try {
    // Create a test user
    const testUser = await accountService.createTestUser('test@example.com');

    // Create some test data
    await contactService.createContact(testUser.id, {
      name: 'Test Contact 1',
      email: 'test1@example.com',
    });

    await contactService.createContact(testUser.id, {
      name: 'Test Contact 2',
      email: 'test2@example.com',
    });

    // Test users are isolated - their data doesn't affect production
    const isTest = await accountService.isTestUser(testUser.id);
    if (isTest) {
      console.log('This is a test user - data is isolated from production');
    }

    // Clean up
    await accountService.deleteUserAccount(testUser.id);
  } catch (error) {
    console.error('Test user isolation example failed:', error);
  }
}

/**
 * Example: Complete account deletion with verification
 */
async function completeAccountDeletionExample() {
  const userId = 'user-123';

  try {
    // Before deletion, you might want to:
    // 1. Send confirmation email
    // 2. Export user data (GDPR compliance)
    // 3. Log the deletion request

    // Delete the account
    await accountService.deleteUserAccount(userId);

    // After deletion:
    // - All contacts are deleted
    // - All groups are deleted
    // - All tags are deleted
    // - All interaction logs are deleted
    // - All suggestions are deleted
    // - All voice notes are deleted
    // - All calendar connections are deleted
    // - All preferences are deleted
    // - All OAuth tokens are deleted

    console.log('Account and all associated data deleted successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      console.log('User does not exist');
    } else {
      console.error('Failed to delete account:', error);
    }
  }
}

// Export examples
export {
  deleteAccountExample,
  testUserExample,
  testUserIsolationExample,
  completeAccountDeletionExample,
};
