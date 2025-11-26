# Group Suggestions UI Visual Reference

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUGGESTIONS FEED                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [All] [Pending] [Accepted] [Dismissed] [Snoozed]  ← Filter buttons │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ┃ [JD][JS][MJ]  Connect with John, Jane, and Mike            │  │
│  │ ┃                [Group Catchup]                   [pending]  │  │
│  │ ┃                🤝 2 common groups, 3 shared interests       │  │
│  │ ┃                                                              │  │
│  │ ┃ Time: Saturday, Nov 30, 2025 2:00 PM                        │  │
│  │ ┃ Reason: These friends share hiking interests and were       │  │
│  │ ┃         mentioned together in your recent voice notes.      │  │
│  │ ┃                                                              │  │
│  │ ┃ Common Groups: [Outdoor Friends] [College Buddies]          │  │
│  │ ┃ Shared Interests: [hiking] [photography] [camping]          │  │
│  │ ┃                                                              │  │
│  │ ┃ [Accept Group Catchup] [Modify Group ▼] [Dismiss]           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ┃ [SW]  Connect with Sarah Williams                           │  │
│  │ ┃       [One-on-One]                              [pending]   │  │
│  │ ┃                                                              │  │
│  │ ┃ Time: Thursday, Nov 28, 2025 10:00 AM                       │  │
│  │ ┃ Reason: It's been 4 weeks since you last connected.         │  │
│  │ ┃                                                              │  │
│  │ ┃ Member of: [Book Club]                                      │  │
│  │ ┃ Interests: [coffee] [books] [writing]                       │  │
│  │ ┃                                                              │  │
│  │ ┃ [Accept] [Dismiss] [Snooze]                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Legend:
┃ = Green border (group) or Blue border (individual)
[XX] = Avatar with initials
[Badge] = Colored badge
```

## Group Suggestion Card (Detailed)

```
┌────────────────────────────────────────────────────────────────┐
│ ┃                                                                │
│ ┃  ┌──┐┌──┐┌──┐  Connect with John, Jane, and Mike             │
│ ┃  │JD││JS││MJ│  [Group Catchup]              [pending]        │
│ ┃  └──┘└──┘└──┘  🤝 2 common groups, 3 shared interests        │
│ ┃                                                                │
│ ┃  Time: Saturday, November 30, 2025 2:00 PM - 4:00 PM          │
│ ┃                                                                │
│ ┃  Reason: These friends share hiking interests and were        │
│ ┃  mentioned together in your recent voice notes. It's been     │
│ ┃  3 weeks since you all hung out.                              │
│ ┃                                                                │
│ ┃  Common Groups:                                               │
│ ┃  [Outdoor Friends] [College Buddies]                          │
│ ┃                                                                │
│ ┃  Shared Interests:                                            │
│ ┃  [hiking] [photography] [camping]                             │
│ ┃                                                                │
│ ┃  ┌────────────────────────────────────────────────────────┐  │
│ ┃  │ [Accept Group Catchup] [Modify Group ▼] [Dismiss]     │  │
│ ┃  └────────────────────────────────────────────────────────┘  │
│ ┃                                                                │
└────────────────────────────────────────────────────────────────┘

Visual Elements:
- Green left border (4px, #10b981)
- 3 overlapping circular avatars
- "Group Catchup" badge (green background)
- Shared context badge (yellow background)
- Status badge (orange for pending)
- Green group badges
- Blue tag badges
- Three action buttons
```

## Individual Suggestion Card (Detailed)

```
┌────────────────────────────────────────────────────────────────┐
│ ┃                                                                │
│ ┃  ┌──┐  Connect with Sarah Williams                            │
│ ┃  │SW│  [One-on-One]                        [pending]          │
│ ┃  └──┘                                                          │
│ ┃                                                                │
│ ┃  Time: Thursday, November 28, 2025 10:00 AM - 11:00 AM        │
│ ┃                                                                │
│ ┃  Reason: It's been 4 weeks since you last connected with      │
│ ┃  Sarah. She prefers monthly catchups.                         │
│ ┃                                                                │
│ ┃  Member of:                                                   │
│ ┃  [Book Club] [Coffee Lovers]                                  │
│ ┃                                                                │
│ ┃  Interests:                                                   │
│ ┃  [coffee] [books] [writing]                                   │
│ ┃                                                                │
│ ┃  ┌────────────────────────────────────────────────────────┐  │
│ ┃  │ [Accept] [Dismiss] [Snooze]                            │  │
│ ┃  └────────────────────────────────────────────────────────┘  │
│ ┃                                                                │
└────────────────────────────────────────────────────────────────┘

Visual Elements:
- Blue left border (4px, #3b82f6)
- Single circular avatar
- "One-on-One" badge (blue background)
- Status badge (orange for pending)
- Green group badges
- Blue tag badges
- Three action buttons
```

## Avatar Display Patterns

### Single Avatar (Individual)
```
┌──────┐
│  SW  │  ← Single avatar, centered
└──────┘
```

### Two Avatars (Group)
```
┌──────┐┌──────┐
│  JD  ││  JS  │  ← Overlapping by 12px
└──────┘└──────┘
   ↑       ↑
 z-index  z-index
   10       9
```

### Three Avatars (Group)
```
┌──────┐┌──────┐┌──────┐
│  JD  ││  JS  ││  MJ  │  ← Each overlapping by 12px
└──────┘└──────┘└──────┘
   ↑       ↑       ↑
 z-index  z-index z-index
   10       9       8
```

## Contact Tooltip

```
Hover over avatar:

        ┌──────┐
        │  JD  │  ← Avatar
        └──┬───┘
           │
           ▼
    ┌─────────────────────┐
    │  John Doe           │  ← Name (bold)
    │  📧 john@example.com│  ← Email
    │  📱 +1234567890     │  ← Phone
    │  📍 Seattle, WA     │  ← Location
    │  🔄 weekly          │  ← Frequency
    └─────────────────────┘
    
Dark background (#1f2937)
White text
Smooth fade-in/out
```

## Group Modify Menu

```
Click "Modify Group ▼":

                    [Modify Group ▼]
                           │
                           ▼
                    ┌──────────────────────┐
                    │ REMOVE CONTACT       │
                    ├──────────────────────┤
                    │ ❌ John Doe          │  ← Hover: light gray bg
                    │ ❌ Jane Smith        │
                    │ ❌ Mike Johnson      │
                    ├──────────────────────┤
                    │ 🗑️ Dismiss Entire   │  ← Hover: light red bg
                    │    Group             │  ← Red text
                    └──────────────────────┘

White background
Border and shadow
Click outside to close
```

## Badge Styles

### Type Badges
```
Group:      [Group Catchup]     ← Green bg (#d1fae5), dark green text
Individual: [One-on-One]        ← Blue bg (#dbeafe), dark blue text
```

### Status Badges
```
[pending]   ← Orange bg (#f59e0b)
[accepted]  ← Green bg (#10b981)
[dismissed] ← Gray bg (#6b7280)
[snoozed]   ← Blue bg (#3b82f6)
```

### Shared Context Badge
```
🤝 2 common groups, 3 shared interests, mentioned together 5 times
└─────────────────────────────────────────────────────────────┘
Yellow background (#fef3c7)
Brown text (#92400e)
Yellow border (#fde68a)
```

### Group Badges
```
[Outdoor Friends] [College Buddies]
└───────────────┘ └──────────────┘
Green background
White text
Rounded corners
```

### Tag Badges
```
[hiking] [photography] [camping]
└──────┘ └───────────┘ └───────┘
Blue background
White text
Rounded corners
```

## Color Palette

### Avatar Colors (Rotating)
1. Blue: #3b82f6
2. Green: #10b981
3. Orange: #f59e0b
4. Red: #ef4444
5. Purple: #8b5cf6

### Border Colors
- Group: #10b981 (green)
- Individual: #3b82f6 (blue)

### Badge Backgrounds
- Group type: #d1fae5 (light green)
- Individual type: #dbeafe (light blue)
- Shared context: #fef3c7 (light yellow)
- Status pending: #f59e0b (orange)
- Status accepted: #10b981 (green)
- Status dismissed: #6b7280 (gray)
- Status snoozed: #3b82f6 (blue)

### Text Colors
- Primary: #333333
- Secondary: #6b7280
- Group badge text: #065f46
- Individual badge text: #1e40af
- Shared context text: #92400e

## Responsive Behavior

### Desktop (> 768px)
- Full width cards
- Avatars: 48px × 48px
- All badges visible
- Horizontal button layout

### Tablet (768px - 480px)
- Slightly narrower cards
- Avatars: 48px × 48px
- All badges visible
- Horizontal button layout (may wrap)

### Mobile (< 480px)
- Full width cards
- Avatars: 40px × 40px
- Badges may wrap
- Vertical button layout
- Tooltip positioning adjusted

## Animation & Transitions

### Avatar Hover
```
Normal:  transform: translateY(0)
         box-shadow: 0 2px 4px rgba(0,0,0,0.1)

Hover:   transform: translateY(-2px)
         box-shadow: 0 4px 8px rgba(0,0,0,0.15)
         
Duration: 0.2s
```

### Tooltip Fade
```
Hidden:  opacity: 0

Visible: opacity: 1

Duration: 0.2s
```

### Button Hover
```
Normal:  background: #2563eb

Hover:   background: #1d4ed8

Duration: 0.2s
```

## Accessibility Features

1. **Color Contrast**: All text meets WCAG AA standards
2. **Multiple Indicators**: Not relying on color alone
   - Border color + badge + icon
3. **Hover States**: Clear visual feedback
4. **Focus States**: Keyboard navigation support
5. **Semantic HTML**: Proper heading hierarchy
6. **Alt Text**: Meaningful labels for screen readers

## Print Layout

When printing:
- Remove hover effects
- Flatten tooltips (show inline)
- Simplify colors (grayscale friendly)
- Maintain layout structure
- Show all information

## Dark Mode Considerations

For future dark mode support:
- Invert background colors
- Adjust text colors for contrast
- Maintain badge distinctiveness
- Update shadow colors
- Test tooltip visibility
