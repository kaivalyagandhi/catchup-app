# Implementation Tasks: UI Typography Consistency

## Phase 1: Core Typography System (COMPLETED)

- [x] 1. Set up core typography tokens and font imports
  - [x] 1.1 Add Inter font import to public/index.html from Google Fonts
  - [x] 1.2 Add --font-readable token (Inter) to stone-clay-theme.css
  - [x] 1.3 Rename --font-body to --font-accent in stone-clay-theme.css
  - [x] 1.4 Update body default font-family to --font-readable
  - [x] 1.5 Add utility classes (.font-heading, .font-accent, .font-readable)
  - [x] 1.6 Update typography hierarchy rules for h1-h6 elements

## Phase 2: Main Application Typography (COMPLETED)

- [x] 2. Update app-shell.css typography
  - [x] 2.1 Apply --font-accent to sidebar navigation items (.nav-item)
  - [x] 2.2 Apply --font-heading to sidebar brand (.sidebar__brand)
  - [x] 2.3 Apply --font-readable to user pill and secondary text
  - [x] 2.4 Replace hardcoded colors with design tokens
  - [x] 2.5 Replace @media (prefers-color-scheme: dark) with [data-theme="dark"]

- [x] 3. Update contacts-table.css typography
  - [x] 3.1 Apply --font-heading to table section headers
  - [x] 3.2 Apply --font-readable to table data cells and contact details
  - [x] 3.3 Apply --font-accent to card titles and action buttons
  - [x] 3.4 Replace hardcoded colors with design tokens
  - [x] 3.5 Standardize modal header/footer layout

- [x] 4. Update groups-table.css typography
  - [x] 4.1 Apply --font-heading to modal titles
  - [x] 4.2 Apply --font-readable to modal body content and form fields
  - [x] 4.3 Apply --font-accent to group names and action buttons
  - [x] 4.4 Replace hardcoded colors with design tokens
  - [x] 4.5 Standardize modal header/footer layout

- [x] 5. Update tags-table.css typography
  - [x] 5.1 Apply --font-heading to modal titles
  - [x] 5.2 Apply --font-readable to modal body content and form fields
  - [x] 5.3 Apply --font-accent to tag names and action buttons
  - [x] 5.4 Replace hardcoded colors with design tokens
  - [x] 5.5 Standardize modal header/footer layout

## Phase 3: Feature Pages Typography (COMPLETED)

- [x] 6. Update scheduling.css typography
  - [x] 6.1 Apply --font-heading to page title and section headers
  - [x] 6.2 Apply --font-readable to plan details, descriptions, and form content
  - [x] 6.3 Apply --font-accent to card titles and primary buttons
  - [x] 6.4 Standardize empty state layout (.empty-state, .empty-state-welcome)
  - [x] 6.5 Standardize notification styling (.notification-item)
  - [x] 6.6 Replace hardcoded colors with design tokens

- [x] 7. Update onboarding.css typography
  - [x] 7.1 Apply --font-heading to step titles and section headers
  - [x] 7.2 Apply --font-readable to instructions, form content, and descriptions
  - [x] 7.3 Apply --font-accent to step indicators and action buttons
  - [x] 7.4 Standardize empty state layout
  - [x] 7.5 Replace hardcoded colors with design tokens

- [x] 8. Update preferences.css typography and layout
  - [x] 8.1 Apply --font-heading to page title
  - [x] 8.2 Apply --font-accent to section headers
  - [x] 8.3 Apply --font-readable to form labels, inputs, help text, and descriptions
  - [x] 8.4 Use card-based layouts for integration settings
  - [x] 8.5 Replace hardcoded colors with design tokens
  - [x] 8.6 Replace @media (prefers-color-scheme: dark) with [data-theme="dark"]

## Phase 4: Landing Page Redesign (COMPLETED)

- [x] 9. Redesign landing page with Stone & Clay theme
  - [x] 9.1 Import stone-clay-theme.css in landing.html
  - [x] 9.2 Apply dotted notebook background pattern
  - [x] 9.3 Apply --font-heading to hero title and section titles
  - [x] 9.4 Apply --font-readable to hero subtitle, feature descriptions, and testimonials
  - [x] 9.5 Apply --font-accent to feature titles and CTA buttons
  - [x] 9.6 Replace blue/purple gradients with Stone & Clay colors
  - [x] 9.7 Update CTAs to use amber accent color (--accent-primary)
  - [x] 9.8 Add theme toggle support
  - [x] 9.9 Update footer with Stone & Clay styling
  - [x] 9.10 Update hero headline to be benefit-focused (Req 19.1)
  - [x] 9.11 Update feature card titles to be benefit-oriented (Req 19.4)
  - [x] 9.12 Add "How it works" section with 3-4 simple steps (Req 19.6)
  - [x] 9.13 Update final CTA section to reinforce primary benefit (Req 19.8)

## Phase 5: Admin and Remaining Components

- [x] 10. Update admin/sync-health.html typography (Req 10, 29.19)
  - [x] 10.1 Apply --font-heading to page title
  - [x] 10.2 Apply --font-readable to metrics, tables, and data displays
  - [x] 10.3 Apply --font-readable to filter controls and labels
  - [x] 10.4 Replace hardcoded colors with design tokens
  - [x] 10.5 Replace @media (prefers-color-scheme: dark) with [data-theme="dark"]

- [x] 11. Update availability.html typography (Req 29.18)
  - [x] 11.1 Apply --font-heading to page title
  - [x] 11.2 Apply --font-readable to instructions and form content
  - [x] 11.3 Replace hardcoded colors with design tokens
  - [x] 11.4 Replace @media (prefers-color-scheme: dark) with [data-theme="dark"]

- [x] 12. Update toast and notification components (Req 9, 26)
  - [x] 12.1 Update undo-toast.css with --font-readable for messages
  - [x] 12.2 Apply --font-accent to toast titles (if any)
  - [x] 12.3 Replace @media (prefers-color-scheme: dark) with [data-theme="dark"]
  - [x] 12.4 Replace hardcoded colors with design tokens
  - [x] 12.5 Position toasts in bottom-right corner (Req 26.1)
  - [x] 12.6 Ensure toasts stack vertically with newest on top, max 3 visible (Req 26.2, 26.6)
  - [x] 12.7 Ensure toasts have consistent width (320px min, 400px max) (Req 26.3)
  - [x] 12.8 Ensure toasts have consistent animation (slide in from right) (Req 26.4)

- [x] 13. Update card components typography (Req 29.12-15)
  - [x] 13.1 Update batch-suggestion-card.css typography
  - [x] 13.2 Update quick-refine-card.css typography
  - [x] 13.3 Update google-mappings-review.css typography
  - [x] 13.4 Update manage-circles-flow.css typography
  - [x] 13.5 Replace hardcoded colors with design tokens in all card components
  - [x] 13.6 Standardize card header layout (title left, actions right)

## Phase 6: Layout Pattern Standardization

- [x] 14. Define and implement standard modal size classes (Req 21)
  - [x] 14.1 Add .modal-sm (400px), .modal-md (600px), .modal-lg (800px), .modal-full (90vw) to stone-clay-theme.css
  - [x] 14.2 Ensure modals have max-height: 90vh with internal scrolling
  - [x] 14.3 Define consistent modal padding using --space-* tokens
  - [x] 14.4 Define consistent modal overlay styling (blur and opacity)

- [x] 15. Standardize modal header/footer layout pattern (Req 22, 23)
  - [x] 15.1 Define standard modal header layout: [Title] [spacer] [Close X]
  - [x] 15.2 Define standard modal footer layout: [Cancel/Secondary] [spacer] [Primary]
  - [x] 15.3 Ensure modal headers use flexbox with justify-content: space-between
  - [x] 15.4 Ensure modal footers use flexbox with justify-content: space-between
  - [x] 15.5 Define consistent header height (56px) and footer padding (--space-4)

- [x] 16. Audit and update modal components in JavaScript files (Req 29.20-26)
  - [x] 16.1 Update plan-creation-modal.js for consistent header/footer layout and size class
  - [x] 16.2 Update plan-edit-modal.js for consistent header/footer layout and size class
  - [x] 16.3 Update contact-search-modal.js for consistent header/footer layout and size class
  - [x] 16.4 Update initiator-availability-modal.js for consistent header/footer layout and size class
  - [x] 16.5 Update contacts-table.js modal for consistent header/footer layout and size class
  - [x] 16.6 Update groups-table.js modal for consistent header/footer layout and size class
  - [x] 16.7 Update tags-table.js modal for consistent header/footer layout and size class

- [x] 17. Standardize empty state components (Req 27, 29.27-29)
  - [x] 17.1 Create standard .empty-state CSS class in stone-clay-theme.css
  - [x] 17.2 Define layout: centered icon (48-64px), title (--font-accent), description (--font-readable), action button
  - [x] 17.3 Apply standard empty state to scheduling.css (.empty-state, .empty-state-welcome, .empty-state-filtered)
  - [x] 17.4 Apply standard empty state to onboarding.css
  - [x] 17.5 Apply standard empty state to contacts-table.css, groups-table.css, tags-table.css
  - [x] 17.6 Ensure empty state messages are helpful and action-oriented

- [x] 18. Standardize loading state components (Req 28)
  - [x] 18.1 Define spinner sizes in stone-clay-theme.css: .spinner-sm (16px), .spinner-md (24px), .spinner-lg (40px)
  - [x] 18.2 Create skeleton loader styles for content areas (.skeleton-text, .skeleton-card, .skeleton-table)
  - [x] 18.3 Ensure loading messages use --font-readable and --text-secondary
  - [x] 18.4 Ensure button loading states show spinner replacing or alongside label
  - [x] 18.5 Apply consistent loading states across components

- [x] 19. Standardize section layout patterns (Req 24)
  - [x] 19.1 Define standard section layout CSS in stone-clay-theme.css (.section-header, .section-description, .section-content)
  - [x] 19.2 Ensure section descriptions appear below header with --space-2 gap
  - [x] 19.3 Ensure section content has --space-4 gap from header/description
  - [x] 19.4 Ensure sections have consistent vertical spacing (--space-6)
  - [x] 19.5 Standardize collapsible section expand/collapse icon position (right side)
  - [x] 19.6 Standardize section dividers (--border-subtle, 1px solid)
  - [x] 19.7 Audit all pages and apply standard section layout

- [x] 20. Standardize navigation element placement (Req 25)
  - [x] 20.1 Position tab navigation below page header with --space-4 gap
  - [x] 20.2 Ensure tab styling is consistent across all pages (same height, padding, active indicator)
  - [x] 20.3 Ensure filter/search bars have consistent height (40px)
  - [x] 20.4 Position pagination controls at bottom of content areas
  - [x] 20.5 Ensure "View all" or "See more" links are right-aligned below content
  - [x] 20.6 Audit all pages with navigation elements and standardize placement

- [x] 21. Standardize page header layout pattern (Req 22)
  - [x] 21.1 Define standard page header layout: [Back button] [Title] [spacer] [Primary action]
  - [x] 21.2 Define standard page header height (64px)
  - [x] 21.3 Ensure page headers use flexbox with justify-content: space-between
  - [x] 21.4 Ensure back buttons use consistent icon and position (left-most)
  - [x] 21.5 Audit all pages and apply standard header layout

## Phase 7: Final Audit and Testing

- [x] 22. Final color token audit (Req 15, 20, 29.33)
  - [x] 22.1 Audit all CSS files for remaining hardcoded hex color values
  - [x] 22.2 Replace hardcoded colors with appropriate design tokens
  - [x] 22.3 Verify all status colors use semantic tokens (--status-success, --status-error, --status-warning, --status-info)
  - [x] 22.4 Verify all circle colors use defined tokens (--circle-inner, --circle-close, --circle-active, --circle-casual, --circle-acquaintance)
  - [x] 22.5 Verify all avatar colors use defined tokens (--avatar-sage-*, --avatar-sand-*, --avatar-rose-*, --avatar-stone-*)
  - [x] 22.6 Verify modal overlays use var(--modal-overlay) or consistent rgba values
  - [x] 22.7 Verify shadows use defined shadow tokens (--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl)

- [x] 23. Final theme consistency audit (Req 14, 29.32)
  - [x] 23.1 Audit all CSS files for @media (prefers-color-scheme: dark) usage
  - [x] 23.2 Replace all prefers-color-scheme with [data-theme="dark"] selectors
  - [x] 23.3 Verify theme toggle works on all pages (landing, main app, admin, availability)
  - [x] 23.4 Verify no FOUC (Flash of Unstyled Content) on page load
  - [x] 23.5 Verify font colors have sufficient contrast in both themes

- [x] 24. Typography consistency verification (Req 1-4, 11)
  - [x] 24.1 Verify all page titles use --font-heading
  - [x] 24.2 Verify all navigation items use --font-accent
  - [x] 24.3 Verify all body text, forms, and tables use --font-readable
  - [x] 24.4 Verify all primary CTAs use --font-accent
  - [x] 24.5 Verify all secondary/tertiary buttons use --font-readable
  - [x] 24.6 Verify modal titles use --font-heading and modal body uses --font-readable

- [x] 25. Responsive typography testing (Req 12)
  - [x] 25.1 Test typography rendering on mobile devices (320px, 375px, 414px)
  - [x] 25.2 Test typography rendering on tablets (768px, 1024px)
  - [x] 25.3 Test typography rendering on desktop (1280px, 1920px)
  - [x] 25.4 Verify font sizes scale appropriately for mobile devices
  - [x] 25.5 Verify line heights remain readable on small screens
  - [x] 25.6 Verify font-family rules remain consistent across breakpoints

- [x] 26. Cross-browser testing (Req 13)
  - [x] 26.1 Test typography rendering in Chrome (latest)
  - [x] 26.2 Test typography rendering in Firefox (latest)
  - [x] 26.3 Test typography rendering in Safari (latest)
  - [x] 26.4 Test typography rendering in Edge (latest)
  - [x] 26.5 Verify dark mode consistency across browsers
  - [x] 26.6 Verify font fallbacks work correctly

- [x] 27. Accessibility audit
  - [x] 27.1 Verify font contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
  - [x] 27.2 Verify focus states are visible on all interactive elements
  - [x] 27.3 Verify screen reader compatibility with semantic HTML
  - [x] 27.4 Verify keyboard navigation works for all interactive elements
  - [x] 27.5 Test with screen reader (NVDA, JAWS, or VoiceOver)

- [x] 28. Documentation and handoff
  - [x] 28.1 Document typography usage guidelines in design system documentation
  - [x] 28.2 Create visual style guide showing font hierarchy examples
  - [x] 28.3 Document modal size class usage guidelines
  - [x] 28.4 Document empty state and loading state patterns
  - [x] 28.5 Create before/after screenshots for key pages
