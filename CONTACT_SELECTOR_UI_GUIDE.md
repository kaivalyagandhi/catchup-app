# Contact Selector UI Guide

## Visual Overview

The Contact Selector component provides a clean, intuitive interface for manually selecting contacts when automatic disambiguation fails during voice note processing.

## Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Select Contacts                          │
│        Choose the contacts mentioned in your voice note     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 [Search by name, email, phone, or tags...]            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter by Group: [All Groups ▼]  Filter by Tag: [All ▼]  │
│                                    [Clear Filters]          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 2 contact(s) selected                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☑ [JD] John Doe                                        ││
│ │       john@example.com • +1-555-0101 • San Francisco   ││
│ │       [Hiking Friends] [Tech Colleagues] [hiking] [tech]││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ☑ [JS] Jane Smith                                      ││
│ │       jane@example.com • +1-555-0102 • New York        ││
│ │       [Hiking Friends] [hiking] [photography]          ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ☐ [BJ] Bob Johnson                                     ││
│ │       bob@example.com • +1-555-0103 • Seattle          ││
│ │       [Tech Colleagues] [tech]                         ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ☐ [AW] Alice Williams                                  ││
│ │       alice@example.com • +1-555-0104 • Austin         ││
│ │       [photography] [cooking]                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                          [Cancel] [Confirm Selection]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Sections

### 1. Header
- **Title**: "Select Contacts"
- **Subtitle**: Explains the purpose
- **Style**: Clean, centered text

### 2. Search Bar
- **Full-width input field**
- **Placeholder**: "Search by name, email, phone, or tags..."
- **Real-time filtering**: Updates results as you type
- **Icon**: 🔍 search icon

### 3. Filters Section
- **Group Filter**: Dropdown with all user's groups
- **Tag Filter**: Dropdown with all user's tags
- **Clear Filters Button**: Resets all filters
- **Layout**: Horizontal on desktop, stacked on mobile

### 4. Selected Counter
- **Background**: Light blue (#f0f9ff)
- **Text**: Shows count of selected contacts
- **Example**: "2 contact(s) selected"

### 5. Contact List
- **Scrollable**: Max height 500px
- **Border**: 2px solid gray
- **Background**: White

#### Contact Item Structure
Each contact item displays:
- **Checkbox**: For selection (20px × 20px)
- **Avatar**: Circle with initials (48px diameter)
  - Gradient background (purple to pink)
  - White text
- **Name**: Bold, 16px
- **Details**: Email • Phone • Location (gray text, 13px)
- **Badges**:
  - Group badges: Yellow background
  - Tag badges: Blue background

#### Selected State
- **Background**: Light blue (#eff6ff)
- **Left Border**: 4px solid blue (#2563eb)
- **Checkbox**: Checked

#### Hover State
- **Background**: Light gray (#f9fafb)
- **Cursor**: Pointer

### 6. Actions Section
- **Background**: Light gray (#f9fafb)
- **Padding**: 20px
- **Layout**: Right-aligned buttons

#### Cancel Button
- **Style**: Secondary (white with gray border)
- **Action**: Closes selector without selection

#### Confirm Selection Button
- **Style**: Primary (blue background)
- **State**: Disabled when no contacts selected
- **Action**: Confirms selection and proceeds

## Color Palette

### Primary Colors
- **Blue**: #2563eb (primary actions, selected state)
- **Dark Blue**: #1d4ed8 (hover states)
- **Light Blue**: #eff6ff (selected background)
- **Very Light Blue**: #f0f9ff (counter background)

### Badge Colors
- **Group Badge**:
  - Background: #fef3c7 (light yellow)
  - Text: #92400e (dark brown)
  - Border: #fcd34d (yellow)

- **Tag Badge**:
  - Background: #dbeafe (light blue)
  - Text: #1e40af (dark blue)
  - Border: #93c5fd (blue)

### Neutral Colors
- **Gray 50**: #f9fafb (backgrounds)
- **Gray 200**: #e5e7eb (borders)
- **Gray 400**: #9ca3af (disabled)
- **Gray 600**: #6b7280 (secondary text)
- **Gray 900**: #1f2937 (primary text)

## Responsive Behavior

### Desktop (> 768px)
- Filters displayed side-by-side
- Contact items show all information
- Buttons side-by-side

### Tablet (768px - 1024px)
- Filters start to stack
- Contact items remain full-width
- Buttons remain side-by-side

### Mobile (< 768px)
- Filters fully stacked
- Contact items simplified
- Buttons stacked vertically
- Touch targets increased to 44px minimum

## Interaction Patterns

### Selecting Contacts
1. **Click checkbox** - Toggles selection
2. **Click contact card** - Toggles selection
3. **Visual feedback** - Immediate blue highlight

### Searching
1. **Type in search bar** - Instant filtering
2. **Results update** - Real-time
3. **No results** - Shows "No contacts match" message

### Filtering
1. **Select group** - Shows only contacts in that group
2. **Select tag** - Shows only contacts with that tag
3. **Combine filters** - Search + group + tag work together
4. **Clear filters** - Resets all filters at once

### Confirming
1. **Select contacts** - Counter updates
2. **Button enables** - When at least one selected
3. **Click confirm** - Proceeds to enrichment
4. **Click cancel** - Closes without selection

## Empty States

### No Contacts
```
┌─────────────────────────────────────┐
│                                     │
│         No contacts available       │
│    Please add contacts first.       │
│                                     │
└─────────────────────────────────────┘
```

### No Search Results
```
┌─────────────────────────────────────┐
│                                     │
│   No contacts match your search     │
│          or filters.                │
│                                     │
└─────────────────────────────────────┘
```

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between elements
- **Space**: Toggle checkbox
- **Enter**: Confirm selection
- **Escape**: Cancel (future enhancement)

### Screen Readers
- Semantic HTML structure
- ARIA labels on interactive elements
- Clear focus indicators

### Touch Targets
- Minimum 44px × 44px for mobile
- Adequate spacing between elements
- Large tap areas for checkboxes

## Usage Example

### Scenario: Voice Note Mentions Multiple People

1. **User records**: "Had lunch with John and Jane today. We talked about hiking."

2. **Disambiguation fails**: Backend can't identify which John and Jane

3. **Contact Selector appears**:
   - Shows all contacts
   - User searches "john"
   - Filters to Johns
   - User selects "John Doe"
   - User clears search
   - User searches "jane"
   - User selects "Jane Smith"
   - Counter shows "2 contact(s) selected"

4. **User confirms**:
   - Clicks "Confirm Selection"
   - Voice note associated with both contacts
   - Enrichment proposal generated
   - Enrichment review UI appears

## Integration Points

### Voice Notes Workflow
```
Recording → Transcription → Disambiguation
                                    ↓
                            [Fails? Show Selector]
                                    ↓
                            User Selects Contacts
                                    ↓
                            Update Voice Note
                                    ↓
                            Generate Enrichment
                                    ↓
                            Show Enrichment Review
```

### API Calls
1. **Load Contacts**: `GET /api/contacts?userId={userId}`
2. **Load Groups**: `GET /api/contacts/groups?userId={userId}`
3. **Load Tags**: `GET /api/groups-tags/tags`
4. **Update Voice Note**: `PATCH /api/voice-notes/:id/contacts`

## Testing the Component

### Test Page
Access at: `http://localhost:3000/js/contact-selector.test.html`

### Test Scenarios
1. **Many Contacts** - Tests performance with 50 contacts
2. **Few Contacts** - Tests with 5 contacts
3. **No Contacts** - Tests empty state
4. **Groups & Tags** - Tests filtering

### Manual Testing
- Try searching for different terms
- Test group and tag filters
- Test multi-select
- Test on mobile device
- Test with keyboard only

## Best Practices

### For Users
- Use search to quickly find contacts
- Use filters to narrow down large lists
- Select multiple contacts if mentioned together
- Review selection before confirming

### For Developers
- Always load fresh contact data
- Handle API errors gracefully
- Provide loading states
- Test with various data sizes
- Ensure mobile responsiveness

## Common Issues & Solutions

### Issue: No contacts appear
**Solution**: Check API connection, verify user has contacts

### Issue: Search not working
**Solution**: Check search input binding, verify filter logic

### Issue: Selection not updating
**Solution**: Check event handlers, verify state management

### Issue: Mobile layout broken
**Solution**: Test responsive CSS, check media queries

## Future Enhancements

### Potential Features
- Bulk select/deselect all
- Recent contacts section
- AI-suggested contacts
- Contact preview on hover
- Keyboard shortcuts
- Drag-and-drop ordering
- Contact grouping in results
- Advanced search operators

### Performance Optimizations
- Virtual scrolling for 100+ contacts
- Debounced search input
- Lazy loading of contact details
- Cached filter results

## Conclusion

The Contact Selector provides a robust, user-friendly interface for manual contact selection. It seamlessly integrates into the voice notes workflow and provides an excellent user experience across all devices.
