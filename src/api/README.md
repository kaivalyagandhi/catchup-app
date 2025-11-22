# CatchUp API Layer

## Overview

This directory contains the REST API implementation for the CatchUp application, including all endpoints for contact management, suggestions, calendar integration, voice notes, and preferences.

## Implementation Status

### Completed ✅

1. **API Server Setup** (`src/api/server.ts`)
   - Express server configuration
   - CORS and JSON middleware
   - Static file serving for web interface
   - Error handling middleware
   - Health check endpoint

2. **Contact Management Routes** (`src/api/routes/contacts.ts`)
   - POST /api/contacts - Create contact
   - GET /api/contacts/:id - Get contact
   - GET /api/contacts - List contacts with filters
   - PUT /api/contacts/:id - Update contact
   - DELETE /api/contacts/:id - Delete contact
   - POST /api/contacts/:id/archive - Archive contact
   - POST /api/groups - Create group
   - PUT /api/groups/:id - Update group
   - POST /api/contacts/bulk/groups - Bulk group operations
   - POST /api/tags - Add tag
   - PUT /api/tags/:id - Update tag
   - DELETE /api/tags/:id - Remove tag

3. **Suggestion Routes** (`src/api/routes/suggestions.ts`)
   - GET /api/suggestions - Get pending suggestions
   - POST /api/suggestions/:id/accept - Accept suggestion
   - POST /api/suggestions/:id/dismiss - Dismiss suggestion
   - POST /api/suggestions/:id/snooze - Snooze suggestion

4. **Calendar Routes** (`src/api/routes/calendar.ts`)
   - POST /api/calendar/connect - Connect Google Calendar
   - GET /api/calendar/calendars - List calendars
   - PUT /api/calendar/calendars/selection - Update calendar selection
   - GET /api/calendar/feed - Get feed URL
   - GET /api/calendar/feed/:userId.ics - Serve iCal feed

5. **Voice Notes Routes** (`src/api/routes/voice-notes.ts`)
   - POST /api/voice-notes - Upload and process voice note
   - GET /api/voice-notes/:id - Get voice note
   - POST /api/voice-notes/:id/enrichment - Apply enrichment

6. **Preferences Routes** (`src/api/routes/preferences.ts`)
   - PUT /api/preferences/availability - Update availability
   - GET /api/preferences/availability - Get availability
   - PUT /api/preferences/notifications - Update notifications
   - GET /api/preferences/notifications - Get notifications

7. **Web Interface** (`public/`)
   - Single-page application with navigation
   - Contact management UI
   - Suggestion feed UI
   - Calendar integration UI
   - Voice notes UI
   - Preferences UI

### Known Issues ⚠️

Some TypeScript compilation errors exist that need to be resolved:

1. **Route Handler Return Types**: Some async route handlers need explicit `Promise<void>` return types
2. **Service Function Signatures**: Some service calls need userId parameter added
3. **Tag Service**: addTag function signature needs adjustment for the API
4. **Group Service**: Bulk operations need userId parameter

### Next Steps

1. Fix TypeScript compilation errors in route handlers
2. Add authentication middleware
3. Add request validation middleware
4. Add rate limiting
5. Add API documentation (Swagger/OpenAPI)
6. Add integration tests for API endpoints

## Usage

### Starting the Server

```bash
npm run dev
```

The server will start on port 3000 (or PORT environment variable).

### API Base URL

```
http://localhost:3000/api
```

### Web Interface

```
http://localhost:3000
```

## Authentication

Currently uses a demo user ID. In production, this should be replaced with proper authentication:

- JWT tokens
- OAuth integration
- Session management

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message"
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error

## Dependencies

- express: Web framework
- cors: CORS middleware
- multer: File upload handling
- body-parser: Request body parsing

## File Structure

```
src/api/
├── server.ts           # Express server setup
└── routes/
    ├── contacts.ts     # Contact management endpoints
    ├── suggestions.ts  # Suggestion endpoints
    ├── calendar.ts     # Calendar integration endpoints
    ├── voice-notes.ts  # Voice note endpoints
    └── preferences.ts  # Preferences endpoints

public/
├── index.html          # Web interface HTML
└── js/
    └── app.js          # Web interface JavaScript
```
