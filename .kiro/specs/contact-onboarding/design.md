# Design Document

## Overview

The Contact Onboarding feature provides a progressive, gamified experience for organizing contacts into social circles based on Dunbar's number theory. The system combines beautiful circular visualizations with AI-powered suggestions to help users quickly categorize their relationships and set preferences for staying in touch.

The feature serves three primary use cases:
1. **Initial onboarding** for new users with no contacts
2. **Post-import organization** after connecting Google Contacts or other sources
3. **Ongoing management** accessible anytime via a "Manage" button on the Contacts page

The design emphasizes progressive disclosure, smart defaults, and user control while maintaining a visually engaging experience that makes relationship management feel intuitive rather than overwhelming.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │   Circular   │  │  Weekly      │      │
│  │  Controller  │  │  Visualizer  │  │  Catchup     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Routes    │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                     Backend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │  Circle      │  │  AI          │      │
│  │  Service     │  │  Assignment  │  │  Suggestion  │      │
│  │              │  │  Service     │  │  Service     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │  Contact     │  │  Interaction │      │
│  │  Repository  │  │  Repository  │  │  Repository  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

### Component Responsibilities

**Frontend Components:**
- **OnboardingController**: Manages onboarding flow state, progress tracking, and navigation
- **CircularVisualizer**: Renders the concentric circles with contact dots, handles drag-and-drop
- **WeeklyCatchup**: Manages weekly review sessions and progress tracking

**Backend Services:**
- **OnboardingService**: Orchestrates onboarding flow, manages state persistence
- **CircleAssignmentService**: Handles circle assignment logic, validation, and updates
- **AISuggestionService**: Analyzes contacts and generates circle assignment suggestions

**Data Layer:**
- **OnboardingRepository**: Manages onboarding state and progress
- **ContactRepository**: Extended with circle assignment fields
- **InteractionRepository**: Provides data for AI analysis

## Components and Interfaces

### Frontend Components

#### OnboardingController

```typescript
interface OnboardingController {
  // State management
  initializeOnboarding(trigger: 'new_user' | 'post_import' | 'manage'): Promise<void>;
  saveProgress(): Promise<void>;
  resumeOnboarding(): Promise<OnboardingState>;
  
  // Navigation
  nextStep(): void;
  previousStep(): void;
  skipStep(): void;
  exitOnboarding(): void;
  
  // Progress tracking
  getProgress(): OnboardingProgress;
  markStepComplete(step: string): void;
}

interface OnboardingState {
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: string[];
  uncategorizedContacts: string[];
  categorizedContacts: string[];
  startedAt: Date;
  lastUpdatedAt: Date;
}

interface OnboardingProgress {
  totalContacts: number;
  categorizedContacts: number;
  percentComplete: number;
  currentMilestone: string;
  nextMilestone: string;
}

type OnboardingStep = 
  | 'welcome'
  | 'import_contacts'
  | 'circle_assignment'
  | 'preference_setting'
  | 'group_overlay'
  | 'completion';
```

#### CircularVisualizer

```typescript
interface CircularVisualizer {
  // Rendering
  render(contacts: ContactWithCircle[], groups?: Group[]): void;
  updateContact(contactId: string, newCircle: DunbarCircle): void;
  highlightCircle(circle: DunbarCircle): void;
  
  // Interaction
  enableDragDrop(): void;
  disableDragDrop(): void;
  onContactDrag(callback: (contactId: string, targetCircle: DunbarCircle) => void): void;
  onContactClick(callback: (contactId: string) => void): void;
  
  // Group overlay
  showGroupFilter(groupId: string): void;
  clearGroupFilter(): void;
  
  // Animation
  animateTransition(contactId: string, fromCircle: DunbarCircle, toCircle: DunbarCircle): void;
  celebrateMilestone(milestone: string): void;
}

interface ContactWithCircle {
  id: string;
  name: string;
  initials: string;
  circle: DunbarCircle | null;
  groups: string[];
  color: string;
  aiSuggestion?: {
    circle: DunbarCircle;
    confidence: number;
    reason: string;
  };
}

type DunbarCircle = 'inner' | 'close' | 'active' | 'casual' | 'acquaintance';

interface CircleDefinition {
  id: DunbarCircle;
  name: string;
  description: string;
  recommendedSize: number;
  maxSize: number;
  defaultFrequency: string;
  color: string;
}
```

#### WeeklyCatchupManager

```typescript
interface WeeklyCatchupManager {
  // Session management
  startSession(): Promise<WeeklyCatchupSession>;
  completeSession(): Promise<void>;
  skipSession(): Promise<void>;
  
  // Contact review
  getNextContact(): ContactReviewItem | null;
  markContactReviewed(contactId: string, action: ReviewAction): Promise<void>;
  
  // Progress
  getSessionProgress(): SessionProgress;
}

interface WeeklyCatchupSession {
  id: string;
  userId: string;
  weekNumber: number;
  year: number;
  contactsToReview: ContactReviewItem[];
  reviewedContacts: string[];
  startedAt: Date;
  estimatedMinutes: number;
}

interface ContactReviewItem {
  contact: ContactWithCircle;
  reviewType: 'categorize' | 'maintain' | 'prune';
  lastInteraction?: Date;
  suggestedAction?: string;
}

type ReviewAction = 'keep' | 'archive' | 'update_circle' | 'set_preference';

interface SessionProgress {
  totalContacts: number;
  reviewedContacts: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
}
```

### Backend Services

#### OnboardingService

```typescript
interface OnboardingService {
  // Initialization
  initializeOnboarding(userId: string, trigger: OnboardingTrigger): Promise<OnboardingState>;
  getOnboardingState(userId: string): Promise<OnboardingState | null>;
  
  // Progress management
  updateProgress(userId: string, step: string, data: any): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  
  // Contact categorization
  getUncategorizedContacts(userId: string): Promise<Contact[]>;
  batchCategorizeContacts(userId: string, assignments: CircleAssignment[]): Promise<void>;
}

interface OnboardingTrigger {
  type: 'new_user' | 'post_import' | 'manage';
  source?: 'google' | 'manual';
  contactCount?: number;
}

interface CircleAssignment {
  contactId: string;
  circle: DunbarCircle;
  confidence?: number;
  userOverride?: boolean;
}
```

#### CircleAssignmentService

```typescript
interface CircleAssignmentService {
  // Assignment
  assignToCircle(userId: string, contactId: string, circle: DunbarCircle): Promise<void>;
  batchAssign(userId: string, assignments: CircleAssignment[]): Promise<void>;
  
  // Validation
  validateCircleCapacity(userId: string, circle: DunbarCircle): CircleCapacityStatus;
  getCircleDistribution(userId: string): CircleDistribution;
  
  // Recommendations
  suggestCircleRebalancing(userId: string): RebalancingSuggestion[];
}

interface CircleCapacityStatus {
  circle: DunbarCircle;
  currentSize: number;
  recommendedSize: number;
  maxSize: number;
  status: 'under' | 'optimal' | 'over';
  message?: string;
}

interface CircleDistribution {
  inner: number;
  close: number;
  active: number;
  casual: number;
  acquaintance: number;
  uncategorized: number;
  total: number;
}

interface RebalancingSuggestion {
  contactId: string;
  currentCircle: DunbarCircle;
  suggestedCircle: DunbarCircle;
  reason: string;
  confidence: number;
}
```

#### AISuggestionService

```typescript
interface AISuggestionService {
  // Analysis
  analyzeContact(userId: string, contactId: string): Promise<CircleSuggestion>;
  batchAnalyze(userId: string, contactIds: string[]): Promise<CircleSuggestion[]>;
  
  // Learning
  recordUserOverride(userId: string, contactId: string, 
                     suggested: DunbarCircle, actual: DunbarCircle): Promise<void>;
  improveModel(userId: string): Promise<void>;
}

interface CircleSuggestion {
  contactId: string;
  suggestedCircle: DunbarCircle;
  confidence: number;
  factors: SuggestionFactor[];
  alternativeCircles: Array<{
    circle: DunbarCircle;
    confidence: number;
  }>;
}

interface SuggestionFactor {
  type: 'communication_frequency' | 'recency' | 'consistency' | 
        'calendar_events' | 'response_time' | 'multi_channel';
  weight: number;
  value: number;
  description: string;
}
```

### API Routes

```typescript
// Onboarding endpoints
POST   /api/onboarding/initialize
GET    /api/onboarding/state
PUT    /api/onboarding/progress
POST   /api/onboarding/complete

// Circle assignment endpoints
POST   /api/circles/assign
POST   /api/circles/batch-assign
GET    /api/circles/distribution
GET    /api/circles/capacity/:circle
GET    /api/circles/suggestions/rebalance

// AI suggestion endpoints
POST   /api/ai/suggest-circle
POST   /api/ai/batch-suggest
POST   /api/ai/record-override

// Weekly catchup endpoints
POST   /api/weekly-catchup/start
GET    /api/weekly-catchup/current
POST   /api/weekly-catchup/review
POST   /api/weekly-catchup/complete
POST   /api/weekly-catchup/skip
```

## Data Models

### Database Schema Extensions

```sql
-- Onboarding state table
CREATE TABLE onboarding_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_step VARCHAR(50) NOT NULL,
  completed_steps JSONB DEFAULT '[]',
  trigger_type VARCHAR(20) NOT NULL, -- 'new_user', 'post_import', 'manage'
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress_data JSONB DEFAULT '{}',
  UNIQUE(user_id)
);

-- Add circle assignment to contacts table
ALTER TABLE contacts ADD COLUMN dunbar_circle VARCHAR(20);
ALTER TABLE contacts ADD COLUMN circle_assigned_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN circle_confidence DECIMAL(3,2);
ALTER TABLE contacts ADD COLUMN ai_suggested_circle VARCHAR(20);

-- Circle assignment history
CREATE TABLE circle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  from_circle VARCHAR(20),
  to_circle VARCHAR(20) NOT NULL,
  assigned_by VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
  confidence DECIMAL(3,2),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT
);

-- AI learning data
CREATE TABLE ai_circle_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  suggested_circle VARCHAR(20) NOT NULL,
  actual_circle VARCHAR(20) NOT NULL,
  factors JSONB,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Weekly catchup sessions
CREATE TABLE weekly_catchup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  contacts_to_review JSONB NOT NULL,
  reviewed_contacts JSONB DEFAULT '[]',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  skipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, year, week_number)
);

-- Gamification data
CREATE TABLE onboarding_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_data JSONB,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE network_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  circle_balance_score INTEGER,
  engagement_score INTEGER,
  maintenance_score INTEGER,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_onboarding_state_user ON onboarding_state(user_id);
CREATE INDEX idx_contacts_circle ON contacts(user_id, dunbar_circle);
CREATE INDEX idx_circle_assignments_contact ON circle_assignments(contact_id);
CREATE INDEX idx_circle_assignments_user_date ON circle_assignments(user_id, assigned_at DESC);
CREATE INDEX idx_ai_overrides_user ON ai_circle_overrides(user_id);
CREATE INDEX idx_weekly_catchup_user_date ON weekly_catchup_sessions(user_id, year DESC, week_number DESC);
CREATE INDEX idx_achievements_user ON onboarding_achievements(user_id, earned_at DESC);
CREATE INDEX idx_network_health_user ON network_health_scores(user_id, calculated_at DESC);
```

### TypeScript Interfaces

```typescript
interface OnboardingStateRecord {
  id: string;
  userId: string;
  currentStep: OnboardingStep;
  completedSteps: string[];
  triggerType: 'new_user' | 'post_import' | 'manage';
  startedAt: Date;
  lastUpdatedAt: Date;
  completedAt?: Date;
  progressData: {
    categorizedCount: number;
    totalCount: number;
    milestonesReached: string[];
    timeSpent: number;
  };
}

interface CircleAssignmentRecord {
  id: string;
  userId: string;
  contactId: string;
  fromCircle?: DunbarCircle;
  toCircle: DunbarCircle;
  assignedBy: 'user' | 'ai' | 'system';
  confidence?: number;
  assignedAt: Date;
  reason?: string;
}

interface WeeklyCatchupSessionRecord {
  id: string;
  userId: string;
  weekNumber: number;
  year: number;
  contactsToReview: ContactReviewItem[];
  reviewedContacts: string[];
  startedAt: Date;
  completedAt?: Date;
  skipped: boolean;
}

interface Achievement {
  id: string;
  userId: string;
  achievementType: AchievementType;
  achievementData: any;
  earnedAt: Date;
}

type AchievementType = 
  | 'first_contact_categorized'
  | 'inner_circle_complete'
  | 'all_contacts_categorized'
  | 'week_streak_3'
  | 'week_streak_10'
  | 'balanced_network'
  | 'network_health_excellent';

interface NetworkHealthScore {
  id: string;
  userId: string;
  score: number;
  circleBalanceScore: number;
  engagementScore: number;
  maintenanceScore: number;
  calculatedAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework, I've identified several areas where properties can be consolidated or where redundancy exists:

**Consolidation Opportunities:**
- Properties 2.5 and 9.5 both test AI learning from user corrections - these can be combined into one comprehensive property
- Properties 5.3 and 3.3 both test immediate state updates - these share the same underlying invariant
- Properties 6.4 and 5.4 both test round-trip state preservation - these can be generalized into one property about UI state preservation
- Properties 8.1, 8.2, 8.4, and 8.5 all test gamification metric updates - these can be combined into a property about metric consistency

**Redundancy Elimination:**
- Property 4.2 (rendering dots for assigned contacts) is subsumed by the general rendering requirements
- Property 11.1 (displaying count) is a specific case of the general UI update property
- Properties 10.2 and 10.4 both test default preference application - these overlap significantly

After reflection, the unique, non-redundant properties are focused on:
1. Data preservation during state transitions (imports, assignments, archives)
2. AI suggestion generation and learning
3. Circle capacity validation
4. State persistence across sessions
5. Batch operation consistency
6. Privacy and data isolation

### Correctness Properties

Property 1: Contact metadata preservation during import
*For any* contact imported from an external source, all source metadata (resource names, group memberships, sync timestamps) should be preserved in the local database after import completes
**Validates: Requirements 2.2**

Property 2: Onboarding state persistence
*For any* onboarding session that is exited before completion, resuming the session should restore the exact state including categorized contacts, current step, and progress data
**Validates: Requirements 1.5**

Property 3: Circle assignment immediacy
*For any* contact assignment to a circle (whether by drag-drop, batch operation, or AI suggestion acceptance), the contact's circle field should be updated in the database before the operation returns success
**Validates: Requirements 3.3, 5.3**

Property 4: Drag operation cancellation
*For any* contact that is dragged but not dropped (cancelled), the contact should remain in its original circle with no state changes persisted
**Validates: Requirements 5.4**

Property 5: Batch operation atomicity
*For any* batch assignment of multiple contacts to a circle, either all contacts should be assigned successfully or none should be assigned (all-or-nothing)
**Validates: Requirements 5.5**

Property 6: Group filter correctness
*For any* group filter applied to the circular visualization, all displayed contacts should belong to that group and all contacts belonging to that group should be displayed
**Validates: Requirements 6.2**

Property 7: UI state round-trip preservation
*For any* UI state (group view, filters, selections), toggling the state on then off should restore the original visualization without data loss
**Validates: Requirements 6.4**

Property 8: Weekly catchup contact rescheduling
*For any* Weekly Catchup session that is skipped, all unreviewed contacts from that session should appear in the next generated session
**Validates: Requirements 7.4**

Property 9: AI suggestion generation completeness
*For any* set of imported contacts, the AI suggestion service should generate a circle suggestion with a confidence score for each contact
**Validates: Requirements 1.3, 9.1, 9.2**

Property 10: AI learning from corrections
*For any* user override of an AI suggestion, the system should record the override and subsequent suggestions for similar contacts should reflect the learned pattern
**Validates: Requirements 2.5, 9.5**

Property 11: Preference inheritance from circle assignment
*For any* contact assigned to Inner Circle or Close Friends without explicit preferences, the system should apply default frequency preferences matching that circle's recommended frequency
**Validates: Requirements 10.2, 10.4**

Property 12: Preference influence on suggestions
*For any* contact with saved frequency preferences, future contact suggestions should respect those preferences when calculating suggestion timing
**Validates: Requirements 10.3**

Property 13: Archive data preservation
*For any* contact that is archived, all contact data (name, circle assignment, preferences, tags, groups) should be preserved and retrievable, with only the archived flag changed
**Validates: Requirements 12.2**

Property 14: Archive-reactivate round trip
*For any* contact that is archived then reactivated, the contact should be restored to its previous circle assignment with all preferences intact
**Validates: Requirements 12.5**

Property 15: Circle count consistency
*For any* operation that adds or removes contacts from circles (assignment, archive, delete), the circle distribution counts should accurately reflect the number of contacts in each circle
**Validates: Requirements 12.4**

Property 16: Uncategorized contact prioritization
*For any* set of contacts containing both categorized and uncategorized contacts, when displayed in management mode, all uncategorized contacts should appear before any categorized contacts
**Validates: Requirements 11.3**

Property 17: New contact flagging
*For any* contact added after onboarding completion, the contact should be flagged as uncategorized and included in the next Weekly Catchup session
**Validates: Requirements 11.5**

Property 18: Gamification metric consistency
*For any* user action that affects network state (categorizing contacts, completing sessions, maintaining streaks), all related gamification metrics (progress percentage, achievement badges, health scores) should be updated consistently
**Validates: Requirements 8.1, 8.2, 8.4, 8.5**

Property 19: Mobile touch gesture support
*For any* contact dot displayed on a mobile device, touch gestures (tap, long-press, drag) should trigger the same state changes as mouse interactions on desktop
**Validates: Requirements 13.2**

Property 20: Orientation change state preservation
*For any* mobile device orientation change during onboarding, all UI state (selected contacts, current step, form data) should be preserved without loss
**Validates: Requirements 13.5**

Property 21: Circle information display
*For any* circle in the visualization, hovering or tapping should display information including recommended size, current size, and relationship characteristics
**Validates: Requirements 14.2**

Property 22: Imbalance detection and suggestion
*For any* circle distribution where a circle exceeds 150% of its recommended size, the system should generate rebalancing suggestions identifying contacts to move
**Validates: Requirements 14.4**

Property 23: Data privacy isolation
*For any* contact categorization or circle assignment, the data should be stored in the user's private database partition with no cross-user data leakage
**Validates: Requirements 15.2**

Property 24: Data export completeness
*For any* user data export request, the exported data should include all contacts, circle assignments, preferences, and onboarding history in a structured format
**Validates: Requirements 15.4**

Property 25: Account deletion completeness
*For any* account deletion, all related data (contacts, circle assignments, onboarding state, achievements, weekly catchup sessions) should be permanently removed from the database
**Validates: Requirements 15.5**

## Error Handling

### User Input Validation

**Circle Assignment Validation:**
- Validate circle name is one of the five valid Dunbar circles
- Validate contact exists and belongs to the user
- Validate user has permission to modify the contact
- Provide clear error messages for invalid assignments

**Batch Operation Validation:**
- Validate all contact IDs exist before starting batch operation
- Validate user owns all contacts in the batch
- Use database transactions to ensure atomicity
- Rollback on any failure with detailed error reporting

**Preference Validation:**
- Validate frequency preferences are valid enum values
- Validate custom frequencies are within reasonable bounds (1 day to 1 year)
- Provide defaults for missing or invalid preferences
- Warn users about unrealistic frequency settings

### AI Service Error Handling

**Suggestion Generation Failures:**
- Gracefully degrade to manual categorization if AI service is unavailable
- Cache previous suggestions to provide fallback recommendations
- Log AI failures for monitoring and improvement
- Never block onboarding flow due to AI failures

**Low Confidence Handling:**
- When confidence is below 30%, present multiple options without pre-selection
- When confidence is 30-70%, suggest but allow easy override
- When confidence is above 70%, pre-select but still allow override
- Always show confidence scores to users for transparency

### Data Consistency

**Concurrent Modification Handling:**
- Use optimistic locking for contact updates
- Detect and resolve conflicts when multiple devices modify same contact
- Provide conflict resolution UI when automatic resolution fails
- Preserve user intent in conflict resolution

**State Synchronization:**
- Ensure onboarding state is synchronized across devices
- Handle offline modifications with conflict resolution on reconnect
- Validate state consistency before allowing onboarding completion
- Provide recovery mechanisms for corrupted state

### Network and Performance

**Timeout Handling:**
- Set reasonable timeouts for all API calls (5s for reads, 10s for writes)
- Provide retry logic with exponential backoff
- Show loading states during long operations
- Allow users to cancel long-running operations

**Large Dataset Handling:**
- Paginate contact lists for users with 500+ contacts
- Use virtual scrolling for circular visualization with many contacts
- Batch AI analysis requests to avoid overwhelming the service
- Provide progress indicators for batch operations

## Testing Strategy

### Unit Testing

**Component Testing:**
- Test OnboardingController state transitions
- Test CircularVisualizer rendering logic
- Test CircleAssignmentService validation rules
- Test AISuggestionService analysis algorithms
- Test data repository CRUD operations

**Edge Cases:**
- Empty contact lists
- Single contact
- Exactly at circle capacity limits
- Contacts with minimal data (name only)
- Contacts with complete data
- Very long contact names
- Special characters in names
- Null/undefined handling

**Error Conditions:**
- Invalid circle names
- Non-existent contact IDs
- Unauthorized access attempts
- Database connection failures
- AI service unavailability
- Malformed API requests

### Property-Based Testing

The property-based testing approach will use **fast-check** (for TypeScript/JavaScript) to verify the correctness properties defined above. Each property test should run a minimum of 100 iterations with randomly generated data.

**Test Configuration:**
```typescript
import fc from 'fast-check';

// Configure property tests to run 100+ iterations
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now() // For reproducibility
};
```

**Property Test Examples:**

**Property 2: Onboarding state persistence**
```typescript
// Feature: contact-onboarding, Property 2: Onboarding state persistence
// Validates: Requirements 1.5
fc.assert(
  fc.property(
    fc.record({
      userId: fc.uuid(),
      currentStep: fc.constantFrom('welcome', 'import_contacts', 'circle_assignment', 'preference_setting', 'completion'),
      categorizedContacts: fc.array(fc.uuid(), { maxLength: 50 }),
      progressData: fc.record({
        categorizedCount: fc.nat(100),
        totalCount: fc.nat(100)
      })
    }),
    async (onboardingState) => {
      // Save state and exit
      await onboardingService.saveProgress(onboardingState);
      await onboardingService.exitOnboarding(onboardingState.userId);
      
      // Resume and verify state is restored
      const resumedState = await onboardingService.resumeOnboarding(onboardingState.userId);
      
      expect(resumedState.currentStep).toBe(onboardingState.currentStep);
      expect(resumedState.categorizedContacts).toEqual(onboardingState.categorizedContacts);
      expect(resumedState.progressData).toEqual(onboardingState.progressData);
    }
  ),
  propertyTestConfig
);
```

**Property 5: Batch operation atomicity**
```typescript
// Feature: contact-onboarding, Property 5: Batch operation atomicity
// Validates: Requirements 5.5
fc.assert(
  fc.property(
    fc.record({
      userId: fc.uuid(),
      contactIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 20 }),
      targetCircle: fc.constantFrom('inner', 'close', 'active', 'casual', 'acquaintance')
    }),
    async ({ userId, contactIds, targetCircle }) => {
      // Attempt batch assignment
      const result = await circleAssignmentService.batchAssign(userId, 
        contactIds.map(id => ({ contactId: id, circle: targetCircle }))
      );
      
      // Verify all-or-nothing: either all assigned or none assigned
      const assignments = await Promise.all(
        contactIds.map(id => contactRepository.findById(id, userId))
      );
      
      const assignedCount = assignments.filter(c => c?.dunbarCircle === targetCircle).length;
      expect(assignedCount === 0 || assignedCount === contactIds.length).toBe(true);
    }
  ),
  propertyTestConfig
);
```

**Property 10: AI learning from corrections**
```typescript
// Feature: contact-onboarding, Property 10: AI learning from corrections
// Validates: Requirements 2.5, 9.5
fc.assert(
  fc.property(
    fc.record({
      userId: fc.uuid(),
      contactId: fc.uuid(),
      suggestedCircle: fc.constantFrom('inner', 'close', 'active', 'casual', 'acquaintance'),
      actualCircle: fc.constantFrom('inner', 'close', 'active', 'casual', 'acquaintance')
    }),
    async ({ userId, contactId, suggestedCircle, actualCircle }) => {
      // Record override
      await aiSuggestionService.recordUserOverride(userId, contactId, suggestedCircle, actualCircle);
      
      // Create similar contact and get new suggestion
      const similarContact = await createSimilarContact(userId, contactId);
      const newSuggestion = await aiSuggestionService.analyzeContact(userId, similarContact.id);
      
      // Verify the model learned: new suggestion should be closer to actualCircle than suggestedCircle
      const circleOrder = ['inner', 'close', 'active', 'casual', 'acquaintance'];
      const distanceToActual = Math.abs(
        circleOrder.indexOf(newSuggestion.suggestedCircle) - circleOrder.indexOf(actualCircle)
      );
      const distanceToOriginal = Math.abs(
        circleOrder.indexOf(suggestedCircle) - circleOrder.indexOf(actualCircle)
      );
      
      expect(distanceToActual).toBeLessThanOrEqual(distanceToOriginal);
    }
  ),
  propertyTestConfig
);
```

**Property 14: Archive-reactivate round trip**
```typescript
// Feature: contact-onboarding, Property 14: Archive-reactivate round trip
// Validates: Requirements 12.5
fc.assert(
  fc.property(
    fc.record({
      userId: fc.uuid(),
      contact: fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        dunbarCircle: fc.constantFrom('inner', 'close', 'active', 'casual', 'acquaintance'),
        frequencyPreference: fc.constantFrom('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')
      })
    }),
    async ({ userId, contact }) => {
      // Create contact
      await contactRepository.create(userId, contact);
      
      // Archive contact
      await contactRepository.archive(contact.id, userId);
      
      // Reactivate contact
      await contactRepository.unarchive(contact.id, userId);
      
      // Verify state is restored
      const reactivated = await contactRepository.findById(contact.id, userId);
      expect(reactivated.dunbarCircle).toBe(contact.dunbarCircle);
      expect(reactivated.frequencyPreference).toBe(contact.frequencyPreference);
      expect(reactivated.archived).toBe(false);
    }
  ),
  propertyTestConfig
);
```

**Property 25: Account deletion completeness**
```typescript
// Feature: contact-onboarding, Property 25: Account deletion completeness
// Validates: Requirements 15.5
fc.assert(
  fc.property(
    fc.record({
      userId: fc.uuid(),
      contactCount: fc.nat({ max: 50 }),
      achievementCount: fc.nat({ max: 10 })
    }),
    async ({ userId, contactCount, achievementCount }) => {
      // Create test data
      for (let i = 0; i < contactCount; i++) {
        await contactRepository.create(userId, { name: `Contact ${i}` });
      }
      for (let i = 0; i < achievementCount; i++) {
        await achievementRepository.create(userId, { type: 'test_achievement' });
      }
      
      // Delete account
      await accountService.deleteAccount(userId);
      
      // Verify all data is removed
      const contacts = await contactRepository.findAll(userId);
      const achievements = await achievementRepository.findAll(userId);
      const onboardingState = await onboardingRepository.getState(userId);
      
      expect(contacts.length).toBe(0);
      expect(achievements.length).toBe(0);
      expect(onboardingState).toBeNull();
    }
  ),
  propertyTestConfig
);
```

### Integration Testing

**End-to-End Onboarding Flow:**
- Test complete onboarding from start to finish
- Test resuming interrupted onboarding
- Test onboarding with Google Contacts import
- Test onboarding with manual contact entry
- Test management mode access and modifications

**API Integration:**
- Test all onboarding API endpoints
- Test authentication and authorization
- Test error responses and status codes
- Test rate limiting and throttling
- Test concurrent requests

**Database Integration:**
- Test transaction rollback on errors
- Test concurrent modifications
- Test data consistency across tables
- Test foreign key constraints
- Test cascade deletes

### Performance Testing

**Load Testing:**
- Test onboarding with 10, 50, 100, 500, 1000 contacts
- Measure circular visualization render time
- Measure AI suggestion generation time
- Measure batch operation performance
- Identify performance bottlenecks

**Optimization Targets:**
- Circular visualization should render in <500ms for 500 contacts
- AI suggestions should generate in <2s for 50 contacts
- Batch operations should complete in <5s for 100 contacts
- Onboarding state save should complete in <200ms
- Page transitions should complete in <300ms

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Backend:**
- Database schema creation and migrations
- OnboardingRepository implementation
- CircleAssignmentService basic implementation
- API routes for onboarding state management

**Frontend:**
- OnboardingController state machine
- Basic circular visualization (static)
- Navigation between onboarding steps
- Progress tracking UI

### Phase 2: Circle Assignment (Week 3-4)

**Backend:**
- Circle validation and capacity checking
- Batch assignment operations
- Circle distribution calculations
- Assignment history tracking

**Frontend:**
- Interactive circular visualization
- Drag-and-drop functionality
- Contact dot rendering
- Circle capacity indicators
- Tooltips and hover states

### Phase 3: AI Suggestions (Week 5-6)

**Backend:**
- AISuggestionService implementation
- Communication pattern analysis
- Confidence score calculation
- Learning from user overrides
- Suggestion caching

**Frontend:**
- AI suggestion display
- Confidence indicators
- One-click acceptance
- Override tracking
- Alternative suggestions

### Phase 4: Gamification & Polish (Week 7-8)

**Backend:**
- Achievement system
- Network health scoring
- Weekly Catchup session generation
- Streak tracking
- Milestone detection

**Frontend:**
- Progress bars and animations
- Achievement badges
- Celebration animations
- Network health dashboard
- Weekly Catchup UI

### Phase 5: Mobile & Accessibility (Week 9-10)

**Frontend:**
- Mobile-responsive layouts
- Touch gesture support
- Orientation change handling
- Accessibility improvements (ARIA labels, keyboard navigation)
- Screen reader support

**Testing:**
- Mobile device testing
- Accessibility audit
- Cross-browser testing
- Performance optimization

### Phase 6: Integration & Testing (Week 11-12)

**Integration:**
- Google Contacts integration
- Existing contact management integration
- Group and tag system integration
- Suggestion system integration

**Testing:**
- Property-based test implementation
- Integration test suite
- End-to-end testing
- Performance testing
- Security audit

## Security Considerations

### Data Privacy

**User Data Isolation:**
- All queries must include user_id filter
- Use row-level security policies in PostgreSQL
- Validate user ownership before any operation
- Prevent cross-user data leakage

**Sensitive Data Handling:**
- Encrypt AI analysis data at rest
- Don't log contact names or personal information
- Sanitize error messages to prevent data leakage
- Use secure session management

### Authentication & Authorization

**Access Control:**
- Require authentication for all onboarding endpoints
- Validate JWT tokens on every request
- Implement rate limiting per user
- Log suspicious access patterns

**Permission Validation:**
- Verify user owns contacts before modification
- Validate circle assignment permissions
- Check onboarding state ownership
- Prevent unauthorized state access

### Input Validation

**API Input Sanitization:**
- Validate all user inputs against schemas
- Sanitize HTML/JavaScript in contact names
- Validate circle names against whitelist
- Limit batch operation sizes
- Validate UUID formats

**SQL Injection Prevention:**
- Use parameterized queries exclusively
- Never concatenate user input into SQL
- Use ORM/query builder with proper escaping
- Validate all database inputs

## Monitoring & Analytics

### Key Metrics

**Onboarding Completion:**
- Completion rate by trigger type
- Average time to complete
- Drop-off points
- Resume rate
- Completion by contact count

**User Engagement:**
- Weekly Catchup participation rate
- Average contacts categorized per session
- AI suggestion acceptance rate
- Override frequency
- Management mode usage

**System Performance:**
- API response times
- AI suggestion generation time
- Circular visualization render time
- Database query performance
- Error rates

**User Satisfaction:**
- Net Promoter Score (NPS)
- Feature satisfaction ratings
- Support ticket volume
- User feedback themes
- Retention rates

### Logging

**Application Logs:**
- Onboarding flow events (start, complete, exit)
- Circle assignments and modifications
- AI suggestion generation and acceptance
- Error conditions and exceptions
- Performance metrics

**Audit Logs:**
- User authentication events
- Data access patterns
- Bulk operations
- Account deletions
- Privacy-related events

## Future Enhancements

### Advanced Features

**Relationship Insights:**
- Visualize relationship strength over time
- Identify neglected relationships
- Suggest optimal circle rebalancing
- Predict relationship decay
- Recommend proactive outreach

**Social Network Analysis:**
- Identify relationship clusters
- Suggest group formations
- Detect isolated contacts
- Analyze network density
- Recommend introductions

**Machine Learning Improvements:**
- Personalized circle size recommendations
- Context-aware suggestion timing
- Sentiment analysis of interactions
- Predictive relationship maintenance
- Automated preference learning

### Integration Opportunities

**Calendar Integration:**
- Suggest circles based on meeting frequency
- Identify VIP contacts from calendar
- Recommend catchup timing based on availability
- Auto-categorize from calendar patterns

**Communication Platform Integration:**
- Analyze email frequency for suggestions
- Track messaging patterns
- Incorporate call history
- Social media interaction analysis

**Wearable Integration:**
- Location-based contact suggestions
- Activity-based relationship tracking
- Health data for optimal outreach timing
- Context-aware notifications

## Conclusion

The Contact Onboarding feature provides a comprehensive, research-backed approach to relationship management that combines Dunbar's number theory with modern UX design principles. By emphasizing progressive disclosure, AI-powered suggestions, and gamification, the system makes the complex task of organizing relationships feel intuitive and rewarding.

The design prioritizes user control, data privacy, and flexibility while maintaining a visually engaging experience. The property-based testing approach ensures correctness across a wide range of inputs and edge cases, while the phased implementation plan allows for iterative development and user feedback incorporation.

This feature serves as the foundation for CatchUp's relationship management capabilities, enabling users to maintain meaningful connections across all relationship tiers with minimal friction and maximum insight.
