# Onboarding Animations Guide

## Overview

This guide documents all animations and transitions implemented for the Contact Onboarding feature. All animations are optimized for 60fps performance using GPU-accelerated properties and follow the Stone & Clay design system principles.

**Requirements Addressed:**
- 1.2: Visual status for each step (step transitions)
- 3.5: Real-time progress updates (progress bar animations)
- 9.4: Encouraging messages and completion celebration (celebration animations)

## Performance Optimization

### GPU Acceleration

All animations use GPU-accelerated properties for optimal performance:
- `transform` (translateX, translateY, scale, rotate)
- `opacity`
- `filter` (backdrop-blur)

**Avoided properties** (cause repaints/reflows):
- `width` (except for progress bars with `will-change`)
- `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`

### Will-Change Hints

Strategic use of `will-change` property:
```css
.contact-card {
  will-change: transform, opacity;
}

/* Remove after animation to save memory */
.contact-card:not(:hover) {
  will-change: auto;
}
```

### Hardware Acceleration

Elements are promoted to their own compositor layer:
```css
.onboarding-indicator,
.manage-circles-modal,
.contact-card {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

## Animation Categories

### 1. Step Transition Animations

**Purpose:** Smooth transitions when navigating between onboarding steps.

**Animations:**
- Step activation: `slideInLeft` (0.3s)
- Step completion: `scaleIn` with bounce easing (0.4s)
- Icon color transitions: 0.3s cubic-bezier

**Example:**
```css
.onboarding-step--active {
  animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.onboarding-step--complete .onboarding-step__icon {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Easing:** Material Design standard easing for natural motion.

### 2. Card Removal Animations

**Purpose:** Smooth fade and slide animations when removing contact or mapping cards.

**Animations:**
- Card removal: `fadeSlideOut` (0.4s)
- Staggered removal: 50ms delay between cards
- Card entrance: `scaleIn` with bounce (0.3s)

**Example:**
```css
.contact-card.removing {
  animation: fadeSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards;
  pointer-events: none;
}

/* Staggered removal */
.contact-card.removing:nth-child(1) { animation-delay: 0ms; }
.contact-card.removing:nth-child(2) { animation-delay: 50ms; }
.contact-card.removing:nth-child(3) { animation-delay: 100ms; }
```

**Usage in JavaScript:**
```javascript
// Remove card with animation
card.classList.add('removing');
setTimeout(() => card.remove(), 400); // Match animation duration
```

### 3. Pulsing Highlight Animation

**Purpose:** Draw attention to Step 1 integration sections that need user action.

**Animations:**
- Border pulse: `pulse-highlight` (2s infinite)
- Glow effect: `glowPulse` (2s infinite)
- Attention pulse: `pulseScale` (2s infinite)

**Example:**
```css
.onboarding-highlight {
  animation: pulse-highlight 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.onboarding-highlight::before {
  border: 2px solid var(--accent-primary);
  animation: glowPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Usage:**
```javascript
// Add highlight to integration section
section.classList.add('onboarding-highlight');

// Remove when connected
section.classList.remove('onboarding-highlight');
```

### 4. Progress Bar Animations

**Purpose:** Smooth width transitions showing categorization progress.

**Animations:**
- Width transition: 0.6s cubic-bezier
- Initial fill: `progressFill` (1s)

**Example:**
```css
.progress-bar__fill {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
}

.progress-bar__fill.animating {
  animation: progressFill 1s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Usage:**
```javascript
// Update progress
progressFill.style.width = `${percentage}%`;
```

### 5. Modal Animations

**Purpose:** Smooth entrance and exit for modal dialogs.

**Animations:**
- Overlay fade in: `fadeIn` (0.25s)
- Modal slide up: `slideUp` with bounce (0.4s)
- Overlay fade out: `fadeOut` (0.2s)
- Modal slide down: `slideDown` (0.3s)

**Example:**
```css
.manage-circles-overlay {
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.manage-circles-modal {
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Usage:**
```javascript
// Show modal
document.body.appendChild(overlay);

// Close modal with animation
overlay.classList.add('closing');
modal.classList.add('closing');
setTimeout(() => overlay.remove(), 300);
```

### 6. Button Animations

**Purpose:** Smooth hover and active state transitions.

**Animations:**
- Hover: background, color, border-color (0.2s)
- Active: transform scale (0.15s)
- Success glow: box-shadow on hover

**Example:**
```css
.btn-primary {
  transition: 
    background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
  transform: translateY(-1px);
}
```

### 7. Staggered Animations

**Purpose:** Sequential animations for lists and grids.

**Animations:**
- Contact grid: `scaleIn` with 50ms stagger
- Mapping list: `slideInRight` with 100ms stagger

**Example:**
```css
.contact-grid .contact-card {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.contact-grid .contact-card:nth-child(1) { animation-delay: 0ms; }
.contact-grid .contact-card:nth-child(2) { animation-delay: 50ms; }
.contact-grid .contact-card:nth-child(3) { animation-delay: 100ms; }
```

### 8. Celebration Animations

**Purpose:** Special animations for completion states.

**Animations:**
- Icon bounce: `bounce` (0.8s)
- Modal entrance: `slideUp` with bounce
- Confetti effect: `confetti` (1.5s)

**Example:**
```css
.celebration-icon {
  animation: bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-10px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-5px); }
}
```

## Easing Functions

### Standard Easing
```css
cubic-bezier(0.4, 0, 0.2, 1) /* Material Design standard */
```
- Used for: Most transitions, smooth in-out motion
- Duration: 0.2s - 0.4s

### Bounce Easing
```css
cubic-bezier(0.34, 1.56, 0.64, 1) /* Overshoot for playful effect */
```
- Used for: Celebrations, card entrances, icon changes
- Duration: 0.3s - 0.8s

### Ease Out
```css
cubic-bezier(0.4, 0, 1, 1) /* Fast start, slow end */
```
- Used for: Exits, removals, closing animations
- Duration: 0.2s - 0.4s

### Ease In-Out
```css
cubic-bezier(0.4, 0, 0.6, 1) /* Smooth acceleration and deceleration */
```
- Used for: Pulsing, infinite animations
- Duration: 2s (infinite)

## Animation Classes

### Adding Animations

```javascript
// Card entrance
card.classList.add('entering');

// Card removal
card.classList.add('removing');
setTimeout(() => card.remove(), 400);

// Highlight section
section.classList.add('onboarding-highlight');

// Attention pulse
element.classList.add('attention-pulse');

// Loading state
grid.classList.add('loading');
```

### Removing Animations

```javascript
// Remove highlight
section.classList.remove('onboarding-highlight');

// Remove attention pulse
element.classList.remove('attention-pulse');

// Remove loading state
grid.classList.remove('loading');
```

## Accessibility

### Reduced Motion Support

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Effect:**
- Animations complete instantly
- Transitions are nearly instant
- No motion sickness triggers
- Functionality remains intact

### Focus States

All interactive elements have clear focus states:

```css
.btn-primary:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

## Testing

### Manual Testing

Use the test file: `public/js/onboarding-animations-test.html`

**Test scenarios:**
1. Step transitions (activate each step)
2. Card removal (single and batch)
3. Pulsing highlights
4. Progress bar updates
5. Modal entrance/exit
6. Button hover states
7. Staggered card entrance

### Performance Testing

**FPS Counter:**
The test file includes a real-time FPS counter:
- Green: 55+ fps (excellent)
- Yellow: 45-54 fps (acceptable)
- Red: <45 fps (needs optimization)

**Chrome DevTools:**
1. Open DevTools → Performance tab
2. Record interaction
3. Check for:
   - Frame rate (should be 60fps)
   - No layout thrashing
   - Minimal paint operations
   - GPU acceleration active

### Browser Testing

**Supported browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

**Known issues:**
- Safari: Backdrop blur may have reduced performance on older devices
- Firefox: Some cubic-bezier easing may differ slightly

## Common Patterns

### Pattern 1: Animated Card Removal

```javascript
function removeCard(card) {
  // Add removing class
  card.classList.add('removing');
  
  // Remove from DOM after animation
  setTimeout(() => {
    card.remove();
    // Update state
    updateProgress();
  }, 400); // Match animation duration
}
```

### Pattern 2: Staggered List Entrance

```javascript
function showCards(cards) {
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('entering');
      container.appendChild(card);
    }, index * 50); // 50ms stagger
  });
}
```

### Pattern 3: Modal with Backdrop

```javascript
function showModal(content) {
  const overlay = document.createElement('div');
  overlay.className = 'manage-circles-overlay';
  overlay.innerHTML = `
    <div class="manage-circles-modal">
      ${content}
    </div>
  `;
  
  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  
  document.body.appendChild(overlay);
}

function closeModal(overlay) {
  const modal = overlay.querySelector('.manage-circles-modal');
  
  // Add closing classes
  overlay.classList.add('closing');
  modal.classList.add('closing');
  
  // Remove after animation
  setTimeout(() => overlay.remove(), 300);
}
```

### Pattern 4: Progress Bar Update

```javascript
function updateProgress(categorized, total) {
  const percentage = Math.round((categorized / total) * 100);
  
  // Update width with transition
  progressFill.style.width = `${percentage}%`;
  
  // Update text
  progressText.textContent = `${categorized}/${total}`;
  progressPercentage.textContent = `${percentage}%`;
}
```

## Troubleshooting

### Issue: Animations are janky

**Solutions:**
1. Check FPS counter in test file
2. Verify GPU acceleration: DevTools → Rendering → Layer borders
3. Reduce number of simultaneous animations
4. Check for layout thrashing (avoid reading layout properties during animation)

### Issue: Animations don't play

**Solutions:**
1. Check if `prefers-reduced-motion` is enabled
2. Verify CSS classes are applied correctly
3. Check animation duration isn't 0
4. Ensure element is visible (not `display: none`)

### Issue: Modal doesn't close smoothly

**Solutions:**
1. Ensure closing classes are added before removal
2. Match setTimeout duration to animation duration
3. Check z-index stacking context

### Issue: Cards don't stagger correctly

**Solutions:**
1. Verify `:nth-child()` selectors are correct
2. Check animation-delay values
3. Ensure `animation-fill-mode: backwards` is set

## Best Practices

1. **Always use GPU-accelerated properties** (transform, opacity)
2. **Match JavaScript timeouts to animation durations**
3. **Add pointer-events: none during animations** to prevent interaction
4. **Use will-change sparingly** and remove after animation
5. **Test with reduced motion enabled**
6. **Keep animations under 500ms** for responsiveness
7. **Use cubic-bezier for natural motion**
8. **Stagger animations by 50-100ms** for lists
9. **Always provide fallbacks** for older browsers
10. **Monitor FPS** during development

## Resources

- [Material Design Motion](https://material.io/design/motion)
- [Cubic Bezier Generator](https://cubic-bezier.com/)
- [CSS Triggers](https://csstriggers.com/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
