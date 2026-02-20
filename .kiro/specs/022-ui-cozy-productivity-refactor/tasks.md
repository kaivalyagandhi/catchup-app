# Implementation Plan

## Phase 1: Design System Foundation

- [x] 1. Create Stone & Clay Design System CSS
  - [x] 1.1 Create `public/css/stone-clay-theme.css` with 12-step Stone and Amber color scales
    - Define CSS custom properties for Stone scale (steps 1-12)
    - Define CSS custom properties for Amber accent scale
    - Define semantic tokens mapped to scale steps
    - _Requirements: 1.1, 2.2, 2.3_
  - [x] 1.2 Add dark mode (Espresso) CSS variables using `[data-theme="dark"]` selector
    - Invert Stone scale for dark backgrounds
    - Adjust Amber scale for dark mode visibility
    - Update semantic tokens for dark mode
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  - [ ]* 1.3 Write property test for theme toggle round-trip
    - **Property 1: Theme Toggle Round-Trip**
    - **Validates: Requirements 2.1**
  - [x] 1.4 Update theme initialization script in `index.html` head to prevent FOUC
    - Use `data-theme` attribute on `<html>` element
    - Check localStorage and system preference
    - _Requirements: 2.1_

- [x] 2. Checkpoint - Ensure design system loads correctly
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: App Shell - Sidebar Navigation

- [x] 3. Implement Fixed Sidebar Navigation
  - [x] 3.1 Create `public/css/app-shell.css` with sidebar layout styles
    - Fixed sidebar 240px width, full height
    - Main content area with left margin
    - Sidebar background, borders using design tokens
    - _Requirements: 3.1, 4.1, 4.2, 4.5_
  - [x] 3.2 Update `index.html` structure to use sidebar layout
    - Replace header-based navigation with sidebar
    - Add brand section at top
    - Add navigation items with SVG icons (Lucide)
    - Add user footer at bottom
    - _Requirements: 3.2, 3.3, 3.5_
  - [x] 3.3 Update `app.js` navigation functions for sidebar
    - Update `setupNavigation()` for sidebar nav items
    - Update active state styling with clay tint background
    - _Requirements: 3.4_
  - [ ]* 3.4 Write property test for navigation active state consistency
    - **Property 2: Navigation Active State Consistency**
    - **Validates: Requirements 3.4**
  - [x] 3.5 Update pending edits badge in sidebar navigation
    - Style badge with accent-primary background
    - Update `updatePendingEditCounts()` function
    - _Requirements: 3.6_
  - [ ]* 3.6 Write property test for pending edits badge accuracy
    - **Property 3: Pending Edits Badge Accuracy**
    - **Validates: Requirements 3.6**

- [x] 4. Checkpoint - Ensure sidebar navigation works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Responsive Design

- [x] 5. Implement Responsive Layout
  - [x] 5.1 Create `public/css/responsive.css` with breakpoint styles
    - Define breakpoints: mobile (<768px), tablet (768-1023px), desktop (>=1024px)
    - Hide sidebar on mobile, show bottom nav
    - Collapsible sidebar overlay for tablet
    - _Requirements: 16.1, 16.2, 16.3_
  - [x] 5.2 Add mobile bottom navigation component
    - Create mobile nav bar with icons
    - Style with design tokens
    - _Requirements: 16.3_
  - [x] 5.3 Add hamburger menu button for tablet
    - Toggle sidebar visibility
    - Add overlay backdrop
    - _Requirements: 16.2_
  - [ ]* 5.4 Write property test for responsive navigation visibility
    - **Property 8: Responsive Navigation Visibility**
    - **Validates: Requirements 16.1, 16.2, 16.3**

- [ ] 6. Checkpoint - Ensure responsive layout works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Authentication Screens

- [x] 7. Update Authentication UI
  - [x] 7.1 Update auth container styles in `index.html`
    - Apply warm background colors
    - Update card styling with design tokens
    - _Requirements: 5.1_
  - [x] 7.2 Update Google SSO button styling
    - Apply warm tones matching theme
    - Update hover/active states
    - _Requirements: 5.2_
  - [x] 7.3 Update form input styles
    - Apply design token colors
    - Update focus states with accent color
    - _Requirements: 5.3_
  - [x] 7.4 Update auth divider and error message styles
    - Apply warm styling
    - _Requirements: 5.4, 5.5_

## Phase 5: Directory Page Components

- [x] 8. Update Directory Page - Segmented Control
  - [x] 8.1 Create segmented control component styles
    - Pill-shaped toggle styling
    - Active state with warm background
    - _Requirements: 6.1, 6.2_
  - [x] 8.2 Update `switchDirectoryTab()` function styling
    - Apply new active state classes
    - _Requirements: 6.1, 6.2_
  - [ ]* 8.3 Write property test for segmented control single selection
    - **Property 4: Segmented Control Single Selection**
    - **Validates: Requirements 6.1, 6.2**

- [x] 9. Update Directory Page - Contacts Tab
  - [x] 9.1 Update `contacts-table.css` with warm styling
    - Card backgrounds with design tokens
    - Text colors using semantic tokens
    - _Requirements: 6.3, 6.4_
  - [x] 9.2 Update avatar component with warm pastel colors
    - Sage, Sand, Rose, Stone variants
    - _Requirements: 6.5_
  - [x] 9.3 Update tag and group badge styles
    - Warm-toned backgrounds
    - _Requirements: 6.6, 6.7_

- [x] 10. Update Directory Page - Circles Tab
  - [x] 10.1 Update `circular-visualizer.js` with warm circle colors
    - Update CIRCLE_DEFINITIONS colors
    - _Requirements: 7.2_
  - [x] 10.2 Update contact dot and tooltip styles
    - Apply design tokens
    - _Requirements: 7.3, 7.4_
  - [x] 10.3 Update legend styles
    - Apply text color tokens
    - _Requirements: 7.5_

- [x] 11. Update Directory Page - Groups Tab
  - [x] 11.1 Update `groups-table.css` with warm styling
    - Card backgrounds and borders
    - Header and action button styles
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 11.2 Update Google mappings review section
    - Warm status indicators
    - _Requirements: 8.4_

- [x] 12. Update Directory Page - Tags Tab
  - [x] 12.1 Update `tags-table.css` with warm styling
    - Item backgrounds and borders
    - Badge colors
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 13. Checkpoint - Ensure Directory page works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Suggestions Page

- [x] 14. Update Suggestions Page
  - [x] 14.1 Update suggestion card styles in `app.js`
    - Apply warm card styling
    - Update border radius to 12px
    - _Requirements: 10.1, 10.2_
  - [x] 14.2 Update suggestion content typography
    - Apply text color tokens
    - _Requirements: 10.3_
  - [x] 14.3 Update status badge colors
    - Warm amber for pending, sage green for accepted
    - _Requirements: 10.4_
  - [x] 14.4 Update action button styles
    - Primary button with high contrast
    - Ghost buttons for secondary actions
    - _Requirements: 10.5, 10.6_
  - [x] 14.5 Update group suggestion avatar styles
    - Warm-styled overlap
    - _Requirements: 10.7_

## Phase 7: Edits Page

- [x] 15. Update Edits Page
  - [x] 15.1 Update `edits.css` and `edits-compact.css` with warm styling
    - Menu background and borders
    - Tab active state styling
    - _Requirements: 11.1, 11.2_
  - [x] 15.2 Update contact group header styles
    - Warm avatar styling
    - _Requirements: 11.3_
  - [x] 15.3 Update diff styling for old/new values
    - Warm red tint for old values
    - Sage green tint for new values
    - _Requirements: 11.4, 11.5_
  - [ ]* 15.4 Write property test for diff styling consistency
    - **Property 5: Diff Styling Consistency**
    - **Validates: Requirements 11.4, 11.5**
  - [x] 15.5 Update bulk action button styles
    - Apply warm styling
    - _Requirements: 11.6_
  - [x] 15.6 Update empty state styling
    - Warm illustration and button
    - _Requirements: 11.7_

- [ ] 16. Checkpoint - Ensure Edits page works
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Preferences Page

- [x] 17. Update Preferences Page
  - [x] 17.1 Update section header styles in `loadPreferences()`
    - Warm borders and text colors
    - _Requirements: 12.1_
  - [x] 17.2 Update integration card styles
    - Warm backgrounds and status indicators
    - _Requirements: 12.2, 12.3, 12.4_
  - [x] 17.3 Update toggle/switch styles
    - Pill switches with accent color
    - _Requirements: 12.5_
  - [x] 17.4 Update account section styles
    - Warm info row backgrounds
    - _Requirements: 12.6_
  - [x] 17.5 Update developer section styles
    - Warm button and card styling
    - _Requirements: 12.7_

## Phase 9: Modals and Overlays

- [x] 18. Update Modal Styles
  - [x] 18.1 Update modal overlay styles in `index.html`
    - Add backdrop blur effect
    - Warm overlay color
    - _Requirements: 13.1_
  - [x] 18.2 Update modal content styles
    - Warm background and borders
    - 12px border radius
    - _Requirements: 13.2_
  - [x] 18.3 Update modal header styles
    - Text and close button styling
    - _Requirements: 13.3_
  - [x] 18.4 Update modal form input styles
    - Warm backgrounds and focus states
    - _Requirements: 13.4_
  - [x] 18.5 Update modal action button styles
    - Primary and secondary button styling
    - _Requirements: 13.5_

## Phase 10: Floating Chat and Toast Notifications

- [x] 19. Update Floating Chat Component
  - [x] 19.1 Update `floating-chat-icon.js` styles
    - Accent primary background
    - Warm shadow
    - _Requirements: 14.1_
  - [x] 19.2 Update `chat-window.js` styles
    - Warm background and borders
    - _Requirements: 14.2_
  - [x] 19.3 Update chat message styles
    - User messages with warm blue tint
    - System messages with secondary background
    - _Requirements: 14.3_
  - [x] 19.4 Update recording indicator styles
    - Warm red pulsing animation
    - _Requirements: 14.4_
  - [x] 19.5 Update pending edit counter styles
    - Accent primary background
    - _Requirements: 14.5_

- [x] 20. Update Toast Notification Styles
  - [x] 20.1 Update toast styles in `index.html`
    - Success toast with warm sage green
    - Error toast with warm red
    - Info toast with warm blue
    - Loading toast with accent border
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [ ]* 20.2 Write property test for toast type styling
    - **Property 6: Toast Type Styling**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

- [ ] 21. Checkpoint - Ensure chat and toasts work
  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: Final Cleanup and Verification

- [x] 22. Replace Emoji Icons with SVG Icons
  - [x] 22.1 Replace navigation emoji icons with Lucide SVG icons
    - Directory: Book icon
    - Suggestions: Sparkles icon
    - Edits: Pencil icon
    - _Requirements: 1.5, 3.3_
  - [ ]* 22.2 Write property test for navigation icons no emoji
    - **Property 7: Navigation Icons No Emoji**
    - **Validates: Requirements 1.5**

- [x] 23. Update Theme Manager
  - [x] 23.1 Update `theme-manager.js` for Latte/Espresso naming
    - Update toggle function
    - Update localStorage key handling
    - _Requirements: 17.5_

- [x] 24. Final Integration Testing
  - [x] 24.1 Verify all pages render correctly in Latte mode
  - [x] 24.2 Verify all pages render correctly in Espresso mode
  - [x] 24.3 Verify responsive behavior at all breakpoints
  - [x] 24.4 Verify all modals display correctly
  - [x] 24.5 Verify theme toggle persists across page refreshes

- [ ] 25. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
