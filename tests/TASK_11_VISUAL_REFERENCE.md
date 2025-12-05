# Task 11: Groups Tab - Visual Reference Guide

## Color Palette Reference

### Latte Mode (Light)
```
Backgrounds:
- App Background: #FDFCFB (Stone-1, warm alabaster)
- Surface (Cards): #FFFFFF (White)
- Secondary: #F5F5F4 (Stone-2, subtle warm gray)
- Hover: #E7E5E4 (Stone-3)

Text:
- Primary: #1C1917 (Stone-12, deep warm black)
- Secondary: #78716C (Stone-11, warm gray)
- Tertiary: #A8A29E (Stone-6, muted warm gray)

Borders:
- Subtle: #A8A29E (Stone-6)
- Default: #78716C (Stone-7)

Accents:
- Primary: #92400E (Amber-9, terracotta)
- Subtle: #FEF3C7 (Amber-2, warm cream)
- Glow: rgba(217, 119, 6, 0.1)

Status:
- Success: #10b981 (Warm sage green)
- Error: #ef4444 (Warm red)
```

### Espresso Mode (Dark)
```
Backgrounds:
- App Background: #0C0A09 (Stone-1 inverted, deep coffee)
- Surface (Cards): #292524 (Stone-3 inverted, warm charcoal)
- Secondary: #1C1917 (Stone-2 inverted, coffee black)
- Hover: #44403C (Stone-4 inverted)

Text:
- Primary: #FAFAF9 (Stone-12 inverted, warm white)
- Secondary: #A8A29E (Stone-11 inverted, warm gray)
- Tertiary: #78716C (Stone-6 inverted)

Borders:
- Subtle: #78716C (Stone-6 inverted)
- Default: #A8A29E (Stone-7 inverted)

Accents:
- Primary: #F59E0B (Amber-9 inverted, bright amber)
- Subtle: rgba(245, 158, 11, 0.15) (Warm amber glow)
- Glow: rgba(245, 158, 11, 0.15)

Status:
- Success: #10b981 (Warm sage green)
- Error: #ef4444 (Warm red)
```

## Component Styling Examples

### Groups Table
```css
/* Table Wrapper */
background: var(--bg-surface)
border: 1px solid var(--border-subtle)
border-radius: 12px
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)

/* Table Header */
background: var(--bg-secondary)
border-bottom: 1px solid var(--border-subtle)
color: var(--text-secondary)
text-transform: uppercase
letter-spacing: 0.08em

/* Row Hover */
background: var(--bg-hover)
box-shadow: inset 0 0 0 1px var(--border-subtle)
```

### Add Group Button
```css
background: var(--text-primary)
color: var(--bg-surface)
border-radius: 8px
font-weight: 600
box-shadow: 0 1px 3px rgba(68, 64, 60, 0.2)

/* Hover */
opacity: 0.9
transform: translateY(-1px)
```

### Expand Toggle (Warm Amber)
```css
/* Latte Mode */
background: #fef3c7 (warm amber tint)
color: #92400e (terracotta)
border-radius: 18px
box-shadow: 0 1px 2px rgba(146, 64, 14, 0.1)

/* Hover */
background: #fde68a (slightly darker amber)
transform: scale(1.05)

/* Espresso Mode */
background: rgba(245, 158, 11, 0.15)
color: #DFA895 (muted clay)
```

### Count Badge
```css
background: var(--accent-primary)
color: var(--text-inverse)
border-radius: 14px
font-weight: 600
box-shadow: 0 1px 2px rgba(217, 119, 6, 0.2)
```

### Google Mappings Review
```css
/* Container */
background: var(--bg-surface)
border: 1px solid var(--border-subtle)
border-radius: 12px
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)

/* Pending Badge */
background: var(--accent-primary)
color: var(--text-inverse)
border-radius: 12px

/* Mapping Card */
background: var(--bg-secondary)
border: 1px solid var(--border-subtle)
border-radius: 8px

/* Suggested Action */
background: var(--accent-subtle)
border-left: 3px solid var(--accent-primary)
border-radius: 6px
```

### Action Buttons
```css
/* Approve Button */
background: var(--text-primary)
color: var(--bg-surface)
border-radius: 6px
font-weight: 600

/* Hover */
opacity: 0.9
transform: translateY(-1px)
box-shadow: 0 2px 4px rgba(68, 64, 60, 0.2)

/* Reject Button (Ghost) */
background: transparent
color: var(--text-secondary)
border: 1px solid var(--border-subtle)

/* Hover */
background: var(--bg-hover)
color: var(--text-primary)
border-color: var(--border-default)
```

### Modal
```css
/* Overlay */
background: rgba(28, 25, 23, 0.4)
backdrop-filter: blur(4px)

/* Content */
background: var(--bg-surface)
border: 1px solid var(--border-subtle)
border-radius: 12px
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1)

/* Search Input */
background: var(--bg-app)
border: 1px solid var(--border-subtle)
border-radius: 8px

/* Focus */
border-color: var(--accent-primary)
box-shadow: 0 0 0 3px var(--accent-glow)
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif
```

### Font Sizes
- Table headers: 12px (uppercase, letter-spacing: 0.08em)
- Group name: 15px (font-weight: 500)
- Description: 13px
- Badges: 11-12px (font-weight: 600)
- Buttons: 13-14px (font-weight: 600)

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600

## Spacing

### Padding
- Table cells: 12px 20px
- Table headers: 14px 20px
- Cards: 16px
- Buttons: 8px 14px (small), 10px 20px (medium)
- Badges: 3px 9px

### Margins
- Section spacing: 24px
- Card spacing: 12px
- Element spacing: 8px

### Border Radius
- Large containers: 12px
- Medium cards: 8px
- Small elements: 6px
- Badges: 12-18px (pill shape)
- Buttons: 6-8px

## Shadows

### Light Shadows
```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)

/* Button shadow */
box-shadow: 0 1px 3px rgba(68, 64, 60, 0.2)

/* Hover shadow */
box-shadow: 0 2px 6px rgba(68, 64, 60, 0.3)
```

### Modal Shadow
```css
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04)
```

## Transitions

### Standard Transitions
```css
transition: all 0.2s ease
```

### Specific Transitions
```css
/* Background color */
transition: background-color 0.15s ease

/* Transform */
transition: transform 0.2s ease

/* Border color */
transition: border-color 0.2s ease

/* Opacity */
transition: opacity 0.2s ease
```

## Interactive States

### Hover Effects
- Buttons: opacity 0.9, translateY(-1px)
- Cards: border-color change, subtle shadow
- Links: text-decoration underline
- Toggles: transform scale(1.05)

### Active States
- Buttons: translateY(0), reduced shadow
- Cards: transform scale(0.98)

### Focus States
- Inputs: accent-primary border, accent-glow shadow
- Buttons: outline with accent color

## Accessibility

### Contrast Ratios
- Primary text on surface: High contrast (>7:1)
- Secondary text on surface: Medium contrast (>4.5:1)
- Buttons: High contrast (>7:1)

### Interactive Elements
- Minimum touch target: 44x44px
- Clear focus indicators
- Keyboard navigation support

## Testing Checklist

### Visual Verification
- [ ] Groups table uses warm stone backgrounds
- [ ] Table headers have warm secondary background
- [ ] Borders use subtle warm tones
- [ ] Add Group button has high contrast
- [ ] Count badges use warm amber accent
- [ ] Expand toggles have warm amber tint
- [ ] Action buttons have warm hover states
- [ ] Google mappings review uses warm styling
- [ ] Status indicators use warm accent colors
- [ ] Modal overlay has warm backdrop blur
- [ ] Dark mode maintains warm palette

### Interaction Testing
- [ ] Hover states work on all interactive elements
- [ ] Focus states visible on keyboard navigation
- [ ] Buttons provide visual feedback on click
- [ ] Transitions smooth and consistent
- [ ] Theme toggle switches between Latte/Espresso

### Responsive Testing
- [ ] Layout adapts to different screen sizes
- [ ] Touch targets adequate on mobile
- [ ] Text remains readable at all sizes
- [ ] Spacing appropriate for viewport
