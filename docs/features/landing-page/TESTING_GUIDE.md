# Landing Page Testing Guide

## Quick Start

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the test guide**:
   ```
   http://localhost:3000/tests/html/landing-page.test.html
   ```

3. **View the landing page**:
   ```
   http://localhost:3000/
   ```

## Testing Scenarios

### Scenario 1: Unauthenticated User (First Visit)

**Setup**:
```javascript
// Clear localStorage
localStorage.clear();

// Or use incognito/private browsing mode
```

**Steps**:
1. Visit `http://localhost:3000/`
2. Verify landing page loads (not dashboard)
3. Check hero section displays correctly
4. Verify "Get Started with Google" button is visible
5. Scroll through features section
6. Check testimonials section
7. Verify final CTA section

**Expected Results**:
- ✅ Landing page loads
- ✅ Hero headline: "Your AI-powered Rolodex that actually remembers to call"
- ✅ Primary CTA: "Get Started with Google"
- ✅ Secondary CTA: "Learn More"
- ✅ 6 feature cards visible
- ✅ 3 testimonials visible
- ✅ Final CTA section visible
- ✅ Footer displays

### Scenario 2: Authenticated User (Returning)

**Setup**:
```javascript
// Ensure you have a valid JWT token
// Log in first, then visit root path
```

**Steps**:
1. Log in to CatchUp
2. Visit `http://localhost:3000/`
3. Verify you're redirected to dashboard

**Expected Results**:
- ✅ Dashboard loads (index.html)
- ✅ NOT landing page
- ✅ User sees their contacts and data

**Alternative Flow** (if client-side detection):
1. Visit landing page while logged in
2. Verify "Go to Dashboard" button shows
3. Click button
4. Verify redirect to dashboard

### Scenario 3: CTA Button Functionality

**Steps**:
1. Visit landing page (unauthenticated)
2. Click "Get Started with Google" button
3. Verify redirect to `/api/auth/google/authorize`
4. Check Google OAuth consent screen appears

**Expected Results**:
- ✅ Redirects to Google OAuth
- ✅ Consent screen shows CatchUp app name
- ✅ Requested permissions displayed
- ✅ After consent, redirects back to CatchUp

### Scenario 4: Learn More Button

**Steps**:
1. Visit landing page
2. Click "Learn More" button
3. Verify smooth scroll to features section

**Expected Results**:
- ✅ Page scrolls smoothly
- ✅ Features section comes into view
- ✅ No page jump or reload

### Scenario 5: Mobile Responsive Design

**Steps**:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test these viewports:
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Desktop (1920x1080)

**Expected Results**:
- ✅ Mobile (320px-767px):
  - Single column layout
  - Stacked CTA buttons
  - Touch-friendly buttons (44x44px)
  - Readable text
- ✅ Tablet (768px-1023px):
  - Two-column feature grid
  - Side-by-side CTA buttons
- ✅ Desktop (1024px+):
  - Three-column feature grid
  - Larger typography
  - Hover effects work

### Scenario 6: Keyboard Navigation

**Steps**:
1. Visit landing page
2. Press Tab key repeatedly
3. Verify focus moves through interactive elements
4. Press Enter on focused CTA button

**Expected Results**:
- ✅ Focus indicator visible on all interactive elements
- ✅ Tab order is logical (top to bottom)
- ✅ All buttons are keyboard accessible
- ✅ Enter key activates buttons
- ✅ Focus outline is clearly visible

### Scenario 7: SEO Meta Tags

**Steps**:
1. Visit landing page
2. View page source (Ctrl+U)
3. Check for meta tags in `<head>`

**Expected Results**:
```html
✅ <title>CatchUp - Your AI-Powered Relationship Manager</title>
✅ <meta name="description" content="Reduce coordination friction...">
✅ <meta property="og:title" content="CatchUp - Your AI-Powered...">
✅ <meta property="og:description" content="Voice-first context capture...">
✅ <meta property="og:image" content="/favicon.svg">
✅ <meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Scenario 8: Browser Console

**Steps**:
1. Visit landing page
2. Open browser console (F12)
3. Check for errors

**Expected Results**:
- ✅ No JavaScript errors
- ✅ No 404 errors in Network tab
- ✅ All resources load successfully
- ✅ Console shows: "Landing Page JavaScript loaded"

### Scenario 9: Performance Testing

**Steps**:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Desktop" or "Mobile"
4. Click "Generate report"

**Expected Results**:
- ✅ Performance: >= 80
- ✅ Accessibility: >= 90
- ✅ Best Practices: >= 90
- ✅ SEO: >= 90

**Command Line**:
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000/ --view
```

### Scenario 10: Cross-Browser Testing

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Android

**Steps**:
1. Open landing page in each browser
2. Verify layout and styling
3. Test CTA buttons
4. Check responsive design

**Expected Results**:
- ✅ Consistent appearance across browsers
- ✅ All features work in all browsers
- ✅ No browser-specific bugs

## Automated Testing

### TypeScript Compilation

```bash
npm run typecheck
```

**Expected**: No errors

### Linting

```bash
npm run lint
```

**Expected**: No errors

### Build Test

```bash
npm run build
```

**Expected**: Successful build

## Common Issues and Solutions

### Issue 1: Landing page not loading

**Symptoms**:
- 404 error
- Blank page
- Dashboard loads instead

**Solutions**:
1. Check server is running: `npm run dev`
2. Verify `public/landing.html` exists
3. Check server logs for errors
4. Clear browser cache
5. Try incognito mode

### Issue 2: Styles not applying

**Symptoms**:
- Unstyled HTML
- Missing colors/layout
- Broken responsive design

**Solutions**:
1. Verify `public/css/landing.css` exists
2. Check Network tab for 404 on CSS file
3. Clear browser cache
4. Hard reload (Ctrl+Shift+R)
5. Check CSS file path in HTML

### Issue 3: JavaScript not working

**Symptoms**:
- Auth state not detected
- Buttons don't work
- No smooth scroll

**Solutions**:
1. Check browser console for errors
2. Verify `public/js/landing-page.js` exists
3. Check Network tab for 404 on JS file
4. Ensure JavaScript is enabled
5. Try different browser

### Issue 4: Auth state detection fails

**Symptoms**:
- Always shows sign-up CTA
- Never shows "Go to Dashboard"
- Logged-in users see landing page

**Solutions**:
1. Check localStorage for `authToken`
2. Verify JWT token is valid
3. Check server logs for auth errors
4. Ensure `JWT_SECRET` is set
5. Try logging in again

### Issue 5: Google SSO redirect fails

**Symptoms**:
- 404 on `/api/auth/google/authorize`
- OAuth error
- Redirect loop

**Solutions**:
1. Verify Google OAuth credentials are set
2. Check `GOOGLE_CLIENT_ID` in `.env`
3. Check `GOOGLE_CLIENT_SECRET` in `.env`
4. Verify `GOOGLE_REDIRECT_URI` is correct
5. Check server logs for OAuth errors

### Issue 6: Responsive design broken

**Symptoms**:
- Layout doesn't adapt to screen size
- Text too small/large
- Buttons overlap

**Solutions**:
1. Check viewport meta tag is present
2. Verify CSS media queries are working
3. Test in different browsers
4. Clear browser cache
5. Check for CSS conflicts

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Functionality
- [ ] Landing page loads for unauthenticated users
- [ ] Dashboard loads for authenticated users
- [ ] "Get Started with Google" redirects to OAuth
- [ ] "Learn More" scrolls to features
- [ ] All links work correctly
- [ ] No JavaScript errors in console

### Design
- [ ] Hero section displays correctly
- [ ] 6 feature cards visible
- [ ] 3 testimonials visible
- [ ] Final CTA section visible
- [ ] Footer displays correctly
- [ ] Colors and typography match design

### Responsive
- [ ] Mobile layout (320px-767px)
- [ ] Tablet layout (768px-1023px)
- [ ] Desktop layout (1024px+)
- [ ] Touch-friendly buttons (44x44px)
- [ ] Text readable at all sizes

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Semantic HTML structure
- [ ] Alt text on images
- [ ] ARIA labels where needed
- [ ] Color contrast sufficient

### SEO
- [ ] Title tag present
- [ ] Meta description present
- [ ] Open Graph tags present
- [ ] Semantic heading hierarchy
- [ ] No broken links

### Performance
- [ ] Lighthouse Performance >= 80
- [ ] Lighthouse Accessibility >= 90
- [ ] Lighthouse Best Practices >= 90
- [ ] Lighthouse SEO >= 90
- [ ] Page loads in < 3 seconds

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari
- [ ] Chrome Android

## Reporting Issues

When reporting issues, include:

1. **Browser and version**: Chrome 120, Firefox 121, etc.
2. **Device**: Desktop, iPhone 12, iPad, etc.
3. **Steps to reproduce**: Detailed steps
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Screenshots**: If applicable
7. **Console errors**: Copy from browser console
8. **Network errors**: From Network tab

## Next Steps After Testing

1. **Fix any issues found**: Address bugs and errors
2. **Optimize performance**: Improve Lighthouse scores
3. **Gather feedback**: Get user feedback on design
4. **A/B testing**: Test different headlines/CTAs
5. **Analytics**: Add tracking for conversions
6. **Deploy**: Push to production

## Resources

- **Test Guide**: `tests/html/landing-page.test.html`
- **Feature Docs**: `docs/features/landing-page/README.md`
- **Visual Reference**: `docs/features/landing-page/VISUAL_REFERENCE.md`
- **Implementation Summary**: `docs/features/landing-page/IMPLEMENTATION_SUMMARY.md`

## Support

For help with testing:
1. Check troubleshooting section above
2. Review browser console for errors
3. Check server logs for backend issues
4. Verify environment variables are set
5. Try in different browser/device
