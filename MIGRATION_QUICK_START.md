# Run All 46 Migrations - Quick Start Guide

## Setup

1. **Open Cloud Console SQL Editor**: https://console.cloud.google.com/sql/instances
2. Click on `catchup-db`
3. Click the **"SQL"** tab
4. Keep this guide open in another window

## Instructions

For each migration below:
1. Open the file in your code editor (VS Code, etc.)
2. Copy the entire contents
3. Paste into the Cloud Console SQL editor
4. Click **RUN**
5. Wait for "Query successful" message
6. Move to next migration

**Note**: "Table already exists" or "Column already exists" errors are OK - migrations use `IF NOT EXISTS`.

---

## Migrations to Run (In Order)

**Note:** Migration 025 doesn't exist (skipped during development). Total: 46 migrations.

### Core Tables (001-005)

**1. Core Tables**
- File: `scripts/migrations/001_create_core_tables.sql`
- Creates: contacts, groups, tags, contact_tags, contact_groups

**2. Interaction Suggestions**
- File: `scripts/migrations/002_create_interaction_suggestion_tables.sql`
- Creates: interaction_suggestions, suggestion_triggers

**3. Preferences**
- File: `scripts/migrations/003_create_preferences_tables.sql`
- Creates: user_preferences, notification_preferences

**4. Composite Indexes**
- File: `scripts/migrations/004_add_composite_indexes.sql`
- Creates: Performance indexes

**5. Users Table**
- File: `scripts/migrations/005_create_users_table.sql`
- Creates: users table

---

### OAuth & Calendar (006-008)

**6. OAuth Email**
- File: `scripts/migrations/006_add_email_to_oauth_tokens.sql`
- Adds: email column to oauth_tokens

**7. Audit Logs**
- File: `scripts/migrations/006b_create_audit_logs_table.sql`
- Creates: audit_logs table

**8. Calendar Events**
- File: `scripts/migrations/007_create_calendar_events_table.sql`
- Creates: calendar_events table

**9. Unique Constraints**
- File: `scripts/migrations/008_add_unique_constraints.sql`
- Adds: Unique constraints for data integrity

---

### Voice Notes & Enrichment (009-012)

**10. Voice Notes Schema**
- File: `scripts/migrations/009_enhance_voice_notes_schema.sql`
- Enhances: voice_notes table

**11. Enrichment Data**
- File: `scripts/migrations/010_add_enrichment_data_column.sql`
- Adds: enrichment_data column

**12. Group Suggestions**
- File: `scripts/migrations/010b_enhance_suggestions_for_groups.sql`
- Enhances: suggestions for groups

**13. User-Specific Tags**
- File: `scripts/migrations/011_make_tags_user_specific.sql`
- Adds: user_id to tags

**14. User Names**
- File: `scripts/migrations/012_add_name_to_users.sql`
- Adds: name column to users

---

### Google Contacts (013-016)

**15. Google Contacts Tracking**
- File: `scripts/migrations/013_add_google_contacts_source_tracking.sql`
- Adds: Google Contacts source tracking

**16. Sync State**
- File: `scripts/migrations/014_create_google_contacts_sync_state.sql`
- Creates: google_contacts_sync_state table

**17. Contact Groups**
- File: `scripts/migrations/015_create_google_contact_groups.sql`
- Creates: google_contact_groups table

**18. Group Mapping Suggestions** ⭐ (Fixes onboarding step 3)
- File: `scripts/migrations/016_add_group_mapping_suggestions.sql`
- Adds: AI mapping suggestion fields

---

### Onboarding & SMS (017-020)

**19. Contact Onboarding**
- File: `scripts/migrations/017_create_contact_onboarding_schema.sql`
- Creates: contact_onboarding tables

**20. SMS/MMS Enrichment**
- File: `scripts/migrations/018_create_sms_mms_enrichment_schema.sql`
- Creates: SMS/MMS enrichment tables

**21. Enrichment User ID**
- File: `scripts/migrations/019_add_user_id_to_enrichment_items.sql`
- Adds: user_id to enrichment_items

**22. SMS Performance Indexes**
- File: `scripts/migrations/020_add_sms_performance_indexes.sql`
- Creates: Performance indexes for SMS

---

### Google SSO & Memberships (021-024)

**23. Google SSO**
- File: `scripts/migrations/021_add_google_sso_support.sql`
- Adds: Google SSO support

**24. Calendar Events Fix**
- File: `scripts/migrations/022_fix_calendar_events_schema.sql`
- Fixes: calendar_events schema

**25. Contact Memberships**
- File: `scripts/migrations/023_add_contact_google_memberships.sql`
- Creates: contact_google_memberships table

**26. Excluded Members**
- File: `scripts/migrations/024_add_excluded_members_to_mappings.sql`
- Adds: excluded_members to mappings

---

### Chat Edits & Preferences (026-029)

**27. Chat Edits**
- File: `scripts/migrations/026_create_chat_edits_tables.sql`
- Creates: chat_edits tables

**28. Pending Edits Deduplication**
- File: `scripts/migrations/027_add_pending_edits_deduplication.sql`
- Adds: Deduplication for pending edits

**29. Frequency Options**
- File: `scripts/migrations/028_add_frequency_options.sql`
- Adds: Frequency options

**30. AI Edit Tag Source**
- File: `scripts/migrations/029_add_ai_edit_tag_source.sql`
- Adds: AI edit tag source tracking

---

### Onboarding Updates (030-035)

**31. Simplified Circles**
- File: `scripts/migrations/030_update_contact_onboarding_for_simplified_circles.sql`
- Updates: Onboarding for simplified circles

**32. Onboarding Analytics**
- File: `scripts/migrations/031_create_onboarding_analytics_table.sql`
- Creates: onboarding_analytics table

**33. Tier 1 Foundation**
- File: `scripts/migrations/032_add_tier1_foundation_schema.sql`
- Adds: Tier 1 foundation schema

**34. Circle Assignment History**
- File: `scripts/migrations/033_add_circle_assignment_history.sql`
- Creates: circle_assignment_history table

**35. Trigger Type**
- File: `scripts/migrations/034_add_trigger_type_to_onboarding.sql`
- Adds: trigger_type to onboarding

**36. Reviewed At**
- File: `scripts/migrations/035_add_reviewed_at_to_group_mappings.sql`
- Adds: reviewed_at to group_mappings

---

### Scheduling & Admin (036-038)

**37. Scheduling Tables** ⭐ (Fixes scheduling page)
- File: `scripts/migrations/036_create_scheduling_tables.sql`
- Creates: catchup_plans, plan_invitees, invitee_availability, initiator_availability, invite_links, scheduling_preferences, scheduling_notifications, calendar_sharing_settings

**38. Last Reminder Sent**
- File: `scripts/migrations/037_add_last_reminder_sent_to_plans.sql`
- Adds: last_reminder_sent_at to catchup_plans

**39. Admin Role**
- File: `scripts/migrations/038_add_admin_role_support.sql`
- Adds: is_admin to users

---

### Sync Optimization (039-046)

**40. Token Health**
- File: `scripts/migrations/039_create_token_health_table.sql`
- Creates: token_health table

**41. Circuit Breaker**
- File: `scripts/migrations/040_create_circuit_breaker_state_table.sql`
- Creates: circuit_breaker_state table

**42. Sync Schedule**
- File: `scripts/migrations/041_create_sync_schedule_table.sql`
- Creates: sync_schedule table

**43. Calendar Webhooks**
- File: `scripts/migrations/042_create_calendar_webhook_subscriptions_table.sql`
- Creates: calendar_webhook_subscriptions table

**44. Sync Metrics**
- File: `scripts/migrations/043_create_sync_metrics_table.sql`
- Creates: sync_metrics table

**45. Token Health Notifications**
- File: `scripts/migrations/044_create_token_health_notifications_table.sql`
- Creates: token_health_notifications table

**46. Onboarding Until**
- File: `scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql`
- Adds: onboarding_until to sync_schedule

**47. Webhook Notifications**
- File: `scripts/migrations/046_create_webhook_notifications_table.sql`
- Creates: webhook_notifications table

---

## After All Migrations Complete

### 1. Restart Cloud Run

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars=MIGRATIONS_COMPLETE=$(date +%s)
```

### 2. Test Everything

Go to https://catchup.club and verify:

- ✅ Scheduling page loads without errors
- ✅ Groups show up in Directory
- ✅ Onboarding Step 3 shows mapping suggestions
- ✅ Contacts sync completes
- ✅ Calendar integration works

### 3. Delete Cloud Memorystore (Save $60/month)

Once everything is working:

```bash
# List instances to confirm name
gcloud redis instances list --region=us-central1

# Delete the instance
gcloud redis instances delete catchup-redis --region=us-central1
```

---

## Tips

- **Take your time**: 46 migrations will take 15-20 minutes
- **"Already exists" errors are OK**: Migrations use `IF NOT EXISTS`
- **If one fails**: Note which one and we can fix it
- **You can pause**: Come back anytime and continue where you left off
- **Check progress**: After every 10 migrations, refresh catchup.club to see improvements
- **Migration 025 is missing**: This is normal, skip from 024 to 026

---

## Troubleshooting

**If a migration fails:**
1. Copy the error message
2. Note which migration number failed
3. Let me know and I'll help fix it

**If you lose your place:**
- Check which tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
- Compare to migration list above

---

## Progress Tracker

You can check off migrations as you complete them:

- [ ] 001-005: Core Tables
- [ ] 006-009: OAuth & Calendar
- [ ] 010-014: Voice Notes & Enrichment
- [ ] 015-018: Google Contacts
- [ ] 019-022: Onboarding & SMS
- [ ] 023-026: Google SSO & Memberships
- [ ] 027-030: Chat Edits & Preferences
- [ ] 031-036: Onboarding Updates
- [ ] 037-039: Scheduling & Admin
- [ ] 040-047: Sync Optimization

Good luck! Let me know when you're done or if you hit any issues.
