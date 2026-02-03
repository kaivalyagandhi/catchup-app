# Group Scheduling API Reference

This document provides detailed API endpoint documentation for the Group Scheduling feature.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Plans Endpoints](#plans-endpoints)
4. [Availability Endpoints](#availability-endpoints)
5. [Preferences Endpoints](#preferences-endpoints)
6. [Notifications Endpoints](#notifications-endpoints)
7. [Data Types](#data-types)
8. [Error Codes](#error-codes)

---

## Overview

**Base URL**: `http://localhost:3000` (development) or `https://api.catchup.app` (production)

**Content-Type**: `application/json`

All scheduling endpoints are prefixed with `/api/scheduling/`.

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Exception**: The public availability page endpoints (`GET /api/scheduling/availability/:token` and `POST /api/scheduling/availability/:token`) do not require authentication.

---

## Plans Endpoints

### Create Plan

Create a new catchup plan with selected contacts.

**Endpoint**: `POST /api/scheduling/plans`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "invitees": [
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "attendanceType": "must_attend"
    },
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440002",
      "attendanceType": "nice_to_have"
    }
  ],
  "activityType": "coffee",
  "duration": 60,
  "dateRangeStart": "2025-02-01",
  "dateRangeEnd": "2025-02-14",
  "location": "Central Perk Coffee"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | UUID | Yes | User creating the plan |
| invitees | Array | Yes | List of invitees (min 1) |
| invitees[].contactId | UUID | Yes | Contact ID |
| invitees[].attendanceType | String | Yes | "must_attend" or "nice_to_have" |
| activityType | String | No | "coffee", "dinner", "video_call", "activity", "other" |
| duration | Integer | Yes | Duration in minutes (30, 60, 120, 240) |
| dateRangeStart | Date | Yes | Start of availability window (YYYY-MM-DD) |
| dateRangeEnd | Date | Yes | End of availability window (YYYY-MM-DD) |
| location | String | No | Meeting location or link |

**Response**: `201 Created`
```json
{
  "plan": {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "activityType": "coffee",
    "duration": 60,
    "dateRangeStart": "2025-02-01",
    "dateRangeEnd": "2025-02-14",
    "location": "Central Perk Coffee",
    "status": "collecting_availability",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  "inviteLinks": [
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "contactName": "John Doe",
      "url": "http://localhost:3000/availability/abc123xyz",
      "attendanceType": "must_attend"
    },
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440002",
      "contactName": "Jane Smith",
      "url": "http://localhost:3000/availability/def456uvw",
      "attendanceType": "nice_to_have"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request` - Invalid data or date range exceeds 14 days
- `401 Unauthorized` - Not authenticated

---

### List Plans

Get all catchup plans for a user with optional filtering.

**Endpoint**: `GET /api/scheduling/plans`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |
| status | String | No | Filter by status |
| type | String | No | "individual" or "group" |

**Status Values**: `draft`, `collecting_availability`, `ready_to_schedule`, `scheduled`, `completed`, `cancelled`

**Response**: `200 OK`
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "activityType": "coffee",
    "duration": 60,
    "dateRangeStart": "2025-02-01",
    "dateRangeEnd": "2025-02-14",
    "status": "collecting_availability",
    "invitees": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440004",
        "contactId": "660e8400-e29b-41d4-a716-446655440001",
        "contactName": "John Doe",
        "attendanceType": "must_attend",
        "hasResponded": true
      }
    ],
    "createdAt": "2025-01-15T10:00:00Z"
  }
]
```

---

### Get Plan Details

Get detailed information about a specific plan.

**Endpoint**: `GET /api/scheduling/plans/:id`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID (for ownership verification) |

**Response**: `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440003",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "activityType": "coffee",
  "duration": 60,
  "dateRangeStart": "2025-02-01",
  "dateRangeEnd": "2025-02-14",
  "location": "Central Perk Coffee",
  "notes": null,
  "status": "collecting_availability",
  "finalizedTime": null,
  "invitees": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "contactName": "John Doe",
      "attendanceType": "must_attend",
      "hasResponded": true
    }
  ],
  "inviteLinks": [
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "contactName": "John Doe",
      "url": "http://localhost:3000/availability/abc123xyz",
      "accessedAt": "2025-01-15T12:00:00Z",
      "submittedAt": "2025-01-15T12:30:00Z"
    }
  ],
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Error Responses**:
- `404 Not Found` - Plan not found or not owned by user

---

### Update Plan

Update a plan's details (before finalization).

**Endpoint**: `PUT /api/scheduling/plans/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "activityType": "dinner",
  "duration": 120,
  "dateRangeEnd": "2025-02-21",
  "location": "Italian Restaurant"
}
```

**Response**: `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440003",
  "activityType": "dinner",
  "duration": 120,
  "dateRangeEnd": "2025-02-21",
  "location": "Italian Restaurant",
  "updatedAt": "2025-01-16T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request` - Cannot edit finalized plan
- `404 Not Found` - Plan not found

---

### Finalize Plan

Finalize a plan with a selected time.

**Endpoint**: `POST /api/scheduling/plans/:id/finalize`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "finalizedTime": "2025-02-10T14:00:00Z",
  "location": "Central Perk Coffee",
  "notes": "Looking forward to catching up!"
}
```

**Response**: `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440003",
  "status": "scheduled",
  "finalizedTime": "2025-02-10T14:00:00Z",
  "location": "Central Perk Coffee",
  "notes": "Looking forward to catching up!",
  "updatedAt": "2025-01-16T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request` - Plan already finalized
- `404 Not Found` - Plan not found

---

### Cancel Plan

Cancel a plan and invalidate all invite links.

**Endpoint**: `DELETE /api/scheduling/plans/:id`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |

**Response**: `204 No Content`

**Error Responses**:
- `404 Not Found` - Plan not found

---

### Get AI Suggestions

Get AI-powered conflict resolution suggestions.

**Endpoint**: `GET /api/scheduling/plans/:id/ai-suggestions`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |

**Response**: `200 OK`
```json
[
  {
    "type": "time_suggestion",
    "suggestedTime": "2025-02-08T15:00:00Z",
    "attendeeCount": 3,
    "reasoning": "This time slot has the most participants available. Only Jane is unavailable."
  },
  {
    "type": "exclude_attendee",
    "excludeeName": "Jane Smith",
    "attendeeCount": 4,
    "reasoning": "Jane is marked as 'nice to have'. Excluding her opens up 5 more time slots."
  },
  {
    "type": "activity_change",
    "alternativeActivity": "video_call",
    "attendeeCount": 4,
    "reasoning": "A shorter video call (30 min) has more availability than a 2-hour dinner."
  }
]
```

---

## Availability Endpoints

### Get Plan Info (Public)

Get plan information for the public availability page.

**Endpoint**: `GET /api/scheduling/availability/:token`

**Authentication**: Not required

**Response**: `200 OK`
```json
{
  "planId": "770e8400-e29b-41d4-a716-446655440003",
  "initiatorName": "Alice Johnson",
  "activityType": "coffee",
  "duration": 60,
  "dateRangeStart": "2025-02-01",
  "dateRangeEnd": "2025-02-14",
  "inviteeName": "John Doe",
  "existingAvailability": ["2025-02-05_14:00", "2025-02-05_14:30"]
}
```

**Error Responses**:
- `404 Not Found` - Invalid invite link
- `410 Gone` - Plan finalized or cancelled

---

### Submit Availability (Public)

Submit availability for a plan.

**Endpoint**: `POST /api/scheduling/availability/:token`

**Authentication**: Not required

**Request Body**:
```json
{
  "name": "John Doe",
  "timezone": "America/New_York",
  "availableSlots": [
    "2025-02-05_14:00",
    "2025-02-05_14:30",
    "2025-02-05_15:00",
    "2025-02-06_10:00",
    "2025-02-06_10:30"
  ]
}
```

**Slot Format**: `YYYY-MM-DD_HH:mm` (30-minute increments)

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Availability submitted successfully"
}
```

**Error Responses**:
- `400 Bad Request` - Missing name or invalid slots
- `404 Not Found` - Invalid invite link
- `410 Gone` - Plan finalized or cancelled

---

### Save Initiator Availability

Save the plan initiator's availability.

**Endpoint**: `POST /api/scheduling/plans/:id/initiator-availability`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "availableSlots": [
    "2025-02-05_14:00",
    "2025-02-05_14:30",
    "2025-02-05_15:00"
  ],
  "source": "manual"
}
```

**Source Values**: `manual` or `calendar`

**Response**: `200 OK`
```json
{
  "success": true,
  "slotsCount": 3
}
```

---

### Get All Availability

Get all availability data for a plan (dashboard view).

**Endpoint**: `GET /api/scheduling/plans/:id/availability`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |

**Response**: `200 OK`
```json
{
  "initiatorAvailability": {
    "availableSlots": ["2025-02-05_14:00", "2025-02-05_14:30"],
    "source": "calendar"
  },
  "inviteeAvailability": [
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "inviteeName": "John Doe",
      "timezone": "America/New_York",
      "availableSlots": ["2025-02-05_14:00", "2025-02-05_14:30", "2025-02-05_15:00"],
      "submittedAt": "2025-01-15T12:30:00Z"
    }
  ],
  "overlaps": {
    "perfectOverlap": ["2025-02-05_14:00", "2025-02-05_14:30"],
    "nearOverlap": [
      {
        "slot": "2025-02-05_15:00",
        "missingAttendees": ["You"]
      }
    ]
  }
}
```

---

## Preferences Endpoints

### Get Preferences

Get user's scheduling preferences.

**Endpoint**: `GET /api/scheduling/preferences`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |

**Response**: `200 OK`
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "preferredDays": [1, 2, 3, 4, 5],
  "preferredTimeRanges": [
    { "start": "09:00", "end": "12:00", "label": "mornings" },
    { "start": "18:00", "end": "21:00", "label": "evenings" }
  ],
  "preferredDurations": [60, 120],
  "favoriteLocations": ["Central Perk", "The Office"],
  "defaultActivityType": "coffee",
  "applyByDefault": true,
  "createdAt": "2025-01-01T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### Save Preferences

Save or update user's scheduling preferences.

**Endpoint**: `PUT /api/scheduling/preferences`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "preferredDays": [1, 2, 3, 4, 5],
  "preferredTimeRanges": [
    { "start": "09:00", "end": "12:00", "label": "mornings" }
  ],
  "preferredDurations": [60],
  "favoriteLocations": ["Central Perk", "The Office"],
  "defaultActivityType": "coffee",
  "applyByDefault": true
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "preferences": {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "preferredDays": [1, 2, 3, 4, 5],
    "updatedAt": "2025-01-16T10:00:00Z"
  }
}
```

---

## Notifications Endpoints

### Get Notifications

Get user's scheduling notifications.

**Endpoint**: `GET /api/scheduling/notifications`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |
| unreadOnly | Boolean | No | Filter to unread only |

**Response**: `200 OK`
```json
[
  {
    "id": "aa0e8400-e29b-41d4-a716-446655440006",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "planId": "770e8400-e29b-41d4-a716-446655440003",
    "type": "availability_submitted",
    "message": "John Doe has submitted their availability for your coffee catchup",
    "readAt": null,
    "createdAt": "2025-01-15T12:30:00Z"
  }
]
```

**Notification Types**:
- `availability_submitted` - Invitee submitted availability
- `plan_ready` - All must-attend invitees responded
- `plan_finalized` - Plan was finalized
- `plan_cancelled` - Plan was cancelled
- `reminder_sent` - Reminder was sent

---

### Mark Notification as Read

Mark a notification as read.

**Endpoint**: `POST /api/scheduling/notifications/:id/read`

**Authentication**: Required

**Request Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: `204 No Content`

---

### Get Unread Count

Get count of unread notifications (for badge).

**Endpoint**: `GET /api/scheduling/notifications/unread-count`

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | User ID |

**Response**: `200 OK`
```json
{
  "count": 3
}
```

---

## Data Types

### Plan Status

| Status | Description |
|--------|-------------|
| `draft` | Plan created but not yet active |
| `collecting_availability` | Waiting for invitee responses |
| `ready_to_schedule` | All must-attend invitees responded |
| `scheduled` | Plan finalized with a time |
| `completed` | Catchup has occurred |
| `cancelled` | Plan was cancelled |

### Attendance Type

| Type | Description |
|------|-------------|
| `must_attend` | Required for the catchup to happen |
| `nice_to_have` | Optional participant |

### Activity Type

| Type | Description |
|------|-------------|
| `coffee` | Coffee meetup |
| `dinner` | Dinner/meal |
| `video_call` | Virtual meeting |
| `activity` | Activity-based meetup |
| `other` | Other type |

### Time Slot Format

Time slots use the format: `YYYY-MM-DD_HH:mm`

Examples:
- `2025-02-05_14:00` - February 5, 2025 at 2:00 PM
- `2025-02-05_14:30` - February 5, 2025 at 2:30 PM

Slots are in 30-minute increments from 08:00 to 21:30.

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 410 | Gone - Resource no longer available |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Date range cannot exceed 14 days",
    "details": {
      "field": "dateRangeEnd",
      "constraint": "max_days_14"
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `PLAN_NOT_FOUND` | Plan doesn't exist |
| `INVITE_LINK_EXPIRED` | Invite link has expired |
| `INVITE_LINK_INVALID` | Invite link is invalid |
| `PLAN_ALREADY_FINALIZED` | Cannot modify finalized plan |
| `PLAN_CANCELLED` | Plan has been cancelled |
| `DATE_RANGE_EXCEEDED` | Date range exceeds 14 days |
| `UNAUTHORIZED` | Authentication required |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

| Endpoint Type | Window | Max Requests |
|--------------|--------|--------------|
| Plan operations | 1 minute | 60 |
| Availability submission | 1 minute | 30 |
| AI suggestions | 1 minute | 10 |

---

## Related Documentation

- [User Guide](USER_GUIDE.md) - How to use the scheduling feature
- [Feature Overview](README.md) - Feature summary
- [Main API Documentation](../../API.md) - Full API reference
