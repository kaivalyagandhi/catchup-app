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

**Testing**: `docs/testing/`
- Testing guides, checklists, verification procedures

**Development**: `docs/development/`
- Quick starts, implementation guides, bug fixes

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
**Need testing info?** → `docs/testing/`
**Need historical context?** → `docs/archive/`
