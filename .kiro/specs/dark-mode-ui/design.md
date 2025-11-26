# Design Document: Dark Mode UI

## Overview

This feature adds a comprehensive dark mode theme to the CatchUp application, providing users with a visually comfortable alternative interface. The implementation uses CSS custom properties (CSS variables) for maintainability and includes a toggle control in the header for easy theme switching. User preferences persist across sessions using browser local storage.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                        │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Theme Toggle   │  │ Theme        │  │ CSS Variables   │ │
│  │ Component      │  │ Manager      │  │ System          │ │
│  │ - Button UI    │  │ - State      │  │ - Light Theme   │ │
│  │ - Icon Display │  │ - Persistence│  │ - Dark Theme    │ │
│  │ - Click Handler│  │ - Apply      │  │ - Transitions   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Browser Local Storage                     │
│                    theme: 'light' | 'dark'                   │
└─────────────────────────────────────────────────────────────┘
```

### Theme Application Flow

```
User Clicks Toggle
       │
       ▼
Toggle Theme State
       │
       ▼
Update CSS Variables on :root
       │
       ▼
Save to Local Storage
       │
       ▼
UI Re-renders with New Theme
```

### Page Load Flow

```
Page Loads
       │
       ▼
Check Local Storage for Theme
       │
       ├─── Has Preference ──▶ Apply Saved Theme
       │
       └─── No Preference ───▶ Apply Default (Light)
       │
       ▼
Initialize Theme Toggle UI
       │
       ▼
Render Page
```

## Components and Interfaces

### 1. Theme Manager

**Purpose**: Manage theme state, persistence, and application.

**Interface**:
```typescript
interface ThemeManager {
  getCurrentTheme(): Theme;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  initializeTheme(): void;
  saveThemePreference(theme: Theme): void;
  loadThemePreference(): Theme | null;
}

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'catchup-theme';
```

**Responsibilities**:
- Get and set current theme state
- Toggle between light and dark themes
- Save theme preference to local storage
- Load theme preference from local storage
- Apply theme by updating CSS custom properties
- Initialize theme on page load

### 2. Theme Toggle Component

**Purpose**: Provide UI control for switching themes.

**Interface**:
```typescript
interface ThemeToggle {
  render(): HTMLElement;
  updateIcon(theme: Theme): void;
  handleClick(): void;
}
```

**HTML Structure**:
```html
<button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle dark mode">
  <span class="theme-icon">🌙</span>
</button>
```

**Responsibilities**:
- Render toggle button in header
- Display appropriate icon (🌙 for dark mode, ☀️ for light mode)
- Handle click events
- Update icon when theme changes
- Provide accessibility attributes

### 3. CSS Variables System

**Purpose**: Define and manage theme colors using CSS custom properties.

**Light Theme Variables**:
```css
:root {
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #f9fafb;
  --bg-elevated: #ffffff;
  
  /* Text Colors */
  --text-primary: #333333;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-inverse: #ffffff;
  
  /* Border Colors */
  --border-primary: #e5e7eb;
  --border-secondary: #d1d5db;
  --border-focus: #2563eb;
  
  /* Interactive Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #6b7280;
  --color-secondary-hover: #4b5563;
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  
  /* Component Colors */
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
  --card-shadow: rgba(0, 0, 0, 0.1);
  
  --modal-bg: #ffffff;
  --modal-overlay: rgba(0, 0, 0, 0.5);
  
  --input-bg: #ffffff;
  --input-border: #d1d5db;
  --input-focus-border: #2563eb;
  
  --tag-bg: #dbeafe;
  --tag-text: #1e40af;
  --tag-border: #93c5fd;
  
  --group-bg: #fef3c7;
  --group-text: #92400e;
  --group-border: #fcd34d;
  
  /* Status Colors */
  --status-success-bg: #d1fae5;
  --status-success-text: #065f46;
  --status-error-bg: #fee2e2;
  --status-error-text: #991b1b;
  --status-info-bg: #e0f2fe;
  --status-info-text: #0c4a6e;
}
```

**Dark Theme Variables**:
```css
[data-theme="dark"] {
  /* Background Colors */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #242424;
  --bg-elevated: #2d2d2d;
  
  /* Text Colors */
  --text-primary: #e5e5e5;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --text-inverse: #1a1a1a;
  
  /* Border Colors */
  --border-primary: #404040;
  --border-secondary: #525252;
  --border-focus: #3b82f6;
  
  /* Interactive Colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #a3a3a3;
  --color-secondary-hover: #d4d4d4;
  --color-danger: #f87171;
  --color-danger-hover: #ef4444;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  
  /* Component Colors */
  --card-bg: #2d2d2d;
  --card-border: #404040;
  --card-shadow: rgba(0, 0, 0, 0.3);
  
  --modal-bg: #2d2d2d;
  --modal-overlay: rgba(0, 0, 0, 0.7);
  
  --input-bg: #1a1a1a;
  --input-border: #404040;
  --input-focus-border: #3b82f6;
  
  --tag-bg: #1e3a5f;
  --tag-text: #93c5fd;
  --tag-border: #2563eb;
  
  --group-bg: #4a3f1a;
  --group-text: #fcd34d;
  --group-border: #92400e;
  
  /* Status Colors */
  --status-success-bg: #064e3b;
  --status-success-text: #6ee7b7;
  --status-error-bg: #7f1d1d;
  --status-error-text: #fca5a5;
  --status-info-bg: #0c4a6e;
  --status-info-text: #7dd3fc;
}
```

## Data Models

### Theme Preference

**Storage**: Browser Local Storage

**Key**: `catchup-theme`

**Value**: `'light' | 'dark'`

**Example**:
```javascript
localStorage.setItem('catchup-theme', 'dark');
const theme = localStorage.getItem('catchup-theme'); // 'dark'
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme toggle switches mode
*For any* current theme state (light or dark), clicking the toggle should switch to the opposite theme.
**Validates: Requirements 1.1, 1.2**

### Property 2: Theme changes are immediate
*For any* theme change operation, all UI components should reflect the new theme immediately after the change.
**Validates: Requirements 1.3**

### Property 3: CSS variables update on theme change
*For any* theme change, the CSS custom properties on the root element should be updated to match the new theme's color values.
**Validates: Requirements 1.4**

### Property 4: Theme preference persistence
*For any* theme selection, the preference should be stored in local storage and retrievable.
**Validates: Requirements 2.1**

### Property 5: Theme restoration on page load
*For any* stored theme preference, loading the page should apply that theme before rendering.
**Validates: Requirements 2.2**

### Property 6: Toggle icon reflects current theme
*For any* theme state, the toggle icon should correctly indicate the current theme (moon for dark, sun for light).
**Validates: Requirements 3.3**

### Property 7: Toggle visibility on mobile
*For any* viewport size, the theme toggle should remain visible and accessible.
**Validates: Requirements 3.5**

### Property 8: All pages use theme variables
*For any* page in the application, all color styles should reference CSS custom properties rather than hardcoded colors.
**Validates: Requirements 4.1**

### Property 9: Focus indicators visible in dark mode
*For any* interactive element in dark mode, focus styles should be defined and visible.
**Validates: Requirements 5.5**

### Property 10: Theme changes via CSS variables
*For any* theme toggle operation, the system should update CSS custom properties on the root element rather than modifying individual element styles.
**Validates: Requirements 6.4**

## Error Handling

### Local Storage Errors

1. **Storage Unavailable**
   - Gracefully fall back to light mode if localStorage is not available
   - Log warning to console for debugging
   - Continue normal operation without persistence

2. **Storage Quota Exceeded**
   - Handle quota exceeded errors when saving theme preference
   - Fall back to in-memory theme state
   - Display optional warning to user

3. **Invalid Stored Values**
   - Validate theme value from localStorage
   - Fall back to light mode if invalid value found
   - Clear invalid value from storage

### Theme Application Errors

1. **CSS Variable Support**
   - Detect if browser supports CSS custom properties
   - Provide fallback styles for older browsers
   - Log warning if CSS variables not supported

2. **DOM Manipulation Errors**
   - Wrap theme application in try-catch blocks
   - Log errors to console
   - Maintain current theme state on error

## Testing Strategy

### Unit Tests

Unit tests will cover:
- Theme manager functions (getCurrentTheme, setTheme, toggleTheme)
- Local storage save and load operations
- Theme initialization logic
- Toggle button click handlers
- Icon update logic
- Error handling for localStorage failures

### Property-Based Tests

Property-based tests will use **fast-check** (TypeScript/JavaScript property-based testing library) to verify the correctness properties defined above. Each property will be implemented as a separate test with a minimum of 100 iterations.

**Configuration**:
```typescript
import fc from 'fast-check';

// Example property test
fc.assert(
  fc.property(
    fc.constantFrom('light', 'dark'),
    (initialTheme) => {
      // Property assertion
    }
  ),
  { numRuns: 100 }
);
```

**Test Organization**:
- `public/js/theme-manager.test.ts` - Theme manager logic tests
- `public/js/theme-toggle.test.ts` - Toggle component tests

**Property Test Tags**:
Each property-based test will be tagged with a comment referencing the design document:
```typescript
// Feature: dark-mode-ui, Property 1: Theme toggle switches mode
```

### Integration Tests

Integration tests will cover:
- End-to-end theme switching flow
- Theme persistence across page reloads
- Theme application to all pages and components
- Mobile responsiveness of toggle
- Accessibility of theme toggle

### Manual Testing

Manual testing checklist:
- [ ] Click theme toggle and verify entire UI switches to dark mode
- [ ] Click toggle again and verify UI switches back to light mode
- [ ] Refresh page and verify theme preference is maintained
- [ ] Clear local storage and verify default light theme is applied
- [ ] Test theme toggle on mobile devices
- [ ] Verify all pages (contacts, groups-tags, suggestions, calendar, voice, preferences) use dark theme
- [ ] Verify all modals and dialogs use dark theme
- [ ] Verify all form inputs and controls use dark theme
- [ ] Check contrast ratios meet accessibility standards
- [ ] Test with browser dev tools in different viewport sizes

## Implementation Notes

### CSS Refactoring Strategy

1. **Phase 1: Define CSS Variables**
   - Add CSS custom properties for both themes to the stylesheet
   - Define light theme as default on `:root`
   - Define dark theme on `[data-theme="dark"]`

2. **Phase 2: Replace Hardcoded Colors**
   - Systematically replace all hardcoded color values with CSS variables
   - Update background colors, text colors, border colors
   - Update component-specific colors (cards, badges, buttons)
   - Update status colors (success, error, info)

3. **Phase 3: Add Theme Toggle**
   - Create theme toggle button in header
   - Implement theme manager JavaScript
   - Add event listeners for toggle clicks
   - Implement local storage persistence

4. **Phase 4: Test and Refine**
   - Test all pages and components in both themes
   - Adjust colors for optimal contrast and readability
   - Fix any visual inconsistencies
   - Verify accessibility standards

### Theme Toggle Placement

The theme toggle will be positioned in the header's user actions section, between the preferences button and logout button:

```html
<div class="user-actions">
  <button class="preferences-btn" onclick="navigateToPage('preferences')">Preferences</button>
  <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle dark mode">
    <span class="theme-icon">🌙</span>
  </button>
  <button class="logout-btn" onclick="logout()">Logout</button>
</div>
```

### Preventing Theme Flash

To prevent a flash of the wrong theme on page load, the theme should be applied as early as possible:

```html
<script>
  // Inline script in <head> to apply theme before render
  (function() {
    const savedTheme = localStorage.getItem('catchup-theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

### Transition Effects

Add smooth transitions for theme changes:

```css
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

## Performance Considerations

1. **CSS Variable Performance**: CSS custom properties have excellent performance and are widely supported
2. **Transition Performance**: Use GPU-accelerated properties (opacity, transform) for animations when possible
3. **Local Storage**: localStorage operations are synchronous but fast for small data
4. **Initial Load**: Apply theme before render to prevent flash of unstyled content

## Security Considerations

1. **XSS Prevention**: Sanitize any user input before storing in localStorage (though theme is a controlled enum)
2. **Storage Isolation**: Theme preference is stored per-origin, isolated from other sites
3. **No Sensitive Data**: Theme preference is not sensitive information

## Accessibility Considerations

1. **Contrast Ratios**: Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
2. **Focus Indicators**: Maintain visible focus indicators in both themes
3. **ARIA Labels**: Add appropriate aria-label to theme toggle button
4. **Keyboard Navigation**: Ensure toggle is keyboard accessible
5. **Screen Readers**: Announce theme changes to screen reader users

## Browser Compatibility

- **CSS Custom Properties**: Supported in all modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 15+)
- **Local Storage**: Supported in all modern browsers
- **Fallback**: Provide basic light theme for browsers without CSS variable support
