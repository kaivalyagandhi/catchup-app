# Authentication Statistics - Quick Reference

## Quick Start

### Get Your Statistics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/auth/statistics
```

### Get Statistics for Last 7 Days
```bash
START=$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/auth/statistics?startDate=$START&endDate=$END"
```

### Get Global Statistics (Admin Only)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/api/auth/statistics/global
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalAuthentications` | number | Total auth attempts (successful + failed) |
| `googleSSOAuthentications` | number | Total Google SSO attempts |
| `emailPasswordAuthentications` | number | Total email/password attempts |
| `googleSSOPercentage` | number | Percentage of Google SSO (0-100) |
| `emailPasswordPercentage` | number | Percentage of email/password (0-100) |
| `timeRange.start` | string | Start of query range (ISO 8601) |
| `timeRange.end` | string | End of query range (ISO 8601) |
| `breakdown.successful.googleSSO` | number | Successful Google SSO logins |
| `breakdown.successful.emailPassword` | number | Successful email/password logins |
| `breakdown.failed.googleSSO` | number | Failed Google SSO attempts |
| `breakdown.failed.emailPassword` | number | Failed email/password attempts |

## Common Use Cases

### Calculate Success Rate
```javascript
const successRate = (successful / total) * 100;
// Example: (115 / 120) * 100 = 95.83%
```

### Compare Methods
```javascript
if (googleSSOPercentage > emailPasswordPercentage) {
  console.log('Google SSO is more popular');
}
```

### Monitor Failed Attempts
```javascript
if (breakdown.failed.googleSSO > 10) {
  console.log('High number of failed Google SSO attempts');
}
```

## Access Control

| Role | Own Stats | Other User Stats | Global Stats |
|------|-----------|------------------|--------------|
| User | ✅ Yes | ❌ No | ❌ No |
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions (not admin) |
| 500 | Internal Error | Server error fetching statistics |

## Query Parameters

### startDate & endDate
- Format: ISO 8601 (e.g., `2025-01-01T00:00:00Z`)
- Default: Last 30 days
- Both optional

### userId (Admin Only)
- Format: UUID string
- Filter statistics for specific user
- Requires admin role

## TypeScript Interface

```typescript
interface AuthStatistics {
  totalAuthentications: number;
  googleSSOAuthentications: number;
  emailPasswordAuthentications: number;
  googleSSOPercentage: number;
  emailPasswordPercentage: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  breakdown: {
    successful: {
      googleSSO: number;
      emailPassword: number;
    };
    failed: {
      googleSSO: number;
      emailPassword: number;
    };
  };
}
```

## JavaScript Example

```javascript
async function getAuthStats(token) {
  const response = await fetch('http://localhost:3000/api/auth/statistics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return await response.json();
}

// Usage
const stats = await getAuthStats(userToken);
console.log(`Google SSO: ${stats.googleSSOPercentage}%`);
console.log(`Email/Password: ${stats.emailPasswordPercentage}%`);
```

## Testing

Run tests:
```bash
npm test -- src/api/routes/auth-statistics.test.ts
```

## Related Files

- Implementation: `src/api/routes/auth-statistics.ts`
- Tests: `src/api/routes/auth-statistics.test.ts`
- Examples: `src/api/routes/auth-statistics-example.ts`
- Full Docs: `src/api/routes/AUTH_STATISTICS_README.md`
- API Docs: `docs/API.md`

## Tips

1. **Default Time Range**: Statistics default to last 30 days to prevent expensive queries
2. **UTC Timestamps**: All dates are in UTC, convert to local timezone for display
3. **Caching**: Consider caching frequently accessed statistics
4. **Audit Logs**: Statistics are based on audit logs (90-day retention by default)
5. **Zero Handling**: API gracefully handles users with no authentication history

## Support

For issues or questions:
- Check full documentation: `src/api/routes/AUTH_STATISTICS_README.md`
- Review examples: `src/api/routes/auth-statistics-example.ts`
- Run tests to verify functionality
