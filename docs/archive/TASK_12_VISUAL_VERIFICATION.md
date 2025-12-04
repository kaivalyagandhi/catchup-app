# Task 12: Account Section - Visual Verification Guide

## How to Verify the Implementation

### Step 1: Start the Application
```bash
npm run dev
```

### Step 2: Open in Browser
Navigate to: `http://localhost:3000`

### Step 3: Login/Register
- If you don't have an account, register a new one
- If you have an account, login

### Step 4: Navigate to Preferences
- Click the "Preferences" button in the header (top right area)
- Or click on the "Preferences" link in the navigation

### Step 5: Verify Account Section
Scroll down to find the "Account" section. You should see:

#### Expected UI Elements:

1. **Section Header**: "Account" with a bottom border

2. **Email Row**:
   - Label: "EMAIL"
   - Value: Your email address (e.g., "testaccount@example.com")
   - Background: Light gray box

3. **Authentication Method Row**:
   - Label: "AUTHENTICATION METHOD"
   - Value: "Email/Password" or "Google SSO" or "Google SSO + Email/Password"
   - Status Badge: "Connected" in green
   - Background: Light gray box

4. **Member Since Row**:
   - Label: "MEMBER SINCE"
   - Value: Account creation date (e.g., "December 1, 2025")
   - Background: Light gray box

5. **Last Login Row**:
   - Label: "LAST LOGIN"
   - Value: Relative time (e.g., "2 hours ago") or "This is your first login"
   - Background: Light gray box

6. **Sign Out Button**:
   - Full-width red button
   - Text: "Sign Out"
   - Clicking it should log you out and return to the login page

### Visual Layout

```
┌─────────────────────────────────────────────┐
│ Account                                     │
│ ─────────────────────────────────────────── │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ EMAIL                                   │ │
│ │ testaccount@example.com                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ AUTHENTICATION METHOD      [Connected]  │ │
│ │ Email/Password                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ MEMBER SINCE                            │ │
│ │ December 1, 2025                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ LAST LOGIN                              │ │
│ │ This is your first login                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │          Sign Out                       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Dark Mode
The Account section should also work in dark mode:
- Toggle dark mode using the moon/sun icon in the header
- Verify all text is readable
- Verify the status badge colors are appropriate

### Responsive Design
Test on different screen sizes:
- Desktop (full width)
- Tablet (medium width)
- Mobile (narrow width)

All elements should remain readable and properly aligned.

## Troubleshooting

### Account Section Not Showing
- Check browser console for JavaScript errors
- Verify you're logged in
- Refresh the page

### Loading Spinner Stuck
- Check network tab for failed API requests
- Verify the server is running
- Check server logs for errors

### Sign Out Button Not Working
- Check browser console for errors
- Verify the `logout()` function exists in app.js
- Check that clicking the button redirects to the login page

## API Verification

You can also verify the endpoints directly:

### Get User Info
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/auth/me
```

Expected response includes:
- id
- email
- role
- authProvider
- createdAt
- updatedAt

### Get Last Login
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/auth/last-login
```

Expected response:
```json
{
  "lastLogin": "2025-12-01T10:00:00.000Z"
}
```
or
```json
{
  "lastLogin": null
}
```
