# Modal Overlay CSS Cascade Fix

## Issue
Modal overlays on Scheduling and Suggestions pages were not properly covering the page background. The floating chat icon was visible above the modal overlay, appearing as "rounded edges" through the overlay.

## Root Cause
Component-specific CSS files (`groups-table.css` and `tags-table.css`) were defining their own `.modal-overlay` class, which was overriding the design system's global `.modal-overlay` definition for ALL modals on the page.

### CSS Load Order
```
1. stone-clay-theme.css (line 19)  → defines .modal-overlay with z-index: var(--z-modal) (1000)
2. groups-table.css (line 36)      → OVERRIDES .modal-overlay with z-index: 1000 (hardcoded)
3. tags-table.css (line 37)        → OVERRIDES .modal-overlay with z-index: 1000 (hardcoded)
4. scheduling.css (line 50)        → uses overridden .modal-overlay
5. edits.css (line 3456)           → defines .floating-chat-icon with z-index: 1000
```

Since `groups-table.css` and `tags-table.css` are loaded AFTER `stone-clay-theme.css`, their definitions override the design system's definition. This affected ALL modals on the page, not just Groups/Tags modals.

## The Fix
Removed the duplicate `.modal-overlay` definitions from `groups-table.css` and `tags-table.css`. These files now rely on the design system's standard `.modal-overlay` class from `stone-clay-theme.css`.

### Files Changed
1. **public/css/groups-table.css** - Removed duplicate `.modal-overlay` definition
2. **public/css/tags-table.css** - Removed duplicate `.modal-overlay` definition

### Before
```css
/* groups-table.css and tags-table.css */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(28, 25, 23, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
}
```

### After
```css
/* groups-table.css and tags-table.css */
/* Modal overlay styles now use the standard .modal-overlay class from stone-clay-theme.css */
```

## Why This Works
- All modals now use the same `.modal-overlay` definition from `stone-clay-theme.css`
- The design system's z-index hierarchy is respected
- Modal overlays have `z-index: var(--z-modal)` (1000), same as the floating chat icon
- Since modals are created dynamically and appended to the body AFTER the page loads, they appear above the chat icon due to DOM order

## Testing
1. Navigate to Scheduling page
2. Click "New Plan" button
3. Verify the modal overlay covers the entire page, including the floating chat icon
4. The chat icon should NOT be visible above the overlay
5. Repeat for Suggestions page modals
6. Verify Directory page modals still work correctly

## Lessons Learned
- Component-specific CSS should not override design system globals
- Check CSS load order when debugging style issues
- Use browser DevTools "Computed" tab to see which CSS file is providing the final styles
- Avoid duplicate class definitions across multiple CSS files
- Rely on the design system's standard classes whenever possible

## Status
✅ **RESOLVED** - Modal overlays now correctly use the design system's standard definition and appear above all page content.
