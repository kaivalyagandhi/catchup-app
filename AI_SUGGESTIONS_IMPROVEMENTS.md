# AI Suggestions Improvements

## Problem
AI suggestions for Inner Circle, Close Friends, and Active Friends were not showing up in the Manage Circles interface because:

1. **Thresholds were too strict**: Required scores of 85+ for Inner, 70+ for Close, 50+ for Active
2. **New users lack interaction history**: Scoring heavily weighted communication frequency (30%) and recency (25%), which new users don't have
3. **No manual trigger**: Users couldn't regenerate suggestions if they didn't appear initially

## Solution Implemented

### 1. Lowered Circle Assignment Thresholds

**File**: `src/contacts/ai-suggestion-service.ts`

**Changes**:
- **Inner Circle**: 65-100 (was 85-100) - **20 point reduction**
- **Close Friends**: 45-64 (was 70-84) - **25 point reduction**  
- **Active Friends**: 25-44 (was 50-69) - **25 point reduction**
- **Casual Network**: 0-24 (was 0-49)

This makes it much easier for contacts to qualify for suggestions, especially for new users without extensive interaction history.

**Rationale**: The original thresholds were calibrated for users with rich interaction history. New users need lower thresholds to see any suggestions at all.

### 2. Improved Onboarding Scoring Weights

**File**: `src/contacts/ai-suggestion-service.ts`

**Changes**:
```typescript
// OLD weights:
calendarScore * 0.35 +
metadataScore * 0.30 +
ageScore * 0.15 +
frequencyFactor * 0.10 +
recencyFactor * 0.10

// NEW weights:
calendarScore * 0.45 +      // +10% - strongest signal
metadataScore * 0.35 +      // +5% - second strongest
ageScore * 0.10 +           // -5%
frequencyFactor * 0.05 +    // -5%
recencyFactor * 0.05        // -5%
```

**Rationale**: For new users during onboarding:
- **Calendar events** (45%) are the strongest signal - shared meetings indicate close relationships
- **Metadata richness** (35%) shows how well the user knows the contact
- **Interaction history** (10% combined) is less reliable for new users

### 3. More Generous Calendar Event Scoring

**File**: `src/contacts/ai-suggestion-service.ts`

**Changes**:
```typescript
// OLD scoring:
20+ events = 100
10+ events = 85
5+ events = 70
2+ events = 50
1 event = 30

// NEW scoring:
10+ events = 100  // Lowered threshold
5+ events = 85    // Lowered threshold
3+ events = 70    // Lowered threshold
2 events = 55     // Increased score
1 event = 40      // Increased score
```

**Rationale**: Even a few shared calendar events are a strong signal of relationship depth.

### 4. Added "Generate AI Suggestions" Button

**File**: `public/js/circle-list-view.js`

**Features**:
- ✨ Sparkle icon button next to circle name
- Appears for Inner, Close, and Active circles only
- Calls `/api/ai/circle-suggestions` to regenerate suggestions
- Shows loading state while generating
- Displays success toast with count of new suggestions
- Mobile-responsive (hides text on small screens, shows icon only)

**UI Location**: 
```
[💜 Inner Circle] [✨ Generate AI Suggestions] [7/10]
```

**Button Styling**:
- Purple gradient background (matches AI theme)
- Sparkle animation on hover
- Disabled state while loading
- Responsive text hiding on mobile

## Testing

### Manual Testing Steps

1. **Test Lowered Thresholds**:
   - Navigate to Manage Circles in onboarding
   - Verify AI suggestions now appear for contacts with:
     - 3+ calendar events
     - Rich metadata (email, phone, location, etc.)
     - Older contacts in Google Contacts

2. **Test Generate Button**:
   - Click "✨ Generate AI Suggestions" button on any circle
   - Verify loading state appears
   - Verify suggestions are refreshed
   - Verify success toast shows count

3. **Test Mobile Responsiveness**:
   - Resize browser to mobile width
   - Verify button text hides, only sparkle icon shows
   - Verify button still works

### Expected Results

**Before Changes**:
- Few or no AI suggestions for new users
- Suggestions only for contacts with extensive interaction history

**After Changes**:
- More suggestions for contacts with:
  - Calendar event attendance (even 1-2 events)
  - Complete contact information
  - Longer contact age in Google Contacts
- Manual regeneration available via button
- Better coverage across Inner, Close, and Active circles

## API Endpoints Used

### GET /api/ai/circle-suggestions
- **Purpose**: Fetch AI suggestions grouped by circle
- **Response**: `{ suggestions: { inner: [], close: [], active: [] } }`
- **Used by**: CircleListView component on mount and manual generation

## Files Modified

1. `src/contacts/ai-suggestion-service.ts`
   - Lowered circle assignment thresholds
   - Adjusted onboarding scoring weights
   - Improved calendar event scoring

2. `public/js/circle-list-view.js`
   - Added generate button to circle headers
   - Added CSS for button styling
   - Added event listener for button clicks
   - Added `generateAISuggestions()` method

## Scoring Criteria Summary

### For New Users (Onboarding)

**High Priority Signals** (80% weight):
- **Calendar Events** (45%): Shared meetings/events
- **Metadata Richness** (35%): Email, phone, location, social profiles, notes

**Low Priority Signals** (20% weight):
- **Contact Age** (10%): How long contact has existed
- **Interaction History** (10%): Frequency and recency (if available)

### Circle Thresholds

| Circle | Score Range | Typical Contacts |
|--------|-------------|------------------|
| Inner Circle | 65-100 | 5+ calendar events, rich metadata, frequent contact |
| Close Friends | 45-64 | 3+ calendar events, good metadata, regular contact |
| Active Friends | 25-44 | 1-2 calendar events, some metadata, occasional contact |
| Casual Network | 0-24 | Minimal calendar events, basic metadata |

## Benefits

1. **Better Coverage**: More contacts qualify for suggestions
2. **User Control**: Manual regeneration via button
3. **New User Friendly**: Works well without interaction history
4. **Transparent**: Clear feedback on suggestion count
5. **Mobile Optimized**: Responsive button design

## Future Improvements

1. **Per-Circle Generation**: Generate suggestions for specific circle only (currently generates all)
2. **Confidence Display**: Show confidence scores on suggestion chips
3. **Reason Display**: Show why contact was suggested (calendar events, metadata, etc.)
4. **Batch Accept**: Accept all suggestions for a circle at once
5. **Learning**: Improve suggestions based on user accepts/rejects

## Related Documentation

- AI Suggestion Service: `src/contacts/ai-suggestion-service.ts`
- Circle List View: `public/js/circle-list-view.js`
- API Routes: `src/api/routes/ai-suggestions.ts`
- Onboarding Flow: `public/js/step2-circles-handler.js`
