# CatchUp - AI-Powered Relationship Management

CatchUp is an intelligent relationship management application that helps users maintain meaningful connections by identifying and prioritizing catchup opportunities, reducing coordination friction, and facilitating connection through intelligent scheduling and suggestion capabilities.

## Project Structure

```
/src
  /calendar          # Calendar integration and availability logic
  /contacts          # Contact management, groups, tags
  /notifications     # SMS/email notification system
  /matching          # AI matching algorithms and suggestion generation
  /voice             # Voice note transcription and NLP
  /integrations      # Third-party API clients (Google, Twilio, etc.)
  /db                # Database models and migrations
  /utils             # Shared utilities
  /types             # TypeScript type definitions

/scripts             # Database setup and utility scripts
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Environment variables configured (see `.env.example`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npm run db:setup
   ```

5. Test the database connection:
   ```bash
   npm run db:test
   ```

## Development

### Available Scripts

- `npm run dev` - Start development server with ts-node
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the built application
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Type check without emitting files
- `npm run db:setup` - Initialize database
- `npm run db:test` - Test database connection

### Code Quality

This project uses:
- **TypeScript** with strict mode for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Vitest** for unit testing
- **fast-check** for property-based testing (minimum 100 iterations per test)

## Testing

The project uses a dual testing approach:

1. **Unit Tests**: Verify specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Verify universal properties across all inputs using fast-check

All property-based tests are configured to run a minimum of 100 iterations as specified in the design document.

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Module Boundaries

Each module has clear responsibilities:

- **Calendar**: OAuth integration, availability detection, iCal feed generation
- **Contacts**: Contact CRUD, group management, tag operations
- **Notifications**: SMS/email delivery, batch scheduling, reply processing
- **Matching**: Suggestion generation, scoring logic, trigger evaluation
- **Voice**: Transcription, entity extraction, contact disambiguation
- **Integrations**: Third-party API clients with error handling

## Security

- Never commit secrets or API keys
- All sensitive credentials must be in environment variables
- See `.env.example` for required configuration
- OAuth tokens are stored securely in the database

## License

ISC
