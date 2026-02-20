# Design Document: Cozy Productivity UI Refactor

## Overview

This design document outlines the comprehensive UI/UX refactor of the CatchUp web application to achieve a "Cozy Productivity" aesthetic with a "Digital Coffee Shop" vibe. The refactor transforms the current functional interface into a warm, tactile, and grounded experience using the "Stone & Clay" color system.

### Technology Decision: CSS Custom Properties vs Tailwind CSS

**Decision: Use CSS Custom Properties (not Tailwind CSS)**

Rationale:
1. **Architecture Preservation** - Requirements explicitly state maintaining Vanilla JavaScript architecture without new frameworks
2. **No Build Step Required** - Current setup serves static files directly; adding Tailwind would require Vite/PostCSS build tooling
3. **Semantic Theming** - CSS custom properties with Radix Colors 12-step methodology provides equivalent theming power
4. **Migration Scope** - Existing CSS in `index.html` and separate files would require significant refactoring for Tailwind
5. **Bundle Size** - Custom CSS variables are lighter than Tailwind's utility classes

The design system uses CSS custom properties following Radix Colors best practices, which provides:
- Semantic color tokens (same as Tailwind's design tokens)
- Dark mode support via `data-theme` attribute (same pattern as Tailwind)
- 12-step color scales for consistent UI hierarchy

The refactor maintains the existing Vanilla JavaScript architecture while introducing:
- A new fixed sidebar navigation replacing the current header
- The "Stone & Clay" design system with Latte (light) and Espresso (dark) themes
- Warm earth tones throughout all UI components
- Consistent styling across all pages and modals

## Architecture

### Design Philosophy: Desktop-First with Mobile Support

The UI refactor prioritizes the desktop web experience while ensuring responsive design for mobile devices. The fixed sidebar navigation provides optimal navigation for desktop users, while mobile users get a streamlined experience with collapsible/bottom navigation patterns.

### High-Level Architecture (Desktop - Primary)

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Shell                                 │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│   Sidebar    │              Main Content Area                    │
│   (240px)    │              (max-width: 1000px)                  │
│   Fixed      │                                                   │
│              │  ┌─────────────────────────────────────────────┐ │
│  ┌────────┐  │  │                                             │ │
│  │ Brand  │  │  │           Page Content                      │ │
│  └────────┘  │  │                                             │ │
│              │  │  - Directory (Contacts/Circles/Groups/Tags) │ │
│  ┌────────┐  │  │  - Suggestions                              │ │
│  │  Nav   │  │  │  - Edits                                    │ │
│  │ Items  │  │  │  - Preferences                              │ │
│  └────────┘  │  │                                             │ │
│              │  └─────────────────────────────────────────────┘ │
│  ┌────────┐  │                                                   │
│  │ User   │  │                                                   │
│  │Footer  │  │                                                   │
│  └────────┘  │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

### Responsive Layout (Mobile/Tablet)

```
Mobile (< 768px):
┌─────────────────────────┐
│  ☰  CatchUp      👤    │  <- Compact header with hamburger
├─────────────────────────┤
│                         │
│    Main Content         │
│    (Full width)         │
│                         │
├─────────────────────────┤
│ 📁  💡  ✏️  ⚙️        │  <- Bottom navigation bar
└─────────────────────────┘

Tablet (768px - 1024px):
┌─────────────────────────────────────────┐
│ ☰ │           Main Content              │
│   │           (Expanded)                │
│   │                                     │
└───┴─────────────────────────────────────┘
     ^ Collapsible sidebar overlay
```

### CSS Architecture

```
public/
├── css/
│   ├── stone-clay-theme.css    # New: Design system variables
│   ├── app-shell.css           # New: Sidebar and layout
│   ├── responsive.css          # New: Responsive breakpoints and mobile styles
│   ├── contacts-table.css      # Updated: Warm styling
│   ├── groups-table.css        # Updated: Warm styling
│   ├── tags-table.css          # Updated: Warm styling
│   ├── edits.css               # Updated: Warm styling
│   └── edits-compact.css       # Updated: Warm styling
└── index.html                  # Updated: New layout structure
```

### Responsive Breakpoints

```css
/* Desktop-first approach */
:root {
  --breakpoint-mobile: 768px;
  --breakpoint-tablet: 1024px;
  --breakpoint-desktop: 1280px;
}

/* Mobile: < 768px */
@media (max-width: 767px) {
  .sidebar { display: none; }
  .mobile-nav { display: flex; }
  .main-content { margin-left: 0; }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar { 
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay { display: block; }
}

/* Desktop: >= 1024px (Primary experience) */
@media (min-width: 1024px) {
  .sidebar { 
    position: fixed;
    transform: none;
  }
  .mobile-nav { display: none; }
  .hamburger-btn { display: none; }
}
```

## Components and Interfaces

### 1. Design System (stone-clay-theme.css)

The design system follows the **Radix Colors 12-step scale** methodology for semantic color usage:

| Step | Use Case |
|------|----------|
| 1 | App background |
| 2 | Subtle background (sidebar, cards) |
| 3 | UI element background |
| 4 | Hovered UI element background |
| 5 | Active/Selected UI element background |
| 6 | Subtle borders and separators |
| 7 | UI element border and focus rings |
| 8 | Hovered UI element border |
| 9 | Solid backgrounds (buttons, badges) |
| 10 | Hovered solid backgrounds |
| 11 | Low-contrast text |
| 12 | High-contrast text |

```css
/* Stone & Clay Theme - Following Radix Colors 12-step scale */

/* Latte Mode (Light) */
:root {
  /* Stone Scale (Warm Gray) - 12 steps */
  --stone-1: #FDFCFB;   /* App background */
  --stone-2: #F5F5F4;   /* Subtle background */
  --stone-3: #E7E5E4;   /* UI element bg */
  --stone-4: #D6D3D1;   /* Hovered UI bg */
  --stone-5: #C4C0BD;   /* Active/Selected bg */
  --stone-6: #A8A29E;   /* Subtle borders */
  --stone-7: #78716C;   /* UI borders */
  --stone-8: #57534E;   /* Hovered borders */
  --stone-9: #44403C;   /* Solid backgrounds */
  --stone-10: #292524;  /* Hovered solid */
  --stone-11: #78716C;  /* Low-contrast text */
  --stone-12: #1C1917;  /* High-contrast text */
  
  /* Amber Scale (Accent) - 12 steps */
  --amber-1: #FEFDFB;
  --amber-2: #FEF3C7;
  --amber-3: #FDE68A;
  --amber-4: #FCD34D;
  --amber-5: #FBBF24;
  --amber-6: #F59E0B;
  --amber-7: #D97706;
  --amber-8: #B45309;
  --amber-9: #92400E;
  --amber-10: #78350F;
  --amber-11: #92400E;
  --amber-12: #451A03;
  
  /* Semantic Tokens - Mapped to scale steps */
  --bg-app: var(--stone-1);           /* Step 1: App background */
  --bg-sidebar: var(--stone-2);       /* Step 2: Subtle background */
  --bg-surface: #FFFFFF;              /* White for cards to pop */
  --bg-hover: var(--stone-3);         /* Step 3: Hover state */
  --bg-active: var(--stone-4);        /* Step 4: Active state */
  --bg-secondary: var(--stone-2);     /* Step 2: Secondary bg */
  
  /* Text - Using steps 11-12 */
  --text-primary: var(--stone-12);    /* Step 12: High-contrast */
  --text-secondary: var(--stone-11);  /* Step 11: Low-contrast */
  --text-tertiary: var(--stone-6);    /* Step 6: Muted */
  --text-inverse: var(--stone-1);     /* Inverse for dark bg */
  
  /* Borders - Using steps 6-8 */
  --border-subtle: var(--stone-6);    /* Step 6: Subtle borders */
  --border-default: var(--stone-7);   /* Step 7: Default borders */
  --border-strong: var(--stone-8);    /* Step 8: Strong borders */
  
  /* Accent - Using amber scale */
  --accent-primary: var(--amber-9);   /* Step 9: Solid accent */
  --accent-hover: var(--amber-10);    /* Step 10: Hover accent */
  --accent-subtle: var(--amber-3);    /* Step 3: Subtle accent bg */
  --accent-glow: rgba(217, 119, 6, 0.1);
  
  /* Status Colors */
  --status-success: #10b981;
  --status-success-bg: #d1fae5;
  --status-error: #ef4444;
  --status-error-bg: #fee2e2;
  --status-info: #3b82f6;
  --status-info-bg: #dbeafe;
}

/* Espresso Mode (Dark) - Inverted scale */
[data-theme="dark"] {
  /* Stone Scale - Inverted for dark mode */
  --stone-1: #0C0A09;   /* App background */
  --stone-2: #1C1917;   /* Subtle background */
  --stone-3: #292524;   /* UI element bg */
  --stone-4: #44403C;   /* Hovered UI bg */
  --stone-5: #57534E;   /* Active/Selected bg */
  --stone-6: #78716C;   /* Subtle borders */
  --stone-7: #A8A29E;   /* UI borders */
  --stone-8: #D6D3D1;   /* Hovered borders */
  --stone-9: #E7E5E4;   /* Solid backgrounds */
  --stone-10: #F5F5F4;  /* Hovered solid */
  --stone-11: #A8A29E;  /* Low-contrast text */
  --stone-12: #FAFAF9;  /* High-contrast text */
  
  /* Amber Scale - Adjusted for dark mode */
  --amber-9: #F59E0B;   /* Brighter for dark bg */
  --amber-10: #FBBF24;
  --amber-3: rgba(245, 158, 11, 0.15);
  
  /* Semantic tokens auto-update via CSS variables */
  --bg-surface: var(--stone-3);       /* Cards on dark bg */
  --accent-glow: rgba(245, 158, 11, 0.15);
  
  /* Status Colors - Dark mode variants */
  --status-success-bg: #064e3b;
  --status-error-bg: #7f1d1d;
  --status-info-bg: #1e3a5f;
}
```

### Theme Toggle Implementation (Best Practice from Tailwind CSS)

Following Tailwind CSS dark mode best practices, the theme toggle uses `data-theme` attribute and localStorage:

```javascript
// Theme initialization - inline in <head> to prevent FOUC
(function() {
  const theme = localStorage.getItem('catchup-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

// Theme toggle function
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('catchup-theme', next);
}
```

### 2. App Shell Component

The app shell provides the fixed sidebar navigation and main content layout.

```javascript
// Layout structure in index.html
<div id="main-app" class="app-shell">
  <aside class="sidebar">
    <div class="sidebar__brand">CatchUp</div>
    <nav class="sidebar__nav">
      <a href="#directory" class="nav-item" data-page="directory">
        <svg><!-- Book icon --></svg>
        <span>Directory</span>
      </a>
      <a href="#suggestions" class="nav-item" data-page="suggestions">
        <svg><!-- Sparkles icon --></svg>
        <span>Suggestions</span>
      </a>
      <a href="#edits" class="nav-item" data-page="edits">
        <svg><!-- Pencil icon --></svg>
        <span>Edits</span>
        <span class="nav-badge" id="edits-badge"></span>
      </a>
    </nav>
    <div class="sidebar__footer">
      <div class="user-pill">
        <div class="user-avatar"></div>
        <span class="user-name"></span>
      </div>
    </div>
  </aside>
  <main class="main-content">
    <!-- Page content rendered here -->
  </main>
</div>
```

### 3. Segmented Control Component

Used for tab navigation in the Directory page.

```javascript
class SegmentedControl {
  constructor(options) {
    this.items = options.items; // [{id, label, icon}]
    this.activeItem = options.defaultActive;
    this.onChange = options.onChange;
  }
  
  render() {
    return `
      <div class="segmented-control">
        ${this.items.map(item => `
          <button 
            class="segment ${item.id === this.activeItem ? 'segment--active' : ''}"
            data-segment="${item.id}"
          >
            ${item.icon ? `<svg>${item.icon}</svg>` : ''}
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }
}
```

### 4. Card Component

Reusable card component for contacts, suggestions, and settings.

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 16px;
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

### 5. Modal Component

Unified modal with backdrop blur.

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
```

### 6. Button Components

```css
/* Primary Button */
.btn-primary {
  background: var(--text-primary);
  color: var(--bg-surface);
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Secondary/Ghost Button */
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

/* Accent Button */
.btn-accent {
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
}
```

### 7. Form Input Components

```css
.input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

### 8. Avatar Component

```css
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

/* Warm pastel variants */
.avatar--sage { background: #d1fae5; color: #065f46; }
.avatar--sand { background: #fef3c7; color: #92400e; }
.avatar--rose { background: #fce7f3; color: #9d174d; }
.avatar--stone { background: #e7e5e4; color: #44403c; }
```

### 9. Badge Components

```css
/* Tag Badge */
.tag-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--status-info-bg);
  color: var(--status-info);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Group Badge */
.group-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Nav Badge */
.nav-badge {
  background: var(--accent-primary);
  color: var(--text-inverse);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
```

### 10. Toast Notification Component

```css
.toast {
  padding: 14px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast--success {
  background: var(--status-success-bg);
  color: var(--status-success);
  border-left: 4px solid var(--status-success);
}

.toast--error {
  background: var(--status-error-bg);
  color: var(--status-error);
  border-left: 4px solid var(--status-error);
}

.toast--info {
  background: var(--status-info-bg);
  color: var(--status-info);
  border-left: 4px solid var(--status-info);
}
```

### 11. Mobile Navigation Component

For mobile viewports, a bottom navigation bar replaces the sidebar.

```javascript
class MobileNavigation {
  constructor(options) {
    this.items = options.items;
    this.activeItem = options.activeItem;
    this.onChange = options.onChange;
  }
  
  render() {
    return `
      <nav class="mobile-nav">
        ${this.items.map(item => `
          <button 
            class="mobile-nav__item ${item.id === this.activeItem ? 'mobile-nav__item--active' : ''}"
            data-page="${item.id}"
          >
            <svg class="mobile-nav__icon">${item.icon}</svg>
            <span class="mobile-nav__label">${item.label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }
}
```

```css
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  padding: 8px 0;
  padding-bottom: env(safe-area-inset-bottom, 8px);
  z-index: 100;
}

@media (max-width: 767px) {
  .mobile-nav {
    display: flex;
    justify-content: space-around;
  }
}

.mobile-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.mobile-nav__item--active {
  color: var(--accent-primary);
}

.mobile-nav__icon {
  width: 24px;
  height: 24px;
}

.mobile-nav__label {
  font-size: 11px;
  font-weight: 500;
}
```

### 12. Hamburger Menu Button (Tablet)

```css
.hamburger-btn {
  display: none;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .hamburger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.4);
  z-index: 99;
}

@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar-overlay.visible {
    display: block;
  }
}
```

## Data Models

No changes to existing data models. This refactor is purely UI/UX focused.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Theme Toggle Round-Trip
*For any* initial theme state (Latte or Espresso), toggling the theme twice SHALL return the application to the original theme state with identical CSS variable values.
**Validates: Requirements 2.1**

### Property 2: Navigation Active State Consistency
*For any* navigation item click, exactly one navigation item SHALL have the active state styling at any given time.
**Validates: Requirements 3.4**

### Property 3: Pending Edits Badge Accuracy
*For any* number of pending edits (0 to N), the navigation badge SHALL display the correct count, and SHALL be hidden when count is 0.
**Validates: Requirements 3.6**

### Property 4: Segmented Control Single Selection
*For any* segmented control with N segments, clicking a segment SHALL result in exactly one segment being active.
**Validates: Requirements 6.1, 6.2**

### Property 5: Diff Styling Consistency
*For any* edit item with old and new values, the old value SHALL have strikethrough styling and red-tint background, while the new value SHALL have bold styling and green-tint background.
**Validates: Requirements 11.4, 11.5**

### Property 6: Toast Type Styling
*For any* toast notification type (success, error, info, loading), the toast SHALL display with the corresponding color scheme as defined in the design system.
**Validates: Requirements 15.1, 15.2, 15.3, 15.4**

### Property 7: Navigation Icons No Emoji
*For any* navigation item in the sidebar, the icon SHALL be an SVG element and SHALL NOT contain emoji characters.
**Validates: Requirements 1.5**

### Property 8: Responsive Navigation Visibility
*For any* viewport width, exactly one navigation pattern SHALL be visible: sidebar for desktop (>=1024px), collapsible sidebar for tablet (768-1023px), or bottom nav for mobile (<768px).
**Validates: Requirements 16.1, 16.2, 16.3**

## Error Handling

### Theme Persistence Errors
- If localStorage is unavailable, default to Latte mode
- Log warning but don't block app initialization

### CSS Variable Fallbacks
- All CSS variables should have fallback values
- Example: `color: var(--text-primary, #44403C);`

### Layout Degradation
- If sidebar fails to render, fall back to header-based navigation
- Main content should remain functional without sidebar

## Testing Strategy

### Dual Testing Approach

This refactor requires both unit tests and property-based tests to ensure correctness.

#### Unit Tests
Unit tests will verify specific examples and edge cases:

1. **Theme System Tests**
   - Verify CSS variables exist in :root
   - Verify theme toggle updates data-theme attribute
   - Verify localStorage persistence

2. **Component Rendering Tests**
   - Verify sidebar renders with correct structure
   - Verify navigation items have correct labels
   - Verify modals have backdrop blur

3. **Styling Tests**
   - Verify specific color values match design spec
   - Verify font-family includes expected fonts

#### Property-Based Tests

Property-based tests will use **fast-check** library for JavaScript to verify universal properties.

Each property-based test MUST:
- Run a minimum of 100 iterations
- Be tagged with the format: `**Feature: cozy-productivity-ui-refactor, Property {number}: {property_text}**`
- Reference the correctness property from this design document

**Property Test 1: Theme Toggle Round-Trip**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 1: Theme Toggle Round-Trip**
fc.assert(
  fc.property(fc.constantFrom('light', 'dark'), (initialTheme) => {
    setTheme(initialTheme);
    const initialVars = getCSSVariables();
    toggleTheme();
    toggleTheme();
    const finalVars = getCSSVariables();
    return deepEqual(initialVars, finalVars);
  })
);
```

**Property Test 2: Navigation Active State Consistency**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 2: Navigation Active State Consistency**
fc.assert(
  fc.property(fc.constantFrom('directory', 'suggestions', 'edits'), (page) => {
    navigateTo(page);
    const activeItems = document.querySelectorAll('.nav-item.active');
    return activeItems.length === 1 && activeItems[0].dataset.page === page;
  })
);
```

**Property Test 3: Pending Edits Badge Accuracy**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 3: Pending Edits Badge Accuracy**
fc.assert(
  fc.property(fc.integer({ min: 0, max: 100 }), (count) => {
    updatePendingEditCounts(count);
    const badge = document.getElementById('edits-badge');
    if (count === 0) {
      return badge.classList.contains('hidden');
    }
    return badge.textContent === String(count) && !badge.classList.contains('hidden');
  })
);
```

**Property Test 4: Segmented Control Single Selection**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 4: Segmented Control Single Selection**
fc.assert(
  fc.property(
    fc.constantFrom('contacts', 'circles', 'groups', 'tags'),
    (tab) => {
      switchDirectoryTab(tab);
      const activeSegments = document.querySelectorAll('.segment--active');
      return activeSegments.length === 1;
    }
  )
);
```

**Property Test 5: Diff Styling Consistency**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 5: Diff Styling Consistency**
fc.assert(
  fc.property(
    fc.record({ oldValue: fc.string(), newValue: fc.string() }),
    ({ oldValue, newValue }) => {
      const editHtml = renderEditDiff(oldValue, newValue);
      const container = document.createElement('div');
      container.innerHTML = editHtml;
      const oldEl = container.querySelector('.edit-old');
      const newEl = container.querySelector('.edit-new');
      return (
        oldEl.style.textDecoration.includes('line-through') &&
        newEl.style.fontWeight === 'bold'
      );
    }
  )
);
```

**Property Test 6: Toast Type Styling**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 6: Toast Type Styling**
fc.assert(
  fc.property(
    fc.constantFrom('success', 'error', 'info', 'loading'),
    (type) => {
      const toast = showToast('Test message', type);
      const expectedClass = `toast--${type === 'loading' ? 'info' : type}`;
      return toast.classList.contains(expectedClass);
    }
  )
);
```

**Property Test 7: Navigation Icons No Emoji**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 7: Navigation Icons No Emoji**
fc.assert(
  fc.property(fc.constant(null), () => {
    const navItems = document.querySelectorAll('.nav-item');
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u;
    return Array.from(navItems).every(item => {
      const hasSvg = item.querySelector('svg') !== null;
      const hasNoEmoji = !emojiRegex.test(item.textContent);
      return hasSvg && hasNoEmoji;
    });
  })
);
```

**Property Test 8: Responsive Navigation Visibility**
```javascript
// **Feature: cozy-productivity-ui-refactor, Property 8: Responsive Navigation Visibility**
fc.assert(
  fc.property(
    fc.integer({ min: 320, max: 1920 }),
    (viewportWidth) => {
      // Simulate viewport resize
      window.innerWidth = viewportWidth;
      window.dispatchEvent(new Event('resize'));
      
      const sidebar = document.querySelector('.sidebar');
      const mobileNav = document.querySelector('.mobile-nav');
      
      const sidebarVisible = getComputedStyle(sidebar).display !== 'none';
      const mobileNavVisible = getComputedStyle(mobileNav).display !== 'none';
      
      if (viewportWidth >= 1024) {
        // Desktop: sidebar visible, mobile nav hidden
        return sidebarVisible && !mobileNavVisible;
      } else if (viewportWidth >= 768) {
        // Tablet: sidebar can be toggled, mobile nav hidden
        return !mobileNavVisible;
      } else {
        // Mobile: sidebar hidden, mobile nav visible
        return !sidebarVisible && mobileNavVisible;
      }
    }
  )
);
```

### Test File Organization

```
tests/
├── unit/
│   ├── theme-system.test.js
│   ├── sidebar-navigation.test.js
│   ├── segmented-control.test.js
│   ├── toast-notifications.test.js
│   └── responsive-layout.test.js
└── property/
    ├── theme-toggle.property.test.js
    ├── navigation-state.property.test.js
    ├── edits-badge.property.test.js
    ├── segmented-control.property.test.js
    ├── diff-styling.property.test.js
    ├── toast-styling.property.test.js
    ├── nav-icons.property.test.js
    └── responsive-nav.property.test.js
```
