# Onboarding Styling Quick Reference

## Quick Start

### Include Styles
```html
<link rel="stylesheet" href="css/stone-clay-theme.css">
<link rel="stylesheet" href="css/onboarding.css">
```

### Theme Toggle
```javascript
// Theme automatically updates via CSS custom properties
themeManager.toggleTheme(); // Switches between Latte and Espresso
```

## CSS Classes Reference

### Step Indicator
```html
<div class="onboarding-indicator">
  <div class="onboarding-indicator__header">
    <span class="onboarding-indicator__title">Get Started</span>
    <button class="onboarding-indicator__dismiss">×</button>
  </div>
  <div class="onboarding-indicator__steps">
    <button class="onboarding-step onboarding-step--complete">
      <span class="onboarding-step__icon">✓</span>
      <span class="onboarding-step__label">1. Connect Accounts</span>
    </button>
    <button class="onboarding-step onboarding-step--active">
      <span class="onboarding-step__icon">→</span>
      <span class="onboarding-step__label">2. Organize Circles</span>
    </button>
    <button class="onboarding-step onboarding-step--incomplete">
      <span class="onboarding-step__icon">3</span>
      <span class="onboarding-step__label">3. Review Groups</span>
    </button>
  </div>
</div>
```

**States:**
- `.onboarding-step--complete` - Green checkmark, 80% opacity
- `.onboarding-step--active` - Accent color, subtle background
- `.onboarding-step--incomplete` - Muted, 70% opacity

### Contact Cards
```html
<div class="contact-card">
  <div class="contact-card__avatar avatar--sage">JD</div>
  <div class="contact-card__name">John Doe</div>
  <select class="contact-card__circle-select">
    <option value="inner">Inner Circle</option>
  </select>
  <div class="ai-suggestion">
    <span class="ai-suggestion__label">Suggested:</span>
    <span class="ai-suggestion__circle">Close Friends</span>
    <span class="ai-suggestion__confidence">85%</span>
  </div>
</div>
```

**Avatar Colors:**
- `.avatar--sage` - Green tones
- `.avatar--sand` - Amber tones
- `.avatar--rose` - Pink tones
- `.avatar--stone` - Gray tones

### Educational Tips
```html
<div class="educational-tip">
  <div class="educational-tip__icon">💡</div>
  <div class="educational-tip__content">
    <h4>Understanding Your Circles</h4>
    <p>Based on Dunbar's research...</p>
    <details class="educational-tip__details">
      <summary>Learn more</summary>
      <div class="educational-tip__expanded">
        <p>Detailed content...</p>
      </div>
    </details>
  </div>
</div>
```

### Buttons
```html
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>
<button class="btn-accept">Accept</button>
<button class="btn-reject">Reject</button>
<button class="btn-close">×</button>
```

### Progress Bar
```html
<div class="progress-section">
  <div class="progress-label">Progress: 45/120 contacts</div>
  <div class="progress-bar">
    <div class="progress-bar__fill" style="width: 38%"></div>
  </div>
  <div class="progress-percentage">38%</div>
</div>
```

### Mapping Cards
```html
<div class="mapping-card">
  <div class="mapping-card__content">
    <div class="mapping-card__source">
      <span class="mapping-card__label">Google Group:</span>
      <span class="mapping-card__name">Work Team</span>
      <span class="mapping-card__count">15 members</span>
    </div>
    <div class="mapping-card__arrow">→</div>
    <div class="mapping-card__target">
      <span class="mapping-card__label">CatchUp Group:</span>
      <select class="mapping-card__select">...</select>
    </div>
    <div class="mapping-card__confidence">
      <span class="confidence-badge confidence-badge--high">85%</span>
    </div>
  </div>
  <div class="mapping-card__actions">
    <button class="btn-accept">Accept</button>
    <button class="btn-reject">Skip</button>
  </div>
</div>
```

**Confidence Levels:**
- `.confidence-badge--high` - Green (≥80%)
- `.confidence-badge--medium` - Amber (60-79%)
- `.confidence-badge--low` - Gray (<60%)

## CSS Custom Properties

### Most Used Variables
```css
/* Backgrounds */
--bg-app          /* Main app background */
--bg-surface      /* Cards and elevated surfaces */
--bg-sidebar      /* Sidebar background */
--bg-hover        /* Hover state */
--bg-secondary    /* Secondary background */

/* Text */
--text-primary    /* High contrast */
--text-secondary  /* Low contrast */
--text-tertiary   /* Muted */
--text-inverse    /* On dark backgrounds */

/* Borders */
--border-subtle   /* Subtle borders */
--border-default  /* Standard borders */

/* Accents */
--accent-primary  /* Primary accent (Amber) */
--accent-hover    /* Hover accent */
--accent-subtle   /* Subtle accent background */

/* Status */
--status-success  /* Green for complete */
--status-error    /* Red for warnings */
--status-warning  /* Amber for cautions */
```

## Responsive Breakpoints

```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  /* Touch-friendly 44px minimum height */
  /* Stacked layouts */
  /* Reduced spacing */
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Optimized grid layouts */
}

/* Desktop: ≥ 1024px */
/* Default styles */
```

## Theme Support

### Latte Mode (Light)
```css
/* Default - no data-theme attribute */
:root {
  --bg-app: #FDFCFB;
  --text-primary: #1C1917;
  /* ... */
}
```

### Espresso Mode (Dark)
```css
[data-theme="dark"] {
  --bg-app: #0C0A09;
  --text-primary: #FAFAF9;
  /* ... */
}
```

## Common Patterns

### Modal Overlay
```html
<div class="manage-circles-overlay">
  <div class="manage-circles-modal">
    <div class="manage-circles__header">
      <h2>Title</h2>
      <button class="btn-close">×</button>
    </div>
    <!-- Content -->
    <div class="manage-circles__actions">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Contact Grid
```html
<div class="contact-grid">
  <!-- Multiple contact-card elements -->
</div>
```

### Search Bar
```html
<div class="search-bar">
  <svg class="search-bar__icon"><!-- icon --></svg>
  <input type="text" class="search-bar__input" placeholder="Search...">
</div>
```

## Accessibility

### Focus States
All interactive elements have visible focus outlines:
```css
element:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### Screen Reader Only
```html
<span class="sr-only">Hidden text for screen readers</span>
```

### Touch Targets (Mobile)
Minimum 44px height for all interactive elements on mobile.

## Testing

### Theme Toggle Test
```bash
open public/js/onboarding-theme-test.html
```

### Responsive Test
```bash
open public/js/onboarding-responsive-test.html
```

## Tips

1. **Always use CSS custom properties** - Never hardcode colors
2. **Test both themes** - Verify Latte and Espresso modes
3. **Check mobile** - Ensure 44px touch targets
4. **Verify focus states** - Tab through all interactive elements
5. **Test reduced motion** - Respect user preferences

## Common Issues

### Theme not updating?
- Ensure `stone-clay-theme.css` is loaded first
- Check `data-theme` attribute on `<html>` element
- Verify CSS custom properties are used (not hardcoded colors)

### Layout breaking on mobile?
- Check viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- Verify responsive breakpoints are correct
- Test on real devices, not just browser resize

### Colors look wrong?
- Confirm using correct CSS custom properties
- Check theme mode (Latte vs Espresso)
- Verify `stone-clay-theme.css` is loaded

## Resources

- **Full Documentation:** `docs/features/onboarding/THEME_AND_STYLING_IMPLEMENTATION.md`
- **Design System:** `public/css/stone-clay-theme.css`
- **Onboarding Styles:** `public/css/onboarding.css`
- **Theme Manager:** `public/js/theme-manager.js`
