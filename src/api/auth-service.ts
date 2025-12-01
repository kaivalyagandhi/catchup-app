/**
 * Authentication Service
 *
 * Handles user registration, login, and password management
 */

import bcrypt from 'bcrypt';
import pool from '../db/connection';
import { generateToken, UserRole } from './middleware/auth';
import { logAuditEvent, AuditAction } from '../utils/audit-logger';

const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  role: UserRole = UserRole.USER
): Promise<{ user: User; token: string }> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check if user already exists
  const existingUser = await pool.query<UserRow>('SELECT id FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role, created_at, updated_at`,
    [email.toLowerCase(), passwordHash, role]
  );

  const userRow = result.rows[0];
  const user: User = {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role as UserRole,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  // Generate JWT token
  const token = generateToken(user.id, user.role);

  // Log audit event
  await logAuditEvent(AuditAction.USER_REGISTERED, {
    userId: user.id,
    metadata: { email: user.email, role: user.role },
    success: true,
  });

  return { user, token };
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  // Find user by email
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const userRow = result.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, userRow.password_hash);

  if (!isValidPassword) {
    // Log failed login attempt
    await logAuditEvent(AuditAction.FAILED_LOGIN_ATTEMPT, {
      userId: userRow.id,
      metadata: { email },
      success: false,
      errorMessage: 'Invalid password',
    });
    throw new Error('Invalid email or password');
  }

  const user: User = {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role as UserRole,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };

  // Generate JWT token
  const token = generateToken(user.id, user.role);

  // Log successful login
  await logAuditEvent(AuditAction.USER_LOGIN, {
    userId: user.id,
    metadata: { email: user.email },
    success: true,
  });

  return { user, token };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query<UserRow>(
    'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const userRow = result.rows[0];
  return {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role as UserRole,
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
  };
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Validate new password strength
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Get current password hash
  const result = await pool.query<UserRow>('SELECT password_hash FROM users WHERE id = $1', [
    userId,
  ]);

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const userRow = result.rows[0];

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, userRow.password_hash);

  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, userId]
  );

  // Log password change
  await logAuditEvent(AuditAction.PASSWORD_CHANGED, {
    userId,
    success: true,
  });
}

/**
 * Create test user
 */
export async function createTestUser(email: string): Promise<{ user: User; token: string }> {
  const result = await registerUser(email, 'test_password_' + Math.random(), UserRole.TEST_USER);

  // Log test user creation
  await logAuditEvent(AuditAction.TEST_USER_CREATED, {
    userId: result.user.id,
    metadata: { email },
    success: true,
  });

  return result;
}
