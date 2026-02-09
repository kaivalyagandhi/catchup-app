# Run Migrations via Cloud Console - One by One

## Why One by One?

Consolidated SQL files often have syntax errors. Running migrations one by one is safer and shows exactly which migration fails (if any).

## Steps

### 1. Go to Cloud SQL Console

https://console.cloud.google.com/sql/instances

### 2. Click on `catchup-db`

### 3. Click the "SQL" tab

### 4. Run Each Migration (Copy/Paste Each One)

Open each file below, copy its contents, paste in the SQL editor, and click RUN:

#### Core Tables (001-005)
1. `scripts/migrations/001_create_core_tables.sql`
2. `scripts/migrations/002_create_interaction_suggestion_tables.sql`
3. `scripts/migrations/003_create_preferences_tables.sql`
4. `scripts/migrations/004_add_composite_indexes.sql`
5. `scripts/migrations/005_create_users_table.sql`

#### OAuth & Calendar (006-008)
6. `scripts/migrations/006_add_email_to_oauth_tokens.sql`
7. `scripts/migrations/006b_create_audit_logs_table.sql`
8. `scripts/migrations/007_create_calendar_events_table.sql`
9. `scripts/migrations/008_add_unique_constraints.sql`

#### Voice Notes & Enrichment (009-012)
10. `scripts/migrations/009_enhance_voice_notes_schema.sql`
11. `scripts/migrations/010_add_enrichment_data_column.sql`
12. `scripts/migrations/010b_enhance_suggestions_for_groups.sql`
13. `scripts/migrations/011_make_tags_user_specific.sql`
14. `scripts/migrations/012_add_name_to_users.sql`

#### Google Contacts (013-016)
15. `scripts/migrations/013_add_google_contacts_source_tracking.sql`
16. `scripts/migrations/014_create_google_contacts_sync_state.sql`
17. `scripts/migrations/015_create_google_contact_groups.sql`
18. `scripts/migrations/016_add_group_mapping_suggestions.sql`

#### Onboarding & SMS (017-020)
19. `scripts/migrations/017_create_contact_onboarding_schema.sql`
20. `scripts/migrations/018_create_sms_mms_enrichment_schema.sql`
21. `scripts/migrations/019_add_user_id_to_enrichment_items.sql`
22. `scripts/migrations/020_add_sms_performance_indexes.sql`

#### Google SSO & Memberships (021-024)
23. `scripts/migrations/021_add_google_sso_support.sql`
24. `scripts/migrations/022_fix_calendar_events_schema.sql`
25. `scripts/migrations/023_add_contact_google_memberships.sql`
26. `scripts/migrations/024_add_excluded_members_to_mappings.sql`

#### Chat Edits & Preferences (026-029)
27. `scripts/migrations/026_create_chat_edits_tables.sql`
28. `scripts/migrations/027_add_pending_edits_deduplication.sql`
29. `scripts/migrations/028_add_frequency_options.sql`
30. `scripts/migrations/029_add_ai_edit_tag_source.sql`

#### Onboarding Updates (030-035)
31. `scripts/migrations/030_update_contact_onboarding_for_simplified_circles.sql`
32. `scripts/migrations/031_create_onboarding_analytics_table.sql`
33. `scripts/migrations/032_add_tier1_foundation_schema.sql`
34. `scripts/migrations/033_add_circle_assignment_history.sql`
35. `scripts/migrations/034_add_trigger_type_to_onboarding.sql`
36. `scripts/migrations/035_add_reviewed_at_to_group_mappings.sql`

#### Scheduling & Admin (036-038)
37. `scripts/migrations/036_create_scheduling_tables.sql` ⭐ **IMPORTANT - Fixes scheduling errors**
38. `scripts/migrations/037_add_last_reminder_sent_to_plans.sql`
39. `scripts/migrations/038_add_admin_role_support.sql`

#### Sync Optimization (039-046)
40. `scripts/migrations/039_create_token_health_table.sql`
41. `scripts/migrations/040_create_circuit_breaker_state_table.sql`
42. `scripts/migrations/041_create_sync_schedule_table.sql`
43. `scripts/migrations/042_create_calendar_webhook_subscriptions_table.sql`
44. `scripts/migrations/043_create_sync_metrics_table.sql`
45. `scripts/migrations/044_create_token_health_notifications_table.sql`
46. `scripts/migrations/045_add_onboarding_until_to_sync_schedule.sql`
47. `scripts/migrations/046_create_webhook_notifications_table.sql`

---

## Quick Priority Migrations

If you just want to fix the immediate errors, run these:

### Fix Scheduling Errors:
- `scripts/migrations/036_create_scheduling_tables.sql`
- `scripts/migrations/037_add_last_reminder_sent_to_plans.sql`

### Fix Group Mappings:
- `scripts/migrations/016_add_group_mapping_suggestions.sql`
- `scripts/migrations/035_add_reviewed_at_to_group_mappings.sql`

### Add Sync Optimization:
- All migrations 039-046

---

## After Running Migrations

### Restart Cloud Run:

```bash
gcloud run services update catchup \
  --region=us-central1 \
  --update-env-vars=MIGRATIONS_COMPLETE=$(date +%s)
```

### Test:

1. Go to https://catchup.club
2. Refresh the page
3. Check:
   - Scheduling page loads
   - Groups show up
   - Onboarding Step 3 shows mappings

---

## Tips

- **"Table already exists" errors are OK** - migrations use `IF NOT EXISTS`
- **Run them in order** - later migrations depend on earlier ones
- **If one fails**, note which one and we can fix it
- **Takes 10-15 minutes** to run all 47 migrations

---

## Shortcut: Run Just the Missing Ones

If some tables already exist, you can skip to the ones that are missing. Based on the errors you saw, you definitely need:

- Migration 036 (scheduling tables)
- Migrations 039-046 (sync optimization)

