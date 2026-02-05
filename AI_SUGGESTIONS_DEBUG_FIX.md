# AI Suggestions Debug & Fix

## Problem Discovered

When testing the AI suggestions feature, we found that **all 50 suggestions were being classified as "casual" circle**, which meant they weren't showing up in the UI because the API only returns suggestions for `inner`, `close`, and `active` circles.

### Server Logs Showed:
```
[AI Suggestions] Processing suggestion: ... circle: casual
[AI Suggestions] Processing suggestion: ... circle: casual
[AI Suggestions] Processing suggestion: ... circle: casual
...
[AI Suggestions] Grouped suggestions: { inner: 0, close: 0, active: 0 }
```

## Root Cause

Even with the initial threshold lowering (Inner: 75+, Close: 55+, Active: 35+), contacts were still scoring **below 35**, putting them all in the Casual category.

### Why Contacts Scored So Low:

1. **No interaction history**: New users have no CatchUp interaction logs
2. **Zero scores for missing data**: Frequency and recency factors returned 0 when no interactions existed
3. **Thresholds still too high**: Even with calendar events and metadata, scores weren't reaching 35+

### Example Scoring (Before Fix):
```
Calendar events: 0 (no shared events) = 0 points × 0.45 = 0
Metadata: email only = 8 points × 0.35 = 2.8
Contact age: 2 years = 70 points × 0.10 = 7
Frequency: no history = 0 points × 0.05 = 0
Recency: no history = 0 points × 0.05 = 0
---
Total weighted score: 9.8 → Casual (< 35)
```

## Solution Implemented

### 1. Further Lowered Thresholds (More Aggressive)

**New Thresholds**:
- **Inner Circle**: 65-100 (was 75-100, originally 85-100) - **20 point total reduction**
- **Close Friends**: 45-64 (was 55-74, originally 70-84) - **25 point total reduction**
- **Active Friends**: 25-44 (was 35-54, originally 50-69) - **25 point total reduction**
- **Casual Network**: 0-24 (was 0-34, originally 0-49)

### 2. Added Baseline Scores for Missing Data

**Frequency Factor**:
- **Before**: 0 points when no interaction history
- **After**: 25 points baseline when no interaction history
- **Rationale**: Don't penalize contacts for being new to CatchUp

**Recency Factor**:
- **Before**: 0 points when no interaction history
- **After**: 25 points baseline when no interaction history
- **Rationale**: Assume reasonable recency for new contacts

### 3. Added Debug Logging

Added console logging to track scoring:
```typescript
console.log(`[AI Suggestions] Weighted score: ${weightedScore.toFixed(2)}, factors:`, 
  factors.map(f => `${f.type}=${f.value.toFixed(1)} (weight=${f.weight})`).join(', '));
console.log(`[AI Suggestions] Determined circle: ${suggestedCircle} (confidence: ${confidence.toFixed(1)})`);
```

This helps diagnose why contacts are being assigned to specific circles.

## Expected Results After Fix

### Example Scoring (After Fix):
```
Calendar events: 0 (no shared events) = 0 points × 0.45 = 0
Metadata: email only = 8 points × 0.35 = 2.8
Contact age: 2 years = 70 points × 0.10 = 7
Frequency: no history = 25 points × 0.05 = 1.25 (baseline)
Recency: no history = 25 points × 0.05 = 1.25 (baseline)
---
Total weighted score: 12.3 → Still Casual (< 25)
```

### Better Example (Contact with Some Data):
```
Calendar events: 2 events = 55 points × 0.45 = 24.75
Metadata: email + phone + location = 33 points × 0.35 = 11.55
Contact age: 3 years = 85 points × 0.10 = 8.5
Frequency: no history = 25 points × 0.05 = 1.25 (baseline)
Recency: no history = 25 points × 0.05 = 1.25 (baseline)
---
Total weighted score: 47.3 → Close Friends (45-64) ✓
```

### Best Case (Well-Connected Contact):
```
Calendar events: 5 events = 85 points × 0.45 = 38.25
Metadata: full profile = 67 points × 0.35 = 23.45
Contact age: 5 years = 100 points × 0.10 = 10
Frequency: no history = 25 points × 0.05 = 1.25 (baseline)
Recency: no history = 25 points × 0.05 = 1.25 (baseline)
---
Total weighted score: 74.2 → Inner Circle (65-100) ✓
```

## Testing the Fix

### 1. Check Server Logs

After restarting the server, look for:
```
[AI Suggestions] Weighted score: XX.XX, factors: ...
[AI Suggestions] Determined circle: active (confidence: XX.X)
[AI Suggestions] Determined circle: close (confidence: XX.X)
[AI Suggestions] Determined circle: inner (confidence: XX.X)
```

You should now see a mix of circles, not just "casual".

### 2. Check API Response

The grouped suggestions should now have counts:
```
[AI Suggestions] Grouped suggestions: { inner: 2, close: 8, active: 15 }
```

Instead of:
```
[AI Suggestions] Grouped suggestions: { inner: 0, close: 0, active: 0 }
```

### 3. Check UI

- Inner Circle should show 2-5 suggestions
- Close Friends should show 5-10 suggestions
- Active Friends should show 10-20 suggestions

## Key Insights

### What Makes a Good Suggestion?

**For Inner Circle (65+ score)**:
- 5+ shared calendar events (85 points × 0.45 = 38.25)
- Rich metadata: email, phone, location, social profiles (67 points × 0.35 = 23.45)
- Older contact (5+ years = 100 points × 0.10 = 10)
- **Total**: ~72 points

**For Close Friends (45+ score)**:
- 2-3 shared calendar events (55-70 points × 0.45 = 24.75-31.5)
- Good metadata: email, phone, location (33 points × 0.35 = 11.55)
- Moderate age (2-3 years = 70-85 points × 0.10 = 7-8.5)
- **Total**: ~44-51 points

**For Active Friends (25+ score)**:
- 1 shared calendar event (40 points × 0.45 = 18)
- Basic metadata: email, phone (17 points × 0.35 = 5.95)
- Any age (50+ points × 0.10 = 5+)
- **Total**: ~29+ points

### What Doesn't Work Well?

**Contacts with only email** (no calendar events, no other metadata):
- Calendar: 0 × 0.45 = 0
- Metadata: 8 × 0.35 = 2.8
- Age: 50 × 0.10 = 5
- Baselines: 25 × 0.10 = 2.5
- **Total**: ~10 points → Casual

**Solution**: Encourage users to:
1. Add calendar events with contact emails as attendees
2. Fill in contact details (phone, location, social profiles)
3. Import older contacts from Google Contacts

## Monitoring

### Check Suggestion Distribution

Healthy distribution:
- **Inner**: 2-5 suggestions (most selective)
- **Close**: 5-15 suggestions (moderate)
- **Active**: 15-30 suggestions (most inclusive)
- **Casual**: Filtered out (not shown in UI)

Unhealthy distribution:
- **Inner**: 0 suggestions
- **Close**: 0 suggestions
- **Active**: 0 suggestions
- **Casual**: 50 suggestions (all filtered out)

### Adjust Thresholds If Needed

If still not enough suggestions:
- Lower Active threshold to 20 (from 25)
- Lower Close threshold to 40 (from 45)
- Lower Inner threshold to 60 (from 65)

If too many suggestions:
- Raise Active threshold to 30 (from 25)
- Raise Close threshold to 50 (from 45)
- Raise Inner threshold to 70 (from 65)

## Files Modified

1. `src/contacts/ai-suggestion-service.ts`
   - Lowered thresholds: Inner 65+, Close 45+, Active 25+
   - Added baseline scores: Frequency and Recency get 25 points when no data
   - Added debug logging for scoring
   - Updated weight comments

2. `AI_SUGGESTIONS_IMPROVEMENTS.md`
   - Updated threshold documentation
   - Updated scoring examples

## Next Steps

1. **Restart server**: `npm run dev`
2. **Test in browser**: Navigate to Manage Circles
3. **Check logs**: Look for varied circle assignments
4. **Verify UI**: Suggestions should appear in Inner, Close, and Active circles
5. **Click generate button**: Should refresh with new suggestions
6. **Monitor distribution**: Adjust thresholds if needed

## Success Criteria

✅ Server logs show suggestions for inner, close, and active circles
✅ API returns non-zero counts: `{ inner: X, close: Y, active: Z }`
✅ UI displays suggestion chips in multiple circles
✅ Generate button refreshes suggestions successfully
✅ Suggestions make sense based on contact data

## Rollback Plan

If issues persist, revert to even more aggressive thresholds:
- Inner: 60+ (from 65+)
- Close: 40+ (from 45+)
- Active: 20+ (from 25+)

Or increase baseline scores:
- Frequency: 30 (from 25)
- Recency: 30 (from 25)
