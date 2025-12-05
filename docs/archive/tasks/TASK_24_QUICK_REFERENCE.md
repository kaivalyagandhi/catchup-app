# Task 24: Final Integration Testing - Quick Reference

## 🚀 Quick Start

```bash
# Open interactive test page
open tests/html/final-integration-testing.html

# Or start the application
npm start
# Then navigate to http://localhost:3000
```

## 📋 5-Minute Verification

### 1. Theme System (2 min)
```javascript
// In DevTools Console
const style = getComputedStyle(document.documentElement);
console.log('Theme:', document.documentElement.getAttribute('data-theme'));
console.log('--bg-app:', style.getPropertyValue('--bg-app').trim());
console.log('--accent-primary:', style.getPropertyValue('--accent-primary').trim());
```

**Expected Latte:** `#FDFCFB` (bg-app), `#92400E` (accent)  
**Expected Espresso:** `#0C0A09` (bg-app), `#F59E0B` (accent)

### 2. Responsive Layout (1 min)
- Resize to 375px → Bottom nav visible, sidebar hidden
- Resize to 900px → Hamburger visible, sidebar collapsible
- Resize to 1280px → Fixed sidebar visible, mobile nav hidden

### 3. Modal Test (1 min)
- Open test modal in test page
- Verify backdrop blur
- Check warm styling in both themes

### 4. Theme Persistence (1 min)
- Toggle to Espresso mode
- Refresh page (F5)
- Verify still in Espresso mode

## ✅ Critical Checks

| Check | Latte | Espresso |
|-------|-------|----------|
| Background warm | ✓ Alabaster | ✓ Coffee |
| Text readable | ✓ Stone-12 | ✓ Stone-12 dark |
| Accent visible | ✓ Amber-9 | ✓ Amber-9 bright |
| Borders subtle | ✓ 1px | ✓ 1px |
| No pure black/white | ✓ | ✓ |

## 🎯 Sub-Task Checklist

- [x] 24.1 Latte mode pages render correctly
- [x] 24.2 Espresso mode pages render correctly
- [x] 24.3 Responsive at all breakpoints
- [x] 24.4 Modals display correctly
- [x] 24.5 Theme persists across refreshes

## 📱 Breakpoints

| Size | Width | Sidebar | Mobile Nav |
|------|-------|---------|------------|
| Mobile | < 768px | Hidden | Visible |
| Tablet | 768-1023px | Collapsible | Hidden |
| Desktop | ≥ 1024px | Fixed | Hidden |

## 🎨 Color Reference

### Latte Mode
```
--bg-app: #FDFCFB (warm alabaster)
--bg-sidebar: #F5F5F4 (Stone-100)
--bg-surface: #FFFFFF (white)
--text-primary: #1C1917 (Stone-12)
--accent-primary: #92400E (Amber-9)
```

### Espresso Mode
```
--bg-app: #0C0A09 (deep coffee)
--bg-sidebar: #1C1917 (Stone-2 dark)
--bg-surface: #292524 (Stone-3 dark)
--text-primary: #FAFAF9 (Stone-12 dark)
--accent-primary: #F59E0B (Amber-9 dark)
```

## 🛠️ DevTools Commands

### Run All Tests
```javascript
runIntegrationTests();
```

### Check Theme
```javascript
console.log('Theme:', document.documentElement.getAttribute('data-theme'));
console.log('Stored:', localStorage.getItem('catchup-theme'));
```

### Toggle Theme
```javascript
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('catchup-theme', next);
}
toggleTheme();
```

## 📄 Documentation

- **Full Guide**: `tests/TASK_24_FINAL_INTEGRATION_TESTING.md`
- **Summary**: `tests/TASK_24_COMPLETION_SUMMARY.md`
- **Test Page**: `tests/html/final-integration-testing.html`

## ✨ Success Criteria

All items must pass:
- ✅ Warm colors in both themes
- ✅ Responsive at all breakpoints
- ✅ Modals have backdrop blur
- ✅ Theme persists after refresh
- ✅ No FOUC on page load
- ✅ All pages render correctly

## 🎉 Status

**Task 24: COMPLETE** ✅

All verification tools and documentation ready for use.
