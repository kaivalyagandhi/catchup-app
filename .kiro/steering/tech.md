# CatchUp Technical Standards

## Stack Preferences

- **Frontend**: Mobile-responsive web app (React/Next.js preferred)
- **Backend**: Node.js/TypeScript or Python
- **Database**: PostgreSQL or similar relational DB for structured contact/interaction data
- **AI/ML**: OpenAI API or similar for NLP, tag generation, and matching logic

## Integration Patterns

### Calendar APIs
- Google Calendar OAuth (read-only permissions)
- iCal feed generation for subscription-based calendar publishing
- Future: Outlook, Apple Calendar support

### Messaging Services
- SMS: Twilio or similar for notifications
- Email: SendGrid, AWS SES, or similar
- Configurable timing: Real-time + batched notifications

### AI/ML Libraries
- NLP for voice note transcription and entity extraction
- Tag generation and categorization (1-3 word interests)
- Matching algorithms: Shared interests × availability × time decay × frequency preferences
- Disambiguation: Identify which contact voice notes refer to

### Timezone Inference
- Use static dataset of top 100 cities worldwide (no external API required)
- Store as JSON file in codebase with city name, country, IANA timezone identifier, and aliases
- Implement fuzzy string matching for location lookups (Levenshtein distance)
- Fall back to manual timezone selection when location cannot be matched
- No dependency on Google Maps API or other geocoding services

## Testing Standards

- **Required**: Write tests for all new functionality
- **Unit tests**: Core logic, matching algorithms, tag generation
- **Integration tests**: Calendar APIs, notification services, database operations
- **Property-based tests**: Matching logic, tag deduplication, availability calculations
- **Validation**: All tests must pass before merging
- **Linting**: Enforce consistent code style (ESLint/Prettier for JS/TS, Black/Ruff for Python)

## Code Quality

- Type safety: TypeScript preferred for JavaScript code
- Linting: Run linters on all code changes
- Test coverage: Aim for >80% coverage on core business logic
- CI/CD: Automated testing and linting in pipeline
