# Educational Features Visual Guide

## Component Overview

This guide provides visual descriptions of all educational features in the contact onboarding system.

## 1. Help Button

**Location**: Fixed bottom-right corner  
**Appearance**: Purple rounded button with question mark icon and "Help" text  
**Behavior**: 
- Hovers with slight lift animation
- Glows with purple shadow
- Always accessible, z-index 1000

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│                              ┌──────┤
│                              │  ?   │
│                              │ Help │
│                              └──────┤
└─────────────────────────────────────┘
```

## 2. Help Panel

**Location**: Slides in from right side  
**Width**: 500px (90vw on mobile)  
**Appearance**: Full-height white panel with purple header

```
┌─────────────────────────────────────┬──────────────────────┐
│                                     │ Understanding Social │
│                                     │ Circles          [×] │
│                                     ├──────────────────────┤
│                                     │                      │
│                                     │ [Introduction]       │
│                                     │                      │
│                                     │ ┌──────────────────┐ │
│                                     │ │ Inner Circle     │ │
│                                     │ │ ~5 people        │ │
│                                     │ │ • Closest...     │ │
│                                     │ └──────────────────┘ │
│                                     │                      │
│                                     │ ┌──────────────────┐ │
│                                     │ │ Close Friends    │ │
│                                     │ │ ~15 people       │ │
│                                     │ └──────────────────┘ │
│                                     │                      │
│                                     │ [Tips for Success]   │
│                                     │ [Quick Actions]      │
│                                     │                      │
└─────────────────────────────────────┴──────────────────────┘
```

## 3. Circle Hover Information

**Location**: Positioned near visualizer (right or left based on space)  
**Width**: 320px  
**Appearance**: White card with shadow, colored circle indicator

```
┌────────────────────────────────────┐
│ ● Inner Circle        ~5 people    │
│                                    │
│ Your closest relationships -       │
│ family and best friends            │
│                                    │
│ ┌────────────────────────────────┐ │
│ │████████░░░░░░░░░░░░░░░░░░░░░░░│ │
│ └────────────────────────────────┘ │
│ 3 of 5 recommended ✓ Good balance  │
│                                    │
│ Suggested contact frequency:       │
│ Weekly or more often               │
└────────────────────────────────────┘
```

## 4. First-Time Tooltip

**Location**: Center of screen with dark overlay  
**Appearance**: White rounded card with centered content

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│         ┌───────────────────────────────────┐          │
│         │                                   │          │
│         │  Welcome to Contact Organization! │          │
│         │                                   │          │
│         │  We'll help you organize your     │          │
│         │  contacts into meaningful circles │          │
│         │  based on relationship strength.  │          │
│         │                                   │          │
│         │        ┌──────────────┐           │          │
│         │        │   Got it!    │           │          │
│         │        └──────────────┘           │          │
│         │                                   │          │
│         └───────────────────────────────────┘          │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 5. Balance Suggestions

**Location**: Bottom-right, above help button  
**Width**: 400px (responsive)  
**Appearance**: White card with colored severity indicators

```
┌────────────────────────────────────────────┐
│ 💡 Network Balance Insights            [×] │
├────────────────────────────────────────────┤
│ Here are some gentle suggestions to help   │
│ optimize your network:                     │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ⚠️  Your Inner Circle has 15 contacts, │ │
│ │     which is significantly more than   │ │
│ │     the recommended 5.                 │ │
│ │                                        │ │
│ │     Research suggests that maintaining │ │
│ │     15 close relationships may be      │ │
│ │     challenging...                     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ⚡  Your Close Friends has 25 contacts │ │
│ │     which is above the recommended 15. │ │
│ │                                        │ │
│ │     This is okay! Just be aware...    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ These are just suggestions - organize your │
│ network in the way that works best for you!│
└────────────────────────────────────────────┘
```

## 6. Network Summary

**Location**: Center overlay  
**Appearance**: Large modal with gradient header and statistics

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🎉 Your Network Structure                      [×] │ │
│  ├────────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │   330    │  │   85%    │  │    50    │        │ │
│  │  │  Total   │  │ Network  │  │  Active  │        │ │
│  │  │ Contacts │  │  Health  │  │  Friends │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  │                                                    │ │
│  │  Circle Distribution                              │ │
│  │  ● Inner Circle      ████░░░░░░░░░░░░░░░░  4     │ │
│  │  ● Close Friends     ████████░░░░░░░░░░░░  14    │ │
│  │  ● Active Friends    ████████████████░░░░  50    │ │
│  │  ● Casual Network    ████████████████████  120   │ │
│  │  ● Acquaintances     ████████████████████  142   │ │
│  │                                                    │ │
│  │  Key Insights                                     │ │
│  │  • You have 4 people in your Inner Circle        │ │
│  │  • 14 Close Friends form your regular social...  │ │
│  │  • You maintain 170 active connections...        │ │
│  │                                                    │ │
│  │  Great work! You've organized your network in    │ │
│  │  a way that helps you maintain meaningful...     │ │
│  │                                                    │ │
│  │              ┌──────────────┐                     │ │
│  │              │     Done     │                     │ │
│  │              └──────────────┘                     │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Color Scheme

### Primary Colors
- **Purple** (#6366f1): Help button, headers, primary actions
- **Blue** (#3b82f6): Information, low severity
- **Green** (#10b981): Success, optimal status
- **Orange** (#f59e0b): Warning, medium severity
- **Red** (#ef4444): Alert, high severity

### Circle Colors
- **Inner**: Purple (#8b5cf6)
- **Close**: Blue (#3b82f6)
- **Active**: Green (#10b981)
- **Casual**: Orange (#f59e0b)
- **Acquaintance**: Gray (#6b7280)

## Animations

### Slide In (Help Panel)
```
Duration: 0.3s
Easing: ease-out
From: right: -100%
To: right: 0
```

### Fade In (Overlays)
```
Duration: 0.3s
Easing: ease-out
From: opacity: 0
To: opacity: 1
```

### Scale In (Tooltips, Summary)
```
Duration: 0.3s
Easing: ease-out
From: scale(0.9), opacity: 0
To: scale(1), opacity: 1
```

### Slide Up (Balance Suggestions)
```
Duration: 0.3s
Easing: ease-out
From: translateY(20px), opacity: 0
To: translateY(0), opacity: 1
```

## Responsive Breakpoints

### Desktop (> 768px)
- Help panel: 500px width
- Circle info: 320px width
- Balance suggestions: 400px width
- Full feature set

### Tablet (481px - 768px)
- Help panel: 90vw width
- Circle info: calc(100vw - 40px)
- Balance suggestions: calc(100vw - 40px)
- Adjusted font sizes

### Mobile (≤ 480px)
- Help panel: 100vw width
- Circle info: calc(100vw - 40px)
- Balance suggestions: calc(100vw - 40px)
- Smaller fonts and padding
- Touch-optimized tap targets

## Interaction States

### Help Button
- **Default**: Purple background, white text
- **Hover**: Darker purple, lifted shadow
- **Active**: Pressed state, reduced shadow

### Help Panel Close
- **Default**: White text on purple
- **Hover**: Light purple background
- **Active**: Darker purple background

### Balance Suggestions Close
- **Default**: Gray text
- **Hover**: Gray background, darker text
- **Active**: Darker gray background

## Accessibility Features

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate buttons
- Escape to close panels

### Screen Reader Support
- ARIA labels on all interactive elements
- Semantic HTML structure
- Proper heading hierarchy

### Color Contrast
- All text meets WCAG AA standards
- Minimum 4.5:1 contrast ratio
- Color not sole indicator of meaning

## Z-Index Hierarchy

```
10002: Network Summary (highest)
10001: First-time Tooltips
10000: Help Panel
9999:  Circle Info, Balance Suggestions
1000:  Help Button
```

## Mobile Considerations

### Touch Targets
- Minimum 44x44px tap areas
- Increased padding on mobile
- Larger close buttons

### Gestures
- Tap to open/close
- Swipe to dismiss (future enhancement)
- Long press for additional info (future enhancement)

### Performance
- Hardware-accelerated animations
- Minimal reflows
- Efficient event handling
- Lazy loading of content

## Usage Patterns

### First Visit Flow
1. User arrives → Welcome tooltip appears
2. User dismisses → Circles tooltip appears
3. User interacts → Help button available
4. User hovers circle → Info appears
5. User organizes 10+ contacts → Balance check
6. User completes → Summary appears

### Returning User Flow
1. User arrives → No tooltips (already seen)
2. Help button available immediately
3. Circle hover info on demand
4. Balance checks at milestones
5. Summary on completion

## Best Practices

### When to Show
- **Tooltips**: First visit only
- **Circle Info**: On hover/tap
- **Balance Suggestions**: Every 10 contacts or on request
- **Summary**: On completion or manual trigger

### When Not to Show
- Don't interrupt active dragging
- Don't show multiple overlays simultaneously
- Don't repeat dismissed suggestions immediately
- Don't block critical actions

### Timing
- Tooltips: Show immediately, auto-advance after 3s
- Circle Info: Show on hover, hide on leave
- Balance Suggestions: Auto-dismiss after 10s
- Summary: User-dismissed only

This visual guide helps developers and designers understand the appearance and behavior of all educational features in the system.
