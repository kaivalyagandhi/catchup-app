---
inclusion: manual
---

# CatchUp API Reference

Base URL: `http://localhost:3000` (dev) | Production: Cloud Run
Auth: `Authorization: Bearer <jwt_token>` on all `/api/*` routes

## Route Mounts (from server.ts)

| Mount | Router | Description |
|-------|--------|-------------|
| `/api/auth` | auth | Register, login, logout, me |
| `/api/auth/google` | google-sso | Google SSO OAuth flow |
| `/api/auth/statistics` | auth-statistics | Auth metrics |
| `/api/audit` | audit | Audit log access |
| `/api/contacts` | contacts, contacts-archive | CRUD, tags, archive |
| `/api/groups-tags` | groups-tags | Groups and tags CRUD |
| `/api/suggestions` | suggestions | Catchup suggestions |
| `/api/calendar/oauth` | google-calendar-oauth | Calendar OAuth flow |
| `/api/calendar` | calendar-api, calendar | Events, free slots, feeds |
| `/api/contacts/oauth` | google-contacts-oauth | Contacts OAuth flow |
| `/api/contacts/sync` | google-contacts-sync | Full/incremental sync |
| `/api/voice-notes` | voice-notes | Upload, list, delete voice notes |
| `/api/enrichment-items` | enrichment-items | AI enrichment review/apply |
| `/api/edits` | edits | Pending edits review/apply |
| `/api/preferences` | preferences | User + notification prefs |
| `/api/account` | account | Account info, update, delete |
| `/api/onboarding` | onboarding | Init, state, progress, complete |
| `/api/circles` | circles | Circle assignment (inner/close/active/casual) |
| `/api/ai` | ai-suggestions, ai-quick-start, ai-batch | AI suggestion endpoints |
| `/api/gamification` | gamification | Achievements, streaks |
| `/api/weekly-catchup` | weekly-catchup | Weekly catchup plans |
| `/api/privacy` | privacy | Privacy settings |
| `/api/user/phone-number` | phone-number | Phone number management |
| `/api/sms/webhook` | sms-webhook | Twilio inbound webhook |
| `/api/sms/monitoring` | sms-monitoring | SMS metrics |
| `/api/sms/performance` | sms-performance | SMS performance stats |
| `/api/scheduling` | scheduling, availability, preferences, notifications | Group scheduling |
| `/api/webhooks` | calendar-webhooks | Google Calendar push notifications |
| `/api/sync` | manual-sync, sync-status | Manual sync trigger, status |
| `/api/admin` | admin-sync-health, job-monitoring | Admin dashboard APIs |
| `/api/jobs` | jobs-handler | Cloud Tasks job receiver (OIDC auth) |
| `/api/test-data` | test-data | Dev/test seed data |

## WebSocket
- `ws://localhost:3000/ws/voice-notes` — real-time voice transcription, requires JWT as query param

## Rate Limits
- General API: 60 req/min per user
- Voice uploads: 10 req/hr per user
- SMS: 10 req/hr per user

## Error Format
```json
{ "error": "Error type", "message": "Human-readable message", "details": {} }
```

## Response Codes
200 Success, 201 Created, 400 Validation, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Rate Limited, 500 Server Error
