# Test Mode UI Implementation

## Overview

This document describes the test mode UI logic implementation for Google SSO authentication. The UI dynamically shows or hides email/password authentication based on the backend test mode configuration.

## Requirements

- **3.1**: Add logic to show/hide email/password form based on test mode
- **3.2**: Fetch test mode status from backend on page load
- **3.2**: Display test mode indicator when enabled
- **3.2**: Ensure Google SSO button is always visible

## Implementation

### Backend Endpoint

The backend provides a `/api/auth/test-mode` endpoint that returns:

```json
{
  "enabled": true,
  "message": "Test mode is enabled. Both Google SSO and email/password authentication are available."
}
```

### Frontend Logic

The `google-sso.js` file implements the test mode UI logic:

#### 1. Check Test Mode Status

The `checkTestMode()` function is called when the authentication screen is shown:

```javascript
async function checkTestMode() {
    const response = await fetch('/api/auth/test-mode');
    const data = await response.json();
    
    googleSSOState.testModeEnabled = data.enabled || false;
    
    // Show/hide email/password form
    const emailAuthForm = document.getElementById('email-auth-form');
    if (emailAuthForm) {
        emailAuthForm.style.display = data.enabled ? 'block' : 'none';
    }
    
    // Update test mode indicator
    updateTestModeIndicator(data.enabled);
}
```

#### 2. Update Test Mode Indicator

The `updateTestModeIndicator()` function shows or hides the test mode notice:

```javascript
function updateTestModeIndicator(enabled) {
    const testModeNotice = document.querySelector('.test-mode-notice');
    if (testModeNotice) {
        testModeNotice.style.display = enabled ? 'block' : 'none';
    }
}
```

### HTML Structure

The authentication screen has the following structure:

```html
<div id="auth-screen" class="auth-container hidden">
    <h2 id="auth-title">Welcome to CatchUp</h2>
    
    <!-- Google SSO Button (Always Visible) -->
    <button id="google-sso-btn" class="google-sso-button">
        Sign in with Google
    </button>
    
    <!-- Email/Password Form (Only in Test Mode) -->
    <div id="email-auth-form" style="display: none;">
        <div class="auth-divider">
            <span>OR</span>
        </div>
        
        <form id="auth-form">
            <!-- Email and password inputs -->
        </form>
        
        <p class="test-mode-notice">🧪 Test Mode Enabled</p>
    </div>
</div>
```

**Key Points:**

1. The Google SSO button is **outside** the `email-auth-form` div, ensuring it's always visible
2. The entire `email-auth-form` div (including the test mode notice) is hidden when test mode is disabled
3. The test mode notice is only visible when test mode is enabled

## Behavior

### Test Mode Enabled (TEST_MODE=true)

- ✅ Google SSO button is visible
- ✅ Email/password form is visible
- ✅ "OR" divider is visible
- ✅ Test mode notice "🧪 Test Mode Enabled" is visible
- ✅ Users can authenticate with either Google SSO or email/password

### Test Mode Disabled (TEST_MODE=false or not set)

- ✅ Google SSO button is visible
- ❌ Email/password form is hidden
- ❌ "OR" divider is hidden
- ❌ Test mode notice is hidden
- ✅ Users can only authenticate with Google SSO

## Testing

A test file is available at `public/js/google-sso-test-mode.test.html` that:

1. Fetches the actual test mode status from the backend
2. Simulates both test mode enabled and disabled states
3. Validates that all requirements are met
4. Provides a visual demonstration of the UI behavior

To run the test:

1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:3000/js/google-sso-test-mode.test.html`
3. Verify all tests pass

## Error Handling

If the test mode status check fails:

- The email/password form is **hidden** by default (production mode)
- The test mode indicator is hidden
- An error is logged to the console
- The Google SSO button remains visible and functional

This ensures that in case of errors, the system defaults to the more secure production mode (Google SSO only).

## Integration

The test mode check is automatically triggered when:

1. The page loads and the user is not authenticated
2. The authentication screen is shown via `showAuthScreen()`
3. The `initGoogleSSO()` function is called

No manual intervention is required - the UI automatically adapts to the backend test mode configuration.
