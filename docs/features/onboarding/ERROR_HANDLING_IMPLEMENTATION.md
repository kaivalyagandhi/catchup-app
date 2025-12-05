# Error Handling and Edge Cases Implementation

## Overview

This document describes the comprehensive error handling and edge case management implemented for the Contact Onboarding feature. The implementation covers localStorage fallbacks, network error handling, API error handling, and validation.

**Task**: 13. Error handling and edge cases  
**Status**: ✅ Complete  
**Requirements**: 12.2, 13.4, All requirements (reliability, data integrity)

## Implementation Summary

### 13.1 localStorage Fallbacks ✅

**Files Modified**:
- `src/contacts/onboarding-state-manager.ts`
- `public/js/onboarding-step-indicator.js`

**Features**:
- **Fallback Chain**: localStorage → sessionStorage → memory storage
- **Availability Detection**: Checks if each storage mechanism is available before use
- **User Messaging**: Shows appropriate warnings when storage is limited
- **Graceful Degradation**: Continues to function even when browser storage is disabled

**Key Methods**:
```typescript
// Backend (TypeScript)
getStorageStatus(): {
  localStorage: boolean;
  sessionStorage: boolean;
  memory: boolean;
  message: string;
}

// Frontend (JavaScript)
saveState() {
  // Try localStorage → sessionStorage → memory
  // Show appropriate user messages
}
```

**User Messages**:
- "Progress saved temporarily. It will be lost when you close this tab." (sessionStorage only)
- "Browser storage unavailable. Progress saved for this session only." (memory only)
- "Unable to save progress. Please check your browser settings." (all failed)

---

### 13.2 Network Error Handling ✅

**Files Created**:
- `src/contacts/onboarding-network-manager.ts` - Network manager with sync queue
- `public/js/onboarding-offline-indicator.js` - Visual offline indicator

**Files Modified**:
- `src/contacts/onboarding-state-manager.ts` - Integrated network manager

**Features**:
- **Offline Detection**: Monitors `navigator.onLine` and network events
- **Sync Queue**: Queues state updates when offline for later sync
- **Automatic Retry**: Processes queue when connection is restored
- **Visual Indicator**: Shows offline status and pending sync count
- **Exponential Backoff**: Retries with increasing delays (max 3 attempts)

**Key Components**:

#### OnboardingNetworkManager
```typescript
class OnboardingNetworkManager {
  // Queue updates when offline
  addToQueue(type: 'state' | 'circle' | 'mapping', data: unknown): string
  
  // Process queue when online
  async processSyncQueue(): Promise<void>
  
  // Get current status
  getQueueStatus(): {
    itemCount: number;
    isSyncing: boolean;
    isOnline: boolean;
  }
}
```

#### OnboardingOfflineIndicator
```javascript
class OnboardingOfflineIndicator {
  // Shows visual indicator when offline or syncing
  render() // Returns HTML for indicator
  mount(container) // Mounts to DOM
  setQueueCount(count) // Updates pending count
}
```

**User Experience**:
- Offline: "You're offline. Changes will sync when connection is restored."
- Syncing: "Syncing X changes..."
- Success: "All changes synced successfully"

---

### 13.3 API Error Handling ✅

**Files Created**:
- `src/contacts/onboarding-error-handler.ts` - Centralized error handler

**Files Modified**:
- `public/js/step1-integrations-handler.js` - Integration error handling
- `public/js/step2-circles-handler.js` - AI service error handling
- `public/js/step3-group-mapping-handler.js` - Mapping API error handling

**Features**:
- **Error Classification**: Categorizes errors as retryable or not
- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Handling**: Configurable timeouts for API calls
- **User-Friendly Messages**: Converts technical errors to actionable messages
- **Retry UI**: Shows retry buttons for retryable errors

**Error Types Handled**:

| Error Type | Retryable | User Message |
|------------|-----------|--------------|
| Network errors | ✅ Yes | "Network connection issue. Please check your internet and try again." |
| Timeouts | ✅ Yes | "Request timed out. The server may be busy. Please try again." |
| HTTP 5xx | ✅ Yes | "Server error. Please try again in a moment." |
| HTTP 429 | ✅ Yes | "Too many requests. Please wait a moment and try again." |
| HTTP 401/403 | ❌ No | "Authentication failed. Please sign in again." |
| HTTP 404 | ❌ No | "Resource not found. Please refresh the page." |
| HTTP 400 | ❌ No | "Invalid request. Please check your input and try again." |

**Key Methods**:

```typescript
class OnboardingErrorHandler {
  // Classify error and determine retry strategy
  static classifyError(error: unknown): RetryableError
  
  // Handle integration-specific errors
  static handleIntegrationError(
    integration: 'google-calendar' | 'google-contacts',
    error: unknown
  ): RetryableError
  
  // Handle AI service errors (graceful degradation)
  static handleAIServiceError(error: unknown): RetryableError
  
  // Execute with retry logic
  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<T>
  
  // Show retry button in UI
  static showRetryButton(
    containerId: string,
    retryCallback: () => void,
    error: RetryableError
  ): void
}
```

**Integration Error Handling**:
- Popup blocked: "Please allow popups and try again"
- Permission denied: "Please grant the required permissions"
- OAuth state mismatch: "Security check failed. Please try again"
- Network error: "Please check your internet connection"

**AI Service Error Handling** (Graceful Degradation):
- Timeout: "AI suggestions temporarily unavailable. You can still organize contacts manually."
- Service failure: "AI suggestions temporarily unavailable. You can still organize contacts manually."
- No blocking: User can continue without AI suggestions

**Group Mapping Error Handling**:
- Network errors: Retry button shown
- Server errors: Retry button shown
- Auth errors: Prompt to refresh and sign in

---

### 13.4 Validation ✅

**Files Created**:
- `src/contacts/onboarding-validation.ts` - Comprehensive validation module

**Files Modified**:
- `src/contacts/onboarding-state-manager.ts` - Integrated validation
- `public/js/manage-circles-flow.js` - Circle assignment validation

**Features**:
- **State Validation**: Validates onboarding state structure and values
- **Circle Assignment Validation**: Validates contact ID and circle values
- **Capacity Validation**: Warns when circles exceed recommended capacity
- **Step Completion Validation**: Ensures logical consistency of completion flags
- **Clear Error Messages**: Shows validation errors to users

**Validation Types**:

#### 1. Circle Assignment Validation
```typescript
validateCircleAssignment(contactId: number, circle: string | null): ValidationResult
```
- Validates contact ID is positive number
- Validates circle is one of: 'inner', 'close', 'active', 'casual', or null
- Warns if assignment will exceed circle capacity

#### 2. Onboarding State Validation
```typescript
validateOnboardingState(state: Partial<OnboardingState>): ValidationResult
```
- Validates userId is non-empty string
- Validates currentStep is 1, 2, or 3
- Validates all boolean flags are booleans
- Validates all counts are non-negative numbers
- Validates logical consistency (e.g., categorized ≤ total)
- Validates timestamps are Date objects

#### 3. Circle Capacity Validation
```typescript
validateCircleCapacity(
  circle: 'inner' | 'close' | 'active' | 'casual',
  currentCount: number
): ValidationResult
```
- Validates count is non-negative
- Warns if count exceeds capacity:
  - Inner: 10
  - Close: 25
  - Active: 50
  - Casual: 100

#### 4. Step Completion Validation
```typescript
validateStepCompletion(state: OnboardingState): ValidationResult
```
- Step 1: Both integrations must be connected
- Step 2: At least 50% of contacts categorized
- Step 3: All mappings reviewed
- Overall: All steps must be complete

**Validation Result Structure**:
```typescript
interface ValidationResult {
  isValid: boolean;      // True if no errors
  errors: string[];      // Blocking errors
  warnings: string[];    // Non-blocking warnings
}
```

**User Experience**:
- Errors: Red toast notifications, operation blocked
- Warnings: Yellow toast notifications, operation continues
- Clear messages: "Invalid contact ID", "Circle will be over capacity"

---

## Integration Points

### Backend Integration
```typescript
// In onboarding-state-manager.ts
import { getOnboardingNetworkManager } from './onboarding-network-manager';
import { validateOnboardingState, validateStepCompletion } from './onboarding-validation';

// Before saving state
const validationResult = validateOnboardingState(state);
if (!validationResult.isValid) {
  throw new Error(`Invalid state: ${validationResult.errors.join(', ')}`);
}

// When offline
if (!networkManager.isNetworkOnline()) {
  networkManager.addToQueue('state', this.currentState);
  return;
}
```

### Frontend Integration
```javascript
// In step1-integrations-handler.js
handleConnectionError(event) {
  const errorInfo = this.classifyIntegrationError(integration, error);
  showToast(errorInfo.userMessage, 'error');
  if (errorInfo.shouldShowRetry) {
    this.showRetryButton(integration, errorInfo);
  }
}

// In step2-circles-handler.js
async fetchAISuggestions() {
  try {
    // Add 30-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    // ... fetch with signal: controller.signal
  } catch (error) {
    if (error.name === 'AbortError') {
      this.showAIServiceWarning('timeout');
    }
  }
}

// In manage-circles-flow.js
async handleCircleAssignment(contactId, circleId) {
  const validationResult = this.validateCircleAssignment(contactId, circleId);
  if (!validationResult.isValid) {
    showToast(validationResult.errors[0], 'error');
    return;
  }
  // ... proceed with assignment
}
```

---

## Testing Recommendations

### Manual Testing

#### 1. Storage Fallbacks
- Disable localStorage in browser settings
- Verify sessionStorage is used
- Disable both, verify memory storage works
- Check appropriate user messages are shown

#### 2. Network Errors
- Disconnect network during onboarding
- Verify offline indicator appears
- Make changes while offline
- Reconnect and verify sync occurs
- Check "All changes synced" message

#### 3. API Errors
- Simulate 500 error from backend
- Verify retry button appears
- Click retry and verify it works
- Simulate timeout (delay response >30s)
- Verify timeout message and retry

#### 4. Validation
- Try to assign invalid circle value
- Verify error message
- Assign contacts to exceed capacity
- Verify warning message
- Try to mark step complete without requirements
- Verify validation prevents it

### Automated Testing

```typescript
// Example test for validation
describe('OnboardingValidator', () => {
  it('should validate circle assignment', () => {
    const result = validateCircleAssignment(123, 'inner');
    expect(result.isValid).toBe(true);
    
    const invalid = validateCircleAssignment(-1, 'invalid');
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toContain('Invalid contact ID');
  });
  
  it('should warn about capacity', () => {
    const result = validateCircleCapacity('inner', 15);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

---

## Error Recovery Flows

### Integration Connection Failure
1. User clicks "Connect Google Calendar"
2. OAuth popup blocked or fails
3. Error classified as retryable
4. User sees: "Please allow popups and try again"
5. Retry button appears
6. User clicks retry
7. Connection succeeds

### Offline During Onboarding
1. User assigns contacts to circles
2. Network disconnects
3. Offline indicator appears: "You're offline"
4. Changes queued locally
5. User continues working
6. Network reconnects
7. Indicator shows: "Syncing 5 changes..."
8. Sync completes: "All changes synced successfully"

### AI Service Timeout
1. User opens Manage Circles flow
2. AI suggestions request times out (>30s)
3. User sees: "AI suggestions temporarily unavailable"
4. Contact grid shows without AI suggestions
5. User can still manually assign circles
6. Onboarding continues normally

### Validation Error
1. User tries to assign contact to invalid circle
2. Validation catches error before API call
3. User sees: "Invalid circle: xyz"
4. Assignment is blocked
5. User selects valid circle
6. Assignment succeeds

---

## Configuration

### Timeouts
```typescript
// In onboarding-error-handler.ts
DEFAULT_TIMEOUT = 30000; // 30 seconds

// In step2-circles-handler.js
const timeoutId = setTimeout(() => controller.abort(), 30000);
```

### Retry Settings
```typescript
// In onboarding-network-manager.ts
MAX_RETRIES = 3;
RETRY_DELAY_MS = 2000; // Exponential backoff: 2s, 4s, 8s
```

### Circle Capacities
```typescript
// In onboarding-validation.ts
const capacities = {
  inner: 10,
  close: 25,
  active: 50,
  casual: 100,
};
```

---

## Future Enhancements

1. **Persistent Retry Queue**: Store sync queue in IndexedDB for persistence across sessions
2. **Conflict Resolution**: Handle conflicts when syncing stale data
3. **Batch Validation**: Validate multiple assignments at once
4. **Custom Error Pages**: Dedicated error pages for critical failures
5. **Error Analytics**: Track error rates and types for monitoring
6. **Progressive Enhancement**: Detect slow connections and adjust timeouts
7. **Offline Mode**: Full offline support with background sync API

---

## Related Documentation

- [Onboarding State Manager README](../../../src/contacts/ONBOARDING_STATE_MANAGER_README.md)
- [Requirements Document](../../../.kiro/specs/contact-onboarding/requirements.md)
- [Design Document](../../../.kiro/specs/contact-onboarding/design.md)
- [Tasks Document](../../../.kiro/specs/contact-onboarding/tasks.md)

---

## Summary

Task 13 "Error handling and edge cases" has been successfully implemented with:

✅ **13.1 localStorage Fallbacks**: Complete fallback chain with user messaging  
✅ **13.2 Network Error Handling**: Offline detection, sync queue, and visual indicators  
✅ **13.3 API Error Handling**: Comprehensive error classification and retry logic  
✅ **13.4 Validation**: Full validation for all onboarding operations  

The implementation ensures the onboarding experience is robust, reliable, and user-friendly even in adverse conditions like network failures, storage limitations, or API errors.
