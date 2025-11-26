# Group Suggestions UI Guide

## Overview
This guide explains how to use and test the new group suggestions UI features in the CatchUp suggestions feed.

## Features

### 1. Visual Distinction

#### Group Suggestions
- **Green left border** (4px solid #10b981)
- **"Group Catchup" badge** with green background
- **Multiple overlapping avatars** (2-3 contacts)
- **Shared context badge** showing common factors

#### Individual Suggestions
- **Blue left border** (4px solid #3b82f6)
- **"One-on-One" badge** with blue background
- **Single avatar**
- **Contact's groups and interests**

### 2. Contact Display

#### Group Contact Names
The system formats contact names naturally:
- 2 contacts: "John and Jane"
- 3 contacts: "John, Jane, and Mike"

#### Avatars
- Circular avatars with initials (e.g., "JD" for John Doe)
- Different colors for each contact (rotating palette)
- Overlapping display with -12px margin
- Z-index stacking for proper layering
- White border (3px) for separation
- Hover effect: lifts up with increased shadow

### 3. Shared Context Badge

Displays the factors that connect the group:
- **Common groups**: "2 common groups"
- **Shared interests**: "3 shared interests"
- **Co-mentions**: "mentioned together 5 times"

Example: "🤝 2 common groups, 3 shared interests, mentioned together 5 times"

Hover over the badge to see the shared context score (0-100).

### 4. Contact Tooltips

**How to use:**
1. Hover over any contact avatar
2. Tooltip appears below the avatar
3. Shows contact details:
   - Name (bold)
   - Email (if available)
   - Phone (if available)
   - Location (if available)
   - Frequency preference (if set)

**Tooltip behavior:**
- Smooth fade-in animation
- Positioned centered below avatar
- Auto-hides when mouse leaves
- Dark background for contrast

### 5. Group Modification

**For pending group suggestions:**

#### "Modify Group ▼" Button
Click to open a dropdown menu with options:

**Remove Contact Options:**
- Click any contact name to remove them from the group
- Remaining contacts stay in the suggestion
- If only 1 contact remains, converts to individual suggestion

**Dismiss Entire Group:**
- Red text option at bottom of menu
- Dismisses the entire group suggestion
- Prompts for optional reason

#### Behavior
- Menu closes when clicking outside
- Only one menu open at a time
- Toast notifications confirm actions:
  - "Contact removed from group"
  - "Group converted to individual suggestion"

### 6. Action Buttons

#### Group Suggestions (Pending)
1. **Accept Group Catchup** - Accepts the group suggestion
2. **Modify Group ▼** - Opens modification menu
3. **Dismiss** - Dismisses the entire group

#### Individual Suggestions (Pending)
1. **Accept** - Accepts the suggestion
2. **Dismiss** - Dismisses the suggestion
3. **Snooze** - Snoozes for specified days

#### Non-Pending Suggestions
- Shows "No actions available" message
- Status badge indicates current state

### 7. Shared Context Display

#### For Group Suggestions
Shows two sections if available:

**Common Groups:**
- Displays as green badges
- Shows groups all contacts share

**Shared Interests:**
- Displays as blue badges
- Shows tags/interests all contacts have

#### For Individual Suggestions
Shows two sections if available:

**Member of:**
- Groups the contact belongs to

**Interests:**
- Tags associated with the contact

### 8. Priority Sorting

Suggestions are automatically sorted by priority:
- Higher priority suggestions appear first
- Group and individual suggestions intermixed
- Priority score determines order (not type)

## Testing the UI

### Test Scenario 1: View Group Suggestion
1. Navigate to Suggestions page
2. Look for suggestions with green left border
3. Verify:
   - Multiple overlapping avatars
   - "Group Catchup" badge
   - Shared context badge
   - Contact names formatted correctly

### Test Scenario 2: Contact Tooltips
1. Hover over first avatar in group
2. Verify tooltip appears with contact details
3. Move to second avatar
4. Verify tooltip updates
5. Move mouse away
6. Verify tooltip disappears

### Test Scenario 3: Remove Contact from Group
1. Find a group suggestion with 3 contacts
2. Click "Modify Group ▼" button
3. Click on one contact name to remove
4. Verify toast: "Contact removed from group"
5. Verify suggestion now shows 2 contacts
6. Remove another contact
7. Verify toast: "Group converted to individual suggestion"
8. Verify suggestion now has blue border and single avatar

### Test Scenario 4: Dismiss Group
1. Find a group suggestion
2. Click "Modify Group ▼" button
3. Click "Dismiss Entire Group"
4. Enter optional reason
5. Verify suggestion is dismissed

### Test Scenario 5: Accept Group Suggestion
1. Find a pending group suggestion
2. Click "Accept Group Catchup"
3. Verify toast: "Suggestion accepted!"
4. Verify suggestion status changes to "accepted"
5. Verify action buttons change to "No actions available"

### Test Scenario 6: Mixed Feed
1. View suggestions page
2. Verify both group and individual suggestions present
3. Verify sorted by priority (not grouped by type)
4. Verify visual distinction clear
5. Verify proper spacing between cards

## Sample Data Structure

### Group Suggestion Example
```javascript
{
  id: "sugg-123",
  type: "group",
  contacts: [
    {
      id: "contact-1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      location: "Seattle, WA",
      frequencyPreference: "weekly",
      groups: ["group-1", "group-2"],
      tags: [
        { id: "tag-1", text: "hiking" },
        { id: "tag-2", text: "photography" }
      ]
    },
    {
      id: "contact-2",
      name: "Jane Smith",
      email: "jane@example.com",
      location: "Seattle, WA",
      frequencyPreference: "weekly",
      groups: ["group-1", "group-2"],
      tags: [
        { id: "tag-1", text: "hiking" },
        { id: "tag-3", text: "cooking" }
      ]
    },
    {
      id: "contact-3",
      name: "Mike Johnson",
      phone: "+1987654321",
      location: "Portland, OR",
      frequencyPreference: "monthly",
      groups: ["group-1"],
      tags: [
        { id: "tag-1", text: "hiking" }
      ]
    }
  ],
  sharedContext: {
    score: 75,
    factors: {
      commonGroups: ["Outdoor Friends"],
      sharedTags: ["hiking"],
      coMentionedInVoiceNotes: 3,
      overlappingInterests: ["hiking", "nature"]
    }
  },
  proposedTimeslot: {
    start: "2025-11-30T14:00:00Z",
    end: "2025-11-30T16:00:00Z"
  },
  reasoning: "These friends share hiking interests and were mentioned together in your recent voice notes. It's been 3 weeks since you all hung out.",
  status: "pending",
  priority: 150,
  triggerType: "shared_activity"
}
```

### Individual Suggestion Example
```javascript
{
  id: "sugg-456",
  type: "individual",
  contactId: "contact-4",
  contacts: [
    {
      id: "contact-4",
      name: "Sarah Williams",
      email: "sarah@example.com",
      location: "San Francisco, CA",
      frequencyPreference: "monthly",
      groups: ["group-3"],
      tags: [
        { id: "tag-4", text: "coffee" },
        { id: "tag-5", text: "books" }
      ]
    }
  ],
  proposedTimeslot: {
    start: "2025-11-28T10:00:00Z",
    end: "2025-11-28T11:00:00Z"
  },
  reasoning: "It's been 4 weeks since you last connected with Sarah. She prefers monthly catchups.",
  status: "pending",
  priority: 120,
  triggerType: "timebound"
}
```

## Styling Reference

### Colors
- **Group border**: #10b981 (green)
- **Individual border**: #3b82f6 (blue)
- **Group badge bg**: #d1fae5 (light green)
- **Individual badge bg**: #dbeafe (light blue)
- **Shared context bg**: #fef3c7 (light yellow)
- **Avatar colors**: Rotating palette of 5 colors

### Spacing
- **Avatar size**: 48px × 48px
- **Avatar overlap**: -12px margin-left
- **Avatar border**: 3px white
- **Card padding**: 30px
- **Badge padding**: 4px 10px (type), 6px 12px (context)

### Typography
- **Contact names**: h3, margin: 0
- **Type badge**: 11px, uppercase, 600 weight
- **Shared context**: 13px
- **Tooltip name**: 14px, 600 weight
- **Tooltip details**: 13px

## Troubleshooting

### Avatars Not Overlapping
- Check CSS: `.suggestion-avatar` should have `margin-left: -12px` for index > 0
- Verify z-index stacking

### Tooltip Not Showing
- Check if contact data is loaded
- Verify `addContactTooltipListeners()` is called after render
- Check console for errors

### Menu Not Closing
- Verify click event listener on document
- Check if `closeGroupModifyMenu()` is called
- Ensure only one menu instance exists

### Shared Context Not Displaying
- Verify `sharedContext` object exists in suggestion
- Check if `factors` object has data
- Ensure badge HTML is generated

### Contacts Not Removing
- Check API endpoint `/api/suggestions/:id/remove-contact`
- Verify request payload includes `userId` and `contactId`
- Check backend implementation

## Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (responsive)

## Accessibility
- Hover states for all interactive elements
- Clear visual distinction between types
- Text labels for all actions
- Tooltips provide additional context
- Color is not the only distinguishing factor

## Performance
- Tooltips created on-demand
- Single menu instance
- Efficient event delegation
- Minimal DOM manipulation
- Smooth animations (CSS transitions)
