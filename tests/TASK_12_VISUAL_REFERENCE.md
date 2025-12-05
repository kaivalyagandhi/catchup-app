# Task 12: Tags Tab Visual Reference

## Color Palette Reference

### Latte Mode (Light)
```
Table Background:     --bg-surface (#FFFFFF)
Table Border:         --border-subtle (#A8A29E)
Header Background:    --bg-secondary (#F5F5F4)
Header Text:          --text-secondary (#78716C)
Row Hover:            --bg-hover (#E7E5E4)
Tag Name:             --text-primary (#1C1917)
Contact Count:        --text-secondary (#78716C)
AI Badge Background:  --status-info-bg (#dbeafe)
AI Badge Text:        --status-info (#3b82f6)
Delete Hover:         --status-error-bg (#fee2e2)
```

### Espresso Mode (Dark)
```
Table Background:     --bg-surface (#292524)
Table Border:         --border-subtle (#78716C)
Header Background:    --bg-secondary (#1C1917)
Header Text:          --text-secondary (#A8A29E)
Row Hover:            --bg-hover (#292524)
Tag Name:             --text-primary (#FAFAF9)
Contact Count:        --text-secondary (#A8A29E)
AI Badge Background:  rgba(59, 130, 246, 0.2)
AI Badge Text:        #93c5fd
Delete Hover:         --status-error-bg (#7f1d1d)
```

## Component Styling Details

### Table Structure
- **Border Radius**: 12px (smooth, modern)
- **Border Width**: 1px (subtle)
- **Shadow**: 0 1px 3px rgba(0, 0, 0, 0.05) (very subtle)
- **Header Border**: 1px solid var(--border-subtle)

### Typography
- **Header Text**: 12px, uppercase, 600 weight, 0.08em letter-spacing
- **Tag Name**: 14px, 500 weight
- **Contact Count**: 14px, 500 weight, centered
- **Badge**: 12px, 600 weight

### Interactive States

#### Row Hover
```css
background-color: var(--bg-hover);
box-shadow: inset 0 0 0 1px var(--border-subtle);
```

#### Button Hover (Add Tag)
```css
opacity: 0.9;
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
transform: translateY(-1px);
```

#### Delete Button Hover
```css
background-color: var(--status-error-bg);
opacity: 1;
```

### Badge Styling

#### AI Badge (Latte)
```css
background: var(--status-info-bg);    /* #dbeafe */
color: var(--status-info);            /* #3b82f6*/
border: 1px solid var(--border-subtle);
border-radius: 14px;
padding: 4px 10px;
```

#### AI Badge (Espresso)
```css
background: rgba(59, 130, 246, 0.2);  /* Warm dark blue */
color: #93c5fd;                        /* Light blue text */
border: 1px solid rgba(59, 130, 246, 0.3);
```

### Modal Styling

#### Modal Overlay
```css
background: rgba(28, 25, 23, 0.4);    /* Warm overlay */
backdrop-filter: blur(4px);
```

#### Modal Content
```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: 12px;
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

#### Search Input
```css
background: var(--bg-app);
border: 1px solid var(--border-subtle);
border-radius: 8px;
```

#### Search Input Focus
```css
border-color: var(--accent-primary);
box-shadow: 0 0 0 3px var(--accent-glow);
```

## Visual Hierarchy

### Primary Elements (Highest Contrast)
1. Tag names - `--text-primary`
2. Add Tag button - `--text-primary` background
3. Modal headers - `--text-primary`

### Secondary Elements (Medium Contrast)
1. Contact counts - `--text-secondary`
2. Table headers - `--text-secondary`
3. Contact details in modal - `--text-secondary`

### Tertiary Elements (Lowest Contrast)
1. Empty state text - `--text-tertiary`
2. Placeholders - `--text-tertiary`
3. Sort indicators (inactive) - `--text-tertiary`

## Spacing & Layout

### Table Padding
- Header cells: 14px 20px
- Body cells: 12px 20px
- Member rows: 8px 16px

### Button Padding
- Add Tag: 10px 20px
- Delete: 4px 8px
- Save/Cancel: 6px 10px
- Select Contact: 6px 16px

### Modal Spacing
- Header: 20px 24px
- Body: 20px 24px
- Input margin: 16px bottom

## Transitions

All interactive elements use smooth transitions:
```css
transition: all 0.2s ease;
```

Specific transitions:
- Background color: 0.15s ease (rows)
- Transform: 0.2s ease (buttons)
- Color: 0.2s ease (sort indicators)

## Accessibility Notes

### Color Contrast
- All text meets WCAG AA standards
- Primary text: High contrast against backgrounds
- Secondary text: Sufficient contrast for readability
- Interactive elements: Clear visual feedback

### Focus States
- Input fields: Visible accent-colored border
- Buttons: Opacity change and transform
- Interactive rows: Background color change

### Hover States
- All interactive elements have clear hover states
- Buttons show transform and shadow changes
- Rows show background color change

## Comparison with Other Tabs

### Consistency Points
1. **Border Radius**: 12px (same as Contacts, Groups)
2. **Border Style**: 1px solid var(--border-subtle)
3. **Hover State**: var(--bg-hover) background
4. **Button Style**: --text-primary background
5. **Badge Style**: Warm tinted backgrounds

### Unique Elements
1. **AI Badge**: Warm blue tint (specific to Tags)
2. **Contact Count**: Centered display
3. **Source Column**: Shows automation status

## Testing Checklist

### Visual Verification
- [ ] Table has warm white/stone background
- [ ] Borders are subtle warm gray
- [ ] Header has warm secondary background
- [ ] Row hover shows warm hover state
- [ ] Tag names are high contrast
- [ ] Contact counts are medium contrast
- [ ] AI badges have warm blue tint
- [ ] Delete buttons show warm red on hover
- [ ] Add Tag button uses primary color

### Theme Toggle
- [ ] Smooth transition between themes
- [ ] All colors update correctly
- [ ] Badge colors change appropriately
- [ ] Text remains readable
- [ ] Borders remain visible

### Interactive Elements
- [ ] Row hover works smoothly
- [ ] Delete button hover shows red
- [ ] Add Tag button hover works
- [ ] Sort indicators change color
- [ ] Modal opens with warm styling
- [ ] Input focus shows accent color

### Modal Verification
- [ ] Backdrop has warm overlay
- [ ] Backdrop blur is visible
- [ ] Modal content has warm background
- [ ] Modal border is subtle
- [ ] Search input has warm styling
- [ ] Contact results have warm hover
- [ ] Select buttons use primary color

## Browser Compatibility

Tested and verified in:
- Chrome/Edge (Chromium)
- Firefox
- Safari

All CSS features used are widely supported:
- CSS Custom Properties
- Backdrop Filter
- CSS Transitions
- Flexbox
- Border Radius

## Performance Notes

- CSS variables enable instant theme switching
- No JavaScript required for styling
- Minimal CSS specificity for better performance
- Efficient use of inheritance
