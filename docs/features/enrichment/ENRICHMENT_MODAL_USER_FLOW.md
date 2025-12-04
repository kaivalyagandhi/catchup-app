# Enrichment Modal - Updated User Flow

## Overview

When a user interacts with enrichment suggestion modals, the buttons now dynamically update to show the count of selected items, and the modal stays open for continued interaction.

## User Flow: Selecting Individual Suggestions

### Initial State
```
Modal for "Sarah Chen"
├─ ☐ 📍 Location: Seattle
├─ ☐ 📞 Phone: +1-555-123-4567
└─ ☐ 🏷️ Tag: hiking

Summary: "0 of 3 selected"
[✓ Confirm All] [✗ Reject All]
```

### Step 1: User checks "Location" checkbox
```
Modal for "Sarah Chen"
├─ ☑ 📍 Location: Seattle          ← Checked (green highlight)
├─ ☐ 📞 Phone: +1-555-123-4567
└─ ☐ 🏷️ Tag: hiking

Summary: "1 of 3 selected"
[✓ Confirm 1] [✗ Reject 2]         ← Buttons update!
```

**What happens:**
- Checkbox toggles to checked
- Summary updates: "1 of 3 selected"
- Confirm button changes to "✓ Confirm 1" (1 item selected)
- Reject button changes to "✗ Reject 2" (2 items not selected)
- Auto-dismiss timer resets (10 seconds)
- **Modal stays open** ✓

### Step 2: User checks "Tag" checkbox
```
Modal for "Sarah Chen"
├─ ☑ 📍 Location: Seattle
├─ ☐ 📞 Phone: +1-555-123-4567
└─ ☑ 🏷️ Tag: hiking               ← Now checked too

Summary: "2 of 3 selected"
[✓ Confirm 2] [✗ Reject 1]         ← Buttons update again!
```

**What happens:**
- Second checkbox toggles to checked
- Summary updates: "2 of 3 selected"
- Confirm button changes to "✓ Confirm 2"
- Reject button changes to "✗ Reject 1"
- Auto-dismiss timer resets again
- **Modal stays open** ✓

### Step 3: User clicks "Confirm 2"
```
Toast appears: "Confirmed 2 suggestions"
Modal stays open with current selections
Auto-dismiss timer resets (10 seconds)
```

**What happens:**
- Toast notification shows success message
- Modal remains open (user can continue selecting)
- Auto-dismiss timer resets
- User can now:
  - Check/uncheck more items
  - Click "Reject 1" to reject the unchecked item
  - Click close button (✕) to close modal
  - Wait 10 seconds for auto-dismiss

### Step 4: User unchecks "Location" checkbox
```
Modal for "Sarah Chen"
├─ ☐ 📍 Location: Seattle          ← Unchecked
├─ ☐ 📞 Phone: +1-555-123-4567
└─ ☑ 🏷️ Tag: hiking

Summary: "1 of 3 selected"
[✓ Confirm 1] [✗ Reject 2]         ← Buttons update!
```

**What happens:**
- Checkbox toggles to unchecked
- Summary updates: "1 of 3 selected"
- Buttons update to reflect new counts
- Auto-dismiss timer resets
- **Modal stays open** ✓

### Step 5: User clicks "Reject 2"
```
Toast appears: "Rejected 2 suggestions"
Modal stays open with current selections
Auto-dismiss timer resets (10 seconds)
```

**What happens:**
- Toast notification shows rejection message
- Modal remains open
- Auto-dismiss timer resets
- User can continue selecting or close modal

### Step 6: User closes modal with ✕ button
```
Modal animates out (slide right + fade, 300ms)
Modal removed from screen
Auto-dismiss timer cleared
```

## Key Behaviors

### Button Text Updates
- **Confirm button**: Shows "✓ Confirm #" where # = number of checked items
  - If 0 items checked: "✓ Confirm All"
  - If 1+ items checked: "✓ Confirm 1", "✓ Confirm 2", etc.

- **Reject button**: Shows "✗ Reject #" where # = number of unchecked items
  - If 0 items unchecked: "✗ Reject All"
  - If 1+ items unchecked: "✗ Reject 1", "✗ Reject 2", etc.

### Modal Stays Open
- Clicking checkboxes: Modal stays open ✓
- Clicking "Confirm #": Modal stays open ✓
- Clicking "Reject #": Modal stays open ✓
- Clicking close button (✕): Modal closes
- Auto-dismiss timer expires: Modal closes

### Auto-Dismiss Timer
- Starts when modal is created (10 seconds)
- **Resets when user interacts** (checks/unchecks, clicks buttons)
- Prevents modal from closing while user is actively selecting
- Only closes if user is inactive for 10 seconds

### Feedback
- Toast notifications appear when user clicks "Confirm #" or "Reject #"
- Shows count of items confirmed/rejected
- Toast auto-dismisses after 3 seconds

## Implementation Details

### Event Handling
```javascript
// When user checks/unchecks a suggestion:
1. Update suggestion.accepted state
2. Update summary count
3. Update button text
4. Reset auto-dismiss timer
5. Keep modal open
```

### Button Text Logic
```javascript
const acceptedCount = suggestions.filter(s => s.accepted).length;
const rejectedCount = suggestions.length - acceptedCount;

confirmBtnText = acceptedCount > 0 
  ? `✓ Confirm ${acceptedCount}` 
  : '✓ Confirm All';

rejectBtnText = rejectedCount > 0 
  ? `✗ Reject ${rejectedCount}` 
  : '✗ Reject All';
```

### Action Behavior
```javascript
confirmAllSuggestions(contactId) {
  // Show toast with count
  showToast(`Confirmed ${acceptedCount} suggestion(s)`, 'success');
  
  // Keep modal open
  // Reset timer
  this.resetAutoRemoveTimer(contactId);
}
```

## User Experience Benefits

✅ **Clear feedback**: Button text shows exactly what will happen
✅ **Responsive**: Buttons update immediately as user selects
✅ **Non-destructive**: Modal stays open for continued interaction
✅ **Flexible**: User can confirm/reject in any order
✅ **Forgiving**: Auto-dismiss timer resets on interaction
✅ **Informative**: Toast shows what was confirmed/rejected

## Edge Cases

### No items selected
- User clicks "Confirm All" with 0 items checked
- Toast: "Confirmed 0 suggestions"
- Modal stays open

### All items selected
- User checks all 3 items
- Button shows "✓ Confirm 3"
- Reject button shows "✗ Reject 0" (or "✗ Reject All"?)

### Rapid interactions
- User quickly checks/unchecks multiple items
- Buttons update in real-time
- Timer resets on each interaction
- Modal stays open throughout

## Future Enhancements

- Add "Apply & Close" button to confirm and close in one action
- Add keyboard shortcuts (Enter to confirm, Escape to close)
- Add undo/redo for selections
- Add "Select All" / "Deselect All" buttons
- Add drag-to-reorder suggestions

