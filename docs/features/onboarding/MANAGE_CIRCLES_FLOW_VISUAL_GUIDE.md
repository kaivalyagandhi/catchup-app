# Manage Circles Flow - Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Organize Your Circles                                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 💡 Understanding Your Circles                            │ │
│  │ Based on Dunbar's research, most people maintain 10-25   │ │
│  │ close friendships. Our simplified 4-circle system helps  │ │
│  │ you focus on relationships that matter most.             │ │
│  │ ▶ Learn more about the science                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search contacts...                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Progress: 8/15 contacts categorized                           │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 53%                                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Circle Capacities:                                        │ │
│  │ 💎 Inner Circle:        3/10                              │ │
│  │ 🌟 Close Friends:       2/25                              │ │
│  │ ✨ Active Friends:      2/50                              │ │
│  │ 🤝 Casual Network:      1/100                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Contact Grid:                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│  │   AJ   │ │   BS   │ │   CB   │ │   DP   │                │
│  │ Alice  │ │  Bob   │ │Charlie │ │ Diana  │                │
│  │ Johnson│ │ Smith  │ │ Brown  │ │ Prince │                │
│  │ [▼]    │ │ [▼]    │ │ [▼]    │ │ [▼]    │                │
│  │ 💎 Inner│ │🌟 Close│ │Select..│ │✨Active│                │
│  └────────┘ └────────┘ └────────┘ └────────┘                │
│                                                                 │
│  [Skip for Now]                    [Save & Continue]           │
└─────────────────────────────────────────────────────────────────┘
```

## Educational Tip - Expanded

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Understanding Your Circles                                   │
│ Based on Dunbar's research, most people maintain 10-25 close   │
│ friendships. Our simplified 4-circle system helps you focus on │
│ relationships that matter most.                                 │
│ ▼ Learn more about the science                                 │
│ ─────────────────────────────────────────────────────────────  │
│ Inner Circle (up to 10): Your closest confidants—people you'd  │
│ call in a crisis. These are often virtue-based friendships     │
│ built on mutual respect and shared values (Aristotle's highest │
│ form of friendship).                                            │
│                                                                 │
│ Close Friends (up to 25): Good friends you regularly share     │
│ life updates with. Mix of virtue and pleasure-based            │
│ friendships—people you enjoy spending time with and trust.     │
│                                                                 │
│ Active Friends (up to 50): People you want to stay connected   │
│ with regularly. Often pleasure-based friendships around shared │
│ activities or interests.                                        │
│                                                                 │
│ Casual Network (up to 100): Acquaintances you keep in touch    │
│ with occasionally. Often utility-based professional or         │
│ contextual relationships.                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Contact Card - With AI Suggestion

```
┌────────────────┐
│      AJ        │  ← Avatar with initials (warm pastel color)
│  Alice Johnson │  ← Contact name
│  [▼ Select...] │  ← Circle dropdown
│  ┌──────────┐  │
│  │Suggested:│  │  ← AI suggestion badge
│  │🌟 Close  │  │
│  │   85%    │  │  ← Confidence score
│  └──────────┘  │
└────────────────┘
```

## Contact Card - Assigned

```
┌────────────────┐
│      BS        │
│   Bob Smith    │
│  [💎 Inner ▼]  │  ← Selected circle
└────────────────┘
```

## Contact Card - Over Capacity Warning

```
┌────────────────┐
│      EA        │
│ Eve Anderson   │
│  [💎 Inner ▼]  │
└────────────────┘

Circle Capacities:
💎 Inner Circle: 11/10 ⚠️ Over capacity
```

## Search - No Results

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 xyz                                                          │
└─────────────────────────────────────────────────────────────────┘

No contacts found matching "xyz"
```

## Mobile Layout (< 768px)

```
┌───────────────────────────┐
│ Organize Your Circles [X] │
├───────────────────────────┤
│ 💡 Understanding...       │
│ [collapsed by default]    │
├───────────────────────────┤
│ 🔍 Search...              │
├───────────────────────────┤
│ Progress: 8/15 (53%)      │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░     │
├───────────────────────────┤
│ Circle Capacities:        │
│ 💎 Inner: 3/10            │
│ 🌟 Close: 2/25            │
│ ✨ Active: 2/50           │
│ 🤝 Casual: 1/100          │
├───────────────────────────┤
│ ┌──────┐ ┌──────┐        │
│ │  AJ  │ │  BS  │        │  ← Single column grid
│ │Alice │ │ Bob  │        │
│ │[▼]   │ │[▼]   │        │
│ └──────┘ └──────┘        │
│ ┌──────┐ ┌──────┐        │
│ │  CB  │ │  DP  │        │
│ │Charlie│ │Diana │        │
│ │[▼]   │ │[▼]   │        │
│ └──────┘ └──────┘        │
├───────────────────────────┤
│ [Skip for Now]            │  ← Stacked buttons
│ [Save & Continue]         │
└───────────────────────────┘
```

## Color Palette

### Avatar Colors (Warm Pastels)
- **Sage**: `#d1fae5` background, `#065f46` text
- **Sand**: `#fef3c7` background, `#92400e` text
- **Rose**: `#fce7f3` background, `#9d174d` text
- **Stone**: `#e7e5e4` background, `#44403c` text

### Circle Emojis
- **Inner Circle**: 💎 (Diamond)
- **Close Friends**: 🌟 (Star)
- **Active Friends**: ✨ (Sparkles)
- **Casual Network**: 🤝 (Handshake)

### Theme Colors (Stone & Clay)
- **Primary Accent**: Amber/Terracotta
- **Background**: Warm alabaster (light) / Deep coffee (dark)
- **Text**: Stone-700 (light) / Stone-100 (dark)
- **Borders**: Subtle 1px borders for depth

## Interaction States

### Button States

**Primary Button (Save & Continue)**
```
Normal:  [Save & Continue]  ← Amber background
Hover:   [Save & Continue]  ← Darker amber
Active:  [Save & Continue]  ← Slightly scaled down
```

**Secondary Button (Skip for Now)**
```
Normal:  [Skip for Now]     ← Transparent with border
Hover:   [Skip for Now]     ← Light background
Active:  [Skip for Now]     ← Slightly scaled down
```

### Contact Card States

```
Normal:  ┌────────┐
         │   AJ   │
         └────────┘

Hover:   ┌────────┐  ← Subtle shadow + lift
         │   AJ   │
         └────────┘
```

### Dropdown States

```
Normal:  [Select circle... ▼]
Focus:   [Select circle... ▼]  ← Accent border
Open:    [Select circle... ▼]
         ├─ 💎 Inner Circle
         ├─ 🌟 Close Friends
         ├─ ✨ Active Friends
         └─ 🤝 Casual Network
```

## Progress Bar States

```
0%:    ░░░░░░░░░░░░░░░░░░░░  0%
25%:   ▓▓▓▓▓░░░░░░░░░░░░░░░  25%
50%:   ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  50%
75%:   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  75%
100%:  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%
```

## Animation Examples

### Modal Entrance
```
Frame 1: [Fade in + Slide up from bottom]
Frame 2: [Continue sliding]
Frame 3: [Settle in position]
Duration: 300ms ease-out
```

### Card Removal (After Assignment)
```
Frame 1: [Full opacity]
Frame 2: [Fade out]
Frame 3: [Removed from DOM]
Duration: 300ms
```

### Progress Bar Update
```
Frame 1: [Current width]
Frame 2: [Animate to new width]
Frame 3: [New width]
Duration: 300ms ease
```

## Accessibility Features

### Keyboard Navigation
```
Tab:       Move between interactive elements
Enter:     Activate button/dropdown
Escape:    Close modal
Arrow Up:  Navigate dropdown options
Arrow Down: Navigate dropdown options
```

### Focus Indicators
```
[Button]       ← 2px accent outline
[Input]        ← 2px accent outline
[Dropdown]     ← 2px accent outline
```

### Screen Reader Announcements
```
"Organize Your Circles dialog"
"Search contacts, edit text"
"Select circle for Alice Johnson, combo box"
"Inner Circle, 3 of 10 capacity"
"Progress: 8 of 15 contacts categorized, 53 percent"
```

## Responsive Breakpoints

### Desktop (> 1024px)
- 4-column contact grid
- Full-width modal (max 900px)
- Side-by-side action buttons

### Tablet (768px - 1023px)
- 3-column contact grid
- Narrower modal (max 700px)
- Side-by-side action buttons

### Mobile (< 768px)
- 2-column contact grid
- Full-width modal (bottom sheet)
- Stacked action buttons
- Reduced padding
- Smaller avatars

## Dark Mode Comparison

### Light Mode (Latte)
```
Background: Warm alabaster (#FDFCF8)
Text: Stone-700 (#44403C)
Cards: White with subtle borders
Accent: Amber-600
```

### Dark Mode (Espresso)
```
Background: Deep coffee (#1C1917)
Text: Stone-100 (#F5F5F4)
Cards: Dark gray with subtle borders
Accent: Amber-500 (slightly lighter)
```

## Usage Context

### During Onboarding (Step 2)
```
User Journey:
1. Complete Step 1 (Integrations)
2. Click Step 2 in sidebar indicator
3. Modal opens automatically
4. Assign contacts to circles
5. Click "Save & Continue"
6. Prompted to go to Step 3
```

### Post-Onboarding (Manage Circles Button)
```
User Journey:
1. Navigate to Directory > Circles
2. Click "Manage Circles" button
3. Modal opens
4. Update circle assignments
5. Click "Save & Continue"
6. Return to Circles visualization
```

## Error States

### API Error
```
┌─────────────────────────────────────────┐
│ ⚠️ Failed to save circle assignment     │
│ Please try again or contact support.    │
└─────────────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────────────┐
│ 🔌 You're offline                        │
│ Progress saved locally. Will sync when  │
│ you're back online.                      │
└─────────────────────────────────────────┘
```

### Over Capacity Warning
```
Circle Capacities:
💎 Inner Circle: 12/10 ⚠️ Over capacity

[Gentle suggestion to rebalance, but allows continuing]
```
