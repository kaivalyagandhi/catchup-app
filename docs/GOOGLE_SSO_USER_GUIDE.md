# Google SSO User Guide

## Overview

CatchUp uses Google Single Sign-On (SSO) to provide a secure and convenient way to access your account. With Google SSO, you can sign in using your existing Google account without creating a new password.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Signing In](#signing-in)
3. [Account Information](#account-information)
4. [Security and Privacy](#security-and-privacy)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

## Getting Started

### What is Google SSO?

Google Single Sign-On (SSO) allows you to use your Google account to sign in to CatchUp. This means:
- **No new password to remember**: Use your existing Google credentials
- **Faster sign-in**: One click to access your account
- **More secure**: Benefit from Google's security features (2FA, security alerts, etc.)
- **Easy account recovery**: Use Google's account recovery if you lose access

### What You Need

To use Google SSO with CatchUp, you need:
- A Google account (Gmail, Google Workspace, etc.)
- A web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

## Signing In

### First Time Sign In

1. **Visit CatchUp**:
   - Go to the CatchUp website
   - You'll see the sign-in page

2. **Click "Sign in with Google"**:
   - Look for the button with the Google logo
   - Click it to start the sign-in process

3. **Choose Your Google Account**:
   - You'll be redirected to Google
   - Select the Google account you want to use
   - If you're not signed in to Google, enter your email and password

4. **Review Permissions**:
   - Google will show you what information CatchUp will access:
     - Your email address
     - Your basic profile information (name, profile picture)
   - Click "Allow" to continue

5. **Welcome to CatchUp**:
   - You'll be redirected back to CatchUp
   - Your account is now created and you're signed in
   - You can start using CatchUp immediately

### Returning Users

If you've already signed in before:

1. **Visit CatchUp**
2. **Click "Sign in with Google"**
3. **Select Your Account** (if you have multiple Google accounts)
4. **You're In**: You'll be signed in automatically

### What Happens Behind the Scenes

When you sign in with Google:
1. CatchUp redirects you to Google's secure sign-in page
2. You authenticate with Google (not with CatchUp)
3. Google confirms your identity to CatchUp
4. CatchUp creates or accesses your account
5. You're signed in and ready to use CatchUp

**Important**: CatchUp never sees or stores your Google password.

## Account Information

### Viewing Your Account Details

To view your account information:

1. **Navigate to Preferences**:
   - Click your profile icon or menu
   - Select "Preferences" or "Settings"

2. **Find the Account Section**:
   - Look for the "Account" section
   - You'll see:
     - Your email address
     - Authentication method: "Google SSO"
     - Connection status: "Connected"
     - Account creation date
     - Last login time

### What Information Does CatchUp Store?

When you sign in with Google, CatchUp stores:
- **Email address**: Your Google email
- **Name**: Your name from your Google profile
- **Profile picture**: Your Google profile picture (optional)
- **Google user ID**: A unique identifier from Google

CatchUp does NOT store:
- Your Google password
- Your Google account credentials
- Any other Google account information

### Signing Out

To sign out of CatchUp:

1. **Go to Preferences**
2. **Find the Account Section**
3. **Click "Sign Out"**
4. You'll be signed out and returned to the sign-in page

**Note**: Signing out of CatchUp does not sign you out of your Google account.

## Security and Privacy

### Is Google SSO Secure?

Yes! Google SSO is very secure:
- **No password sharing**: CatchUp never sees your Google password
- **Google's security**: You benefit from Google's advanced security features
- **Two-factor authentication**: If you have 2FA enabled on Google, it protects your CatchUp account too
- **Encrypted communication**: All data is encrypted in transit
- **Regular security updates**: Google constantly updates their security

### What Permissions Does CatchUp Request?

CatchUp only requests minimal permissions:
- **Email address**: To identify your account
- **Basic profile**: Your name and profile picture

CatchUp does NOT request:
- Access to your Gmail
- Access to your Google Drive
- Access to your Google Calendar (unless you explicitly connect it separately)
- Any other Google services

### Can I Revoke Access?

Yes, you can revoke CatchUp's access to your Google account at any time:

1. **Go to Google Account Settings**:
   - Visit [myaccount.google.com](https://myaccount.google.com)
   - Click "Security" in the left sidebar

2. **Manage Third-Party Access**:
   - Scroll to "Third-party apps with account access"
   - Click "Manage third-party access"

3. **Find CatchUp**:
   - Look for "CatchUp" in the list
   - Click on it

4. **Remove Access**:
   - Click "Remove Access"
   - Confirm your choice

**Note**: After revoking access, you'll need to sign in again and re-authorize CatchUp.

### Privacy Considerations

- **Data minimization**: CatchUp only requests the minimum information needed
- **No data sharing**: Your Google account information is not shared with third parties
- **Secure storage**: Your information is stored securely in CatchUp's database
- **You're in control**: You can revoke access at any time

## Troubleshooting

### I Can't Sign In

**Problem**: Clicking "Sign in with Google" doesn't work

**Solutions**:
1. **Check your internet connection**: Ensure you're connected to the internet
2. **Try a different browser**: Some browser extensions can interfere
3. **Disable popup blockers**: Make sure popups are allowed for CatchUp
4. **Clear browser cache**: Clear your browser's cache and cookies
5. **Try incognito mode**: Open an incognito/private window and try again

### I Get an Error After Signing In

**Problem**: Error message appears after Google authorization

**Common errors and solutions**:

**"Authentication failed"**:
- Try signing in again
- Make sure you're using the correct Google account
- Check if your Google account is active

**"Email already exists"**:
- You may have previously registered with email/password
- Contact support to link your accounts

**"Access denied"**:
- You may have clicked "Deny" on the Google authorization screen
- Try again and click "Allow"

### My Account Information Is Wrong

**Problem**: Name or email is incorrect

**Solutions**:
1. **Update your Google profile**:
   - Go to [myaccount.google.com](https://myaccount.google.com)
   - Update your name or email
   - Sign out of CatchUp and sign in again

2. **Contact support**:
   - If the issue persists, contact CatchUp support

### I Want to Use a Different Google Account

**Problem**: Signed in with the wrong Google account

**Solutions**:
1. **Sign out of CatchUp**
2. **Sign out of Google** (or use incognito mode)
3. **Sign in to CatchUp again**
4. **Choose the correct Google account**

### I Can't Access My Account

**Problem**: Lost access to your Google account

**Solutions**:
1. **Recover your Google account**:
   - Visit [accounts.google.com/signin/recovery](https://accounts.google.com/signin/recovery)
   - Follow Google's account recovery process

2. **Contact CatchUp support**:
   - If you can't recover your Google account
   - Support may be able to help you access your CatchUp data

## FAQ

### Do I need a Google account to use CatchUp?

Yes, in production, Google SSO is the primary way to sign in to CatchUp. You'll need a Google account (Gmail, Google Workspace, etc.).

### Can I use my work Google account?

Yes! You can use any Google account, including:
- Personal Gmail accounts (user@gmail.com)
- Google Workspace accounts (user@company.com)
- Google Cloud Identity accounts

### What if I don't want to use Google SSO?

Google SSO is the primary authentication method for CatchUp. If you have concerns about using Google SSO, please contact support to discuss alternatives.

### Will CatchUp post to my Google account?

No. CatchUp only reads your basic profile information (email, name, picture). It cannot:
- Send emails from your Gmail
- Access your Google Drive
- Post to Google services
- Modify your Google account

### Can I use multiple Google accounts?

You can sign in with different Google accounts, but each Google account will have a separate CatchUp account. If you want to switch accounts:
1. Sign out of CatchUp
2. Sign in with a different Google account

### What happens if I delete my Google account?

If you delete your Google account:
- You won't be able to sign in to CatchUp using that account
- Your CatchUp data will remain, but you'll need to contact support to regain access
- Consider exporting your CatchUp data before deleting your Google account

### Is my data safe?

Yes! CatchUp takes security seriously:
- All data is encrypted in transit and at rest
- We follow industry best practices for security
- We never store your Google password
- We only request minimal permissions from Google
- You can revoke access at any time

### Can I export my data?

Yes, you can export your CatchUp data at any time. Contact support for assistance with data export.

### What if I have multiple email addresses?

If you have multiple Google accounts with different email addresses:
- Each email address will have a separate CatchUp account
- You can sign in with any of your Google accounts
- To merge accounts, contact support

### Does Google SSO work on mobile?

Yes! Google SSO works on mobile browsers. Simply:
1. Open CatchUp in your mobile browser
2. Tap "Sign in with Google"
3. Follow the same process as on desktop

### What browsers are supported?

Google SSO works with all modern browsers:
- Google Chrome
- Mozilla Firefox
- Apple Safari
- Microsoft Edge
- Opera

### Can I use Google SSO offline?

No, you need an internet connection to sign in with Google SSO. However, once signed in, some CatchUp features may work offline (depending on the app's offline capabilities).

### How do I contact support?

If you need help:
- Email: support@catchup.app
- Visit: [catchup.app/support](https://catchup.app/support)
- Include details about your issue for faster assistance

## Tips for a Better Experience

1. **Keep your Google account secure**:
   - Enable two-factor authentication (2FA)
   - Use a strong password
   - Review security alerts from Google

2. **Keep your profile updated**:
   - Update your name and picture in your Google account
   - Changes will reflect in CatchUp on your next sign-in

3. **Use a consistent Google account**:
   - Always sign in with the same Google account
   - This ensures you access the same CatchUp data

4. **Review connected apps regularly**:
   - Periodically review apps connected to your Google account
   - Remove apps you no longer use

5. **Sign out on shared devices**:
   - Always sign out of CatchUp on shared or public computers
   - This protects your account from unauthorized access

## Getting Help

If you need assistance:

1. **Check this guide**: Most common questions are answered here
2. **Visit the troubleshooting section**: Solutions to common problems
3. **Contact support**: Email support@catchup.app with your question
4. **Include details**: Describe your issue and what you've tried

We're here to help! Don't hesitate to reach out if you have questions or concerns about Google SSO.

## Additional Resources

- [Google Account Help](https://support.google.com/accounts)
- [Google Security Tips](https://safety.google/security-tips/)
- [CatchUp Privacy Policy](https://catchup.app/privacy)
- [CatchUp Terms of Service](https://catchup.app/terms)
