# Duplicate Enrichment Items Fix

## Problem
During voice note recording, duplicate enrichment items were appearing in the enrichment review UI. For example:
- Multiple "Emma Brown → tech" tag suggestions
- Multiple "Add Note: got promoted to senior product manager" items

This happened because:
1. The incremental enrichment analyzer triggers multiple times during recording
2. Each trigger re-extracts from the growing full transcript
3. The AI would extract the same information multiple times
4. Suggestions were being emitted to the UI **every time** enrichment was triggered, even if they were duplicates
5. The analyzer had deduplication in state, but suggestions were still being sent to the UI multiple times

## Root Cause
The issue was at **three levels**:
1. The enrichment service wasn't deduplicating when generating proposals
2. The analyzer wasn't catching all duplicates by value
3. **Most importantly**: Suggestions were being emitted to the UI without tracking which ones had already been sent

## Solution
Implemented three-level deduplication:

### 1. Enrichment Service Level (src/voice/enrichment-service.ts)
Added deduplication when generating enrichment proposals:
- Track added tags, groups, and fields using Sets with lowercase keys
- Before adding each item, check if it's already been added in this proposal
- Prevents duplicate tags, groups, fields, and dates within a single contact's proposal

**Key changes:**
- `addedTags` Set tracks tags already added (case-insensitive)
- `addedGroups` Set tracks groups already added (case-insensitive)
- `addedFields` Set tracks field:value combinations already added
- Each item is checked against these Sets before being added

### 2. Incremental Analyzer Level (src/voice/incremental-enrichment-analyzer.ts)
Enhanced deduplication during recording:
- Now deduplicates by both ID and suggestion key (type:value)
- Uses `getSuggestionKey()` to create a normalized key for comparison
- Filters out suggestions that match existing ones by value, not just ID

**Key changes:**
- Added value-based deduplication alongside ID-based deduplication
- Logs how many suggestions were filtered out during deduplication
- More robust handling of slight text variations

### 3. Voice Note Service Level (src/voice/voice-note-service.ts) - **THE KEY FIX**
Added tracking of emitted suggestions to prevent sending duplicates to the UI:
- Added `emittedSuggestionIds` Set to `VoiceNoteSession` interface
- Modified `analyzeForEnrichment()` to only emit **NEW** suggestions
- Tracks which suggestion IDs have already been sent to the frontend
- Filters suggestions before emitting to only include those not yet sent

**Key changes:**
- `session.emittedSuggestionIds` tracks all suggestions already sent
- Only suggestions with IDs not in this Set are emitted
- Prevents the same suggestion from being sent multiple times during recording
- Logs how many suggestions are new vs already emitted

## Impact
- **No more duplicate enrichment items in the UI** ✓
- Cleaner enrichment review experience
- Better handling of repeated extractions during long recordings
- Case-insensitive deduplication prevents "Tech" vs "tech" duplicates
- Live suggestions during recording are now truly deduplicated

## Testing
To verify the fix:
1. Record a voice note with repeated information about the same contact
2. Example: "Emma Brown got promoted to senior product manager and she's volunteering at a tech nonprofit"
3. Check that only one "tech" tag and one promotion note appear in the live toasts
4. Verify no duplicate items in the enrichment review UI
5. Check console logs to see deduplication in action

## Files Modified
- `src/voice/enrichment-service.ts` - Added deduplication in `generateProposal()`
- `src/voice/incremental-enrichment-analyzer.ts` - Enhanced deduplication in `triggerEnrichment()`
- `src/voice/voice-note-service.ts` - Added emission tracking in `analyzeForEnrichment()` and `VoiceNoteSession` interface
