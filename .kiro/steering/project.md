# CatchUp Project

## Product Vision
AI-powered relationship management app that reduces coordination friction and helps users maintain meaningful connections across relationship tiers. Core goals: identify who to reach out to and when, track interactions, facilitate scheduling, reduce coordination overhead.

## Tech Stack
- Backend: Express.js 5 + TypeScript (Node.js)
- Frontend: Vanilla JavaScript (no framework), mobile-responsive
- Database: PostgreSQL (pg)
- Cache/Queue: Upstash Redis (HTTP), Google Cloud Tasks for job processing
- AI: Google Cloud Speech-to-Text (streaming transcription), Google Gemini (entity extraction, NLP)
- Auth: Google SSO (OAuth 2.0), JWT sessions
- SMS: Twilio
- Email: SendGrid
- Testing: Vitest + fast-check (property-based)
- Linting: ESLint + Prettier

## Source Structure
```
src/
  api/           # Express routes, middleware, auth services
  calendar/      # Calendar integration, availability, iCal feeds
  contacts/      # Contact CRUD, groups, tags, onboarding, import
  db/            # Database connection
  edits/         # Pending edits review system
  integrations/  # Google OAuth, sync, webhooks, circuit breaker
  jobs/          # Cloud Tasks client, job scheduling, processors
  matching/      # AI suggestion generation, scoring
  notifications/ # SMS/email delivery, batch scheduling, preferences
  scheduling/    # Group scheduling, availability collection
  scripts/       # Admin scripts (promote-admin, test utilities)
  sms/           # Twilio webhook, SMS/MMS processing, AI enrichment
  types/         # TypeScript type definitions
  users/         # User preferences
  utils/         # Caching, encryption, rate limiting, memory monitoring
  voice/         # Voice transcription, entity extraction, enrichment
public/
  js/            # Frontend modules (one JS file per feature)
  css/           # Stylesheets
  admin/         # Admin dashboard pages
```

## Naming Conventions
- Files: kebab-case (`contact-manager.ts`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

## Architecture Patterns
- Repository pattern for data access
- Service layer for business logic
- Routes/controllers separate from business logic
- External API calls wrapped in service layer with error handling
- Direct integration: implement changes in existing app files, not isolated demos

## Security
- Never commit secrets; use `.env` for local, Secret Manager for production
- OAuth tokens encrypted at rest, server-side only
- Read-only Google API scopes (contacts, calendar)
- JWT auth on all protected endpoints
- Rate limiting on API endpoints

## Database Commands
Use non-interactive flags with psql: `psql -h localhost -U postgres -c "SELECT 1;"`
Key scripts: `npm run db:init`, `npm run db:migrate`, `npm run db:test`

## Documentation
- `docs/features/<feature>/` for implementation details
- `docs/API.md` for endpoint reference
- `docs/testing/` for test guides
- `tests/html/` for manual UI test files
- `docs/development/UNIMPLEMENTED_FEATURES.md` for TODOs
