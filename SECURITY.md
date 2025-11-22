# Security Implementation

This document describes the security features implemented in the CatchUp application.

## Overview

The CatchUp application implements comprehensive security measures including:
- Data encryption at rest
- HTTPS/TLS enforcement
- JWT-based authentication and authorization
- Audit logging for compliance
- Security headers and best practices

## 1. Data Encryption

### Encryption at Rest

Sensitive data is encrypted using AES-256-GCM (Galois/Counter Mode) before storage in the database.

**Encrypted Data:**
- OAuth tokens (access tokens, refresh tokens)
- Contact information (optional, can be extended)
- Custom notes (optional, can be extended)

**Implementation:**
- Location: `src/utils/encryption.ts`
- Algorithm: AES-256-GCM with authenticated encryption
- Key management: 256-bit encryption key stored in environment variable

**Setup:**
```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
ENCRYPTION_KEY=your_64_character_hex_key_here
```

### HTTPS/TLS

**Production Requirements:**
- All API communication must use HTTPS
- Database connections use SSL/TLS in production
- HTTP requests are automatically redirected to HTTPS

**Implementation:**
- HTTPS enforcement middleware: `src/api/middleware/security.ts`
- Database SSL configuration: `src/db/connection.ts`
- Automatic redirect in production environment

## 2. Authentication and Authorization

### JWT-Based Authentication

The application uses JSON Web Tokens (JWT) for stateless authentication.

**Token Structure:**
```json
{
  "userId": "uuid",
  "role": "user|admin|test_user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Setup:**
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env file
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

### User Roles

- **user**: Standard user with access to their own resources
- **admin**: Administrative access to all resources and audit logs
- **test_user**: Isolated test user for validation

### Authentication Middleware

**Location:** `src/api/middleware/auth.ts`

**Usage:**
```typescript
import { authenticate, authorize, UserRole } from './middleware/auth';

// Require authentication
router.use(authenticate);

// Require specific role
router.get('/admin', authorize(UserRole.ADMIN), handler);

// Optional authentication
router.get('/public', optionalAuthenticate, handler);
```

### Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum password length: 8 characters
- Failed login attempts are logged for security monitoring

## 3. Audit Logging

### Overview

All sensitive operations are logged for security and compliance purposes.

**Location:** `src/utils/audit-logger.ts`

### Logged Events

**Account Operations:**
- User registration
- User login (successful and failed)
- Password changes
- Account deletion

**OAuth Operations:**
- OAuth consent granted
- OAuth consent revoked
- OAuth token refreshed

**Data Operations:**
- Data exported
- Contact deleted
- Bulk contacts imported

**Security Events:**
- Failed login attempts
- Suspicious activity detected
- Rate limit exceeded

### Audit Log Structure

```typescript
{
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
```

### Accessing Audit Logs

**User Logs:**
```
GET /api/audit/me
Authorization: Bearer <token>
```

**Admin Logs:**
```
GET /api/audit/users/:userId
GET /api/audit/all
Authorization: Bearer <admin-token>
```

### Suspicious Activity Detection

The system automatically detects suspicious patterns:
- More than 5 failed login attempts in 1 hour
- Unusual access patterns (can be extended)

### Retention Policy

- Default retention: 90 days
- Cleanup function: `cleanupOldAuditLogs(retentionDays)`
- Run as scheduled job for automatic cleanup

## 4. Security Headers

### OWASP Recommended Headers

**Implementation:** `src/api/middleware/security.ts`

**Headers Set:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Strict-Transport-Security` - Enforces HTTPS (production only)
- `Content-Security-Policy` - Restricts resource loading
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts browser features

## 5. Database Security

### Connection Security

- SSL/TLS enforced in production
- Connection pooling with limits
- Prepared statements to prevent SQL injection

### Data Isolation

- All data is scoped to user ID
- Foreign key constraints with CASCADE delete
- Row-level security through application logic

### Migrations

Security-related migrations:
- `005_create_users_table.sql` - User authentication
- `006_create_audit_logs_table.sql` - Audit logging

## 6. API Security

### Rate Limiting

**Implementation:** `src/utils/rate-limiter.ts`

- Per-user rate limits
- Prevents abuse and DoS attacks
- Configurable limits per endpoint

### Input Validation

**Implementation:** `src/api/middleware/security.ts`

- Input sanitization to prevent injection
- UUID format validation
- Email and phone format validation

### CORS Configuration

- Configured in `src/api/server.ts`
- Restricts cross-origin requests
- Configurable allowed origins

## 7. Deployment Checklist

### Environment Variables

Ensure these are set in production:

```bash
# Required
ENCRYPTION_KEY=<64-char-hex>
JWT_SECRET=<secure-random-string>
DATABASE_PASSWORD=<strong-password>

# Recommended
NODE_ENV=production
JWT_EXPIRES_IN=7d
DATABASE_SSL=true
```

### Security Hardening

- [ ] Generate and set ENCRYPTION_KEY
- [ ] Generate and set JWT_SECRET
- [ ] Enable DATABASE_SSL in production
- [ ] Configure CORS allowed origins
- [ ] Set up HTTPS/TLS certificates
- [ ] Enable audit log retention policy
- [ ] Configure rate limiting thresholds
- [ ] Review and update security headers
- [ ] Set up monitoring for suspicious activity
- [ ] Configure backup encryption

### Monitoring

- Monitor audit logs for suspicious activity
- Set up alerts for failed login attempts
- Track rate limit violations
- Monitor OAuth token usage

## 8. Compliance

### GDPR Compliance

- Complete data export functionality (to be implemented)
- Account deletion with cascade
- Audit trail of data access
- User consent for OAuth integrations

### Data Retention

- Audit logs: 90 days default
- User data: Until account deletion
- OAuth tokens: Until revoked or expired

## 9. Security Best Practices

### For Developers

1. Never commit secrets to version control
2. Use environment variables for all credentials
3. Always use parameterized queries
4. Validate and sanitize all user input
5. Use the authentication middleware on protected routes
6. Log security-relevant events
7. Keep dependencies updated

### For Administrators

1. Regularly review audit logs
2. Monitor for suspicious activity
3. Rotate encryption keys periodically
4. Keep database backups encrypted
5. Use strong passwords for all accounts
6. Enable 2FA for admin accounts (to be implemented)
7. Regularly update security patches

## 10. Incident Response

### In Case of Security Breach

1. Immediately rotate all secrets (ENCRYPTION_KEY, JWT_SECRET)
2. Review audit logs for affected users
3. Notify affected users
4. Invalidate all active sessions
5. Investigate root cause
6. Implement additional security measures
7. Document incident and response

### Reporting Security Issues

Please report security vulnerabilities to: security@catchup.app

Do not disclose security issues publicly until they have been addressed.

## 11. Future Enhancements

Planned security improvements:
- [ ] Two-factor authentication (2FA)
- [ ] API key management for integrations
- [ ] Advanced anomaly detection
- [ ] Automated security scanning
- [ ] Penetration testing
- [ ] Security training for developers
- [ ] Bug bounty program
