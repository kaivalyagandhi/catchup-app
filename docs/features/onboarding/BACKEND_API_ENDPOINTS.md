# Backend API Endpoints Implementation

This document describes the backend API endpoints implemented for the Contact Onboarding feature.

## Overview

All endpoints have been implemented to support the 3-step onboarding flow:
1. **Step 1**: Connect integrations (Google Calendar & Contacts)
2. **Step 2**: Organize contacts into circles
3. **Step 3**: Review group mapping suggestions

## Onboarding State Endpoints

### POST /api/onboarding/init
Initialize onboarding for new user.

**Request Body**: None (uses authenticated user ID)

**Response**: 
```json
{
  "userId": "string",
  "triggerType": "manual",
  "currentStep": "welcome",
  "progressData": {
    "categorizedCount": 0,
    "totalCount": 0,
    "milestonesReached": ["Getting Started"],
    "timeSpent": 0
  }
}
```

**Requirements**: All requirements (state management)

---

### GET /api/onboarding/state
Get current onboarding state for a user.

**Response**: 
```json
{
  "userId": "string",
  "currentStep": "circle_assignment",
  "completedSteps": ["welcome", "import_contacts"],
  "progressData": {
    "categorizedCount": 45,
    "totalCount": 120,
    "milestonesReached": ["Getting Started", "First Contact", "25% Complete"],
    "timeSpent": 1200
  },
  "completedAt": null
}
```

**Requirements**: All requirements (state management)

---

### PUT /api/onboarding/state
Update onboarding state.

**Request Body**:
```json
{
  "currentStep": "circle_assignment",
  "progressData": {
    "categorizedCount": 50,
    "totalCount": 120
  }
}
```

**Response**: 204 No Content

**Requirements**: All requirements (state management)

---

### POST /api/onboarding/sync
Sync local state to server.

**Request Body**:
```json
{
  "currentStep": "circle_assignment",
  "completedSteps": ["welcome", "import_contacts"],
  "progressData": {
    "categorizedCount": 45,
    "totalCount": 120
  }
}
```

**Response**: 204 No Content

**Requirements**: All requirements (state management)

---

## Circle Assignment Endpoints

### POST /api/contacts/:id/circle
Assign contact to circle.

**URL Parameters**:
- `id`: Contact ID

**Request Body**:
```json
{
  "userId": "string",
  "circle": "inner" | "close" | "active" | "casual"
}
```

**Response**: 204 No Content

**Requirements**: 3.5, 14.1, 14.2

---

### GET /api/contacts/circles/counts
Get circle counts.

**Query Parameters**:
- `userId`: User ID

**Response**:
```json
{
  "inner": 5,
  "close": 18,
  "active": 32,
  "casual": 45,
  "uncategorized": 20
}
```

**Requirements**: 3.5, 14.1, 14.2

---

### POST /api/contacts/circles/bulk
Bulk assign contacts.

**Request Body**:
```json
{
  "userId": "string",
  "assignments": [
    {
      "contactId": "string",
      "circle": "inner" | "close" | "active" | "casual"
    }
  ]
}
```

**Response**: 204 No Content

**Requirements**: 3.5, 14.1, 14.2

---

## AI Suggestion Endpoint

### POST /api/ai/circle-suggestions
Generate circle suggestions.

**Request Body**:
```json
{
  "contactIds": ["string"] // Optional - if not provided, suggests for all uncategorized
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "contactId": "string",
      "suggestedCircle": "close",
      "confidence": 85,
      "reasons": [
        "High communication frequency (15 interactions/month)",
        "Recent contact (last interaction 3 days ago)",
        "3 shared calendar events in past month"
      ]
    }
  ]
}
```

**Features**:
- Analyzes communication frequency, recency, calendar co-attendance
- Returns suggestions with confidence scores and reasons
- Handles timeouts gracefully (30 second timeout)
- Returns empty suggestions on error instead of failing
- Limits batch size to 100 contacts

**Requirements**: 8.1, 8.2, 8.3, 9.1

---

## Group Mapping Endpoints

### GET /api/google-contacts/mapping-suggestions
Get mapping suggestions.

**Response**:
```json
[
  {
    "id": "string",
    "googleGroupId": "string",
    "googleGroupName": "Work Team",
    "memberCount": 12,
    "suggestedGroupId": "string",
    "suggestedGroupName": "Colleagues",
    "confidence": 90,
    "status": "pending"
  }
]
```

**Requirements**: 5.2, 5.3, 5.4

---

### POST /api/google-contacts/accept-mapping
Accept a mapping.

**Request Body**:
```json
{
  "mappingId": "string",
  "googleGroupId": "string", // Alternative to mappingId
  "catchupGroupId": "string", // Optional
  "excludedMembers": ["contactId1", "contactId2"] // Optional
}
```

**Response**:
```json
{
  "message": "Group mapping accepted successfully",
  "membershipsUpdated": 12
}
```

**Requirements**: 5.2, 5.3, 5.4

---

### POST /api/google-contacts/reject-mapping
Reject a mapping.

**Request Body**:
```json
{
  "mappingId": "string",
  "googleGroupId": "string" // Alternative to mappingId
}
```

**Response**:
```json
{
  "message": "Group mapping rejected successfully"
}
```

**Requirements**: 5.2, 5.3, 5.4

---

## Error Handling

All endpoints implement graceful error handling:

1. **Validation Errors**: Return 400 Bad Request with descriptive error messages
2. **Authentication Errors**: Return 401 Unauthorized
3. **Not Found Errors**: Return 404 Not Found
4. **Timeout Errors**: Return partial results or empty data instead of failing
5. **Server Errors**: Return 500 Internal Server Error with error details

### Example Error Response
```json
{
  "error": "Failed to generate AI suggestions",
  "details": "AI service timeout"
}
```

---

## Authentication

All endpoints require authentication via the `authenticate` middleware. The authenticated user ID is automatically extracted from the request and used for all operations.

---

## Legacy Endpoints

The following legacy endpoints are maintained for backward compatibility:

- `POST /api/onboarding/initialize` → Use `POST /api/onboarding/init`
- `PUT /api/onboarding/progress` → Use `PUT /api/onboarding/state`
- `POST /api/circles/assign` → Use `POST /api/contacts/:id/circle`
- `GET /api/circles/distribution` → Use `GET /api/contacts/circles/counts`
- `POST /api/circles/batch-assign` → Use `POST /api/contacts/circles/bulk`
- `POST /api/ai/suggest-circle` → Use `POST /api/ai/circle-suggestions`
- `GET /api/contacts/groups/mappings/pending` → Use `GET /api/google-contacts/mapping-suggestions`
- `POST /api/contacts/groups/mappings/:id/approve` → Use `POST /api/google-contacts/accept-mapping`
- `POST /api/contacts/groups/mappings/:id/reject` → Use `POST /api/google-contacts/reject-mapping`

---

## Testing

To test these endpoints:

1. **Start the server**: `npm run dev`
2. **Authenticate**: Obtain a valid JWT token
3. **Test with curl or Postman**:

```bash
# Initialize onboarding
curl -X POST http://localhost:3000/api/onboarding/init \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get onboarding state
curl http://localhost:3000/api/onboarding/state \
  -H "Authorization: Bearer YOUR_TOKEN"

# Assign contact to circle
curl -X POST http://localhost:3000/api/contacts/CONTACT_ID/circle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "circle": "close"}'

# Get circle counts
curl "http://localhost:3000/api/contacts/circles/counts?userId=USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate AI suggestions
curl -X POST http://localhost:3000/api/ai/circle-suggestions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Get group mapping suggestions
curl http://localhost:3000/api/google-contacts/mapping-suggestions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Implementation Notes

1. **Onboarding Service**: Added `updateOnboardingState()` and `syncLocalState()` methods to support state synchronization
2. **Circle Assignment**: Reused existing `CircleAssignmentServiceImpl` for all circle operations
3. **AI Suggestions**: Enhanced with timeout handling and graceful degradation
4. **Group Mappings**: Reused existing group sync service with new endpoint paths
5. **Type Safety**: All endpoints maintain full TypeScript type safety
6. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes

---

## Related Documentation

- [Onboarding State Manager](../../../src/contacts/ONBOARDING_STATE_MANAGER_README.md)
- [Circle Assignment Service](../../../src/contacts/circle-assignment-service.ts)
- [AI Suggestion Service](../../../src/contacts/ai-suggestion-service.ts)
- [Group Sync Service](../../../src/integrations/group-sync-service.ts)
