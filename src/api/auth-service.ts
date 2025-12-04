/**
 * Authentication Service
 *
 * Handles user registration, login, and password management
 */

import bcrypt from 'bcrypt';
import pool from '../db/connection';
import { generateToken, UserRole } from './middleware/auth';
import { logAuditEvent, AuditAction } from '../utils/audit-logger';
import { GoogleUserInfo } from './google-sso-service';

const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  googleId?: string;
  authProvider?: 'email' | 'google' | 'both';
  name?: string;
  profilePictureUrl?: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
  google_id?: string | null;
  auth_provider?: string;
  name?: string | null;
  profile_picture_url?: string | null;
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
    googleId: userRow.google_id || undefined,
    authProvider: (userRow.auth_provider as 'email' | 'google' | 'both') || 'email',
    name: userRow.name || undefined,
    profilePictureUrl: userRow.profile_picture_url || undefined,
  };

  // Generate JWT token
  const token = generateToken(user.id, user.role);

  // Log audit event
  await logAuditEvent(AuditAction.USER_REGISTERED, {
    userId: user.id,
    metadata: { email: user.email, role: user.role, authProvider: user.authProvider },
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

  // Check if user has a password (not Google-only user)
  if (!userRow.password_hash) {
    throw new Error('This account uses Google Sign-In. Please sign in with Google.');
  }

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
    googleId: userRow.google_id || undefined,
    authProvider: (userRow.auth_provider as 'email' | 'google' | 'both') || 'email',
    name: userRow.name || undefined,
    profilePictureUrl: userRow.profile_picture_url || undefined,
  };

  // Generate JWT token
  const token = generateToken(user.id, user.role);

  // Log successful login
  await logAuditEvent(AuditAction.USER_LOGIN, {
    userId: user.id,
    metadata: { email: user.email, authProvider: user.authProvider },
    success: true,
  });

  return { user, token };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, email, role, created_at, updated_at, google_id, auth_provider, name, profile_picture_url 
     FROM users WHERE id = $1`,
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
    googleId: userRow.google_id || undefined,
    authProvider: (userRow.auth_provider as 'email' | 'google' | 'both') || 'email',
    name: userRow.name || undefined,
    profilePictureUrl: userRow.profile_picture_url || undefined,
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

  // Check if user has a password (not Google-only user)
  if (!userRow.password_hash) {
    throw new Error('This account uses Google Sign-In and does not have a password.');
  }

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

/**
 * Authenticate or create user via Google SSO
 * Handles both new user creation and existing user login
 */
export async function authenticateWithGoogle(
  googleUserInfo: GoogleUserInfo
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  const email = googleUserInfo.email.toLowerCase();
  const googleId = googleUserInfo.sub;

  // First, try to find user by google_id
  let result = await pool.query<UserRow>('SELECT * FROM users WHERE google_id = $1', [googleId]);

  if (result.rows.length > 0) {
    // Existing Google SSO user - log them in
    const userRow = result.rows[0];
    const user: User = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role as UserRole,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      googleId: userRow.google_id || undefined,
      authProvider: (userRow.auth_provider as 'email' | 'google' | 'both') || 'google',
      name: userRow.name || undefined,
      profilePictureUrl: userRow.profile_picture_url || undefined,
    };

    const token = generateToken(user.id, user.role);

    // Log successful login
    await logAuditEvent(AuditAction.USER_LOGIN, {
      userId: user.id,
      metadata: { email: user.email, authProvider: 'google', method: 'google_sso' },
      success: true,
    });

    return { user, token, isNewUser: false };
  }

  // Check if user exists with this email (account linking scenario)
  result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);

  if (result.rows.length > 0) {
    // User exists with this email - link Google account
    const userRow = result.rows[0];

    // Update user with Google information
    const updateResult = await pool.query<UserRow>(
      `UPDATE users 
       SET google_id = $1, 
           auth_provider = CASE 
             WHEN auth_provider = 'email' THEN 'both'
             ELSE auth_provider 
           END,
           name = COALESCE(name, $2),
           profile_picture_url = COALESCE(profile_picture_url, $3),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [googleId, googleUserInfo.name, googleUserInfo.picture, userRow.id]
    );

    const updatedUserRow = updateResult.rows[0];
    const user: User = {
      id: updatedUserRow.id,
      email: updatedUserRow.email,
      role: updatedUserRow.role as UserRole,
      createdAt: updatedUserRow.created_at,
      updatedAt: updatedUserRow.updated_at,
      googleId: updatedUserRow.google_id || undefined,
      authProvider: (updatedUserRow.auth_provider as 'email' | 'google' | 'both') || 'both',
      name: updatedUserRow.name || undefined,
      profilePictureUrl: updatedUserRow.profile_picture_url || undefined,
    };

    const token = generateToken(user.id, user.role);

    // Log account linking
    await logAuditEvent(AuditAction.USER_LOGIN, {
      userId: user.id,
      metadata: {
        email: user.email,
        authProvider: user.authProvider,
        method: 'google_sso',
        accountLinked: true,
      },
      success: true,
    });

    return { user, token, isNewUser: false };
  }

  // New user - create account with Google SSO
  const createResult = await pool.query<UserRow>(
    `INSERT INTO users (email, google_id, auth_provider, name, profile_picture_url, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [email, googleId, 'google', googleUserInfo.name, googleUserInfo.picture, UserRole.USER]
  );

  const newUserRow = createResult.rows[0];
  const newUser: User = {
    id: newUserRow.id,
    email: newUserRow.email,
    role: newUserRow.role as UserRole,
    createdAt: newUserRow.created_at,
    updatedAt: newUserRow.updated_at,
    googleId: newUserRow.google_id || undefined,
    authProvider: 'google',
    name: newUserRow.name || undefined,
    profilePictureUrl: newUserRow.profile_picture_url || undefined,
  };

  const token = generateToken(newUser.id, newUser.role);

  // Log new user registration
  await logAuditEvent(AuditAction.USER_REGISTERED, {
    userId: newUser.id,
    metadata: {
      email: newUser.email,
      role: newUser.role,
      authProvider: 'google',
      method: 'google_sso',
    },
    success: true,
  });

  return { user: newUser, token, isNewUser: true };
}

/**
 * Link Google account to existing user
 * Used when a user wants to add Google SSO to their existing email/password account
 */
export async function linkGoogleAccount(
  userId: string,
  googleUserId: string,
  email: string
): Promise<void> {
  // Verify the email matches
  const userResult = await pool.query<UserRow>('SELECT email FROM users WHERE id = $1', [userId]);

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  if (userResult.rows[0].email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Email does not match user account');
  }

  // Check if Google ID is already linked to another account
  const googleResult = await pool.query<UserRow>(
    'SELECT id FROM users WHERE google_id = $1 AND id != $2',
    [googleUserId, userId]
  );

  if (googleResult.rows.length > 0) {
    throw new Error('This Google account is already linked to another user');
  }

  // Link Google account
  await pool.query(
    `UPDATE users 
     SET google_id = $1,
         auth_provider = CASE 
           WHEN auth_provider = 'email' THEN 'both'
           ELSE auth_provider
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [googleUserId, userId]
  );

  // Log account linking
  await logAuditEvent(AuditAction.OAUTH_CONSENT_GRANTED, {
    userId,
    metadata: { provider: 'google', action: 'account_linked' },
    success: true,
  });
}

/**
 * Check if user has Google SSO enabled
 */
export async function hasGoogleSSO(userId: string): Promise<boolean> {
  const result = await pool.query<{ google_id: string | null }>(
    'SELECT google_id FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].google_id !== null;
}
