# Manual Test Files

This directory contains HTML and JavaScript files for manual testing and verification of CatchUp features. These test files allow you to test UI components, features, and integrations in isolation without running the full application.

## Directory Structure

### Root Level
Component and feature test files organized by functionality:
- **UI Components**: `*-ui.test.html`, `*-manager.test.html`
- **Features**: `*-features.test.html`, `*-flow.test.html`
- **Integrations**: `google-*.test.html`, `*-integration.test.html`
- **Onboarding**: `onboarding-*.test.html`
- **Voice Notes**: `audio-*.test.html`, `recording-*.test.html`, `transcript-*.test.html`
- **Circular Visualizer**: `circular-visualizer*.test.html`

### `/archive`
Historical test files from previous features and styling iterations. These are kept for reference but may not reflect current implementation.

### `/components`
Isolated component tests for debugging specific UI elements:
- Search functionality tests
- Navigation and tab tests
- Table and list components
- Theme toggle tests
- Sorting and filtering tests

### `/dashboards`
Monitoring and testing dashboards:
- `sms-monitoring-dashboard.html` - SMS/MMS message monitoring
- `test-dashboard.html` - General testing dashboard
- `twilio-testing.html` - Twilio integration testing

### `/features`
Feature-level integration tests:
- Contact management (add, edit, inline editing)
- Groups and circles management
- Tags and member management
- Mobile responsive tests
- Directory page tests

### `/integrations`
Third-party integration tests:
- Google integrations (Calendar, Speech, Mappings)
- Twilio (SMS/MMS, webhooks)
- Circles integration
- Enrichment flow tests

## How to Use Manual Test Files

### Basic Usage

1. **Start the development server** (if testing features that require backend):
   ```bash
   npm run dev
   ```

2. **Open the test file** in your browser:
   - **Option A**: Navigate directly to the file
     ```
     http://localhost:3000/tests/html/[filename].test.html
     ```
   - **Option B**: Open the file directly in your browser (for standalone tests)
     ```
     file:///path/to/catchup-app/tests/html/[filename].test.html
     ```

3. **Follow instructions** in the file:
   - Most test files include on-screen instructions
   - Check browser console for additional output
   - Look for comments in the HTML source for detailed guidance

### Testing Workflows

#### Testing a UI Component
```bash
# Example: Testing the circular visualizer
1. Open: http://localhost:3000/tests/html/circular-visualizer-v2.test.html
2. Verify: Contacts appear in circles
3. Test: Drag contacts between circles
4. Check: Console for any errors
```

#### Testing an Integration
```bash
# Example: Testing Google SSO
1. Ensure backend is running: npm run dev
2. Open: http://localhost:3000/tests/html/google-sso.test.html
3. Click: "Sign in with Google" button
4. Verify: OAuth flow completes successfully
5. Check: Console for token and user data
```

#### Testing Mobile Responsiveness
```bash
# Example: Testing mobile layout
1. Open: http://localhost:3000/tests/html/mobile-responsive.test.html
2. Open DevTools: F12 or Cmd+Option+I
3. Toggle device toolbar: Cmd+Shift+M (Mac) or Ctrl+Shift+M (Windows)
4. Test: Different device sizes
5. Verify: Layout adapts correctly
```

### Test File Types

#### Component Tests (`*-ui.test.html`, `*-manager.test.html`)
- **Purpose**: Test individual UI components in isolation
- **Requirements**: Usually standalone, may need backend for data
- **What to test**: Visual appearance, interactions, state changes
- **Example**: `enrichment-panel.test.html` tests the enrichment review panel

#### Feature Tests (`*-features.test.html`, `*-flow.test.html`)
- **Purpose**: Test complete feature workflows
- **Requirements**: Backend server running
- **What to test**: End-to-end user flows, data persistence
- **Example**: `manage-circles-flow.test.html` tests the circle management workflow

#### Integration Tests (`google-*.test.html`, `*-integration.test.html`)
- **Purpose**: Test third-party service integrations
- **Requirements**: Backend server + API credentials configured
- **What to test**: OAuth flows, API calls, data sync
- **Example**: `google-contacts.test.html` tests Google Contacts import

#### Dashboard Tests (`dashboards/*.html`)
- **Purpose**: Monitor and debug system behavior
- **Requirements**: Backend server running
- **What to test**: Real-time data, system status, API responses
- **Example**: `sms-monitoring-dashboard.html` monitors incoming SMS messages

### Common Testing Patterns

#### Checking Console Output
Most test files log important information to the browser console:
```javascript
// Open DevTools Console (F12)
// Look for:
console.log('✓ Test passed');
console.error('✗ Test failed');
console.warn('⚠ Warning');
```

#### Testing with Mock Data
Some test files include mock data for testing without a backend:
```javascript
// Look for mock data in the HTML file
const mockContacts = [
  { id: 1, name: 'John Doe', circle: 'inner' },
  // ...
];
```

#### Testing Error Handling
Test files often include error scenarios:
```javascript
// Look for error testing sections
// Try invalid inputs, network failures, etc.
```

### Troubleshooting

#### Test file won't load
- **Check**: Is the development server running? (`npm run dev`)
- **Check**: Is the file path correct?
- **Try**: Opening the file directly in the browser (for standalone tests)

#### Features don't work
- **Check**: Browser console for errors
- **Check**: Network tab in DevTools for failed API calls
- **Verify**: Backend server is running and accessible
- **Verify**: Required environment variables are set

#### Styling looks wrong
- **Check**: CSS files are loading (Network tab)
- **Try**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- **Verify**: You're testing the correct version of the file

#### Integration tests fail
- **Verify**: API credentials are configured in `.env`
- **Check**: API quotas and rate limits
- **Check**: Network connectivity to external services
- **Review**: Console and network logs for specific errors

## Best Practices

### When to Use Manual Tests

- **During development**: Test new features in isolation
- **Debugging**: Isolate and reproduce specific issues
- **Visual verification**: Check UI appearance and interactions
- **Integration testing**: Verify third-party service connections
- **Regression testing**: Manually verify fixes don't break existing features

### When to Write Automated Tests

For repetitive testing and CI/CD, write automated tests instead:
- Unit tests: `src/**/*.test.ts`
- Integration tests: `tests/integration/`
- See: `.kiro/steering/testing-guide.md` for testing conventions

## Related Documentation

- **Testing Guide**: `.kiro/steering/testing-guide.md` - Testing conventions and patterns
- **API Reference**: `docs/API.md` - API endpoints for integration tests
- **Feature Docs**: `docs/features/` - Detailed feature documentation
- **Examples**: `docs/examples/` - Code examples for reference

## Contributing

When adding new manual test files:

1. **Use descriptive names**: `feature-name.test.html` or `component-name-ui.test.html`
2. **Include instructions**: Add on-screen instructions and comments
3. **Log to console**: Use `console.log()` for test results and debugging
4. **Test in isolation**: Minimize dependencies on other features
5. **Document requirements**: Note if backend or API credentials are needed
6. **Place in correct directory**: Use subdirectories for organization
