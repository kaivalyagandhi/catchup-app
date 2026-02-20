# Implementation Plan

- [x] 1. Define CSS custom properties for theme system
  - Add light theme CSS variables to :root in index.html
  - Add dark theme CSS variables to [data-theme="dark"] selector
  - Define variables for backgrounds, text, borders, interactive elements, and components
  - Add smooth transition effects for theme changes
  - _Requirements: 6.1_

- [ ]* 1.1 Write property test for CSS variables usage
  - **Property 8: All pages use theme variables**
  - **Validates: Requirements 4.1**

- [x] 2. Refactor existing styles to use CSS variables
  - Replace hardcoded background colors with CSS variables
  - Replace hardcoded text colors with CSS variables
  - Replace hardcoded border colors with CSS variables
  - Replace hardcoded component colors (cards, badges, buttons) with CSS variables
  - Replace hardcoded status colors (success, error, info) with CSS variables
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.1 Write property test for CSS variable updates
  - **Property 3: CSS variables update on theme change**
  - **Validates: Requirements 1.4**

- [x] 3. Implement theme manager JavaScript module
  - Create theme manager with getCurrentTheme, setTheme, toggleTheme functions
  - Implement saveThemePreference to store theme in localStorage
  - Implement loadThemePreference to retrieve theme from localStorage
  - Implement applyTheme to update data-theme attribute on document root
  - Add error handling for localStorage failures
  - _Requirements: 2.1, 2.2, 2.5_

- [ ]* 3.1 Write property test for theme toggle
  - **Property 1: Theme toggle switches mode**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 3.2 Write property test for theme persistence
  - **Property 4: Theme preference persistence**
  - **Validates: Requirements 2.1**

- [ ]* 3.3 Write property test for theme restoration
  - **Property 5: Theme restoration on page load**
  - **Validates: Requirements 2.2**

- [ ]* 3.4 Write property test for CSS variable mechanism
  - **Property 10: Theme changes via CSS variables**
  - **Validates: Requirements 6.4**

- [x] 4. Add theme initialization on page load
  - Add inline script in HTML head to load and apply theme before render
  - Call loadThemePreference on page load
  - Apply saved theme or default to light mode
  - Prevent flash of unstyled content (FOUC)
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 5. Create theme toggle button component
  - Add theme toggle button to header user actions section
  - Position toggle between preferences and logout buttons
  - Add appropriate icon (🌙 for dark mode, ☀️ for light mode)
  - Add aria-label for accessibility
  - Style toggle button to match header design
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 5.1 Write property test for toggle icon
  - **Property 6: Toggle icon reflects current theme**
  - **Validates: Requirements 3.3**

- [x] 6. Implement toggle click handler
  - Add onclick handler to toggle button
  - Call toggleTheme function on click
  - Update toggle icon based on new theme
  - Provide immediate visual feedback
  - _Requirements: 1.1, 1.2, 1.3, 3.4_

- [ ]* 6.1 Write property test for immediate theme changes
  - **Property 2: Theme changes are immediate**
  - **Validates: Requirements 1.3**

- [x] 7. Ensure mobile responsiveness of theme toggle
  - Test toggle visibility on mobile viewports
  - Adjust toggle button size for touch targets (min 44x44px)
  - Ensure toggle remains accessible in responsive layouts
  - Update media queries if needed
  - _Requirements: 3.5_

- [ ]* 7.1 Write property test for mobile visibility
  - **Property 7: Toggle visibility on mobile**
  - **Validates: Requirements 3.5**

- [x] 8. Verify dark theme on all pages
  - Test contacts page in dark mode
  - Test groups-tags page in dark mode
  - Test suggestions page in dark mode
  - Test calendar page in dark mode
  - Test voice notes page in dark mode
  - Test preferences page in dark mode
  - Fix any visual inconsistencies
  - _Requirements: 4.1_

- [ ] 9. Verify dark theme on all modals and components
  - Test contact modal in dark mode
  - Test group modal in dark mode
  - Test tag modal in dark mode
  - Test all other modals in dark mode
  - Test form inputs and controls in dark mode
  - Test cards, badges, and status indicators in dark mode
  - Fix any visual inconsistencies
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 10. Verify accessibility in dark mode
  - Check contrast ratios for normal text (min 4.5:1)
  - Check contrast ratios for large text (min 3:1)
  - Check contrast ratios for UI components (min 3:1)
  - Ensure focus indicators are visible on all interactive elements
  - Test keyboard navigation with theme toggle
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 10.1 Write property test for focus indicators
  - **Property 9: Focus indicators visible in dark mode**
  - **Validates: Requirements 5.5**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Manual testing and verification
  - Test theme toggle switches between light and dark modes
  - Test theme preference persists across page reloads
  - Test default light theme when no preference is stored
  - Test theme toggle on mobile devices
  - Test all pages and components in both themes
  - Verify visual consistency across the application
  - Verify accessibility standards are met
  - Test with localStorage disabled (graceful fallback)
  - _Requirements: All_
