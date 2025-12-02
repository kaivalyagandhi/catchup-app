# Google SSO Frontend Implementation

## Overview

This document describes the frontend implementation of Google Single Sign-On (SSO) authentication for CatchUp. The implementation provides a seamless OAuth 2.0 authentication flow with Google Identity Services.

## Files

### 1. `google-sso.js`
Main JavaScript module handling Google SSO functionality.

**Key Functions:**
- `initGoogleSSO()` - Initialize Google SSO on page load
- `handleGoogleLogin()` - Handle Google SSO button click
- `handleGoogleCallback()` - Process OAuth callback from Google
- `checkTestMode()` - Check if test mode is enabled
- `setGoogleSSOLoading()` - Manage loading states
- `displayGoogleSSOError()` - Display error messages
- `clearGoogleSSOError()` - Clear error messages

### 2. `google-sso.test.html`
Test page for verifying Google SSO functionality.

**Test Cases:**
1. Button rendering with Google branding
2. Loading state during authentication
3. Error message display
4. Success message display
5. API integration testing

## UI Components

### Google SSO Button

The button follows Google's branding guidelines:
- Google logo (SVG)
- "Sign in with Google" text
- White background with subtle border
- Hover and active states
- Loading state with spinner
- Disabled state

```html
<button id="google-sso-btn" class="google-sso-button" type="button">
    <svg class="google-logo">...</svg>
    <span>Sign in with Google</span>
</button>
```

### Message Elements

**Error Messages:**
```html
<div id="google-sso-error" class="error hidden"></div>
```

**Success Messages:**
```html
<div id="google-sso-success" class="success hidden"></div>
```

**Loading Messages:**
```html
<div id="google-sso-loading" class="info-message hidden"></div>
```

### Test Mode UI

When test mode is enabled, the email/password form is shown:

```html
<div id="email-auth-form" style="display: none;">
    <div class="auth-divider">
        <span>OR</span>
    </div>
    <!-- Email/password form -->
    <p class="test-mode-notice">🧪 Test Mode Enabled</p>
</div>
```

## Authentication Flow

### 1. Initialization
```javascript
// Called when auth screen is shown
initGoogleSSO()
  ├─ Set up button event listener
  ├─ Check test mode status
  └─ Handle OAuth callback if present
```

### 2. Login Flow
```javascript
// User clicks "Sign in with Google"
handleGoogleLogin()
  ├─ Set loading state
  ├─ Fetch authorization URL from backend
  └─ Redirect to Google authorization page
```

### 3. Callback Flow
```javascript
// Google redirects back with code
handleGoogleCallback()
  ├─ Extract code and state from URL
  ├─ Send to backend for token exchange
  ├─ Store auth token and user data
  ├─ Clear URL parameters
  └─ Redirect to main app
```

## State Management

The module maintains state in the `googleSSOState` object:

```javascript
let googleSSOState = {
    isLoading: false,        // Loading state
    testModeEnabled: false,  // Test mode status
    error: null              // Current error message
};
```

## API Integration

### Check Test Mode
```javascript
GET /api/auth/google/status
Response: { testMode: boolean }
```

### Get Authorization URL
```javascript
GET /api/auth/google/authorize
Response: { authorizationUrl: string }
```

### Handle Callback
```javascript
GET /api/auth/google/callback?code=...&state=...
Response: { token: string, user: { id, email } }
```

## CSS Styling

### Button Styles
- Follows Google's design guidelines
- Responsive to hover, active, and disabled states
- Dark theme support
- Loading spinner animation

### Layout
- Centered auth container
- Maximum width: 400px
- Responsive padding and margins
- Mobile-friendly

### Theme Support
The implementation supports both light and dark themes:
- Light theme: White button with dark text
- Dark theme: Dark button with light text
- Smooth transitions between themes

## Error Handling

### Error Display
Errors are displayed in multiple locations:
1. `#google-sso-error` - Dedicated Google SSO error div
2. `#auth-error` - General auth error div (fallback)

### Error Types
- Configuration errors (missing credentials)
- Network errors (API unavailable)
- OAuth errors (invalid code, state mismatch)
- Token validation errors

### User-Friendly Messages
All errors are translated to user-friendly messages:
- "Failed to start Google sign-in. Please try again."
- "Failed to complete sign-in. Please try again."
- "Missing authorization code or state"

## Loading States

### Visual Feedback
1. **Button Loading State:**
   - Disabled button
   - Spinner icon
   - "Signing in..." text

2. **Loading Message:**
   - Info message box
   - "Completing sign-in with Google..."

3. **Success State:**
   - Success message
   - Brief delay before redirect

## Test Mode

### Detection
Test mode is detected by calling `/api/auth/google/status` on initialization.

### UI Changes
- **Test Mode Enabled:** Show both Google SSO and email/password
- **Test Mode Disabled:** Show only Google SSO button

### Visual Indicator
When test mode is enabled, a notice is displayed:
```
🧪 Test Mode Enabled
```

## Integration with Main App

### Initialization
The `initGoogleSSO()` function is called from `app.js` when the auth screen is shown:

```javascript
function showAuthScreen() {
    // ... show auth screen
    if (typeof initGoogleSSO === 'function') {
        initGoogleSSO();
    }
}
```

### OAuth Callback Handling
The callback is handled automatically when the page loads with OAuth parameters in the URL.

### Token Storage
After successful authentication:
1. JWT token stored in `localStorage.authToken`
2. User ID stored in `localStorage.userId`
3. User email stored in `localStorage.userEmail`

## Testing

### Manual Testing
1. Open `http://localhost:3000/js/google-sso.test.html`
2. Test each component:
   - Button rendering
   - Loading states
   - Error display
   - Success display
   - API integration

### Integration Testing
1. Start the backend server
2. Navigate to the login page
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Verify successful authentication

### Test Mode Testing
1. Set `TEST_MODE=true` in environment
2. Verify email/password form is visible
3. Verify test mode notice is displayed
4. Set `TEST_MODE=false`
5. Verify only Google SSO button is visible

## Browser Compatibility

The implementation is compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Security Considerations

1. **State Parameter:** CSRF protection via state parameter
2. **Token Storage:** Tokens stored in localStorage (consider httpOnly cookies for production)
3. **URL Cleanup:** OAuth parameters cleared from URL after processing
4. **Error Messages:** No sensitive information exposed in error messages

## Future Enhancements

1. **Remember Me:** Optional persistent authentication
2. **Account Linking:** Link Google account to existing email/password account
3. **Profile Picture:** Display user's Google profile picture
4. **Multi-Account:** Support multiple Google accounts
5. **Offline Support:** Handle offline scenarios gracefully

## Troubleshooting

### Button Not Appearing
- Check if `google-sso.js` is loaded
- Verify HTML structure includes button element
- Check browser console for errors

### OAuth Callback Fails
- Verify redirect URI matches Google Cloud Console
- Check backend logs for errors
- Ensure state parameter is valid

### Test Mode Not Working
- Verify backend is running
- Check `/api/auth/google/status` endpoint
- Verify `TEST_MODE` environment variable

### Styling Issues
- Check CSS is loaded correctly
- Verify theme variables are defined
- Test in different browsers

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs
3. Test with `google-sso.test.html`
4. Verify environment configuration
