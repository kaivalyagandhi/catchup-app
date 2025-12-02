# Authentication Statistics API

## Overview

The Authentication Statistics API provides insights into authentication method usage across the CatchUp application. It tracks and reports on Google SSO vs email/password authentication patterns, helping administrators monitor authentication trends and user preferences.

**Requirements**: 7.3

## Features

- Track authentication attempts by method (Google SSO vs email/password)
- Separate successful and failed authentication counts
- Calculate usage percentages
- Support custom date ranges
- User-specific and global statistics
- Admin-only access for global statistics

## API Endpoints

### GET /api/auth/statistics

Get authentication statistics for the authenticated user.

**Authentication**: Required (JWT token)

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (defaults to 30 days ago)
- `endDate` (optional): ISO 8601 date string (defaults to now)
- `userId` (optional): Filter by specific user (admin only)

**Response**:
```json
{
  "totalAuthentications": 150,
  "googleSSOAuthentications": 120,
  "emailPasswordAuthentications": 30,
  "googleSSOPercentage": 80.0,
  "emailPasswordPercentage": 20.0,
  "timeRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.999Z"
  },
  "breakdown": {
    "successful": {
      "googleSSO": 115,
      "emailPassword": 28
    },
    "failed": {
      "googleSSO": 5,
      "emailPassword": 2
    }
  }
}
```

**Example Usage**:
```bash
# Get statistics for current user (last 30 days)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/auth/statistics

# Get statistics for custom date range
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/auth/statistics?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z"

# Admin: Get statistics for specific user
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  "http://localhost:3000/api/auth/statistics?userId=user-id-here"
```

### GET /api/auth/statistics/global

Get global authentication statistics across all users (admin only).

**Authentication**: Required (JWT token with admin role)

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string (defaults to 30 days ago)
- `endDate` (optional): ISO 8601 date string (defaults to now)

**Response**: Same format as `/api/auth/statistics`

**Example Usage**:
```bash
# Get global statistics (admin only)
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3000/api/auth/statistics/global

# Get global statistics for custom date range
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  "http://localhost:3000/api/auth/statistics/global?startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z"
```

## Response Fields

### Top-Level Fields

- `totalAuthentications`: Total number of authentication attempts (successful + failed)
- `googleSSOAuthentications`: Total Google SSO attempts (successful + failed)
- `emailPasswordAuthentications`: Total email/password attempts (successful + failed)
- `googleSSOPercentage`: Percentage of Google SSO attempts (0-100, rounded to 2 decimal places)
- `emailPasswordPercentage`: Percentage of email/password attempts (0-100, rounded to 2 decimal places)
- `timeRange`: Object containing start and end dates of the query range
- `breakdown`: Detailed breakdown of successful and failed attempts

### Breakdown Object

- `successful.googleSSO`: Number of successful Google SSO authentications
- `successful.emailPassword`: Number of successful email/password authentications
- `failed.googleSSO`: Number of failed Google SSO attempts
- `failed.emailPassword`: Number of failed email/password attempts

## Data Source

Statistics are derived from the `audit_logs` table, which tracks:
- `user_login` actions (successful authentications)
- `user_registered` actions (new user registrations)
- `failed_login_attempt` actions (failed authentication attempts)

The authentication method is determined from the `metadata` field:
- `metadata.authProvider = 'google'` or `metadata.method = 'google_sso'` → Google SSO
- `metadata.authProvider = 'email'` or no method specified → Email/Password

## Access Control

### User Access
- Users can view their own authentication statistics
- Users cannot view other users' statistics (403 Forbidden)

### Admin Access
- Admins can view any user's statistics using the `userId` query parameter
- Admins can view global statistics via `/api/auth/statistics/global`

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Admin access required"
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "STATISTICS_ERROR",
    "message": "Failed to retrieve authentication statistics",
    "details": "Error details (development only)"
  }
}
```

## Use Cases

### Monitor Authentication Method Adoption
Track the percentage of users using Google SSO vs email/password authentication to measure adoption of the new authentication method.

### Identify Authentication Issues
Monitor failed authentication attempts to identify potential issues with either authentication method.

### User Behavior Analysis
Analyze individual user authentication patterns to understand login frequency and preferred methods.

### Security Monitoring
Track failed authentication attempts as part of security monitoring and anomaly detection.

## Implementation Notes

### Performance Considerations
- Statistics queries use indexed columns (`user_id`, `action`, `created_at`) for efficient filtering
- Default time range is limited to 30 days to prevent expensive queries
- Consider adding caching for frequently accessed statistics

### Data Retention
- Statistics are based on audit logs, which have a configurable retention policy (default 90 days)
- Historical statistics beyond the retention period will not be available

### Timezone Handling
- All timestamps are stored and returned in UTC
- Client applications should convert to local timezone for display

## Testing

The implementation includes comprehensive tests covering:
- User authentication statistics retrieval
- Admin global statistics retrieval
- Custom date range filtering
- Access control (user vs admin)
- Correct counting of Google SSO vs email/password
- Percentage calculations
- Zero authentication handling

Run tests:
```bash
npm test -- src/api/routes/auth-statistics.test.ts
```

## Future Enhancements

Potential improvements for future versions:
- Caching layer for frequently accessed statistics
- Aggregated daily/weekly/monthly statistics
- Trend analysis and visualization data
- Export statistics to CSV/JSON
- Real-time statistics updates via WebSocket
- Breakdown by device type or location
- Success rate trends over time
