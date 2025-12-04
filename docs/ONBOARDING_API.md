# Contact Onboarding API Documentation

## Overview

This document describes the API endpoints for the Contact Onboarding feature. All endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Onboarding Endpoints

### Initialize Onboarding

Start a new onboarding session for the authenticated user.

**Endpoint:** `POST /api/onboarding/initialize`

**Request Body:**
```json
{
  "trigger": "new_user" | "post_import" | "manage",
  "source": "google" | "manual" (optional),
  "contactCount": 123 (optional)
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "currentStep": "welcome",
  "completedSteps": [],
  "triggerType": "new_user",
  "startedAt": "2025-01-01T00:00:00Z",
  "lastUpdatedAt": "2025-01-01T00:00:00Z",
  "progressData": {
    "categorizedCount": 0,
    "totalCount": 123,
    "milestonesReached": [],
    "timeSpent": 0
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid trigger type or source
- `401 Unauthorized` - Missing or invalid authentication token

---

### Get Onboarding State

Retrieve the current onboarding state for the authenticated user.

**Endpoint:** `GET /api/onboarding/state`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "userId": "uuid",
  "currentStep": "circle_assignment",
  "completedSteps": ["welcome", "import_contacts"],
  "triggerType": "post_import",
  "startedAt": "2025-01-01T00:00:00Z",
  "lastUpdatedAt": "2025-01-01T00:10:00Z",
  "completedAt": null,
  "progressData": {
    "categorizedCount": 25,
    "totalCount": 100,
    "milestonesReached": ["first_contact"],
    "timeSpent": 600
  }
}
```

**Errors:**
- `404 Not Found` - No onboarding state exists for user
- `401 Unauthorized` - Missing or invalid authentication token

---

### Update Progress

Update the current step and progress data.

**Endpoint:** `PUT /api/onboarding/progress`

**Request Body:**
```json
{
  "step": "circle_assignment",
  "data": {
    "categorizedCount": 30,
    "timeSpent": 720
  }
}
```

**Valid Steps:**
- `welcome`
- `import_contacts`
- `circle_assignment`
- `preference_setting`
- `group_overlay`
- `completion`

**Response:** `204 No Content`

**Errors:**
- `400 Bad Request` - Invalid step or missing required fields
- `401 Unauthorized` - Missing or invalid authentication token

---

### Complete Onboarding

Mark the onboarding process as complete.

**Endpoint:** `POST /api/onboarding/complete`

**Response:** `204 No Content`

**Errors:**
- `401 Unauthorized` - Missing or invalid authentication token

---

### Get Uncategorized Contacts

Retrieve contacts that haven't been assigned to a circle yet.

**Endpoint:** `GET /api/onboarding/uncategorized`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "dunbarCircle": null,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

**Errors:**
- `401 Unauthorized` - Missing or invalid authentication token

---

## Circle Assignment Endpoints

### Assign Contact to Circle

Assign a single contact to a Dunbar circle.

**Endpoint:** `POST /api/circles/assign`

**Request Body:**
```json
{
  "contactId": "uuid",
  "circle": "inner" | "close" | "active" | "casual" | "acquaintance"
}
```

**Response:** `204 No Content`

**Errors:**
- `400 Bad Request` - Invalid circle or missing contactId
- `401 Unauthorized` - Missing or invalid authentication token

---

### Batch Assign Contacts

Assign multiple contacts to circles in a single transaction.

**Endpoint:** `POST /api/circles/batch-assign`

**Request Body:**
```json
{
  "assignments": [
    {
      "contactId": "uuid",
      "circle": "inner",
      "confidence": 0.95,
      "userOverride": false
    },
    {
      "contactId": "uuid",
      "circle": "close",
      "confidence": 0.85,
      "userOverride": true
    }
  ]
}
```

**Response:** `204 No Content`

**Errors:**
- `400 Bad Request` - Invalid assignments array, empty array, or invalid circle values
- `401 Unauthorized` - Missing or invalid authentication token

---

### Get Circle Distribution

Get the count of contacts in each circle.

**Endpoint:** `GET /api/circles/distribution`

**Response:** `200 OK`
```json
{
  "inner": 5,
  "close": 15,
  "active": 50,
  "casual": 150,
  "acquaintance": 500,
  "uncategorized": 25,
  "total": 745
}
```

**Errors:**
- `401 Unauthorized` - Missing or invalid authentication token

---

### Get Circle Capacity

Get capacity status for a specific circle.

**Endpoint:** `GET /api/circles/capacity/:circle`

**Parameters:**
- `circle` - One of: inner, close, active, casual, acquaintance

**Response:** `200 OK`
```json
{
  "circle": "inner",
  "currentSize": 5,
  "recommendedSize": 5,
  "maxSize": 10,
  "status": "optimal",
  "message": "Your inner circle is at the recommended size"
}
```

**Status Values:**
- `under` - Below recommended size
- `optimal` - At recommended size
- `over` - Above recommended size

**Errors:**
- `400 Bad Request` - Invalid circle name
- `401 Unauthorized` - Missing or invalid authentication token

---

### Get Rebalancing Suggestions

Get suggestions for rebalancing circles.

**Endpoint:** `GET /api/circles/suggestions/rebalance`

**Response:** `200 OK`
```json
[
  {
    "contactId": "uuid",
    "currentCircle": "inner",
    "suggestedCircle": "close",
    "reason": "Low interaction frequency suggests moving to Close Friends",
    "confidence": 0.75
  }
]
```

**Errors:**
- `401 Unauthorized` - Missing or invalid authentication token

---

## AI Suggestion Endpoints

### Get AI Suggestion for Contact

Get AI-powered circle suggestion for a single contact.

**Endpoint:** `POST /api/ai/suggest-circle`

**Request Body:**
```json
{
  "contactId": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "contactId": "uuid",
  "suggestedCircle": "close",
  "confidence": 0.85,
  "factors": [
    {
      "type": "communication_frequency",
      "weight": 0.3,
      "value": 0.8,
      "description": "High communication frequency"
    },
    {
      "type": "recency",
      "weight": 0.25,
      "value": 0.9,
      "description": "Recent interaction within last week"
    }
  ],
  "alternativeCircles": [
    {
      "circle": "active",
      "confidence": 0.65
    }
  ]
}
```

**Errors:**
- `400 Bad Request` - Missing contactId
- `401 Unauthorized` - Missing or invalid authentication token

---

### Batch AI Suggestions

Get AI suggestions for multiple contacts.

**Endpoint:** `POST /api/ai/batch-suggest`

**Request Body:**
```json
{
  "contactIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Limits:**
- Maximum 100 contacts per batch

**Response:** `200 OK`
```json
[
  {
    "contactId": "uuid1",
    "suggestedCircle": "inner",
    "confidence": 0.95,
    "factors": [...],
    "alternativeCircles": [...]
  },
  {
    "contactId": "uuid2",
    "suggestedCircle": "close",
    "confidence": 0.80,
    "factors": [...],
    "alternativeCircles": [...]
  }
]
```

**Errors:**
- `400 Bad Request` - Invalid contactIds array, empty array, or exceeds batch size limit
- `401 Unauthorized` - Missing or invalid authentication token

---

### Record User Override

Record when a user overrides an AI suggestion.

**Endpoint:** `POST /api/ai/record-override`

**Request Body:**
```json
{
  "contactId": "uuid",
  "suggestedCircle": "close",
  "actualCircle": "inner"
}
```

**Response:** `204 No Content`

**Errors:**
- `400 Bad Request` - Missing required fields or invalid circle values
- `401 Unauthorized` - Missing or invalid authentication token

---

### Improve AI Model

Trigger model improvement based on user overrides.

**Endpoint:** `POST /api/ai/improve-model`

**Response:** `204 No Content`

**Errors:**
- `401 Unauthorized` - Missing or invalid authentication token

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Descriptive error message"
}
```

## Rate Limiting

All API endpoints are protected by rate limiting:
- Default: 100 requests per 15 minutes per IP address
- Authenticated: 1000 requests per 15 minutes per user

## Example Usage

### JavaScript/TypeScript

```typescript
// Initialize onboarding
const response = await fetch('http://localhost:3000/api/onboarding/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trigger: 'new_user'
  })
});

const state = await response.json();

// Assign contact to circle
await fetch('http://localhost:3000/api/circles/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contactId: 'contact-uuid',
    circle: 'inner'
  })
});

// Get AI suggestion
const suggestionResponse = await fetch('http://localhost:3000/api/ai/suggest-circle', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contactId: 'contact-uuid'
  })
});

const suggestion = await suggestionResponse.json();
```

### cURL

```bash
# Initialize onboarding
curl -X POST http://localhost:3000/api/onboarding/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "new_user"}'

# Get circle distribution
curl -X GET http://localhost:3000/api/circles/distribution \
  -H "Authorization: Bearer YOUR_TOKEN"

# Batch assign contacts
curl -X POST http://localhost:3000/api/circles/batch-assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      {"contactId": "uuid1", "circle": "inner"},
      {"contactId": "uuid2", "circle": "close"}
    ]
  }'
```
