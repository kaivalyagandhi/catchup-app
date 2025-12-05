# Manage Circles Flow Component

## Overview

The Manage Circles Flow is a modal interface for assigning contacts to 4 simplified social circles based on Dunbar's research and Aristotle's theory of friendship. It's used both during onboarding (Step 2) and post-onboarding from the Circles section.

## Features

### Core Functionality

1. **Educational Tips Panel**
   - Explains Dunbar's research on cognitive limits
   - References Aristotle's three types of friendship
   - Collapsible "Learn more" section with detailed explanations
   - Requirements: 7.1, 7.4

2. **Search Bar**
   - Real-time filtering of contact grid
   - Case-insensitive search
   - Shows "no results" message when empty
   - Requirements: 4.1, 4.2, 4.5

3. **Progress Tracking**
   - Displays "X/Y contacts categorized" label
   - Visual progress bar with percentage
   - Updates in real-time as contacts are assigned
   - Requirements: 9.1, 9.2

4. **Circle Capacities Display**
   - Shows 4 circles with names and capacities:
     - Inner Circle (up to 10)
     - Close Friends (up to 25)
     - Active Friends (up to 50)
     - Casual Network (up to 100)
   - Displays current count vs. capacity
   - Shows warning icon when over capacity
   - Requirements: 3.3, 10.1, 10.2, 10.3, 10.4, 10.5

5. **Contact Grid**
   - Responsive grid layout
   - Contact cards with avatars (warm pastel colors)
   - Circle selection dropdown for each contact
   - AI suggestions with confidence scores
   - Requirements: 4.3, 4.4, 6.1, 8.1, 8.2, 8.3, 18.1, 18.2

6. **Circle Assignment Logic**
   - Handles dropdown selection changes
   - Updates contact circle in state and database
   - Updates circle counts immediately
   - Emits events for progress tracking
   - Requirements: 3.5, 14.1, 14.2

7. **Save and Skip Actions**
   - "Save & Continue" button to complete Step 2
   - "Skip for Now" button to save progress
   - Shows success toast and prompts for Step 3
   - Requirements: 6.3, 6.4, 12.1

8. **Mobile Responsive Layout**
   - Single-column grid on mobile (<768px)
   - Stacked action buttons vertically
   - Adjusted spacing and sizing for touch
   - Requirements: 11.1, 11.2, 11.3, 11.4, 16.4

## Usage

### Basic Usage

```javascript
// Create instance with contacts and current assignments
const flow = new ManageCirclesFlow(contacts, currentAssignments, {
  onSave: (assignments) => {
    console.log('Saved assignments:', assignments);
  },
  onSkip: (assignments) => {
    console.log('Skipped with progress:', assignments);
  },
  onClose: () => {
    console.log('Modal closed');
  },
  isOnboarding: true // Set to true during onboarding
});

// Mount to DOM
flow.mount();
```

### During Onboarding (Step 2)

```javascript
// In Step 2 handler
const contacts = await fetchContacts();
const currentAssignments = await fetchCurrentAssignments();

const flow = new ManageCirclesFlow(contacts, currentAssignments, {
  isOnboarding: true,
  onSave: async (assignments) => {
    // Mark Step 2 complete
    await updateOnboardingState({
      'steps.circles.complete': true,
      currentStep: 3
    });
    
    // Navigate to Step 3
    navigateToStep3();
  }
});

flow.mount();
```

### Post-Onboarding (Manage Circles Button)

```javascript
// From Circles section "Manage Circles" button
document.getElementById('manage-circles-btn').addEventListener('click', async () => {
  const contacts = await fetchContacts();
  const currentAssignments = await fetchCurrentAssignments();
  
  const flow = new ManageCirclesFlow(contacts, currentAssignments, {
    isOnboarding: false,
    onSave: async (assignments) => {
      showToast('Circle assignments saved successfully', 'success');
      // Refresh circles visualization
      loadCirclesVisualization();
    }
  });
  
  flow.mount();
});
```

## API

### Constructor

```javascript
new ManageCirclesFlow(contacts, currentAssignments, options)
```

**Parameters:**
- `contacts` (Array): Array of contact objects
- `currentAssignments` (Object): Map of contactId → circleId
- `options` (Object):
  - `onSave` (Function): Callback when save button clicked
  - `onSkip` (Function): Callback when skip button clicked
  - `onClose` (Function): Callback when modal closed
  - `isOnboarding` (Boolean): Whether in onboarding mode

### Methods

#### `mount()`
Mounts the modal to the DOM and sets up event listeners.

#### `close()`
Closes the modal and cleans up.

#### `destroy()`
Destroys the component completely.

#### `refresh()`
Refreshes the modal content (progress, counts, grid).

#### `handleCircleAssignment(contactId, circleId)`
Handles assigning a contact to a circle.

#### `handleSave()`
Handles save and continue action.

#### `handleSkip()`
Handles skip for now action.

## Contact Object Structure

```javascript
{
  id: 1,
  name: 'Alice Johnson',
  circle: 'inner', // Current circle assignment
  dunbarCircle: 'inner', // Alternative property name
  circleAiSuggestion: 'close', // AI suggested circle
  circleAiConfidence: 85 // AI confidence (0-100)
}
```

## Circle Definitions

```javascript
[
  {
    id: 'inner',
    name: 'Inner Circle',
    capacity: 10,
    emoji: '💎',
    description: 'Your closest confidants—people you\'d call in a crisis',
    dunbarRange: '5-10',
    frequency: 'Weekly or more'
  },
  {
    id: 'close',
    name: 'Close Friends',
    capacity: 25,
    emoji: '🌟',
    description: 'Good friends you regularly share life updates with',
    dunbarRange: '15-25',
    frequency: 'Bi-weekly to monthly'
  },
  {
    id: 'active',
    name: 'Active Friends',
    capacity: 50,
    emoji: '✨',
    description: 'People you want to stay connected with regularly',
    dunbarRange: '30-50',
    frequency: 'Monthly to quarterly'
  },
  {
    id: 'casual',
    name: 'Casual Network',
    capacity: 100,
    emoji: '🤝',
    description: 'Acquaintances you keep in touch with occasionally',
    dunbarRange: '50-100',
    frequency: 'Quarterly to annually'
  }
]
```

## Events

The component emits the following custom events:

### `circle-assigned`
Fired when a contact is assigned to a circle.

```javascript
window.addEventListener('circle-assigned', (event) => {
  const { contactId, circle } = event.detail;
  console.log(`Contact ${contactId} assigned to ${circle}`);
});
```

## Backend API Endpoints

The component expects the following API endpoints:

### POST `/api/contacts/:id/circle`
Assign a contact to a circle.

**Request:**
```json
{
  "circle": "inner",
  "assignedBy": "user"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/contacts/circles/bulk`
Bulk assign contacts to circles.

**Request:**
```json
{
  "assignments": [
    { "contactId": 1, "circle": "inner" },
    { "contactId": 2, "circle": "close" }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

## Styling

The component uses the Stone & Clay design system with CSS custom properties:

- `--bg-surface`: Modal background
- `--bg-app`: Input backgrounds
- `--bg-secondary`: Section backgrounds
- `--text-primary`: Primary text
- `--text-secondary`: Secondary text
- `--text-tertiary`: Tertiary text
- `--border-subtle`: Borders
- `--accent-primary`: Primary accent color
- `--accent-subtle`: Subtle accent backgrounds

### Theme Support

The component supports both Latte (light) and Espresso (dark) themes through CSS custom properties. Theme changes are automatically applied.

## Testing

A test file is available at `public/js/manage-circles-flow.test.html` with the following tests:

1. Basic Modal Display
2. Search Functionality
3. Circle Assignment
4. Progress Tracking
5. AI Suggestions
6. Mobile Responsive
7. Save & Skip Actions

To run tests:
1. Open `public/js/manage-circles-flow.test.html` in a browser
2. Click test buttons to verify functionality
3. Resize window to test mobile responsiveness

## Accessibility

- Keyboard navigation supported (Tab, Enter, Escape)
- ARIA labels on interactive elements
- Focus management (auto-focus on search input)
- Screen reader friendly
- Touch-friendly sizing on mobile

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- Stone & Clay theme CSS
- Modern browser with ES6+ support
- Fetch API for backend communication

## Related Components

- `OnboardingStepIndicator`: Shows onboarding progress
- `OnboardingStateManager`: Manages onboarding state
- `CircularVisualizer`: Visualizes circles after assignment

## Requirements Coverage

This component implements the following requirements:

- 3.1, 3.3, 3.4, 3.5: Circle organization and navigation
- 4.1, 4.2, 4.3, 4.4, 4.5: Contact search and grid
- 6.1, 6.3, 6.4: Post-onboarding access
- 7.1, 7.4: Educational tips
- 8.1, 8.2, 8.3: AI suggestions
- 9.1, 9.2: Progress tracking
- 10.1, 10.2, 10.3, 10.4, 10.5: Circle capacities
- 11.1, 11.2, 11.3, 11.4: Mobile responsive
- 12.1: Skip functionality
- 14.1, 14.2: Circle counts
- 16.1, 16.4: Design system integration
- 18.1, 18.2: Contact card styling
