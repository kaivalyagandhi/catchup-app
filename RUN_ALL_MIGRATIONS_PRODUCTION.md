# Run All Migrations in Production - Quick Guide

## Option 1: Single Consolidated File (RECOMMENDED)

We've created a single PostgreSQL 15-compatible file that contains ALL migrations:

**File:** `scripts/migrations/000_all_migrations_pg15.sql`

### What's Included (51 tables):

- **PART 0:** ENUM types and helper functions
- **PART 1:** Users table
- **PART 2:** Core tables (contacts, groups, tags)
- **PART 3:** Suggestions, Interaction Logs, Voice Notes
- **PART 4:** OAuth Tokens, Audit Logs, Calendar Events, Preferences
- **PART 5:** Google Contacts Sync (google_contact_groups, contact_google_memberships)
- **PART 6:** Onboarding Schema (simplified 3-step system + group_mapping_suggestions)
- **PART 7:** SMS/MMS Enrichment
- **PART 8:** Chat Edits
- **PART 9:** Scheduling Tables (catchup_plans, invitees, availability)
- **PART 10:** Sync Optimization Tables (token_health, circuit_breaker, sync_schedule, webhooks)

### How to Run:

1. **Open Cloud Console SQL Editor:**
   - Go to: https://console.cloud.google.com/sql/instances
   - Click on `catchup-db`
   - Click the **"SQL"** tab

2. **Copy and Paste the File:**
   - Open `scripts/migrations/000_all_migrations_pg15.sql` in VS Code
   - Select All (Cmd+A) and Copy (Cmd+C)
   - Paste into Cloud Console SQL editor
   - Click **RUN**

3. **Wait for Completion:**
   - The file is ~1150 lines, may take 30-60 seconds
   - Look for "Query successful" message
   - "Already exists" warnings are OK (idempotent)

### Verified Features:

- ✅ Uses `gen_random_uuid()` (PostgreSQL 15 compatible)
- ✅ All `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Simplified 3-step onboarding schema (migration 030)
- ✅ Group mapping suggestions table for Step 3
- ✅ 4-circle system (inner, close, active, casual)
- ✅ Sync optimization tables (token health, circuit breaker, webhooks)
- ✅ Tested locally - all 51 tables created successfully

---

## After Migrations Complete

### 1. Restart Cloud Run

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars=MIGRATIONS_COMPLETE=$(date +%s)
```

### 2. Reconnect Google Contacts

To trigger group sync:
1. Go to https://catchup.club → Preferences
2. Disconnect Google Contacts
3. Reconnect Google Contacts
4. Wait for sync to complete

### 3. Verify Everything Works

- ✅ Scheduling page loads without errors
- ✅ Groups show up in Directory
- ✅ Onboarding Step 3 shows mapping suggestions
- ✅ Contacts sync completes

### 4. Delete Cloud Memorystore (Save $60/month)

Once everything is working:

```bash
gcloud redis instances delete catchup-redis --region=us-central1
```

---

## Troubleshooting

**If the consolidated file fails:**
1. Note the error message
2. The file uses `IF NOT EXISTS` so you can re-run safely
3. If a specific table fails, check the individual migration file

**If you see "relation already exists":**
- This is OK! The migration is idempotent.

**If you see "syntax error":**
- Copy the error message
- Let me know which line failed
