# CatchUp Code Examples

This directory contains example code demonstrating how to use various CatchUp modules and features. These examples are reference implementations that show best practices and common usage patterns.

## Purpose

Example files serve as:
- **Learning Resources**: Understand how to use CatchUp's APIs and services
- **Reference Implementations**: See working code for common tasks
- **Integration Guides**: Learn how to integrate features into the application
- **Best Practices**: Follow established patterns for error handling, state management, and API usage

## Directory Structure

### `/backend` - TypeScript Backend Examples

Backend examples demonstrate server-side functionality including API integrations, data processing, and business logic.

#### `/backend/api`
API authentication and route examples:
- `google-sso-example.ts` - Google SSO authentication flow
- `google-sso-auth-example.ts` - SSO authentication helpers
- `google-sso-error-handler-example.ts` - Error handling for SSO
- `oauth-state-manager-example.ts` - OAuth state management
- `routes/auth-statistics-example.ts` - Authentication statistics API
- `routes/contacts-secured-example.ts` - Secured contact routes

#### `/backend/calendar`
Calendar integration examples:
- `example-usage.ts` - Basic calendar service usage
- `feed-api-example.ts` - iCal feed generation and publishing

#### `/backend/contacts`
Contact management examples:
- `account-example.ts` - User account operations
- `error-handling-demo.ts` - Contact error handling patterns
- `onboarding-example.ts` - Contact onboarding flow
- `onboarding-state-manager-example.ts` - Onboarding state management

#### `/backend/integrations`
Third-party integration examples:
- `sync-service-example.ts` - Google Contacts sync
- `token-refresh-example.ts` - OAuth token refresh patterns

#### `/backend/jobs`
Background job examples:
- `example-usage.ts` - Job scheduling and execution

#### `/backend/matching`
AI matching and suggestion examples:
- `example-usage.ts` - Basic matching service usage
- `group-matching-example.ts` - Group-based matching algorithms

#### `/backend/sms`
SMS/MMS processing examples:
- `ai-processor-example.ts` - AI-powered message processing
- `error-handling-example.ts` - SMS error handling and retry logic
- `media-downloader-example.ts` - MMS media download
- `message-processor-example.ts` - Message processing pipeline
- `twiml-generator-example.ts` - TwiML response generation

#### `/backend/voice`
Voice note processing examples:
- `contact-disambiguation-example.ts` - Identifying contacts from voice notes
- `enrichment-example.ts` - Contact enrichment from voice data
- `entity-extraction-example.ts` - Extracting entities from transcripts
- `example-usage.ts` - Basic voice service usage
- `transcription-example.ts` - Real-time audio transcription
- `websocket-example.ts` - WebSocket streaming for voice

### `/frontend` - JavaScript Frontend Examples

Frontend examples demonstrate client-side integration patterns for UI components and features.

#### Integration Examples
- `ai-suggestion-integration-example.js` - AI suggestion UI integration
- `contact-pruning-integration-example.js` - Contact pruning workflow
- `educational-features-integration-example.js` - Educational tooltips and guides
- `enrichment-review-integration-example.js` - Enrichment review panel
- `gamification-integration-example.js` - Gamification features
- `manage-circles-flow-integration-example.js` - Circle management flow
- `mobile-responsive-integration-example.js` - Mobile responsive patterns
- `onboarding-integration-example.js` - Onboarding controller integration
- `preference-setting-integration-example.js` - User preference UI
- `uncategorized-tracker-integration-example.js` - Uncategorized contact tracking
- `weekly-catchup-integration-example.js` - Weekly catchup feature

## How to Use These Examples

### Backend Examples (TypeScript)

Backend examples are **reference implementations** that demonstrate API usage patterns. They are not meant to be run directly but rather used as guides when implementing features.

**To use a backend example:**

1. **Read the file** to understand the API and patterns
2. **Copy relevant code** into your implementation
3. **Adapt imports** to match your file structure
4. **Customize** for your specific use case

**Example workflow:**
```typescript
// 1. Read docs/examples/backend/voice/transcription-example.ts
// 2. Understand the TranscriptionService API
// 3. Implement in your feature:

import { TranscriptionService } from '../voice/transcription-service';

async function handleVoiceNote() {
  const service = new TranscriptionService();
  
  service.onFinalResult((result) => {
    // Your custom logic here
    saveTranscript(result.transcript);
  });
  
  const stream = await service.startStream({
    languageCode: 'en-US',
    sampleRateHertz: 16000,
  });
  
  // Your audio streaming logic
}
```

### Frontend Examples (JavaScript)

Frontend examples show how to integrate features into the main application. They demonstrate event handling, state management, and UI updates.

**To use a frontend example:**

1. **Read the file** to understand the integration pattern
2. **Identify relevant functions** for your use case
3. **Copy and adapt** the code into your component
4. **Wire up event listeners** and UI elements

**Example workflow:**
```javascript
// 1. Read docs/examples/frontend/onboarding-integration-example.js
// 2. Understand the OnboardingController integration
// 3. Implement in your app:

function initializeOnboarding() {
  onboardingController.initialize(authToken, userId);
  
  onboardingController.on('stateChange', (state) => {
    if (state.completed) {
      showCompletionMessage();
      refreshContacts();
    }
  });
}
```

## Common Patterns

### Error Handling
Most examples demonstrate proper error handling:
```typescript
try {
  const result = await someOperation();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}
```

### Event Listeners
Service-based examples use event emitters:
```typescript
service.on('event', (data) => {
  // Handle event
});
```

### Async/Await
All async operations use async/await syntax:
```typescript
async function example() {
  const result = await asyncOperation();
  return result;
}
```

### Configuration Objects
Services accept configuration objects:
```typescript
const service = new Service({
  option1: value1,
  option2: value2,
});
```

## Related Documentation

- **API Reference**: See `.kiro/steering/api-reference.md` for API endpoint documentation
- **Testing Guide**: See `.kiro/steering/testing-guide.md` for testing patterns
- **Architecture Docs**: See `docs/features/` for feature-specific architecture
- **Manual Tests**: See `tests/html/` for manual testing HTML files

## Important Notes

### Not Production Code
These examples are **reference implementations**, not production code. They:
- May use simplified error handling
- May omit edge case handling
- May use placeholder functions
- Are meant for learning and reference

### Import Paths
Example files may have import paths that need adjustment:
```typescript
// Example file might have:
import { Service } from './service';

// Your implementation might need:
import { Service } from '../path/to/service';
```

### Dependencies
Examples assume you have:
- Required npm packages installed
- Environment variables configured
- Database connections established
- API credentials set up

### Testing
To test code based on these examples:
- Write unit tests (see `src/**/*.test.ts`)
- Use manual test files (see `tests/html/`)
- Follow testing guidelines in `.kiro/steering/testing-guide.md`

## Contributing Examples

When adding new example files:

1. **Use descriptive names**: `feature-name-example.ts` or `feature-integration-example.js`
2. **Add comprehensive comments**: Explain what the code does and why
3. **Include multiple examples**: Show basic and advanced usage
4. **Demonstrate best practices**: Error handling, type safety, clean code
5. **Keep imports relative**: Use relative imports that work from the example location
6. **Add to this README**: Update the appropriate section above

## Questions?

If you have questions about using these examples:
- Check the related documentation links above
- Review the actual implementation in `src/` or `public/js/`
- Look at manual test files in `tests/html/` for working integrations
- Consult the feature documentation in `docs/features/`
