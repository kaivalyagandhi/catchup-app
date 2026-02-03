# Documentation Location Guide

All project documentation has been organized into `docs/` folder.

## Quick Navigation

### Main Index
**Complete documentation index**: `docs/INDEX.md`

### By Category

**Features**: `docs/features/`
- `directory-page/` - Contact management UI
- `google-integrations/` - Google SSO, Calendar, Contacts
- `enrichment/` - Pending edits and AI enrichment
- `voice-notes/` - Voice transcription and processing
- `onboarding/` - Contact onboarding flow
- `sms-mms/` - SMS/MMS enrichment via Twilio
- `scheduling/` - Group scheduling and availability coordination

**Testing**: `docs/testing/`
- Testing guides, checklists, verification procedures
- Also see `tests/html/` for manual HTML test files

**Development**: `docs/development/`
- Quick starts, implementation guides, bug fixes
- `UNIMPLEMENTED_FEATURES.md` - Tracked TODOs and future work

**Examples**: `docs/examples/`
- `backend/` - TypeScript example code for backend services
- `frontend/` - JavaScript example code for frontend components
- Reference implementations and usage patterns

**Testing**: `tests/html/`
- Manual test HTML files for UI components and features
- `dashboards/` - Monitoring and debugging dashboards
- See `tests/html/README.md` for testing guide

**Archive**: `docs/archive/`
- Historical task summaries and checkpoints

### By Document Type

**User Guides**: `*_USER_GUIDE.md`
**API Docs**: `*_API.md` or `docs/API.md`
**Setup Guides**: `*_SETUP*.md`
**Troubleshooting**: `*_TROUBLESHOOTING.md`
**Quick References**: `*_QUICK_REFERENCE.md`

## Steering Files

Current steering files in `.kiro/steering/`:
- `tech.md` - Tech stack and standards
- `structure.md` - Project structure and naming
- `security.md` - Security standards
- `product.md` - Product vision
- `testing-guide.md` - Testing conventions and patterns
- `voice-notes-architecture.md` - Voice notes feature architecture
- `google-integrations.md` - Google API integration patterns
- `database-setup.md` - Database setup guide
- `google-calendar-setup.md` - Calendar OAuth setup
- `chrome-devtools.md` - Browser debugging guide
- `psql-commands.md` - PostgreSQL command reference
- `mcps.md` - MCP configuration
- `api-reference.md` - API quick reference (manual inclusion)
- `features-overview.md` - Features overview (manual inclusion)

## When to Use What

**Need API endpoint info?** → `docs/API.md` or `.kiro/steering/api-reference.md`
**Need feature overview?** → `.kiro/steering/features-overview.md`
**Need setup instructions?** → Check `docs/` for `*_SETUP*.md` files
**Need implementation details?** → `docs/features/<feature-name>/`
**Need code examples?** → `docs/examples/backend/` or `docs/examples/frontend/`
**Need testing info?** → `docs/testing/` or `.kiro/steering/testing-guide.md`
**Need manual testing?** → `tests/html/` for HTML test files
**Need historical context?** → `docs/archive/`
**Need TODO tracking?** → `docs/development/UNIMPLEMENTED_FEATURES.md`
