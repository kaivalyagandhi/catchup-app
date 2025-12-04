# Preference Setting UI

A user-friendly interface for setting contact frequency preferences during the onboarding process.

## Overview

The Preference Setting UI allows users to specify how often they want to stay in touch with their Inner Circle and Close Friends contacts. It provides smart defaults based on circle assignment, skip functionality, and batch operations.

## Features

- **Smart Defaults**: Automatically suggests frequency based on circle assignment
  - Inner Circle: Weekly
  - Close Friends: Bi-weekly
  - Active Friends: Monthly
  - Casual Network: Quarterly
  - Acquaintances: Yearly

- **Progressive Flow**: One contact at a time with clear progress tracking
- **Skip Options**: Skip individual contacts or all remaining contacts
- **Visual Feedback**: Clear indication of recommended frequencies
- **Completion Summary**: Shows statistics on custom vs. default preferences
- **Later Completion**: Allows users to complete preferences later without blocking progress

## Usage

### Basic Setup

```javascript
const preferenceUI = new PreferenceSettingUI({
  container: document.getElementById('preference-container'),
  onSave: async (contactId, frequency) => {
    // Save custom preference
    await savePreference(contactId, frequency);
  },
  onSkip: async (contactId, defaultFrequency) => {
    // Apply default preference
    await savePreference(contactId, defaultFrequency);
  },
  onComplete: (summary) => {
    // Handle completion
    console.log('Completed:', summary);
  }
});

// Initialize with contacts
const contacts = [
  { id: '1', name: 'Alice', circle: 'inner' },
  { id: '2', name: 'Bob', circle: 'close' }
];

preferenceUI.initialize(contacts);
```

### Integration with Onboarding

```javascript
const integration = new PreferenceSettingIntegration({
  container: document.getElementById('preference-container'),
  onboardingController: onboardingController,
  authToken: authToken,
  userId: userId
});

await integration.initialize();
```

## API Endpoints

### Set Single Preference

```
POST /api/circles/preferences/set
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactId": "contact-uuid",
  "frequency": "weekly"
}
```

### Batch Set Preferences

```
POST /api/circles/preferences/batch-set
Content-Type: application/json
Authorization: Bearer <token>

{
  "preferences": [
    { "contactId": "uuid-1", "frequency": "weekly" },
    { "contactId": "uuid-2", "frequency": "biweekly" }
  ]
}
```

### Get Preference

```
GET /api/circles/preferences/:contactId
Authorization: Bearer <token>

Response:
{
  "contactId": "contact-uuid",
  "frequency": "weekly"
}
```

## Frequency Options

- `daily` - Check in every day
- `weekly` - Once a week
- `biweekly` - Every two weeks
- `monthly` - Once a month
- `quarterly` - Every 3 months
- `yearly` - Once a year

## Component Structure

```
PreferenceSettingUI
├── Header
│   ├── Title & Subtitle
│   └── Progress Bar
├── Content
│   ├── Contact Card
│   │   ├── Avatar
│   │   ├── Contact Info
│   │   ├── Frequency Options
│   │   └── Actions (Skip/Save)
│   ├── Empty State
│   └── Completion State
└── Footer Actions
    ├── Skip All Button
    └── Complete Button
```

## State Management

The component maintains the following state:

- `contacts`: Array of contacts needing preferences
- `currentIndex`: Current contact being displayed
- `preferences`: Map of contactId -> frequency for custom preferences
- `skippedContacts`: Set of contactIds that were skipped (using defaults)

## Events

### onSave(contactId, frequency)

Called when user saves a custom preference for a contact.

**Parameters:**
- `contactId` (string): The contact's ID
- `frequency` (string): The selected frequency

**Returns:** Promise<void>

### onSkip(contactId, defaultFrequency)

Called when user skips a contact, applying the default frequency.

**Parameters:**
- `contactId` (string): The contact's ID
- `defaultFrequency` (string): The default frequency for the contact's circle

**Returns:** Promise<void>

### onComplete(summary)

Called when all contacts have been processed.

**Parameters:**
- `summary` (object):
  - `totalContacts` (number): Total number of contacts
  - `customPreferences` (number): Number of custom preferences set
  - `defaultPreferences` (number): Number of default preferences applied
  - `preferences` (object): Map of contactId -> frequency

**Returns:** void

## Methods

### initialize(contacts)

Initialize the UI with contacts that need preferences.

**Parameters:**
- `contacts` (Array): Array of contact objects with `id`, `name`, and `circle`

### reset()

Reset the UI to initial state, clearing all data.

### getAllPreferences()

Get all preferences including defaults for skipped contacts.

**Returns:** Object mapping contactId to frequency

## Styling

The component uses inline styles for portability. Key CSS classes:

- `.preference-setting-ui` - Main container
- `.preference-header` - Header with gradient background
- `.preference-card` - Individual contact card
- `.preference-option` - Frequency option radio button
- `.preference-option.recommended` - Recommended option (green border)
- `.preference-option.selected` - Selected option (purple border)

## Requirements Validation

This component satisfies the following requirements:

- **10.1**: Prompts for preferences when contacts are assigned to Inner Circle or Close Friends
- **10.2**: Offers smart defaults based on circle assignment
- **10.3**: Saves preferences for use in future contact suggestions
- **10.4**: Applies default preferences when user skips
- **10.5**: Allows later completion of incomplete preferences

## Testing

See `preference-setting-ui.test.html` for interactive testing:

```bash
# Open in browser
open public/js/preference-setting-ui.test.html
```

Test scenarios:
1. Load sample contacts (2 inner, 3 close)
2. Test empty state (no contacts)
3. Test completion state
4. Test skip functionality
5. Test save functionality

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Touch-optimized

## Accessibility

- Keyboard navigation supported
- ARIA labels on interactive elements
- Screen reader friendly
- High contrast mode compatible
- Focus indicators visible

## Performance

- Renders single contact at a time (no performance issues)
- Smooth animations with CSS transitions
- Minimal DOM manipulation
- Efficient event handling

## Future Enhancements

- [ ] Bulk edit mode for power users
- [ ] Custom frequency input (e.g., "every 10 days")
- [ ] Preference templates (e.g., "Close family", "Work friends")
- [ ] AI-suggested frequencies based on past interaction patterns
- [ ] Reminder preview ("You'll be reminded to contact Alice every week")
