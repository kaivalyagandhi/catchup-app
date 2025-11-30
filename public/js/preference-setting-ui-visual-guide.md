# Preference Setting UI - Visual Guide

## Component Overview

The Preference Setting UI provides a clean, progressive interface for setting contact frequency preferences during onboarding.

## Visual States

### 1. Active Contact Card

```
┌─────────────────────────────────────────────────────────────┐
│  Set Contact Preferences                                     │
│  How often would you like to stay in touch with your        │
│  closest contacts?                                           │
│                                                              │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  2 of 5 contacts                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ┌──┐                                                        │
│  │AB│  Alice Brown                                          │
│  └──┘  Inner Circle                                         │
│                                                              │
│  How often would you like to stay in touch with Alice?      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Daily - Check in every day                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● Weekly - Once a week [Recommended]                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Bi-weekly - Every two weeks                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Monthly - Once a month                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Quarterly - Every 3 months                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Yearly - Once a year                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Skip (Use Default)              [Save & Next]              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  [Skip All (Use Defaults)]                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Empty State

```
┌─────────────────────────────────────────────────────────────┐
│  Set Contact Preferences                                     │
│  How often would you like to stay in touch with your        │
│  closest contacts?                                           │
│                                                              │
│  ████████████████████████████████████████████████████████  │
│  0 of 0 contacts                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                          ✓                                   │
│                                                              │
│              No Preferences to Set                           │
│                                                              │
│  You don't have any contacts in your Inner Circle or        │
│  Close Friends yet.                                          │
│                                                              │
│  Preferences will be set automatically when you assign       │
│  contacts to these circles.                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                    [Complete]                │
└─────────────────────────────────────────────────────────────┘
```

### 3. Completion State

```
┌─────────────────────────────────────────────────────────────┐
│  Set Contact Preferences                                     │
│  How often would you like to stay in touch with your        │
│  closest contacts?                                           │
│                                                              │
│  ████████████████████████████████████████████████████████  │
│  5 of 5 contacts                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                          🎉                                  │
│                                                              │
│                  Preferences Set!                            │
│                                                              │
│  You've completed setting preferences for your closest       │
│  contacts.                                                   │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │    3     │    │    2     │    │    5     │             │
│  │ Custom   │    │ Using    │    │  Total   │             │
│  │Preferences│   │ Defaults │    │ Contacts │             │
│  └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
│  You can always update these preferences later from the      │
│  contact details page.                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                    [Complete]                │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Header
- Background: Purple gradient (#667eea → #764ba2)
- Text: White
- Progress bar: White on semi-transparent white

### Contact Card
- Background: White
- Border: Light gray (#e5e7eb)
- Avatar: Dynamic color based on contact name

### Frequency Options
- Default: Light gray border (#e5e7eb)
- Hover: Purple border (#667eea), light gray background
- Selected: Purple border (#667eea), light purple background (#eef2ff)
- Recommended: Green border (#10b981), light green background (#f0fdf4)

### Buttons
- Primary: Purple (#667eea)
- Secondary: Gray (#6b7280)
- Text: Transparent with gray text

## Interaction States

### Radio Button Selection

**Before Selection:**
```
┌─────────────────────────────────────────────────────┐
│ ○ Weekly - Once a week [Recommended]                │
└─────────────────────────────────────────────────────┘
```

**After Selection:**
```
┌─────────────────────────────────────────────────────┐
│ ● Weekly - Once a week [Recommended]                │  ← Purple background
└─────────────────────────────────────────────────────┘
```

### Hover States

**Button Hover:**
```
[Save & Next]  →  [Save & Next]  (slightly elevated, darker purple)
```

**Option Hover:**
```
┌─────────────────────────────────────────────────────┐
│ ○ Monthly - Once a month                            │  ← Purple border
└─────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (> 768px)
- Max width: 800px
- Centered layout
- Full-size buttons
- Spacious padding

### Tablet (768px - 480px)
- Full width with margins
- Slightly reduced padding
- Stacked buttons on narrow screens

### Mobile (< 480px)
- Full width
- Compact padding
- Touch-optimized tap targets (min 44px)
- Stacked layout

## Animation Details

### Progress Bar
- Smooth width transition (0.3s ease)
- Updates after each contact

### Card Transitions
- Fade in new contact (0.2s)
- Slide up slightly (0.2s)

### Button Interactions
- Hover: Slight elevation (translateY(-1px))
- Click: Brief scale down (0.95)

### Completion Celebration
- Emoji bounce animation
- Stats fade in sequentially

## Accessibility Features

### Keyboard Navigation
- Tab through frequency options
- Space/Enter to select
- Tab to buttons
- Enter to activate buttons

### Screen Reader Support
- ARIA labels on all interactive elements
- Progress announcements
- State change notifications
- Clear button labels

### Visual Indicators
- High contrast borders
- Clear focus states
- Color + text for status
- Icon + text for states

## Mobile Optimizations

### Touch Targets
- Minimum 44px × 44px
- Adequate spacing between options
- Large, easy-to-tap buttons

### Gestures
- Tap to select option
- Tap button to proceed
- No complex gestures required

### Performance
- Single contact rendering
- Minimal reflows
- Smooth animations
- Fast API calls

## Error States

### API Error
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Failed to save preference                                │
│  Please try again or skip to continue.                       │
│                                                              │
│  [Try Again]  [Skip]                                        │
└─────────────────────────────────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Connection lost                                          │
│  Check your internet connection and try again.               │
│                                                              │
│  [Retry]                                                    │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### UX Principles
1. **Progressive Disclosure**: One contact at a time
2. **Smart Defaults**: Recommended option highlighted
3. **Flexibility**: Skip individual or all
4. **Feedback**: Clear progress indication
5. **Completion**: Satisfying summary

### Performance
1. **Lazy Loading**: Load contacts as needed
2. **Debouncing**: Prevent rapid API calls
3. **Caching**: Store preferences locally
4. **Optimistic UI**: Update immediately, sync later

### Accessibility
1. **Keyboard First**: Full keyboard support
2. **Screen Readers**: Comprehensive ARIA labels
3. **High Contrast**: Works in high contrast mode
4. **Focus Management**: Clear focus indicators

## Integration Example

```javascript
// Initialize preference setting UI
const preferenceUI = new PreferenceSettingUI({
  container: document.getElementById('preference-container'),
  onSave: async (contactId, frequency) => {
    await api.setPreference(contactId, frequency);
  },
  onSkip: async (contactId, defaultFrequency) => {
    await api.setPreference(contactId, defaultFrequency);
  },
  onComplete: (summary) => {
    console.log('Completed:', summary);
    onboardingController.nextStep();
  }
});

// Load contacts
const contacts = await api.getContactsNeedingPreferences();
preferenceUI.initialize(contacts);
```

## Testing Checklist

- [ ] Load with 0 contacts (empty state)
- [ ] Load with 1 contact
- [ ] Load with 5+ contacts
- [ ] Select each frequency option
- [ ] Skip individual contact
- [ ] Skip all contacts
- [ ] Complete flow
- [ ] Test keyboard navigation
- [ ] Test screen reader
- [ ] Test on mobile
- [ ] Test error states
- [ ] Test slow network
- [ ] Test API failures

## Conclusion

The Preference Setting UI provides a polished, accessible, and user-friendly experience for setting contact frequency preferences. The progressive flow, smart defaults, and flexible skip options make it easy for users to customize their preferences while maintaining momentum through the onboarding process.
