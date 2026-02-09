# Quick Fix: Missing Database Tables

## Problem

You're seeing these errors:
1. **Groups page:** "No groups found" (even though you have contacts)
2. **Scheduling page:** "Unable to Load Plans"
3. **Onboarding Step 3:** No mapping suggestions

## Root Cause

Missing database tables. You need to run migrations to create them.

## Quick Fix (5 minutes - Browser Only)

### Step 1: Open the Migration SQL File

1. **Open this file in your editor:**
   - `sync-optimization-migrations.sql` (in the root of your project)

2. **Copy ALL the SQL content** (Cmd+A, Cmd+C)

### Step 2: Run in Google Cloud Console

1. **Go to Cloud SQL:**
   - https://console.cloud.google.com/sql/instances

2. **Click on your database:**
   - Click `catchup-db`

3. **Open SQL Editor:**
   - Click the **"SQL"** tab at the top

4. **Paste and Run:**
   - Paste all the SQL you copied
   - Click **"RUN"** button

5. **Wait for completion:**
   - You should see "Query OK" messages
   - Takes about 10-20 seconds

### Step 3: Restart Cloud Run (Force Refresh)

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars=MIGRATION_RUN=$(date +%s)
```

### Step 4: Test

1. Go back to https://catchup.club
2. Refresh the page (Cmd+R or Ctrl+R)
3. Try the Scheduling page - should work now
4. Try Step 3 of onboarding - should show mapping suggestions

---

## What This Creates

The migrations create these tables:
- `token_health` - OAuth token monitoring
- `circuit_breaker_state` - Sync failure prevention
- `sync_schedule` - Adaptive sync scheduling
- `calendar_webhook_subscriptions` - Calendar webhooks
- `sync_metrics` - Sync performance tracking
- `token_health_notifications` - Token health alerts
- `webhook_notifications` - Webhook event logging

Plus tables for the scheduling feature:
- `catchup_plans`
- `scheduling_notifications`
- `scheduling_preferences`
- `calendar_sharing_settings`

---

## Alternative: Use the Script

If you prefer command line:

```bash
# Install Cloud SQL Proxy (if not installed)
brew install cloud-sql-proxy

# Start proxy (in one terminal)
cloud-sql-proxy catchup-479221:us-central1:catchup-db

# Run migrations (in another terminal)
./scripts/run-migrations-cloud-sql.sh
```

---

## Verification

After running migrations, check:

```bash
# Check logs for errors
gcloud run services logs read catchup --region=us-central1 --limit=50 | grep -i error

# Should see no more "relation does not exist" errors
```

---

## Why This Happened

The sync optimization and scheduling features were added after your initial database setup, so these tables weren't created yet. Running the migrations adds them.

---

## Need Help?

If you get stuck:
1. Make sure you're connected to the right database (`catchup-db`)
2. Make sure you have permission to run SQL commands
3. Try refreshing the Cloud Console page
4. Check the error message in the SQL editor

