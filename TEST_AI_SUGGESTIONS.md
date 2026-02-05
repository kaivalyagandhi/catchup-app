# Testing AI Suggestions Feature

## Overview

This guide helps you test the AI suggestions feature in the Manage Circles flow. The feature analyzes contacts and suggests which circle they should belong to based on various factors including calendar events, metadata richness, contact age, and **voice notes engagement** (NEW).

## Prerequisites

1. Server running: `npm run dev`
2. User logged in with Google SSO
3. At least 10-20 contacts imported from Google Contacts
4. Some contacts with calendar events (shared meetings)
5. (Optional) Some contacts with voice notes for testing voice notes factor

## What's New: Voice Notes Factor

The AI suggestion scoring now includes a **voice notes factor** (10% weight) that rewards contacts you've actively engaged with through voice notes:

**Scoring Components**:
- **Frequency** (0-40 points): Number of voice notes about the contact
  - 5+ notes = 40 points
  - 3-4 notes = 30 points
  - 2 notes = 20 points
  - 1 note = 10 points
- **Recency** (0-30 points): How recent the last voice note was
  - <7 days = 30 points
  - <30 days = 20 points
  - <90 days = 10 points
  - >90 days = 5 points
- **Enrichment** (0-30 points): Applied enrichments from voice notes
  - 10+ enrichments = 30 points
  - 5+ enrichments = 20 points
  - 2+ enrichments = 10 points
  - 1 enrichment = 5 points

**Total**: Up to 100 points × 10% weight = 10 points contribution to final score

## What to Test

### 1. Generate AI Suggestions Button

**Location**: Manage Circles page → Step 2 (Circles)

**Expected Behavior**:
- Purple gradient button with sparkle icon (✨) appears next to circle names
- Button text: "Generate AI Suggestions"
- On mobile: Only icon shows, text hidden
- Button appears for Inner, Close, and Active circles only (not Casual)
- Sparkle icon animates with a subtle pulse effect

**Test Steps**:
1. Navigate to Manage Circles
2. Go to Step 2 (Circles)
3. Look for the generate button next to each circle name
4. Verify button styling:
   - Purple gradient background
   - White text
   - Rounded corners
   - Sparkle icon (✨) on the left
5. Click the button
6. Button should show "Generating..." while loading
7. After ~2-3 seconds, AI suggestions should appear as dotted-outline pills

**Mobile Test**:
1. Resize browser to mobile width (<768px)
2. Button text should hide, only icon visible
3. Button should still be clickable and functional

### 2. AI Suggestion Pills

**Expected Behavior**:
- Dotted outline (not solid border)
- "AI" badge in purple gradient
- Checkmark button to accept
- Hover shows circle-specific color
- Smooth animations on appearance

**Test Steps**:
1. After generating suggestions, look for dotted-outline pills
2. Verify pill styling:
   - Dotted border (2px dashed)
   - Transparent background
   - "AI" badge with purple gradient
   - Checkmark button (✓) on the right
3. Hover over a suggestion:
   - Border color changes to circle-specific color
   - Background gets subtle tint
4. Click checkmark (✓) button to accept:
   - Pill becomes solid (accepted state)
   - Border changes to solid 1px
   - Background becomes filled
   - "AI" badge disappears
   - Remove button (×) appears
5. Click remove button (×) on accepted suggestion:
   - Pill reverts to dotted outline
   - "AI" badge reappears
   - Checkmark button returns

### 3. Suggestion Distribution

**Expected Results**:
- Inner Circle: 2-5 suggestions (most selective)
- Close Friends: 5-15 suggestions (moderate)
- Active Friends: 15-30 suggestions (most inclusive)
- Casual Network: No suggestions shown (filtered out)

**What Makes a Good Suggestion**:
- **Calendar Events** (40% weight): Shared calendar events with contact
- **Metadata Richness** (30% weight): Email, phone, location, social profiles
- **Voice Notes** (10% weight): Voice notes and enrichments (NEW)
- **Contact Age** (10% weight): How long contact has existed
- **Frequency** (5% weight): Interaction frequency (baseline 25 if no data)
- **Recency** (5% weight): Days since last contact (baseline 25 if no data)

### 4. Voice Notes Factor Testing (NEW)

**Objective**: Verify that contacts with voice notes get higher scores and appear in better circles.

**Test Scenario 1: Contact with No Voice Notes**
1. Find a contact with minimal data (just email)
2. Generate AI suggestions
3. Note which circle they appear in (likely Active or not at all)
4. Expected score: ~10-20 points → Casual or Active

**Test Scenario 2: Contact with 1 Voice Note**
1. Record a voice note about the same contact
2. Apply some enrichments (tags, fields)
3. Generate AI suggestions again
4. Contact should move up to a higher circle
5. Expected score boost: +10-20 points → Active or Close

**Test Scenario 3: Contact with Multiple Voice Notes**
1. Record 3-5 voice notes about a contact
2. Apply enrichments from each note
3. Generate AI suggestions
4. Contact should appear in Close or Inner circle
5. Expected score boost: +30-50 points → Close or Inner

**Test Scenario 4: Recent Voice Note**
1. Record a voice note about a contact today
2. Generate AI suggestions
3. Contact should get recency bonus
4. Expected score boost: +30 points from recency

**Verification Steps**:
1. Check server logs for voice notes scoring:
   ```
   [AI Suggestions] Weighted score: XX.XX, factors: 
     calendar_events=0.0 (weight=0.4), 
     communication_frequency=33.0 (weight=0.3), 
     multi_channel=45.0 (weight=0.1),  ← Voice notes factor
     recency=70.0 (weight=0.1), 
     ...
   ```
2. Verify `multi_channel` factor shows voice notes contribution
3. Check that contacts with voice notes have higher weighted scores
4. Confirm contacts with voice notes appear in higher circles

### 5. Scoring Thresholds

**Current Thresholds** (Updated 2026-02-04):
- **Inner Circle**: 65-100 points
- **Close Friends**: 45-64 points
- **Active Friends**: 25-44 points
- **Casual Network**: 0-24 points (filtered out)

**Example Scores**:

**Inner Circle Contact (74 points)**:
- Calendar: 5 events = 85 × 0.40 = 34.0
- Metadata: Full profile = 67 × 0.30 = 20.1
- Voice Notes: 3 notes, recent = 60 × 0.10 = 6.0
- Age: 5 years = 100 × 0.10 = 10.0
- Frequency: Baseline = 25 × 0.05 = 1.25
- Recency: Baseline = 25 × 0.05 = 1.25
- **Total**: 72.6 → Inner Circle ✓

**Close Friends Contact (47 points)**:
- Calendar: 2 events = 55 × 0.40 = 22.0
- Metadata: Good = 33 × 0.30 = 9.9
- Voice Notes: 1 note = 15 × 0.10 = 1.5
- Age: 2 years = 70 × 0.10 = 7.0
- Frequency: Baseline = 25 × 0.05 = 1.25
- Recency: Baseline = 25 × 0.05 = 1.25
- **Total**: 42.9 → Close Friends ✓

**Active Friends Contact (29 points)**:
- Calendar: 1 event = 40 × 0.40 = 16.0
- Metadata: Basic = 17 × 0.30 = 5.1
- Voice Notes: None = 0 × 0.10 = 0
- Age: 1 year = 55 × 0.10 = 5.5
- Frequency: Baseline = 25 × 0.05 = 1.25
- Recency: Baseline = 25 × 0.05 = 1.25
- **Total**: 29.1 → Active Friends ✓

## Debugging

### Check Server Logs

Look for these log messages:
```
[AI Suggestions] Weighted score: XX.XX, factors: 
  calendar_events=XX.X (weight=0.4), 
  communication_frequency=XX.X (weight=0.3), 
  multi_channel=XX.X (weight=0.1),  ← Voice notes factor
  recency=XX.X (weight=0.1), 
  ...
[AI Suggestions] Determined circle: active (confidence: XX.X)
[AI Suggestions] Grouped suggestions: { inner: 2, close: 8, active: 15 }
```

### Voice Notes Factor Debugging

**Check Database**:
```sql
-- Count voice notes per contact
SELECT 
  c.name,
  COUNT(DISTINCT vnc.voice_note_id) as note_count,
  COUNT(DISTINCT ei.id) as enrichment_count,
  MAX(vn.recording_timestamp) as last_note_date
FROM contacts c
LEFT JOIN voice_note_contacts vnc ON vnc.contact_id = c.id
LEFT JOIN voice_notes vn ON vnc.voice_note_id = vn.id
LEFT JOIN enrichment_items ei ON ei.voice_note_id = vn.id 
  AND ei.contact_id = vnc.contact_id 
  AND ei.applied = true
WHERE c.user_id = 'YOUR_USER_ID'
GROUP BY c.id, c.name
ORDER BY note_count DESC;
```

**Check Logs for Voice Notes Scoring**:
```
[AI Suggestions] Weighted score: 47.30, factors: 
  calendar_events=22.0 (weight=0.4), 
  communication_frequency=9.9 (weight=0.3), 
  multi_channel=15.0 (weight=0.1),  ← 1 voice note = 15 points
  recency=7.0 (weight=0.1), 
  ...
```

### Common Issues

**Issue**: All suggestions are "casual" (not showing in UI)
**Solution**: Check `AI_SUGGESTIONS_DEBUG_FIX.md` for threshold adjustments

**Issue**: No suggestions generated
**Solution**: 
- Add more contact details (phone, location, social profiles)
- Add calendar events with contact emails as attendees
- Import older contacts from Google Contacts
- Record voice notes about contacts

**Issue**: Voice notes factor not working
**Solution**:
- Verify voice notes are in `ready` or `applied` status
- Check enrichment items are marked as `applied = true`
- Verify contact_id matches in voice_note_contacts table
- Check server logs for voice notes query errors

**Issue**: Generate button doesn't work
**Solution**: Check browser console for errors, verify API endpoint is responding

## Success Criteria

✅ Generate button appears for Inner, Close, and Active circles
✅ Clicking button shows "Generating..." state
✅ Suggestions appear as dotted-outline pills with "AI" badge
✅ Accepting suggestion converts to solid pill
✅ Suggestions distributed across multiple circles (not all casual)
✅ **Contacts with voice notes appear in higher circles** (NEW)
✅ **Voice notes factor shows in server logs** (NEW)
✅ Server logs show varied circle assignments
✅ Mobile responsive (button text hides, icon only)

## Performance Notes

- Voice notes factor adds one database query per contact
- Query is optimized with JOINs and aggregation
- Typical query time: <10ms per contact
- Total suggestion generation: 2-5 seconds for 50 contacts

## Related Documentation

- `AI_SUGGESTIONS_IMPROVEMENTS.md` - Implementation details and changelog
- `AI_SUGGESTIONS_DEBUG_FIX.md` - Troubleshooting guide for scoring issues
- `AI_SUGGESTIONS_UI_GUIDE.md` - UI specifications and design
- `src/contacts/ai-suggestion-service.ts` - Scoring logic implementation
- `public/js/circle-list-view.js` - UI implementation with generate button
- `.kiro/steering/voice-notes-architecture.md` - Voice notes system architecture
