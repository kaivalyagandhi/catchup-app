# Pending Edits Deduplication Plan

## Problem Statement

Pending edits are being duplicated when the same enrichment suggestion is processed multiple times. This occurs because:

1. **No deduplication at creation time**: The `POST /api/edits/pending` endpoint creates a new edit without checking if an identical edit already exists
2. **Multiple enrichment triggers**: The voice note service can trigger enrichment analysis multiple times (interim results, final results, debounced analysis), potentially creating duplicate suggestions
3. **No idempotency**: The enrichment review UI can apply the same suggestion multiple times if the user interacts with it repeatedly
4. **Session-level tracking insufficient**: While the `VoiceNoteService` tracks emitted suggestions per session, this doesn't prevent duplicates across the full lifecycle

## Root Causes

### 1. Enrichment Analysis Triggers Multiple Suggestions
- **Location**: `src/voice/voice-note-service.ts` - `analyzeForEnrichment()` method
- **Issue**: Interim results, final results, and debounced analysis can all trigger enrichment, potentially creating the same suggestion multiple times
- **Current tracking**: `emittedSuggestionIds` Set prevents re-emitting to UI, but doesn't prevent duplicate pending edits

### 2. No Duplicate Check in Edit Creation
- **Location**: `src/api/routes/edits.ts` - `POST /api/edits/pending` endpoint
- **Issue**: Directly calls `editService.createPendingEdit()` without checking for existing identical edits
- **Missing logic**: No query to check if an edit with the same parameters already exists

### 3. Enrichment Review UI Can Create Duplicates
- **Location**: `public/js/enrichment-review.js` - `applyAcceptedSuggestions()` method
- **Issue**: No deduplication check before calling `POST /api/edits/pending`
- **Scenario**: User clicks apply multiple times, or same suggestion appears in multiple modals

### 4. No Unique Constraint in Database
- **Location**: `scripts/migrations/` - pending_edits table schema
- **Issue**: No unique constraint on (user_id, session_id, edit_type, target_contact_id, field, proposed_value)
- **Impact**: Database allows duplicate rows

## Solution Architecture

### Phase 1: Database Layer (Unique Constraint)
Add a unique constraint to prevent duplicate rows at the database level.

**File**: `scripts/migrations/005_add_pending_edits_deduplication.sql`

```sql
-- Add unique constraint to prevent duplicate pending edits
ALTER TABLE pending_edits
ADD CONSTRAINT unique_pending_edit_per_session UNIQUE (
  user_id,
  session_id,
  edit_type,
  COALESCE(target_contact_id, ''),
  COALESCE(field, ''),
  proposed_value
);
```

**Rationale**: 
- Prevents duplicate rows at the database level
- Uses COALESCE to handle NULL values in unique constraint
- Scoped to session to allow same edit in different sessions

### Phase 2: Repository Layer (Duplicate Detection)
Add a method to check for existing edits before creation.

**File**: `src/edits/edit-repository.ts`

```typescript
/**
 * Check if a pending edit already exists with the same parameters
 * Returns the existing edit if found, null otherwise
 */
async findDuplicate(data: CreatePendingEditData): Promise<PendingEdit | null> {
  const result = await pool.query(
    `SELECT * FROM pending_edits 
     WHERE user_id = $1 
       AND session_id = $2 
       AND edit_type = $3 
       AND COALESCE(target_contact_id, '') = COALESCE($4, '')
       AND COALESCE(field, '') = COALESCE($5, '')
       AND proposed_value = $6
       AND status != 'dismissed'
     LIMIT 1`,
    [
      data.userId,
      data.sessionId,
      data.editType,
      data.targetContactId || null,
      data.field || null,
      JSON.stringify(data.proposedValue),
    ]
  );

  return result.rows.length > 0 ? this.mapRowToPendingEdit(result.rows[0]) : null;
}
```

### Phase 3: Service Layer (Idempotent Creation)
Update the edit service to check for duplicates before creating.

**File**: `src/edits/edit-service.ts`

```typescript
/**
 * Create a pending edit with deduplication
 * Returns existing edit if duplicate found, creates new one otherwise
 */
async createPendingEdit(params: CreateEditParams): Promise<PendingEdit> {
  const data: CreatePendingEditData = {
    userId: params.userId,
    sessionId: params.sessionId,
    editType: params.editType,
    targetContactId: params.targetContactId,
    targetContactName: params.targetContactName,
    targetGroupId: params.targetGroupId,
    targetGroupName: params.targetGroupName,
    field: params.field,
    proposedValue: params.proposedValue,
    confidenceScore: params.confidenceScore,
    source: params.source,
    status: 'pending',
  };

  // Check for existing duplicate
  const existingEdit = await this.editRepository.findDuplicate(data);
  if (existingEdit) {
    console.log(`[EditService] Duplicate edit detected, returning existing: ${existingEdit.id}`);
    return existingEdit;
  }

  // Determine if disambiguation is needed
  if (params.confidenceScore < DISAMBIGUATION_THRESHOLD && !params.targetContactId) {
    data.status = 'needs_disambiguation';
  }

  return this.editRepository.create(data);
}
```

### Phase 4: API Layer (Idempotent Response)
Update the API endpoint to handle duplicate responses gracefully.

**File**: `src/api/routes/edits.ts`

```typescript
router.post('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      sessionId,
      editType,
      targetContactId,
      targetContactName,
      targetGroupId,
      targetGroupName,
      field,
      proposedValue,
      confidenceScore,
      source,
    } = req.body;

    if (!sessionId || !editType || proposedValue === undefined || confidenceScore === undefined || !source) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, editType, proposedValue, confidenceScore, source',
      });
    }

    const edit = await editService.createPendingEdit({
      userId,
      sessionId,
      editType: editType as EditType,
      targetContactId,
      targetContactName,
      targetGroupId,
      targetGroupName,
      field,
      proposedValue,
      confidenceScore,
      source: source as EditSource,
    });

    // Return 200 if duplicate (idempotent), 201 if new
    const statusCode = edit.createdAt && 
      (Date.now() - edit.createdAt.getTime()) < 1000 ? 201 : 200;
    
    res.status(statusCode).json({ edit, isDuplicate: statusCode === 200 });
  } catch (error: any) {
    console.error('Error creating pending edit:', error);
    res.status(500).json({
      error: error.message || 'Failed to create pending edit',
    });
  }
});
```

### Phase 5: UI Layer (Client-Side Deduplication)
Add deduplication in the enrichment review UI.

**File**: `public/js/enrichment-review.js`

```typescript
/**
 * Apply accepted suggestions with deduplication
 */
async applyAcceptedSuggestions(contactId, contactName, suggestions) {
  try {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      console.error('[EnrichmentReview] Missing auth token or userId');
      return;
    }

    // Track which edits we've already created to prevent duplicates
    const createdEditIds = new Set();

    // Apply each accepted suggestion
    for (const suggestion of suggestions) {
      try {
        // Generate a deduplication key
        const dedupeKey = this.generateDedupeKey(suggestion);
        
        // Skip if we've already created this edit in this batch
        if (createdEditIds.has(dedupeKey)) {
          console.log('[EnrichmentReview] Skipping duplicate suggestion in batch:', dedupeKey);
          continue;
        }

        // ... rest of edit creation logic ...

        if (editResponse.ok) {
          const result = await editResponse.json();
          createdEditIds.add(dedupeKey);
          
          // Log if this was a duplicate (server returned 200 instead of 201)
          if (result.isDuplicate) {
            console.log('[EnrichmentReview] Server returned existing edit (duplicate):', result.edit.id);
          }
        }
      } catch (err) {
        console.error('[EnrichmentReview] Exception applying suggestion:', err);
      }
    }
  } catch (error) {
    console.error('[EnrichmentReview] Error applying accepted suggestions:', error);
  }
}

/**
 * Generate a deduplication key for a suggestion
 */
generateDedupeKey(suggestion) {
  return `${suggestion.type}:${suggestion.field || ''}:${JSON.stringify(suggestion.value)}`;
}
```

### Phase 6: Voice Service Enhancement (Prevent Duplicate Emissions)
Improve the voice note service to prevent duplicate suggestions from being emitted.

**File**: `src/voice/voice-note-service.ts`

```typescript
/**
 * Analyze transcript for incremental enrichment with deduplication
 */
private async analyzeForEnrichment(sessionId: string, newText: string): Promise<void> {
  try {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found for enrichment analysis`);
      return;
    }

    const userContacts = session.userContacts || [];
    
    // Process the new text
    const triggered = await this.enrichmentAnalyzer.processTranscript(
      sessionId, 
      newText, 
      true, 
      userContacts
    );
    
    if (triggered) {
      const allSuggestions = this.enrichmentAnalyzer.getSuggestions(sessionId);
      
      // Initialize emitted suggestions tracking if needed
      if (!session.emittedSuggestionIds) {
        session.emittedSuggestionIds = new Set();
      }
      
      // Filter to only NEW suggestions that haven't been emitted yet
      const newSuggestions = allSuggestions.filter(s => !session.emittedSuggestionIds!.has(s.id));
      
      if (newSuggestions && newSuggestions.length > 0) {
        // Mark these suggestions as emitted BEFORE emitting
        // This prevents race conditions if multiple analysis runs happen
        for (const suggestion of newSuggestions) {
          session.emittedSuggestionIds.add(suggestion.id);
        }
        
        // Group and emit suggestions
        const groupedByContact = this.groupSuggestionsByContact(newSuggestions);
        
        for (const [contactName, suggestions] of groupedByContact) {
          this.emit('enrichment_update', {
            sessionId,
            contactName,
            suggestions,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in incremental enrichment:', error);
  }
}
```

## Implementation Order

1. **Database Migration** (Phase 1)
   - Add unique constraint to pending_edits table
   - Ensures data integrity at the lowest level

2. **Repository Enhancement** (Phase 2)
   - Add `findDuplicate()` method
   - Enables duplicate detection queries

3. **Service Layer Update** (Phase 3)
   - Update `createPendingEdit()` to check for duplicates
   - Returns existing edit if found

4. **API Layer Update** (Phase 4)
   - Update endpoint to return appropriate status codes
   - Provides feedback to client about duplicates

5. **UI Layer Enhancement** (Phase 5)
   - Add client-side deduplication
   - Prevents duplicate submissions from UI

6. **Voice Service Refinement** (Phase 6)
   - Improve suggestion emission logic
   - Prevents duplicate suggestions at source

## Testing Strategy

### Unit Tests
- Test `findDuplicate()` with various parameter combinations
- Test `createPendingEdit()` returns existing edit for duplicates
- Test deduplication key generation in UI

### Integration Tests
- Create two identical suggestions in same session
- Verify only one pending edit is created
- Verify API returns 200 for duplicate, 201 for new

### End-to-End Tests
- Record voice note with repeated information
- Verify no duplicate pending edits are created
- Verify UI shows correct count of unique edits

## Rollout Plan

1. Deploy database migration first (backward compatible)
2. Deploy service layer changes (idempotent)
3. Deploy API layer changes (backward compatible)
4. Deploy UI layer changes (improves UX)
5. Monitor for duplicate edits in production
6. Clean up any existing duplicates if needed

## Monitoring & Metrics

- Track number of duplicate detection events
- Monitor API response codes (200 vs 201)
- Alert if duplicate rate exceeds threshold
- Log all duplicate detections for analysis

## Edge Cases to Handle

1. **NULL values in unique constraint**: Use COALESCE to handle optional fields
2. **JSON comparison**: Ensure proposed_value comparison works correctly
3. **Status changes**: Only check against non-dismissed edits
4. **Concurrent requests**: Database constraint provides final safety net
5. **Different sessions**: Allow same edit in different sessions
