# CatchUp Project Structure

## File Organization

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
```

## Naming Conventions

- **Files**: kebab-case (e.g., `contact-manager.ts`)
- **Components**: PascalCase (e.g., `SuggestionFeed.tsx`)
- **Functions/variables**: camelCase (e.g., `generateSuggestion`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_BATCH_TIME`)
- **Types/Interfaces**: PascalCase (e.g., `ContactProfile`, `SuggestionTrigger`)

## Module Boundaries

### Calendar Module
- Responsibilities: OAuth integration, availability detection, iCal feed generation
- Exports: `getAvailableSlots()`, `publishCalendarFeed()`, `detectRelevantEvents()`
- Dependencies: User availability preferences, integration clients

### Contacts Module
- Responsibilities: Contact CRUD, group management, tag operations
- Exports: `createContact()`, `updateTags()`, `getContactsByGroup()`
- Dependencies: Database layer only

### Notifications Module
- Responsibilities: SMS/email delivery, batch scheduling, notification preferences
- Exports: `sendNotification()`, `scheduleBatchNotifications()`, `updatePreferences()`
- Dependencies: Twilio/SendGrid clients, user preferences

### Matching Module
- Responsibilities: Suggestion generation, scoring logic, trigger evaluation
- Exports: `generateSuggestions()`, `scoreMatch()`, `evaluateTriggers()`
- Dependencies: Calendar, Contacts, AI/NLP services

### Voice Module
- Responsibilities: Transcription, entity extraction, contact disambiguation
- Exports: `transcribeVoiceNote()`, `extractEntities()`, `disambiguateContact()`
- Dependencies: AI/NLP services, Contacts module

## Separation of Concerns

- Keep business logic separate from API routes/controllers
- Database queries isolated in repository pattern
- External API calls wrapped in service layer with error handling
- Pure functions for matching algorithms (testable without I/O)
