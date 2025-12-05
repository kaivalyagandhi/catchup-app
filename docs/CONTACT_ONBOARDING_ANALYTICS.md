# Contact Onboarding Analytics Guide

This document describes the analytics tracking system for the Contact Onboarding feature.

## Overview

The onboarding analytics system tracks key events throughout the user's onboarding journey to provide product insights:

- **Onboarding start and completion**
- **Step-by-step progress**
- **Dismissals and resumes**
- **AI suggestion acceptance rates**
- **Time to complete**
- **User behavior patterns**

## Tracked Events

### Core Onboarding Events

#### `onboarding_started`
Fired when a user begins the onboarding process.

**Metadata**:
- `startTime`: ISO timestamp
- `userAgent`: Browser user agent
- `screenWidth`: Screen width in pixels
- `screenHeight`: Screen height in pixels

#### `onboarding_completed`
Fired when a user completes all three onboarding steps.

**Metadata**:
- `completedAt`: ISO timestamp
- `timeToCompleteMs`: Time in milliseconds
- `timeToCompleteMinutes`: Time in minutes (rounded)

#### `onboarding_dismissed`
Fired when a user dismisses the onboarding indicator.

**Metadata**:
- `dismissedAt`: ISO timestamp
- `currentStep`: Step number when dismissed (1, 2, or 3)

#### `onboarding_resumed`
Fired when a user resumes onboarding after dismissing.

**Metadata**:
- `resumedAt`: ISO timestamp
- `resumedStep`: Step number when resumed

### Step Events

#### `step_1_started`
Fired when user navigates to Step 1 (Connect Integrations).

**Metadata**:
- `step`: 1
- `timestamp`: ISO timestamp

#### `step_1_completed`
Fired when both Google Calendar and Contacts are connected.

**Metadata**:
- `step`: 1
- `completedAt`: ISO timestamp

#### `step_2_started`
Fired when user navigates to Step 2 (Organize Circles).

**Metadata**:
- `step`: 2
- `timestamp`: ISO timestamp

#### `step_2_completed`
Fired when user completes circle organization (50%+ contacts categorized).

**Metadata**:
- `step`: 2
- `completedAt`: ISO timestamp
- `contactsCategorized`: Number of contacts assigned
- `totalContacts`: Total number of contacts

#### `step_3_started`
Fired when user navigates to Step 3 (Review Group Mappings).

**Metadata**:
- `step`: 3
- `timestamp`: ISO timestamp

#### `step_3_completed`
Fired when all group mappings are reviewed.

**Metadata**:
- `step`: 3
- `completedAt`: ISO timestamp
- `mappingsReviewed`: Number of mappings reviewed
- `totalMappings`: Total number of mappings

### Circle Assignment Events

#### `circle_assigned`
Fired when a contact is assigned to a circle.

**Metadata**:
- `contactId`: Contact identifier
- `circle`: Circle name (inner, close, active, casual)
- `wasAISuggestion`: Boolean indicating if AI suggestion was used
- `timestamp`: ISO timestamp

### AI Suggestion Events

#### `ai_suggestion_accepted`
Fired when user accepts an AI circle suggestion.

**Metadata**:
- `contactId`: Contact identifier
- `suggestedCircle`: Circle suggested by AI
- `confidence`: AI confidence score (0-100)
- `timestamp`: ISO timestamp

#### `ai_suggestion_rejected`
Fired when user rejects an AI suggestion and selects a different circle.

**Metadata**:
- `contactId`: Contact identifier
- `suggestedCircle`: Circle suggested by AI
- `selectedCircle`: Circle actually selected by user
- `timestamp`: ISO timestamp

### Group Mapping Events

#### `group_mapping_accepted`
Fired when user accepts a group mapping suggestion.

**Metadata**:
- `mappingId`: Mapping identifier
- `googleGroupId`: Google Contact group ID
- `targetGroupId`: CatchUp group ID
- `timestamp`: ISO timestamp

#### `group_mapping_rejected`
Fired when user rejects a group mapping suggestion.

**Metadata**:
- `mappingId`: Mapping identifier
- `googleGroupId`: Google Contact group ID
- `timestamp`: ISO timestamp

### Interaction Events

#### `search_used`
Fired when user searches for contacts in the Manage Circles flow.

**Metadata**:
- `queryLength`: Length of search query
- `resultsCount`: Number of results returned
- `timestamp`: ISO timestamp

#### `educational_tip_expanded`
Fired when user expands the educational tip details.

**Metadata**:
- `timestamp`: ISO timestamp

#### `step_navigation`
Fired when user clicks on a step in the indicator to navigate.

**Metadata**:
- `fromStep`: Current step number
- `toStep`: Target step number
- `timestamp`: ISO timestamp

## Frontend Integration

### Basic Usage

```javascript
// Import analytics
const analytics = onboardingAnalytics;

// Track onboarding start
analytics.trackOnboardingStarted(userId);

// Track step completion
analytics.trackStepCompleted(userId, 1, {
  googleCalendarConnected: true,
  googleContactsConnected: true,
});

// Track circle assignment
analytics.trackCircleAssigned(userId, contactId, 'inner', false);

// Track AI suggestion
analytics.trackAISuggestionAccepted(userId, contactId, 'close', 85);

// Track onboarding completion
analytics.trackOnboardingCompleted(userId);
```

### Integration Points

**OnboardingStepIndicator**:
```javascript
// Track when user clicks a step
handleStepClick(step) {
  analytics.trackStepNavigation(userId, this.state.currentStep, step);
  // ... navigation logic
}

// Track dismissal
handleDismiss() {
  analytics.trackOnboardingDismissed(userId, this.state.currentStep);
  // ... dismissal logic
}

// Track resume
handleResume() {
  analytics.trackOnboardingResumed(userId, this.state.currentStep);
  // ... resume logic
}
```

**ManageCirclesFlow**:
```javascript
// Track circle assignment
assignCircle(contactId, circle) {
  const wasAISuggestion = this.contacts.find(c => c.id === contactId)?.aiSuggestion?.circle === circle;
  analytics.trackCircleAssigned(userId, contactId, circle, wasAISuggestion);
  // ... assignment logic
}

// Track search
handleSearch(query) {
  const results = this.filterContacts(query);
  analytics.trackSearchUsed(userId, query, results.length);
  // ... search logic
}
```

## Backend API

### Store Event

**Endpoint**: `POST /api/analytics/onboarding`

**Request**:
```json
{
  "userId": "user-123",
  "eventType": "onboarding_started",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "startTime": "2024-01-15T10:30:00Z",
    "userAgent": "Mozilla/5.0...",
    "screenWidth": 1920,
    "screenHeight": 1080
  }
}
```

**Response**:
```json
{
  "success": true
}
```

### Get Completion Stats

**Endpoint**: `GET /api/analytics/onboarding/stats`

**Response**:
```json
{
  "started": 150,
  "completed": 120,
  "completionRate": 80.0,
  "averageTimeMinutes": 18.5
}
```

### Get Step Funnel

**Endpoint**: `GET /api/analytics/onboarding/funnel`

**Response**:
```json
{
  "step1Started": 150,
  "step1Completed": 145,
  "step2Started": 140,
  "step2Completed": 130,
  "step3Started": 125,
  "step3Completed": 120
}
```

### Get Dismissal Stats

**Endpoint**: `GET /api/analytics/onboarding/dismissals`

**Response**:
```json
{
  "dismissed": 30,
  "resumed": 25,
  "resumeRate": 83.33
}
```

### Get AI Suggestion Stats

**Endpoint**: `GET /api/analytics/onboarding/ai-suggestions`

**Response**:
```json
{
  "accepted": 450,
  "rejected": 150,
  "acceptanceRate": 75.0
}
```

### Get User Events

**Endpoint**: `GET /api/analytics/onboarding/user/:userId`

**Response**:
```json
{
  "userId": "user-123",
  "events": [
    {
      "event_type": "onboarding_started",
      "timestamp": "2024-01-15T10:30:00Z",
      "metadata": { ... },
      "created_at": "2024-01-15T10:30:01Z"
    },
    ...
  ]
}
```

### Get Dashboard Data

**Endpoint**: `GET /api/analytics/onboarding/dashboard`

**Response**:
```json
{
  "completion": {
    "started": 150,
    "completed": 120,
    "completionRate": 80.0,
    "averageTimeMinutes": 18.5
  },
  "funnel": {
    "step1Completed": 145,
    "step2Completed": 130,
    "step3Completed": 120
  },
  "dismissal": {
    "dismissed": 30,
    "resumed": 25,
    "resumeRate": 83.33
  },
  "aiSuggestions": {
    "accepted": 450,
    "rejected": 150,
    "acceptanceRate": 75.0
  }
}
```

## Database Schema

### onboarding_analytics_events Table

```sql
CREATE TABLE onboarding_analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
- `idx_analytics_user_id` on `user_id`
- `idx_analytics_event_type` on `event_type`
- `idx_analytics_timestamp` on `timestamp`
- `idx_analytics_user_event` on `(user_id, event_type)`
- `idx_analytics_created_at` on `created_at`

### onboarding_analytics_summary View

Provides quick access to aggregate statistics:

```sql
SELECT * FROM onboarding_analytics_summary;
```

Returns:
- `total_started`: Total users who started onboarding
- `total_completed`: Total users who completed onboarding
- `total_dismissed`: Total dismissals
- `total_resumed`: Total resumes
- `step1_completed`: Users who completed Step 1
- `step2_completed`: Users who completed Step 2
- `step3_completed`: Users who completed Step 3
- `ai_accepted`: Total AI suggestions accepted
- `ai_rejected`: Total AI suggestions rejected
- `circles_assigned`: Total circle assignments
- `mappings_accepted`: Total group mappings accepted
- `mappings_rejected`: Total group mappings rejected

## External Analytics Integration

The system supports integration with popular analytics platforms:

### Google Analytics 4

```javascript
// Automatically sends events if gtag is available
gtag('event', 'onboarding_started', {
  user_id: 'user-123',
  startTime: '2024-01-15T10:30:00Z'
});
```

### Mixpanel

```javascript
// Automatically sends events if mixpanel is available
mixpanel.track('onboarding_started', {
  userId: 'user-123',
  startTime: '2024-01-15T10:30:00Z'
});
```

### Segment

```javascript
// Automatically sends events if analytics is available
analytics.track('onboarding_started', {
  userId: 'user-123',
  startTime: '2024-01-15T10:30:00Z'
});
```

## Key Metrics

### Completion Rate
Percentage of users who complete onboarding after starting.

**Formula**: `(completed / started) * 100`

**Target**: > 70%

### Average Time to Complete
Average time users take to complete all three steps.

**Target**: < 20 minutes

### Step Drop-off Rate
Percentage of users who don't complete each step.

**Formula**: `((step_started - step_completed) / step_started) * 100`

**Target**: < 20% per step

### Resume Rate
Percentage of users who resume after dismissing.

**Formula**: `(resumed / dismissed) * 100`

**Target**: > 60%

### AI Acceptance Rate
Percentage of AI suggestions that users accept.

**Formula**: `(accepted / (accepted + rejected)) * 100`

**Target**: > 70%

## Analysis Queries

### Find users who started but didn't complete

```sql
SELECT DISTINCT user_id
FROM onboarding_analytics_events
WHERE event_type = 'onboarding_started'
  AND user_id NOT IN (
    SELECT user_id 
    FROM onboarding_analytics_events 
    WHERE event_type = 'onboarding_completed'
  );
```

### Calculate average time per step

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (
    step2.timestamp - step1.timestamp
  )) / 60) as step1_minutes,
  AVG(EXTRACT(EPOCH FROM (
    step3.timestamp - step2.timestamp
  )) / 60) as step2_minutes,
  AVG(EXTRACT(EPOCH FROM (
    completed.timestamp - step3.timestamp
  )) / 60) as step3_minutes
FROM onboarding_analytics_events step1
JOIN onboarding_analytics_events step2 
  ON step1.user_id = step2.user_id 
  AND step2.event_type = 'step_2_started'
JOIN onboarding_analytics_events step3 
  ON step1.user_id = step3.user_id 
  AND step3.event_type = 'step_3_started'
JOIN onboarding_analytics_events completed 
  ON step1.user_id = completed.user_id 
  AND completed.event_type = 'onboarding_completed'
WHERE step1.event_type = 'step_1_started';
```

### Find most common dismissal points

```sql
SELECT 
  metadata->>'currentStep' as dismissed_at_step,
  COUNT(*) as count
FROM onboarding_analytics_events
WHERE event_type = 'onboarding_dismissed'
GROUP BY metadata->>'currentStep'
ORDER BY count DESC;
```

## Privacy Considerations

- **No PII**: Analytics events don't store personally identifiable information
- **User IDs**: Only internal user IDs are stored, not emails or names
- **Search queries**: Only query length is tracked, not actual search terms
- **Retention**: Consider implementing data retention policies (e.g., 90 days)
- **Opt-out**: Provide users ability to opt out of analytics tracking

## Best Practices

1. **Track early and often**: Capture events as they happen
2. **Include context**: Add relevant metadata to events
3. **Don't block UX**: Analytics failures shouldn't break the app
4. **Aggregate regularly**: Pre-compute common metrics
5. **Monitor trends**: Set up alerts for unusual patterns
6. **Respect privacy**: Never track sensitive user data
7. **Document changes**: Update this guide when adding new events

## Troubleshooting

### Events not appearing in database

1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check database connection
4. Verify user authentication

### Incorrect completion rates

1. Verify all events are being tracked
2. Check for duplicate events
3. Ensure timestamps are correct
4. Review query logic

### Performance issues

1. Add indexes on frequently queried columns
2. Use materialized views for complex aggregations
3. Implement caching for dashboard data
4. Archive old events periodically

## Future Enhancements

- Real-time analytics dashboard
- Cohort analysis
- A/B testing support
- Predictive completion modeling
- Automated insights and recommendations
- Export to data warehouse
- Custom event tracking
