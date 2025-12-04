# Task 14: Group Suggestion Generation Implementation

## Overview

Successfully integrated the GroupMatchingService into the test data generator to generate group suggestions with shared context scores. The implementation creates group suggestions for 2-3 contacts who share strong context (common groups, shared tags, or co-mentions in voice notes).

## Changes Made

### 1. Updated Test Data Generator (`src/contacts/test-data-generator.ts`)

**Modified `generateSuggestions` method:**
- Changed from calling `generateTimeboundSuggestions` to calling the enhanced `generateSuggestions` function
- The enhanced function generates both individual AND group suggestions
- Group suggestions are automatically created when contacts meet criteria

```typescript
// Before: Only individual suggestions
const { generateTimeboundSuggestions } = await import('../matching/suggestion-service');
const suggestions = await generateTimeboundSuggestions(userId, availableSlots);

// After: Both individual and group suggestions
const { generateSuggestions } = await import('../matching/suggestion-service');
const suggestions = await generateSuggestions(userId, availableSlots);
```

**Improved test data quality:**
- Changed last contact dates from 1-90 days ago to 30-180 days ago
- This ensures contacts are more likely to meet frequency thresholds
- Increases the chance of generating group suggestions

### 2. Group Suggestion Generation Flow

The system now follows this flow when generating suggestions:

1. **Seed Test Data** → Creates contacts with shared groups and tags
2. **Generate Suggestions** → Calls `generateSuggestions` in suggestion service
3. **Find Potential Groups** → GroupMatchingService analyzes all contacts
4. **Calculate Shared Context** → Scores based on:
   - Common groups: 10 points per group (max 30)
   - Shared tags: 5 points per tag (max 30)
   - Co-mentions in voice notes: 5 points per co-mention (max 25)
   - Recent group interactions: 5 points per interaction (max 15)
5. **Filter by Threshold** → Only groups with score >= 50 are considered
6. **Verify Frequency** → All contacts must meet their frequency thresholds
7. **Create Group Suggestions** → Store with type='group' and multiple contact IDs
8. **Balance Suggestions** → Ensure no contact appears in multiple suggestions

### 3. Group Suggestion Data Structure

Group suggestions are stored with:
- **type**: 'group' (vs 'individual')
- **contactIds**: Array of 2-3 contact IDs
- **sharedContext**: JSON object with score and factors
- **reasoning**: Text describing why these contacts should meet together
- **priority**: Calculated from average contact priority + shared context boost

Example reasoning:
```
"Group catchup opportunity: Common groups: Work Friends, Tech Meetup; Shared interests: tech, startup, coding"
```

### 4. Database Storage

Group suggestions use the existing schema:
- **suggestions table**: Stores the suggestion with type='group'
- **suggestion_contacts junction table**: Links suggestion to multiple contacts
- **shared_context JSON field**: Stores the detailed scoring breakdown

## Requirements Validation

✅ **Requirement 10.3**: Integrate GroupMatchingService to find potential groups
- The `generateSuggestions` function now calls `groupMatchingService.findPotentialGroups()`
- Analyzes all contacts to find groups of 2-3 with strong shared context

✅ **Requirement 10.5**: Generate group suggestions with shared context scores
- Shared context is calculated using the GroupMatchingService
- Scores are stored in the `shared_context` JSON field
- Only groups with score >= 50 (threshold) are created

✅ **Requirement 10.6**: Include reasoning based on common groups, shared tags, and co-mentions
- Reasoning is built from the shared context factors
- Includes common groups, shared interests (tags), and co-mentions
- Example: "Group catchup opportunity: Common groups: Work Friends; Shared interests: tech, startup"

## Testing

### Test Coverage

Added comprehensive tests in `src/contacts/test-data-generator.test.ts`:

1. **Group suggestion generation test**: Verifies that group suggestions are created when conditions are met
2. **Reasoning verification test**: Ensures reasoning includes shared context information
3. **Manual test with strong context**: Creates contacts with guaranteed strong shared context

### Test Results

All tests pass successfully. Group suggestions are generated when:
- Contacts have shared context score >= 50 points
- All contacts in the group meet their frequency thresholds
- Available time slots exist

### Why Group Suggestions May Not Always Appear

Group suggestions require strict criteria:
1. **High shared context score** (>= 50 points):
   - Need 5+ common groups, OR
   - 10+ shared tags, OR
   - Combination (e.g., 2 groups + 6 tags = 50 points)

2. **All contacts meet frequency thresholds**:
   - If ANY contact in the group doesn't meet their threshold, no group suggestion is created
   - This is by design to ensure suggestions are timely

3. **Available time slots**:
   - Group suggestions are matched to calendar slots
   - If all slots are used by individual suggestions, no group suggestions are created

## API Usage

### Generate Suggestions with Groups

```bash
POST /api/test-data/generate-suggestions
Authorization: Bearer <token>
Content-Type: application/json

{
  "daysAhead": 7
}
```

Response includes both individual and group suggestions:
```json
{
  "message": "Suggestions generated successfully",
  "suggestionsCreated": 8
}
```

### Query Group Suggestions

```sql
SELECT s.*, 
       (s.shared_context->>'score')::int as shared_context_score
FROM suggestions s
WHERE s.user_id = '<user_id>' 
  AND s.type = 'group';
```

### Get Contacts in Group Suggestion

```sql
SELECT c.*
FROM contacts c
JOIN suggestion_contacts sc ON c.id = sc.contact_id
WHERE sc.suggestion_id = '<suggestion_id>';
```

## Implementation Notes

### Shared Context Scoring

The scoring system is designed to identify groups with meaningful connections:

- **Common Groups** (30 points max): Contacts who are in the same groups (e.g., "Work Friends", "College Buddies")
- **Shared Tags** (30 points max): Contacts with overlapping interests/tags
- **Co-mentions** (25 points max): Contacts mentioned together in voice notes (requires voice notes feature)
- **Recent Interactions** (15 points max): Contacts who have interacted together recently

### Balancing Algorithm

The `balanceSuggestions` function ensures:
1. No contact appears in multiple suggestions (individual or group)
2. Suggestions are sorted by priority (highest first)
3. Both individual and group suggestions can coexist
4. Group suggestions are prioritized if they have higher priority scores

### Future Enhancements

To increase group suggestion generation:
1. **Add voice notes**: Co-mentions provide up to 25 additional points
2. **Lower threshold**: Consider reducing from 50 to 40 points
3. **Relax frequency check**: Allow group suggestions if majority (not all) contacts meet threshold
4. **Boost shared context**: Increase points for common groups (e.g., 15 points instead of 10)

## Verification

To verify the implementation works:

1. **Seed test data with many contacts**:
   ```bash
   POST /api/test-data/seed
   { "contactCount": 20, "includeCalendarEvents": true }
   ```

2. **Generate suggestions**:
   ```bash
   POST /api/test-data/generate-suggestions
   { "daysAhead": 14 }
   ```

3. **Check for group suggestions**:
   ```bash
   GET /api/suggestions?status=pending
   ```
   Look for suggestions with `type: "group"` and multiple contacts

4. **Verify shared context**:
   - Group suggestions should have `sharedContext` field
   - Score should be >= 50
   - Reasoning should mention common groups or shared interests

## Conclusion

The group suggestion generation feature is fully implemented and integrated into the test data generator. The system correctly:
- Identifies potential groups using GroupMatchingService
- Calculates shared context scores
- Generates group suggestions with proper reasoning
- Stores suggestions with type='group' and multiple contact IDs
- Balances individual and group suggestions

Group suggestions will appear when test data includes contacts with strong shared context (common groups, shared tags) and when those contacts meet their frequency thresholds.
