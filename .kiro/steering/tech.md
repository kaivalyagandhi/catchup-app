# CatchUp Technical Standards

## Stack Preferences

- **Frontend**: Mobile-responsive web app (React/Next.js preferred)
- **Backend**: Node.js/TypeScript or Python
- **Database**: PostgreSQL or similar relational DB for structured contact/interaction data
- **AI/ML**: 
  - Google Cloud Speech-to-Text API for real-time audio transcription (streaming)
  - Google Gemini API for entity extraction, tag generation, contact disambiguation, and NLP
  - Custom matching algorithms for relationship suggestions

## Integration Patterns

### Calendar APIs
- Google Calendar OAuth (read-only permissions)
- iCal feed generation for subscription-based calendar publishing
- Future: Outlook, Apple Calendar support

### Messaging Services
- SMS: Twilio or similar for notifications
- Email: SendGrid, AWS SES, or similar
- Configurable timing: Real-time + batched notifications

### AI/ML Services
- **Audio Transcription**: Google Cloud Speech-to-Text API (streaming recognition, LINEAR16 @ 16kHz)
- **Entity Extraction**: Google Gemini API with structured JSON output (responseSchema feature)
- **Tag Generation**: Google Gemini for extracting 1-3 word interests from transcripts
- **Contact Disambiguation**: Google Gemini to identify which contact voice notes refer to
- **Matching Algorithms**: Custom logic for shared interests × availability × time decay × frequency preferences

### Timezone Inference
- Use static dataset of top 100 cities worldwide (no external API required)
- Store as JSON file in codebase with city name, country, IANA timezone identifier, and aliases
- Implement fuzzy string matching for location lookups (Levenshtein distance)
- Fall back to manual timezone selection when location cannot be matched
- No dependency on Google Maps API or other geocoding services

## Testing Standards

- **Direct Integration**: Implement changes directly into the app, not in isolated test files
- **Manual Testing**: Guide user to test changes in the running application via chat or .md docs
- **Testing Instructions**: Provide clear step-by-step testing instructions in chat responses
- **Unit Tests**: Only create automated tests when explicitly requested by user
- **Validation**: Test changes by running the actual application
- **Linting**: Enforce consistent code style (ESLint/Prettier for JS/TS, Black/Ruff for Python)

## Code Quality

- Type safety: TypeScript preferred for JavaScript code
- Linting: Run linters on all code changes
- Test coverage: Aim for >80% coverage on core business logic
- CI/CD: Automated testing and linting in pipeline
