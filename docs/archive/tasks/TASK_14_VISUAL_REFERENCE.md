# Task 14: Suggestions Page - Visual Reference

## Quick Visual Guide

### Card Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Avatar(s)] Connect with [Name(s)]  [Type Badge]  [Status] │
│             [Shared Context Badge]                          │
│                                                             │
│ Time: [DateTime]                                           │
│ Reason: [Reasoning text]                                   │
│                                                             │
│ Common Groups: [Badge] [Badge]                             │
│ Shared Interests: [Badge] [Badge] [Badge]                 │
│                                                             │
│ [Primary Button] [Secondary] [Secondary] [Secondary]       │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette

#### Status Badges
- **Pending**: `#f59e0b` (Warm Amber) - Orange/amber tone
- **Accepted**: `#10b981` (Sage Green) - Soft green
- **Dismissed**: `#78716C` (Stone-500) - Warm gray
- **Snoozed**: `#3b82f6` (Warm Blue) - Soft blue

#### Avatar Colors (Group Suggestions)
1. **Sage**: `#d1fae5` bg / `#065f46` text
2. **Sand**: `#fef3c7` bg / `#92400e` text
3. **Rose**: `#fce7f3` bg / `#9d174d` text
4. **Stone**: `#e7e5e4` bg / `#44403c` text
5. **Lavender**: `#e9d5ff` bg / `#6b21a8` text

### Typography Hierarchy

```
Connect with [Name]          → var(--text-primary), 16px, bold
Type Badge                   → var(--text-secondary), 12px, 500
Shared Context Badge         → var(--text-secondary), 13px
Time/Reason Labels          → var(--text-primary), 14px
Section Headers             → var(--text-primary), 14px, bold
"No actions available"      → var(--text-secondary), 14px
```

### Button Styles

#### Primary Button (Accept)
```css
background: var(--text-primary)
color: var(--bg-surface)
padding: 10px 20px
border-radius: 8px
font-weight: 600
```

#### Secondary Button (Ghost)
```css
background: transparent
color: var(--text-primary)
border: 1px solid var(--border-subtle)
padding: 10px 20px
border-radius: 8px
hover: var(--bg-hover)
```

### Avatar Overlap Pattern

Group suggestions show overlapping avatars:
```
  ┌──┐
  │AS│
  └──┘
    ┌──┐
    │BJ│
    └──┘
      ┌──┐
      │CK│
      └──┘
```
- Each avatar: 40px diameter
- Overlap: -12px margin-left
- Border: 2px solid white
- Z-index: Decreasing (10, 9, 8...)

### Badge Styles

#### Tag Badge
```css
background: var(--status-info-bg)
color: var(--status-info)
padding: 4px 10px
border-radius: 12px
font-size: 12px
```

#### Group Badge
```css
background: #fef3c7 (warm sand)
color: #92400e (dark amber)
padding: 4px 10px
border-radius: 12px
font-size: 12px
```

## Example Layouts

### Individual Suggestion (Pending)
- Single sage green avatar
- "One-on-One" type badge
- Amber "pending" status
- 4 action buttons: Accept (primary), View Schedule, Dismiss, Snooze (all secondary)

### Group Suggestion (Pending)
- 3+ overlapping warm pastel avatars
- "Group Catchup" type badge
- Shared context badge with details
- Common groups and interests sections
- 4 action buttons: Accept Group Catchup (primary), View Schedule, Modify Group, Dismiss (all secondary)

### Accepted/Dismissed Suggestion
- Single avatar
- Green "accepted" or gray "dismissed" status
- 1 action button: View Schedule (secondary)
- "No other actions available" text

## Testing Checklist

### Visual Tests
- [ ] Cards have 12px border radius
- [ ] Cards use warm surface background
- [ ] Status badges show correct colors
- [ ] Avatars use warm pastel colors
- [ ] Group avatars overlap correctly
- [ ] Buttons have proper contrast
- [ ] Typography uses design tokens
- [ ] Hover states work smoothly

### Theme Tests
- [ ] Latte mode: Light warm backgrounds
- [ ] Espresso mode: Dark warm backgrounds
- [ ] Text remains readable in both modes
- [ ] Borders visible in both modes
- [ ] Status badges maintain contrast

### Responsive Tests
- [ ] Cards stack properly on mobile
- [ ] Buttons wrap on narrow screens
- [ ] Avatars remain visible
- [ ] Text doesn't overflow

## Browser Testing
Test in: Chrome, Firefox, Safari, Edge
- Desktop (1920x1080, 1366x768)
- Tablet (768x1024)
- Mobile (375x667, 414x896)
