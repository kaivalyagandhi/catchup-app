# Design Document: Tier 1 Foundation

## Overview

This design document covers the implementation of four critical path features for CatchUp:

1. **Landing Page & Marketing Site** - Static marketing page with auth integration
2. **Simplified "Manage Circles" Flow** - AI-powered onboarding with batch operations
3. **Timezone Preferences** - User timezone storage and calendar time conversion
4. **Contact Preview & Archival** - Soft-delete functionality with restore capability

The design prioritizes:
- Minimal time-to-value for new users (<30 seconds to first circle assignment)
- Leveraging existing backend services (batchAssign, AI suggestion service)
- Mobile-responsive design patterns already established in the codebase
- Progressive disclosure to reduce cognitive load

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CatchUp Application                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Landing    │  │  Manage     │  │  Timezone   │  │  Contact    │ │
│  │  Page       │  │  Circles    │  │  Settings   │  │  Archival   │ │
│  │  (Static)   │  │  Flow       │  │             │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         ▼                ▼                ▼                ▼        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Existing Backend Services                     ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              ││
│  │  │ Google SSO  │  │ Circle      │  │ Calendar    │              ││
│  │  │ Service     │  │ Assignment  │  │ Service     │              ││
│  │  └─────────────┘  │ Service     │  └─────────────┘              ││
│  │                   └─────────────┘                                ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              ││
│  │  │ AI         │  │ Onboarding  │  │ Contact     │              ││
│  │  │ Suggestion │  │ Service     │  │ Repository  │              ││
│  │  │ Service    │  └─────────────┘  └─────────────┘              ││
│  │  └─────────────┘                                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                │                                     │
│                                ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      PostgreSQL Database                         ││
│  │  users | contacts | google_calendars | user_preferences         ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### New Components Overview

```
Frontend (public/js/):
├── landing-page.js          # Landing page interactions (minimal JS)
├── quick-start-flow.js      # AI Quick Start component
├── batch-suggestion-card.js # Smart batching UI component
├── quick-refine-card.js     # Swipe-style refinement component
├── undo-toast.js            # Undo capability component
├── timezone-selector.js     # Timezone selection UI
└── archived-contacts-view.js # Archived contacts management

Backend (src/):
├── api/routes/
│   ├── ai-quick-start.ts    # GET /api/ai/quick-start-suggestions
│   ├── ai-batch.ts          # GET /api/ai/batch-suggestions
│   └── contacts-archive.ts  # Archive/restore endpoints
├── contacts/
│   ├── ai-suggestion-service.ts  # Enhanced with new factors
│   └── contact-repository.ts     # Archive methods
├── calendar/
│   └── timezone-service.ts  # Timezone conversion utilities
└── users/
    └── preferences-service.ts # User preferences including timezone
```

## Components and Interfaces

### Feature 1: Landing Page & Marketing Site

#### Component: Landing Page (Static HTML)

**File**: `public/landing.html`

The landing page is implemented as static HTML/CSS for optimal performance and SEO. JavaScript is minimal and only handles CTA interactions.

**Structure**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CatchUp - Your AI-Powered Rolodex</title>
  <meta name="description" content="Reduce coordination friction for maintaining friendships with AI-powered relationship management.">
  <meta property="og:title" content="CatchUp - Your AI-Powered Rolodex">
  <meta property="og:description" content="Voice-first context capture and smart scheduling suggestions.">
  <link rel="stylesheet" href="/css/landing.css">
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <h1>Your AI-powered Rolodex that actually remembers to call</h1>
    <p>Reduce coordination friction for maintaining friendships</p>
    <div class="cta-buttons">
      <a href="/api/auth/google/authorize" class="btn-primary">Get Started</a>
      <a href="#features" class="btn-secondary">Learn More</a>
    </div>
  </section>
  
  <!-- Features Section -->
  <section class="features" id="features">
    <!-- Dunbar's Circles explanation -->
    <!-- Voice-first capture -->
    <!-- Smart scheduling -->
  </section>
  
  <!-- Social Proof Section -->
  <section class="testimonials">
    <!-- Testimonials or placeholder -->
  </section>
  
  <!-- Final CTA -->
  <section class="final-cta">
    <a href="/api/auth/google/authorize" class="btn-primary">Start Organizing Your Relationships</a>
  </section>
</body>
</html>
```

**Styling**: `public/css/landing.css`
- Mobile-first responsive design
- CSS Grid for feature layout
- CSS custom properties for theming consistency with main app

---

### Feature 2: Simplified "Manage Circles" Flow

#### Component: QuickStartFlow

**File**: `public/js/quick-start-flow.js`

```javascript
class QuickStartFlow {
  constructor(options) {
    this.contacts = [];           // Top 10 AI suggestions
    this.onAcceptAll = options.onAcceptAll;
    this.onReview = options.onReview;
    this.onSkip = options.onSkip;
    this.undoStack = [];          // For undo capability
  }
  
  async fetchSuggestions(userId) {
    // GET /api/ai/quick-start-suggestions
  }
  
  render() {
    // Render top 10 contacts with confidence scores
    // "Accept All" / "Review" / "Skip" buttons
  }
  
  handleAcceptAll() {
    // Batch assign all 10 to Inner Circle
    // Show undo toast
    // Update visualizer
  }
}
```

#### Component: BatchSuggestionCard

**File**: `public/js/batch-suggestion-card.js`

```javascript
class BatchSuggestionCard {
  constructor(batch, options) {
    this.batch = batch;           // { id, name, contacts, suggestedCircle, signalType }
    this.expanded = false;
    this.onAccept = options.onAccept;
    this.onSkip = options.onSkip;
  }
  
  render() {
    // Collapsed: summary with count and suggested circle
    // Expanded: individual contact list with checkboxes
  }
  
  handleAcceptBatch() {
    // POST /api/contacts/circles/batch-accept
    // Show undo toast
  }
}
```

#### Component: QuickRefineCard

**File**: `public/js/quick-refine-card.js`

```javascript
class QuickRefineCard {
  constructor(contacts, options) {
    this.contacts = contacts;     // Uncategorized contacts
    this.currentIndex = 0;
    this.onAssign = options.onAssign;
    this.onDone = options.onDone;
  }
  
  render() {
    // Single contact card with circle buttons below
    // Swipe gesture support for mobile
  }
  
  handleSwipe(direction) {
    // Map swipe direction to circle assignment
  }
}
```

#### Component: UndoToast

**File**: `public/js/undo-toast.js`

```javascript
class UndoToast {
  constructor(options) {
    this.message = options.message;
    this.onUndo = options.onUndo;
    this.duration = 10000;        // 10 seconds
    this.timer = null;
  }
  
  show() {
    // Display toast with countdown
    // Start timer
  }
  
  handleUndo() {
    // Clear timer
    // Call onUndo callback
    // Hide toast
  }
}
```

#### Backend: AI Quick Start Suggestions Endpoint

**File**: `src/api/routes/ai-quick-start.ts`

```typescript
interface QuickStartSuggestion {
  contactId: string;
  name: string;
  confidence: number;
  reasons: string[];              // ["12 shared calendar events", "Birthday saved"]
  metadataScore: number;
  calendarEventCount: number;
}

interface QuickStartResponse {
  suggestions: QuickStartSuggestion[];
  totalContacts: number;
  qualifyingContacts: number;     // Contacts with >= 85% confidence
}

// GET /api/ai/quick-start-suggestions
router.get('/ai/quick-start-suggestions', async (req, res) => {
  const { userId } = req.query;
  
  // 1. Fetch all contacts for user
  // 2. Calculate scores using new weighted factors:
  //    - Shared calendar events (35%)
  //    - Metadata richness (30%)
  //    - Contact age (15%)
  //    - Communication frequency (10%) - if available
  //    - Recency (10%) - if available
  // 3. Filter to >= 85% confidence
  // 4. Return top 10
});
```

#### Backend: Batch Suggestions Endpoint

**File**: `src/api/routes/ai-batch.ts`

```typescript
interface ContactBatch {
  id: string;
  name: string;                   // "Frequent Calendar Overlap"
  description: string;
  suggestedCircle: DunbarCircle;
  contacts: Contact[];
  signalStrength: 'high' | 'medium' | 'low';
  averageScore: number;
}

interface BatchSuggestionsResponse {
  batches: ContactBatch[];
  uncategorized: Contact[];
  totalContacts: number;
}

// GET /api/ai/batch-suggestions
router.get('/ai/batch-suggestions', async (req, res) => {
  const { userId } = req.query;
  
  // 1. Fetch remaining uncategorized contacts
  // 2. Group by signal strength:
  //    - High: 5+ calendar events OR metadata >= 40
  //    - Medium: 2-4 calendar events OR metadata 20-39
  //    - Low: 0-1 calendar events AND metadata < 20
  // 3. Return batches with suggested circles
});
```

#### Backend: Batch Accept Endpoint

**File**: `src/api/routes/contacts-circles.ts`

```typescript
interface BatchAcceptRequest {
  userId: string;
  batchId: string;
  circle: DunbarCircle;
  contactIds: string[];
}

// POST /api/contacts/circles/batch-accept
router.post('/contacts/circles/batch-accept', async (req, res) => {
  const { userId, batchId, circle, contactIds } = req.body;
  
  // 1. Validate all contact IDs belong to user
  // 2. Use existing batchAssign() from circle-assignment-service
  // 3. Return success with count
});
```

#### Enhanced AI Suggestion Service

**File**: `src/contacts/ai-suggestion-service.ts` (modifications)

```typescript
// New method for onboarding-optimized suggestions
async analyzeContactForOnboarding(
  userId: string, 
  contactId: string,
  calendarEvents: CalendarEvent[]
): Promise<CircleSuggestion> {
  const contact = await this.contactRepository.findById(contactId, userId);
  
  // Calculate new factors
  const calendarScore = this.calculateCalendarEventScore(contact, calendarEvents);
  const metadataScore = this.calculateMetadataRichnessScore(contact);
  const ageScore = this.calculateContactAgeScore(contact);
  
  // Existing factors (lower weight for new users)
  const frequencyScore = await this.calculateFrequencyFactor(interactions);
  const recencyScore = await this.calculateRecencyFactor(interactions);
  
  // Weighted combination optimized for onboarding
  const weightedScore = 
    calendarScore * 0.35 +
    metadataScore * 0.30 +
    ageScore * 0.15 +
    frequencyScore * 0.10 +
    recencyScore * 0.10;
  
  return this.determineCircle(weightedScore);
}

private calculateMetadataRichnessScore(contact: Contact): number {
  let score = 0;
  
  if (contact.birthday) score += 10;
  if (contact.email) score += 5;
  if (contact.phone) score += 5;
  if (contact.phone2) score += 5;
  if (contact.phone3) score += 5;
  if (contact.address) score += 10;
  if (contact.company) score += 5;
  if (contact.jobTitle) score += 5;
  if (contact.notes) score += 10;
  if (contact.linkedin) score += 5;
  if (contact.instagram) score += 5;
  if (contact.twitter) score += 5;
  
  // Normalize to 0-100
  return Math.min(100, score * 1.5);
}

private calculateCalendarEventScore(
  contact: Contact, 
  events: CalendarEvent[]
): number {
  // Count events where contact's email appears as attendee
  const sharedEvents = events.filter(event => 
    event.attendees?.some(a => 
      a.email?.toLowerCase() === contact.email?.toLowerCase()
    )
  );
  
  const count = sharedEvents.length;
  
  // Score based on event count
  if (count >= 20) return 100;
  if (count >= 10) return 85;
  if (count >= 5) return 70;
  if (count >= 2) return 50;
  if (count >= 1) return 30;
  return 0;
}
```

---

### Feature 3: Timezone Preferences

#### Database Schema Change

```sql
-- Add timezone column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Or if user_preferences doesn't exist, add to users table
ALTER TABLE users 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
```

#### Component: TimezoneSelector

**File**: `public/js/timezone-selector.js`

```javascript
class TimezoneSelector {
  constructor(options) {
    this.currentTimezone = options.currentTimezone || 'UTC';
    this.onChange = options.onChange;
    this.timezones = this.loadTimezones();
  }
  
  loadTimezones() {
    // Return grouped timezones from static data
    // Grouped by region: Americas, Europe, Asia, etc.
  }
  
  render() {
    // Searchable dropdown with region groups
    // Current time preview in selected timezone
  }
  
  detectBrowserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
```

#### Backend: Timezone Service

**File**: `src/calendar/timezone-service.ts`

```typescript
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export class TimezoneService {
  /**
   * Convert a UTC date to user's timezone
   */
  toUserTimezone(date: Date, userTimezone: string): Date {
    return toZonedTime(date, userTimezone);
  }
  
  /**
   * Convert a date from user's timezone to UTC
   */
  fromUserTimezone(date: Date, userTimezone: string): Date {
    return fromZonedTime(date, userTimezone);
  }
  
  /**
   * Format a date in user's timezone
   */
  formatInUserTimezone(
    date: Date, 
    userTimezone: string, 
    format: string
  ): string {
    return formatInTimeZone(date, userTimezone, format);
  }
  
  /**
   * Get list of all supported timezones grouped by region
   */
  getTimezoneList(): TimezoneGroup[] {
    // Return from static data file
  }
}
```

#### Backend: User Preferences Service

**File**: `src/users/preferences-service.ts`

```typescript
export interface UserPreferences {
  userId: string;
  timezone: string;
  // ... other preferences
}

export class UserPreferencesService {
  async getTimezone(userId: string): Promise<string> {
    const result = await pool.query(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.timezone || 'UTC';
  }
  
  async setTimezone(userId: string, timezone: string): Promise<void> {
    // Validate timezone is valid IANA identifier
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    
    await pool.query(
      'UPDATE users SET timezone = $1, updated_at = NOW() WHERE id = $2',
      [timezone, userId]
    );
  }
  
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
```

#### Calendar Service Updates

**File**: `src/calendar/availability-service.ts` (modifications)

```typescript
// Update getAvailableSlots to use user timezone
async getAvailableSlots(
  userId: string,
  dateRange: DateRange,
  options?: AvailabilityOptions
): Promise<TimeSlot[]> {
  // Get user's timezone preference
  const userTimezone = await this.preferencesService.getTimezone(userId);
  
  // ... existing logic ...
  
  // Convert slots to user's timezone before returning
  return slots.map(slot => ({
    ...slot,
    start: this.timezoneService.toUserTimezone(slot.start, userTimezone),
    end: this.timezoneService.toUserTimezone(slot.end, userTimezone),
    timezone: userTimezone  // Include timezone in response
  }));
}
```

---

### Feature 4: Contact Preview & Archival

#### Database Schema Change

```sql
-- Add archived_at column to contacts table
ALTER TABLE contacts 
ADD COLUMN archived_at TIMESTAMP DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_contacts_archived ON contacts(user_id, archived_at);
```

#### Component: ArchivedContactsView

**File**: `public/js/archived-contacts-view.js`

```javascript
class ArchivedContactsView {
  constructor(options) {
    this.contacts = [];
    this.onRestore = options.onRestore;
    this.onBulkRestore = options.onBulkRestore;
  }
  
  async fetchArchivedContacts(userId) {
    // GET /api/contacts/archived
  }
  
  render() {
    // Table of archived contacts with restore buttons
    // Bulk selection for bulk restore
  }
  
  handleRestore(contactId) {
    // POST /api/contacts/{id}/restore
  }
}
```

#### Backend: Contact Repository Updates

**File**: `src/contacts/repository.ts` (modifications)

```typescript
export class PostgresContactRepository {
  /**
   * Find all contacts, optionally including archived
   */
  async findAll(
    userId: string, 
    options?: { includeArchived?: boolean; archived?: boolean }
  ): Promise<Contact[]> {
    let query = 'SELECT * FROM contacts WHERE user_id = $1';
    
    if (options?.archived === true) {
      // Only archived contacts
      query += ' AND archived_at IS NOT NULL';
    } else if (!options?.includeArchived) {
      // Exclude archived by default
      query += ' AND archived_at IS NULL';
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  /**
   * Preview contacts that would be archived
   */
  async previewArchival(
    userId: string, 
    contactIds: string[]
  ): Promise<Contact[]> {
    const result = await pool.query(
      `SELECT id, name, email, phone 
       FROM contacts 
       WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NULL`,
      [userId, contactIds]
    );
    return result.rows;
  }
  
  /**
   * Archive contacts (soft delete)
   */
  async archiveContacts(
    userId: string, 
    contactIds: string[]
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE contacts 
       SET archived_at = NOW(), updated_at = NOW() 
       WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NULL`,
      [userId, contactIds]
    );
    return result.rowCount || 0;
  }
  
  /**
   * Restore archived contacts
   */
  async restoreContacts(
    userId: string, 
    contactIds: string[]
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE contacts 
       SET archived_at = NULL, updated_at = NOW() 
       WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NOT NULL`,
      [userId, contactIds]
    );
    return result.rowCount || 0;
  }
  
  /**
   * Get archived contacts
   */
  async findArchived(userId: string): Promise<Contact[]> {
    const result = await pool.query(
      `SELECT * FROM contacts 
       WHERE user_id = $1 AND archived_at IS NOT NULL 
       ORDER BY archived_at DESC`,
      [userId]
    );
    return result.rows;
  }
  
  /**
   * Get archived contacts count
   */
  async getArchivedCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM contacts WHERE user_id = $1 AND archived_at IS NOT NULL',
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}
```

#### Backend: Archive API Endpoints

**File**: `src/api/routes/contacts-archive.ts`

```typescript
// GET /api/contacts/archived
router.get('/contacts/archived', async (req, res) => {
  const { userId } = req.query;
  const contacts = await contactRepository.findArchived(userId);
  res.json(contacts);
});

// POST /api/contacts/archive/preview
router.post('/contacts/archive/preview', async (req, res) => {
  const { userId, contactIds } = req.body;
  const contacts = await contactRepository.previewArchival(userId, contactIds);
  res.json({
    contacts,
    count: contacts.length
  });
});

// POST /api/contacts/archive
router.post('/contacts/archive', async (req, res) => {
  const { userId, contactIds } = req.body;
  const count = await contactRepository.archiveContacts(userId, contactIds);
  res.json({ 
    success: true, 
    archivedCount: count 
  });
});

// POST /api/contacts/{id}/restore
router.post('/contacts/:id/restore', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const count = await contactRepository.restoreContacts(userId, [id]);
  res.json({ 
    success: count > 0 
  });
});

// POST /api/contacts/restore/bulk
router.post('/contacts/restore/bulk', async (req, res) => {
  const { userId, contactIds } = req.body;
  const count = await contactRepository.restoreContacts(userId, contactIds);
  res.json({ 
    success: true, 
    restoredCount: count 
  });
});
```

---

## Data Models

### Enhanced Contact Model

```typescript
interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  address?: string;
  company?: string;
  jobTitle?: string;
  birthday?: Date;
  notes?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  
  // Circle assignment
  dunbarCircle?: DunbarCircle;
  circleAiSuggestion?: DunbarCircle;
  circleAiConfidence?: number;
  
  // Archival
  archivedAt?: Date;
  
  // Metadata
  googleResourceName?: string;
  googleContactId?: string;
  source: 'google' | 'manual' | 'import';
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}
```

### User Preferences Model

```typescript
interface UserPreferences {
  userId: string;
  timezone: string;              // IANA timezone identifier
  notificationPreferences?: NotificationPreferences;
  availabilityParams?: AvailabilityParams;
  createdAt: Date;
  updatedAt: Date;
}
```

### Quick Start Suggestion Model

```typescript
interface QuickStartSuggestion {
  contactId: string;
  name: string;
  confidence: number;            // 0-100
  reasons: string[];             // Human-readable reasons
  scores: {
    calendarEvents: number;      // 0-100
    metadataRichness: number;    // 0-100
    contactAge: number;          // 0-100
    communicationFrequency: number; // 0-100
    recency: number;             // 0-100
  };
}
```

### Contact Batch Model

```typescript
interface ContactBatch {
  id: string;
  name: string;
  description: string;
  suggestedCircle: DunbarCircle;
  signalStrength: 'high' | 'medium' | 'low';
  contacts: Contact[];
  averageScore: number;
  signalType: 'calendar' | 'metadata' | 'communication' | 'mixed';
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



### Property 1: Suggestion Scoring Weighted Calculation

*For any* contact with known metadata richness score, calendar event count, contact age, communication frequency, and recency values, the final confidence score SHALL equal:
`(calendarScore * 0.35) + (metadataScore * 0.30) + (ageScore * 0.15) + (frequencyScore * 0.10) + (recencyScore * 0.10)`

**Validates: Requirements 5.2**

---

### Property 2: Confidence Threshold Filtering

*For any* set of contacts returned by the quick-start-suggestions endpoint, ALL contacts SHALL have a confidence score >= 85, and the count SHALL NOT exceed 10.

**Validates: Requirements 5.5, 5.13**

---

### Property 3: Calendar Event Prioritization

*For any* two contacts where contact A has more shared calendar events than contact B, and all other factors are equal, contact A's confidence score SHALL be greater than or equal to contact B's confidence score.

**Validates: Requirements 5.3**

---

### Property 4: Metadata Richness Calculation

*For any* contact, the metadata richness score SHALL equal the sum of:
- birthday present: +10
- email present: +5
- each phone number (max 3): +5 each
- address present: +10
- company present: +5
- job title present: +5
- notes present: +10
- each social profile: +5 each

Normalized to 0-100 range.

**Validates: Requirements 5.4**

---

### Property 5: Batch Assignment Signal Strength Mapping

*For any* contact in the batch suggestions response:
- IF calendarEventCount >= 5 OR metadataScore >= 40, THEN the contact SHALL be in a "high" signal batch (suggested: Close Friends)
- IF calendarEventCount 2-4 OR metadataScore 20-39, THEN the contact SHALL be in a "medium" signal batch (suggested: Active Friends)
- IF calendarEventCount <= 1 AND metadataScore < 20, THEN the contact SHALL be in a "low" signal batch (suggested: Casual Network)

**Validates: Requirements 6.1, 6.2**

---

### Property 6: Undo Restores Previous State (Round-Trip)

*For any* bulk circle assignment action followed by an undo within 10 seconds, the circle assignments for all affected contacts SHALL be restored to their state immediately before the bulk action.

**Validates: Requirements 8.4**

---

### Property 7: Progress Percentage Calculation

*For any* set of contacts where `categorized` is the count of contacts with a non-null dunbarCircle and `total` is the total contact count, the progress percentage SHALL equal `Math.round((categorized / total) * 100)` when total > 0, and 0 when total = 0.

**Validates: Requirements 9.1, 9.2**

---

### Property 8: IANA Timezone Validation

*For any* string passed to setTimezone:
- IF the string is a valid IANA timezone identifier, THEN the operation SHALL succeed
- IF the string is NOT a valid IANA timezone identifier, THEN the operation SHALL throw an error

**Validates: Requirements 11.2**

---

### Property 9: Timezone Conversion Round-Trip

*For any* valid Date and valid IANA timezone, converting from UTC to user timezone and back to UTC SHALL produce a date equivalent to the original (accounting for DST transitions).

**Validates: Requirements 13.1, 13.4**

---

### Property 10: Preview Does Not Modify Data (Invariant)

*For any* call to previewArchival with any set of contact IDs, the archived_at field for ALL contacts in the database SHALL remain unchanged after the preview operation completes.

**Validates: Requirements 14.5**

---

### Property 11: Archived Contacts Exclusion

*For any* query to findAll with default options (includeArchived = false), the result SHALL NOT contain any contacts where archived_at is NOT NULL.

**Validates: Requirements 15.2, 15.3, 15.4**

---

### Property 12: Restore Clears Archived Timestamp (Round-Trip)

*For any* contact that is archived and then restored, the archived_at field SHALL be NULL after restoration, and the contact SHALL appear in default findAll queries.

**Validates: Requirements 16.4, 16.5**

---

### Property 13: Batch Accept Atomicity

*For any* batch-accept request with N contact IDs:
- IF all contact IDs are valid and belong to the user, THEN all N contacts SHALL be assigned to the specified circle
- IF any contact ID is invalid or doesn't belong to the user, THEN NO contacts SHALL be modified (transaction rollback)

**Validates: Requirements 17.6**

---

## Error Handling

### Landing Page Errors

| Error Scenario | Handling |
|----------------|----------|
| Auth redirect fails | Display error message with retry option |
| Static assets fail to load | Graceful degradation with text-only content |
| JavaScript disabled | Page remains functional (progressive enhancement) |

### Circle Assignment Errors

| Error Scenario | Handling |
|----------------|----------|
| AI suggestions timeout (>30s) | Show warning toast, allow manual assignment |
| AI suggestions unavailable | Graceful degradation to manual flow |
| Batch assignment fails | Show error toast, preserve local state, offer retry |
| Network error during save | Queue for retry, show offline indicator |
| Undo window expires | Finalize action, clear undo stack |

### Timezone Errors

| Error Scenario | Handling |
|----------------|----------|
| Invalid timezone string | Reject with validation error |
| Browser timezone detection fails | Default to UTC |
| Timezone conversion fails | Log error, display time in UTC with warning |

### Archival Errors

| Error Scenario | Handling |
|----------------|----------|
| Archive fails | Show error toast, preserve contact state |
| Restore fails | Show error toast, contact remains archived |
| Bulk operation partial failure | Transaction rollback, show error with details |

---

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples, edge cases, and error conditions.

**AI Suggestion Service Tests**:
- Test metadata richness calculation with various field combinations
- Test calendar event scoring with 0, 1, 5, 10, 20+ events
- Test weighted score calculation with known inputs
- Test confidence threshold filtering

**Timezone Service Tests**:
- Test conversion for common timezones (America/New_York, Europe/London, Asia/Tokyo)
- Test DST transition handling
- Test invalid timezone rejection

**Contact Repository Tests**:
- Test archive/restore operations
- Test findAll with various filter options
- Test preview doesn't modify data

### Property-Based Tests

Property-based tests verify universal properties across many generated inputs using fast-check.

**Configuration**: Minimum 100 iterations per property test.

**Tag Format**: `Feature: tier-1-foundation, Property {number}: {property_text}`

```typescript
import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('AI Suggestion Service - Property Tests', () => {
  // Property 1: Weighted calculation
  it('should calculate weighted score correctly for all inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // calendarScore
        fc.integer({ min: 0, max: 100 }), // metadataScore
        fc.integer({ min: 0, max: 100 }), // ageScore
        fc.integer({ min: 0, max: 100 }), // frequencyScore
        fc.integer({ min: 0, max: 100 }), // recencyScore
        (calendar, metadata, age, frequency, recency) => {
          const expected = 
            calendar * 0.35 + 
            metadata * 0.30 + 
            age * 0.15 + 
            frequency * 0.10 + 
            recency * 0.10;
          
          const result = calculateWeightedScore({
            calendarScore: calendar,
            metadataScore: metadata,
            ageScore: age,
            frequencyScore: frequency,
            recencyScore: recency
          });
          
          expect(result).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 2: Confidence threshold filtering
  it('should only return contacts with confidence >= 85', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            confidence: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (contacts) => {
          const filtered = filterByConfidence(contacts, 85);
          
          // All returned contacts have confidence >= 85
          expect(filtered.every(c => c.confidence >= 85)).toBe(true);
          
          // Count doesn't exceed 10
          expect(filtered.length).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 4: Metadata richness calculation
  it('should calculate metadata score correctly for any field combination', () => {
    fc.assert(
      fc.property(
        fc.record({
          birthday: fc.option(fc.date()),
          email: fc.option(fc.emailAddress()),
          phone: fc.option(fc.string()),
          phone2: fc.option(fc.string()),
          phone3: fc.option(fc.string()),
          address: fc.option(fc.string()),
          company: fc.option(fc.string()),
          jobTitle: fc.option(fc.string()),
          notes: fc.option(fc.string()),
          linkedin: fc.option(fc.string()),
          instagram: fc.option(fc.string()),
          twitter: fc.option(fc.string())
        }),
        (contact) => {
          const score = calculateMetadataRichnessScore(contact);
          
          // Score is within valid range
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          
          // Score increases with more fields
          const fieldCount = Object.values(contact).filter(v => v !== null).length;
          if (fieldCount === 0) {
            expect(score).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Timezone Service - Property Tests', () => {
  // Property 9: Round-trip conversion
  it('should preserve date through timezone round-trip', () => {
    const validTimezones = [
      'America/New_York', 'America/Los_Angeles', 'Europe/London',
      'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'
    ];
    
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.constantFrom(...validTimezones),
        (date, timezone) => {
          const toUser = timezoneService.toUserTimezone(date, timezone);
          const backToUtc = timezoneService.fromUserTimezone(toUser, timezone);
          
          // Round-trip should preserve the timestamp
          expect(backToUtc.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Contact Repository - Property Tests', () => {
  // Property 10: Preview invariant
  it('should not modify any data during preview', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        async (contactIds) => {
          // Get state before
          const beforeState = await getContactsState(testUserId);
          
          // Call preview
          await contactRepository.previewArchival(testUserId, contactIds);
          
          // Get state after
          const afterState = await getContactsState(testUserId);
          
          // State should be unchanged
          expect(afterState).toEqual(beforeState);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 11: Archived exclusion
  it('should exclude archived contacts from default queries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            archivedAt: fc.option(fc.date())
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (contacts) => {
          // Setup test data
          await setupTestContacts(testUserId, contacts);
          
          // Query with default options
          const result = await contactRepository.findAll(testUserId);
          
          // No archived contacts in result
          expect(result.every(c => c.archivedAt === null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 12: Archive/restore round-trip
  it('should restore contacts to original state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        async (contactIds) => {
          // Get original state
          const originalState = await getContactsState(testUserId, contactIds);
          
          // Archive
          await contactRepository.archiveContacts(testUserId, contactIds);
          
          // Verify archived
          const archivedState = await getContactsState(testUserId, contactIds);
          expect(archivedState.every(c => c.archivedAt !== null)).toBe(true);
          
          // Restore
          await contactRepository.restoreContacts(testUserId, contactIds);
          
          // Verify restored
          const restoredState = await getContactsState(testUserId, contactIds);
          expect(restoredState.every(c => c.archivedAt === null)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Manual Testing

Manual test files will be created in `tests/html/`:

- `tests/html/landing-page.test.html` - Landing page visual verification
- `tests/html/quick-start-flow.test.html` - AI Quick Start flow testing
- `tests/html/batch-suggestions.test.html` - Smart batching UI testing
- `tests/html/quick-refine.test.html` - Swipe interface testing
- `tests/html/timezone-selector.test.html` - Timezone selection UI
- `tests/html/archived-contacts.test.html` - Archive/restore functionality

### Integration Tests

- End-to-end onboarding flow with circle assignment
- Calendar event fetching and scoring integration
- Timezone conversion across calendar services
- Archive/restore with database verification

