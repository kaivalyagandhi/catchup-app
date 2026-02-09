# Google OAuth Verification Issue - Fix Guide

## Problem

You're seeing: "Access blocked: catchup.club has not completed the Google verification process"

**Error:** `Error 403: access_denied`

This happens because your Google Cloud OAuth consent screen is in "Testing" mode.

## Solution Options

You have two options to fix this:

### Option 1: Add Yourself as a Test User (Quick Fix - 2 minutes)

This allows you to use the app immediately without going through Google's verification process.

**Steps:**

1. **Go to Google Cloud Console OAuth Consent Screen:**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Click "ADD USERS" under "Test users" section**

3. **Add your email:**
   - Enter: `kaivalya.gandhi@gmail.com`
   - Click "SAVE"

4. **Try connecting again:**
   - Go back to https://catchup.club
   - Try connecting Google Contacts/Calendar again
   - Should work now!

**Pros:**
- ✅ Works immediately
- ✅ No verification needed
- ✅ Good for personal use

**Cons:**
- ❌ Only works for test users you add (max 100)
- ❌ Not suitable for public users

---

### Option 2: Publish the App (For Public Use - Longer Process)

This makes the app available to anyone, but requires Google verification.

**Steps:**

1. **Go to OAuth Consent Screen:**
   - https://console.cloud.google.com/apis/credentials/consent

2. **Click "PUBLISH APP"**

3. **Submit for Verification (if required):**
   - Google may require verification if you're requesting sensitive scopes
   - This can take several days to weeks
   - You'll need to provide:
     - Privacy policy URL
     - Terms of service URL
     - App homepage URL
     - Video demo of the app

**Pros:**
- ✅ Works for any user
- ✅ No user limits
- ✅ Professional appearance

**Cons:**
- ❌ Takes time (days to weeks)
- ❌ Requires documentation
- ❌ May require verification review

---

## Recommended Approach

**For now (immediate fix):**
1. Use Option 1 - Add yourself as a test user
2. This will let you use the app right away

**For later (if you want public access):**
1. Create privacy policy and terms of service
2. Submit for verification
3. Publish the app

---

## Why This Happened

When you create a Google Cloud OAuth app, it starts in "Testing" mode by default. This is a security feature to prevent unauthorized apps from accessing user data.

The cost optimization deployment didn't cause this - it's just that your OAuth tokens may have expired or been revoked, requiring you to reconnect.

---

## Quick Fix Steps (Recommended)

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users" section
3. Click "ADD USERS"
4. Enter: `kaivalya.gandhi@gmail.com`
5. Click "SAVE"
6. Go back to https://catchup.club
7. Try connecting Google Contacts/Calendar again

**This should take less than 2 minutes!**

---

## Additional Test Users

If you want to add more test users (friends, family, etc.), you can add up to 100 email addresses in the same way.

---

## Troubleshooting

### Still Getting the Error After Adding Test User?

1. **Clear browser cache and cookies** for catchup.club
2. **Try in incognito/private mode**
3. **Wait 1-2 minutes** for Google's changes to propagate
4. **Check you added the correct email** (the one you're signing in with)

### Want to Check Current Test Users?

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users" section
3. You'll see all currently added test users

---

## Related Documentation

- **Google OAuth Setup:** `docs/features/google-integrations/GOOGLE_SSO_SETUP_GUIDE.md`
- **Google Integrations:** `.kiro/steering/google-integrations.md`
- **Troubleshooting:** `docs/features/google-integrations/GOOGLE_SSO_TROUBLESHOOTING.md`

---

## Notes

- This is a Google Cloud configuration issue, not a deployment issue
- The cost optimization deployment is working correctly
- Your app is functioning properly - this is just an OAuth permission issue
- Adding yourself as a test user is the fastest solution
