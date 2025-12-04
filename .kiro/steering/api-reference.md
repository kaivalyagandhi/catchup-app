---
inclusion: manual
---

# CatchUp API Quick Reference

Quick reference for CatchUp API endpoints. Full documentation: `docs/API.md`

## Base URL
- Development: `http://localhost:3000`
- Production: `https://api.catchup.app`

## Authentication
All authenticated endpoints require JWT token:
```
Authorization: Bearer <jwt_token>
```

## Key Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/google` - Google SSO login

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/:id/tags` - Add tags to contact
- `DELETE /api/contacts/:id/tags/:tagId` - Remove tag from contact

### Groups & Tags
- `GET /api/groups-tags/groups` - List all groups
- `POST /api/groups-tags/groups` - Create group
- `PUT /api/groups-tags/groups/:id` - Update group
- `DELETE /api/groups-tags/groups/:id` - Delete group
- `GET /api/groups-tags/tags` - List all tags
- `POST /api/groups-tags/tags` - Create tag
- `PUT /api/groups-tags/tags/:id` - Update tag
- `DELETE /api/groups-tags/tags/:id` - Delete tag

### Google Integrations
- `GET /api/calendar/oauth/authorize` - Get Google Calendar auth URL
- `GET /api/calendar/oauth/callback` - Handle OAuth callback
- `GET /api/calendar/oauth/status` - Check connection status
- `DELETE /api/calendar/oauth/disconnect` - Disconnect calendar
- `GET /api/calendar/api/events` - Get calendar events
- `GET /api/contacts/oauth/authorize` - Get Google Contacts auth URL
- `POST /api/contacts/sync/full` - Full contacts sync
- `POST /api/contacts/sync/incremental` - Incremental sync

### Voice Notes & Enrichment
- `POST /api/voice-notes` - Upload voice note
- `GET /api/voice-notes` - List voice notes
- `GET /api/voice-notes/:id` - Get voice note details
- `DELETE /api/voice-notes/:id` - Delete voice note
- `GET /api/enrichment-items` - List enrichment items
- `POST /api/enrichment-items/:id/apply` - Apply enrichment
- `DELETE /api/enrichment-items/:id` - Reject enrichment

### Edits (Pending Changes)
- `GET /api/edits` - List pending edits
- `POST /api/edits` - Create pending edit
- `POST /api/edits/:id/apply` - Apply edit to contact
- `DELETE /api/edits/:id` - Delete pending edit
- `POST /api/edits/apply-all` - Apply all pending edits

### Suggestions
- `GET /api/suggestions` - Get catchup suggestions
- `POST /api/suggestions/:id/dismiss` - Dismiss suggestion
- `POST /api/suggestions/:id/complete` - Mark suggestion complete

### Preferences
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update preferences
- `GET /api/preferences/notification` - Get notification preferences
- `PUT /api/preferences/notification` - Update notification preferences

### Account
- `GET /api/account` - Get account info
- `PUT /api/account` - Update account
- `DELETE /api/account` - Delete account

## Rate Limits
- General API: 60 requests/minute per user
- Voice uploads: 10 requests/hour per user
- SMS: 10 requests/hour per user
- Google Calendar: 10 requests/minute per user

## Common Response Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Error Response Format
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {} // Optional additional context
}
```

## Testing
- Test mode available via `TEST_MODE=true` environment variable
- Test endpoints prefixed with `/api/test-data/`
- Seed data generation available for development

## WebSocket
- Voice notes: `ws://localhost:3000/ws/voice-notes`
- Real-time enrichment updates
- Connection requires JWT token as query parameter
