# Onboarding State Manager

The `OnboardingStateManager` provides a robust state management solution for the contact onboarding flow with automatic fallback and synchronization across multiple storage mechanisms.

## Features

- **Multi-layer Storage**: Automatic fallback chain (localStorage → sessionStorage → memory → database)
- **Automatic Sync**: Debounced database synchronization to reduce server load
- **Step Completion Logic**: Automatic detection of step completion based on criteria
- **Dismiss/Resume**: Support for dismissing and resuming onboarding
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Architecture

### Storage Fallback Chain

The manager implements a robust fallback chain to ensure state is never lost:

1. **localStorage** (Primary): Persistent across browser sessions
2. **sessionStorage** (Backup): Persists for the current session
3. **Memory** (Fallback): In-memory storage when browser storage is unavailable
4. **Database** (Server): Server-side persistence with debounced sync

### State Structure

```typescript
interface OnboardingState {
  userId: string;
  isComplete: boolean;
  currentStep: 1 | 2 | 3;
  dismissedAt?: Date;

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
    };
    groups: {
      complete: boolean;
      mappingsReviewed: number;
      totalMappings: number;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}
```

## Usage

### Basic Usage

```typescript
import {
  initializeOnboardingState,
  loadOnboardingState,
  updateGoogleCalendarConnection,
  updateCircleProgress,
} from './onboarding-state-manager';

// Initialize onboarding for a new user
const state = await initializeOnboardingState('user-123');

// Load existing state
const existingState = await loadOnboardingState('user-123');

// Update Step 1: Connect Google Calendar
await updateGoogleCalendarConnection('user-123', true);

// Update Step 2: Categorize contacts
await updateCircleProgress('user-123', 50, 100);
```

### Advanced Usage

```typescript
import { getOnboardingStateManager } from './onboarding-state-manager';

// Get the manager instance
const manager = getOnboardingStateManager();

// Initialize state
await manager.initializeState('user-123');

// Load state with fallback chain
const state = await manager.loadState('user-123');

// Update state
await manager.updateState('user-123', {
  currentStep: 2,
});

// Force immediate database sync (bypasses debouncing)
await manager.syncToDatabase();
```

## Step Completion Logic

The manager automatically checks and updates step completion based on the following criteria:

### Step 1: Integrations
- **Complete when**: Both Google Calendar AND Google Contacts are connected
- **Auto-advances to**: Step 2

### Step 2: Circles
- **Complete when**: 50% or more contacts are categorized
- **Auto-advances to**: Step 3

### Step 3: Groups
- **Complete when**: All group mapping suggestions are reviewed
- **Marks overall onboarding as**: Complete

## API Reference

### Initialization

#### `initializeOnboardingState(userId: string): Promise<OnboardingState>`
Initialize onboarding state for a new user. Returns existing state if already initialized.

#### `loadOnboardingState(userId: string): Promise<OnboardingState | null>`
Load state using the fallback chain. Returns null if no state exists.

### Step 1: Integrations

#### `updateGoogleCalendarConnection(userId: string, connected: boolean): Promise<void>`
Update Google Calendar connection status.

#### `updateGoogleContactsConnection(userId: string, connected: boolean): Promise<void>`
Update Google Contacts connection status.

#### `markStep1Complete(userId: string, googleCalendar: boolean, googleContacts: boolean): Promise<void>`
Mark Step 1 as complete with both integration statuses.

### Step 2: Circles

#### `updateCircleProgress(userId: string, contactsCategorized: number, totalContacts: number): Promise<void>`
Update circle categorization progress.

#### `incrementCircleProgress(userId: string): Promise<void>`
Increment the categorized contacts count by 1.

#### `getCircleProgress(userId: string): Promise<CircleProgress>`
Get detailed progress information for Step 2.

### Step 3: Groups

#### `updateGroupMappingProgress(userId: string, mappingsReviewed: number, totalMappings: number): Promise<void>`
Update group mapping review progress.

#### `incrementGroupMappingProgress(userId: string): Promise<void>`
Increment the reviewed mappings count by 1.

#### `getGroupMappingProgress(userId: string): Promise<GroupMappingProgress>`
Get detailed progress information for Step 3.

### Completion Status

#### `getStepCompletionStatus(userId: string): Promise<StepCompletionStatus>`
Get completion status for all steps.

```typescript
interface StepCompletionStatus {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  overallComplete: boolean;
}
```

#### `checkStepCompletion(userId: string): Promise<void>`
Manually trigger step completion check. This is called automatically after state updates.

### Dismiss/Resume

#### `dismissOnboarding(userId: string): Promise<void>`
Dismiss onboarding (sets dismissedAt timestamp).

#### `resumeOnboarding(userId: string): Promise<OnboardingState | null>`
Resume onboarding (clears dismissedAt timestamp).

### State Management

#### `saveOnboardingState(state: OnboardingState): Promise<void>`
Save state to all available storage mechanisms.

#### `updateOnboardingState(userId: string, updates: Partial<OnboardingState>): Promise<OnboardingState>`
Update specific fields in the state.

## Storage Behavior

### LocalStorage
- **Key**: `catchup-onboarding-state`
- **Persistence**: Across browser sessions
- **Availability Check**: Automatic with fallback

### SessionStorage
- **Key**: `catchup-onboarding-state`
- **Persistence**: Current session only
- **Use Case**: Backup when localStorage fails

### Memory Storage
- **Persistence**: Current page load only
- **Use Case**: Fallback when browser storage is disabled

### Database
- **Sync**: Debounced (1 second delay)
- **Endpoint**: `/api/onboarding/state`
- **Use Case**: Server-side persistence and cross-device sync

## Error Handling

The manager handles errors gracefully:

```typescript
try {
  await updateCircleProgress('user-123', 50, 100);
} catch (error) {
  // State not found or other error
  console.error('Failed to update progress:', error);
}
```

Common errors:
- `Onboarding state not found`: State must be initialized first
- `Failed to sync state to database`: Network or server error (state still saved locally)

## Requirements Mapping

- **1.1**: Persistent sidebar indicator (state tracks completion)
- **1.5**: Dismiss and resume functionality
- **2.5**: Step 1 completion (both integrations connected)
- **3.5**: Step 2 completion (50%+ contacts categorized)
- **5.5**: Step 3 completion (all mappings reviewed)
- **12.2**: LocalStorage fallback chain
- **12.4**: State persistence and loading

## Testing

See `onboarding-state-manager-example.ts` for comprehensive usage examples.

## Integration with UI

The state manager is designed to work seamlessly with the UI components:

```typescript
// In your UI component
import { loadOnboardingState, getStepCompletionStatus } from './onboarding-state-manager';

async function renderOnboardingIndicator(userId: string) {
  const state = await loadOnboardingState(userId);
  
  if (!state || state.isComplete || state.dismissedAt) {
    // Don't show indicator
    return;
  }

  const status = await getStepCompletionStatus(userId);
  
  // Render indicator with current step and completion status
  renderIndicator({
    currentStep: state.currentStep,
    step1Complete: status.step1Complete,
    step2Complete: status.step2Complete,
    step3Complete: status.step3Complete,
  });
}
```

## Performance Considerations

- **Debounced Sync**: Database writes are debounced by 1 second to reduce server load
- **Caching**: Current state is cached in memory for fast access
- **Lazy Loading**: State is only loaded when needed
- **Efficient Updates**: Only changed fields trigger storage updates

## Browser Compatibility

- **Modern Browsers**: Full support with localStorage and sessionStorage
- **Private/Incognito Mode**: Automatic fallback to sessionStorage or memory
- **Storage Disabled**: Automatic fallback to memory storage
- **Server-Side**: Database persistence ensures state is never lost
