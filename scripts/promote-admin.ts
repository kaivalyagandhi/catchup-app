#!/usr/bin/env ts-node
/**
 * Admin Promotion CLI Script
 *
 * Manages admin role for users
 *
 * Usage:
 *   npm run promote-admin -- promote user@example.com
 *   npm run promote-admin -- revoke user@example.com
 *   npm run promote-admin -- list
 */

import pool from '../src/db/connection';
import { logAuditEvent, AuditAction } from '../src/utils/audit-logger';

interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  admin_promoted_at: Date | null;
  admin_promoted_by: string | null;
}

/**
 * Promote a user to admin
 */
async function promoteUser(email: string, promotedBy: string = 'cli-script'): Promise<void> {
  try {
    // Check if user exists
    const userResult = await pool.query<User>(
      'SELECT id, email, name, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: User with email "${email}" not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];

    if (user.is_admin) {
      console.log(`ℹ️  User "${email}" is already an admin`);
      return;
    }

    // Promote user to admin
    await pool.query(
      `UPDATE users 
       SET is_admin = true, 
           admin_promoted_at = NOW(), 
           admin_promoted_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [promotedBy, user.id]
    );

    // Log audit event
    await logAuditEvent(AuditAction.ADMIN_ACCESS, {
      userId: user.id,
      resourceType: 'admin_role',
      resourceId: user.id,
      metadata: {
        action: 'promote',
        email,
        promotedBy,
      },
      success: true,
    });

    console.log(`✅ Successfully promoted "${email}" to admin`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Promoted by: ${promotedBy}`);
  } catch (error) {
    console.error('❌ Error promoting user:', error);
    process.exit(1);
  }
}

/**
 * Revoke admin access from a user
 */
async function revokeUser(email: string, revokedBy: string = 'cli-script'): Promise<void> {
  try {
    // Check if user exists
    const userResult = await pool.query<User>(
      'SELECT id, email, name, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: User with email "${email}" not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];

    if (!user.is_admin) {
      console.log(`ℹ️  User "${email}" is not an admin`);
      return;
    }

    // Revoke admin access
    await pool.query(
      `UPDATE users 
       SET is_admin = false, 
           admin_promoted_at = NULL, 
           admin_promoted_by = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Log audit event
    await logAuditEvent(AuditAction.ADMIN_ACCESS, {
      userId: user.id,
      resourceType: 'admin_role',
      resourceId: user.id,
      metadata: {
        action: 'revoke',
        email,
        revokedBy,
      },
      success: true,
    });

    console.log(`✅ Successfully revoked admin access from "${email}"`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Revoked by: ${revokedBy}`);
  } catch (error) {
    console.error('❌ Error revoking admin access:', error);
    process.exit(1);
  }
}

/**
 * List all admin users
 */
async function listAdmins(): Promise<void> {
  try {
    const result = await pool.query<User>(
      `SELECT id, email, name, is_admin, admin_promoted_at, admin_promoted_by 
       FROM users 
       WHERE is_admin = true 
       ORDER BY admin_promoted_at DESC`
    );

    if (result.rows.length === 0) {
      console.log('ℹ️  No admin users found');
      return;
    }

    console.log(`\n📋 Admin Users (${result.rows.length}):\n`);
    console.log('─'.repeat(80));

    for (const user of result.rows) {
      console.log(`Email:        ${user.email}`);
      console.log(`Name:         ${user.name || 'N/A'}`);
      console.log(`User ID:      ${user.id}`);
      console.log(`Promoted At:  ${user.admin_promoted_at ? user.admin_promoted_at.toISOString() : 'N/A'}`);
      console.log(`Promoted By:  ${user.admin_promoted_by || 'N/A'}`);
      console.log('─'.repeat(80));
    }

    console.log();
  } catch (error) {
    console.error('❌ Error listing admin users:', error);
    process.exit(1);
  }
}

/**
 * Display usage information
 */
function displayUsage(): void {
  console.log(`
Admin Promotion CLI Script

Usage:
  npm run promote-admin -- <command> [arguments]

Commands:
  promote <email>     Promote a user to admin by email
  revoke <email>      Revoke admin access from a user by email
  list                List all admin users

Examples:
  npm run promote-admin -- promote user@example.com
  npm run promote-admin -- revoke user@example.com
  npm run promote-admin -- list

Options:
  --help, -h          Display this help message
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayUsage();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'promote':
        if (args.length < 2) {
          console.error('❌ Error: Email address required');
          console.log('Usage: npm run promote-admin -- promote user@example.com');
          process.exit(1);
        }
        await promoteUser(args[1]);
        break;

      case 'revoke':
        if (args.length < 2) {
          console.error('❌ Error: Email address required');
          console.log('Usage: npm run promote-admin -- revoke user@example.com');
          process.exit(1);
        }
        await revokeUser(args[1]);
        break;

      case 'list':
        await listAdmins();
        break;

      default:
        console.error(`❌ Error: Unknown command "${command}"`);
        displayUsage();
        process.exit(1);
    }

    // Close database connection
    await pool.end();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run main function
main();
