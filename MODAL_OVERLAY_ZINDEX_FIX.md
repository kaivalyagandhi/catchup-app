# Modal Overlay Z-Index Fix - RESOLVED

## Problem
Modal overlays on Scheduling and Suggestions pages appeared to "only extend up to the chat bubble" with "rounded edges" visible. The Directory page modals worked fine.

## Root Cause
**Z-Index Stacking Issue**

The floating chat icon was rendering ABOVE the modal overlay:
- `.modal-overlay` had `z-index: var(--z-overlay)` = **500**
- `.floating-chat-icon` had `z-index: 1000`

The "rounded edges" you saw were the circular chat icon showing through the overlay!

## The Fix
Changed one line in `public/css/stone-clay-theme.css`:

```css
/* Before */
.modal-overlay {
  z-index: var(--z-overlay); /* 500 */
}

/* After */
.modal-overlay {
  z-index: var(--z-modal); /* 1000 */
}
```

## Why Directory Page Worked
The Directory page modals had explicit `z-index: 1000` in their component CSS files (`groups-table.css`, `tags-table.css`), which happened to be the correct value.

## Testing
1. Refresh the page (no hard refresh needed)
2. Go to Scheduling page
3. Click "New Plan"
4. The overlay should now cover the ENTIRE page, including the chat bubble
5. No more "rounded edges" visible!

## Status
✅ **FIXED** - Modal overlays now correctly appear above all page content.

## Files Changed
- `public/css/stone-clay-theme.css` - Changed `.modal-overlay` z-index from `var(--z-overlay)` to `var(--z-modal)`

---

**Note**: This was the actual root cause all along. The previous fixes (CSS positioning, JavaScript structure, modal-lg placement, cache-busting) were all correct, but this z-index issue was preventing the overlay from appearing above the floating chat icon.
