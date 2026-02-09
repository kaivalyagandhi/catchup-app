# Fix Encryption Key Error

## Problem

When connecting Google Calendar, you get:
```
"error":"Failed to store calendar connection"
"details":"ENCRYPTION_KEY must be a 64-character hex string"
```

## Root Cause

The `ENCRYPTION_KEY` secret in GCP Secret Manager is not in the correct format. It needs to be exactly 64 hexadecimal characters (0-9, a-f).

## Solution

### Step 1: Generate a Valid Encryption Key

Run this command to generate a proper 64-character hex string:

```bash
openssl rand -hex 32
```

This will output something like:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**Copy this output!**

### Step 2: Update the Secret in GCP

#### Option A: Via GCP Console (Easiest)

1. **Go to Secret Manager:**
   - https://console.cloud.google.com/security/secret-manager

2. **Find `encryption-key` secret:**
   - Click on it

3. **Create a new version:**
   - Click "NEW VERSION" button
   - Paste the 64-character hex string you generated
   - Click "ADD NEW VERSION"

4. **Done!** The new version will be used immediately.

#### Option B: Via gcloud CLI

```bash
# Generate the key
NEW_KEY=$(openssl rand -hex 32)

# Update the secret
echo -n "$NEW_KEY" | gcloud secrets versions add encryption-key --data-file=-

# Verify it was added
gcloud secrets versions list encryption-key --limit=1
```

### Step 3: Restart Cloud Run (Optional but Recommended)

To ensure the new secret is picked up immediately:

```bash
gcloud run services update catchup --region=us-central1
```

Or just wait 1-2 minutes for Cloud Run to pick up the new secret automatically.

### Step 4: Try Connecting Again

1. Go back to https://catchup.club
2. Go to Preferences
3. Try connecting Google Calendar again
4. Should work now!

---

## Why This Happened

The encryption key is used to securely store OAuth tokens in the database. It must be:
- Exactly 64 characters long
- Only hexadecimal characters (0-9, a-f)

The current key in your secrets might be:
- Too short
- Too long
- Contains non-hex characters
- Empty or malformed

---

## Verification

After updating, you can verify the key format:

```bash
# Check the length
gcloud secrets versions access latest --secret=encryption-key | wc -c
# Should output: 64

# Check it's all hex characters
gcloud secrets versions access latest --secret=encryption-key | grep -E '^[0-9a-f]{64}$'
# Should output the key if valid
```

---

## Important Notes

⚠️ **Changing the encryption key will invalidate existing encrypted tokens!**

This means:
- Users will need to reconnect their Google accounts
- Existing OAuth tokens won't be decryptable with the new key

But since you're already having connection issues, this is fine - you'll just reconnect everything with the new key.

---

## Quick Command Summary

```bash
# 1. Generate new key
openssl rand -hex 32

# 2. Update secret (paste the generated key when prompted)
echo -n "PASTE_YOUR_64_CHAR_KEY_HERE" | gcloud secrets versions add encryption-key --data-file=-

# 3. Restart Cloud Run
gcloud run services update catchup --region=us-central1

# 4. Try connecting again on catchup.club
```

---

## Troubleshooting

### "openssl: command not found"

If you don't have openssl, use this Node.js command instead:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Still Getting the Error?

1. **Check the secret was updated:**
   ```bash
   gcloud secrets versions list encryption-key --limit=2
   ```
   You should see a new version created

2. **Verify the format:**
   ```bash
   gcloud secrets versions access latest --secret=encryption-key
   ```
   Should be exactly 64 hex characters

3. **Clear browser cache** and try again

4. **Check Cloud Run logs** for any other errors:
   ```bash
   gcloud run services logs read catchup --region=us-central1 --limit=50
   ```

---

## Related Issues

If you also need to fix other secrets, here are the required formats:

- `encryption-key`: 64-character hex string (this one)
- `jwt-secret`: Any string (32+ characters recommended)
- `database-password`: Your database password
- `google-*`: Your Google OAuth credentials

