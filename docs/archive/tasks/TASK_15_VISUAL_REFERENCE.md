# Task 15: Edits Page - Visual Reference

## Color Palette

### Primary Colors
- **Accent Primary**: `var(--accent-primary)` - Clay/Amber for primary actions
- **Background Surface**: `var(--bg-surface)` - White/Stone-800 for cards
- **Border Subtle**: `var(--border-subtle)` - Stone-200/Stone-700 for borders

### Diff Colors
- **Old Value (Latte)**: `rgba(248, 113, 113, 0.1)` background, `#dc2626` text
- **Old Value (Espresso)**: `rgba(239, 68, 68, 0.15)` background, `#fca5a5` text
- **New Value (Latte)**: `rgba(74, 222, 128, 0.1)` background, `#059669` text
- **New Value (Espresso)**: `rgba(16, 185, 129, 0.15)` background, `#6ee7b7` text

### Avatar Variants
- **Default**: `var(--accent-primary)` - Clay/Amber
- **Sage**: `#d1fae5` background, `#065f46` text
- **Sand**: `#fef3c7` background, `#92400e` text
- **Rose**: `#fce7f3` background, `#9d174d` text
- **Stone**: `#e7e5e4` background, `#44403c` text

## Component Styling

### 1. Edits Menu
```
┌─────────────────────────────────────┐
│ Pending Edits                       │ ← --text-primary
├─────────────────────────────────────┤
│ [Pending (3)] [History]             │ ← Active tab has warm tint
├─────────────────────────────────────┤
│                                     │
│  Content area                       │
│  --bg-surface background            │
│  --border-subtle border             │
│                                     │
└─────────────────────────────────────┘
```

**Styling:**
- Background: `var(--bg-surface)`
- Border: `1px solid var(--border-subtle)`
- Border radius: `12px`
- Active tab: `rgba(163, 105, 82, 0.05)` background tint

### 2. Contact Group Header
```
┌─────────────────────────────────────┐
│ [JD] John Doe    [5 edits]      [▼] │
└─────────────────────────────────────┘
  ↑                  ↑
  Avatar            Count badge
  (warm pastel)     (warm styling)
```

**Avatar Styling:**
- Size: `24px` diameter
- Border radius: `50%`
- Font: `11px`, weight `600`
- Colors: Default clay/amber or pastel variants

**Count Badge:**
- Background: `var(--accent-subtle)`
- Color: `var(--accent-primary)`
- Border radius: `3px`
- Padding: `2px 8px`

### 3. Diff Styling
```
Old Value:  [This is the old value]  ← Strikethrough, warm red tint
New Value:  [This is the new value]  ← Bold, sage green tint
```

**Old Value:**
- Text decoration: `line-through`
- Background: `rgba(248, 113, 113, 0.1)` (Latte)
- Color: `#dc2626`
- Padding: `2px 6px` (compact)

**New Value:**
- Font weight: `600` (bold)
- Background: `rgba(74, 222, 128, 0.1)` (Latte)
- Color: `#059669`
- Padding: `2px 6px` (compact)

### 4. Bulk Action Buttons
```
[✓ Accept All]  [✕ Reject All]
     ↑               ↑
   Solid          Ghost style
   sage green     (fills on hover)
```

**Accept Button:**
- Background: `#10b981` (sage green)
- Color: `white`
- Border: `none`
- Hover: Darker green with lift effect

**Reject Button:**
- Background: `transparent`
- Color: `#ef4444` (warm red)
- Border: `1px solid #ef4444`
- Hover: Fills with red, white text

### 5. Empty State
```
        📝
        
No pending edits. Start a 
conversation to generate 
suggestions!

    [💬 Open Chat]
```

**Styling:**
- Icon: `48px`, `opacity: 0.5`
- Text: `var(--text-secondary)`, centered
- Button: `var(--accent-primary)` background
- Button hover: Lift effect with enhanced shadow

### 6. Edit Item
```
┌─────────────────────────────────────┐
│ [ADD TAG] Confidence: 95%  2 min ago│
│                                     │
│ Add tag "hiking" to [John Doe]      │
│                                     │
│ 🎤 Voice Note "John loves hiking..." │
│                                     │
│              [Dismiss] [Accept]     │
└─────────────────────────────────────┘
```

**Type Badge:**
- Background: Type-specific color
- Color: `white`
- Font: `11px`, weight `600`, uppercase
- Border radius: `4px`

**Action Buttons:**
- Dismiss: Ghost style with warm red
- Accept: Solid with `var(--accent-primary)`
- Border radius: `6px`

### 7. Contact Group with Items
```
┌─────────────────────────────────────┐
│ [SM] Sarah Miller  [3 edits]    [▼] │ ← Header
├─────────────────────────────────────┤
│ 🏷️ [ADD] Tag: "photography"  [92%] │ ← Item 1
│                          [✓] [✕]    │
├─────────────────────────────────────┤
│ 👥 [ADD] Group: "Creative..."  [68%]│ ← Item 2
│                          [✓] [✕]    │
├─────────────────────────────────────┤
│ [✓ Accept All] [✕ Reject All]       │ ← Footer
└─────────────────────────────────────┘
```

**Item Styling:**
- Border bottom: `1px solid var(--border-subtle)`
- Hover: `var(--bg-hover)` background
- Padding: `8px 12px`

**Confidence Badge:**
- High (75-100%): `#10b981` (sage green)
- Mid (50-75%): `#f59e0b` (amber)
- Low (0-50%): `#ef4444` (warm red)

## Spacing & Typography

### Spacing
- Menu padding: `16px`
- Item gap: `12px`
- Compact spacing: `8px`
- Button padding: `12px 24px`

### Typography
- Title: `20px`, weight `600`
- Tab: `14px`, weight `500`
- Item field: `13px`, weight `500`
- Item value: `12px`
- Badge: `11px`, weight `600`

## Shadows

### Light Shadows (Warm Theme)
- Default: `0 1px 3px rgba(0, 0, 0, 0.05)`
- Large: `0 4px 12px rgba(0, 0, 0, 0.08)`
- Button hover: `0 2px 8px rgba(0, 0, 0, 0.15)`

### No Heavy Shadows
- Depth created primarily through 1px borders
- Subtle shadows for floating elements only

## Transitions

- Fast: `150ms ease`
- Normal: `200ms ease`
- Slow: `300ms ease`

## Responsive Behavior

### Mobile (<768px)
- Items stack vertically
- Bulk actions become full width
- Reduced padding and font sizes
- Source badges hidden

### Tablet (768-1023px)
- Bulk actions in header hidden
- Footer actions remain visible

### Desktop (>=1024px)
- Full layout with all features
- Hover states for bulk actions in header

## Dark Mode (Espresso)

All colors automatically adapt via CSS variables:
- Backgrounds become darker stone tones
- Text becomes lighter
- Borders use darker stone
- Diff colors use adjusted opacity
- Shadows remain subtle

## Testing Checklist

- [ ] Menu displays with warm background and borders
- [ ] Active tab has subtle clay tint
- [ ] Avatar variants display correctly
- [ ] Old values show strikethrough with red tint
- [ ] New values show bold with green tint
- [ ] Accept button is solid sage green
- [ ] Reject button is ghost style
- [ ] Empty state displays with warm button
- [ ] Edit items have warm type badges
- [ ] Contact groups expand/collapse correctly
- [ ] Bulk actions work in footer
- [ ] Theme toggle switches correctly
- [ ] All colors adapt in dark mode
