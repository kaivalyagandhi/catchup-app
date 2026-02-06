# Running Production Migrations on Google Cloud SQL

## Overview

You need to run sync optimization migrations (039-046) on your production database. This guide provides three methods, from easiest to most advanced.

## Prerequisites

- Access to Google Cloud Console
- PostgreSQL password for production database
- (Optional) Cloud SQL Proxy installed locally

## Method 1: Cloud Console SQL Editor (EASIEST - RECOMMENDED)

This method requires no local setup and can be done entirely in your browser.

### Steps:

1. **Go to Cloud SQL Instances:**
   - https://console.cloud.google.com/sql/instances

2. **Select your database:**
   - Click on `catchup-db` instance

3. **Open SQL Editor:**
   - Click the **SQL** tab at the top

4. **Run the migrations:**
   - Open the file `sync-optimization-migrations.sql` from this repo
   - Copy ALL the SQL content
   - Paste into the SQL editor
   - Click **Run**

5. **Verify:**
   - You should see "Query OK" messages
   - All 8 tables should be created

**That's it!** All sync optimization migrations are now applied.

---

## Method 2: Cloud SQL Proxy (LOCAL COMMAND LINE)

This method uses Cloud SQL Proxy to connect from your local machine.

### Step 1: Install Cloud SQL Proxy (if not installed)

```bash
# macOS
brew install cloud-sql-proxy

# Or download directly
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

### Step 2: Start Cloud SQL Proxy

Open a terminal and run:

```bash
cloud-sql-proxy catchup-479221:us-central1:catchup-db
```

Leave this running. You should see:
```
Listening on 127.0.0.1:5432
```

### Step 3: Run Migrations Script

Open a **new terminal** and run:

```bash
./scripts/run-migrations-cloud-sql.sh
```

The script will:
1. Check if Cloud SQL Proxy is running
2. Prompt for your PostgreSQL password
3. Test the connection
4. Ask which migrations to run (choose option 1 for sync optimization)
5. Run the migrations

### Step 4: Verify

After completion, you should see:
```
✓ Sync optimization migrations completed successfully!
```

---

## Method 3: Manual psql Commands (ADVANCED)

If you prefer to run migrations one by one:

### Step 1: Start Cloud SQL Proxy

```bash
cloud-sql-proxy catchup-479221:us-central1:catchup-db
```

### Step 2: Run Each Migration

In a new terminal:

```bash
# Set connection parameters
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=catchup_db

# Run migrations one by one
psql -f scripts/migrations/039_create_token_health_table.sql
psql -f scripts/migrations/040_create_circuit_breaker_state_table.sql
psql -f scripts/migrations/041_create_sync_schedule_table.sql
psql -f scripts/migrations/042_create_calendar_webhook_subscriptions_table.sql
psql -f scripts/migrations/043_create_sync_metrics_table.sql
psql -f scripts/migrations/044_create_token_health_notifications_table.sql
psql -f scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql
psql -f scripts/migrations/046_create_webhook_notifications_table.sql
```

---

## What Gets Created

These migrations create 8 new tables for sync optimization:

1. **token_health** - Monitors OAuth token status
2. **circuit_breaker_state** - Prevents repeated failed sync attempts
3. **sync_schedule** - Manages adaptive sync scheduling
4. **calendar_webhook_subscriptions** - Tracks calendar webhook registrations
5. **sync_metrics** - Records sync performance metrics
6. **token_health_notifications** - Tracks token health notifications sent to users
7. **webhook_notifications** - Logs all webhook notifications received
8. **sync_schedule.onboarding_until** - Column for onboarding-specific sync frequencies

## Verification

After running migrations, verify they worked:

### Option A: Cloud Console

1. Go to Cloud SQL instance
2. Click **Databases** tab
3. Click on `catchup_db`
4. Click **Tables** tab
5. Look for the new tables listed above

### Option B: psql

```bash
# Connect via Cloud SQL Proxy
psql -h 127.0.0.1 -U postgres -d catchup_db

# List tables
\dt

# Check specific table
\d token_health
\d circuit_breaker_state
\d sync_schedule

# Exit
\q
```

## Troubleshooting

### "Cloud SQL Proxy not running"

Make sure you started the proxy:
```bash
cloud-sql-proxy catchup-479221:us-central1:catchup-db
```

### "Could not connect to database"

- Check your PostgreSQL password
- Ensure Cloud SQL Proxy is running
- Verify you have network access to Cloud SQL

### "Permission denied"

Make sure the script is executable:
```bash
chmod +x scripts/run-migrations-cloud-sql.sh
```

### "Table already exists"

This is fine! All migrations use `CREATE TABLE IF NOT EXISTS`, so they're safe to re-run.

## After Running Migrations

1. **Deploy code changes:**
   ```bash
   npm run build
   npm run deploy-production
   ```

2. **Verify in production:**
   - Go to https://catchup.club
   - Refresh the page
   - Console errors should be gone
   - App should load properly

3. **Test sync optimization:**
   - Connect Google Contacts/Calendar
   - Check admin dashboard: https://catchup.club/admin/sync-health.html
   - Verify sync metrics are being recorded

## Files Reference

- `scripts/run-migrations-cloud-sql.sh` - Interactive migration runner
- `scripts/run-migrations.sh` - Full migration runner (all migrations)
- `sync-optimization-migrations.sql` - Consolidated SQL file (for Cloud Console)
- Individual migration files in `scripts/migrations/039-046_*.sql`

## Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify Cloud SQL Proxy is running
3. Ensure you have the correct database password
4. Try Method 1 (Cloud Console) as it's the most reliable

## Related Documentation

- **Production Fix Guide**: `PRODUCTION_FIX.md`
- **Console Errors Fix**: `CONSOLE_ERRORS_FIX.md`
- **Sync Optimization Architecture**: `.kiro/steering/google-integrations.md`
- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md`
