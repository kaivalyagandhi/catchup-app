# Group Overlay and Filtering Guide

## Overview

The group overlay and filtering feature allows users to view and filter their contacts by group membership, providing insights into how groups relate to relationship strength (Dunbar circles).

## Features

### 1. Group Toggle

**Location**: Below the circle legend in the visualizer controls

**Usage**:
- Check the "Show Groups" checkbox to enable group view
- Uncheck to return to standard view

**What it does**:
- Shows/hides the group filter controls
- Enables group-based filtering and visualization

### 2. Group Filter Buttons

**Location**: Appears when group toggle is enabled

**Usage**:
- Click "All Contacts" to show all contacts (default)
- Click any group button to filter by that group
- Active filter is highlighted in purple

**Display**:
- Each button shows: `Group Name (Count)`
- Example: `Work (5)` means 5 contacts in the Work group

### 3. Visual Indicators

#### Group Badges
- **Location**: Top-left corner of contact dots
- **Single Group**: Purple circle badge
- **Multiple Groups**: Badge with number (e.g., "3" for 3 groups)
- **Color**: Purple (#6366f1) with white border

#### Dimming Effect
- When a filter is active, contacts NOT in the filtered group are dimmed
- Dimmed contacts: 20% opacity
- Filtered contacts: Full opacity

### 4. Group Distribution Panel

**Location**: Below the group filter buttons (when filter is active)

**Shows**:
- Group name and total contact count
- Breakdown across all 5 Dunbar circles
- Percentage and absolute count per circle
- Color-coded horizontal bars

**Example**:
```
Work Distribution (5 contacts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inner Circle:    1 (20%) ████████████
Close Friends:   2 (40%) ████████████████████████
Active Friends:  2 (40%) ████████████████████████
Casual Network:  0 (0%)  
Acquaintances:   0 (0%)  
```

### 5. Enhanced Tooltips

**Hover over any contact** to see:
- Contact name
- Email and phone (if available)
- **Group memberships** (new!)
- AI suggestions (if available)

**Group Display**:
- Shows all groups the contact belongs to
- Format: "Groups: Work, Friends, Family"
- Purple color for easy identification

## User Workflows

### Workflow 1: View Group Distribution

1. Check "Show Groups" toggle
2. Click a group filter button (e.g., "Work")
3. View the distribution panel to see how work contacts are spread across circles
4. Observe which circles have the most work contacts

**Use Case**: Understanding if work relationships are balanced across circles

### Workflow 2: Focus on a Specific Group

1. Enable group view
2. Select a group filter
3. Only contacts in that group are fully visible
4. Other contacts are dimmed but still visible for context
5. Drag contacts within the filtered view to reorganize

**Use Case**: Organizing all family members without distraction from other contacts

### Workflow 3: Identify Multi-Group Contacts

1. Enable group view
2. Look for contacts with numbered badges (e.g., "2", "3")
3. Hover over these contacts to see all their groups
4. These are your "bridge" contacts who span multiple social contexts

**Use Case**: Finding contacts who connect different parts of your life

### Workflow 4: Compare Group Distributions

1. Enable group view
2. Click "Work" filter, note the distribution
3. Click "Family" filter, note the distribution
4. Click "Friends" filter, note the distribution
5. Compare which groups are more concentrated in inner circles

**Use Case**: Understanding which groups you're closest to

## Technical Details

### Data Requirements

**Contact Object**:
```javascript
{
  id: "contact-123",
  name: "Alice Johnson",
  circle: "close",
  groups: ["work", "friends"],  // Array of group IDs
  email: "alice@example.com",
  phone: "+1234567890"
}
```

**Group Object**:
```javascript
{
  id: "work",
  name: "Work",
  description: "Work colleagues"
}
```

### API Usage

```javascript
// Initialize visualizer
const visualizer = new CircularVisualizer('container-id');

// Render with groups
visualizer.render(contacts, groups);

// Programmatically filter by group
visualizer.showGroupFilter('work');

// Clear filter
visualizer.clearGroupFilter();

// Get group contact count
const count = visualizer.getGroupContactCount('work');
```

### Events

The visualizer emits the same events when filtering:
- `contactDrag` - When a contact is dragged to a new circle
- `contactClick` - When a contact is clicked
- `batchDrag` - When multiple contacts are dragged

Filtering does not emit additional events.

## Design Principles

### 1. Progressive Disclosure
- Group features are hidden by default
- Users opt-in with the toggle
- Reduces visual clutter for users who don't need groups

### 2. Visual Hierarchy
- Active filter is clearly highlighted
- Filtered contacts are prominent
- Non-filtered contacts are dimmed but visible for context

### 3. Information Density
- Distribution panel provides detailed analytics
- Tooltips provide additional context on hover
- Badges provide at-a-glance group membership

### 4. Consistency
- Group colors (purple) used consistently
- Interaction patterns match existing visualizer behavior
- Animations are smooth and non-jarring

## Accessibility

### Keyboard Navigation
- Group toggle is keyboard accessible (Tab + Space/Enter)
- Filter buttons are keyboard accessible
- Standard focus indicators

### Screen Readers
- Group toggle has proper label
- Filter buttons have descriptive text
- Distribution panel has semantic structure

### Color Contrast
- Purple badges meet WCAG AA standards
- Text on badges is white for maximum contrast
- Dimmed contacts still visible (20% opacity)

## Performance

### Optimization Strategies
1. **Lazy Rendering**: Group filters only render when toggle is enabled
2. **Efficient Filtering**: O(n) filter operation, acceptable for typical contact counts
3. **CSS Animations**: Hardware-accelerated transitions
4. **Minimal DOM Updates**: Only re-render when necessary

### Expected Performance
- **100 contacts**: Instant filtering
- **500 contacts**: < 100ms filtering
- **1000 contacts**: < 200ms filtering

## Troubleshooting

### Groups Not Showing
- **Check**: Is the "Show Groups" toggle enabled?
- **Check**: Are groups passed to `render()` method?
- **Check**: Do contacts have `groups` array field?

### Filter Not Working
- **Check**: Are group IDs in contacts matching group objects?
- **Check**: Is `activeGroupFilter` set correctly?
- **Check**: Browser console for JavaScript errors

### Distribution Not Appearing
- **Check**: Is a filter active (not "All Contacts")?
- **Check**: Does the filtered group have contacts?
- **Check**: Is the distribution container element present?

### Badges Not Showing
- **Check**: Do contacts have non-empty `groups` array?
- **Check**: Are SVG elements rendering correctly?
- **Check**: Browser supports SVG (all modern browsers do)

## Best Practices

### For Developers

1. **Always pass groups array**: Even if empty, pass `[]` to `render()`
2. **Validate group IDs**: Ensure contact group IDs match group objects
3. **Handle empty states**: Test with 0 groups, 0 contacts in group
4. **Test multi-group**: Ensure contacts with 2+ groups display correctly

### For Users

1. **Start with toggle**: Enable group view before filtering
2. **Use distribution**: Check distribution to understand group composition
3. **Hover for details**: Tooltips provide full group membership info
4. **Clear when done**: Clear filter to return to full view

## Examples

### Example 1: Work-Life Balance Analysis

```javascript
// Load contacts with work and personal groups
const contacts = [
  { id: '1', name: 'Boss', circle: 'close', groups: ['work'] },
  { id: '2', name: 'Spouse', circle: 'inner', groups: ['family'] },
  { id: '3', name: 'Colleague', circle: 'active', groups: ['work'] },
  { id: '4', name: 'Friend', circle: 'close', groups: ['friends'] }
];

const groups = [
  { id: 'work', name: 'Work' },
  { id: 'family', name: 'Family' },
  { id: 'friends', name: 'Friends' }
];

visualizer.render(contacts, groups);

// Filter by work to see work-life balance
visualizer.showGroupFilter('work');
// Distribution shows: 1 in close, 1 in active
// Insight: Work relationships are not dominating inner circles
```

### Example 2: Finding Bridge Contacts

```javascript
// Contacts with multiple groups
const contacts = [
  { id: '1', name: 'Alice', circle: 'close', groups: ['work', 'friends'] },
  { id: '2', name: 'Bob', circle: 'inner', groups: ['family', 'friends', 'hobby'] },
  { id: '3', name: 'Carol', circle: 'active', groups: ['work'] }
];

// Alice and Bob have multiple groups (badges show "2" and "3")
// These are bridge contacts connecting different social contexts
```

## Summary

The group overlay and filtering feature provides powerful tools for understanding and managing contacts based on group membership. It maintains the intuitive drag-and-drop interface while adding analytical capabilities through distribution displays and visual indicators.

Key benefits:
- ✅ Understand group composition across relationship tiers
- ✅ Focus on specific groups without losing context
- ✅ Identify contacts who bridge multiple social contexts
- ✅ Make informed decisions about relationship organization

The feature is designed to be discoverable, intuitive, and powerful without overwhelming users who don't need it.
