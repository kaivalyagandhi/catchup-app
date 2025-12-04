---
inclusion: manual
---

# CatchUp Features Overview

Quick reference for major features and their documentation locations.

## Core Features

### 1. Directory Page
**Location**: `docs/features/directory-page/`

Unified contact management interface with:
- Contacts table with inline editing
- Groups and tags management
- Search and filtering
- Sorting capabilities
- Circle visualization (Dunbar's number)
- Mobile-responsive design

**Key Files**:
- Quick Start: `docs/features/directory-page/DIRECTORY_PAGE_QUICK_START.md`
- Search: `docs/features/directory-page/SEARCH_FILTER_BAR_USAGE_GUIDE.md`
- Circles: `docs/features/directory-page/CIRCLES_TAB_USAGE_GUIDE.md`

**Frontend**:
- Main: `public/index.html`
- JS: `public/js/contacts-table.js`, `public/js/groups-table.js`, `public/js/tags-table.js`
- CSS: `public/css/contacts-table.css`, `public/css/groups-table.css`, `public/css/tags-table.css`

### 2. Google Integrations
**Location**: `docs/features/google-integrations/`

**Google SSO**:
- Single sign-on authentication
- User guides: `docs/GOOGLE_SSO_USER_GUIDE.md`
- Setup: `docs/GOOGLE_SSO_SETUP_GUIDE.md`
- Routes: `src/api/routes/google-sso.ts`

**Google Calendar**:
- OAuth integration for calendar access
- Event caching for availability detection
- Setup guide in steering: `.kiro/steering/google-calendar-setup.md`
- Routes: `src/api/routes/google-calendar-oauth.ts`, `src/api/routes/calendar-api.ts`

**Google Contacts**:
- Read-only sync with Google Contacts
- Group mapping with user approval
- Member exclusion support
- Routes: `src/api/routes/google-contacts-sync.ts`
- Service: `src/integrations/group-sync-service.ts`

### 3. Enrichment & Edits System
**Location**: `docs/features/enrichment/`

**Pending Edits**:
- Review-before-apply workflow for contact changes
- Deduplication to prevent duplicate edits
- Batch apply functionality
- Routes: `src/api/routes/edits.ts`
- Service: `src/edits/edit-service.ts`

**Enrichment Items**:
- AI-generated contact information from voice notes
- Contact disambiguation
- Tag suggestions
- Routes: `src/api/routes/enrichment-items.ts`

**Key Concepts**:
- Edits are user-created pending changes
- Enrichments are AI-suggested changes from voice notes
- Both use review workflow before applying to contacts

### 4. Voice Notes
**Location**: `docs/features/voice-notes/`

**Features**:
- Real-time audio transcription (Google Cloud Speech-to-Text)
- Entity extraction (Google Gemini)
- Contact disambiguation
- Tag generation
- WebSocket for real-time updates

**Documentation**:
- Setup: `docs/VOICE_NOTES_SETUP.md`
- User Guide: `docs/VOICE_NOTES_USER_GUIDE.md`
- History: `docs/features/voice-notes/VOICE_NOTES_HISTORY_UI_GUIDE.md`

**Backend**:
- Routes: `src/api/routes/voice-notes.ts`
- Service: `src/voice/voice-note-service.ts`
- WebSocket: `src/api/websocket-handler.ts`

### 5. SMS/MMS Enrichment
**Location**: `docs/features/sms-mms/`

**Features**:
- Twilio webhook integration
- SMS/MMS message processing
- Media download and storage
- AI-powered enrichment from messages
- Rate limiting and performance optimization

**Documentation**:
- Setup: `docs/TWILIO_SMS_MMS_SETUP.md`
- User Guide: `docs/SMS_MMS_ENRICHMENT_USER_GUIDE.md`
- Quick Start: `docs/features/sms-mms/TWILIO_QUICK_START.md`

**Backend**:
- Webhook: `src/api/routes/sms-webhook.ts`
- Service: `src/sms/sms-enrichment-service.ts`

### 6. Contact Onboarding
**Location**: `docs/features/onboarding/`

**Features**:
- Guided contact import process
- Circle assignment (Dunbar's number)
- Bulk contact creation
- Friend circle research-based design

**Documentation**:
- User Guide: `docs/CONTACT_ONBOARDING_USER_GUIDE.md`
- Quick Reference: `docs/CONTACT_ONBOARDING_QUICK_REFERENCE.md`
- Research: `docs/features/onboarding/ONBOARDING_FRIEND_CIRCLES_RESEARCH.md`

**Backend**:
- Routes: `src/api/routes/onboarding.ts`
- Service: `src/onboarding/onboarding-service.ts`

## Architecture Patterns

### Frontend
- Vanilla JavaScript (no framework)
- Modular JS files per feature
- Event delegation for dynamic content
- WebSocket for real-time updates
- Mobile-first responsive design

### Backend
- Express.js REST API
- TypeScript for type safety
- Repository pattern for data access
- Service layer for business logic
- Bull for job queues (Redis)
- PostgreSQL for data storage

### AI/ML Integration
- Google Cloud Speech-to-Text for transcription
- Google Gemini for entity extraction and NLP
- Custom matching algorithms for suggestions
- Structured JSON output with responseSchema

## Database Schema

Key tables:
- `users` - User accounts
- `contacts` - Contact information
- `groups` - Contact groups
- `tags` - Contact tags (user-specific)
- `voice_notes` - Voice recordings and transcriptions
- `enrichment_items` - AI-suggested changes
- `pending_edits` - User-created pending changes
- `google_contact_groups` - Google Contacts group mappings
- `oauth_tokens` - OAuth credentials (encrypted)

See: `.kiro/steering/database-setup.md` for full schema

## Testing

- Manual testing guides: `docs/testing/`
- UI testing: `docs/testing/UI_TESTING_GUIDE.md`
- Visual testing: `docs/testing/VISUAL_TESTING_STEPS.md`
- Test HTML files in root for feature verification

## Development Workflow

1. Check feature docs in `docs/features/<feature>/`
2. Review API endpoints in `docs/API.md` or `.kiro/steering/api-reference.md`
3. Check database schema in `.kiro/steering/database-setup.md`
4. Implement following project structure in `.kiro/steering/structure.md`
5. Test using guides in `docs/testing/`

## Finding Documentation

Use `docs/INDEX.md` for comprehensive navigation of all documentation.
