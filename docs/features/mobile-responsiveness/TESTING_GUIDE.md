# Mobile Responsiveness Testing Guide

## Quick Start

This guide helps you test the mobile responsiveness enhancements for the Tier 1 Foundation features.

## Testing Tools

### Browser DevTools
1. **Chrome DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Click the device toolbar icon or press `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows)
   - Select device presets or set custom dimensions

2. **Firefox DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Click the responsive design mode icon or press `Cmd+Option+M` (Mac) / `Ctrl+Shift+M` (Windows)

3. **Safari DevTools** (Mac only):
   - Enable Developer menu: Safari > Preferences > Advanced > Show Develop menu
   - Develop > Enter Responsive Design Mode

### Device Presets to Test

#### Essential Devices
- **iPhone SE** (375x667) - Smallest modern iPhone
- **iPhone 12/13/14** (390x844) - Current standard iPhone
- **Samsung Galaxy S21** (360x800) - Common Android size
- **iPad Mini** (768x1024) - Tablet size
- **Custom 320px** (320x568) - Minimum requirement

#### Additional Devices (Optional)
- iPhone 14 Pro Max (430x932)
- Samsung Galaxy S20 Ultra (412x915)
- iPad Pro (1024x1366)

## Testing Procedures

### 1. Quick Start Flow Testing

#### Setup
1. Start the development server: `npm run dev`
2. Navigate to the onboarding flow or Quick Start test page
3. Open DevTools and enable responsive mode

#### Test Cases

**TC1: Minimum Width (320px)**
- [ ] Set viewport to 320x568
- [ ] Verify all content is visible without horizontal scroll
- [ ] Check that buttons are at least 44x44px (use DevTools inspector)
- [ ] Verify text is readable (minimum 14px font size)
- [ ] Test checkbox tap targets (should be easy to tap)

**TC2: iPhone SE (375x667)**
- [ ] Set viewport to iPhone SE preset
- [ ] Verify layout looks good in portrait
- [ ] Rotate to landscape (667x375)
- [ ] Check that content adapts properly
- [ ] Test all interactive elements

**TC3: Standard Mobile (390x844)**
- [ ] Set viewport to iPhone 12 preset
- [ ] Verify suggestions display correctly
- [ ] Test "Accept All" button
- [ ] Test "Review Individually" mode
- [ ] Check checkbox interactions
- [ ] Verify mini visualizer displays

**TC4: Tablet (768x1024)**
- [ ] Set viewport to iPad Mini preset
- [ ] Verify layout uses available space
- [ ] Check that buttons are appropriately sized
- [ ] Test in portrait and landscape

#### Expected Results
- ✅ No horizontal scrolling at any width >= 320px
- ✅ All buttons are easily tappable (44x44px minimum)
- ✅ Text is readable without zooming
- ✅ Checkboxes have adequate tap targets
- ✅ Layout adapts smoothly between breakpoints

### 2. Batch Suggestions Testing

#### Setup
1. Navigate to the batch suggestions step in onboarding
2. Open DevTools responsive mode

#### Test Cases

**TC1: Card Expansion (Mobile)**
- [ ] Set viewport to 375x667
- [ ] Tap the expand button on a batch card
- [ ] Verify the card expands smoothly
- [ ] Check that contact list is scrollable
- [ ] Verify checkboxes are easy to tap
- [ ] Test "Accept Batch" button

**TC2: Contact Selection (320px)**
- [ ] Set viewport to 320x568
- [ ] Expand a batch card
- [ ] Try selecting individual contacts
- [ ] Verify checkbox tap targets work
- [ ] Check that selected state is visible
- [ ] Test "Accept Batch" with selections

**TC3: Multiple Batches (Mobile)**
- [ ] Set viewport to 390x844
- [ ] Scroll through multiple batch cards
- [ ] Verify cards stack properly
- [ ] Test expanding multiple cards
- [ ] Check action buttons on each card

**TC4: Landscape Mode**
- [ ] Set viewport to 667x375 (landscape)
- [ ] Verify cards display properly
- [ ] Check that contact list height is appropriate
- [ ] Test all interactions

#### Expected Results
- ✅ Expand button is 44x44px minimum
- ✅ Checkboxes have 44x44px tap area
- ✅ Action buttons are full-width on mobile
- ✅ Contact list scrolls smoothly
- ✅ Cards are readable at all sizes

### 3. Quick Refine Testing

#### Setup
1. Navigate to the Quick Refine step
2. Open DevTools responsive mode
3. Enable touch simulation in DevTools

#### Test Cases

**TC1: Swipe Gestures (Mobile)**
- [ ] Set viewport to 375x667
- [ ] Enable touch simulation in DevTools
- [ ] Swipe left on the contact card
- [ ] Verify visual feedback appears
- [ ] Swipe right on the contact card
- [ ] Check that swipe assigns to correct circle
- [ ] Test swipe threshold (must swipe far enough)

**TC2: Button Interactions (320px)**
- [ ] Set viewport to 320x568
- [ ] Verify all 4 circle buttons are visible
- [ ] Check that buttons are at least 44x44px
- [ ] Tap each circle button
- [ ] Verify contact advances to next
- [ ] Test "Done for Now" button

**TC3: Card Display (Mobile)**
- [ ] Set viewport to 390x844
- [ ] Verify contact card is centered
- [ ] Check avatar size is appropriate
- [ ] Verify text is readable
- [ ] Check swipe hint is visible
- [ ] Test progress bar updates

**TC4: Landscape Mode**
- [ ] Set viewport to 667x375 (landscape)
- [ ] Verify card height is appropriate
- [ ] Check that all content is visible
- [ ] Test swipe gestures in landscape
- [ ] Verify buttons are accessible

#### Expected Results
- ✅ Swipe gestures work smoothly
- ✅ Visual feedback during swipe
- ✅ Circle buttons are 44x44px minimum
- ✅ Card scales appropriately for screen size
- ✅ All content visible without scrolling

### 4. Circular Visualizer Testing

#### Setup
1. Navigate to a page with the circular visualizer
2. Open DevTools responsive mode

#### Test Cases

**TC1: Scaling (Mobile)**
- [ ] Set viewport to 375x667
- [ ] Verify visualizer scales to 0.85
- [ ] Check that all circles are visible
- [ ] Verify contact dots are tappable
- [ ] Test circle labels are readable

**TC2: Minimum Width (320px)**
- [ ] Set viewport to 320x568
- [ ] Verify visualizer scales to 0.7
- [ ] Check that content is still usable
- [ ] Test touch interactions
- [ ] Verify no horizontal scroll

**TC3: Tablet (768px)**
- [ ] Set viewport to 768x1024
- [ ] Verify visualizer uses appropriate scale
- [ ] Check that layout is optimized
- [ ] Test all interactions

#### Expected Results
- ✅ Visualizer scales appropriately for screen size
- ✅ All elements remain interactive
- ✅ Touch targets are adequate
- ✅ No content is cut off

## Real Device Testing

### iOS Testing (Recommended)
1. Connect iPhone to Mac
2. Enable Web Inspector on iPhone: Settings > Safari > Advanced > Web Inspector
3. Open Safari on Mac > Develop > [Your iPhone] > [Page]
4. Test all interactions on real device

### Android Testing
1. Enable USB debugging on Android device
2. Connect device to computer
3. Open Chrome DevTools > Remote devices
4. Inspect page on device
5. Test all interactions

### Key Differences to Test on Real Devices
- Touch responsiveness (may feel different than DevTools)
- Swipe gesture smoothness
- Scroll performance
- Visual rendering
- Haptic feedback (if implemented)

## Common Issues and Solutions

### Issue: Buttons too small to tap
**Solution**: Check that `min-height: 44px` and `min-width: 44px` are applied

### Issue: Horizontal scrolling appears
**Solution**: Check for fixed-width elements, use `max-width: 100%` and `overflow-x: hidden`

### Issue: Text too small to read
**Solution**: Ensure minimum font size is 14px (0.875rem) on mobile

### Issue: Swipe gestures not working
**Solution**: Check that touch event listeners are attached and `touch-action` is set correctly

### Issue: Layout breaks at specific width
**Solution**: Test at that exact width in DevTools, check media query breakpoints

## Performance Testing

### Metrics to Check
- [ ] Page load time < 3 seconds on 3G
- [ ] Smooth scrolling (60fps)
- [ ] Swipe gestures respond immediately
- [ ] No layout shifts during load
- [ ] Touch interactions feel responsive

### Tools
- Chrome DevTools > Performance tab
- Lighthouse mobile audit
- Network throttling (Fast 3G)

## Accessibility Testing

### Screen Reader Testing
- [ ] Enable VoiceOver (iOS) or TalkBack (Android)
- [ ] Navigate through Quick Start flow
- [ ] Verify all buttons are announced
- [ ] Check that swipe gestures have alternatives

### Keyboard Navigation
- [ ] Connect Bluetooth keyboard to device
- [ ] Test tab navigation
- [ ] Verify focus indicators are visible
- [ ] Check that all actions are keyboard-accessible

## Reporting Issues

When reporting mobile responsiveness issues, include:
1. Device/viewport size
2. Browser and version
3. Screenshot or screen recording
4. Steps to reproduce
5. Expected vs actual behavior

## Quick Test Script

Run this quick test to verify basic mobile responsiveness:

```bash
# 1. Start dev server
npm run dev

# 2. Open in browser
open http://localhost:3000

# 3. Open DevTools (F12)
# 4. Enable responsive mode (Cmd+Shift+M / Ctrl+Shift+M)
# 5. Test these viewports in order:
#    - 320x568 (minimum)
#    - 375x667 (iPhone SE)
#    - 390x844 (iPhone 12)
#    - 768x1024 (iPad Mini)
# 6. For each viewport:
#    - Navigate through onboarding
#    - Test Quick Start flow
#    - Test Batch Suggestions
#    - Test Quick Refine
#    - Verify circular visualizer
```

## Success Criteria

All tests pass when:
- ✅ No horizontal scrolling at any width >= 320px
- ✅ All interactive elements are 44x44px minimum
- ✅ Text is readable without zooming
- ✅ Swipe gestures work smoothly on touch devices
- ✅ Layout adapts appropriately at all breakpoints
- ✅ Performance is acceptable on mobile devices
- ✅ Accessibility standards are met

## Next Steps

After testing:
1. Document any issues found
2. Create bug reports for critical issues
3. Prioritize fixes based on severity
4. Retest after fixes are applied
5. Conduct user acceptance testing with real users

## Related Documentation

- **Implementation Summary**: `docs/features/mobile-responsiveness/IMPLEMENTATION_SUMMARY.md`
- **Requirements**: `.kiro/specs/tier-1-foundation/requirements.md`
- **Testing Standards**: `.kiro/steering/testing-guide.md`
