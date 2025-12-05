# Task 18: Modal Styles - Visual Reference

## Design System Colors

### Latte Mode (Light)
```
Modal Overlay: rgba(28, 25, 23, 0.4) with 4px blur
Modal Background: --bg-surface (#FFFFFF)
Modal Border: --border-subtle (#E7E5E4 Stone-200)
Text Primary: --text-primary (#44403C Stone-700)
Text Secondary: --text-secondary (#78716C Stone-500)
Accent Primary: --accent-primary (#D97706 Amber-600)
```

### Espresso Mode (Dark)
```
Modal Overlay: rgba(28, 25, 23, 0.4) with 4px blur
Modal Background: --bg-surface (#292524 Stone-800)
Modal Border: --border-subtle (#44403C Stone-700)
Text Primary: --text-primary (#F5F5F4 Stone-100)
Text Secondary: --text-secondary (#A8A29E Stone-400)
Accent Primary: --accent-primary (#F59E0B Amber-500)
```

## Component Specifications

### Modal Overlay
```css
.modal {
  background: rgba(28, 25, 23, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
}
```

**Visual Effect:**
- Warm brown-tinted overlay
- 4px blur creates depth
- Content behind remains slightly visible
- Professional, modern appearance

### Modal Content
```css
.modal-content {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
}
```

**Visual Effect:**
- Clean white surface in Latte mode
- Warm dark surface in Espresso mode
- Subtle stone-colored border
- Smooth 12px corners
- Generous padding for comfort

### Modal Header
```css
.modal-header h2 {
  color: var(--text-primary);
  font-weight: 600;
}

.close-btn {
  color: var(--text-secondary);
  border-radius: 6px;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
```

**Visual Effect:**
- Bold, clear title
- Subtle close button
- Warm hover state with increased contrast
- Smooth transitions

### Form Inputs
```css
input, textarea, select {
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
}

input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
```

**Visual Effect:**
- Warm alabaster/cream background in Latte
- Deep coffee background in Espresso
- Subtle stone borders
- Warm amber focus ring with glow
- Clear visual feedback

### Button Styles

#### Primary Button
```css
button {
  background: var(--text-primary);
  color: var(--bg-surface);
  font-weight: 600;
  border-radius: 8px;
}
```

**Visual Effect:**
- High contrast (dark on light, light on dark)
- Bold, confident appearance
- Clear primary action

#### Secondary Button (Ghost)
```css
button.secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

button.secondary:hover {
  background: var(--bg-hover);
}
```

**Visual Effect:**
- Subtle, non-intrusive
- Warm stone border
- Gentle hover state
- Clear secondary action

#### Accent Button
```css
button.accent {
  background: var(--accent-primary);
  color: var(--text-inverse);
}
```

**Visual Effect:**
- Warm amber/terracotta color
- Stands out without being harsh
- Inviting, warm appearance

## Layout Examples

### Basic Modal
```
┌─────────────────────────────────────────┐
│  Modal Title                          × │ ← Header
├─────────────────────────────────────────┤
│                                         │
│  Modal content goes here...             │ ← Content
│                                         │
│                                         │
│                    [Cancel] [Confirm]   │ ← Actions
└─────────────────────────────────────────┘
```

### Form Modal
```
┌─────────────────────────────────────────┐
│  Add New Contact                      × │
├─────────────────────────────────────────┤
│  Name                                   │
│  [________________]                     │
│                                         │
│  Email                                  │
│  [________________]                     │
│                                         │
│  Notes                                  │
│  [________________]                     │
│  [________________]                     │
│                                         │
│                    [Cancel] [Save]      │
└─────────────────────────────────────────┘
```

## Interaction States

### Modal Opening
1. Overlay fades in with blur effect
2. Modal content scales in from center
3. Smooth, professional animation

### Close Button Hover
1. Background changes to warm stone tint
2. Text color increases contrast
3. Smooth 0.2s transition

### Form Input Focus
1. Border changes to warm amber
2. Subtle warm glow appears (3px)
3. Smooth transition
4. Clear visual feedback

### Button Hover
1. **Primary**: Opacity reduces to 0.9
2. **Secondary**: Warm stone background appears
3. **Accent**: Darker warm tone
4. All transitions smooth (0.2s)

## Spacing & Typography

### Modal Content
- Padding: 30px
- Max width: 500px
- Border radius: 12px

### Modal Header
- Margin bottom: 20px
- Title font weight: 600
- Close button: 30x30px

### Form Groups
- Margin bottom: 20px
- Label margin bottom: 5px
- Label font weight: 500

### Modal Actions
- Margin top: 24px
- Gap between buttons: 12px
- Aligned to right

## Accessibility Features

### Contrast Ratios
- Text on backgrounds: WCAG AA compliant
- Focus states: Clearly visible
- Button states: High contrast

### Interactive Elements
- Close button: 30x30px (adequate hit target)
- Buttons: Minimum 44x44px touch target
- Focus indicators: 3px warm glow

### Keyboard Navigation
- Tab order: Header → Inputs → Actions
- Escape key: Closes modal
- Enter key: Submits form

## Testing Checklist

### Visual Tests
- [ ] Modal overlay has warm tint
- [ ] Backdrop blur is visible (4px)
- [ ] Modal content has 12px border radius
- [ ] Border is subtle warm stone color
- [ ] Close button hover state works
- [ ] All three button styles display correctly

### Interaction Tests
- [ ] Modal opens smoothly
- [ ] Modal closes on overlay click
- [ ] Close button works
- [ ] Form inputs focus correctly
- [ ] Focus ring is warm amber with glow
- [ ] Buttons have proper hover states

### Theme Tests
- [ ] All styles work in Latte mode
- [ ] All styles work in Espresso mode
- [ ] Theme toggle updates all elements
- [ ] Contrast is maintained in both modes

### Responsive Tests
- [ ] Modal scales on mobile (90% width)
- [ ] Content scrolls if too tall
- [ ] Buttons stack on narrow screens
- [ ] Touch targets are adequate

## Browser Support

### Modern Browsers (Full Support)
- Chrome 76+
- Firefox 103+
- Safari 9+
- Edge 79+

### Backdrop Filter Support
- Supported in all modern browsers
- Graceful fallback to solid overlay
- No functionality loss in older browsers

## Implementation Notes

1. **Backdrop Blur**: Uses `backdrop-filter: blur(4px)` for modern browsers
2. **Color Tokens**: All colors use CSS custom properties for theme support
3. **Transitions**: Smooth 0.2s ease transitions on all interactive elements
4. **Z-Index**: Modal at 1000, theme toggle at 10001
5. **Responsive**: Modal content at 90% width on mobile, 500px max on desktop

## Common Use Cases

### Confirmation Dialog
```html
<div class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Confirm Action</h2>
      <button class="close-btn">×</button>
    </div>
    <p>Are you sure you want to proceed?</p>
    <div class="modal-actions">
      <button class="secondary">Cancel</button>
      <button>Confirm</button>
    </div>
  </div>
</div>
```

### Form Dialog
```html
<div class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Add Item</h2>
      <button class="close-btn">×</button>
    </div>
    <form>
      <div class="form-group">
        <label>Name</label>
        <input type="text" placeholder="Enter name">
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary">Cancel</button>
        <button type="submit" class="accent">Save</button>
      </div>
    </form>
  </div>
</div>
```

### Info Dialog
```html
<div class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Information</h2>
      <button class="close-btn">×</button>
    </div>
    <p>This is some important information.</p>
    <div class="modal-actions">
      <button>Got it</button>
    </div>
  </div>
</div>
```
