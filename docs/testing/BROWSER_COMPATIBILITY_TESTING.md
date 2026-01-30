# Browser Compatibility Testing Guide

## Overview

This document provides comprehensive testing instructions for the Groups & Preferences UI Improvements across different browsers (Chrome, Firefox, Safari, Edge).

**Task Reference**: `.kiro/specs/groups-preferences-ui-improvements/tasks.md` - Task 16.10

## Supported Browsers

### Minimum Versions
- **Chrome**: 90+ (Released April 2021)
- **Firefox**: 88+ (Released April 2021)
- **Safari**: 14+ (Released September 2020)
- **Edge**: 90+ (Released April 2021)

### Browser Market Share (as of 2026)
- Chrome: ~65%
- Safari: ~20%
- Edge: ~10%
- Firefox: ~5%

## Testing Approach

### 1. Automated Feature Detection
Use the browser compatibility test page to automatically detect browser features:

```
http://localhost:3000/tests/html/browser-compatibility-test.html
```

This page will:
- Detect browser name and version
- Check for required CSS features (Variables, Grid, Flexbox)
- Check for required JavaScript features (Fetch API, LocalStorage, ES6+)
- Render demo components to verify visual compatibility

### 2. Manual Visual Testing
Test the actual implemented features in each browser:

#### Features to Test:
1. **Reviewed Groups Section** (Tasks 1-4)
   - Section appears after reviewing first mapping
   - Accepted mappings display with ✓ icon
   - Rejected mappings display with strikethrough
   - Collapse/expand toggle works
   - State persists across page refreshes

2. **Step 3 Auto-Completion** (Task 5)
   - Step 3 marks complete after first mapping review
   - Onboarding indicator updates in real-time
   - Success toast notification appears

## Browser-Specific Testing Instructions

### Chrome Testing

#### Setup
1. Open Chrome (version 90+)
2. Navigate to `http://localhost:3000`
3. Open DevTools (F12 or Cmd+Option+I)
4. Check Console for errors

#### Test Checklist
- [ ] CSS Variables render correctly (Stone & Clay theme colors)
- [ ] CSS Grid layouts display properly
- [ ] Flexbox components align correctly
- [ ] Fetch API calls work without errors
- [ ] LocalStorage persists state
- [ ] Animations are smooth (collapse/expand)
- [ ] Hover effects work on interactive elements
- [ ] Click handlers respond immediately

#### Known Issues
- None expected for Chrome 90+

#### Testing Commands
```bash
# Check Chrome version
google-chrome --version

# Open Chrome with specific profile for testing
google-chrome --user-data-dir=/tmp/chrome-test-profile http://localhost:3000
```

---

### Firefox Testing

#### Setup
1. Open Firefox (version 88+)
2. Navigate to `http://localhost:3000`
3. Open Developer Tools (F12 or Cmd+Option+I)
4. Check Console for errors

#### Test Checklist
- [ ] CSS Variables render correctly
- [ ] CSS Grid layouts display properly
- [ ] Flexbox components align correctly
- [ ] Fetch API calls work without errors
- [ ] LocalStorage persists state
- [ ] Animations are smooth
- [ ] Hover effects work
- [ ] Click handlers respond

#### Known Issues
- Firefox may render some CSS transitions slightly differently
- Font rendering may appear slightly different than Chrome

#### Testing Commands
```bash
# Check Firefox version
firefox --version

# Open Firefox with specific profile for testing
firefox -P test-profile http://localhost:3000
```

---

### Safari Testing

#### Setup
1. Open Safari (version 14+)
2. Enable Developer Menu: Safari > Preferences > Advanced > Show Develop menu
3. Navigate to `http://localhost:3000`
4. Open Web Inspector (Cmd+Option+I)
5. Check Console for errors

#### Test Checklist
- [ ] CSS Variables render correctly
- [ ] CSS Grid layouts display properly
- [ ] Flexbox components align correctly
- [ ] Fetch API calls work without errors
- [ ] LocalStorage persists state
- [ ] Animations are smooth
- [ ] Hover effects work
- [ ] Click handlers respond

#### Known Issues
- Safari may have stricter CORS policies
- Some CSS features may require `-webkit-` prefixes
- Font rendering may differ from other browsers

#### Safari-Specific Considerations
- Test on both macOS and iOS Safari if possible
- Check for any `-webkit-` prefix requirements
- Verify backdrop-filter support (Safari 14+)

#### Testing Commands
```bash
# Check Safari version (macOS)
/Applications/Safari.app/Contents/MacOS/Safari --version

# Enable Safari Developer Mode
defaults write com.apple.Safari IncludeInternalDebugMenu 1
```

---

### Edge Testing

#### Setup
1. Open Edge (version 90+)
2. Navigate to `http://localhost:3000`
3. Open DevTools (F12 or Cmd+Option+I)
4. Check Console for errors

#### Test Checklist
- [ ] CSS Variables render correctly
- [ ] CSS Grid layouts display properly
- [ ] Flexbox components align correctly
- [ ] Fetch API calls work without errors
- [ ] LocalStorage persists state
- [ ] Animations are smooth
- [ ] Hover effects work
- [ ] Click handlers respond

#### Known Issues
- Edge (Chromium-based) should behave identically to Chrome
- Legacy Edge (pre-Chromium) is not supported

#### Testing Commands
```bash
# Check Edge version
msedge --version

# Open Edge with specific profile for testing
msedge --user-data-dir=/tmp/edge-test-profile http://localhost:3000
```

---

## Feature-Specific Testing

### Reviewed Groups Section

#### Visual Tests
1. **Layout**
   - [ ] Section appears at bottom of Groups page
   - [ ] Header is clickable and shows expand/collapse icon
   - [ ] Count badge displays correct number
   - [ ] Accepted and rejected groups are visually distinct

2. **Interactions**
   - [ ] Click header to collapse/expand
   - [ ] Keyboard navigation works (Tab, Enter, Space)
   - [ ] Collapse state persists after page refresh
   - [ ] Hover effects work on header

3. **Content**
   - [ ] Accepted mappings show ✓ icon
   - [ ] Rejected mappings show ⊘ icon and strikethrough
   - [ ] Member counts display correctly
   - [ ] HTML escaping prevents XSS

#### Browser-Specific Checks
- **Chrome**: Check for smooth animations
- **Firefox**: Verify icon rendering
- **Safari**: Check font rendering and spacing
- **Edge**: Verify identical to Chrome behavior

### Step 3 Auto-Completion

#### Functional Tests
1. **Completion Logic**
   - [ ] Step 3 marks complete after first mapping review
   - [ ] Works for both accept and reject actions
   - [ ] Handles empty mappings gracefully
   - [ ] Updates onboarding indicator immediately

2. **Notifications**
   - [ ] Success toast appears on completion
   - [ ] Toast message is correct
   - [ ] Toast auto-dismisses after timeout

3. **State Management**
   - [ ] Completion state persists in localStorage
   - [ ] State syncs across tabs (if applicable)
   - [ ] Onboarding indicator reflects current state

#### Browser-Specific Checks
- **Chrome**: Check localStorage persistence
- **Firefox**: Verify toast positioning
- **Safari**: Check notification timing
- **Edge**: Verify identical to Chrome behavior

---

## Responsive Testing

### Mobile Browsers
Test on mobile versions of browsers if possible:

#### iOS Safari
- [ ] Layouts adapt to mobile viewport
- [ ] Touch interactions work correctly
- [ ] Fonts are readable at mobile sizes
- [ ] No horizontal scrolling

#### Chrome Mobile (Android)
- [ ] Layouts adapt to mobile viewport
- [ ] Touch interactions work correctly
- [ ] Fonts are readable at mobile sizes
- [ ] No horizontal scrolling

### Responsive Breakpoints
Test at these viewport widths:
- **Desktop**: 1920px, 1440px, 1280px
- **Tablet**: 1024px, 768px
- **Mobile**: 414px, 375px, 320px

---

## Performance Testing

### Metrics to Check
1. **Page Load Time**
   - [ ] Initial load < 2 seconds
   - [ ] CSS loads without blocking

2. **Rendering Performance**
   - [ ] No layout shifts (CLS < 0.1)
   - [ ] Smooth animations (60fps)
   - [ ] No janky scrolling

3. **Memory Usage**
   - [ ] No memory leaks after interactions
   - [ ] LocalStorage usage is reasonable

### Browser DevTools
Use browser-specific performance tools:
- **Chrome**: Lighthouse, Performance tab
- **Firefox**: Performance tab
- **Safari**: Timelines tab
- **Edge**: Performance tab

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Escape closes modals
- [ ] Focus indicators are visible

### Screen Reader Testing
- [ ] VoiceOver (Safari/macOS)
- [ ] NVDA (Firefox/Windows)
- [ ] JAWS (Chrome/Windows)

### ARIA Attributes
- [ ] `role` attributes are correct
- [ ] `aria-label` provides context
- [ ] `aria-expanded` reflects state
- [ ] `aria-controls` links elements

---

## Common Issues and Solutions

### Issue: CSS Variables Not Working
**Browsers Affected**: Safari < 14, Edge < 79
**Solution**: Ensure minimum browser version requirements are met

### Issue: Fetch API CORS Errors
**Browsers Affected**: Safari (strict CORS)
**Solution**: Verify CORS headers on backend

### Issue: LocalStorage Not Persisting
**Browsers Affected**: Safari (Private Browsing)
**Solution**: Add error handling for localStorage failures

### Issue: Animations Janky
**Browsers Affected**: Firefox (sometimes)
**Solution**: Use `will-change` CSS property for animated elements

### Issue: Font Rendering Differences
**Browsers Affected**: All browsers
**Solution**: Use system fonts or web fonts with proper fallbacks

---

## Testing Checklist Summary

### Pre-Testing
- [ ] Start development server (`npm run dev`)
- [ ] Ensure database is running
- [ ] Clear browser cache and localStorage
- [ ] Open browser DevTools

### During Testing
- [ ] Check Console for errors
- [ ] Verify Network tab for failed requests
- [ ] Monitor Performance tab for issues
- [ ] Test keyboard navigation
- [ ] Test with different viewport sizes

### Post-Testing
- [ ] Document any browser-specific issues
- [ ] Create bug reports for failures
- [ ] Update browser compatibility matrix
- [ ] Share findings with team

---

## Browser Compatibility Matrix

| Feature | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ |
|---------|------------|-------------|------------|----------|
| CSS Variables | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Flexbox | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |
| LocalStorage | ✅ | ✅ | ✅ | ✅ |
| ES6+ | ✅ | ✅ | ✅ | ✅ |
| Reviewed Groups | ✅ | ✅ | ✅ | ✅ |
| Step 3 Auto-Complete | ✅ | ✅ | ✅ | ✅ |

**Legend**:
- ✅ Fully Supported
- ⚠️ Partially Supported (with workarounds)
- ❌ Not Supported

---

## Automated Testing

### Running Automated Tests
```bash
# Run unit tests
npm test

# Run tests in specific browser
npm test -- --browser=chrome
npm test -- --browser=firefox
npm test -- --browser=safari
npm test -- --browser=edge

# Run tests with coverage
npm run test:coverage
```

### CI/CD Integration
Tests should run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

---

## Reporting Issues

### Issue Template
```markdown
**Browser**: Chrome 95
**OS**: macOS 12.0
**Feature**: Reviewed Groups Section
**Issue**: Collapse animation is janky
**Steps to Reproduce**:
1. Navigate to Groups page
2. Click collapse toggle
3. Observe animation

**Expected**: Smooth 300ms transition
**Actual**: Janky, stuttering animation

**Screenshots**: [attach screenshots]
**Console Errors**: [paste console errors]
```

---

## Resources

### Browser Documentation
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [Safari Web Inspector](https://developer.apple.com/safari/tools/)
- [Edge DevTools](https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/)

### Compatibility Checking
- [Can I Use](https://caniuse.com/)
- [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/API)
- [BrowserStack](https://www.browserstack.com/) (for testing on real devices)

### Testing Tools
- [Playwright](https://playwright.dev/) - Cross-browser automation
- [Selenium](https://www.selenium.dev/) - Browser automation
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [LambdaTest](https://www.lambdatest.com/) - Cross-browser testing

---

## Conclusion

Browser compatibility testing ensures that all users have a consistent, high-quality experience regardless of their browser choice. Follow this guide to systematically test all features across supported browsers and document any issues for resolution.

**Next Steps**:
1. Run automated compatibility test page
2. Manually test in each browser
3. Document any issues found
4. Create bug reports for failures
5. Update compatibility matrix
6. Mark task 16.10 as complete

