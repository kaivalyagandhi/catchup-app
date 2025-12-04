# Voice Notes History UI Guide

## Overview
This guide provides a visual walkthrough of the Voice Notes History interface and its features.

## Navigation

### Accessing Voice Notes History
1. Click on "Voice Notes" in the main navigation
2. Click the "📋 History" tab at the top of the page
3. The history view will load automatically

## Main Interface

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Voice Notes                                                  │
│ ┌─────────────┬─────────────┐                              │
│ │ 🎤 Record   │ 📋 History  │  ← Tabs                      │
│ └─────────────┴─────────────┘                              │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Filters Section                                       │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │   │
│ │ │ Search       │ │ Contact      │ │ Status       │  │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘  │   │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │   │
│ │ │ From Date    │ │ To Date      │ │ Clear Filters│  │   │
│ │ └──────────────┘ └──────────────┘ └──────────────┘  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Voice Note Card #1                                    │   │
│ │ Today at 2:30 PM  [Applied]                          │   │
│ │ 👤 John Doe                                           │   │
│ │ "Had a great coffee chat with John today..."         │   │
│ │ 🏷️ 2 tags  👥 1 group  📝 1 field                    │   │
│ │                              [▼ Expand] [🗑️ Delete]  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Voice Note Card #2                                    │   │
│ │ Yesterday at 10:15 AM  [Ready]                       │   │
│ │ 👤👤 Jane Smith, Mike Johnson                         │   │
│ │ "Caught up with Jane and Mike at the park..."       │   │
│ │ 🏷️ 4 tags  👥 1 group                                │   │
│ │                              [▼ Expand] [🗑️ Delete]  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Voice Note Cards

Each voice note is displayed as a card with:

**Header Section (Always Visible):**
- **Date/Time**: Smart formatting
  - "Today at 2:30 PM"
  - "Yesterday at 10:15 AM"
  - "3 days ago"
  - "Jan 15" (for older dates)
  
- **Status Badge**: Color-coded status indicator
  - 🔴 Recording (red)
  - 🔵 Transcribing (blue)
  - 🟡 Extracting (yellow)
  - 🟢 Ready (green)
  - 🔵 Applied (blue)
  - 🔴 Error (red)

- **Contact Avatars**: Circular avatars with initials
  - Single contact: One avatar
  - Multiple contacts: Overlapping avatars (up to 3 shown)
  - "+2" indicator for more than 3 contacts

- **Transcript Preview**: First 100 characters
  - Truncated with "..." if longer
  - Italic text if no transcript available

- **Enrichment Summary**: Statistics of applied items
  - 🏷️ X tags
  - 👥 X groups
  - 📝 X fields

**Action Buttons:**
- **Expand/Collapse**: Toggle details view
  - Shows "▼ Expand" when collapsed
  - Shows "▲ Collapse" when expanded
  
- **Delete**: Remove voice note
  - Shows confirmation dialog before deletion
  - Displays date and asks for confirmation

### 2. Expanded Details View

When a card is expanded, additional information is shown:

**Full Transcript Section:**
```
┌──────────────────────────────────────────────────────┐
│ Full Transcript                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [Complete transcript text displayed here]        │ │
│ │ Preserves line breaks and formatting             │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Enrichment Items Section:**
```
┌──────────────────────────────────────────────────────┐
│ Enrichment Items Applied                              │
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ TAG ADDED                                        │ │
│ │ 🏷️ hiking                                        │ │
│ │ Applied to: John Doe                             │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ GROUP ADDED                                      │ │
│ │ 👥 Outdoor Friends                               │ │
│ │ Applied to: John Doe                             │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ FIELD UPDATED: email                             │ │
│ │ john@example.com                                 │ │
│ │ Applied to: John Doe                             │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 3. Filters Section

**Search Input:**
- Real-time search as you type
- Searches across full transcript text
- Case-insensitive matching
- Placeholder: "Search across transcripts..."

**Contact Filter:**
- Dropdown menu with all contacts
- Default: "All Contacts"
- Shows only voice notes associated with selected contact

**Status Filter:**
- Dropdown menu with status options:
  - All Statuses (default)
  - Recording
  - Transcribing
  - Extracting
  - Ready
  - Applied
  - Error

**Date Range Filters:**
- **From Date**: Start of date range
- **To Date**: End of date range (includes entire day)
- Date picker inputs
- Both optional

**Clear Filters Button:**
- Resets all filters to default
- Clears all input fields
- Shows all voice notes

### 4. Empty States

**No Voice Notes:**
```
┌──────────────────────────────────────────────────────┐
│                                                        │
│                        🎤                              │
│                                                        │
│              No Voice Notes Found                      │
│                                                        │
│      Start recording voice notes to see them here.    │
│                                                        │
└──────────────────────────────────────────────────────┘
```

**No Matching Filters:**
```
┌──────────────────────────────────────────────────────┐
│                                                        │
│                        🎤                              │
│                                                        │
│              No Voice Notes Found                      │
│                                                        │
│      No voice notes match your current filters.       │
│                                                        │
└──────────────────────────────────────────────────────┘
```

**Loading State:**
```
┌──────────────────────────────────────────────────────┐
│                                                        │
│                        ⏳                              │
│                                                        │
│              Loading voice notes...                    │
│                                                        │
└──────────────────────────────────────────────────────┘
```

## User Interactions

### Viewing Voice Notes
1. Voice notes load automatically when accessing the History tab
2. Scroll through the list to view all voice notes
3. Most recent voice notes appear at the top

### Expanding Details
1. Click anywhere on the voice note card header
2. OR click the "▼ Expand" button
3. Details section slides open below
4. Click again or click "▲ Collapse" to close

### Searching
1. Type in the search box at the top
2. Results filter in real-time as you type
3. Clear the search box to show all voice notes

### Filtering by Contact
1. Click the "Filter by Contact" dropdown
2. Select a contact from the list
3. Only voice notes associated with that contact are shown
4. Select "All Contacts" to clear the filter

### Filtering by Status
1. Click the "Filter by Status" dropdown
2. Select a status (Recording, Transcribing, etc.)
3. Only voice notes with that status are shown
4. Select "All Statuses" to clear the filter

### Filtering by Date Range
1. Click the "From Date" input and select a start date
2. Click the "To Date" input and select an end date
3. Only voice notes within that range are shown
4. Clear either date input to remove that boundary

### Combining Filters
- All filters work together (AND logic)
- A voice note must match ALL active filters to be shown
- Example: Search for "hiking" + Contact "John Doe" + Status "Applied"
  - Shows only applied voice notes about hiking associated with John Doe

### Clearing Filters
1. Click the "Clear Filters" button
2. All filters reset to default
3. All voice notes are shown again

### Deleting Voice Notes
1. Click the "🗑️ Delete" button on a voice note card
2. Confirmation dialog appears with:
   - Voice note date
   - Warning that action cannot be undone
3. Click "OK" to confirm deletion
4. Click "Cancel" to keep the voice note
5. If confirmed, voice note is removed from the list

## Responsive Design

### Desktop View (> 768px)
- Filters displayed in two rows
- Voice note cards show all information side-by-side
- Action buttons aligned to the right

### Mobile View (≤ 768px)
- Filters stack vertically
- Voice note cards stack content vertically
- Action buttons expand to full width
- Contact avatars may wrap to new line

## Color Scheme

### Status Badge Colors
- **Recording**: Red background (#fee2e2), dark red text (#991b1b)
- **Transcribing**: Blue background (#dbeafe), dark blue text (#1e40af)
- **Extracting**: Yellow background (#fef3c7), brown text (#92400e)
- **Ready**: Green background (#d1fae5), dark green text (#065f46)
- **Applied**: Blue background (#dbeafe), dark blue text (#1e40af)
- **Error**: Red background (#fee2e2), dark red text (#991b1b)

### UI Elements
- **Primary Blue**: #2563eb (buttons, active states)
- **Gray Text**: #6b7280 (secondary text)
- **Dark Text**: #1f2937 (primary text)
- **Background**: #f9fafb (light gray)
- **White**: #ffffff (cards, inputs)
- **Border**: #e5e7eb (light gray)

## Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate buttons
- Arrow keys in dropdowns

### Screen Readers
- Semantic HTML structure
- ARIA labels on interactive elements
- Status badges announced with text

### Visual Indicators
- Clear focus states on interactive elements
- High contrast text and backgrounds
- Color is not the only indicator (icons + text)

## Performance

### Optimization Features
- Efficient filtering (client-side)
- Minimal re-renders
- Smooth animations and transitions
- Lazy loading of details (only when expanded)

### Data Handling
- Voice notes sorted once on load
- Filters applied to pre-sorted array
- No unnecessary API calls
- Local state management

## Tips for Users

1. **Use Search for Quick Lookup**: Type keywords to quickly find specific voice notes
2. **Combine Filters**: Use multiple filters together for precise results
3. **Expand for Details**: Click expand to see full transcript and all enrichment items
4. **Check Status**: Status badges show processing state at a glance
5. **Delete Old Notes**: Remove voice notes you no longer need to keep the list clean
6. **Date Filters**: Use date range to find voice notes from specific time periods
7. **Contact Filter**: Filter by contact to see all voice notes about a specific person

## Troubleshooting

### Voice Notes Not Loading
- Check internet connection
- Verify you're logged in
- Refresh the page
- Check browser console for errors

### Filters Not Working
- Try clearing all filters and reapplying
- Refresh the page
- Check that voice notes exist matching your criteria

### Delete Not Working
- Ensure you have permission to delete
- Check internet connection
- Verify authentication token is valid

### Expand/Collapse Not Working
- Try clicking directly on the expand button
- Refresh the page
- Check browser console for errors

## Future Enhancements

Planned improvements:
- Voice note playback (if audio is stored)
- Edit transcript functionality
- Export to CSV/JSON
- Bulk operations (delete multiple)
- Advanced search with operators
- Sort options (date, status, contact count)
- Pagination for large lists
- Share voice notes with other users
