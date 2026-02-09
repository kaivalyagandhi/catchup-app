# Debug: Why Group Mapping Suggestions Don't Show Up

## The Problem

You're seeing "No groups found" in the Groups tab, and Onboarding Step 3 doesn't show mapping suggestions.

## Root Causes (Most Likely)

### 1. **Missing Database Table** ⭐ (MOST LIKELY)
The `google_contact_groups` table doesn't exist yet because migration 016 hasn't been run.

**How to verify:**
```sql
-- Run this in Cloud Console SQL editor
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'google_contact_groups'
);
```

**If it returns `false`:** Run migration 016 (see MIGRATION_QUICK_START.md)

---

### 2. **Google Contacts Sync Didn't Run Group Sync**
The contacts sync completed, but the group sync step failed or was skipped.

**How to verify:**
Check GCP logs for:
```
Syncing contact groups for user <your-user-id>
```

**If missing:** The group sync never ran. This could be because:
- The sync job crashed before reaching group sync
- An error occurred during contact sync that prevented group sync
- The job processor didn't call group sync

---

### 3. **No Google Contact Groups Exist**
Your Google account has no contact groups (labels) to sync.

**How to verify:**
1. Go to https://contacts.google.com
2. Click "Labels" in the left sidebar
3. Check if you have any labels/groups

**If you have no groups:** That's expected! The app will show "No groups found" because there's nothing to sync.

---

### 4. **Groups Synced But All Rejected/Approved**
Groups were synced, but they're all in "approved" or "rejected" status, so they don't show as "pending".

**How to verify:**
```sql
-- Run this in Cloud Console SQL editor
SELECT 
  mapping_status,
  COUNT(*) as count
FROM google_contact_groups
WHERE user_id = '<your-user-id>'
GROUP BY mapping_status;
```

**If all are "approved" or "rejected":** You already reviewed them! They won't show in Step 3.

---

## Debugging Steps

### Step 1: Check if Table Exists

Run in Cloud Console SQL editor:
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%group%'
ORDER BY tablename;
```

**Expected tables:**
- `contact_groups` (CatchUp groups)
- `google_contact_groups` (Google group mappings)
- `contact_google_memberships` (group memberships)

**If `google_contact_groups` is missing:** Run migration 016 first!

---

### Step 2: Check if Groups Were Synced

Run in Cloud Console SQL editor:
```sql
-- Replace <your-user-id> with your actual user ID
SELECT 
  id,
  google_name,
  member_count,
  mapping_status,
  suggested_action,
  sync_enabled,
  created_at
FROM google_contact_groups
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 10;
```

**Possible results:**

1. **Error: "relation does not exist"**
   - Table doesn't exist yet
   - **Fix:** Run migration 016

2. **No rows returned**
   - Groups haven't been synced yet
   - **Fix:** Trigger a manual sync (see Step 3)

3. **Rows exist with `mapping_status = 'pending'`**
   - Groups are synced and waiting for review
   - **Fix:** Check frontend API call (see Step 4)

4. **Rows exist but all `mapping_status = 'approved'` or `'rejected'`**
   - You already reviewed all groups
   - **Fix:** Nothing to do! This is expected.

---

### Step 3: Trigger Manual Group Sync

If the table exists but has no data, trigger a manual sync:

**Option A: Via API (Recommended)**

Open browser console on https://catchup.club and run:
```javascript
const authToken = localStorage.getItem('authToken');
const userId = localStorage.getItem('userId');

fetch(`${window.API_BASE || '/api'}/contacts/google/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: userId,
    syncType: 'incremental'
  })
})
.then(r => r.json())
.then(data => console.log('Sync result:', data))
.catch(err => console.error('Sync failed:', err));
```

**Option B: Reconnect Google Contacts**

1. Go to Preferences
2. Disconnect Google Contacts
3. Reconnect Google Contacts
4. Wait for sync to complete

---

### Step 4: Check Frontend API Call

Open browser console on https://catchup.club and check for errors:

1. Go to Onboarding Step 3 (or Directory > Groups tab)
2. Open DevTools (F12) > Console tab
3. Look for errors like:
   - `Failed to load mapping suggestions`
   - `HTTP 500: Internal Server Error`
   - `Not authenticated`

**Common errors:**

- **401 Unauthorized:** Auth token expired, refresh the page
- **500 Internal Server Error:** Backend error, check GCP logs
- **404 Not Found:** API route doesn't exist (unlikely)

---

### Step 5: Check GCP Logs

Go to: https://console.cloud.google.com/logs

Filter by:
```
resource.type="cloud_run_revision"
resource.labels.service_name="catchup"
"group" OR "mapping"
```

**Look for:**
- ✅ `Syncing contact groups for user <user-id>`
- ✅ `Fetched X contact groups`
- ✅ `Group sync completed. Imported: X, Updated: Y, Suggestions: Z`
- ❌ `Group sync failed: <error>`
- ❌ `relation "google_contact_groups" does not exist`

---

## Quick Fix Checklist

Run through these in order:

- [ ] **1. Run migration 016** (if table doesn't exist)
  ```sql
  -- Copy from scripts/migrations/016_add_group_mapping_suggestions.sql
  ```

- [ ] **2. Check if you have Google Contact Groups**
  - Go to https://contacts.google.com
  - Check "Labels" sidebar
  - If none exist, create a test label with 2-3 contacts

- [ ] **3. Trigger manual sync**
  - Use browser console method above
  - Or reconnect Google Contacts in Preferences

- [ ] **4. Check database for synced groups**
  ```sql
  SELECT COUNT(*) FROM google_contact_groups WHERE user_id = '<your-user-id>';
  ```

- [ ] **5. Refresh the page**
  - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
  - Check Onboarding Step 3 or Directory > Groups

---

## Expected Behavior

### When Everything Works:

1. **After Google Contacts sync completes:**
   - Groups are fetched from Google
   - Mapping suggestions are generated
   - Stored in `google_contact_groups` table with `mapping_status = 'pending'`

2. **In Onboarding Step 3:**
   - Shows list of pending group mappings
   - Each mapping has "Create New" or "Map to Existing" suggestion
   - User can approve/reject each mapping

3. **In Directory > Groups tab:**
   - Shows "Review Groups" button with red dot if pending mappings exist
   - Clicking opens mapping review UI
   - After all reviewed, red dot disappears

---

## Most Likely Solution

Based on your symptoms, I'm 90% confident the issue is:

**Migration 016 hasn't been run yet.**

The `google_contact_groups` table doesn't exist, so:
- Group sync fails silently
- No mappings are stored
- Frontend shows "No groups found"

**Fix:** Run all 47 migrations from MIGRATION_QUICK_START.md, especially migration 016.

---

## After Running Migrations

1. **Restart Cloud Run:**
   ```bash
   gcloud run services update catchup \
     --region=us-central1 \
     --update-env-vars=MIGRATIONS_COMPLETE=$(date +%s)
   ```

2. **Trigger a fresh sync:**
   - Go to Preferences
   - Disconnect Google Contacts
   - Reconnect Google Contacts
   - Wait for sync to complete (check logs)

3. **Check Onboarding Step 3:**
   - Should now show mapping suggestions
   - If still empty, check if you have any Google Contact Groups

---

## Need More Help?

If none of this works, provide:
1. Result of: `SELECT tablename FROM pg_tables WHERE tablename LIKE '%group%';`
2. Result of: `SELECT COUNT(*) FROM google_contact_groups WHERE user_id = '<your-user-id>';`
3. Screenshot of browser console errors
4. Recent GCP logs with "group" or "mapping" keywords

I'll help you debug further!
