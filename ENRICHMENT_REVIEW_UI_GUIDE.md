# Enrichment Review UI Guide

## Visual Overview

The Enrichment Review interface provides a clean, intuitive way for users to review and apply enrichment proposals extracted from voice notes.

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Review Enrichment Proposals                                │
│  Review and edit the information extracted from your voice  │
│  note                                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ▼  [JD]  John Doe                                     │ │
│  │           3 of 4 items selected                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  ☑ 🏷️  Add Tag                                        │ │
│  │        hiking                                    [✏️]  │ │
│  │                                                         │ │
│  │  ☑ 🏷️  Add Tag                                        │ │
│  │        photography                               [✏️]  │ │
│  │                                                         │ │
│  │  ☑ 📝  Update Location                                │ │
│  │        Seattle, WA                               [✏️]  │ │
│  │                                                         │ │
│  │  ☐ 📝  Add Email                                      │ │
│  │        john.doe@example.com                      [✏️]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ▼  [JS]  Jane Smith                                  │ │
│  │           2 of 2 items selected                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  ☑ 🏷️  Add Tag                                        │ │
│  │        hiking                                    [✏️]  │ │
│  │                                                         │ │
│  │  ☑ 📅  Update Last Contact Date                       │ │
│  │        January 15, 2024                          [✏️]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              [✓ Accept All]  [✗ Reject All]  [Apply Selected]│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## UI States

### 1. Accepted Item (Green Border)
```
┌─────────────────────────────────────────────────────────┐
│ ☑ 🏷️  Add Tag                                          │
│       hiking                                      [✏️] │
└─────────────────────────────────────────────────────────┘
```
- Green border (#10b981)
- Light green background (#f0fdf4)
- Checkbox checked
- Full opacity

### 2. Rejected Item (Gray Border)
```
┌─────────────────────────────────────────────────────────┐
│ ☐ 📝  Add Email                                        │
│       john.doe@example.com                        [✏️] │
└─────────────────────────────────────────────────────────┘
```
- Gray border (#e5e7eb)
- Light gray background (#f9fafb)
- Checkbox unchecked
- Reduced opacity (0.6)

### 3. Edit Mode
```
┌─────────────────────────────────────────────────────────┐
│ ☑ 📝  Update Location                                  │
│       ┌─────────────────────────────────────────┐      │
│       │ Seattle, WA                             │ [✓][✗]│
│       └─────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```
- Input field with blue border (#3b82f6)
- Save (✓) and Cancel (✗) buttons visible
- Edit button hidden
- Focus on input field

### 4. Validation Error
```
┌─────────────────────────────────────────────────────────┐
│ ☑ 📝  Add Email                                        │
│       ┌─────────────────────────────────────────┐      │
│       │ invalid-email                           │ [✓][✗]│
│       └─────────────────────────────────────────┘      │
│       ⚠️ Invalid email format (e.g., user@example.com) │
└─────────────────────────────────────────────────────────┘
```
- Red error text below input
- Input remains focused
- Save button still enabled (will validate on click)

### 5. Collapsed Contact
```
┌─────────────────────────────────────────────────────────┐
│  ▶  [JD]  John Doe                                     │
│           3 of 4 items selected                        │
└─────────────────────────────────────────────────────────┘
```
- Chevron points right (▶)
- Items hidden
- Click to expand

### 6. Success State
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                      ┌───────┐                          │
│                      │   ✓   │                          │
│                      └───────┘                          │
│                                                          │
│          Enrichment Applied Successfully                │
│                                                          │
│          5 items applied to your contacts               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
- Large green checkmark circle
- Success message
- Item count summary

## Item Types and Icons

| Type | Icon | Example Display |
|------|------|----------------|
| Tag | 🏷️ | Add Tag: "hiking" |
| Group | 👥 | Add to Group: "Outdoor Friends" |
| Field | 📝 | Update Location: "Seattle, WA" |
| Date | 📅 | Update Last Contact Date: "January 15, 2024" |

## Field Types and Validation

### Email
- **Format:** user@example.com
- **Validation:** Standard email regex
- **Error:** "Invalid email format (e.g., user@example.com)"

### Phone
- **Format:** +1-555-123-4567 (flexible)
- **Validation:** At least 10 digits, allows spaces, dashes, parentheses
- **Error:** "Invalid phone format (e.g., +1-555-123-4567)"

### LinkedIn
- **Format:** linkedin.com/in/username or username
- **Validation:** Contains "linkedin.com/" or alphanumeric username
- **Error:** "Invalid LinkedIn URL"

### Instagram
- **Format:** @username or username
- **Validation:** Alphanumeric with dots and underscores
- **Error:** "Invalid Instagram handle"

### X/Twitter Handle
- **Format:** @username or username
- **Validation:** Alphanumeric with underscores
- **Error:** "Invalid X/Twitter handle"

### Last Contact Date
- **Format:** YYYY-MM-DD or any valid date string
- **Validation:** Valid date, not in future
- **Error:** "Invalid date format (e.g., 2024-01-15)" or "Date cannot be in the future"

### Location
- **Format:** Free text (e.g., "Seattle, WA")
- **Validation:** Non-empty
- **Error:** "Value cannot be empty"

## Interaction Patterns

### Keyboard Shortcuts
- **Enter** - Save edit (when in edit mode)
- **Escape** - Cancel edit (when in edit mode)
- **Space** - Toggle checkbox (when focused)
- **Tab** - Navigate between elements

### Mouse/Touch Interactions
- **Click contact header** - Expand/collapse items
- **Click checkbox** - Toggle accept/reject
- **Click edit button** - Enter edit mode
- **Click save button** - Save changes
- **Click cancel button** - Discard changes
- **Click Accept All** - Accept all items
- **Click Reject All** - Reject all items
- **Click Apply Selected** - Apply accepted items

## Responsive Behavior

### Desktop (> 768px)
- Items displayed in rows with all controls visible
- Edit buttons on the right side
- Bulk actions aligned right

### Tablet (768px - 1024px)
- Slightly reduced padding
- Items still in rows
- Buttons may wrap on narrow tablets

### Mobile (< 768px)
- Items stack vertically
- Full-width buttons
- Larger touch targets (44px minimum)
- Bulk actions stack vertically
- Contact cards take full width

## Color Palette

### Primary Colors
- **Blue:** #2563eb (buttons, links)
- **Green:** #10b981 (accepted items, success)
- **Red:** #ef4444 (errors, rejected items)
- **Gray:** #6b7280 (secondary text)

### Background Colors
- **White:** #ffffff (cards, inputs)
- **Light Gray:** #f9fafb (backgrounds)
- **Light Green:** #f0fdf4 (accepted items)
- **Light Blue:** #dbeafe (hover states)

### Border Colors
- **Default:** #e5e7eb
- **Accepted:** #10b981
- **Focus:** #3b82f6
- **Error:** #ef4444

## Accessibility Features

- ✅ Keyboard navigation support
- ✅ Focus indicators on all interactive elements
- ✅ ARIA labels for screen readers
- ✅ Color contrast meets WCAG AA standards
- ✅ Touch targets meet minimum size (44px)
- ✅ Error messages associated with inputs
- ✅ Semantic HTML structure

## Animation & Transitions

- **Expand/Collapse:** 0.3s ease-out
- **Hover Effects:** 0.2s ease
- **Button Press:** Scale 0.98
- **Fade In/Out:** 0.3s ease-in-out
- **Success State:** Smooth fade-in

## Best Practices

1. **Always validate before saving** - Prevent invalid data entry
2. **Provide clear feedback** - Toast notifications for all actions
3. **Confirm destructive actions** - Ask before applying changes
4. **Show progress** - Loading states during API calls
5. **Handle errors gracefully** - Clear error messages with recovery options
6. **Maintain state** - Preserve user selections during edits
7. **Auto-focus inputs** - When entering edit mode
8. **Select text on focus** - For easy replacement
9. **Scroll to errors** - When validation fails
10. **Provide undo option** - Consider adding undo functionality

## Testing Checklist

- [ ] Single contact with multiple items
- [ ] Multiple contacts with various items
- [ ] Empty proposal handling
- [ ] All item types (tag, group, field, date)
- [ ] Inline editing for each field type
- [ ] Validation for each field type
- [ ] Accept All functionality
- [ ] Reject All functionality
- [ ] Apply Selected with confirmation
- [ ] Expand/collapse contacts
- [ ] Keyboard navigation
- [ ] Mobile responsive layout
- [ ] Error handling
- [ ] Success state display
- [ ] Toast notifications
