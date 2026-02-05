# Admin Dashboard Testing Guide

## Your Account Status
✅ **Email**: kaivalya.gandhi@gmail.com  
✅ **Admin Status**: Already promoted to admin  
✅ **Server**: Running on localhost:3000

## Step-by-Step Testing Instructions

### 1. Access the Admin Dashboard

Open your browser and navigate to:
```
http://localhost:3000/admin/sync-health.html
```

**Expected Result**: 
- Dashboard loads successfully
- You should see the "Sync Health Dashboard" header
- No 403 Forbidden error (since you're an admin)

### 2. Check Authentication

**What to verify**:
- Dashboard should automatically use your JWT token from localStorage
- If you see a login prompt, make sure you're logged in to the main app first at `http://localhost:3000`

**Troubleshooting**:
- If you get 403 Forbidden: Open browser console and check if `localStorage.getItem('token')` returns a valid JWT
- If no token: Go to `http://localhost:3000`, log in with Google SSO, then return to admin dashboard

### 3. Review Dashboard Sections

The dashboard should display these sections:

#### A. Overview Metrics (Top Cards)
- **Total Users**: Count of users with Google integrations
- **Active Integrations**: Contacts and Calendar counts
- **Invalid Tokens**: Expired/revoked token counts
- **Open Circuit Breakers**: Users with blocked syncs
- **Sync Success Rate (24h)**: Percentage of successful syncs

#### B. API Calls Saved
- By Circuit Breaker
- By Adaptive Scheduling
- By Webhooks (Calendar only)
- Total Saved

#### C. Persistent Failures Table
- Lists users with sync failures >7 days
- Shows: Email, Integration, Last Success, Days Since, Failure Count, Last Error

#### D. Controls
- **Integration Filter**: All / Contacts / Calendar
- **Auto-refresh**: Every 5 minutes
- **Export CSV**: Download metrics

### 4. Test Filtering

**Action**: Click the integration filter dropdown

**Try**:
1. Select "Contacts" - should show only Contacts metrics
2. Select "Calendar" - should show only Calendar metrics
3. Select "All" - should show combined metrics

**Expected**: Metrics update based on filter selection

### 5. Test Auto-Refresh

**What to check**:
- Look for "Last refreshed: [timestamp]" at the top
- Wait 5 minutes and verify it auto-refreshes
- Or click the "Refresh Now" button to trigger manual refresh

### 6. Test CSV Export

**Action**: Click "Export CSV" button

**Expected**:
- CSV file downloads with filename like `sync-health-2024-01-01-120000.csv`
- File contains all metrics and persistent failures

### 7. Check Browser Console

**Action**: Open browser DevTools (F12) and check Console tab

**Look for**:
- No JavaScript errors
- API calls to `/api/admin/sync-health` succeeding (200 status)
- Log messages showing data loading

**Common Issues**:
- 403 Forbidden: Not authenticated or not admin
- 401 Unauthorized: Token expired, need to re-login
- Network errors: Server not running

### 8. Verify Data Accuracy

**If you have Google integrations connected**:

1. Check if your user appears in the metrics
2. Verify token health status matches your connection status
3. Check if sync success rate makes sense

**If no data appears**:
- This is normal if no background syncs have run yet
- Trigger a manual sync from the main app
- Or wait for the next scheduled sync (every 3 days for Contacts, 4 hours for Calendar)

### 9. Test with Multiple Users (Optional)

**If you have test accounts**:
1. Connect Google integrations for multiple users
2. Verify dashboard shows aggregated metrics
3. Check persistent failures table shows all affected users

### 10. Test Responsive Design

**Action**: Resize browser window or test on mobile

**Expected**:
- Dashboard adapts to smaller screens
- Tables become scrollable
- Cards stack vertically on mobile

## Expected Metrics (Fresh Install)

If this is a fresh installation or no syncs have run yet:

```
Total Users: 1 (you)
Active Integrations: 
  - Contacts: 1 (if connected)
  - Calendar: 1 (if connected)
Invalid Tokens: 0
Open Circuit Breakers: 0
Sync Success Rate: N/A (no syncs yet)
API Calls Saved: 0
Persistent Failures: 0
```

## After First Sync

After the first background sync runs (or manual sync):

```
Total Users: 1
Active Integrations: 1-2
Invalid Tokens: 0 (if tokens valid)
Open Circuit Breakers: 0 (if sync succeeded)
Sync Success Rate: 100% (if sync succeeded)
API Calls Saved: 0 (first sync, no optimization yet)
Persistent Failures: 0
```

## Troubleshooting

### Dashboard Won't Load
1. Check server is running: `npm run dev`
2. Check URL is correct: `http://localhost:3000/admin/sync-health.html`
3. Check browser console for errors

### 403 Forbidden Error
1. Verify you're logged in: Go to `http://localhost:3000`
2. Check admin status: `npm run promote-admin -- list`
3. Check JWT token in localStorage: `localStorage.getItem('token')`

### No Data Showing
1. Check if you have Google integrations connected
2. Trigger a manual sync: POST to `/api/sync/manual`
3. Wait for background sync to run
4. Check database tables: `SELECT * FROM sync_metrics LIMIT 10;`

### API Errors in Console
1. Check server logs for errors
2. Verify database is running
3. Check JWT token is valid

## Database Verification (Optional)

If you want to verify data directly in the database:

```sql
-- Check if optimization tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('token_health', 'circuit_breaker_state', 'sync_schedule', 'sync_metrics');

-- Check token health records
SELECT * FROM token_health ORDER BY last_checked DESC LIMIT 5;

-- Check sync metrics
SELECT * FROM sync_metrics ORDER BY created_at DESC LIMIT 10;

-- Check your admin status
SELECT email, is_admin, admin_promoted_at FROM users WHERE email = 'kaivalya.gandhi@gmail.com';
```

## Success Criteria

✅ Dashboard loads without errors  
✅ Authentication works (no 403/401 errors)  
✅ All sections render correctly  
✅ Filters work  
✅ Auto-refresh works  
✅ CSV export works  
✅ No JavaScript errors in console  
✅ Data displays correctly (if syncs have run)  

## Next Steps After Testing

1. **Connect Google Integrations** (if not already):
   - Go to main app
   - Connect Google Contacts and/or Calendar
   - Wait for first sync or trigger manual sync

2. **Monitor Over Time**:
   - Check dashboard daily
   - Watch for invalid tokens
   - Monitor sync success rate
   - Review persistent failures

3. **Test Edge Cases**:
   - Disconnect and reconnect Google account
   - Let token expire (after 7 days)
   - Trigger multiple sync failures
   - Test circuit breaker behavior

## Questions to Answer During Testing

1. Does the dashboard load successfully? ___
2. Are you authenticated as admin? ___
3. Do all sections render? ___
4. Do filters work? ___
5. Does auto-refresh work? ___
6. Does CSV export work? ___
7. Are there any console errors? ___
8. Does data display correctly? ___
9. Is the UI responsive? ___
10. Overall, does it work as expected? ___

## Report Issues

If you encounter any issues, note:
- What you were doing
- What you expected to happen
- What actually happened
- Any error messages (console or UI)
- Screenshots if helpful

---

**Ready to test!** Open http://localhost:3000/admin/sync-health.html and follow the steps above.
