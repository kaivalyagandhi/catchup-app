# Onboarding Integration Testing Guide

## Overview

This guide provides step-by-step instructions for testing the enhanced onboarding integration with contextual education tips and OnboardingController state management.

## Prerequisites

- Development server running (`npm run dev`)
- User account with imported contacts
- Browser with developer tools open

## Test Scenarios

### 1. Education Modal System

#### Test 1.1: Circles Education Modal

**Steps:**
1. Navigate to onboarding Step 2 (Circles)
2. Click "Learn more about circles" link in the education tip
3. Verify modal opens with comprehensive content
4. Check that all circle types are displayed (Inner, Close, Active, Casual)
5. Verify circle badges have correct colors
6. Click "Got it!" button
7. Verify modal closes smoothly

**Expected Results:**
- Modal displays with fade-in animation
- All circle information is readable and well-formatted
- Colors match circle definitions
- Close button and "Got it!" button both work
- Modal closes with fade-out animation

#### Test 1.2: Batching Education Modal

**Steps:**
1. Complete Quick Start flow (or skip)
2. Reach Batch Suggestions step
3. Click "Learn more" link in batching education tip
4. Verify modal content explains smart batching
5. Check feature icons display correctly
6. Close modal using X button

**Expected Results:**
- Modal shows batching explanation
- Feature icons (family, work, interests, calendar) display
- Tips section is visible
- X button closes modal

#### Test 1.3: Refine Education Modal

**Steps:**
1. Complete or skip to Quick Refine step
2. Click "Learn more" link in refine education tip
3. Verify swipe gesture instructions
4. Check keyboard shortcut information
5. Close modal by clicking overlay

**Expected Results:**
- Modal shows refine tips
- Gesture and keyboard instructions clear
- Clicking outside modal closes it

### 2. Progress Tracking Integration

#### Test 2.1: OnboardingController State Updates

**Steps:**
1. Open browser console
2. Start onboarding flow
3. Assign a contact to a circle
4. Check console for state updates
5. Verify `window.onboardingController.getProgress()` shows updated counts

**Expected Results:**
```javascript
// In console:
window.onboardingController.getProgress()
// Should return:
{
  totalContacts: 100,
  categorizedContacts: 1,
  percentComplete: 1,
  currentMilestone: "First contacts categorized",
  nextMilestone: "Categorize 5 contacts",
  completedSteps: 0,
  totalSteps: 6
}
```

#### Test 2.2: Progress Persistence

**Steps:**
1. Assign 5 contacts to circles
2. Close the flow (X button)
3. Refresh the page
4. Reopen the flow
5. Verify progress is maintained

**Expected Results:**
- Progress saved to localStorage
- Progress saved to backend
- Reopening shows same progress
- Categorized contacts remain assigned

#### Test 2.3: Milestone Celebrations

**Steps:**
1. Categorize contacts to reach milestones:
   - 25% completion
   - 50% completion
   - 75% completion
   - 100% completion
2. Verify toast messages appear at each milestone

**Expected Results:**
- Toast at 25%: "🎉 Great start! You're 25% done organizing your circles."
- Toast at 50%: "🌟 Halfway there! Keep going!"
- Toast at 75%: "✨ Almost done! Just a bit more!"
- Toast at 100%: "🎊 Congratulations! All contacts categorized!"
- Completion modal displays

### 3. Capacity Warnings

#### Test 3.1: Circle Capacity Warning

**Steps:**
1. Assign contacts to Inner Circle until 80% capacity (4 of 5)
2. Assign one more contact
3. Verify warning appears

**Expected Results:**
- Warning toast displays when reaching 80% capacity
- Message explains Dunbar's research
- Suggests rebalancing if needed
- Warning only shows once per circle

#### Test 3.2: Over-Capacity Warning

**Steps:**
1. Assign more than recommended contacts to a circle
2. Verify over-capacity warning displays
3. Check that warning persists until rebalanced

**Expected Results:**
- Warning shows when exceeding capacity
- Educational message about relationship maintenance
- Warning clears when contacts moved

### 4. Mobile Responsiveness

#### Test 4.1: Education Modals on Mobile

**Steps:**
1. Open in mobile viewport (375px width)
2. Trigger education modal
3. Verify layout adapts
4. Check scrolling works
5. Test close buttons

**Expected Results:**
- Modal fills screen appropriately
- Content is readable
- Buttons are touch-friendly (44x44px minimum)
- Scrolling smooth
- No horizontal overflow

#### Test 4.2: Education Tips on Mobile

**Steps:**
1. View education tips in mobile viewport
2. Verify text wraps correctly
3. Check icon sizes
4. Test "Learn more" links

**Expected Results:**
- Tips display in single column
- Text is readable
- Icons appropriately sized
- Links are tappable

### 5. Integration with OnboardingController

#### Test 5.1: Step Completion

**Steps:**
1. Complete Quick Start flow
2. Check `window.onboardingController.getState()`
3. Verify step marked as complete
4. Move to next step
5. Check state updates

**Expected Results:**
```javascript
// In console:
window.onboardingController.getState()
// Should show:
{
  currentStep: "circle_assignment",
  completedSteps: ["import_contacts"],
  progressData: {
    totalCount: 100,
    categorizedCount: 10
  }
}
```

#### Test 5.2: Backend Persistence

**Steps:**
1. Assign contacts
2. Check Network tab for API calls
3. Verify PUT /api/onboarding/progress called
4. Check request payload
5. Verify response updates state

**Expected Results:**
- API call made after assignments
- Payload includes progress data
- Response confirms save
- State updated with server data

### 6. Error Handling

#### Test 6.1: OnboardingController Unavailable

**Steps:**
1. In console: `window.onboardingController = null`
2. Assign contacts
3. Verify flow continues without errors
4. Check console for graceful fallback messages

**Expected Results:**
- No JavaScript errors
- Flow continues normally
- Console shows fallback messages
- Legacy state system used

#### Test 6.2: Network Errors

**Steps:**
1. Disconnect network
2. Assign contacts
3. Verify error handling
4. Reconnect network
5. Check if progress syncs

**Expected Results:**
- Error toast displays
- Progress saved locally
- Retry mechanism works
- Syncs when reconnected

## Browser Compatibility Testing

### Desktop Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | Latest  | ✅ Test |
| Firefox | Latest  | ✅ Test |
| Safari  | Latest  | ✅ Test |
| Edge    | Latest  | ✅ Test |

### Mobile Browsers

| Browser | Device | Status |
|---------|--------|--------|
| Safari  | iPhone | ✅ Test |
| Chrome  | Android| ✅ Test |

## Performance Testing

### Load Time
- Education modal should open in < 100ms
- No layout shift when modal opens
- Smooth animations (60fps)

### Memory Usage
- Monitor memory in DevTools
- No memory leaks after multiple modal opens/closes
- Garbage collection working properly

## Accessibility Testing

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Focus visible on all elements

### Screen Reader Testing
- Test with VoiceOver (Mac) or NVDA (Windows)
- Verify modal announcements
- Check button labels
- Verify heading hierarchy

## Regression Testing

### Existing Functionality
- Quick Start Flow still works
- Batch Suggestions still works
- Quick Refine still works
- Progress tracking accurate
- Undo functionality works

## Test Checklist

- [ ] All education modals display correctly
- [ ] Progress tracking updates in real-time
- [ ] OnboardingController integration works
- [ ] Capacity warnings display appropriately
- [ ] Mobile responsive design works
- [ ] Keyboard navigation functional
- [ ] No console errors
- [ ] Backend persistence working
- [ ] Error handling graceful
- [ ] Performance acceptable
- [ ] Accessibility compliant

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Device (if mobile)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Screenshots/video

## Related Documentation

- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `.kiro/specs/tier-1-foundation/requirements.md` - Requirements
- `.kiro/specs/tier-1-foundation/tasks.md` - Task details

---

**Last Updated:** January 28, 2026
**Status:** Ready for Testing
