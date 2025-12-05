# Onboarding Step Indicator - Quick Reference

## Quick Start

### Initialize the Indicator
```javascript
// In app.js - already integrated
function initializeOnboardingIndicator() {
  const savedState = OnboardingStepIndicator.loadState();
  onboardingIndicator = new OnboardingStepIndicator(savedState);
  onboardingIndicator.mount(document.getElementById('onboarding-indicator-container'));
}
```

### Update Onboarding Progress
```javascript
// Mark Step 1 complete (both integrations connected)
onboardingIndicator.updateState({
  currentStep: 2,
  steps: {
    ...onboardingIndicator.state.steps,
    integrations: {
      complete: true,
      googleCalendar: true,
      googleContacts: true
    }
  }
});

// Mark Step 2 complete (50%+ contacts categorized)
onboardingIndicator.updateState({
  currentStep: 3,
  steps: {
    ...onboardingIndicator.state.steps,
    circles: {
      complete: true,
      contactsCategorized: 60,
      totalContacts: 100
    }
  }
});

// Mark Step 3 complete (all mappings reviewed)
onboardingIndicator.updateState({
  steps: {
    ...onboardingIndicator.state.steps,
    groups: {
      complete: true,
      mappingsReviewed: 5,
      totalMappings: 5
    }
  }
});
```

## Step Navigation

### Step 1: Connect Accounts
- **Destination**: Preferences page
- **Hash**: `#preferences`
- **Highlights**: Google Calendar and Contacts sections

### Step 2: Organize Circles
- **Destination**: Directory > Circles tab
- **Hash**: `#directory/circles`
- **Action**: Auto-opens Manage Circles flow

### Step 3: Review Groups
- **Destination**: Directory > Groups tab
- **Hash**: `#directory/groups`
- **Action**: Displays group mapping suggestions

## State Management

### State Structure
```javascript
{
  isComplete: false,           // Hide indicator when true
  currentStep: 1,              // 1, 2, or 3
  dismissedAt: null,           // ISO timestamp when dismissed
  steps: {
    integrations: {
      complete: false,
      googleCalendar: false,
      googleContacts: false
    },
    circles: {
      complete: false,
      contactsCategorized: 0,
      totalContacts: 0
    },
    groups: {
      complete: false,
      mappingsReviewed: 0,
      totalMappings: 0
    }
  }
}
```

### Storage Locations
1. **Primary**: `localStorage.getItem('catchup-onboarding')`
2. **Fallback**: `sessionStorage.getItem('catchup-onboarding')`
3. **Last Resort**: `window.__onboardingState`

## Events

### Listen for Step Clicks
```javascript
window.addEventListener('onboarding-step-clicked', (e) => {
  console.log('User clicked step:', e.detail.step);
  // Track analytics, etc.
});
```

### Listen for Dismiss
```javascript
window.addEventListener('onboarding-dismissed', (e) => {
  console.log('Onboarding dismissed:', e.detail.state);
  // Track dismissal, show alternative onboarding, etc.
});
```

### Listen for Resume
```javascript
window.addEventListener('onboarding-resumed', (e) => {
  console.log('Onboarding resumed:', e.detail.state);
  // Track resumption, show welcome back message, etc.
});
```

## Styling

### CSS Custom Properties Used
```css
--bg-surface          /* Card background */
--bg-hover            /* Hover state */
--bg-active           /* Active state */
--text-primary        /* Primary text */
--text-secondary      /* Secondary text */
--text-tertiary       /* Tertiary text */
--text-inverse        /* Inverse text (on accent) */
--border-subtle       /* Subtle borders */
--accent-primary      /* Primary accent color */
--accent-hover        /* Accent hover state */
--accent-subtle       /* Subtle accent background */
--status-success      /* Success color */
```

### Key Classes
```css
.onboarding-indicator              /* Main container */
.onboarding-step--complete         /* Completed step */
.onboarding-step--active           /* Active step */
.onboarding-step--incomplete       /* Incomplete step */
.onboarding-resume-btn             /* Resume button */
```

## Common Tasks

### Check if Onboarding is Complete
```javascript
if (onboardingIndicator && onboardingIndicator.state.isComplete) {
  // Onboarding is complete
}
```

### Get Current Step
```javascript
const currentStep = onboardingIndicator.state.currentStep;
```

### Manually Trigger Dismiss
```javascript
onboardingIndicator.handleDismiss();
```

### Manually Trigger Resume
```javascript
onboardingIndicator.handleResume();
```

### Reset Onboarding
```javascript
localStorage.removeItem('catchup-onboarding');
sessionStorage.removeItem('catchup-onboarding');
delete window.__onboardingState;
location.reload();
```

## Testing

### Test File Location
`public/js/onboarding-step-indicator.test.html`

### Run Tests
1. Open test file in browser
2. Click test buttons to verify functionality
3. Check console for event logs
4. Verify visual appearance matches design

### Manual Test Checklist
- [ ] Indicator appears in sidebar on login
- [ ] Step 1 click navigates to Preferences
- [ ] Step 2 click navigates to Directory/Circles
- [ ] Step 3 click navigates to Directory/Groups
- [ ] Dismiss button hides indicator and shows resume CTA
- [ ] Resume button restores indicator
- [ ] State persists across page refreshes
- [ ] Indicator hides when all steps complete
- [ ] Theme toggle updates colors correctly
- [ ] Mobile layout works (< 768px)

## Troubleshooting

### Indicator Not Showing
1. Check if onboarding is complete: `localStorage.getItem('catchup-onboarding')`
2. Verify container exists: `document.getElementById('onboarding-indicator-container')`
3. Check console for errors
4. Verify script is loaded: `typeof OnboardingStepIndicator`

### State Not Persisting
1. Check localStorage quota
2. Try sessionStorage fallback
3. Check browser privacy settings
4. Verify `saveState()` is being called

### Navigation Not Working
1. Verify `navigateTo()` function exists
2. Verify `switchDirectoryTab()` function exists
3. Check console for navigation errors
4. Verify hash changes in URL

### Styling Issues
1. Verify CSS file is loaded
2. Check theme is set: `document.documentElement.getAttribute('data-theme')`
3. Verify CSS custom properties are defined
4. Check for CSS conflicts

## Integration Points

### When to Update State

**Step 1 (Integrations)**:
- Update when Google Calendar connects
- Update when Google Contacts connects
- Mark complete when both are connected

**Step 2 (Circles)**:
- Update `totalContacts` when contacts load
- Update `contactsCategorized` when contacts assigned to circles
- Mark complete when >= 50% categorized

**Step 3 (Groups)**:
- Update `totalMappings` when mappings load
- Update `mappingsReviewed` when mappings accepted/rejected
- Mark complete when all mappings reviewed

### Example Integration
```javascript
// In Google Calendar connection handler
async function handleGoogleCalendarConnect() {
  // ... connection logic ...
  
  if (onboardingIndicator) {
    const state = onboardingIndicator.state;
    state.steps.integrations.googleCalendar = true;
    
    // Check if both integrations complete
    if (state.steps.integrations.googleCalendar && 
        state.steps.integrations.googleContacts) {
      state.steps.integrations.complete = true;
      state.currentStep = 2;
    }
    
    onboardingIndicator.updateState(state);
  }
}
```

## Files Reference

- **Component**: `public/js/onboarding-step-indicator.js`
- **Styles**: `public/css/onboarding-indicator.css`
- **Integration**: `public/js/app.js`
- **HTML**: `public/index.html`
- **Tests**: `public/js/onboarding-step-indicator.test.html`
- **Docs**: `docs/features/onboarding/ONBOARDING_STEP_INDICATOR_IMPLEMENTATION.md`
