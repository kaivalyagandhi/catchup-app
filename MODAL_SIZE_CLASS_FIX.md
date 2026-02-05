# Modal Size Class Placement Fix

## Issue
The Scheduling page modals (Create Plan, Edit Plan, Mark Availability) were not displaying correctly even after the overlay position fix that worked on the Directory page.

## Root Cause
The modal size class `modal-lg` was being applied to the wrong element in the HTML structure.

### Incorrect Structure (Before)
```html
<div class="modal-overlay show">
  <div class="modal plan-creation-modal">
    <div class="modal-content modal-lg plan-creation-content">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

### Correct Structure (After)
```html
<div class="modal-overlay show">
  <div class="modal modal-lg plan-creation-modal">
    <div class="modal-content plan-creation-content">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

## Why This Matters

According to the design system in `stone-clay-theme.css`, modal size classes should be applied to the `.modal` element:

```css
/* Base Modal Styles */
.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  position: relative;
  z-index: var(--z-modal);
}

/* Modal Size Classes */
.modal-sm {
  max-width: 400px;
}

.modal-md {
  max-width: 600px;
}

.modal-lg {
  max-width: 800px;
}

.modal-full {
  max-width: 90vw;
}
```

The `.modal` element is what receives the `max-width` property. When `modal-lg` was on `.modal-content` instead, the modal wasn't getting the correct width constraint, which could cause layout issues and affect how the overlay interacts with the modal.

## Files Fixed

### 1. `public/js/plan-creation-modal.js`
**Before:**
```javascript
modal.className = 'modal plan-creation-modal';
modal.innerHTML = `
  <div class="modal-content modal-lg plan-creation-content">
```

**After:**
```javascript
modal.className = 'modal modal-lg plan-creation-modal';
modal.innerHTML = `
  <div class="modal-content plan-creation-content">
```

### 2. `public/js/plan-edit-modal.js`
**Before:**
```javascript
modal.className = 'modal plan-edit-modal';
modal.innerHTML = `
  <div class="modal-content modal-lg plan-edit-content">
```

**After:**
```javascript
modal.className = 'modal modal-lg plan-edit-modal';
modal.innerHTML = `
  <div class="modal-content plan-edit-content">
```

### 3. `public/js/initiator-availability-modal.js`
**Before:**
```javascript
modal.className = 'modal initiator-availability-modal';
modal.innerHTML = `
  <div class="modal-content modal-lg">
```

**After:**
```javascript
modal.className = 'modal modal-lg initiator-availability-modal';
modal.innerHTML = `
  <div class="modal-content">
```

### 4. `public/index.html`
Updated cache-busting version parameters from `?v=20260205` to `?v=20260205b` to force browser to reload the updated JavaScript files.

## Expected Behavior After Fix

1. **Proper Modal Sizing**: Modals now have the correct `max-width: 800px` applied
2. **Consistent Layout**: Modal structure matches the design system specification
3. **Proper Overlay Coverage**: The overlay covers the entire viewport and properly dims/blurs the background
4. **Centered Modal**: Modal is properly centered within the overlay
5. **Responsive Behavior**: Modal sizing responds correctly to viewport changes

## Testing

1. Refresh the page (F5 or Cmd+R) - no hard refresh needed due to cache-busting
2. Navigate to Scheduling page
3. Test "Create New Plan" modal - should display with proper overlay and sizing
4. Test "Edit Plan" modal - should display with proper overlay and sizing
5. Test "Mark Availability" modal - should display with proper overlay and sizing
6. Verify Directory page modals still work correctly

## Related Documentation

- `MODAL_OVERLAY_FIX.md` - Complete history of modal overlay fixes
- `public/css/stone-clay-theme.css` - Design system modal component specification
- `.kiro/specs/ui-typography-consistency/design.md` - Modal layout standardization requirements

## Design System Compliance

This fix ensures all modals in the application follow the standard modal component pattern defined in the Stone & Clay design system:

```
.modal-overlay (position: fixed, covers viewport)
  └── .modal.modal-{size} (max-width constraint)
      └── .modal-content (flexible content container)
          ├── .modal-header
          ├── .modal-body
          └── .modal-footer
```

All modals should follow this structure for consistency and proper behavior.
