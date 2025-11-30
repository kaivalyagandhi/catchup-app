# Contact Onboarding Troubleshooting Guide

## Overview

This guide helps you resolve common issues with the Contact Onboarding feature. If you don't find your issue here, please contact support at support@catchup.app.

## Table of Contents

1. [Onboarding Won't Start](#onboarding-wont-start)
2. [Progress Not Saving](#progress-not-saving)
3. [Drag-and-Drop Issues](#drag-and-drop-issues)
4. [AI Suggestions Not Working](#ai-suggestions-not-working)
5. [Circular Visualization Problems](#circular-visualization-problems)
6. [Import Issues](#import-issues)
7. [Performance Issues](#performance-issues)
8. [Mobile-Specific Issues](#mobile-specific-issues)
9. [Data Sync Problems](#data-sync-problems)
10. [Error Messages](#error-messages)

---

## Onboarding Won't Start

### Symptom
Clicking "Begin Onboarding" or "Manage" button does nothing, or shows an error.

### Possible Causes & Solutions

#### 1. Authentication Issue

**Symptoms:**
- "Unauthorized" error message
- Redirected to login page
- Button click has no effect

**Solution:**
```
1. Check if you're logged in (look for your profile in the top right)
2. If not logged in, log in again
3. Try refreshing the page (Ctrl+R or Cmd+R)
4. Clear browser cache and cookies
5. Log out and log back in
```

#### 2. Existing Onboarding Session

**Symptoms:**
- Error: "Onboarding already in progress"
- Can't start new session

**Solution:**
```
1. Go to Contacts page
2. Click "Manage" to resume existing session
3. Or complete/exit the current session first
4. Then start a new session if needed
```

#### 3. Browser Compatibility

**Symptoms:**
- Button doesn't respond
- Page doesn't load correctly
- Visual glitches

**Solution:**
```
1. Update your browser to the latest version
2. Try a different browser (Chrome, Firefox, Safari, Edge)
3. Disable browser extensions temporarily
4. Check browser console for errors (F12 > Console tab)
```

#### 4. Network Connection

**Symptoms:**
- Long loading times
- Timeout errors
- "Network error" message

**Solution:**
```
1. Check your internet connection
2. Try refreshing the page
3. Check if catchup.app is accessible
4. Try again in a few minutes
5. Contact your network administrator if on corporate network
```

---

## Progress Not Saving

### Symptom
Changes to circle assignments or preferences aren't persisting after refresh or exit.

### Possible Causes & Solutions

#### 1. Auto-Save Failure

**Symptoms:**
- Changes disappear after refresh
- "Save failed" notification
- No confirmation after changes

**Solution:**
```
1. Check your internet connection
2. Look for save indicators (checkmark or spinner)
3. Wait a few seconds after making changes before exiting
4. Try making changes one at a time
5. Manually click "Save Progress" if available
```

#### 2. Browser Storage Issues

**Symptoms:**
- Progress lost after closing browser
- "Storage quota exceeded" error
- Inconsistent saving

**Solution:**
```
1. Clear browser cache and cookies
2. Check browser storage settings
3. Ensure cookies are enabled
4. Try incognito/private mode
5. Free up browser storage space
```

#### 3. Session Timeout

**Symptoms:**
- Logged out unexpectedly
- "Session expired" message
- Changes not saved after long idle time

**Solution:**
```
1. Log back in
2. Resume onboarding from last saved state
3. Make changes more frequently to keep session active
4. Enable "Remember me" when logging in
```

#### 4. Concurrent Sessions

**Symptoms:**
- Changes from one device don't appear on another
- Conflicting updates
- Unexpected state changes

**Solution:**
```
1. Complete onboarding on one device at a time
2. Refresh the page on other devices
3. Wait a few seconds for sync to complete
4. Check which device has the most recent changes
5. Use that device to complete onboarding
```

---

## Drag-and-Drop Issues

### Symptom
Can't drag contacts between circles, or drag operation doesn't work correctly.

### Possible Causes & Solutions

#### 1. Touch vs. Mouse Issues

**Symptoms:**
- Drag doesn't start
- Contact "sticks" to cursor
- Drop doesn't register

**Solution:**

**On Desktop:**
```
1. Click and hold for 1 second before dragging
2. Ensure mouse button stays pressed while dragging
3. Release mouse button over target circle
4. Try using a different mouse
5. Check mouse settings in OS
```

**On Mobile:**
```
1. Long-press contact for 1 second
2. Drag slowly to target circle
3. Lift finger to drop
4. Ensure touch screen is clean
5. Try with a stylus if available
```

#### 2. Browser Compatibility

**Symptoms:**
- Drag works inconsistently
- Visual feedback missing
- Drop zones don't highlight

**Solution:**
```
1. Update browser to latest version
2. Try Chrome or Firefox (best compatibility)
3. Disable browser extensions
4. Check for JavaScript errors (F12 > Console)
5. Try on a different device
```

#### 3. Performance Issues

**Symptoms:**
- Lag during drag
- Choppy animation
- Delayed response

**Solution:**
```
1. Close other browser tabs
2. Close other applications
3. Restart browser
4. Clear browser cache
5. Try with fewer contacts visible (use filters)
```

#### 4. Accidental Cancellation

**Symptoms:**
- Drag cancels unexpectedly
- Contact returns to original position
- No drop confirmation

**Solution:**
```
1. Ensure you're dropping inside a circle (not outside)
2. Wait for circle to highlight before dropping
3. Don't press Escape key during drag
4. Keep cursor/finger inside browser window
5. Drag more slowly and deliberately
```

---

## AI Suggestions Not Working

### Symptom
AI suggestions aren't appearing, or show low confidence for all contacts.

### Possible Causes & Solutions

#### 1. Insufficient Data

**Symptoms:**
- All suggestions show low confidence
- "Not enough data" message
- Generic suggestions

**Solution:**
```
1. This is normal for new accounts
2. AI needs interaction history to make good suggestions
3. Manually assign some contacts first
4. AI will improve as you use CatchUp
5. Import contacts from Google to provide more data
```

#### 2. AI Service Unavailable

**Symptoms:**
- "AI service unavailable" error
- No suggestions appear
- Timeout errors

**Solution:**
```
1. Refresh the page
2. Try again in a few minutes
3. Use manual assignment temporarily
4. Check CatchUp status page
5. Contact support if persists
```

#### 3. Privacy Settings

**Symptoms:**
- AI suggestions disabled
- "AI analysis disabled" message

**Solution:**
```
1. Go to Settings > Privacy
2. Check "Enable AI Suggestions" setting
3. Review and accept AI analysis terms
4. Save settings
5. Restart onboarding
```

#### 4. Network Issues

**Symptoms:**
- Suggestions load slowly
- Timeout errors
- Partial suggestions

**Solution:**
```
1. Check internet connection
2. Try on a different network
3. Disable VPN temporarily
4. Check firewall settings
5. Try again later
```

---

## Circular Visualization Problems

### Symptom
The circular visualization doesn't display correctly or has visual glitches.

### Possible Causes & Solutions

#### 1. Rendering Issues

**Symptoms:**
- Circles don't appear
- Contacts overlap
- Distorted layout
- Missing elements

**Solution:**
```
1. Refresh the page (Ctrl+R or Cmd+R)
2. Clear browser cache
3. Try a different browser
4. Update graphics drivers
5. Disable hardware acceleration in browser
```

#### 2. Screen Size Issues

**Symptoms:**
- Visualization too small/large
- Cut off at edges
- Doesn't fit screen

**Solution:**
```
1. Adjust browser zoom (Ctrl+0 or Cmd+0 to reset)
2. Maximize browser window
3. Try full-screen mode (F11)
4. Rotate device (mobile)
5. Use landscape orientation (mobile)
```

#### 3. Too Many Contacts

**Symptoms:**
- Slow rendering
- Contacts too small to read
- Overlapping dots
- Performance lag

**Solution:**
```
1. Use group filters to show fewer contacts
2. Use search to find specific contacts
3. Organize in smaller batches
4. Use list view instead of circular view
5. Upgrade device if very old
```

#### 4. Color/Contrast Issues

**Symptoms:**
- Can't distinguish circles
- Colors look wrong
- Hard to read text

**Solution:**
```
1. Check display color settings
2. Adjust brightness/contrast
3. Enable high contrast mode in Settings
4. Try dark mode or light mode
5. Check for color blindness accessibility options
```

---

## Import Issues

### Symptom
Can't import contacts from Google or other sources.

### Possible Causes & Solutions

#### 1. Google Contacts Connection Failed

**Symptoms:**
- "Authorization failed" error
- Redirect loop
- "Access denied" message

**Solution:**
```
1. Ensure you're logged into correct Google account
2. Grant all requested permissions
3. Check Google account security settings
4. Disable 2FA temporarily (re-enable after)
5. Try disconnecting and reconnecting
```

#### 2. Import Timeout

**Symptoms:**
- Import starts but never completes
- "Timeout" error
- Stuck on loading screen

**Solution:**
```
1. Check internet connection
2. Try importing smaller batches
3. Wait longer (large imports take time)
4. Refresh and try again
5. Contact support with account details
```

#### 3. Duplicate Contacts

**Symptoms:**
- Same contact appears multiple times
- Conflicting contact information
- Merge suggestions

**Solution:**
```
1. Use "Merge Duplicates" feature
2. Manually remove duplicates
3. Clean up Google Contacts before import
4. Use contact deduplication tools
5. Archive unwanted duplicates
```

#### 4. Missing Contacts

**Symptoms:**
- Not all contacts imported
- Some contacts missing
- Partial import

**Solution:**
```
1. Check Google Contacts to verify they exist
2. Ensure contacts have names (unnamed contacts skipped)
3. Try manual import for missing contacts
4. Check import filters/settings
5. Re-import if needed
```

---

## Performance Issues

### Symptom
Onboarding is slow, laggy, or unresponsive.

### Possible Causes & Solutions

#### 1. Large Contact List

**Symptoms:**
- Slow loading
- Laggy interactions
- Browser freezes
- High CPU usage

**Solution:**
```
1. Use filters to show fewer contacts at once
2. Organize in batches (use Weekly Catchup)
3. Close other browser tabs
4. Restart browser
5. Use a more powerful device
```

#### 2. Browser Performance

**Symptoms:**
- Slow across all features
- High memory usage
- Browser warnings

**Solution:**
```
1. Close unnecessary tabs
2. Clear browser cache and cookies
3. Disable unused extensions
4. Update browser to latest version
5. Restart browser
6. Restart computer
```

#### 3. Network Latency

**Symptoms:**
- Slow API responses
- Delayed saves
- Timeout errors

**Solution:**
```
1. Check internet speed (speedtest.net)
2. Move closer to WiFi router
3. Use wired connection if possible
4. Disable VPN temporarily
5. Try at different time of day
```

#### 4. Device Limitations

**Symptoms:**
- Consistent slowness
- Device gets hot
- Battery drains quickly

**Solution:**
```
1. Close other applications
2. Free up device storage
3. Update device OS
4. Use desktop instead of mobile
5. Consider device upgrade
```

---

## Mobile-Specific Issues

### Symptom
Problems specific to mobile devices (phones/tablets).

### Possible Causes & Solutions

#### 1. Touch Gestures Not Working

**Symptoms:**
- Taps don't register
- Drag doesn't work
- Accidental selections

**Solution:**
```
1. Clean screen
2. Remove screen protector temporarily
3. Use stylus
4. Adjust touch sensitivity in device settings
5. Try landscape orientation
```

#### 2. Layout Issues

**Symptoms:**
- Elements overlap
- Text cut off
- Buttons too small
- Scrolling problems

**Solution:**
```
1. Rotate device to landscape
2. Adjust zoom level
3. Use full-screen mode
4. Update app/browser
5. Try on larger device (tablet)
```

#### 3. Keyboard Issues

**Symptoms:**
- Keyboard covers content
- Autocomplete doesn't work
- Can't type in fields

**Solution:**
```
1. Tap outside keyboard to dismiss
2. Scroll to see hidden content
3. Use autocomplete suggestions
4. Try external keyboard
5. Update keyboard app
```

#### 4. Orientation Changes

**Symptoms:**
- Layout breaks on rotation
- Progress lost
- Visual glitches

**Solution:**
```
1. Complete current action before rotating
2. Wait for layout to stabilize
3. Refresh if layout broken
4. Lock orientation in device settings
5. Use portrait mode only
```

---

## Data Sync Problems

### Symptom
Data doesn't sync between devices or sessions.

### Possible Causes & Solutions

#### 1. Sync Delay

**Symptoms:**
- Changes appear slowly on other devices
- Inconsistent state
- Old data showing

**Solution:**
```
1. Wait 30-60 seconds for sync
2. Manually refresh page
3. Check internet connection
4. Ensure logged into same account
5. Force sync in Settings
```

#### 2. Offline Changes

**Symptoms:**
- Changes made offline don't sync
- Conflicts when back online
- Data loss

**Solution:**
```
1. Ensure online when making changes
2. Wait for "Synced" indicator
3. Resolve conflicts manually
4. Use device with best connection
5. Avoid offline editing
```

#### 3. Account Issues

**Symptoms:**
- Different data on different devices
- Logged into wrong account
- Missing data

**Solution:**
```
1. Verify account email on each device
2. Log out and log back in
3. Check account settings
4. Ensure using same account everywhere
5. Contact support if data missing
```

---

## Error Messages

### Common Error Messages and Solutions

#### "Unauthorized" or "Authentication Failed"

**Meaning:** Your session has expired or authentication is invalid.

**Solution:**
```
1. Log out and log back in
2. Clear browser cookies
3. Check if account is active
4. Reset password if needed
5. Contact support if persists
```

#### "Network Error" or "Request Failed"

**Meaning:** Can't connect to CatchUp servers.

**Solution:**
```
1. Check internet connection
2. Try different network
3. Disable VPN/proxy
4. Check firewall settings
5. Try again later
```

#### "Invalid Circle" or "Invalid Assignment"

**Meaning:** Trying to assign contact to invalid circle.

**Solution:**
```
1. Use only valid circles: inner, close, active, casual, acquaintance
2. Refresh page to reset state
3. Try manual assignment
4. Contact support with details
```

#### "Batch Operation Failed"

**Meaning:** Batch assignment couldn't complete.

**Solution:**
```
1. Try smaller batches
2. Assign contacts individually
3. Check for invalid contacts
4. Refresh and try again
5. Contact support with error details
```

#### "AI Service Unavailable"

**Meaning:** AI suggestion service is down or unreachable.

**Solution:**
```
1. Use manual assignment temporarily
2. Try again in 5-10 minutes
3. Check CatchUp status page
4. Contact support if persists
```

#### "Storage Quota Exceeded"

**Meaning:** Browser storage is full.

**Solution:**
```
1. Clear browser cache and cookies
2. Free up browser storage
3. Close other tabs
4. Try incognito mode
5. Use different browser
```

#### "Session Expired"

**Meaning:** You've been logged out due to inactivity.

**Solution:**
```
1. Log back in
2. Resume from last saved state
3. Enable "Remember me"
4. Adjust session timeout in Settings
```

#### "Contact Not Found"

**Meaning:** Trying to access a contact that doesn't exist.

**Solution:**
```
1. Refresh contact list
2. Check if contact was deleted
3. Try searching by name
4. Re-import if needed
5. Contact support if data lost
```

---

## Advanced Troubleshooting

### Checking Browser Console

For technical users, the browser console can provide helpful error information:

```
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Console" tab
3. Look for red error messages
4. Take screenshot of errors
5. Send to support@catchup.app
```

### Clearing All Data

If all else fails, try a complete reset:

```
⚠️ WARNING: This will clear all local data

1. Go to Settings > Advanced
2. Click "Clear All Local Data"
3. Confirm the action
4. Log out
5. Clear browser cache and cookies
6. Restart browser
7. Log back in
8. Start fresh
```

### Network Diagnostics

To check if network is the issue:

```
1. Open browser console (F12)
2. Go to "Network" tab
3. Refresh page
4. Look for failed requests (red)
5. Check response codes (should be 200)
6. Take screenshot
7. Send to support
```

---

## Getting Additional Help

### Before Contacting Support

Please gather this information:

- **Browser and version** (e.g., Chrome 120)
- **Operating system** (e.g., Windows 11, macOS 14, iOS 17)
- **Device type** (e.g., Desktop, iPhone 15, Samsung Galaxy)
- **Error messages** (exact text or screenshots)
- **Steps to reproduce** (what you did before the error)
- **Account email** (for verification)

### Contact Methods

- **Email:** support@catchup.app
- **Live Chat:** Available in app (bottom right)
- **Community Forum:** community.catchup.app
- **Status Page:** status.catchup.app

### Response Times

- **Critical issues:** 2-4 hours
- **High priority:** 24 hours
- **Normal priority:** 48 hours
- **Low priority:** 72 hours

---

## Known Issues

### Current Known Issues

Check our status page for current known issues: status.catchup.app

### Planned Fixes

- Improved drag-and-drop on older mobile devices
- Better handling of very large contact lists (1000+)
- Enhanced offline support
- Faster AI suggestion generation

---

## Feedback

Found a bug or have a suggestion? We'd love to hear from you!

- **Bug Reports:** bugs@catchup.app
- **Feature Requests:** feedback@catchup.app
- **General Feedback:** hello@catchup.app

---

*Last updated: November 2025*
*Version: 1.0*
