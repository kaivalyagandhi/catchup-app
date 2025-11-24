# CatchUp - Local Testing Guide

## Implemented Features

CatchUp has the following core features implemented and ready for testing:

### 1. **Authentication & Account Management**
- User registration and login with JWT tokens
- Password change functionality
- Account deletion with data export (GDPR compliance)
- Audit logging for security events

### 2. **Contact Management**
- Create, read, update, delete contacts
- Bulk operations (archive, group assignment)
- Tag management (manual, voice memo, notification reply sources)
- Group management with default groups
- Timezone inference from city names (100 cities dataset)
- Frequency preferences (daily, weekly, biweekly, monthly, quarterly)

### 3. **Calendar Integration**
- Google Calendar OAuth connection
- Calendar selection for availability detection
- Free slot detection based on calendar events
- iCal feed generation for suggestions
- Availability preferences (manual time blocks, commute windows, nighttime)

### 4. **Suggestion Engine**
- Time-bound suggestions (based on last contact + frequency preference)
- Shared activity suggestions (calendar event matching)
- Shared interest suggestions (tag matching)
- Suggestion scoring and ranking
- Accept/dismiss/snooze actions

### 5. **Voice Notes**
- Audio upload and transcription (OpenAI Whisper)
- Entity extraction (contacts, tags, dates)
- Contact disambiguation
- Enrichment application to contacts

### 6. **Notifications**
- SMS notifications via Twilio
- Email notifications via SendGrid
- Batch notification scheduling
- Real-time notifications
- Reply processing for quick actions

### 7. **Background Jobs**
- Job queue with Bull and Redis
- Scheduled suggestion generation
- Batch notification processing
- Retry logic with exponential backoff

### 8. **Security & Performance**
- Rate limiting (per-endpoint configuration)
- JWT authentication middleware
- Encryption for sensitive data
- Caching layer with Redis
- Audit logging for sensitive operations
- HTTPS enforcement and security headers

---

## Prerequisites

Before testing locally, ensure you have:

1. **Node.js 18+** and npm installed
2. **PostgreSQL 14+** installed and running
3. **Redis** installed and running (for job queue and caching)
4. **API Keys** (optional for full testing):
   - Google Calendar OAuth credentials
   - Twilio account (for SMS)
   - SendGrid API key (for email)
   - OpenAI API key (for voice transcription)

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Your `.env` file is already configured with:
- Database connection (PostgreSQL on localhost)
- JWT secret and encryption key
- Redis connection
- Placeholder API keys for third-party services

**Note:** The app will run without third-party API keys, but some features will be limited:
- Voice transcription requires OpenAI API key
- SMS notifications require Twilio credentials
- Email notifications require SendGrid API key
- Calendar integration requires Google OAuth credentials

### 3. Start PostgreSQL

Make sure PostgreSQL is running:

```bash
# macOS with Homebrew
brew services start postgresql@14

# Or check if it's already running
pg_isready
```

### 4. Start Redis

Make sure Redis is running:

```bash
# macOS with Homebrew
brew services start redis

# Or check if it's already running
redis-cli ping
# Should return: PONG
```

### 5. Initialize Database

Run the database setup script:

```bash
npm run db:setup
```

This will:
- Create the `catchup_db` database if it doesn't exist
- Run all migrations to create tables and indexes
- Set up the schema

### 6. Test Database Connection

```bash
npm run db:test
```

You should see: "Database connection successful!"

---

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Build

Build and run the production version:

```bash
npm run build
npm start
```

---

## Testing Features

### 1. Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. User Registration

Create a new user account:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token** - you'll need it for authenticated requests!

### 3. User Login

Login with existing credentials:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'
```

### 4. Create a Contact

Replace `YOUR_TOKEN` and `YOUR_USER_ID` with values from registration:

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "location": "New York City",
    "frequencyPreference": "monthly"
  }'
```

Expected response includes:
- Contact ID
- Inferred timezone (America/New_York)
- Empty groups and tags arrays

### 5. List Contacts

```bash
curl "http://localhost:3000/api/contacts?userId=YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Create a Group

```bash
curl -X POST http://localhost:3000/api/contacts/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "name": "Close Friends"
  }'
```

### 7. Add Tag to Contact

```bash
curl -X POST http://localhost:3000/api/contacts/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactId": "CONTACT_ID",
    "text": "tech enthusiast",
    "source": "manual"
  }'
```

### 8. Get Suggestions

```bash
curl "http://localhost:3000/api/suggestions?userId=YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Initially, this will return an empty array. Suggestions are generated by:
- Background jobs (scheduled)
- Time-based triggers (contacts you haven't talked to in a while)
- Calendar events (when you have activities that match contact interests)

### 9. Update Notification Preferences

```bash
curl -X PUT http://localhost:3000/api/preferences/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "notificationPreferences": {
      "smsEnabled": false,
      "emailEnabled": true,
      "batchDay": 0,
      "batchTime": "09:00",
      "timezone": "America/New_York"
    }
  }'
```

### 10. Export User Data

```bash
curl "http://localhost:3000/api/account/export?userId=YOUR_USER_ID&format=json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > my_data.json
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

The project uses:
- **Vitest** for unit testing
- **fast-check** for property-based testing (100+ iterations per test)

### Test Coverage

Current test coverage includes:
- Contact service (CRUD operations, validation)
- Calendar service (availability detection, free slots)
- Matching service (suggestion generation, scoring)
- Notification service (SMS, email, batch processing)
- Voice service (transcription, entity extraction)
- Utility functions (validation, caching, rate limiting)

---

## Testing with Postman/Insomnia

For easier API testing, you can import the API documentation into Postman or Insomnia:

1. Create a new collection
2. Set base URL: `http://localhost:3000`
3. Add an environment variable for your JWT token
4. Use the endpoints documented in `docs/API.md`

---

## Testing Background Jobs

Background jobs require Redis to be running. To test job processing:

### 1. Start the Job Worker

In a separate terminal:

```bash
npm run dev
```

The worker will automatically start processing jobs from the queue.

### 2. Trigger Job Creation

Jobs are created automatically when:
- A new contact is added (suggestion generation)
- Batch notification time is reached (notification sending)
- Calendar events are detected (shared activity suggestions)

You can also manually trigger jobs by calling the appropriate API endpoints.

---

## Testing Calendar Integration

To test Google Calendar integration, you need:

1. **Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3000/auth/google/callback`
   - Copy Client ID and Client Secret to `.env`

2. **Connect Calendar**:
   ```bash
   curl -X POST http://localhost:3000/api/calendar/connect \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "userId": "YOUR_USER_ID",
       "authCode": "GOOGLE_AUTH_CODE"
     }'
   ```

3. **Get iCal Feed**:
   ```bash
   curl "http://localhost:3000/api/calendar/feed?userId=YOUR_USER_ID" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Testing Voice Notes

To test voice note transcription, you need an OpenAI API key:

1. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

2. Upload an audio file:
   ```bash
   curl -X POST http://localhost:3000/api/voice-notes \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "audio=@/path/to/audio.mp3" \
     -F "userId=YOUR_USER_ID"
   ```

Supported formats: MP3, WAV, M4A, OGG, FLAC (max 10MB)

---

## Troubleshooting

### Database Connection Issues

If you see "Failed to connect to database":

1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Ensure database exists: `psql -l | grep catchup_db`
4. Check logs: `tail -f /usr/local/var/log/postgres.log` (macOS)

### Redis Connection Issues

If background jobs aren't working:

1. Check Redis is running: `redis-cli ping`
2. Verify Redis URL in `.env`
3. Check Redis logs: `redis-cli monitor`

### Rate Limiting

If you hit rate limits during testing:

- Wait for the rate limit window to reset (shown in `Retry-After` header)
- Or temporarily disable rate limiting in `src/api/server.ts`

### Port Already in Use

If port 3000 is already in use:

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or change port in .env
PORT=3001
```

---

## Next Steps

After testing locally, you can:

1. **Deploy to Production**: See `docs/DEPLOYMENT.md`
2. **Configure Third-Party Services**: Add real API keys for full functionality
3. **Customize**: Modify matching algorithms, notification templates, etc.
4. **Scale**: Add more Redis workers, database replicas, etc.

---

## Additional Resources

- **API Documentation**: `docs/API.md` - Complete API reference
- **Deployment Guide**: `docs/DEPLOYMENT.md` - Production deployment instructions
- **Security Guide**: `SECURITY.md` - Security best practices
- **Module Documentation**: Each module has a README in its directory

---

## Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review module-specific READMEs
3. Check test files for usage examples
4. Review implementation summaries in each module
