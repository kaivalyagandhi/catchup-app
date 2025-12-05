# Task 20: Toast Notifications - Visual Reference

## Quick Test Guide

### Open Verification Page
```bash
open tests/html/toast-notifications-warm-styling-verification.html
```

## Visual Checklist

### Latte Mode (Light Theme)

#### Success Toast ✓
```
┌─────────────────────────────────────────┐
│ ✓  Contact successfully added!          │  ← Sage green bg (#d1fae5)
│                                          │  ← Green border (#10b981)
└─────────────────────────────────────────┘
```
- Background: Warm sage green (#d1fae5)
- Text: Dark green (#065f46)
- Border: 4px solid green (#10b981)
- Icon: ✓ checkmark

#### Error Toast ✕
```
┌─────────────────────────────────────────┐
│ ✕  Failed to save changes.              │  ← Warm red bg (#fee2e2)
│                                          │  ← Red border (#ef4444)
└─────────────────────────────────────────┘
```
- Background: Warm red (#fee2e2)
- Text: Dark red (#991b1b)
- Border: 4px solid red (#ef4444)
- Icon: ✕ cross

#### Info Toast ℹ
```
┌─────────────────────────────────────────┐
│ ℹ  New features are now available!      │  ← Warm blue bg (#dbeafe)
│                                          │  ← Blue border (#3b82f6)
└─────────────────────────────────────────┘
```
- Background: Warm blue (#dbeafe)
- Text: Dark blue (#0369a1)
- Border: 4px solid blue (#3b82f6)
- Icon: ℹ info

#### Loading Toast ⟳
```
┌─────────────────────────────────────────┐
│ ⟳  Syncing contacts...                  │  ← Warm blue bg (#dbeafe)
│                                          │  ← AMBER border (#92400E)
└─────────────────────────────────────────┘
```
- Background: Warm blue (#dbeafe)
- Text: Dark blue (#0369a1)
- Border: 4px solid AMBER (#92400E) ← Special!
- Icon: Spinning loader with amber accent

### Espresso Mode (Dark Theme)

#### Success Toast ✓
```
┌─────────────────────────────────────────┐
│ ✓  Contact successfully added!          │  ← Dark sage bg (#064e3b)
│                                          │  ← Green border (#10b981)
└─────────────────────────────────────────┘
```
- Background: Dark sage green (#064e3b)
- Text: Light green (#6ee7b7)
- Border: 4px solid green (#10b981)

#### Error Toast ✕
```
┌─────────────────────────────────────────┐
│ ✕  Failed to save changes.              │  ← Dark red bg (#7f1d1d)
│                                          │  ← Red border (#ef4444)
└─────────────────────────────────────────┘
```
- Background: Dark warm red (#7f1d1d)
- Text: Light red (#fca5a5)
- Border: 4px solid red (#ef4444)

#### Info Toast ℹ
```
┌─────────────────────────────────────────┐
│ ℹ  New features are now available!      │  ← Dark blue bg (#1e3a5f)
│                                          │  ← Blue border (#3b82f6)
└─────────────────────────────────────────┘
```
- Background: Dark warm blue (#1e3a5f)
- Text: Light blue (#7dd3fc)
- Border: 4px solid blue (#3b82f6)

#### Loading Toast ⟳
```
┌─────────────────────────────────────────┐
│ ⟳  Syncing contacts...                  │  ← Dark blue bg (#1e3a5f)
│                                          │  ← BRIGHT AMBER border (#F59E0B)
└─────────────────────────────────────────┘
```
- Background: Dark warm blue (#1e3a5f)
- Text: Light blue (#7dd3fc)
- Border: 4px solid BRIGHT AMBER (#F59E0B) ← Special!
- Icon: Spinning loader with bright amber accent

## Key Differences from Before

### What Changed
1. **Success Border**: Changed from generic `--color-success` to specific `--status-success`
2. **Error Border**: Changed from generic `--color-danger` to specific `--status-error`
3. **Info Border**: Changed from generic `--color-primary` to specific `--status-info`
4. **Loading Border**: Changed from generic `--color-primary` to **warm `--accent-primary` (AMBER)**

### Why It Matters
- **Loading toast** now has a unique amber/terracotta border that matches the warm theme
- All toasts use semantic color tokens from the Stone & Clay design system
- Colors automatically adapt to Latte/Espresso modes
- Creates visual consistency with the rest of the warm UI

## Testing Steps

1. **Open verification page** in browser
2. **Click each button** to trigger toasts:
   - "Show Success Toast" → Green sage background
   - "Show Error Toast" → Warm red background
   - "Show Info Toast" → Warm blue background
   - "Show Loading Toast" → Warm blue bg with AMBER border
3. **Toggle theme** (moon/sun button) to test both modes
4. **Verify colors** match the visual reference above
5. **Check animations** - toasts should slide in smoothly from right
6. **Verify auto-dismiss** - toasts disappear after 4 seconds (except loading)

## Common Issues to Check

❌ **Loading toast has blue border** → Should be AMBER
❌ **Colors look too cool/sterile** → Should be warm earth tones
❌ **Dark mode colors too harsh** → Should be muted and warm
❌ **Borders missing** → Should have 4px left border
❌ **No animation** → Should slide in from right

✅ **All toasts have warm backgrounds**
✅ **Loading toast has amber accent border**
✅ **Smooth slide-in animation**
✅ **Colors adapt to theme automatically**
✅ **Text remains readable in both themes**

## Color Palette Reference

### Latte Mode
| Type | Background | Text | Border |
|------|-----------|------|--------|
| Success | #d1fae5 | #065f46 | #10b981 |
| Error | #fee2e2 | #991b1b | #ef4444 |
| Info | #dbeafe | #0369a1 | #3b82f6 |
| Loading | #dbeafe | #0369a1 | **#92400E** |

### Espresso Mode
| Type | Background | Text | Border |
|------|-----------|------|--------|
| Success | #064e3b | #6ee7b7 | #10b981 |
| Error | #7f1d1d | #fca5a5 | #ef4444 |
| Info | #1e3a5f | #7dd3fc | #3b82f6 |
| Loading | #1e3a5f | #7dd3fc | **#F59E0B** |

## Requirements Validation

- [x] **15.1**: Success toast with warm sage green ✓
- [x] **15.2**: Error toast with warm red ✓
- [x] **15.3**: Info toast with warm blue ✓
- [x] **15.4**: Loading toast with accent border (AMBER) ✓

## Screenshot Locations

When testing, look for:
- Top-right corner of screen (toast container)
- Smooth slide-in animation from right
- 4px colored left border on each toast
- Warm, earthy color palette
- Readable text in both themes

## Next Steps

Task 20 is complete! The toast notifications now match the warm, cozy aesthetic of the Stone & Clay design system.
