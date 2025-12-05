# Error Handling Quick Reference

Quick reference for error handling in the Contact Onboarding feature.

## Storage Fallbacks

### Check Storage Status
```typescript
// Backend
const manager = getOnboardingStateManager();
const status = manager.getStorageStatus();
console.log(status.message);
```

### User Messages
- localStorage unavailable → "Progress saved to sessionStorage"
- Both unavailable → "Progress saved for this session only"
- All failed → "Unable to save progress"

## Network Errors

### Check Online Status
```typescript
const networkManager = getOnboardingNetworkManager();
const isOnline = networkManager.isNetworkOnline();
```

### Queue Updates When Offline
```typescript
networkManager.addToQueue('state', stateData);
networkManager.addToQueue('circle', { contactId, circle });
networkManager.addToQueue('mapping', mappingData);
```

### Get Queue Status
```typescript
const status = networkManager.getQueueStatus();
// { itemCount: 5, isSyncing: false, isOnline: true }
```

## API Error Handling

### Classify Errors
```typescript
import { classifyError } from './onboarding-error-handler';

try {
  await apiCall();
} catch (error) {
  const errorInfo = classifyError(error);
  if (errorInfo.isRetryable) {
    // Show retry button
  }
  showToast(errorInfo.userMessage, 'error');
}
```

### Integration Errors
```typescript
import { handleIntegrationError } from './onboarding-error-handler';

const errorInfo = handleIntegrationError('google-calendar', error);
```

### AI Service Errors (Graceful)
```typescript
import { handleAIServiceError } from './onboarding-error-handler';

const errorInfo = handleAIServiceError(error);
// Always returns isRetryable: false (don't block user)
```

### Retry with Backoff
```typescript
import { withRetry } from './onboarding-error-handler';

const result = await withRetry(
  () => fetch('/api/endpoint'),
  { maxRetries: 3, retryDelay: 2000, timeout: 30000 }
);
```

## Validation

### Validate Circle Assignment
```typescript
import { validateCircleAssignment } from './onboarding-validation';

const result = validateCircleAssignment(contactId, 'inner');
if (!result.isValid) {
  console.error(result.errors);
}
```

### Validate Onboarding State
```typescript
import { validateOnboardingState } from './onboarding-validation';

const result = validateOnboardingState(state);
if (!result.isValid) {
  throw new Error(result.errors.join(', '));
}
```

### Validate Circle Capacity
```typescript
import { validateCircleCapacity } from './onboarding-validation';

const result = validateCircleCapacity('inner', 15);
if (result.warnings.length > 0) {
  console.warn(result.warnings); // "Over capacity"
}
```

### Show Validation Errors
```typescript
import { showValidationErrors } from './onboarding-validation';

showValidationErrors(validationResult);
// Shows toast notifications for errors and warnings
```

## Error Types

| Type | Retryable | Action |
|------|-----------|--------|
| Network | ✅ | Queue for sync |
| Timeout | ✅ | Retry with backoff |
| 5xx | ✅ | Retry with backoff |
| 429 | ✅ | Retry with delay |
| 401/403 | ❌ | Prompt re-auth |
| 404 | ❌ | Show error |
| 400 | ❌ | Show error |

## Common Patterns

### Handle API Call with Full Error Handling
```typescript
async function safeApiCall() {
  // Check network
  const networkManager = getOnboardingNetworkManager();
  if (!networkManager.isNetworkOnline()) {
    networkManager.addToQueue('state', data);
    return;
  }
  
  try {
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('/api/endpoint', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    // Classify and handle
    const errorInfo = classifyError(error);
    
    if (errorInfo.isRetryable) {
      // Queue for retry
      networkManager.addToQueue('state', data);
    } else {
      // Show error to user
      showToast(errorInfo.userMessage, 'error');
    }
    
    throw error;
  }
}
```

### Validate Before Saving
```typescript
async function saveWithValidation(state) {
  // Validate
  const result = validateOnboardingState(state);
  
  if (!result.isValid) {
    showValidationErrors(result);
    throw new Error('Invalid state');
  }
  
  // Show warnings
  if (result.warnings.length > 0) {
    showValidationErrors(result);
  }
  
  // Save
  await stateManager.saveState(state);
}
```

## Debugging

### Enable Verbose Logging
```javascript
// In browser console
localStorage.setItem('debug-onboarding', 'true');
```

### Check Sync Queue
```javascript
// In browser console
const queue = localStorage.getItem('catchup-onboarding-sync-queue');
console.log(JSON.parse(queue));
```

### Check Storage Status
```javascript
// In browser console
try {
  localStorage.setItem('test', 'test');
  console.log('localStorage: available');
} catch (e) {
  console.log('localStorage: unavailable');
}
```

## Testing

### Simulate Offline
```javascript
// In browser DevTools
// Network tab → Throttling → Offline
```

### Simulate Slow Network
```javascript
// Network tab → Throttling → Slow 3G
```

### Simulate API Error
```javascript
// Network tab → Right-click request → Block request URL
```

### Clear Storage
```javascript
localStorage.clear();
sessionStorage.clear();
```

## Configuration

```typescript
// Timeouts
DEFAULT_TIMEOUT = 30000; // 30 seconds

// Retry
MAX_RETRIES = 3;
RETRY_DELAY_MS = 2000; // Exponential: 2s, 4s, 8s

// Capacities
INNER_CAPACITY = 10;
CLOSE_CAPACITY = 25;
ACTIVE_CAPACITY = 50;
CASUAL_CAPACITY = 100;
```
