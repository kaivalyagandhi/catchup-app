/**
 * Audit Logger
 *
 * Logs sensitive operations for security and compliance
 */

import pool from '../db/connection';

export enum AuditAction {
  // Account operations
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_DELETED = 'account_deleted',
  
  // OAuth operations
  OAUTH_CONSENT_GRANTED = 'oauth_consent_granted',
  OAUTH_CONSENT_REVOKED = 'oauth_consent_revoked',
  OAUTH_TOKEN_REFRESHED = 'oauth_token_refreshed',
  
  // Data operations
  DATA_EXPORTED = 'data_exported',
  CONTACT_DELETED = 'contact_deleted',
  BULK_CONTACTS_IMPORTED = 'bulk_contacts_imported',
  
  // Security events
  FAILED_LOGIN_ATTEMPT = 'failed_login_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Admin operations
  ADMIN_ACCESS = 'admin_access',
  TEST_USER_CREATED = 'test_user_created'
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  options: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        ip_address, user_agent, metadata, success, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        options.userId || null,
        action,
        options.resourceType || null,
        options.resourceId || null,
        options.ipAddress || null,
        options.userAgent || null,
        options.metadata ? JSON.stringify(options.metadata) : null,
        options.success !== false, // Default to true
        options.errorMessage || null
      ]
    );
  } catch (error) {
    // Don't throw errors from audit logging - log to console instead
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    actions?: AuditAction[];
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<AuditLogEntry[]> {
  const { limit = 100, offset = 0, actions, startDate, endDate } = options;
  
  let query = 'SELECT * FROM audit_logs WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (actions && actions.length > 0) {
    query += ` AND action = ANY($${paramIndex})`;
    params.push(actions);
    paramIndex++;
  }
  
  if (startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query<AuditLogRow>(query, params);
  
  return result.rows.map(rowToAuditLogEntry);
}

/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(
  options: {
    limit?: number;
    offset?: number;
    actions?: AuditAction[];
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<AuditLogEntry[]> {
  const { limit = 100, offset = 0, actions, startDate, endDate } = options;
  
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (actions && actions.length > 0) {
    query += ` AND action = ANY($${paramIndex})`;
    params.push(actions);
    paramIndex++;
  }
  
  if (startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }
  
  if (endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query<AuditLogRow>(query, params);
  
  return result.rows.map(rowToAuditLogEntry);
}

/**
 * Detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(userId: string): Promise<boolean> {
  // Check for multiple failed login attempts in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs 
     WHERE user_id = $1 
     AND action = $2 
     AND success = false 
     AND created_at >= $3`,
    [userId, AuditAction.FAILED_LOGIN_ATTEMPT, oneHourAgo]
  );
  
  const failedAttempts = parseInt(result.rows[0].count, 10);
  
  // Flag as suspicious if more than 5 failed attempts in an hour
  if (failedAttempts > 5) {
    await logAuditEvent(AuditAction.SUSPICIOUS_ACTIVITY, {
      userId,
      metadata: { failedAttempts, timeWindow: '1 hour' },
      success: true
    });
    return true;
  }
  
  return false;
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const result = await pool.query(
    'DELETE FROM audit_logs WHERE created_at < $1',
    [cutoffDate]
  );
  
  return result.rowCount || 0;
}

function rowToAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    action: row.action as AuditAction,
    resourceType: row.resource_type || undefined,
    resourceId: row.resource_id || undefined,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    metadata: row.metadata || undefined,
    success: row.success,
    errorMessage: row.error_message || undefined,
    timestamp: row.created_at
  };
}
