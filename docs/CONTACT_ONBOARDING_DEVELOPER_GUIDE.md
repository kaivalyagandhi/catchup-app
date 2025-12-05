# Contact Onboarding Developer Guide

This guide provides technical documentation for developers working with the Contact Onboarding feature.

## Architecture Overview

The Contact Onboarding system consists of:

1. **Backend Services**: State management, AI suggestions, data persistence
2. **Frontend Components**: Step indicator, handlers, UI flows
3. **Database Schema**: Onboarding state, circle assignments, group mappings
4. **API Endpoints**: RESTful APIs for state and data operations

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  OnboardingStepIndicator                                    │
│  ├── Step1IntegrationsHandler                               │
│  ├── Step2CirclesHandler                                    │
│  │   └── ManageCirclesFlow                                  │
│  └── Step3GroupMappingHandler                               │
├─────────────────────────────────────────────────────────────┤
│                     Backend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  OnboardingStateManager                                     │
│  ├── State Persistence (localStorage + DB)                  │
│  ├── Step Completion Logic                                  │
│  └── Progress Tracking                                      │
│                                                             │
│  OnboardingService                                          │
│  ├── Circle Assignment                                      │
│  ├── AI Suggestions                                         │
│  └── Group Mapping                                          │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                        │
│  ├── onboarding_state                                       │
│  ├── contacts (with circle column)                          │
│  └── group_mapping_suggestions                              │
└─────────────────────────────────────────────────────────────┘
```

## Backend Components

### OnboardingStateManager

**Location**: `src/contacts/onboarding-state-manager.ts`

**Purpose**: Manages onboarding state with multi-layer persistence (localStorage, sessionStorage, memory).

#### API Reference

##### `initializeState(userId: string): Promise<OnboardingState>`

Initializes onboarding state for a new user.

```typescript
const stateManager = new OnboardingStateManager();
const state = await stateManager.initializeState('user-123');
```

**Returns**: Fresh onboarding state with all steps incomplete.

##### `loadState(userId: string): Promise<OnboardingState>`

Loads onboarding state with fallback chain.

```typescript
const state = await stateManager.loadState('user-123');
```

**Fallback order**:
1. localStorage (`catchup-onboarding-${userId}`)
2. sessionStorage (same key)
3. Memory cache
4. Database
5. Fresh initialization

##### `saveState(userId: string, state: OnboardingState): Promise<void>`

Persists state to all storage layers.

```typescript
await stateManager.saveState('user-123', updatedState);
```

**Persistence targets**:
- localStorage (immediate)
- sessionStorage (immediate)
- Memory cache (immediate)
- Database (async, queued)

##### `updateStepCompletion(userId: string, step: number, complete: boolean): Promise<void>`

Updates completion status for a specific step.

```typescript
await stateManager.updateStepCompletion('user-123', 1, true);
```

##### `checkIntegrationCompletion(userId: string): Promise<boolean>`

Checks if both Google Calendar and Contacts are connected.

```typescript
const isComplete = await stateManager.checkIntegrationCompletion('user-123');
```

##### `calculateCircleProgress(userId: string): Promise<{ categorized: number; total: number }>`

Calculates circle assignment progress.

```typescript
const progress = await stateManager.calculateCircleProgress('user-123');
// Returns: { categorized: 45, total: 120 }
```

##### `isOnboardingComplete(userId: string): Promise<boolean>`

Checks if all onboarding steps are complete.

```typescript
const isComplete = await stateManager.isOnboardingComplete('user-123');
```

#### State Schema

```typescript
interface OnboardingState {
  userId: string;
  isComplete: boolean;
  isDismissed: boolean;
  currentStep: number; // 1, 2, or 3
  steps: {
    integrations: {
      complete: boolean;
      googleCalendar: boolean;
      googleContacts: boolean;
    };
    circles: {
      complete: boolean;
      contactsCategorized: number;
      totalContacts: number;
      lastUpdated: string;
    };
    groups: {
      complete: boolean;
      mappingsReviewed: number;
      totalMappings: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}
```

### OnboardingService

**Location**: `src/contacts/onboarding-service.ts`

**Purpose**: Business logic for onboarding operations.

#### API Reference

##### `assignContactToCircle(userId: string, contactId: string, circle: string): Promise<void>`

Assigns a contact to a circle.

```typescript
const service = new OnboardingService();
await service.assignContactToCircle('user-123', 'contact-456', 'inner');
```

**Valid circles**: `'inner'`, `'close'`, `'active'`, `'casual'`

##### `bulkAssignContacts(userId: string, assignments: Array<{ contactId: string; circle: string }>): Promise<void>`

Bulk assigns multiple contacts.

```typescript
await service.bulkAssignContacts('user-123', [
  { contactId: 'contact-1', circle: 'inner' },
  { contactId: 'contact-2', circle: 'close' }
]);
```

##### `getCircleCounts(userId: string): Promise<CircleCounts>`

Gets current count of contacts in each circle.

```typescript
const counts = await service.getCircleCounts('user-123');
// Returns: { inner: 3, close: 12, active: 20, casual: 10 }
```

##### `generateAISuggestions(userId: string): Promise<AISuggestion[]>`

Generates AI-powered circle suggestions for all contacts.

```typescript
const suggestions = await service.generateAISuggestions('user-123');
```

**Returns**:
```typescript
interface AISuggestion {
  contactId: string;
  suggestedCircle: string;
  confidence: number; // 0-100
  reasons: string[];
}
```

##### `acceptGroupMapping(userId: string, mappingId: string, targetGroupId: string): Promise<void>`

Accepts a group mapping suggestion.

```typescript
await service.acceptGroupMapping('user-123', 'mapping-789', 'group-101');
```

##### `rejectGroupMapping(userId: string, mappingId: string): Promise<void>`

Rejects a group mapping suggestion.

```typescript
await service.rejectGroupMapping('user-123', 'mapping-789');
```

## Frontend Components

### OnboardingStepIndicator

**Location**: `public/js/onboarding-step-indicator.js`

**Purpose**: Persistent sidebar UI showing onboarding progress.

#### Usage

```javascript
// Initialize in app.js
const indicator = new OnboardingStepIndicator({
  userId: currentUser.id,
  onStepClick: (stepNumber) => {
    // Navigate to step
    navigateToStep(stepNumber);
  },
  onDismiss: () => {
    // Handle dismiss
    dismissOnboarding();
  }
});

// Render in sidebar
document.getElementById('sidebar').appendChild(indicator.render());

// Update state
indicator.updateState(newState);
```

#### Methods

##### `render(): HTMLElement`

Renders the indicator component.

##### `updateState(state: OnboardingState): void`

Updates the indicator with new state.

##### `show(): void`

Shows the indicator.

##### `hide(): void`

Hides the indicator.

### ManageCirclesFlow

**Location**: `public/js/manage-circles-flow.js`

**Purpose**: Modal interface for assigning contacts to circles.

#### Usage

```javascript
const flow = new ManageCirclesFlow({
  userId: currentUser.id,
  contacts: allContacts,
  currentAssignments: existingAssignments,
  onSave: async (assignments) => {
    // Save assignments
    await saveCircleAssignments(assignments);
  },
  onSkip: () => {
    // Handle skip
    saveProgress();
  }
});

// Open modal
flow.open();

// Close modal
flow.close();
```

#### Methods

##### `open(): void`

Opens the Manage Circles modal.

##### `close(): void`

Closes the modal.

##### `updateProgress(): void`

Updates the progress bar and counts.

##### `filterContacts(query: string): void`

Filters contacts based on search query.

##### `assignCircle(contactId: string, circle: string): void`

Assigns a contact to a circle.

### Step Handlers

#### Step1IntegrationsHandler

**Location**: `public/js/step1-integrations-handler.js`

Handles Step 1: Integration connections.

```javascript
const handler = new Step1IntegrationsHandler({
  userId: currentUser.id,
  onComplete: () => {
    // Step 1 complete
    promptForStep2();
  }
});

handler.start();
```

#### Step2CirclesHandler

**Location**: `public/js/step2-circles-handler.js`

Handles Step 2: Circle organization.

```javascript
const handler = new Step2CirclesHandler({
  userId: currentUser.id,
  onComplete: () => {
    // Step 2 complete
    promptForStep3();
  }
});

handler.start();
```

#### Step3GroupMappingHandler

**Location**: `public/js/step3-group-mapping-handler.js`

Handles Step 3: Group mapping review.

```javascript
const handler = new Step3GroupMappingHandler({
  userId: currentUser.id,
  onComplete: () => {
    // Onboarding complete
    celebrateCompletion();
  }
});

handler.start();
```

## API Endpoints

### Onboarding State Endpoints

#### `POST /api/onboarding/init`

Initialize onboarding for a new user.

**Request**:
```json
{
  "userId": "user-123"
}
```

**Response**:
```json
{
  "state": {
    "userId": "user-123",
    "isComplete": false,
    "currentStep": 1,
    "steps": { ... }
  }
}
```

#### `GET /api/onboarding/state`

Get current onboarding state.

**Query params**: `userId`

**Response**:
```json
{
  "state": { ... }
}
```

#### `PUT /api/onboarding/state`

Update onboarding state.

**Request**:
```json
{
  "userId": "user-123",
  "state": { ... }
}
```

**Response**:
```json
{
  "success": true
}
```

#### `POST /api/onboarding/sync`

Sync local state to server.

**Request**:
```json
{
  "userId": "user-123",
  "state": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "synced": true
}
```

### Circle Assignment Endpoints

#### `POST /api/contacts/:id/circle`

Assign a contact to a circle.

**Request**:
```json
{
  "circle": "inner"
}
```

**Response**:
```json
{
  "success": true,
  "contact": { ... }
}
```

#### `GET /api/contacts/circles/counts`

Get circle counts.

**Query params**: `userId`

**Response**:
```json
{
  "inner": 3,
  "close": 12,
  "active": 20,
  "casual": 10
}
```

#### `POST /api/contacts/circles/bulk`

Bulk assign contacts to circles.

**Request**:
```json
{
  "assignments": [
    { "contactId": "contact-1", "circle": "inner" },
    { "contactId": "contact-2", "circle": "close" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "updated": 2
}
```

### AI Suggestion Endpoints

#### `POST /api/ai/circle-suggestions`

Generate AI circle suggestions.

**Request**:
```json
{
  "userId": "user-123"
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "contactId": "contact-1",
      "suggestedCircle": "inner",
      "confidence": 95,
      "reasons": [
        "High communication frequency",
        "Recent interactions",
        "Frequent calendar co-attendance"
      ]
    }
  ]
}
```

### Group Mapping Endpoints

#### `GET /api/google-contacts/mapping-suggestions`

Get group mapping suggestions.

**Query params**: `userId`

**Response**:
```json
{
  "mappings": [
    {
      "id": "mapping-1",
      "googleGroupId": "google-group-1",
      "googleGroupName": "Work Team",
      "suggestedGroupId": "catchup-group-1",
      "suggestedGroupName": "Colleagues",
      "confidence": 85,
      "memberCount": 12
    }
  ]
}
```

#### `POST /api/google-contacts/accept-mapping`

Accept a group mapping.

**Request**:
```json
{
  "mappingId": "mapping-1",
  "targetGroupId": "catchup-group-1"
}
```

**Response**:
```json
{
  "success": true,
  "membersSynced": 12
}
```

#### `POST /api/google-contacts/reject-mapping`

Reject a group mapping.

**Request**:
```json
{
  "mappingId": "mapping-1"
}
```

**Response**:
```json
{
  "success": true
}
```

## Database Schema

### onboarding_state Table

```sql
CREATE TABLE onboarding_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  is_complete BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 1,
  step_integrations_complete BOOLEAN DEFAULT FALSE,
  step_integrations_google_calendar BOOLEAN DEFAULT FALSE,
  step_integrations_google_contacts BOOLEAN DEFAULT FALSE,
  step_circles_complete BOOLEAN DEFAULT FALSE,
  step_circles_contacts_categorized INTEGER DEFAULT 0,
  step_circles_total_contacts INTEGER DEFAULT 0,
  step_circles_last_updated TIMESTAMP,
  step_groups_complete BOOLEAN DEFAULT FALSE,
  step_groups_mappings_reviewed INTEGER DEFAULT 0,
  step_groups_total_mappings INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### contacts Table (Circle Column)

```sql
ALTER TABLE contacts ADD COLUMN circle VARCHAR(20);
ALTER TABLE contacts ADD COLUMN circle_ai_suggestion VARCHAR(20);
ALTER TABLE contacts ADD COLUMN circle_ai_confidence INTEGER;
ALTER TABLE contacts ADD COLUMN circle_assigned_by VARCHAR(20);

CREATE INDEX idx_contacts_circle ON contacts(circle);
```

### group_mapping_suggestions Table

```sql
CREATE TABLE group_mapping_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  google_group_id VARCHAR(255) NOT NULL,
  google_group_name VARCHAR(255) NOT NULL,
  suggested_group_id INTEGER REFERENCES groups(id),
  confidence INTEGER NOT NULL,
  member_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Event System

The onboarding system uses custom events for communication between components.

### Events Emitted

#### `onboarding-state-changed`

Fired when onboarding state changes.

```javascript
window.addEventListener('onboarding-state-changed', (e) => {
  const { state } = e.detail;
  // Handle state change
});
```

#### `google-calendar-connected`

Fired when Google Calendar is successfully connected.

```javascript
window.addEventListener('google-calendar-connected', () => {
  // Update Step 1 progress
});
```

#### `google-contacts-connected`

Fired when Google Contacts is successfully connected.

```javascript
window.addEventListener('google-contacts-connected', () => {
  // Update Step 1 progress
});
```

#### `circle-assigned`

Fired when a contact is assigned to a circle.

```javascript
window.addEventListener('circle-assigned', (e) => {
  const { contactId, circle } = e.detail;
  // Update UI
});
```

#### `onboarding-complete`

Fired when all onboarding steps are complete.

```javascript
window.addEventListener('onboarding-complete', () => {
  // Show celebration, hide indicator
});
```

## Error Handling

### OnboardingError

Custom error class for onboarding-specific errors.

```typescript
class OnboardingError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
  }
}
```

### Error Codes

- `STATE_LOAD_FAILED`: Failed to load onboarding state
- `STATE_SAVE_FAILED`: Failed to save onboarding state
- `INTEGRATION_FAILED`: Integration connection failed
- `CIRCLE_ASSIGNMENT_FAILED`: Failed to assign contact to circle
- `AI_SUGGESTION_FAILED`: AI suggestion generation failed
- `MAPPING_FAILED`: Group mapping operation failed

### Error Handler

```typescript
import { OnboardingErrorHandler } from './onboarding-error-handler';

const errorHandler = new OnboardingErrorHandler();

try {
  await stateManager.saveState(userId, state);
} catch (error) {
  const handled = errorHandler.handle(error);
  if (handled.shouldRetry) {
    // Retry operation
  } else {
    // Show error to user
    showToast(handled.userMessage, 'error');
  }
}
```

## Testing

### Unit Tests

Run unit tests for backend services:

```bash
npm test src/contacts/onboarding-state-manager.test.ts
npm test src/contacts/onboarding-service.test.ts
```

### Integration Tests

Test complete onboarding flows:

```bash
npm test tests/integration/onboarding-flow.test.ts
```

### Manual Testing

Use the test HTML files:

- `public/js/onboarding-step-indicator.test.html`
- `public/js/manage-circles-flow.test.html`
- `public/js/step1-integrations-handler.test.html`
- `public/js/step2-circles-handler.test.html`
- `public/js/step3-group-mapping-handler.test.html`

## Development Workflow

### Adding a New Step

1. Create step handler in `public/js/stepN-handler.js`
2. Add step to `OnboardingState` interface
3. Update `OnboardingStateManager` with step logic
4. Add API endpoints if needed
5. Update step indicator to show new step
6. Add tests

### Modifying Circle Logic

1. Update `OnboardingService.assignContactToCircle()`
2. Update database schema if needed
3. Update frontend `ManageCirclesFlow` component
4. Update AI suggestion logic if applicable
5. Test with various contact counts

### Adding AI Features

1. Implement in `OnboardingService`
2. Add API endpoint
3. Update frontend to consume suggestions
4. Add confidence thresholds
5. Test with real data

## Performance Considerations

### State Persistence

- localStorage writes are synchronous - keep state small
- Database writes are queued and batched
- Use debouncing for frequent updates

### AI Suggestions

- Generate suggestions in background
- Cache results for 24 hours
- Implement timeout (5 seconds max)
- Graceful degradation if AI fails

### Contact Grid

- Virtualize for large contact lists (100+)
- Lazy load contact details
- Debounce search input (300ms)

## Security

### Data Access

- All endpoints require authentication
- User can only access their own onboarding state
- Circle assignments are user-scoped
- Group mappings are user-specific

### OAuth Integration

- Use secure OAuth flows
- Store tokens encrypted
- Never expose tokens to client
- Implement token refresh

## Deployment

### Environment Variables

```bash
# Required for AI suggestions
GOOGLE_GEMINI_API_KEY=your-api-key

# Database
DATABASE_URL=postgresql://...

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Database Migrations

Run migrations before deploying:

```bash
npm run migrate
```

### Feature Flags

Control onboarding rollout:

```javascript
const ONBOARDING_ENABLED = process.env.FEATURE_ONBOARDING === 'true';
```

## Troubleshooting

### State Not Persisting

1. Check localStorage quota
2. Verify database connection
3. Check for JavaScript errors
4. Verify user authentication

### AI Suggestions Not Working

1. Check API key configuration
2. Verify network connectivity
3. Check API rate limits
4. Review error logs

### Integration Connection Failing

1. Verify OAuth credentials
2. Check redirect URIs
3. Review OAuth scopes
4. Check for expired tokens

## Additional Resources

- [User Guide](./CONTACT_ONBOARDING_USER_GUIDE.md)
- [API Reference](./ONBOARDING_API.md)
- [Troubleshooting Guide](./CONTACT_ONBOARDING_TROUBLESHOOTING.md)
- [Quick Reference](./CONTACT_ONBOARDING_QUICK_REFERENCE.md)

## Contributing

When contributing to the onboarding feature:

1. Follow TypeScript best practices
2. Add tests for new functionality
3. Update documentation
4. Test across browsers
5. Verify mobile responsiveness
6. Check accessibility compliance

## Support

For technical questions or issues:

1. Check existing documentation
2. Review error logs
3. Test in isolation
4. Contact the development team
