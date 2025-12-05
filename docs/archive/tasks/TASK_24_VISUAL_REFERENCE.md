# Task 24: Visual Reference Guide

## 🎨 What to Look For

This guide shows you exactly what the UI should look like after the Cozy Productivity refactor.

---

## Theme Comparison

### Latte Mode (Light Theme)
```
┌─────────────────────────────────────────────────────────┐
│ Background: Warm Alabaster (#FDFCFB)                    │
│ ┌─────────────┬─────────────────────────────────────┐  │
│ │ Sidebar     │ Main Content                        │  │
│ │ Stone-100   │ Cards: White (#FFFFFF)              │  │
│ │ (#F5F5F4)   │ Text: Deep Stone (#1C1917)          │  │
│ │             │ Accent: Warm Amber (#92400E)        │  │
│ │ CatchUp     │                                     │  │
│ │             │ ┌─────────────────────────────────┐ │  │
│ │ 📁 Directory│ │ Contact Card                    │ │  │
│ │ ✨ Suggest. │ │ White background                │ │  │
│ │ ✏️  Edits   │ │ Subtle 1px border               │ │  │
│ │             │ │ 12px border radius              │ │  │
│ │             │ └─────────────────────────────────┘ │  │
│ └─────────────┴─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key Visual Characteristics:**
- ✅ Warm, inviting background (not stark white)
- ✅ Subtle borders (1px, not heavy shadows)
- ✅ Smooth corners (12px radius)
- ✅ Warm amber accents (not bright blue)
- ✅ Deep stone text (not pure black)

### Espresso Mode (Dark Theme)
```
┌─────────────────────────────────────────────────────────┐
│ Background: Deep Coffee (#0C0A09)                       │
│ ┌─────────────┬─────────────────────────────────────┐  │
│ │ Sidebar     │ Main Content                        │  │
│ │ Stone-2     │ Cards: Stone-3 (#292524)            │  │
│ │ (#1C1917)   │ Text: Light Stone (#FAFAF9)         │  │
│ │             │ Accent: Bright Amber (#F59E0B)      │  │
│ │ CatchUp     │                                     │  │
│ │             │ ┌─────────────────────────────────┐ │  │
│ │ 📁 Directory│ │ Contact Card                    │ │  │
│ │ ✨ Suggest. │ │ Dark warm background            │ │  │
│ │ ✏️  Edits   │ │ Visible subtle border           │ │  │
│ │             │ │ 12px border radius              │ │  │
│ │             │ └─────────────────────────────────┘ │  │
│ └─────────────┴─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key Visual Characteristics:**
- ✅ Deep warm background (not pure black)
- ✅ Visible borders in dark mode
- ✅ Light text (not pure white)
- ✅ Brighter amber for visibility
- ✅ Warm coffee tones throughout

---

## Component Visual Guide

### 1. Sidebar Navigation

**Latte Mode:**
```
┌──────────────┐
│  CatchUp     │ ← 14px bold, Stone-12
├──────────────┤
│              │
│ 📁 Directory │ ← SVG icon (not emoji)
│              │
│ ✨ Suggest.  │ ← Thin stroke icons
│              │
│ ✏️  Edits  3 │ ← Badge: Amber bg
│              │
├──────────────┤
│ 👤 John Doe  │ ← User pill at bottom
└──────────────┘
```

**Active State:**
```
│ ✏️  Edits  3 │ ← Amber text + clay tint bg
  ^^^^^^^^^^^^
  rgba(163, 105, 82, 0.1)
```

### 2. Segmented Control

**Latte Mode:**
```
┌─────────────────────────────────────────────┐
│ [Contacts] [Circles] [Groups] [Tags]        │
│  ^^^^^^^^                                    │
│  Active: White bg + subtle shadow           │
└─────────────────────────────────────────────┘
```

**Espresso Mode:**
```
┌─────────────────────────────────────────────┐
│ [Contacts] [Circles] [Groups] [Tags]        │
│  ^^^^^^^^                                    │
│  Active: Stone-700 bg                       │
└─────────────────────────────────────────────┘
```

### 3. Contact Card

**Latte Mode:**
```
┌─────────────────────────────────────────────┐
│ 🟢 John Doe                    [Edit] [Del] │ ← Avatar: Warm pastel
│ john@example.com                             │ ← Secondary text
│                                              │
│ 🏷️ Friend  👥 Family                        │ ← Warm badges
└─────────────────────────────────────────────┘
  White bg, 1px border, 12px radius
```

**Avatar Colors:**
- 🟢 Sage: `#d1fae5` bg, `#065f46` text
- 🟡 Sand: `#fef3c7` bg, `#92400e` text
- 🔴 Rose: `#fce7f3` bg, `#9d174d` text
- ⚪ Stone: `#e7e5e4` bg, `#44403c` text

### 4. Suggestion Card

**Latte Mode:**
```
┌─────────────────────────────────────────────┐
│ 👤 Sarah Johnson                             │
│                                              │
│ You both enjoy hiking and haven't           │
│ connected in 3 weeks                         │
│                                              │
│ [Pending]                    [Accept] [Dismiss] │
│  ^^^^^^^^                     ^^^^^^          │
│  Warm amber                   High contrast  │
└─────────────────────────────────────────────┘
  12px radius, warm styling
```

### 5. Edits Page - Diff Styling

**Old Value (Strikethrough + Red Tint):**
```
┌─────────────────────────────────────────────┐
│ Name: John Smith                             │
│       ^^^^^^^^^^                             │
│       Strikethrough + rgba(248, 113, 113, 0.1) │
└─────────────────────────────────────────────┘
```

**New Value (Bold + Green Tint):**
```
┌─────────────────────────────────────────────┐
│ Name: John Doe                               │
│       ^^^^^^^^                               │
│       Bold + rgba(74, 222, 128, 0.1)        │
└─────────────────────────────────────────────┘
```

### 6. Modal

**Latte Mode:**
```
┌─────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────┐     │
│  │ Create Contact              [×]    │     │ ← Header
│  ├────────────────────────────────────┤     │
│  │                                    │     │
│  │ Name: [________________]           │     │ ← Input: bg-app
│  │                                    │     │
│  │ Email: [________________]          │     │
│  │                                    │     │
│  │         [Cancel]  [Create]         │     │ ← Buttons
│  └────────────────────────────────────┘     │
│                                              │
│  Backdrop: blur(4px) + rgba(28,25,23,0.4)  │
└─────────────────────────────────────────────┘
```

**Modal Features:**
- Backdrop blur effect (visible behind modal)
- 12px border radius
- Warm background (--bg-surface)
- Subtle border (--border-subtle)
- Primary button: Dark bg, light text
- Secondary button: Transparent + border

### 7. Toast Notifications

**Success Toast:**
```
┌─────────────────────────────────────────────┐
│ ✓ Contact created successfully              │
│ ▌                                            │
│ ▌← Green left border                        │
│ ▌   Sage green bg (#d1fae5 in Latte)       │
└─────────────────────────────────────────────┘
```

**Error Toast:**
```
┌─────────────────────────────────────────────┐
│ ✗ Failed to save contact                    │
│ ▌                                            │
│ ▌← Red left border                          │
│ ▌   Warm red bg (#fee2e2 in Latte)         │
└─────────────────────────────────────────────┘
```

---

## Responsive Layouts

### Desktop (≥ 1024px)
```
┌────────────────────────────────────────────────────────┐
│ ┌──────────┬──────────────────────────────────────┐   │
│ │ Sidebar  │ Main Content (max-width: 1000px)     │   │
│ │ 240px    │                                      │   │
│ │ Fixed    │ ┌──────────────────────────────────┐ │   │
│ │          │ │ Content centered                 │ │   │
│ │          │ │                                  │ │   │
│ │          │ └──────────────────────────────────┘ │   │
│ └──────────┴──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)
```
┌────────────────────────────────────────────────────────┐
│ ☰ [Hamburger]                                          │
│                                                        │
│ ┌────────────────────────────────────────────────────┐│
│ │ Main Content (full width)                          ││
│ │                                                    ││
│ └────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘

[Sidebar slides in from left when hamburger clicked]
```

### Mobile (< 768px)
```
┌──────────────────────┐
│ Main Content         │
│ (full width)         │
│                      │
│ ┌──────────────────┐ │
│ │ Card             │ │
│ │ (stacked)        │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Card             │ │
│ └──────────────────┘ │
├──────────────────────┤
│ 📁  ✨  ✏️  ⚙️      │ ← Bottom nav
└──────────────────────┘
```

---

## Color Swatches

### Latte Mode Palette

**Backgrounds:**
- App: `#FDFCFB` ░░░░░░ (warm alabaster)
- Sidebar: `#F5F5F4` ▒▒▒▒▒▒ (Stone-100)
- Surface: `#FFFFFF` ██████ (white)

**Text:**
- Primary: `#1C1917` ██████ (Stone-12)
- Secondary: `#78716C` ▓▓▓▓▓▓ (Stone-11)
- Tertiary: `#A8A29E` ▒▒▒▒▒▒ (Stone-6)

**Accent:**
- Primary: `#92400E` ██████ (Amber-9)
- Hover: `#78350F` ▓▓▓▓▓▓ (Amber-10)
- Subtle: `#FDE68A` ░░░░░░ (Amber-3)

### Espresso Mode Palette

**Backgrounds:**
- App: `#0C0A09` ██████ (deep coffee)
- Sidebar: `#1C1917` ▓▓▓▓▓▓ (Stone-2 dark)
- Surface: `#292524` ▒▒▒▒▒▒ (Stone-3 dark)

**Text:**
- Primary: `#FAFAF9` ░░░░░░ (Stone-12 dark)
- Secondary: `#A8A29E` ▒▒▒▒▒▒ (Stone-11 dark)
- Tertiary: `#78716C` ▓▓▓▓▓▓ (Stone-6 dark)

**Accent:**
- Primary: `#F59E0B` ░░░░░░ (Amber-9 dark)
- Hover: `#FBBF24` ░░░░░░ (Amber-10 dark)
- Subtle: `rgba(245, 158, 11, 0.15)` (Amber-3 dark)

---

## Visual Checklist

### ✅ Warm & Cozy
- [ ] No stark white backgrounds
- [ ] No pure black text
- [ ] No cool blue-grays
- [ ] Warm earth tones throughout
- [ ] Coffee shop vibe

### ✅ Subtle & Refined
- [ ] 1px borders (not heavy shadows)
- [ ] 12px border radius (smooth)
- [ ] Soft color transitions
- [ ] Gentle hover states
- [ ] Minimal visual noise

### ✅ Readable & Accessible
- [ ] High contrast text
- [ ] Clear visual hierarchy
- [ ] Consistent spacing
- [ ] Touch-friendly targets (44px min)
- [ ] No pure black on pure white

### ✅ Responsive & Adaptive
- [ ] Fixed sidebar on desktop
- [ ] Collapsible sidebar on tablet
- [ ] Bottom nav on mobile
- [ ] Cards stack on mobile
- [ ] Content scales appropriately

### ✅ Consistent & Cohesive
- [ ] Same warm tones everywhere
- [ ] Consistent border radius
- [ ] Unified button styles
- [ ] Matching badge colors
- [ ] Coherent spacing system

---

## Common Visual Issues

### ❌ Wrong: Cool Blue-Gray
```
Background: #F3F4F6 (cool gray)
Text: #111827 (pure black)
Accent: #3B82F6 (bright blue)
```

### ✅ Right: Warm Stone & Clay
```
Background: #FDFCFB (warm alabaster)
Text: #1C1917 (deep stone)
Accent: #92400E (warm amber)
```

### ❌ Wrong: Heavy Shadows
```
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
```

### ✅ Right: Subtle Borders
```
border: 1px solid var(--border-subtle);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
```

### ❌ Wrong: Sharp Corners
```
border-radius: 4px;
```

### ✅ Right: Smooth Corners
```
border-radius: 12px;
```

---

## Side-by-Side Comparison

### Before (Old UI)
- Cool blue-gray backgrounds
- Stark white cards
- Heavy drop shadows
- Sharp corners (4px)
- Bright blue accents
- Pure black text

### After (Cozy Productivity)
- Warm alabaster/coffee backgrounds
- Subtle stone-toned cards
- 1px borders with minimal shadows
- Smooth corners (12px)
- Warm amber/terracotta accents
- Deep stone text (not pure black)

---

## Testing Tip

**Quick Visual Test:**
1. Open the app in Latte mode
2. Ask yourself: "Does this feel like a cozy coffee shop?"
3. If yes → ✅ Correct
4. If it feels sterile/clinical → ❌ Needs adjustment

**Color Temperature Test:**
1. Take a screenshot
2. Convert to grayscale
3. Should still feel warm (not cold/clinical)

---

## Reference Images

While we can't include actual images here, look for these visual qualities:

**Inspiration:**
- Notion (Sepia mode) - Warm, tactile
- Linear (Dawn theme) - Soft, refined
- Arc (Earthy spaces) - Grounded, organic

**Avoid:**
- Stark white backgrounds
- Cool blue-grays
- Heavy shadows
- Clinical/sterile feel

---

## Success Indicators

You'll know the refactor is successful when:

1. **First Impression**: "This feels warm and inviting"
2. **Color Check**: No pure black, white, or cool grays
3. **Border Check**: Subtle 1px borders, not heavy shadows
4. **Accent Check**: Warm amber/terracotta, not bright blue
5. **Theme Check**: Both modes feel cohesive and warm
6. **Responsive Check**: Layout adapts smoothly
7. **Overall Feel**: "Digital coffee shop" vibe

---

**Use this guide alongside the interactive test page for complete verification!**
