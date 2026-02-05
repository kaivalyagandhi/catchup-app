# Design Document: UI Typography Consistency

## Overview

This design document outlines the technical approach for implementing a comprehensive UI/UX consistency audit and typography standardization across the CatchUp application. The implementation introduces a three-font typography system that balances the app's distinctive handwritten aesthetic with optimal readability for functional content.

## Architecture

### Typography System Architecture

The typography system follows a hierarchical approach with three distinct font categories:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Typography Hierarchy                          │
├─────────────────────────────────────────────────────────────────┤
│  HEADING FONT (Cabin Sketch)                                    │
│  └── Page titles (h1, .page-title)                              │
│  └── Section headers (h2, .section-title)                       │
│  └── Modal titles (.modal-title)                                │
│  └── Brand name (.sidebar__brand)                               │
├─────────────────────────────────────────────────────────────────┤
│  ACCENT FONT (Handlee)                                          │
│  └── Navigation items (.nav-item)                               │
│  └── Primary CTAs (.btn-primary, .btn-accent)                   │
│  └── Card titles (.card-title)                                  │
│  └── Subsection headers (h3, h4, h5, h6)                        │
│  └── Tab labels, filter buttons                                 │
│  └── Badge labels                                               │
├─────────────────────────────────────────────────────────────────┤
│  READABLE FONT (Inter)                                          │
│  └── Paragraphs (p)                                             │
│  └── Form inputs, labels, placeholders                          │
│  └── Table data                                                 │
│  └── Tooltips, help text                                        │
│  └── Error messages, validation                                 │
│  └── Modal body content                                         │
│  └── Toast notifications                                        │
│  └── Secondary/tertiary buttons                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CSS Token Architecture

```css
/* Design Token Structure */
:root {
  /* Typography Tokens */
  --font-heading: 'Cabin Sketch', cursive;  /* Bold, sketchy headings */
  --font-accent: 'Handlee', cursive;        /* Friendly handwritten (renamed from --font-body) */
  --font-readable: 'Inter', sans-serif;     /* Clean, readable body text */
  
  /* Utility Classes */
  .font-heading { font-family: var(--font-heading); }
  .font-accent { font-family: var(--font-accent); }
  .font-readable { font-family: var(--font-readable); }
}
```

## Components

### 1. Core Design System Updates (stone-clay-theme.css)

**Purpose**: Central typography token definitions and base styles

**Changes**:
- Add Inter font import from Google Fonts
- Add `--font-readable` token for Inter
- Rename `--font-body` to `--font-accent` for clarity
- Update body default font to `--font-readable`
- Add utility classes for explicit font application

**Token Mapping**:
```css
/* Before */
--font-heading: 'Cabin Sketch', cursive;
--font-body: 'Handlee', cursive;

/* After */
--font-heading: 'Cabin Sketch', cursive;
--font-accent: 'Handlee', cursive;      /* Renamed */
--font-readable: 'Inter', sans-serif;   /* New */
```

### 2. Modal Component Standardization

**Standard Modal Sizes**:
| Size | Width | Use Case |
|------|-------|----------|
| Small | 400px | Confirmations, simple forms |
| Medium | 600px | Standard forms, content |
| Large | 800px | Lists, tables, complex content |
| Full | 90vw | Data-heavy displays |

**Modal Layout Pattern**:
```
┌─────────────────────────────────────────┐
│ [Title]                           [X]   │  ← Header (56px, --font-heading)
├─────────────────────────────────────────┤
│                                         │
│  Modal body content                     │  ← Body (--font-readable)
│  with readable font                     │
│                                         │
├─────────────────────────────────────────┤
│ [Cancel]                    [Primary]   │  ← Footer (--font-readable for Cancel,
└─────────────────────────────────────────┘            --font-accent for Primary)
```

### 3. Header Layout Pattern

**Standard Header Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back] [Title]              [spacer]    [Action Button]   │
└─────────────────────────────────────────────────────────────┘
```

**Height Standards**:
- Page headers: 64px
- Modal headers: 56px
- Section headers: 48px
- Card headers: 40px

### 4. Footer/Action Bar Pattern

**Standard Footer Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Destructive/Cancel]          [spacer]    [Primary Action]  │
└─────────────────────────────────────────────────────────────┘
```

### 5. Empty State Component

**Standard Empty State Layout**:
```
┌─────────────────────────────────────────┐
│                                         │
│              [Icon 48-64px]             │
│                                         │
│         Empty State Title               │  ← --font-accent
│                                         │
│    Helpful description text that        │  ← --font-readable
│    explains what to do next             │
│                                         │
│          [Action Button]                │  ← Primary button styling
│                                         │
└─────────────────────────────────────────┘
```

### 6. Loading State Component

**Standard Loading Sizes**:
- Small: 16px (inline, buttons)
- Medium: 24px (cards, sections)
- Large: 40px (page-level)

### 7. Toast/Notification Component

**Position**: Bottom-right corner
**Width**: 320px min, 400px max
**Stack**: Vertical, newest on top (max 3 visible)

## Data Models

No database schema changes required. This is a frontend-only implementation affecting CSS and HTML files.

## Interfaces/APIs

No API changes required. This is a purely presentational update.

## Implementation Details

### Phase 1: Core Typography System

1. **Update index.html** - Add Inter font import:
```html
<link href="https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Handlee&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

2. **Update stone-clay-theme.css** - Add tokens and update base styles:
```css
/* Typography Tokens */
--font-heading: 'Cabin Sketch', 'Comic Sans MS', cursive, sans-serif;
--font-accent: 'Handlee', 'Comic Sans MS', cursive, sans-serif;
--font-readable: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Update body default */
body {
  font-family: var(--font-readable);
}

/* Utility classes */
.font-heading { font-family: var(--font-heading) !important; }
.font-accent { font-family: var(--font-accent) !important; }
.font-readable { font-family: var(--font-readable) !important; }
```

### Phase 2: Typography Application Rules

**Heading Font (Cabin Sketch) Application**:
```css
h1, h2,
.page-title,
.section-title,
.modal-title,
.modal-header h2,
.sidebar__brand {
  font-family: var(--font-heading);
}
```

**Accent Font (Handlee) Application**:
```css
h3, h4, h5, h6,
.nav-item,
.btn-primary,
.btn-accent,
.card-title,
.tab-label,
.filter-btn,
.badge {
  font-family: var(--font-accent);
}
```

**Readable Font (Inter) Application**:
```css
body,
p,
input,
textarea,
select,
label,
.form-label,
.form-help,
.table td,
.tooltip,
.error-message,
.modal-body,
.toast-message,
.btn-secondary,
.btn-link,
.btn-sm {
  font-family: var(--font-readable);
}
```

### Phase 3: Theme Consistency

**Replace prefers-color-scheme with data-theme**:
```css
/* Before */
@media (prefers-color-scheme: dark) {
  .component { ... }
}

/* After */
[data-theme="dark"] .component { ... }
```

### Phase 4: Color Token Audit

**Replace hardcoded colors with tokens**:
```css
/* Before */
.component {
  background: #f5f5f4;
  color: #1c1917;
  border: 1px solid #d6d3d1;
}

/* After */
.component {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}
```

### Phase 5: Landing Page Redesign

**Key Changes**:
1. Import stone-clay-theme.css
2. Apply dotted notebook background pattern
3. Use three-font typography system
4. Replace blue/purple gradients with Stone & Clay colors
5. Add theme toggle support
6. Update CTAs to use amber accent color

### Phase 6: Preferences Page Alignment

**Key Changes**:
1. Apply app-shell layout with sidebar
2. Use card-based layouts for integration settings
3. Apply correct typography hierarchy
4. Use design tokens for all colors

## File Change Summary

### Core Files
| File | Changes |
|------|---------|
| `public/index.html` | Add Inter font import |
| `public/css/stone-clay-theme.css` | Add --font-readable, rename --font-body to --font-accent, update base styles |

### CSS Files to Update
| File | Typography | Colors | Theme |
|------|------------|--------|-------|
| `public/css/app-shell.css` | ✓ | ✓ | ✓ |
| `public/css/contacts-table.css` | ✓ | ✓ | ✓ |
| `public/css/groups-table.css` | ✓ | ✓ | ✓ |
| `public/css/tags-table.css` | ✓ | ✓ | ✓ |
| `public/css/scheduling.css` | ✓ | ✓ | ✓ |
| `public/css/onboarding.css` | ✓ | ✓ | ✓ |
| `public/css/preferences.css` | ✓ | ✓ | ✓ |
| `public/css/landing.css` | ✓ | ✓ | ✓ |
| `public/css/undo-toast.css` | ✓ | ✓ | ✓ |
| `public/css/batch-suggestion-card.css` | ✓ | ✓ | ✓ |
| `public/css/quick-refine-card.css` | ✓ | ✓ | ✓ |
| `public/css/google-mappings-review.css` | ✓ | ✓ | ✓ |
| `public/css/manage-circles-flow.css` | ✓ | ✓ | ✓ |

### HTML Files to Update
| File | Changes |
|------|---------|
| `public/landing.html` | Complete redesign with Stone & Clay theme |
| `public/availability.html` | Typography and color token updates |
| `public/admin/sync-health.html` | Typography and color token updates |

### JavaScript Files to Audit (Modal Components)
| File | Changes |
|------|---------|
| `public/js/plan-creation-modal.js` | Standardize header/footer layout |
| `public/js/plan-edit-modal.js` | Standardize header/footer layout |
| `public/js/contact-search-modal.js` | Standardize header/footer layout |
| `public/js/initiator-availability-modal.js` | Standardize header/footer layout |
| `public/js/contacts-table.js` | Standardize modal header/footer |
| `public/js/groups-table.js` | Standardize modal header/footer |
| `public/js/tags-table.js` | Standardize modal header/footer |

## Correctness Properties

### Property 1: Typography Token Consistency
**Validates: Requirements 1.1-1.8**

All typography must use one of the three defined font tokens. No hardcoded font-family values should exist outside of the token definitions.

```
∀ element ∈ DOM:
  element.fontFamily ∈ {--font-heading, --font-accent, --font-readable}
```

### Property 2: Heading Font Application
**Validates: Requirements 2.1-2.6**

Heading font (Cabin Sketch) is applied only to major titles and section headers (h1, h2, page titles, modal titles, brand name).

```
∀ element with fontFamily = --font-heading:
  element.tagName ∈ {H1, H2} ∨
  element.classList ∩ {page-title, section-title, modal-title, sidebar__brand} ≠ ∅
```

### Property 3: Accent Font Application
**Validates: Requirements 3.1-3.7**

Accent font (Handlee) is applied to navigation, CTAs, card titles, and subsection headers.

```
∀ element with fontFamily = --font-accent:
  element.tagName ∈ {H3, H4, H5, H6} ∨
  element.classList ∩ {nav-item, btn-primary, btn-accent, card-title, tab-label, badge} ≠ ∅
```

### Property 4: Readable Font Application
**Validates: Requirements 4.1-4.11**

Readable font (Inter) is applied to all functional text including paragraphs, forms, tables, and secondary buttons.

```
∀ element with fontFamily = --font-readable:
  element.tagName ∈ {P, INPUT, TEXTAREA, SELECT, LABEL, TD} ∨
  element.classList ∩ {form-label, form-help, tooltip, error-message, modal-body, toast-message, btn-secondary} ≠ ∅
```

### Property 5: Theme Selector Consistency
**Validates: Requirements 14.1-14.7**

All theme-specific styles use [data-theme="dark"] selector instead of @media (prefers-color-scheme: dark).

```
∀ cssRule ∈ stylesheets:
  ¬contains(cssRule.selector, "prefers-color-scheme")
```

### Property 6: Color Token Usage
**Validates: Requirements 15.1-15.6, 20.1-20.7**

All color values use design tokens instead of hardcoded hex values.

```
∀ cssRule ∈ stylesheets:
  ∀ property ∈ {color, background-color, border-color}:
    cssRule[property] matches /var\(--/ ∨ cssRule[property] = 'inherit' ∨ cssRule[property] = 'transparent'
```

### Property 7: Modal Size Consistency
**Validates: Requirements 21.1-21.11**

All modals use one of the standard size classes (small: 400px, medium: 600px, large: 800px, full: 90vw).

```
∀ modal ∈ DOM:
  modal.width ∈ {400px, 600px, 800px, 90vw}
```

### Property 8: Header Layout Consistency
**Validates: Requirements 22.1-22.10**

All headers follow the standard layout pattern: [Back/Title] [spacer] [Actions].

```
∀ header ∈ {page-header, modal-header, section-header, card-header}:
  header.display = 'flex' ∧
  header.justifyContent = 'space-between' ∧
  header.alignItems = 'center'
```

### Property 9: Footer Layout Consistency
**Validates: Requirements 23.1-23.10**

All footers follow the standard layout pattern: [Secondary] [spacer] [Primary].

```
∀ footer ∈ {modal-footer, form-footer}:
  footer.display = 'flex' ∧
  footer.justifyContent = 'space-between' ∧
  primaryButton.position = 'right'
```

### Property 10: Empty State Consistency
**Validates: Requirements 27.1-27.8**

All empty states follow the standard layout: icon, title (accent font), description (readable font), action button.

```
∀ emptyState ∈ DOM:
  emptyState.children = [icon, title, description, ?actionButton] ∧
  title.fontFamily = --font-accent ∧
  description.fontFamily = --font-readable
```

### Property 11: Landing Page Content
**Validates: Requirements 19.1-19.9**

Landing page content is benefit-focused with clear value proposition and includes "How it works" section.

```
∀ landingPage:
  heroSection.headline.isBenefitFocused = true ∧
  featureCards.titles.areBenefitOriented = true ∧
  exists(howItWorksSection) ∧
  finalCTA.reinforcesPrimaryBenefit = true
```

### Property 12: Section Layout Consistency
**Validates: Requirements 24.1-24.9**

All content sections follow standard layout pattern with consistent spacing.

```
∀ section ∈ contentSections:
  section.layout = [header, ?description, content, ?footer] ∧
  section.descriptionGap = --space-2 ∧
  section.contentGap = --space-4 ∧
  section.verticalSpacing = --space-6
```

### Property 13: Navigation Element Placement
**Validates: Requirements 25.1-25.9**

Navigation elements (tabs, filters, pagination) are consistently positioned.

```
∀ page with navigation:
  tabs.position = 'below-header' ∧
  tabs.gap = --space-4 ∧
  filters.height = 40px ∧
  pagination.position = 'bottom-of-content'
```

### Property 14: Toast/Alert Positioning
**Validates: Requirements 26.1-26.9**

Toast notifications and alerts appear in consistent locations.

```
∀ toast ∈ toastNotifications:
  toast.position = 'bottom-right' ∧
  toast.width ∈ [320px, 400px] ∧
  toast.stackOrder = 'newest-on-top' ∧
  toast.maxVisible = 3
```

## Testing Strategy

### Visual Regression Testing
1. Screenshot comparison for each page before/after changes
2. Theme toggle verification (light/dark mode)
3. Responsive breakpoint testing

### Manual Testing Checklist
1. Verify font rendering across browsers (Chrome, Firefox, Safari)
2. Verify theme toggle works on all pages
3. Verify modal sizes and layouts
4. Verify empty states and loading states
5. Verify toast notifications positioning

### Accessibility Testing
1. Verify font contrast ratios meet WCAG AA standards
2. Verify focus states are visible
3. Verify screen reader compatibility

## Dependencies

### External Dependencies
- Google Fonts: Inter font family
- Existing: Cabin Sketch, Handlee fonts

### Internal Dependencies
- stone-clay-theme.css (core design system)
- theme-manager.js (theme toggle functionality)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Font loading performance | Page load time increase | Use font-display: swap, preload critical fonts |
| Breaking existing styles | Visual regressions | Incremental rollout, visual regression testing |
| Theme inconsistencies | Poor UX in dark mode | Comprehensive theme audit, manual testing |
| Browser compatibility | Inconsistent rendering | Cross-browser testing, fallback fonts |

## Rollout Plan

1. **Phase 1**: Core typography system (stone-clay-theme.css, index.html)
2. **Phase 2**: Main application pages (app-shell, contacts, groups, tags)
3. **Phase 3**: Feature pages (scheduling, onboarding, preferences)
4. **Phase 4**: Landing page redesign
5. **Phase 5**: Admin pages and remaining components
6. **Phase 6**: Final audit and cleanup
