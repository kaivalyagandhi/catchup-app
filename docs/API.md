# CatchUp API Documentation

## Overview

The CatchUp API is a RESTful API that enables relationship management through intelligent connection suggestions. This document provides comprehensive information about all available endpoints, authentication, rate limits, and error handling.

**Base URL:** `https://api.catchup.app` (production) or `http://localhost:3000` (development)

**API Version:** v1

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limits](#rate-limits)
3. [Error Codes](#error-codes)
4. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Contacts](#contacts-endpoints)
   - [Groups](#groups-endpoints)
   - [Tags](#tags-endpoints)
   - [Suggestions](#suggestions-endpoints)
   - [Calendar](#calendar-endpoints)
   - [Voice Notes](#voice-notes-endpoints)
   - [Preferences](#preferences-endpoints)
   - [Account](#account-endpoints)

## Authentication

### Overview

The CatchUp API uses JWT (JSON Web Token) based authentication. All authenticated endpoints require a valid JWT token in the Authorization header.

### Token Format

```
Authorization: Bearer <your_jwt_token>
```

### Token Expiration

- Default expiration: 7 days
- Configurable via `JWT_EXPIRES_IN` environment variable

### Obtaining a Token

Tokens are obtained through the `/api/auth/login` or `/api/auth/register` endpoints.


## Rate Limits

### Overview

Rate limits protect the API from abuse and ensure fair usage across all users. Limits are enforced per user (identified by JWT token) or per IP address for unauthenticated requests.

### Rate Limit Headers

All API responses include rate limit information in headers:

```
X-RateLimit-Limit: 60          # Maximum requests allowed in window
X-RateLimit-Remaining: 45      # Remaining requests in current window
X-RateLimit-Reset: 2024-01-01T12:00:00Z  # When the limit resets
```

When rate limit is exceeded:
```
Retry-After: 30                # Seconds until next request allowed
```

### Rate Limit Tiers

| Endpoint Type | Window | Max Requests | Limit Key |
|--------------|--------|--------------|-----------|
| General API | 1 minute | 60 | Per user |
| Voice Upload | 1 hour | 10 | Per user |
| Notifications | 1 hour | 20 | Per user |
| SMS | 1 hour | 10 | Per user |
| Email | 1 hour | 20 | Per user |
| Google Calendar API | 1 minute | 10 | Per user |

### Rate Limit Response

When rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 30 seconds.",
  "retryAfter": 30
}
```


## Error Codes

### HTTP Status Codes

| Status Code | Meaning | Description |
|------------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded with no response body |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common Error Messages

**Authentication Errors:**
- `No authorization header provided` - Missing Authorization header
- `Invalid authorization header format` - Malformed Authorization header
- `Invalid token` - JWT token is invalid
- `Token expired` - JWT token has expired

**Validation Errors:**
- `userId is required` - Missing required userId parameter
- `Invalid UUID format` - Provided ID is not a valid UUID
- `Email and password are required` - Missing required fields

**Resource Errors:**
- `Contact not found` - Requested contact does not exist
- `Group not found` - Requested group does not exist
- `Suggestion not found` - Requested suggestion does not exist


## Endpoints

### Authentication Endpoints

#### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `400 Bad Request` - User already exists

---

#### Login User

Authenticate and obtain a JWT token.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials

---

#### Get Current User

Get information about the authenticated user.

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - User not found

---

#### Change Password

Change the authenticated user's password.

**Endpoint:** `POST /api/auth/change-password`

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `400 Bad Request` - Current password is incorrect
- `401 Unauthorized` - Not authenticated


### Contacts Endpoints

#### Create Contact

Create a new contact.

**Endpoint:** `POST /api/contacts`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "linkedIn": "https://linkedin.com/in/johndoe",
  "instagram": "@johndoe",
  "xHandle": "@johndoe",
  "location": "New York City",
  "customNotes": "Met at conference 2023",
  "frequencyPreference": "monthly"
}
```

**Response:** `201 Created`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "linkedIn": "https://linkedin.com/in/johndoe",
  "instagram": "@johndoe",
  "xHandle": "@johndoe",
  "location": "New York City",
  "timezone": "America/New_York",
  "customNotes": "Met at conference 2023",
  "frequencyPreference": "monthly",
  "groups": [],
  "tags": [],
  "archived": false,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or invalid data
- `401 Unauthorized` - Not authenticated

---

#### Get Contact

Retrieve a specific contact by ID.

**Endpoint:** `GET /api/contacts/:id`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID who owns the contact

**Response:** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "location": "New York City",
  "timezone": "America/New_York",
  "lastContactDate": "2024-01-01T12:00:00Z",
  "frequencyPreference": "monthly",
  "groups": ["770e8400-e29b-41d4-a716-446655440002"],
  "tags": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "text": "tech enthusiast",
      "source": "manual",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "archived": false,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `404 Not Found` - Contact not found
- `401 Unauthorized` - Not authenticated

---

#### List Contacts

List all contacts with optional filtering.

**Endpoint:** `GET /api/contacts`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID
- `groupId` (optional) - Filter by group ID
- `archived` (optional) - Filter by archived status (true/false)
- `search` (optional) - Search by name, email, or phone

**Response:** `200 OK`
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "New York City",
    "timezone": "America/New_York",
    "lastContactDate": "2024-01-01T12:00:00Z",
    "groups": ["770e8400-e29b-41d4-a716-446655440002"],
    "tags": [{"id": "880e8400-e29b-41d4-a716-446655440003", "text": "tech enthusiast"}]
  }
]
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Update Contact

Update an existing contact.

**Endpoint:** `PUT /api/contacts/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe Updated",
  "location": "San Francisco",
  "customNotes": "Now living in SF"
}
```

**Response:** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe Updated",
  "location": "San Francisco",
  "timezone": "America/Los_Angeles",
  "updatedAt": "2024-01-02T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or invalid data
- `404 Not Found` - Contact not found
- `401 Unauthorized` - Not authenticated

---

#### Delete Contact

Permanently delete a contact and all associated data.

**Endpoint:** `DELETE /api/contacts/:id`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID who owns the contact

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Archive Contact

Archive a contact (soft delete).

**Endpoint:** `POST /api/contacts/:id/archive`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId
- `401 Unauthorized` - Not authenticated


### Groups Endpoints

#### Create Group

Create a new contact group.

**Endpoint:** `POST /api/contacts/groups`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "College Friends"
}
```

**Response:** `201 Created`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "College Friends",
  "isDefault": false,
  "isPromotedFromTag": false,
  "archived": false,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or name
- `401 Unauthorized` - Not authenticated

---

#### Update Group

Update a group's name.

**Endpoint:** `PUT /api/contacts/groups/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "University Friends"
}
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "University Friends",
  "updatedAt": "2024-01-02T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing name
- `404 Not Found` - Group not found
- `401 Unauthorized` - Not authenticated

---

#### Bulk Assign/Remove Contacts to Group

Add or remove multiple contacts from a group.

**Endpoint:** `POST /api/contacts/bulk/groups`

**Authentication:** Required

**Request Body:**
```json
{
  "contactIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "660e8400-e29b-41d4-a716-446655440002"
  ],
  "groupId": "770e8400-e29b-41d4-a716-446655440002",
  "action": "add"
}
```

**Parameters:**
- `contactIds` - Array of contact IDs
- `groupId` - Group ID
- `action` - Either "add" or "remove"

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing or invalid parameters
- `401 Unauthorized` - Not authenticated


### Tags Endpoints

#### Add Tag

Add a tag to a contact.

**Endpoint:** `POST /api/contacts/tags`

**Authentication:** Required

**Request Body:**
```json
{
  "contactId": "660e8400-e29b-41d4-a716-446655440001",
  "text": "tech enthusiast",
  "source": "manual"
}
```

**Parameters:**
- `source` - One of: "manual", "voice_memo", "notification_reply"

**Response:** `201 Created`

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Not authenticated

---

#### Update Tag

Update a tag's text.

**Endpoint:** `PUT /api/contacts/tags/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "text": "technology enthusiast"
}
```

**Response:** `200 OK`
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "text": "technology enthusiast",
  "source": "manual",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing text
- `404 Not Found` - Tag not found
- `401 Unauthorized` - Not authenticated

---

#### Remove Tag

Remove a tag from a contact.

**Endpoint:** `DELETE /api/contacts/tags/:id`

**Authentication:** Required

**Query Parameters:**
- `contactId` (required) - Contact ID

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing contactId parameter
- `401 Unauthorized` - Not authenticated


### Suggestions Endpoints

#### Get Suggestions

Retrieve suggestions for a user with optional status filtering. Includes both individual and group suggestions.

**Endpoint:** `GET /api/suggestions`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID
- `status` (optional) - Filter by status (pending, accepted, dismissed, snoozed, all)

**Response:** `200 OK`
```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "individual",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe",
        "email": "john@example.com",
        "location": "New York City"
      }
    ],
    "contactId": "660e8400-e29b-41d4-a716-446655440001",
    "triggerType": "timebound",
    "proposedTimeslot": {
      "start": "2024-01-15T14:00:00Z",
      "end": "2024-01-15T15:00:00Z",
      "timezone": "America/New_York"
    },
    "reasoning": "It's been 3 weeks since you last connected. Based on your monthly preference, now is a good time to catch up.",
    "priority": 85,
    "status": "pending",
    "createdAt": "2024-01-10T12:00:00Z",
    "updatedAt": "2024-01-10T12:00:00Z"
  },
  {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "group",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440003",
        "name": "Mike Johnson",
        "email": "mike@example.com"
      }
    ],
    "triggerType": "timebound",
    "proposedTimeslot": {
      "start": "2024-01-20T18:00:00Z",
      "end": "2024-01-20T20:00:00Z",
      "timezone": "America/New_York"
    },
    "reasoning": "Jane and Mike share hiking interests and were mentioned together in your recent voice note. It's been 4 weeks since you all hung out.",
    "sharedContext": {
      "score": 75,
      "factors": {
        "commonGroups": ["Hiking Friends"],
        "sharedTags": ["hiking", "outdoors"],
        "coMentionedInVoiceNotes": 3,
        "overlappingInterests": ["hiking", "photography"]
      }
    },
    "priority": 90,
    "status": "pending",
    "createdAt": "2024-01-10T12:00:00Z",
    "updatedAt": "2024-01-10T12:00:00Z"
  },
  {
    "id": "990e8400-e29b-41d4-a716-446655440006",
    "type": "individual",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440004",
        "name": "Sarah Lee"
      }
    ],
    "contactId": "660e8400-e29b-41d4-a716-446655440004",
    "triggerType": "shared_activity",
    "proposedTimeslot": {
      "start": "2024-01-22T19:00:00Z",
      "end": "2024-01-22T21:00:00Z",
      "timezone": "America/New_York"
    },
    "reasoning": "You have 'Tech Meetup' on your calendar. Sarah shares interest in technology and is in the same city.",
    "calendarEventId": "abc123",
    "priority": 80,
    "status": "pending",
    "createdAt": "2024-01-10T12:00:00Z"
  }
]
```

**Suggestion Types:**
- `individual` - One-on-one suggestion with a single contact
- `group` - Group suggestion with 2-3 contacts

**Shared Context (Group Suggestions Only):**
- `score` - Shared context score (0-100)
- `factors` - Breakdown of shared context factors
  - `commonGroups` - Groups that all contacts belong to
  - `sharedTags` - Tags shared by all contacts
  - `coMentionedInVoiceNotes` - Number of times mentioned together
  - `overlappingInterests` - Common interests

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Accept Suggestion

Accept a suggestion and create an interaction log.

**Endpoint:** `POST /api/suggestions/:id/accept`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "suggestion": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "status": "accepted"
  },
  "draftMessage": "Hey John! It's been a while since we caught up. Would you be free for coffee on January 15th around 2pm?",
  "interactionLog": {
    "id": "aa0e8400-e29b-41d4-a716-446655440006",
    "contactId": "660e8400-e29b-41d4-a716-446655440001",
    "date": "2024-01-15T14:00:00Z",
    "type": "hangout"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId
- `404 Not Found` - Suggestion not found
- `401 Unauthorized` - Not authenticated

---

#### Dismiss Suggestion

Dismiss a suggestion with optional reason.

**Endpoint:** `POST /api/suggestions/:id/dismiss`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "met_too_recently"
}
```

**Common Dismissal Reasons:**
- `met_too_recently` - Already met recently
- `not_interested` - Not interested in connecting
- `wrong_time` - Timing doesn't work
- `wrong_person` - Not the right person to connect with

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId
- `404 Not Found` - Suggestion not found
- `401 Unauthorized` - Not authenticated

---

#### Snooze Suggestion

Temporarily hide a suggestion.

**Endpoint:** `POST /api/suggestions/:id/snooze`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "duration": "1 week"
}
```

**Duration Options:**
- `1 day`
- `3 days`
- `1 week`
- `2 weeks`
- `1 month`

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId or duration
- `404 Not Found` - Suggestion not found
- `401 Unauthorized` - Not authenticated

---

#### Remove Contact from Group Suggestion

Remove a specific contact from a group suggestion. If only one contact remains, the suggestion is converted to an individual suggestion.

**Endpoint:** `POST /api/suggestions/:id/remove-contact`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "contactId": "660e8400-e29b-41d4-a716-446655440002"
}
```

**Response:** `200 OK`

**When 2+ contacts remain:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "type": "group",
  "contacts": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "name": "Mike Johnson"
    }
  ],
  "sharedContext": {
    "score": 60,
    "factors": {
      "commonGroups": ["Hiking Friends"],
      "sharedTags": ["hiking"]
    }
  },
  "status": "pending"
}
```

**When only 1 contact remains (converted to individual):**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440005",
  "type": "individual",
  "contacts": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440003",
      "name": "Mike Johnson"
    }
  ],
  "contactId": "660e8400-e29b-41d4-a716-446655440003",
  "sharedContext": null,
  "status": "pending"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or contactId
- `400 Bad Request` - Can only remove contacts from group suggestions
- `400 Bad Request` - Contact not found in this suggestion
- `404 Not Found` - Suggestion not found
- `401 Unauthorized` - Not authenticated


### Calendar Endpoints

#### Connect Google Calendar

Initiate Google Calendar OAuth connection.

**Endpoint:** `POST /api/calendar/connect`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "authCode": "4/0AX4XfWh..."
}
```

**Response:** `201 Created`
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440007",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "connected": true,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing authCode or userId
- `500 Internal Server Error` - OAuth connection failed
- `401 Unauthorized` - Not authenticated

---

#### List User Calendars

Get all Google Calendars for the authenticated user.

**Endpoint:** `GET /api/calendar/calendars`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
[
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440008",
    "calendarId": "primary",
    "name": "Primary Calendar",
    "description": "My main calendar",
    "selected": true,
    "isPrimary": true
  },
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440009",
    "calendarId": "work@example.com",
    "name": "Work Calendar",
    "selected": false,
    "isPrimary": false
  }
]
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Update Calendar Selection

Select which calendars to use for availability detection.

**Endpoint:** `PUT /api/calendar/calendars/selection`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "calendarIds": [
    "primary",
    "work@example.com"
  ]
}
```

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId or calendarIds
- `401 Unauthorized` - Not authenticated

---

#### Get Calendar Feed URL

Get the iCal feed URL for suggestions.

**Endpoint:** `GET /api/calendar/feed`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
{
  "feedUrl": "https://api.catchup.app/api/calendar/feed/550e8400-e29b-41d4-a716-446655440000.ics"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Download iCal Feed

Download the iCal feed content.

**Endpoint:** `GET /api/calendar/feed/:userId.ics`

**Authentication:** Not required (uses signed URL)

**Response:** `200 OK`

**Content-Type:** `text/calendar; charset=utf-8`

**Response Body:** iCal format content

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CatchUp//Suggestions//EN
BEGIN:VEVENT
UID:990e8400-e29b-41d4-a716-446655440004
DTSTAMP:20240110T120000Z
DTSTART:20240115T140000Z
DTEND:20240115T150000Z
SUMMARY:Catch up with John Doe
DESCRIPTION:It's been 3 weeks since you last connected...
END:VEVENT
END:VCALENDAR
```

**Error Responses:**
- `404 Not Found` - User not found or no suggestions
- `500 Internal Server Error` - Failed to generate feed


### Voice Notes Endpoints

#### Create Recording Session

Create a new voice note recording session with real-time transcription.

**Endpoint:** `POST /api/voice-notes/sessions`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "languageCode": "en-US"
}
```

**Parameters:**
- `userId` (required) - User ID
- `languageCode` (optional) - Language code for transcription (default: "en-US")

**Response:** `201 Created`
```json
{
  "sessionId": "session-abc123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "recording",
  "startTime": "2024-01-01T12:00:00Z"
}
```

**WebSocket Connection:**

After creating a session, connect to the WebSocket endpoint for real-time transcription:

```
ws://localhost:3000/ws/voice-notes/:sessionId
```

**WebSocket Events:**

Client → Server:
```json
{
  "type": "audio_chunk",
  "data": "<base64_encoded_audio>"
}
```

Server → Client:
```json
{
  "type": "interim_transcript",
  "text": "I met John at the..."
}
```

```json
{
  "type": "final_transcript",
  "text": "I met John at the tech conference."
}
```

```json
{
  "type": "status_change",
  "status": "transcribing"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Failed to create session

---

#### Finalize Voice Note

Complete a voice note recording and trigger entity extraction.

**Endpoint:** `POST /api/voice-notes/:sessionId/finalize`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "voiceNote": {
    "id": "dd0e8400-e29b-41d4-a716-446655440010",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "transcript": "I met John at the tech conference last week. He's really into AI and machine learning. We should catch up monthly.",
    "recordingTimestamp": "2024-01-01T12:00:00Z",
    "status": "ready",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe"
      }
    ],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  "enrichmentProposal": {
    "voiceNoteId": "dd0e8400-e29b-41d4-a716-446655440010",
    "requiresContactSelection": false,
    "contactProposals": [
      {
        "contactId": "660e8400-e29b-41d4-a716-446655440001",
        "contactName": "John Doe",
        "items": [
          {
            "id": "item1",
            "type": "tag",
            "action": "add",
            "value": "AI",
            "accepted": true
          },
          {
            "id": "item2",
            "type": "tag",
            "action": "add",
            "value": "machine learning",
            "accepted": true
          },
          {
            "id": "item3",
            "type": "field",
            "action": "update",
            "field": "lastContactDate",
            "value": "2024-01-01",
            "accepted": true
          },
          {
            "id": "item4",
            "type": "field",
            "action": "update",
            "field": "frequencyPreference",
            "value": "monthly",
            "accepted": true
          }
        ]
      }
    ]
  }
}
```

**Status Values:**
- `recording` - Currently recording
- `transcribing` - Transcription in progress
- `extracting` - Entity extraction in progress
- `ready` - Ready for enrichment review
- `applied` - Enrichment has been applied
- `error` - Processing error occurred

**Error Responses:**
- `400 Bad Request` - Missing userId
- `404 Not Found` - Session not found
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Failed to finalize voice note

---

#### Get Voice Note

Retrieve a specific voice note by ID.

**Endpoint:** `GET /api/voice-notes/:id`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440010",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "transcript": "I met John at the tech conference last week. He's really into AI and machine learning. We should catch up monthly.",
  "recordingTimestamp": "2024-01-01T12:00:00Z",
  "status": "applied",
  "extractedEntities": {
    "660e8400-e29b-41d4-a716-446655440001": {
      "fields": {
        "lastContactDate": "2024-01-01",
        "frequencyPreference": "monthly"
      },
      "tags": ["AI", "machine learning"],
      "groups": []
    }
  },
  "contacts": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:05:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `404 Not Found` - Voice note not found
- `401 Unauthorized` - Not authenticated

---

#### List Voice Notes

List all voice notes with optional filtering and search.

**Endpoint:** `GET /api/voice-notes`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID
- `contactIds` (optional) - Filter by contact IDs (comma-separated or array)
- `status` (optional) - Filter by status (recording, transcribing, extracting, ready, applied, error)
- `dateFrom` (optional) - Filter by date range start (ISO 8601 format)
- `dateTo` (optional) - Filter by date range end (ISO 8601 format)
- `searchText` (optional) - Search across transcripts

**Response:** `200 OK`
```json
[
  {
    "id": "dd0e8400-e29b-41d4-a716-446655440010",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "transcript": "I met John at the tech conference...",
    "recordingTimestamp": "2024-01-01T12:00:00Z",
    "status": "applied",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe"
      }
    ],
    "enrichmentSummary": {
      "tagsAdded": 2,
      "fieldsUpdated": 2,
      "groupsAdded": 0
    },
    "createdAt": "2024-01-01T12:00:00Z"
  },
  {
    "id": "dd0e8400-e29b-41d4-a716-446655440011",
    "transcript": "Had coffee with Jane and Mike...",
    "recordingTimestamp": "2024-01-02T14:00:00Z",
    "status": "ready",
    "contacts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "name": "Jane Smith"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440003",
        "name": "Mike Johnson"
      }
    ],
    "createdAt": "2024-01-02T14:00:00Z"
  }
]
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Delete Voice Note

Permanently delete a voice note and all associated data.

**Endpoint:** `DELETE /api/voice-notes/:id`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `404 Not Found` - Voice note not found
- `401 Unauthorized` - Not authenticated

---

#### Apply Enrichment

Apply selected enrichment items to contacts.

**Endpoint:** `POST /api/voice-notes/:id/enrichment/apply`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "enrichmentProposal": {
    "voiceNoteId": "dd0e8400-e29b-41d4-a716-446655440010",
    "contactProposals": [
      {
        "contactId": "660e8400-e29b-41d4-a716-446655440001",
        "contactName": "John Doe",
        "items": [
          {
            "id": "item1",
            "type": "tag",
            "action": "add",
            "value": "AI",
            "accepted": true
          },
          {
            "id": "item2",
            "type": "tag",
            "action": "add",
            "value": "machine learning",
            "accepted": false
          },
          {
            "id": "item3",
            "type": "field",
            "action": "update",
            "field": "lastContactDate",
            "value": "2024-01-01",
            "accepted": true
          },
          {
            "id": "item4",
            "type": "group",
            "action": "add",
            "value": "Tech Friends",
            "accepted": true
          }
        ]
      }
    ]
  }
}
```

**Enrichment Item Types:**
- `field` - Update contact field (phone, email, location, customNotes, etc.)
- `tag` - Add tag to contact
- `group` - Add contact to group (creates group if it doesn't exist)
- `lastContactDate` - Update last contact date

**Response:** `200 OK`
```json
{
  "success": true,
  "results": [
    {
      "contactId": "660e8400-e29b-41d4-a716-446655440001",
      "contactName": "John Doe",
      "success": true,
      "appliedItems": 3,
      "failedItems": 0,
      "details": {
        "tagsAdded": ["AI"],
        "groupsAdded": ["Tech Friends"],
        "fieldsUpdated": ["lastContactDate"]
      }
    }
  ],
  "totalApplied": 3,
  "totalFailed": 0
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId or enrichmentProposal
- `404 Not Found` - Voice note not found
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Failed to apply enrichment

---

#### Update Contact Associations

Add, remove, or replace contacts associated with a voice note.

**Endpoint:** `PATCH /api/voice-notes/:id/contacts`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "contactIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "660e8400-e29b-41d4-a716-446655440002"
  ],
  "action": "add"
}
```

**Actions:**
- `add` - Add new contact associations
- `remove` - Remove contact associations
- `replace` - Replace all contact associations

**Response:** `200 OK`
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440010",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "transcript": "I met John and Jane...",
  "contacts": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "name": "Jane Smith"
    }
  ],
  "updatedAt": "2024-01-01T12:10:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId, contactIds, or action
- `400 Bad Request` - Invalid action value
- `404 Not Found` - Voice note not found
- `401 Unauthorized` - Not authenticated


### Google Contacts Endpoints

#### Overview

The Google Contacts integration provides one-way synchronization from Google Contacts to CatchUp. All operations are read-only - CatchUp never modifies your Google Contacts data.

**Key Features:**
- OAuth 2.0 authentication with read-only scopes
- Full and incremental contact synchronization
- Contact group mapping with AI-powered suggestions
- Automatic background sync
- Source tracking for imported contacts

**Important:** All sync operations are one-way (Google → CatchUp). Changes made in CatchUp do not sync back to Google Contacts.

---

#### Get Authorization URL

Get the OAuth authorization URL to connect Google Contacts.

**Endpoint:** `GET /api/contacts/oauth/authorize`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Usage:**
1. Call this endpoint to get the authorization URL
2. Redirect the user to the returned URL
3. User authorizes the app on Google's consent screen
4. Google redirects back to your callback URL with an authorization code

**Error Responses:**
- `500 Internal Server Error` - Failed to generate authorization URL

---

#### Handle OAuth Callback

Complete the OAuth flow and store tokens.

**Endpoint:** `GET /api/contacts/oauth/callback`

**Authentication:** Required

**Query Parameters:**
- `code` (required) - Authorization code from Google

**Response:** `200 OK`
```json
{
  "message": "Google Contacts connected successfully",
  "email": "user@gmail.com",
  "expiresAt": "2024-01-08T12:00:00Z"
}
```

**Behavior:**
- Exchanges authorization code for access and refresh tokens
- Stores encrypted tokens in database
- Automatically triggers a full sync in the background
- Returns user's Google email address

**Error Responses:**
- `400 Bad Request` - Missing authorization code
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Failed to exchange code for tokens

---

#### Get Connection Status

Check if user has connected Google Contacts and view sync status.

**Endpoint:** `GET /api/contacts/oauth/status`

**Authentication:** Required

**Response:** `200 OK`

**When connected:**
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "expiresAt": "2024-01-08T12:00:00Z",
  "lastSyncAt": "2024-01-01T12:00:00Z",
  "totalContactsSynced": 150,
  "syncStatus": "success",
  "autoSyncEnabled": true
}
```

**When not connected:**
```json
{
  "connected": false
}
```

**Sync Status Values:**
- `pending` - Sync has not started yet
- `in_progress` - Sync is currently running
- `success` - Last sync completed successfully
- `failed` - Last sync failed (check `lastSyncError` for details)

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

#### Disconnect Google Contacts

Disconnect Google Contacts and stop synchronization.

**Endpoint:** `DELETE /api/contacts/oauth/disconnect`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Google Contacts disconnected successfully"
}
```

**Behavior:**
- Deletes stored OAuth tokens
- Stops automatic background sync
- Preserves existing contacts in CatchUp
- Clears sync metadata (sync tokens, last sync time)

**Note:** Contacts imported from Google remain in CatchUp but will no longer sync. To remove them, manually delete contacts with source="google".

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Failed to disconnect

---

#### Trigger Full Sync

Manually trigger a full synchronization of all contacts.

**Endpoint:** `POST /api/contacts/sync/full`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `202 Accepted`
```json
{
  "message": "Full sync started",
  "jobId": "job-abc123",
  "status": "queued"
}
```

**Behavior:**
- Queues a full sync job in the background
- Fetches all contacts from Google Contacts
- Imports or updates contacts in CatchUp
- Generates group mapping suggestions
- Stores sync token for future incremental syncs

**Use Cases:**
- Initial import after connecting
- Recovering from sync errors
- When sync token has expired

**Error Responses:**
- `400 Bad Request` - Missing userId
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Google Contacts not connected
- `429 Too Many Requests` - Sync already in progress

---

#### Trigger Incremental Sync

Manually trigger an incremental synchronization (only changed contacts).

**Endpoint:** `POST /api/contacts/sync/incremental`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `202 Accepted`
```json
{
  "message": "Incremental sync started",
  "jobId": "job-def456",
  "status": "queued"
}
```

**Behavior:**
- Uses stored sync token to fetch only changes
- Updates modified contacts
- Archives deleted contacts
- Faster than full sync
- Automatically falls back to full sync if token expired

**Use Cases:**
- Regular sync updates
- User-triggered "Sync Now" button
- Automatic background sync (daily)

**Error Responses:**
- `400 Bad Request` - Missing userId
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Google Contacts not connected
- `429 Too Many Requests` - Sync already in progress

---

#### Get Sync Status

Get detailed status of the current or last sync operation.

**Endpoint:** `GET /api/contacts/sync/status`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
{
  "connected": true,
  "lastFullSyncAt": "2024-01-01T12:00:00Z",
  "lastIncrementalSyncAt": "2024-01-02T08:00:00Z",
  "totalContactsSynced": 150,
  "lastSyncStatus": "success",
  "lastSyncError": null,
  "syncInProgress": false,
  "autoSyncEnabled": true,
  "lastSyncResult": {
    "contactsImported": 5,
    "contactsUpdated": 10,
    "contactsDeleted": 2,
    "groupsImported": 3,
    "suggestionsGenerated": 3,
    "duration": 12500,
    "errors": []
  }
}
```

**When sync is in progress:**
```json
{
  "connected": true,
  "syncInProgress": true,
  "currentSyncType": "incremental",
  "syncStartedAt": "2024-01-02T09:00:00Z"
}
```

**When sync failed:**
```json
{
  "connected": true,
  "lastSyncStatus": "failed",
  "lastSyncError": "Rate limit exceeded. Will retry in 5 minutes.",
  "lastSyncAt": "2024-01-02T08:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Get Pending Group Mappings

Get all pending group mapping suggestions that require user review.

**Endpoint:** `GET /api/contacts/groups/mappings/pending`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
[
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440013",
    "googleResourceName": "contactGroups/abc123",
    "googleName": "College Friends",
    "memberCount": 15,
    "suggestedAction": "map_to_existing",
    "suggestedGroupId": "770e8400-e29b-41d4-a716-446655440002",
    "suggestedGroupName": "University Friends",
    "confidenceScore": 0.85,
    "reason": "Similar name (85% match) and 60% member overlap",
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440014",
    "googleResourceName": "contactGroups/def456",
    "googleName": "Work Team",
    "memberCount": 8,
    "suggestedAction": "create_new",
    "suggestedGroupName": "Work Team",
    "confidenceScore": 0.90,
    "reason": "No similar existing group found",
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

**Suggested Actions:**
- `map_to_existing` - Map to an existing CatchUp group
- `create_new` - Create a new CatchUp group

**Confidence Score:**
- 0.0 - 0.6: Low confidence
- 0.6 - 0.8: Medium confidence
- 0.8 - 1.0: High confidence

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Get All Group Mappings

Get all group mappings (pending, approved, and rejected).

**Endpoint:** `GET /api/contacts/groups/mappings`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID
- `status` (optional) - Filter by status (pending, approved, rejected)

**Response:** `200 OK`
```json
[
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440013",
    "googleResourceName": "contactGroups/abc123",
    "googleName": "College Friends",
    "catchupGroupId": "770e8400-e29b-41d4-a716-446655440002",
    "catchupGroupName": "University Friends",
    "memberCount": 15,
    "status": "approved",
    "lastSyncedAt": "2024-01-02T08:00:00Z",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  {
    "id": "ff0e8400-e29b-41d4-a716-446655440015",
    "googleResourceName": "contactGroups/ghi789",
    "googleName": "Newsletter Subscribers",
    "memberCount": 500,
    "status": "rejected",
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Approve Group Mapping

Approve a pending group mapping suggestion.

**Endpoint:** `POST /api/contacts/groups/mappings/:id/approve`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440013",
  "googleResourceName": "contactGroups/abc123",
  "googleName": "College Friends",
  "catchupGroupId": "770e8400-e29b-41d4-a716-446655440002",
  "catchupGroupName": "University Friends",
  "status": "approved",
  "message": "Group mapping approved. Contacts will be synced to this group."
}
```

**Behavior:**
- Updates mapping status to "approved"
- Creates CatchUp group if suggested action was "create_new"
- Links to existing CatchUp group if suggested action was "map_to_existing"
- Future syncs will add contacts from this Google group to the CatchUp group

**Error Responses:**
- `400 Bad Request` - Missing userId
- `404 Not Found` - Mapping not found
- `401 Unauthorized` - Not authenticated

---

#### Reject Group Mapping

Reject a pending group mapping suggestion.

**Endpoint:** `POST /api/contacts/groups/mappings/:id/reject`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440015",
  "googleResourceName": "contactGroups/ghi789",
  "googleName": "Newsletter Subscribers",
  "status": "rejected",
  "message": "Group mapping rejected. This group will not be synced."
}
```

**Behavior:**
- Updates mapping status to "rejected"
- Contacts from this Google group will not be added to any CatchUp group
- The mapping can be re-approved later if needed

**Error Responses:**
- `400 Bad Request` - Missing userId
- `404 Not Found` - Mapping not found
- `401 Unauthorized` - Not authenticated

---

### Google Contacts Data Model

#### Contact Source Tracking

Contacts imported from Google have the following additional fields:

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe",
  "email": "john@example.com",
  "source": "google",
  "googleResourceName": "people/c1234567890",
  "googleEtag": "\"abc123def456\"",
  "lastSyncedAt": "2024-01-02T08:00:00Z"
}
```

**Source Values:**
- `manual` - Manually created in CatchUp
- `google` - Imported from Google Contacts
- `calendar` - Imported from Google Calendar
- `voice_note` - Created from voice note

#### One-Way Sync Behavior

**What syncs from Google to CatchUp:**
- Contact names, emails, phones
- Organizations, addresses, URLs
- Contact group memberships
- Contact updates and deletions

**What does NOT sync back to Google:**
- Changes made in CatchUp
- Tags added in CatchUp
- Custom notes in CatchUp
- New contacts created in CatchUp
- New groups created in CatchUp

**Important:** Your Google Contacts remain completely unchanged. CatchUp only reads data, never writes.

---

### Google Contacts Rate Limits

**Sync Operations:**
- Full sync: 1 per hour per user
- Incremental sync: 1 per 5 minutes per user
- Manual sync: 3 per hour per user

**API Requests:**
- Google People API: 600 requests per minute per user
- Project-wide: 3,000 requests per minute

**Rate Limit Response:**
```json
{
  "error": "Too many requests",
  "message": "Sync rate limit exceeded. Try again in 30 minutes.",
  "retryAfter": 1800
}
```

---

### Google Contacts Security

**OAuth Scopes (Read-Only):**
- `https://www.googleapis.com/auth/contacts.readonly`
- `https://www.googleapis.com/auth/contacts.other.readonly`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

**Security Features:**
- All OAuth tokens encrypted at rest (AES-256)
- Automatic token refresh before expiration
- HTTPS required for all API calls
- Read-only scopes prevent accidental writes
- Audit logging for all sync operations

**Data Privacy:**
- Contacts stored securely in CatchUp database
- No data shared with third parties
- User can disconnect and delete data anytime
- GDPR compliant data handling


### Preferences Endpoints

#### Update Availability Preferences

Configure availability parameters for suggestion matching.

**Endpoint:** `PUT /api/preferences/availability`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "availabilityParams": {
    "manualTimeBlocks": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "17:00"
      },
      {
        "dayOfWeek": 2,
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ],
    "commuteWindows": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "09:00"
      },
      {
        "dayOfWeek": 1,
        "startTime": "17:00",
        "endTime": "18:00"
      }
    ],
    "nighttimeStart": "22:00",
    "nighttimeEnd": "07:00"
  }
}
```

**Parameters:**
- `dayOfWeek` - 0 (Sunday) to 6 (Saturday)
- `startTime` / `endTime` - HH:mm format (24-hour)

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId or availabilityParams
- `401 Unauthorized` - Not authenticated

---

#### Get Availability Preferences

Retrieve availability parameters.

**Endpoint:** `GET /api/preferences/availability`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
{
  "manualTimeBlocks": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ],
  "commuteWindows": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "09:00"
    }
  ],
  "nighttimeStart": "22:00",
  "nighttimeEnd": "07:00"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated

---

#### Update Notification Preferences

Configure notification delivery preferences.

**Endpoint:** `PUT /api/preferences/notifications`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "notificationPreferences": {
    "smsEnabled": true,
    "emailEnabled": true,
    "batchDay": 0,
    "batchTime": "09:00",
    "timezone": "America/New_York"
  }
}
```

**Parameters:**
- `smsEnabled` - Enable SMS notifications
- `emailEnabled` - Enable email notifications
- `batchDay` - Day of week for batch notifications (0-6, 0=Sunday)
- `batchTime` - Time for batch notifications (HH:mm format)
- `timezone` - IANA timezone identifier

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request` - Missing userId or notificationPreferences
- `401 Unauthorized` - Not authenticated

---

#### Get Notification Preferences

Retrieve notification preferences.

**Endpoint:** `GET /api/preferences/notifications`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID

**Response:** `200 OK`
```json
{
  "smsEnabled": true,
  "emailEnabled": true,
  "batchDay": 0,
  "batchTime": "09:00",
  "timezone": "America/New_York"
}
```

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated


### Account Endpoints

#### Delete Account

Permanently delete user account and all associated data.

**Endpoint:** `DELETE /api/account`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "confirmPassword": "userPassword123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Account deleted successfully",
  "deletedAt": "2024-01-01T12:00:00Z"
}
```

**Deleted Data:**
- User account
- All contacts
- All groups
- All tags
- All suggestions
- All interaction logs
- All voice notes
- Calendar connections
- All preferences

**Error Responses:**
- `400 Bad Request` - Missing userId or confirmPassword
- `401 Unauthorized` - Invalid password
- `401 Unauthorized` - Not authenticated

---

#### Export User Data

Export all user data for GDPR compliance.

**Endpoint:** `GET /api/account/export`

**Authentication:** Required

**Query Parameters:**
- `userId` (required) - User ID
- `format` (optional) - Export format: "json" (default) or "csv"

**Response:** `200 OK`

**Content-Type:** `application/json` or `text/csv`

**JSON Format Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "contacts": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "location": "New York City",
      "timezone": "America/New_York",
      "tags": ["AI", "tech enthusiast"],
      "groups": ["Close Friends"],
      "lastContactDate": "2024-01-01T12:00:00Z"
    }
  ],
  "groups": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Close Friends",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "suggestions": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "contactName": "John Doe",
      "triggerType": "timebound",
      "status": "accepted",
      "createdAt": "2024-01-10T12:00:00Z"
    }
  ],
  "interactionLogs": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440006",
      "contactName": "John Doe",
      "date": "2024-01-15T14:00:00Z",
      "type": "hangout",
      "notes": "Coffee at Starbucks"
    }
  ],
  "voiceNotes": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440010",
      "transcript": "I met John at the tech conference...",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "preferences": {
    "availability": {
      "nighttimeStart": "22:00",
      "nighttimeEnd": "07:00"
    },
    "notifications": {
      "smsEnabled": true,
      "emailEnabled": true,
      "batchDay": 0,
      "batchTime": "09:00"
    }
  }
}
```

**CSV Format Response:**

Multiple CSV files in a ZIP archive:
- `contacts.csv`
- `groups.csv`
- `suggestions.csv`
- `interaction_logs.csv`
- `voice_notes.csv`

**Error Responses:**
- `400 Bad Request` - Missing userId parameter
- `401 Unauthorized` - Not authenticated


## Security Best Practices

### HTTPS Only

All API requests must use HTTPS in production. HTTP requests will be automatically redirected to HTTPS.

### Token Storage

- Store JWT tokens securely (e.g., httpOnly cookies or secure storage)
- Never expose tokens in URLs or logs
- Rotate tokens regularly

### Request Signing

For sensitive operations (account deletion, data export), additional password confirmation is required.

### CORS

The API implements CORS (Cross-Origin Resource Sharing) with the following policy:
- Allowed origins: Configured via `ALLOWED_ORIGINS` environment variable
- Allowed methods: GET, POST, PUT, DELETE
- Allowed headers: Authorization, Content-Type
- Credentials: Supported

### Security Headers

All responses include security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000` (production only)
- `Content-Security-Policy: default-src 'self'`

## Webhooks

### Notification Delivery Status

Receive callbacks for SMS and email delivery status.

**Webhook URL Configuration:** Set via dashboard or API

**Webhook Payload:**
```json
{
  "event": "notification.delivered",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "notificationId": "ee0e8400-e29b-41d4-a716-446655440012",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "channel": "sms",
    "status": "delivered",
    "deliveredAt": "2024-01-01T12:00:05Z"
  }
}
```

**Event Types:**
- `notification.delivered` - Notification successfully delivered
- `notification.failed` - Notification delivery failed
- `notification.bounced` - Email bounced

### Webhook Security

Webhooks include a signature header for verification:

```
X-CatchUp-Signature: sha256=abc123...
```

Verify signature using your webhook secret:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

## SDK and Client Libraries

### Official SDKs

- **JavaScript/TypeScript:** `npm install @catchup/sdk`
- **Python:** `pip install catchup-sdk`

### Example Usage (JavaScript)

```javascript
import { CatchUpClient } from '@catchup/sdk';

const client = new CatchUpClient({
  apiKey: 'your_jwt_token',
  baseUrl: 'https://api.catchup.app'
});

// Create a contact
const contact = await client.contacts.create({
  name: 'John Doe',
  email: 'john@example.com',
  location: 'New York City'
});

// Get suggestions
const suggestions = await client.suggestions.list();

// Accept a suggestion
await client.suggestions.accept(suggestionId);
```

## Support

### API Status

Check API status: https://status.catchup.app

### Rate Limit Increases

Contact support@catchup.app for rate limit increases.

### Bug Reports

Report bugs via GitHub: https://github.com/catchup/api/issues

### Documentation Updates

API documentation version: 1.0.0  
Last updated: 2024-01-01

