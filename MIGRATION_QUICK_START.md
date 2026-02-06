# Migration Quick Start Guide

## 🚀 Fastest Method (5 minutes)

### Cloud Console SQL Editor

1. Go to: https://console.cloud.google.com/sql/instances
2. Click `catchup-db` → **SQL** tab
3. Open `sync-optimization-migrations.sql` in this repo
4. Copy all content → Paste → Click **Run**
5. Done! ✅

---

## 🖥️ Command Line Method (10 minutes)

### Prerequisites
```bash
# Install Cloud SQL Proxy (one-time)
brew install cloud-sql-proxy
```

### Run Migrations

**Terminal 1:** Start proxy
```bash
cloud-sql-proxy catchup-479221:us-central1:catchup-db
```

**Terminal 2:** Run migrations
```bash
./scripts/run-migrations-cloud-sql.sh
# Choose option 1 (sync optimization migrations)
# Enter PostgreSQL password when prompted
```

---

## ✅ Verification

After running migrations:

```bash
# Connect to database
psql -h 127.0.0.1 -U postgres -d catchup_db

# Check tables exist
\dt token_health
\dt circuit_breaker_state
\dt sync_schedule

# Exit
\q
```

---

## 📦 Deploy Code

After migrations are complete:

```bash
npm run build
npm run deploy-production
```

---

## 🔍 Test in Production

1. Go to https://catchup.club
2. Refresh page
3. Check console - no errors ✅
4. Connect Google integrations
5. Check admin dashboard: https://catchup.club/admin/sync-health.html

---

## 📚 Full Documentation

See `RUN_PRODUCTION_MIGRATIONS.md` for detailed instructions and troubleshooting.

---

## 🆘 Troubleshooting

**"Cloud SQL Proxy not running"**
→ Start it: `cloud-sql-proxy catchup-479221:us-central1:catchup-db`

**"Could not connect"**
→ Check password, ensure proxy is running

**"Permission denied"**
→ Run: `chmod +x scripts/run-migrations-cloud-sql.sh`

**"Table already exists"**
→ This is fine! Migrations are idempotent.
