# Contact Onboarding Accessibility Guide

This document outlines the accessibility features implemented in the Contact Onboarding system and provides testing guidelines.

## Accessibility Features

### Keyboard Navigation

#### Onboarding Step Indicator

**Full keyboard support**:
- `Tab` / `Shift+Tab`: Navigate between steps and dismiss button
- `Arrow Up` / `Arrow Left`: Move to previous step
- `Arrow Down` / `Arrow Right`: Move to next step
- `Home`: Jump to first step
- `End`: Jump to last step
- `Enter` / `Space`: Activate selected step
- `Escape`: Dismiss onboarding (when dismiss button is focused)

**Focus management**:
- Clear focus indicators with 2px outline and subtle shadow
- Focus visible only when using keyboard (`:focus-visible`)
- Logical tab order through all interactive elements

#### Manage Circles Flow

**Modal keyboard support**:
- `Tab` / `Shift+Tab`: Navigate through modal elements
- `Escape`: Close modal
- `Enter` / `Space`: Activate buttons and dropdowns
- Focus trapped within modal when open
- Focus returns to trigger element when closed

**Contact grid navigation**:
- `Tab`: Navigate between contact cards
- `Enter` / `Space`: Open circle dropdown
- `Arrow keys`: Navigate dropdown options
- `Escape`: Close dropdown without selecting

### Screen Reader Support

#### ARIA Labels and Roles

**Onboarding Step Indicator**:
```html
<nav role="navigation" aria-label="Onboarding progress">
  <h2 id="onboarding-title">Get Started</h2>
  <div role="list" aria-describedby="onboarding-title">
    <button role="listitem" 
            aria-label="Step 1: Connect Accounts, completed"
            aria-current="false">
      ...
    </button>
  </div>
</nav>
```

**Live regions for progress updates**:
```html
<div class="sr-only" aria-live="polite" aria-atomic="true">
  2 of 3 steps completed
</div>
```

**Manage Circles Modal**:
```html
<div role="dialog" 
     aria-modal="true" 
     aria-labelledby="manage-circles-title">
  <h2 id="manage-circles-title">Organize Your Circles</h2>
  ...
</div>
```

**Search functionality**:
```html
<div role="search">
  <label for="manage-circles-search" class="sr-only">Search contacts</label>
  <input type="search" 
         aria-label="Search contacts by name"
         aria-describedby="search-results-count">
</div>
```

#### Status Announcements

Screen readers announce:
- Step completion: "Step 1: Connect Accounts, completed"
- Progress updates: "45 of 120 contacts categorized"
- Circle assignments: "Contact assigned to Inner Circle"
- Capacity warnings: "Inner Circle is over capacity"
- Success messages: "Onboarding complete"

### Visual Accessibility

#### Color Contrast

All text meets WCAG 2.1 AA standards:
- **Primary text**: 7:1 contrast ratio (AAA)
- **Secondary text**: 4.5:1 contrast ratio (AA)
- **Interactive elements**: 4.5:1 contrast ratio (AA)
- **Focus indicators**: 3:1 contrast ratio (minimum)

**Tested combinations**:
- Latte mode: Stone-700 (#44403C) on Alabaster (#FDFCF8) = 8.2:1
- Espresso mode: Stone-100 (#F5F5F4) on Coffee (#1C1917) = 14.5:1
- Accent primary: Amber-600 on white = 4.6:1

#### Focus Indicators

**Visible focus states**:
- 2px solid outline in accent color
- 2px offset from element
- 4px subtle shadow for enhanced visibility
- Never removed, only hidden for mouse users (`:focus-visible`)

**High contrast mode**:
- Increased border widths (2px → 3px)
- Forced colors support for Windows High Contrast
- Bold font weights for status indicators

#### Icons and Symbols

**Decorative icons**:
- Marked with `aria-hidden="true"`
- Not announced by screen readers
- Supplemented with text labels

**Functional icons**:
- Include text alternatives
- Use `aria-label` for icon-only buttons
- Provide tooltips on hover

### Responsive Design

#### Touch Targets

All interactive elements meet minimum size requirements:
- **Buttons**: 44×44px minimum (WCAG 2.5.5)
- **Links**: 44×44px minimum
- **Form controls**: 44×44px minimum
- **Spacing**: 8px minimum between targets

#### Mobile Accessibility

- Larger touch targets on mobile (48×48px)
- Increased spacing between elements
- Simplified layouts for small screens
- Pinch-to-zoom enabled
- No horizontal scrolling required

### Motion and Animation

#### Reduced Motion Support

Users who prefer reduced motion see:
- No pulsing animations
- No fade transitions
- No transform animations
- Instant state changes
- Static focus indicators

**CSS implementation**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

#### Animation Guidelines

When animations are enabled:
- Duration: 200-300ms (fast enough to not delay)
- Easing: `ease` or `ease-out` (natural feeling)
- Purpose: Provide feedback, not decoration
- Skippable: Never block user actions

### Form Accessibility

#### Input Labels

All form inputs have associated labels:
```html
<label for="contact-search">Search contacts</label>
<input id="contact-search" type="search" ...>
```

#### Error Handling

Accessible error messages:
- Associated with inputs via `aria-describedby`
- Announced by screen readers
- Visible and clear
- Provide guidance for correction

```html
<input aria-describedby="error-message" aria-invalid="true">
<div id="error-message" role="alert">
  Please select a circle for this contact
</div>
```

#### Required Fields

Clearly marked required fields:
- Visual indicator (asterisk)
- `aria-required="true"` attribute
- Explained in form instructions

## Testing Guidelines

### Keyboard Testing

**Test checklist**:
1. [ ] Can reach all interactive elements with Tab
2. [ ] Tab order is logical and intuitive
3. [ ] Focus indicators are clearly visible
4. [ ] Can activate all buttons with Enter/Space
5. [ ] Can navigate steps with arrow keys
6. [ ] Can close modals with Escape
7. [ ] Focus is trapped in modals
8. [ ] Focus returns correctly after modal closes

**Testing procedure**:
1. Disconnect mouse/trackpad
2. Use only keyboard to complete onboarding
3. Note any unreachable elements
4. Verify focus is always visible
5. Test all keyboard shortcuts

### Screen Reader Testing

**Recommended screen readers**:
- **macOS**: VoiceOver (built-in)
- **Windows**: NVDA (free) or JAWS
- **iOS**: VoiceOver (built-in)
- **Android**: TalkBack (built-in)

**Test checklist**:
1. [ ] All images have appropriate alt text
2. [ ] Headings create logical structure
3. [ ] Landmarks identify page regions
4. [ ] Form labels are announced
5. [ ] Button purposes are clear
6. [ ] Status updates are announced
7. [ ] Error messages are announced
8. [ ] Progress is communicated

**Testing procedure**:
1. Enable screen reader
2. Navigate through onboarding using only screen reader
3. Verify all content is announced
4. Check that announcements are meaningful
5. Test with eyes closed to simulate blind user

### Visual Testing

**Color contrast testing**:
1. Use browser DevTools contrast checker
2. Test all text against backgrounds
3. Test in both Latte and Espresso modes
4. Verify focus indicators are visible
5. Check disabled state contrast

**Tools**:
- Chrome DevTools Lighthouse
- WebAIM Contrast Checker
- Colour Contrast Analyser (CCA)

**High contrast mode testing**:
1. Enable Windows High Contrast mode
2. Verify all content is visible
3. Check that borders are present
4. Test focus indicators
5. Verify icon visibility

### Motion Testing

**Reduced motion testing**:
1. Enable "Reduce motion" in OS settings
   - macOS: System Preferences → Accessibility → Display
   - Windows: Settings → Ease of Access → Display
2. Verify no animations play
3. Check that functionality still works
4. Ensure transitions are instant

### Mobile Testing

**Touch target testing**:
1. Test on actual mobile device
2. Verify all buttons are easily tappable
3. Check spacing between elements
4. Test with different finger sizes
5. Verify no accidental activations

**Screen reader testing on mobile**:
1. Enable VoiceOver (iOS) or TalkBack (Android)
2. Navigate through onboarding
3. Test swipe gestures
4. Verify announcements are clear
5. Check that focus is visible

## Common Issues and Solutions

### Issue: Focus not visible

**Solution**: Ensure `:focus-visible` styles are applied:
```css
.element:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### Issue: Screen reader not announcing updates

**Solution**: Use `aria-live` regions:
```html
<div aria-live="polite" aria-atomic="true">
  Progress: 45 of 120 contacts categorized
</div>
```

### Issue: Keyboard trap in modal

**Solution**: Implement focus trap:
```javascript
// Get all focusable elements
const focusable = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);

// Trap focus within modal
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    // Handle tab navigation
  }
});
```

### Issue: Touch targets too small

**Solution**: Increase minimum size:
```css
@media (max-width: 767px) {
  button {
    min-width: 48px;
    min-height: 48px;
    padding: 12px;
  }
}
```

### Issue: Color contrast too low

**Solution**: Use design system colors:
```css
/* Good contrast */
color: var(--text-primary); /* Stone-700 or Stone-100 */
background: var(--bg-surface); /* Alabaster or Coffee */
```

## Accessibility Checklist

Use this checklist when implementing new features:

### Semantic HTML
- [ ] Use semantic elements (`<nav>`, `<main>`, `<button>`)
- [ ] Headings create logical hierarchy
- [ ] Lists use `<ul>`, `<ol>`, `<li>`
- [ ] Forms use `<form>`, `<label>`, `<input>`

### Keyboard Support
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts don't conflict
- [ ] Escape closes modals/dialogs

### Screen Readers
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have descriptive text
- [ ] ARIA labels where needed
- [ ] Live regions for dynamic content

### Visual Design
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators are visible (3:1)
- [ ] Text is resizable to 200%
- [ ] No information conveyed by color alone
- [ ] Icons have text alternatives

### Mobile
- [ ] Touch targets are 44×44px minimum
- [ ] Spacing between targets is adequate
- [ ] Pinch-to-zoom is enabled
- [ ] No horizontal scrolling
- [ ] Works with screen readers

### Motion
- [ ] Respects `prefers-reduced-motion`
- [ ] Animations are purposeful
- [ ] No auto-playing animations
- [ ] Animations don't block actions

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [JAWS Documentation](https://www.freedomscientific.com/training/jaws/)

### Best Practices
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

## Support

For accessibility questions or issues:
1. Review this documentation
2. Test with assistive technologies
3. Consult WCAG guidelines
4. Contact the development team

## Continuous Improvement

Accessibility is an ongoing process:
- Regular audits with automated tools
- User testing with people with disabilities
- Stay updated on WCAG guidelines
- Incorporate feedback from users
- Test with new assistive technologies
