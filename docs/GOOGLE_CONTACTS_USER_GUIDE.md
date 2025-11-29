# Google Contacts Integration - User Guide

## Overview

CatchUp's Google Contacts integration helps you quickly import and keep your contacts synchronized with Google Contacts. This guide explains how to connect your account, understand the sync process, and manage your imported contacts.

## 🔒 Important: One-Way Sync (Read-Only)

**Your Google Contacts are completely safe.** CatchUp uses a one-way sync that only reads from Google Contacts - it never modifies, adds, or deletes anything in your Google account.

### What This Means:
- ✅ CatchUp imports contacts from Google to CatchUp
- ✅ CatchUp updates imported contacts when they change in Google
- ✅ Your Google Contacts remain completely unchanged
- ❌ Changes in CatchUp do NOT sync back to Google
- ❌ New contacts in CatchUp do NOT appear in Google
- ❌ Deleting contacts in CatchUp does NOT delete them from Google

**Think of it like this:** CatchUp is a read-only mirror of your Google Contacts. You can enhance and organize contacts in CatchUp without any risk to your original Google data.

---

## Getting Started

### Step 1: Connect Your Google Account

1. Navigate to **Settings** > **Google Contacts**
2. You'll see a prominent notice: **"One-Way Sync (Read-Only)"**
3. Click the **"Connect Google Contacts"** button
4. You'll be redirected to Google's authorization page

### Step 2: Review Permissions

On Google's authorization page, you'll see:

**CatchUp wants to:**
- View your contacts
- View your "Other contacts"
- View your email address
- View your basic profile info

**Important:** Notice it says "View" not "Manage" - this confirms read-only access.

### Step 3: Authorize

1. Review the permissions
2. Click **"Allow"** to grant access
3. You'll be redirected back to CatchUp
4. The initial sync will start automatically

### Step 4: Wait for Initial Sync

- The first sync imports all your contacts (this may take a few minutes for large contact lists)
- You'll see a progress indicator
- Once complete, you'll see a summary of imported contacts

---

## Understanding the Sync Process

### Initial Full Sync

When you first connect:
- **All contacts** are imported from Google Contacts
- **Contact groups** are imported and you'll review mapping suggestions
- **Contact details** include names, emails, phones, organizations, addresses, and more
- A **sync token** is stored for future incremental updates

### Incremental Sync

After the initial sync:
- **Automatic sync** runs once daily in the background
- **Manual sync** available via the "Sync Now" button
- Only **changed contacts** are synced (much faster)
- **Deleted contacts** in Google are archived in CatchUp
- **Updated contacts** in Google are updated in CatchUp

### What Gets Synced

**Contact Information:**
- ✅ Names (first, last, display name)
- ✅ Email addresses
- ✅ Phone numbers
- ✅ Organizations (company, title)
- ✅ Addresses
- ✅ Websites (including LinkedIn)
- ✅ Contact group memberships

**What Doesn't Sync:**
- ❌ Profile photos (coming soon)
- ❌ Birthdays (coming soon)
- ❌ Custom fields you add in CatchUp
- ❌ Tags you add in CatchUp
- ❌ Notes you add in CatchUp

---

## Managing Contact Groups

### Group Mapping Suggestions

When you first sync, CatchUp analyzes your Google contact groups and suggests how to map them:

**Example Suggestions:**

1. **"College Friends" → Map to existing "University Friends"**
   - Confidence: 85%
   - Reason: Similar name (85% match) and 60% member overlap
   - Action: Approve to link these groups

2. **"Work Team" → Create new group**
   - Confidence: 90%
   - Reason: No similar existing group found
   - Action: Approve to create this group in CatchUp

3. **"Newsletter Subscribers" → Pending review**
   - 500 members
   - Action: Reject if you don't want this large group in CatchUp

### Reviewing Group Mappings

1. Go to **Settings** > **Google Contacts** > **Group Mappings**
2. You'll see three sections:
   - **Pending** - Suggestions awaiting your decision
   - **Approved** - Groups that are syncing
   - **Rejected** - Groups you've chosen not to sync

### Approving a Mapping

1. Review the suggestion details
2. Click **"Approve"**
3. The group is created or linked in CatchUp
4. Future syncs will add contacts from this Google group to your CatchUp group

### Rejecting a Mapping

1. Review the suggestion
2. Click **"Reject"**
3. Contacts from this Google group won't be added to any CatchUp group
4. You can change your mind later and approve it

### Why Group Mapping?

Group mapping gives you control over your CatchUp organization:
- **Avoid clutter** - Reject groups you don't need (like "Coworkers" if you only use CatchUp for personal contacts)
- **Merge duplicates** - Map similar Google groups to existing CatchUp groups
- **Stay organized** - Only sync the groups that matter to you

---

## Identifying Synced Contacts

### Contact Source Indicators

Contacts imported from Google are marked with:
- **"Google" badge** - Visible on contact cards
- **Last synced timestamp** - Shows when the contact was last updated from Google
- **Source filter** - Filter your contact list to show only Google contacts

### Viewing Sync Details

For each Google contact, you can see:
- When it was last synced
- Whether it's been modified in CatchUp
- Which Google groups it belongs to

---

## Manual Sync

### When to Manually Sync

- You just added contacts in Google and want them in CatchUp immediately
- You updated contact information in Google
- You want to ensure you have the latest data

### How to Manually Sync

1. Go to **Settings** > **Google Contacts**
2. Click **"Sync Now"**
3. Wait for the sync to complete (usually a few seconds)
4. Review the sync results

### Sync Results

After a sync, you'll see:
- **Contacts imported:** New contacts added
- **Contacts updated:** Existing contacts modified
- **Contacts deleted:** Contacts removed from Google (archived in CatchUp)
- **Groups synced:** New group mapping suggestions

---

## Editing Synced Contacts

### Making Changes in CatchUp

You can freely edit contacts imported from Google:
- Add custom notes
- Add tags
- Update frequency preferences
- Add to additional groups
- Modify any field

**Important:** These changes stay in CatchUp only. They won't sync back to Google.

### What Happens on Next Sync

When the next sync runs:
- **Google data** is updated if it changed in Google
- **CatchUp-specific data** is preserved (tags, notes, custom fields)
- **Conflicts** are resolved by keeping Google as the source of truth for synced fields

**Example:**
1. You add a tag "tech enthusiast" to John in CatchUp
2. John updates his phone number in Google
3. Next sync: Phone number updates in CatchUp, tag remains

---

## Disconnecting Google Contacts

### What Happens When You Disconnect

1. Go to **Settings** > **Google Contacts**
2. Click **"Disconnect"**
3. Confirm the action

**Results:**
- ✅ OAuth tokens are deleted
- ✅ Automatic sync stops
- ✅ Your contacts remain in CatchUp
- ✅ Your Google Contacts remain unchanged
- ❌ No more updates from Google

### Reconnecting

If you disconnect and later reconnect:
- A new full sync will run
- Existing contacts will be updated
- New contacts will be imported
- You'll review group mappings again

---

## Troubleshooting

### Sync Not Working

**Problem:** Contacts aren't syncing

**Solutions:**
1. Check connection status in Settings
2. Try manually triggering a sync
3. Check for error messages
4. Verify Google Contacts is still connected
5. Try disconnecting and reconnecting

### Missing Contacts

**Problem:** Some contacts didn't import

**Possible Causes:**
- Contacts are in "Other Contacts" (not main contacts)
- Contacts don't have names (only email/phone)
- Contacts were deleted in Google

**Solutions:**
1. Check "Other Contacts" in Google Contacts
2. Add names to contacts in Google
3. Trigger a manual sync

### Duplicate Contacts

**Problem:** Same contact appears twice

**Cause:** Contact exists in both Google and was manually created in CatchUp

**Solution:**
- CatchUp automatically deduplicates by email and phone
- If duplicates persist, manually merge them in CatchUp
- Delete the manual version and keep the Google version

### Group Not Syncing

**Problem:** Contacts from a Google group aren't appearing in CatchUp

**Cause:** The group mapping is pending or rejected

**Solution:**
1. Go to **Settings** > **Google Contacts** > **Group Mappings**
2. Find the group in "Pending" or "Rejected"
3. Approve the mapping
4. Trigger a manual sync

### Sync Token Expired

**Problem:** Error message about expired sync token

**Cause:** Sync tokens expire after 7 days of inactivity

**Solution:**
- This is normal and handled automatically
- The system triggers a full sync
- No action needed from you

---

## Frequently Asked Questions

### Can CatchUp modify my Google Contacts?

**No.** CatchUp uses read-only permissions and cannot modify, add, or delete anything in your Google Contacts. This is enforced by Google's OAuth system.

### What if I edit a contact in both places?

Changes in Google will overwrite the same fields in CatchUp on the next sync. CatchUp-specific fields (tags, notes) are preserved.

### Can I choose which contacts to sync?

Currently, all contacts are synced. You can archive contacts in CatchUp if you don't want to see them.

### Can I choose which groups to sync?

Yes! Use the group mapping review feature to approve or reject each Google contact group.

### How often does automatic sync run?

Once per day. You can also manually sync anytime.

### Does this use my Google API quota?

Yes, but the free tier is very generous (3 million requests per day). Normal usage won't come close to this limit.

### What happens if I delete a contact in Google?

On the next sync, the contact is archived (soft-deleted) in CatchUp. You can restore it if needed.

### Can I sync multiple Google accounts?

Currently, only one Google account per CatchUp user. Multi-account support is planned for the future.

### Is my data secure?

Yes. OAuth tokens are encrypted at rest, all communication uses HTTPS, and we follow security best practices. See our [Security Policy](../SECURITY.md) for details.

### What if I want to stop syncing?

Simply disconnect Google Contacts in Settings. Your contacts remain in CatchUp, but sync stops.

---

## Privacy & Data Safety

### What Data is Stored

**In CatchUp:**
- Contact information (names, emails, phones, etc.)
- Google resource names (for sync tracking)
- Sync tokens (for incremental updates)
- Group mappings

**Not Stored:**
- Your Google password
- OAuth tokens are encrypted
- No data is shared with third parties

### Your Rights

- **Access:** Export all your data anytime
- **Delete:** Disconnect and delete all synced data
- **Control:** Choose which groups to sync
- **Transparency:** View sync history and status

### GDPR Compliance

CatchUp is GDPR compliant:
- Right to access your data
- Right to delete your data
- Right to data portability
- Transparent data processing

---

## Tips & Best Practices

### Organizing Your Contacts

1. **Use group mappings wisely** - Only sync groups you actively use
2. **Add CatchUp-specific data** - Tags, notes, and frequency preferences enhance your contacts
3. **Regular sync** - Keep data fresh with automatic daily sync
4. **Review periodically** - Check group mappings when you create new groups in Google

### Maintaining Data Quality

1. **Clean up in Google** - Merge duplicates and update info in Google Contacts
2. **Use consistent naming** - Helps with group mapping suggestions
3. **Archive unused contacts** - Keep your CatchUp list focused

### Maximizing Value

1. **Combine with voice notes** - Voice notes can reference synced contacts
2. **Use frequency preferences** - Set how often you want to connect with each contact
3. **Leverage tags** - Add interests and context to synced contacts
4. **Create custom groups** - Organize beyond Google's groups

---

## Getting Help

### Support Resources

- **Documentation:** [API Documentation](./API.md)
- **Setup Guide:** [Google Cloud Setup Guide](../GOOGLE_CLOUD_SETUP_GUIDE.md)
- **Security:** [Security Policy](../SECURITY.md)

### Contact Support

If you encounter issues:
1. Check this guide first
2. Review error messages in the UI
3. Try disconnecting and reconnecting
4. Contact support with:
   - Description of the issue
   - Error messages (if any)
   - Steps to reproduce
   - Your CatchUp user ID

---

## What's Next?

### Planned Features

- **Profile photo sync** - Import contact photos from Google
- **Birthday sync** - Import and track birthdays
- **Multi-account support** - Sync multiple Google accounts
- **Selective sync** - Choose specific contacts to sync
- **Two-way sync** - Optional write-back to Google (with explicit permission)
- **Real-time sync** - Instant updates via webhooks

### Feedback

We'd love to hear from you:
- What features would you like to see?
- How can we improve the sync experience?
- What documentation is missing?

---

## Summary

Google Contacts integration in CatchUp provides:
- ✅ **Safe, read-only sync** from Google to CatchUp
- ✅ **Automatic daily updates** to keep contacts fresh
- ✅ **Smart group mapping** with AI-powered suggestions
- ✅ **Full control** over what syncs and how
- ✅ **Enhanced organization** with CatchUp-specific features
- ✅ **Complete data safety** - your Google Contacts never change

**Remember:** CatchUp enhances your contacts without ever touching your Google data. Sync with confidence!

---

*Last updated: January 2024*
*Version: 1.0*
