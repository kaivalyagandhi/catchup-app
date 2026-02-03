# Group Scheduling Feature

## Overview

The Group Scheduling feature enables CatchUp users to coordinate catchups with friends through intelligent availability collection and AI-powered conflict resolution. It provides a streamlined way to find the best time to meet with one or more contacts.

## Key Features

### 🗓️ Scheduling Page
- Dedicated navigation page for managing all catchup plans
- Calendar and list view toggle with preference persistence
- Filter by status (All, Pending, Scheduled, Past)
- Quick actions for planning with circles or groups

### 📝 Plan Creation
- Multi-contact selection with circle/group filtering
- Activity type selection (coffee, dinner, video call, activity)
- Duration preferences (30min, 1hr, 2hr, half-day)
- Date range selection (up to 14 days)
- Must-attend vs nice-to-have attendee marking
- Scheduling preferences integration

### 🔗 Invite Link System
- Unique shareable URLs for each invitee
- Copy-to-clipboard functionality
- 30-day expiration
- Access and submission tracking
- Link regeneration support

### 📊 Availability Collection
- Lightweight public page (no login required)
- Calendar grid with 30-minute time slots
- Auto-detected timezone
- Mobile-responsive touch interface
- Update availability before finalization

### 📈 Availability Dashboard
- Visual grid showing all participants' availability
- Overlap highlighting (perfect, near, partial)
- Must-attend vs nice-to-have distinction
- Response status tracking
- Real-time updates

### 🤖 AI Conflict Resolution
- Powered by Google Gemini
- Suggests optimal meeting times
- Recommends excluding optional attendees
- Suggests alternative activities
- Explains reasoning for each suggestion

### 🔒 Privacy Controls
- Calendar availability private by default
- Optional Inner Circle sharing
- Free/busy only visibility (no event details)
- User-controlled settings

### 🔔 Notifications
- In-app notifications for scheduling updates
- Badge count on navigation
- Mark as read functionality

## Quick Links

- [User Guide](USER_GUIDE.md) - How to use the scheduling feature
- [API Reference](API_REFERENCE.md) - API endpoint documentation
- [Spec Files](../../../.kiro/specs/group-scheduling/) - Requirements and design documents

## Architecture

```
Frontend Components:
├── scheduling-page.js       - Main scheduling page controller
├── plan-creation-modal.js   - Plan creation flow
├── contact-picker.js        - Contact selection with filters
├── availability-dashboard.js - Availability visualization
├── availability-public.js   - Public availability page
├── plan-calendar-view.js    - Calendar view component
├── scheduling-preferences.js - User preferences
├── scheduling-privacy.js    - Privacy settings
└── scheduling-notifications.js - Notification handling

Backend Services:
├── scheduling-service.ts    - Plan management
├── availability-collection-service.ts - Availability handling
├── invite-link-service.ts   - Link generation/validation
├── conflict-resolution-service.ts - AI suggestions
├── scheduling-preferences-service.ts - Preferences
└── scheduling-notification-service.ts - Notifications
```

## Database Tables

- `catchup_plans` - Plan metadata and status
- `plan_invitees` - Plan participants
- `invitee_availability` - Participant availability
- `initiator_availability` - Plan creator availability
- `invite_links` - Shareable invite tokens
- `scheduling_preferences` - User preferences
- `scheduling_notifications` - In-app notifications
- `calendar_sharing_settings` - Privacy settings

## Related Documentation

- [Voice Notes Architecture](../../../.kiro/steering/voice-notes-architecture.md) - Related feature
- [Google Integrations](../google-integrations/) - Calendar integration
- [Testing Guide](../../../.kiro/steering/testing-guide.md) - Testing conventions

## Manual Testing

- `tests/html/scheduling-page.test.html` - Scheduling page UI testing
- `tests/html/availability-public.test.html` - Public availability page testing
