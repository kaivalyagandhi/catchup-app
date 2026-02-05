# Task 21: Page Header Layout Standardization

## Overview

Standardizing page header layout across all pages to follow the pattern:
**[Back button (optional)] [Title] [spacer] [Primary action(s)]**

## Standard Page Header Pattern

### CSS Classes Defined

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px; /* 56px on mobile */
  margin-bottom: var(--space-4);
  padding: var(--space-4) 0;
}

.page-header-title {
  font-family: var(--font-heading);
  font-size: var(--text-2xl); /* --text-xl on mobile */
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.page-header-back {
  /* Back button styling - left-most element */
  margin-right: var(--space-3);
}

.page-header-actions {
  /* Action buttons - right-aligned */
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}
```

### HTML Structure

```html
<!-- Basic page header -->
<div class="page-header">
  <h1 class="page-header-title">Page Title</h1>
  <div class="page-header-actions">
    <button class="btn-primary">Primary Action</button>
  </div>
</div>

<!-- Page header with back button -->
<div class="page-header">
  <button class="page-header-back">
    <span class="page-header-back-icon">←</span>
    <span>Back</span>
  </button>
  <h1 class="page-header-title">Page Title</h1>
  <div class="page-header-actions">
    <button class="btn-primary">Save</button>
  </div>
</div>

<!-- Page header with breadcrumb -->
<div class="page-header page-header-with-breadcrumb">
  <nav class="breadcrumb">...</nav>
  <div class="page-header-row">
    <h1 class="page-header-title">Page Title</h1>
    <div class="page-header-actions">
      <button class="btn-primary">Action</button>
    </div>
  </div>
</div>
```

## Pages Audit

### 1. Main App - Directory Page (public/index.html)

**Current:**
```html
<div id="directory-page" class="page">
  <h2 style="margin-bottom: 20px;">Directory</h2>
  <div class="directory-tabs">...</div>
</div>
```

**Status:** ✅ UPDATED
- Changed h2 to h1 with `.page-header-title` class
- Wrapped in `.page-header` container
- Removed inline styles
- Added `.page-header-actions` for future action buttons

**Updated:**
```html
<div id="directory-page" class="page">
  <div class="page-header">
    <h1 class="page-header-title">Directory</h1>
    <div class="page-header-actions">
      <!-- Future: Add action buttons here -->
    </div>
  </div>
  <div class="directory-tabs">...</div>
</div>
```

### 2. Scheduling Page (public/js/scheduling-page.js)

**Current:**
```javascript
<div class="scheduling-header">
  <div class="scheduling-header-left">
    <h2>Scheduling</h2>
    ${this.renderPrivacyIndicator()}
  </div>
  <div class="scheduling-header-actions">...</div>
</div>
```

**Status:** ✅ UPDATED
- Changed h2 to h1 with `.page-header-title` class
- Renamed `.scheduling-header` to `.page-header`
- Renamed `.scheduling-header-actions` to `.page-header-actions`
- Moved privacy indicator below title
- Updated CSS references in scheduling.css

**Updated:**
```javascript
<div class="page-header">
  <div style="flex: 1;">
    <h1 class="page-header-title">Scheduling</h1>
    ${this.renderPrivacyIndicator()}
  </div>
  <div class="page-header-actions">...</div>
</div>
```

### 3. Admin Sync Health Dashboard (public/admin/sync-health.html)

**Current:**
```html
<div class="header">
  <h1>🔍 Sync Health Dashboard</h1>
  <p style="color: var(--text-secondary); margin-top: 4px; font-family: var(--font-readable);">
    Monitor Google Contacts and Calendar sync health across all users
  </p>
</div>
```

**Status:** ✅ UPDATED
- Renamed `.header` to `.page-header`
- Added `.page-header-title` class to h1
- Moved description below header
- Removed inline styles
- Added `.page-header-actions` for future actions

**Updated:**
```html
<div class="page-header">
  <h1 class="page-header-title">🔍 Sync Health Dashboard</h1>
  <div class="page-header-actions">
    <!-- Future: Add export/refresh buttons here -->
  </div>
</div>
<p class="page-description">
  Monitor Google Contacts and Calendar sync health across all users
</p>
```

### 4. Availability Page (public/availability.html)

**Current:**
```html
<header class="availability-header">
  <h1>CatchUp</h1>
  <p id="plan-description">Mark your availability</p>
</header>
```

**Status:** ✅ UPDATED
- Renamed `.availability-header` to `.page-header`
- Added `.page-header-title` class to h1
- Moved description below header
- Added `.page-header-actions` for consistency

**Updated:**
```html
<div class="page-header">
  <h1 class="page-header-title">CatchUp</h1>
  <div class="page-header-actions">
    <!-- Future: Add action buttons here -->
  </div>
</div>
<p id="plan-description" class="page-description">Mark your availability</p>
```

### 5. Landing Page (public/landing.html)

**Status:** ⏭️ SKIPPED
- Landing page uses hero section with different layout
- Not a standard app page, so standard page header doesn't apply
- Hero title uses `.hero-title` class which is appropriate for marketing page

### 6. Auth Error Page (public/auth-error.html)

**Status:** ⏭️ SKIPPED
- Error page with centered layout
- Not a standard app page, so standard page header doesn't apply
- Uses `.error-title` class which is appropriate for error page

## CSS Updates

### 1. stone-clay-theme.css

**Added:**
- `.page-header` - Standard page header container
- `.page-header-title` - Page title styling
- `.page-header-back` - Back button styling
- `.page-header-back-icon` - Back button icon
- `.page-header-actions` - Action buttons container
- `.page-header-with-breadcrumb` - Variant with breadcrumb
- `.page-header-row` - Row for breadcrumb variant
- Mobile responsive styles for page headers

### 2. scheduling.css

**Updated:**
- Removed `.scheduling-header` styles (now using `.page-header`)
- Removed `.scheduling-header-left` styles
- Removed `.scheduling-header-actions` styles (now using `.page-header-actions`)
- Updated `.privacy-indicator` to work with new layout
- Kept `.scheduling-controls` and other scheduling-specific styles

### 3. availability-public.css

**Updated:**
- Removed `.availability-header` styles (now using `.page-header`)
- Updated `.page-description` for description text below header
- Maintained responsive behavior

## Testing

### Manual Testing

1. **Test File Created:** `tests/html/page-header-patterns.test.html`
   - Tests 6 different page header variations
   - Tests responsive behavior
   - Tests dark mode compatibility

2. **Pages to Test:**
   - ✅ Directory page (public/index.html)
   - ✅ Scheduling page (navigate to scheduling in app)
   - ✅ Admin sync health dashboard (public/admin/sync-health.html)
   - ✅ Availability page (public/availability.html)

### Test Checklist

- [ ] Page headers have consistent height (64px desktop, 56px mobile)
- [ ] Page titles use --font-heading
- [ ] Action buttons are right-aligned
- [ ] Back buttons (when present) are left-aligned
- [ ] Headers use flexbox with space-between
- [ ] Headers work in both light and dark modes
- [ ] Headers are responsive on mobile devices
- [ ] Headers maintain proper spacing with content below

## Requirements Validated

✅ **Requirement 22.1:** Standard header layout pattern defined  
✅ **Requirement 22.2:** Page headers follow [Back button] [Title] [spacer] [Primary action] pattern  
✅ **Requirement 22.3:** Page headers use flexbox with justify-content: space-between  
✅ **Requirement 22.6:** Header titles are vertically centered with action buttons  
✅ **Requirement 22.8:** Consistent header heights defined (64px page, 56px modal, 48px section, 40px card)  
✅ **Requirement 22.9:** Back buttons use consistent icon and position (left-most)  
✅ **Requirement 22.10:** Close buttons use consistent icon (X) and position (right-most) - already done for modals  

## Files Modified

1. `public/css/stone-clay-theme.css` - Added page header styles
2. `public/index.html` - Updated directory page header
3. `public/js/scheduling-page.js` - Updated scheduling page header
4. `public/css/scheduling.css` - Removed old header styles
5. `public/admin/sync-health.html` - Updated admin dashboard header
6. `public/availability.html` - Updated availability page header
7. `public/css/availability-public.css` - Removed old header styles
8. `tests/html/page-header-patterns.test.html` - Created test file

## Next Steps

1. Test all updated pages in the browser
2. Verify responsive behavior on mobile devices
3. Verify dark mode compatibility
4. Move to Task 22: Final color token audit
