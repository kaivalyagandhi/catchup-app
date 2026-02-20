# Requirements Document

## Introduction

This document defines the requirements for a comprehensive UI/UX consistency audit and typography standardization across the CatchUp application. The goal is to establish a clear typography hierarchy using a three-font system that balances the app's distinctive handwritten aesthetic with optimal readability for functional content. Additionally, this audit ensures consistent application of the Stone & Clay design system's color palette across all pages and components.

**Proposed Three-Font Typography System:**

| Font | Token | Purpose | Usage |
|------|-------|---------|-------|
| **Cabin Sketch** | `--font-heading` | Bold, sketchy headings | Page titles, section headers, modal titles, brand name |
| **Handlee** | `--font-accent` | Friendly handwritten accent | Navigation labels, primary CTA buttons, card titles |
| **Inter** | `--font-readable` | Clean, readable body text | Paragraphs, form inputs, labels, descriptions, help text, tables |

**Current State (Problem):**
- **Headings/Titles**: `Cabin Sketch` (handwritten, decorative) - via `--font-heading`
- **Everything else**: `Handlee` (handwritten, cursive) - via `--font-body`

**Problem:** The `Handlee` font is applied to ALL body text including paragraphs, form inputs, labels, descriptions, and functional text. This reduces readability for longer content and detailed information.

**Solution:** Introduce `Inter` as `--font-readable` for functional/explanatory text, rename `--font-body` to `--font-accent` for Handlee, and limit handwritten fonts to branding elements only.

## Glossary

- **Typography_System**: The complete set of font rules, sizes, weights, and usage patterns that define text styling across the application
- **Heading_Font**: Cabin Sketch - bold, sketchy font for major headings and titles
- **Accent_Font**: Handlee - friendly handwritten font for navigation, CTAs, and card titles
- **Readable_Font**: Inter - clean sans-serif font optimized for body text and functional content
- **Design_Token**: CSS custom properties (variables) that define reusable design values like colors, spacing, and typography
- **UI_Component**: Reusable interface elements such as buttons, modals, cards, forms, and navigation items
- **Branding_Element**: UI elements that convey the app's identity including titles, navigation labels, and call-to-action buttons
- **Functional_Text**: Text that explains functionality, provides instructions, or contains detailed information users need to read
- **Color_Palette**: The Stone & Clay design system colors including stone scale (warm grays), amber scale (accent), and semantic tokens
- **Design_Guide**: The stone-clay-theme.css file that defines all design tokens for the application

## Requirements

### Requirement 1: Typography System Definition

**User Story:** As a developer, I want a clearly defined three-font typography system with explicit usage rules, so that I can apply consistent styling across all UI components.

#### Acceptance Criteria

1. THE Typography_System SHALL define exactly three font categories: Heading_Font for major titles, Accent_Font for branding elements, and Readable_Font for functional text
2. THE Typography_System SHALL specify Cabin Sketch as the Heading_Font for page titles and section headers
3. THE Typography_System SHALL specify Handlee as the Accent_Font for navigation, CTAs, and card titles
4. THE Typography_System SHALL specify Inter as the Readable_Font for body content, forms, and functional text
5. THE Typography_System SHALL define CSS custom properties (--font-heading, --font-accent, --font-readable) in stone-clay-theme.css
6. THE Typography_System SHALL add Inter font import from Google Fonts alongside existing Cabin Sketch and Handlee imports
7. THE Typography_System SHALL document which UI elements use each font category
8. THE Typography_System SHALL rename the existing --font-body token to --font-accent for clarity

### Requirement 2: Heading Font (Cabin Sketch) Application Rules

**User Story:** As a user, I want bold sketchy headings to appear on major titles, so that the app maintains its distinctive aesthetic while clearly indicating content hierarchy.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Heading_Font (Cabin Sketch) to page titles (h1 elements, .page-title class)
2. THE Typography_System SHALL apply Heading_Font to major section headers (h2 elements, .section-title class)
3. THE Typography_System SHALL apply Heading_Font to modal titles (.modal-title, .modal-header h2)
4. THE Typography_System SHALL apply Heading_Font to the app brand name (.sidebar__brand)
5. THE Typography_System SHALL NOT apply Heading_Font to subsection headers (h3, h4, h5, h6) - these use Accent_Font
6. WHEN a UI element is a major page or section title, THE Typography_System SHALL use Heading_Font

### Requirement 3: Accent Font (Handlee) Application Rules

**User Story:** As a user, I want the friendly handwritten style to appear on navigation and interactive elements, so that the app feels warm and approachable.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Accent_Font (Handlee) to navigation items in the sidebar (.nav-item)
2. THE Typography_System SHALL apply Accent_Font to primary call-to-action button labels (.btn-primary, .btn-accent)
3. THE Typography_System SHALL apply Accent_Font to card titles (.card-title)
4. THE Typography_System SHALL apply Accent_Font to subsection headers (h3, h4, h5, h6)
5. THE Typography_System SHALL apply Accent_Font to tab labels and filter buttons
6. THE Typography_System SHALL apply Accent_Font to badge labels that convey status or category
7. WHEN a UI element is a Branding_Element or interactive label, THE Typography_System SHALL use Accent_Font

### Requirement 4: Readable Font (Inter) Application Rules

**User Story:** As a user, I want explanatory text and detailed content to use a clean readable font, so that I can easily understand functionality descriptions and instructions.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Readable_Font (Inter) to all paragraph text (p elements)
2. THE Typography_System SHALL apply Readable_Font to form labels and input placeholders
3. THE Typography_System SHALL apply Readable_Font to form input values and textarea content
4. THE Typography_System SHALL apply Readable_Font to table cell content and data displays
5. THE Typography_System SHALL apply Readable_Font to tooltip content and help text
6. THE Typography_System SHALL apply Readable_Font to error messages and validation feedback
7. THE Typography_System SHALL apply Readable_Font to modal body content and descriptions
8. THE Typography_System SHALL apply Readable_Font to toast notification messages
9. THE Typography_System SHALL apply Readable_Font to list items and bullet points
10. THE Typography_System SHALL apply Readable_Font to secondary and tertiary buttons (.btn-secondary, .btn-link)
11. WHEN a UI element contains Functional_Text, THE Typography_System SHALL use Readable_Font

### Requirement 5: Landing Page Typography Audit

**User Story:** As a visitor, I want the landing page to have consistent typography that balances brand personality with readability, so that I can understand the product value proposition clearly.

#### Acceptance Criteria

1. WHEN viewing the landing page hero section, THE Typography_System SHALL apply Heading_Font to the hero title
2. WHEN viewing the landing page hero section, THE Typography_System SHALL apply Readable_Font to the hero subtitle and description
3. WHEN viewing feature cards, THE Typography_System SHALL apply Accent_Font to feature titles
4. WHEN viewing feature cards, THE Typography_System SHALL apply Readable_Font to feature descriptions
5. WHEN viewing testimonial cards, THE Typography_System SHALL apply Readable_Font to testimonial text
6. WHEN viewing CTA buttons, THE Typography_System SHALL apply Accent_Font to button labels
7. THE Typography_System SHALL ensure landing.css imports and uses the shared typography tokens

### Requirement 6: Main Application Typography Audit

**User Story:** As a user, I want the main application interface to have consistent typography across all pages and components, so that I have a cohesive experience throughout the app.

#### Acceptance Criteria

1. WHEN viewing the sidebar navigation, THE Typography_System SHALL apply Accent_Font to nav item labels
2. WHEN viewing the contacts table, THE Typography_System SHALL apply Readable_Font to contact details and table data
3. WHEN viewing the scheduling page, THE Typography_System SHALL apply Heading_Font to page title and Accent_Font to section headers
4. WHEN viewing the scheduling page, THE Typography_System SHALL apply Readable_Font to plan details and descriptions
5. WHEN viewing the availability page, THE Typography_System SHALL apply Readable_Font to instructions and form content
6. WHEN viewing any modal dialog, THE Typography_System SHALL apply Heading_Font to the modal title only
7. WHEN viewing any modal dialog, THE Typography_System SHALL apply Readable_Font to modal body content

### Requirement 7: Form and Input Typography

**User Story:** As a user, I want form inputs and labels to use readable fonts, so that I can easily enter and review information.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Readable_Font to all input elements (input, textarea, select)
2. THE Typography_System SHALL apply Readable_Font to all form labels
3. THE Typography_System SHALL apply Readable_Font to placeholder text
4. THE Typography_System SHALL apply Readable_Font to form validation messages
5. THE Typography_System SHALL apply Readable_Font to form helper text and descriptions
6. IF a form has a title or section header, THEN THE Typography_System SHALL apply Accent_Font to that header only

### Requirement 8: Button Typography Hierarchy

**User Story:** As a user, I want button labels to be appropriately styled based on their importance, so that I can quickly identify primary actions.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Accent_Font to primary action buttons (.btn-primary, .btn-accent)
2. THE Typography_System SHALL apply Readable_Font to secondary and tertiary buttons (.btn-secondary, .btn-link)
3. THE Typography_System SHALL apply Readable_Font to small utility buttons (.btn-sm, .btn-icon)
4. THE Typography_System SHALL apply Readable_Font to cancel and dismiss buttons
5. WHEN a button is a primary CTA, THE Typography_System SHALL use Accent_Font with appropriate weight

### Requirement 9: Toast and Notification Typography

**User Story:** As a user, I want notification messages to be easily readable, so that I can quickly understand system feedback.

#### Acceptance Criteria

1. THE Typography_System SHALL apply Readable_Font to all toast notification content
2. THE Typography_System SHALL apply Readable_Font to success, error, warning, and info messages
3. THE Typography_System SHALL apply Readable_Font to undo action prompts
4. IF a notification has a title, THEN THE Typography_System SHALL apply Accent_Font to the title only

### Requirement 10: Admin Dashboard Typography

**User Story:** As an admin, I want the admin dashboard to prioritize data readability, so that I can efficiently monitor system health.

#### Acceptance Criteria

1. WHEN viewing the admin sync health dashboard, THE Typography_System SHALL apply Heading_Font to the page title
2. WHEN viewing the admin sync health dashboard, THE Typography_System SHALL apply Readable_Font to all metrics, tables, and data displays
3. THE Typography_System SHALL apply Readable_Font to admin dashboard filter controls and labels
4. THE Typography_System SHALL apply Readable_Font to status indicators and timestamps

### Requirement 11: CSS Architecture and Token Organization

**User Story:** As a developer, I want typography tokens to be centrally defined and easily maintainable, so that I can make consistent updates across the application.

#### Acceptance Criteria

1. THE Typography_System SHALL define all font tokens in stone-clay-theme.css as CSS custom properties
2. THE Typography_System SHALL include --font-heading (Cabin Sketch), --font-accent (Handlee), and --font-readable (Inter) tokens
3. THE Typography_System SHALL update the body selector to use --font-readable as the default font
4. THE Typography_System SHALL provide utility classes (.font-heading, .font-accent, .font-readable) for explicit font application
5. THE Typography_System SHALL ensure all CSS files inherit typography tokens from the theme file
6. WHEN a component needs to override the default font, THE Typography_System SHALL use the appropriate token variable

### Requirement 12: Responsive Typography Consistency

**User Story:** As a mobile user, I want typography to remain consistent and readable across all device sizes, so that I have a good experience on any device.

#### Acceptance Criteria

1. THE Typography_System SHALL maintain the same font-family rules across all breakpoints
2. THE Typography_System SHALL ensure font sizes scale appropriately for mobile devices
3. THE Typography_System SHALL ensure line heights remain readable on small screens
4. WHEN viewing on mobile devices, THE Typography_System SHALL not change which elements use Heading_Font vs Accent_Font vs Readable_Font

### Requirement 13: Dark Mode Typography Consistency

**User Story:** As a user who prefers dark mode, I want typography to remain consistent between light and dark themes, so that my experience is uniform regardless of theme preference.

#### Acceptance Criteria

1. THE Typography_System SHALL apply the same font-family rules in both Latte (light) and Espresso (dark) modes
2. THE Typography_System SHALL ensure font colors have sufficient contrast in both themes
3. WHEN switching between themes, THE Typography_System SHALL not change font-family assignments

### Requirement 14: Theme Implementation Audit

**User Story:** As a user, I want the dark/light theme toggle to work consistently across all pages and components, so that my theme preference is respected throughout the entire app.

#### Acceptance Criteria

1. THE system SHALL ensure all pages use the [data-theme="dark"] selector instead of @media (prefers-color-scheme: dark)
2. THE system SHALL audit all CSS files to replace prefers-color-scheme media queries with data-theme attribute selectors
3. THE system SHALL ensure the theme toggle button is accessible from all pages (not just the main app)
4. THE system SHALL persist theme preference in localStorage and apply it on page load before render (prevent FOUC)
5. THE system SHALL ensure all components respond correctly to theme changes without page reload
6. THE system SHALL audit and fix any components that have hardcoded light or dark colors
7. WHEN a user switches themes, THE system SHALL update all visible UI elements immediately

### Requirement 15: Color Palette Consistency

**User Story:** As a user, I want all pages and components to use the same color palette from the design guide, so that the app feels cohesive and professional.

#### Acceptance Criteria

1. THE Design_Guide SHALL be the single source of truth for all color values across the application
2. WHEN styling any UI_Component, THE system SHALL use Design_Token variables (--stone-*, --amber-*, --bg-*, --text-*, --border-*, --accent-*) instead of hardcoded color values
3. THE system SHALL audit and replace all hardcoded hex color values (#xxxxxx) with appropriate Design_Token references
4. THE system SHALL ensure all status colors (success, error, warning, info) use the semantic tokens (--status-success, --status-error, etc.)
5. THE system SHALL ensure all circle colors use the defined tokens (--circle-inner, --circle-close, --circle-active, --circle-casual, --circle-acquaintance)
6. THE system SHALL ensure all avatar colors use the defined tokens (--avatar-sage-*, --avatar-sand-*, --avatar-rose-*, --avatar-stone-*)

### Requirement 16: Preferences Page Design Alignment

**User Story:** As a user, I want the preferences page to match the design language of the rest of the application, so that I have a consistent experience when managing my settings.

#### Acceptance Criteria

1. THE Preferences_Page SHALL use Design_Token variables for all colors instead of hardcoded values
2. THE Preferences_Page SHALL apply Heading_Font to the page title and Accent_Font to section headers only
3. THE Preferences_Page SHALL apply Readable_Font to all form labels, input values, help text, and descriptions
4. THE Preferences_Page SHALL use the accent color (--accent-primary) for primary buttons consistently
5. THE Preferences_Page SHALL use the correct background tokens (--bg-surface, --bg-secondary, --bg-app) for cards and sections
6. THE Preferences_Page SHALL use the correct border tokens (--border-subtle, --border-default) for all borders
7. THE Preferences_Page SHALL use the correct text color tokens (--text-primary, --text-secondary, --text-tertiary) for all text
8. IF the Preferences_Page uses @media (prefers-color-scheme: dark), THEN it SHALL be replaced with [data-theme="dark"] selector for consistency with the app's theme system

### Requirement 17: Preferences Page Layout Redesign

**User Story:** As a user, I want the preferences page to have a modern, organized layout that fits within the app's overall structure, so that I can easily find and manage my settings.

#### Acceptance Criteria

1. THE Preferences_Page SHALL use the app-shell layout with sidebar navigation consistent with other pages
2. THE Preferences_Page SHALL organize settings into logical sections with clear visual separation
3. THE Preferences_Page SHALL use card-based layouts for integration settings (Google Calendar, Contacts, etc.)
4. THE Preferences_Page SHALL display integration status with consistent badge styling (connected/disconnected)
5. THE Preferences_Page SHALL use the Stone & Clay card styling (--bg-surface, --border-subtle, --radius-lg, --shadow-sm)
6. THE Preferences_Page SHALL have consistent spacing using the design system spacing tokens (--space-*)
7. THE Preferences_Page SHALL display form groups with proper label-input-help text hierarchy
8. THE Preferences_Page SHALL use toggle switches styled consistently with the pill-switch component from the design system
9. WHEN viewing on mobile devices, THE Preferences_Page SHALL stack sections vertically with appropriate spacing

### Requirement 18: Landing Page Complete Redesign

**User Story:** As a visitor, I want the landing page to look and feel like the main application, so that I have a consistent brand experience from first impression through daily use.

#### Acceptance Criteria

1. THE Landing_Page SHALL import and use stone-clay-theme.css as its primary stylesheet
2. THE Landing_Page SHALL use the dotted notebook background pattern (radial-gradient with --stone-4) matching the app
3. THE Landing_Page SHALL use the three-font typography system (Cabin Sketch, Handlee, Inter)
4. THE Landing_Page SHALL use the Stone & Clay Color_Palette for all colors (stone scale, amber accent)
5. THE Landing_Page SHALL use the accent color (--accent-primary, amber) for primary CTAs instead of blue
6. THE Landing_Page SHALL support both Latte (light) and Espresso (dark) themes with a theme toggle
7. THE Landing_Page SHALL use card-based layouts with Stone & Clay styling (--bg-surface, --border-subtle, --radius-lg)
8. THE Landing_Page SHALL remove the purple/blue gradient hero and use Stone & Clay colors instead

### Requirement 19: Landing Page Content Redesign

**User Story:** As a visitor, I want the landing page to clearly communicate the value proposition and benefits of CatchUp, so that I understand why I should use the app.

#### Acceptance Criteria

1. THE Landing_Page hero section SHALL have a compelling, benefit-focused headline (e.g., "Never lose touch with the people who matter")
2. THE Landing_Page hero section SHALL have a clear subtitle explaining the core value proposition
3. THE Landing_Page feature section SHALL focus on user benefits rather than technical features
4. THE Landing_Page feature cards SHALL use benefit-oriented titles (e.g., "Remember everything" instead of "Voice-First Capture")
5. THE Landing_Page feature descriptions SHALL explain how each feature helps the user maintain relationships
6. THE Landing_Page SHALL include a "How it works" section with 3-4 simple steps
7. THE Landing_Page testimonials SHALL be replaced with or supplemented by concrete benefit statements
8. THE Landing_Page final CTA section SHALL reinforce the primary benefit and create urgency
9. THE Landing_Page footer SHALL be simplified and use Stone & Clay styling

### Requirement 20: Component-Level Color Audit

**User Story:** As a developer, I want all UI components to use design tokens consistently, so that theme changes propagate correctly throughout the application.

#### Acceptance Criteria

1. THE system SHALL audit all CSS files in public/css/ for hardcoded color values
2. THE system SHALL replace hardcoded colors with appropriate Design_Token references
3. THE system SHALL ensure modal overlays use var(--modal-overlay) or consistent rgba values
4. THE system SHALL ensure shadows use the defined shadow tokens (--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl)
5. THE system SHALL ensure focus states use var(--accent-primary) and var(--accent-glow) consistently
6. THE system SHALL ensure hover states use var(--bg-hover) and var(--accent-hover) consistently
7. WHEN a component defines its own color variables, THE system SHALL map them to Design_Token references


### Requirement 21: Modal Size and Layout Consistency

**User Story:** As a user, I want all modals to have consistent sizing and make good use of screen space, so that I have a predictable and comfortable experience when interacting with dialogs.

#### Acceptance Criteria

1. THE system SHALL define standard modal size classes: small (400px), medium (600px), large (800px), and full-width (90vw)
2. THE system SHALL ensure all modals use one of the standard size classes based on their content type
3. THE system SHALL ensure modals use a minimum height that prevents content from feeling cramped
4. THE system SHALL ensure modals have a maximum height of 90vh with internal scrolling for overflow content
5. THE system SHALL ensure modal headers, bodies, and footers have consistent padding using design tokens (--space-*)
6. THE system SHALL ensure modal close buttons are consistently positioned (top-right corner)
7. THE system SHALL ensure modal overlays use consistent backdrop styling (blur and opacity)
8. THE system SHALL audit all existing modals and update them to use the standard size classes
9. WHEN a modal contains a form, THE system SHALL use at least the medium size class to provide adequate input space
10. WHEN a modal contains a list or table, THE system SHALL use at least the large size class to display data effectively
11. WHEN viewing on mobile devices, THE system SHALL ensure modals expand to use available screen width appropriately

### Requirement 22: Consistent Header Layout Pattern

**User Story:** As a user, I want all pages, sections, modals, and cards to have a consistent header layout pattern, so that I can quickly orient myself and find navigation controls in predictable locations.

#### Acceptance Criteria

1. THE system SHALL define a standard header layout pattern with: title on the left, action buttons on the right
2. THE system SHALL ensure all page headers follow the pattern: [Back button (if applicable)] [Title] [spacer] [Primary action button(s)]
3. THE system SHALL ensure all modal headers follow the pattern: [Title] [spacer] [Close button (X)]
4. THE system SHALL ensure all section headers follow the pattern: [Section title] [spacer] [Section action button(s) if any]
5. THE system SHALL ensure all card headers follow the pattern: [Card title] [spacer] [Card action icons if any]
6. THE system SHALL use flexbox with justify-content: space-between for all header layouts
7. THE system SHALL ensure header titles are vertically centered with action buttons
8. THE system SHALL define consistent header heights: page headers (64px), modal headers (56px), section headers (48px), card headers (40px)
9. THE system SHALL ensure back buttons use a consistent icon and position (left-most element)
10. THE system SHALL ensure close buttons use a consistent icon (X) and position (right-most element)

### Requirement 23: Consistent Footer/Action Bar Layout Pattern

**User Story:** As a user, I want all modals, forms, and action panels to have consistent button placement in footers, so that I always know where to find confirm and cancel actions.

#### Acceptance Criteria

1. THE system SHALL define a standard footer layout pattern with: secondary actions on the left, primary actions on the right
2. THE system SHALL ensure all modal footers follow the pattern: [Cancel/Secondary button] [spacer] [Primary action button]
3. THE system SHALL ensure all form footers follow the pattern: [Reset/Cancel] [spacer] [Submit/Save]
4. THE system SHALL ensure destructive actions (Delete, Remove) are positioned on the left side with warning styling
5. THE system SHALL ensure primary/confirm actions are always positioned on the right side
6. THE system SHALL use consistent button spacing (--space-3 or 12px gap between buttons)
7. THE system SHALL ensure footer buttons are right-aligned when there's only a primary action
8. THE system SHALL ensure footer padding is consistent with header padding (--space-4 or 16px)
9. WHEN a modal has multiple primary actions, THE system SHALL group them on the right with the most important action rightmost
10. WHEN a form has a multi-step flow, THE system SHALL show [Back] [spacer] [Next/Continue] pattern

### Requirement 24: Consistent Section Layout Pattern

**User Story:** As a user, I want all content sections across pages to have a consistent layout structure, so that I can easily scan and understand the information hierarchy.

#### Acceptance Criteria

1. THE system SHALL define a standard section layout with: header row, optional description, content area, optional footer
2. THE system SHALL ensure section headers use the standard header layout pattern (Requirement 22)
3. THE system SHALL ensure section descriptions appear directly below the header with --space-2 gap
4. THE system SHALL ensure section content has consistent top margin from header/description (--space-4)
5. THE system SHALL ensure sections have consistent vertical spacing between them (--space-6 or 24px)
6. THE system SHALL ensure collapsible sections have a consistent expand/collapse icon position (right side of header)
7. THE system SHALL ensure section dividers use consistent styling (--border-subtle, 1px solid)
8. THE system SHALL audit all pages to ensure sections follow the standard layout pattern
9. WHEN a section has no content, THE system SHALL display a consistent empty state with centered message

### Requirement 25: Consistent Navigation Element Placement

**User Story:** As a user, I want navigation elements (tabs, breadcrumbs, filters) to be consistently placed across all pages, so that I can navigate the app intuitively.

#### Acceptance Criteria

1. THE system SHALL position tab navigation directly below the page header with --space-4 gap
2. THE system SHALL position breadcrumb navigation above the page title within the header area
3. THE system SHALL position filter bars below tabs (if present) or below page header with --space-4 gap
4. THE system SHALL ensure tab styling is consistent across all pages (same height, padding, active indicator)
5. THE system SHALL ensure filter/search bars have consistent height (40px) and styling across all pages
6. THE system SHALL ensure pagination controls are consistently positioned at the bottom of content areas
7. THE system SHALL ensure "View all" or "See more" links are consistently positioned (right-aligned below content)
8. THE system SHALL audit all pages with navigation elements and standardize their placement
9. WHEN a page has both tabs and filters, THE system SHALL stack them with tabs above filters

### Requirement 26: Consistent Toast and Alert Positioning

**User Story:** As a user, I want toast notifications and alerts to appear in consistent locations, so that I don't miss important feedback.

#### Acceptance Criteria

1. THE system SHALL position toast notifications in the bottom-right corner of the viewport
2. THE system SHALL position inline alerts at the top of the relevant content section
3. THE system SHALL position form validation errors directly below the invalid input field
4. THE system SHALL position page-level alerts below the page header and above the content
5. THE system SHALL ensure toast notifications stack vertically with newest on top
6. THE system SHALL ensure toasts have consistent width (320px min, 400px max)
7. THE system SHALL ensure toasts have consistent animation (slide in from right, fade out)
8. THE system SHALL ensure alert banners span the full width of their container
9. WHEN multiple toasts are shown, THE system SHALL limit visible toasts to 3 with a queue for additional messages

### Requirement 27: Consistent Empty State Layout

**User Story:** As a user, I want empty states across the app to have a consistent layout and messaging pattern, so that I understand what to do when there's no content.

#### Acceptance Criteria

1. THE system SHALL define a standard empty state layout with: icon, title, description, and optional action button
2. THE system SHALL center empty state content both horizontally and vertically within its container
3. THE system SHALL use consistent icon sizing for empty states (48px or 64px)
4. THE system SHALL apply Accent_Font to empty state titles and Readable_Font to descriptions
5. THE system SHALL ensure empty state action buttons use primary button styling
6. THE system SHALL ensure empty state messages are helpful and action-oriented
7. THE system SHALL audit all empty states across the app and standardize their layout
8. WHEN an empty state has an action, THE system SHALL position the button below the description with --space-4 gap

### Requirement 28: Consistent Loading State Layout

**User Story:** As a user, I want loading states to be consistent across the app, so that I always know when content is being fetched.

#### Acceptance Criteria

1. THE system SHALL define a standard loading state with: spinner/skeleton, optional loading message
2. THE system SHALL center loading spinners within their container
3. THE system SHALL use consistent spinner sizing: small (16px), medium (24px), large (40px)
4. THE system SHALL use skeleton loaders for content areas where the layout is known
5. THE system SHALL ensure loading messages use Readable_Font and --text-secondary color
6. THE system SHALL ensure button loading states show a spinner replacing or alongside the label
7. THE system SHALL audit all loading states across the app and standardize their appearance
8. WHEN a page is loading, THE system SHALL show skeletons that match the expected content layout

### Requirement 29: Implementation Scope - Files and Components to Update

**User Story:** As a developer, I want a clear list of all files and components that need to be updated, so that I can systematically implement the consistency changes.

#### Acceptance Criteria

**Core Design System Files:**
1. THE system SHALL update `public/css/stone-clay-theme.css` to add --font-readable (Inter) token and rename --font-body to --font-accent
2. THE system SHALL update `public/index.html` to add Inter font import from Google Fonts

**CSS Files Requiring Typography Updates:**
3. THE system SHALL audit and update `public/css/app-shell.css` for typography consistency (sidebar, nav items, user pill)
4. THE system SHALL audit and update `public/css/contacts-table.css` for typography consistency (table headers, data cells)
5. THE system SHALL audit and update `public/css/groups-table.css` for typography consistency (modal headers, body content)
6. THE system SHALL audit and update `public/css/tags-table.css` for typography consistency (modal headers, body content)
7. THE system SHALL audit and update `public/css/scheduling.css` for typography consistency (page headers, section headers, modal content, notifications)
8. THE system SHALL audit and update `public/css/onboarding.css` for typography consistency (step indicators, form content, empty states)
9. THE system SHALL audit and update `public/css/preferences.css` for typography consistency (section headers, form labels, descriptions)
10. THE system SHALL audit and update `public/css/landing.css` for typography consistency (hero, features, testimonials)
11. THE system SHALL audit and update `public/css/undo-toast.css` for typography consistency (toast messages)
12. THE system SHALL audit and update `public/css/batch-suggestion-card.css` for typography consistency
13. THE system SHALL audit and update `public/css/quick-refine-card.css` for typography consistency
14. THE system SHALL audit and update `public/css/google-mappings-review.css` for typography consistency
15. THE system SHALL audit and update `public/css/manage-circles-flow.css` for typography consistency

**HTML Files Requiring Updates:**
16. THE system SHALL audit and update `public/index.html` inline styles for typography consistency
17. THE system SHALL audit and update `public/landing.html` for typography consistency
18. THE system SHALL audit and update `public/availability.html` for typography consistency
19. THE system SHALL audit and update `public/admin/sync-health.html` for typography consistency

**Modal Components to Standardize (in JavaScript files):**
20. THE system SHALL audit modal creation in `public/js/plan-creation-modal.js` for consistent header/footer layout
21. THE system SHALL audit modal creation in `public/js/plan-edit-modal.js` for consistent header/footer layout
22. THE system SHALL audit modal creation in `public/js/contact-search-modal.js` for consistent header/footer layout
23. THE system SHALL audit modal creation in `public/js/initiator-availability-modal.js` for consistent header/footer layout
24. THE system SHALL audit modal creation in `public/js/contacts-table.js` for consistent header/footer layout
25. THE system SHALL audit modal creation in `public/js/groups-table.js` for consistent header/footer layout
26. THE system SHALL audit modal creation in `public/js/tags-table.js` for consistent header/footer layout

**Empty State Components to Standardize:**
27. THE system SHALL standardize empty states in scheduling.css (.empty-state, .empty-state-welcome, .empty-state-filtered)
28. THE system SHALL standardize empty states in onboarding.css (.empty-state)
29. THE system SHALL standardize empty states in contacts-table.css, groups-table.css, tags-table.css

**Toast/Notification Components to Standardize:**
30. THE system SHALL standardize toast styling in undo-toast.css (.toast-undo, .toast-countdown)
31. THE system SHALL standardize notification styling in scheduling.css (.notification-item, .notification-dropdown)

**Theme Consistency Files to Audit:**
32. THE system SHALL audit `public/css/undo-toast.css` to replace @media (prefers-color-scheme: dark) with [data-theme="dark"]
33. THE system SHALL audit all CSS files for hardcoded color values and replace with design tokens
