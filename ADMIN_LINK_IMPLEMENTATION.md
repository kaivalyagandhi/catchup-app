# Admin Dashboard Link Implementation

## Summary

Added an admin dashboard link to the Preferences page that only appears for users with admin privileges.

## Changes Made

### 1. Backend: Added `isAdmin` to `/auth/me` Response

**File**: `src/api/routes/auth.ts`

**Change**: Added `isAdmin` field to the user info response

```typescript
res.json({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  authProvider: user.authProvider,
  profilePictureUrl: user.profilePictureUrl,
  isAdmin: user.isAdmin || false,  // ← Added this line
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
```

### 2. Frontend: Added Admin Check and Dashboard Link

**File**: `public/js/app.js`

**Changes**:

1. **Check if user is admin** (in `loadAccountInfo` function):
```javascript
// Check if user is admin
const isAdmin = user.isAdmin || false;
```

2. **Conditionally render admin dashboard link** (after action buttons):
```javascript
${isAdmin ? `
<!-- Admin Dashboard Link -->
<div style="margin-top: 16px; padding: 14px; background: linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-secondary) 100%); border: 2px solid var(--border-subtle); border-radius: 8px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 18px;">🔧</span>
                <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">Admin Dashboard</h4>
            </div>
            <p style="margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
                Monitor sync health, view metrics, and manage system optimization
            </p>
        </div>
        <a href="/admin/sync-health.html" target="_blank" style="padding: 10px 16px; background: var(--color-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; text-decoration: none; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">
            Open Dashboard
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
        </a>
    </div>
</div>
` : ''}
```

## How It Works

1. **User loads Preferences page** → `loadPreferences()` is called
2. **Account info is loaded** → `loadAccountInfo()` fetches user data from `/api/auth/me`
3. **Backend returns user data** → Includes `isAdmin: true` for admin users
4. **Frontend checks admin status** → `const isAdmin = user.isAdmin || false`
5. **Conditionally renders link** → Only shows if `isAdmin === true`
6. **Link opens in new tab** → `target="_blank"` to keep main app open

## Visual Design

The admin link appears as a highlighted card with:
- 🔧 Wrench emoji icon
- "Admin Dashboard" title
- Description text
- "Open Dashboard" button with external link icon
- Gradient background to make it stand out
- Positioned after Sign Out and Delete Account buttons

## Testing

### 1. Test as Admin User

1. Go to Preferences page: `http://localhost:3000` → Click "Preferences"
2. Scroll to Account section
3. You should see the "Admin Dashboard" card
4. Click "Open Dashboard" button
5. Admin dashboard should open in new tab

### 2. Test as Non-Admin User

1. Create a test user without admin privileges
2. Log in as that user
3. Go to Preferences page
4. Admin Dashboard link should NOT appear

### 3. Verify Backend Response

Open browser DevTools Console and run:
```javascript
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(data => console.log('isAdmin:', data.isAdmin));
```

Should log: `isAdmin: true` (for admin users)

## Security

- Link only appears in UI for admin users
- Backend still validates admin status via `requireAdmin` middleware
- Even if a non-admin user manually navigates to `/admin/sync-health.html`, they'll get 403 Forbidden
- No security risk from showing/hiding the link

## Location in App

**Preferences Page → Account Section → After Action Buttons**

```
Preferences
├── Integrations
│   ├── Google Calendar
│   └── Google Contacts
├── Account
│   ├── Email
│   ├── Authentication Method
│   ├── Member Since / Last Login
│   ├── Action Buttons (Sign Out, Delete Account)
│   └── Admin Dashboard Link ← HERE (only for admins)
├── Onboarding
└── About
```

## Files Modified

1. `src/api/routes/auth.ts` - Added `isAdmin` to response
2. `public/js/app.js` - Added admin check and dashboard link

## Next Steps

1. Refresh the page or restart the server
2. Navigate to Preferences page
3. Scroll to Account section
4. Click "Open Dashboard" to access admin features

## Troubleshooting

### Link doesn't appear
- Check if you're an admin: `npm run promote-admin -- list`
- Check browser console for errors
- Verify `/api/auth/me` returns `isAdmin: true`

### Link appears but dashboard shows "Unauthorized"
- This was the original issue - you need to be logged in
- The link now appears in the main app, so you're already authenticated
- Token is automatically included from localStorage

### Link appears for non-admin users
- Check database: `SELECT email, is_admin FROM users WHERE email = 'user@example.com';`
- Verify backend is returning correct `isAdmin` value
- Clear browser cache and reload

## Benefits

✅ Easy access to admin dashboard from main app
✅ No need to remember the URL
✅ Only visible to admin users
✅ Opens in new tab to keep main app open
✅ Clear visual design that stands out
✅ Includes helpful description of what the dashboard does

---

**Status**: Implementation complete! Ready to test.
