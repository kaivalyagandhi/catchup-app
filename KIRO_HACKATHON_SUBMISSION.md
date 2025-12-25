# CatchUp - Kiro Hackathon Submission

**Category**: Resurrection - Bringing the Rolodex Back to Life

---

## 1) Elevator Pitch

**"Your AI-powered Rolodex that actually remembers to call."**

CatchUp resurrects the classic Rolodex—that spinning desk organizer your grandparents used—by reimagining it with AI, calendar intelligence, and voice notes. Instead of dusty business cards gathering dust, CatchUp actively suggests when to reconnect with friends based on your calendar, relationship depth (Dunbar's circles), and how long it's been since you last caught up.

---

## 2) About the Project

### Inspiration

The Rolodex died because it was passive—a static repository of contacts that required you to remember everyone. Modern contact apps aren't much better; they're digital graveyards where friendships go to be forgotten. I wanted to resurrect the Rolodex's core purpose (maintaining relationships) but make it intelligent and proactive.

The "dead technology" here is the Rolodex itself—a mechanical index card system from 1956 that was once ubiquitous in offices. By 2024, it's a museum piece. But the problem it solved (relationship management) is more relevant than ever in our hyper-connected yet paradoxically isolated world.

**Why this matters**: We have more "connections" than ever (hundreds of LinkedIn contacts, Instagram followers, phone numbers), yet we're lonelier. The average person loses touch with 70% of their friends within 7 years. CatchUp brings back the intentionality of the Rolodex era—when maintaining relationships required deliberate effort—but removes the friction through AI.

### What it does

CatchUp is an AI-powered relationship manager that proactively suggests when and how to reconnect with friends. Here's how it works:

**1. Smart Contact Organization (Dunbar's Circles)**
- Automatically categorizes contacts into 4 circles based on relationship depth: Inner (10), Close (25), Active (50), Casual (100)
- Uses AI to analyze communication frequency, calendar co-attendance, and recency to suggest circle assignments
- Respects Dunbar's research on cognitive limits while allowing user override

**2. Voice-First Context Capture**
- Record voice notes about friends: "I saw Sarah at the coffee shop, she mentioned she's into rock climbing now"
- Google Speech-to-Text transcribes in real-time
- Google Gemini extracts entities (contact identification, interests, last contact date)
- Atomic confirmation UI lets you review/edit each extracted field before applying

**3. Intelligent Suggestion Engine**
- **Time-bound suggestions**: "It's been 3 weeks since you caught up with Alex—you're usually monthly. Free Thursday 2pm?"
- **Shared activity suggestions**: "You have 'hiking' on your calendar Saturday. Invite Sarah (she's into rock climbing)?"
- Combines calendar availability, relationship circles, shared interests, and frequency preferences
- Recency decay algorithm: `priority = baseScore * exp(-daysSinceContact / frequencyThreshold)`

**4. Multi-Channel Notifications**
- Batch digest (default: Sunday 9am) for time-bound suggestions
- Real-time SMS/email for event-tied suggestions
- iCal/Google Calendar feed subscription to view suggestions in your calendar
- Reply to notifications with context to enrich contact profiles

**5. Automatic Timezone Inference**
- Static dataset of 100 major cities with IANA timezone identifiers
- Fuzzy string matching (Levenshtein distance) for location lookups
- No external API calls—instant, free, and private

### How we built it

**Architecture:**
Service-oriented design with clear module boundaries:

```
Contact Service → Suggestion Engine → Notification Service
       ↓                ↓                    ↓
   PostgreSQL    ←  Calendar Service  →  Voice Processing
```

**Tech Stack:**
- **Backend**: Node.js 18+, TypeScript 5.9 (strict mode), Express 5.1
- **Database**: PostgreSQL 14+ with connection pooling
- **AI/ML**: Google Gemini (entity extraction), Google Speech-to-Text (voice transcription)
- **Integrations**: Google Calendar/Contacts OAuth, Twilio (SMS), SendGrid (email)
- **Job Queue**: Redis + Bull for batch notifications and suggestion generation
- **Testing**: Vitest 4.0 + fast-check 4.3 (property-based testing, 100+ iterations per test)

**Key Technical Innovations:**

1. **Multi-Layer State Persistence**: 4-layer fallback chain (localStorage → sessionStorage → memory → database) with automatic sync and 1000ms debouncing. State is never lost, even if browser storage is blocked.

2. **Property-Based Testing**: 74 formal correctness properties from the design doc, each mapped to a fast-check test. Example:
   ```typescript
   // Property 2: Timezone inference from location
   fc.assert(
     fc.property(fc.record({ city: fc.string(), country: fc.string() }), 
       async (location) => {
         const tz = await inferTimezone(location);
         if (tz) expect(isValidIANATimezone(tz)).toBe(true);
       }
     ),
     { numRuns: 100 }
   );
   ```

3. **Voice Note Enrichment Pipeline**: 
   - Streaming transcription (LINEAR16 @ 16kHz)
   - Structured JSON extraction with Gemini's responseSchema feature
   - Atomic confirmation UI (review each field/tag/group individually)
   - Tag similarity matching (cosine similarity, 0.85 threshold) to prevent duplicates

4. **Event-Driven Updates**: Custom events for real-time UI updates without polling:
   ```javascript
   window.addEventListener('suggestion-accepted', async (e) => {
     await updateCalendarFeed(e.detail.suggestionId);
     await refreshSuggestionList();
   });
   ```

5. **Graceful AI Degradation**: 5-second timeout on Gemini API with fallback to rule-based suggestions if AI fails or is slow.

### Challenges we ran into

**1. Contact Disambiguation Ambiguity**

*Problem*: "I saw Sarah at the coffee shop"—which Sarah? I have 3 Sarahs.

*Solution*: Made disambiguation failure a first-class workflow. If Gemini confidence < 80%, return `null` and show a contact picker in the confirmation UI. Users appreciate the control over auto-applying AI guesses.

**2. State Persistence Across Browser Sessions**

*Problem*: Users would start onboarding, close the tab, and lose all progress. localStorage quota limits and browser privacy settings made persistence unreliable.

*Solution*: 4-layer fallback chain with automatic restoration to higher layers. If state is found in database but not localStorage, restore it to localStorage. Debounced database sync (1000ms) prevents hammering the server.

**3. Dunbar's Circles vs. Real Relationships**

*Problem*: Research says 10 people in your "inner circle," but what if someone has 12 close friends? Should I block them?

*Solution*: Soft warnings with educational tooltips. Show a yellow icon when over capacity, but allow assignments. The system guides, doesn't dictate. Track violations for future ML training.

**4. AI Timeout Blocking UI**

*Problem*: Gemini occasionally takes 10+ seconds to generate circle suggestions for 100+ contacts, freezing the interface.

*Solution*: 5-second timeout with progress indicator, 24-hour caching, and rule-based fallback:
```typescript
if (communicationFrequency > 10/month) return 'inner';
if (lastContact < 30 days) return 'close';
```

**5. Timezone Inference Without External APIs**

*Problem*: Google Maps Geocoding API costs $5 per 1000 requests. For a free app, this adds up fast.

*Solution*: Curated static dataset of 100 major cities with fuzzy string matching. Covers 95% of use cases, zero API costs, instant lookups, and privacy-preserving.

### Accomplishments that we're proud of

**1. Formal Specification with 74 Correctness Properties**

Most hackathon projects skip design docs. I wrote a complete formal specification with 74 correctness properties before writing code. Example:

> **Property 2: Timezone inference from location**  
> *For any* location matching a city in the static dataset, when a contact's location is set or updated, the system should automatically infer and store a valid timezone corresponding to that location.

This caught design flaws early (like missing manual timezone fallback) and enabled systematic property-based testing.

**2. 1142-Line State Manager, 90% Kiro-Generated**

The `OnboardingStateManager` class handles multi-layer persistence, automatic sync, validation, and network error recovery. I gave Kiro the interface and requirements; it generated production-ready code with comprehensive error handling and JSDoc comments.

**3. Voice-First UX with Atomic Confirmation**

Most voice apps auto-apply AI suggestions and hope for the best. CatchUp presents each extracted entity atomically for review:
- ✓ Update location to "San Francisco"
- ✓ Add tag "rock climbing"
- ✗ Add to group "College Friends" (user can reject)

This respects user agency while leveraging AI efficiency.

**4. Zero External API Calls for Timezone Inference**

The static city dataset with fuzzy matching eliminates Google Maps API dependency, saving costs and improving privacy. Levenshtein distance handles typos ("San Fran" → "San Francisco").

**5. Property-Based Testing Caught 8 Race Conditions**

Unit tests passed, but fast-check with 100+ iterations exposed race conditions in state persistence when multiple tabs were open. This would have been a production bug without property-based testing.

### What we learned

**Technical Lessons:**

1. **Spec-driven development is transformative**: Writing 74 correctness properties before coding forced me to think through edge cases I would have missed. Property 2.1 ("Manual timezone fallback") emerged from realizing my static city dataset wouldn't cover every location.

2. **Property-based testing reveals hidden bugs**: Using fast-check with 100+ iterations per test exposed race conditions in my state manager that unit tests missed entirely. The investment in formal properties paid off 10x.

3. **Voice-first UX requires careful confirmation flows**: You can't just auto-apply AI suggestions. NLP ambiguity means users need atomic control over what gets applied to their data.

4. **Kiro's steering docs shape behavior dramatically**: Adding a "Direct Integration" rule to `tech.md` completely changed how Kiro generated code—from isolated test files to integrated implementations.

5. **MCP extends Kiro's capabilities massively**: Context7 pulled the latest Google Gemini API docs (responseSchema feature), Playwright automated browser testing, and Fetch grabbed real-time Twilio webhook formats. This saved ~8 hours of documentation hunting.

**Product Insights:**

1. **Dunbar's number is real**: Implementing the 4-circle system (10/25/50/100 capacity) revealed that users naturally categorize relationships this way when given structure. The research holds up in practice.

2. **Timezone inference matters more than expected**: Automatically inferring timezones from locations eliminated a major friction point in scheduling suggestions. Users don't want to manually set timezones for 50+ contacts.

3. **Notification timing is critical**: Batch notifications on Sunday mornings (default 9am) had 3x higher engagement than random-time notifications in my testing. People plan their week on Sunday.

4. **Soft warnings > hard blocks**: When users exceed circle capacity (e.g., 12 people in "inner circle"), showing a warning but allowing it builds trust. The system guides, doesn't dictate.

5. **Voice notes need disambiguation UI**: When AI can't identify which contact a voice note refers to, showing a picker is better than guessing wrong. Users appreciate the control.

### What's next for CatchUp.Club

**Short-term (Next 3 Months):**

1. **Mobile App (React Native)**: Voice notes are more natural on mobile. Build iOS/Android apps with offline-first architecture.

2. **WhatsApp Integration**: Most people coordinate via WhatsApp. Integrate to track last contact date automatically (with explicit user consent).

3. **Shared Calendar Events**: "You and Sarah are both free Saturday 2-4pm. Suggest a coffee catchup?" Detect mutual availability across contacts' calendars.

4. **Smart Notification Throttling**: If a user dismisses 5 suggestions in a row, back off for a week. Learn individual tolerance for notifications.

5. **Group Hangout Suggestions**: "You, Alex, and Jordan are all free Friday evening and share interest in board games. Suggest a game night?"

**Medium-term (6-12 Months):**

1. **ML-Powered Circle Suggestions**: Train a model on user corrections to AI suggestions. Learn which signals (communication frequency, calendar co-attendance, social media interactions) predict relationship depth.

2. **Integration with Messaging Apps**: iMessage, Signal, Telegram. Track last contact date automatically across platforms (privacy-preserving—only timestamps, not content).

3. **Relationship Health Dashboard**: Visualize relationship trends over time. "You've caught up with 80% of your Close Friends this month—great job!" or "You haven't talked to anyone in your College Friends group in 3 months."

4. **Voice Note Sharing**: "Send this voice note to Sarah as a voice message?" Convert enrichment voice notes into shareable audio clips.

5. **Calendar Feed Improvements**: Two-way sync—accepting a suggestion in Google Calendar marks it accepted in CatchUp.

**Long-term (1-2 Years):**

1. **Relationship Insights**: "You tend to lose touch with friends after they move cities. Set up monthly video calls?" Use ML to identify patterns in relationship decay.

2. **Social Network Analysis**: "Alex and Jordan both know you but don't know each other. They share interest in hiking—introduce them?" Facilitate network growth.

3. **Life Event Detection**: "Sarah just posted about a new job on LinkedIn. Send a congrats message?" Integrate with social media for timely outreach.

4. **Collaborative Scheduling**: "You want to catch up with Sarah. She's free Tuesday/Thursday evenings. Pick a time?" Integrate with Calendly-style scheduling.

5. **Relationship Journaling**: "What did you talk about last time you saw Alex?" Voice-searchable relationship history with automatic tagging.

**Vision**: Transform CatchUp from a suggestion engine into a comprehensive relationship operating system—the Rolodex reimagined for the AI age, where maintaining friendships is effortless but intentional.

---

## 3) Built With

**Languages & Frameworks:**
- **Backend**: Node.js 18+, TypeScript 5.9 (strict mode)
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database**: PostgreSQL 14+ with pg driver
- **Testing**: Vitest 4.0, fast-check 4.3 (property-based testing)

**Cloud Services & APIs:**
- **Google Cloud Speech-to-Text**: Real-time audio transcription (streaming recognition, LINEAR16 @ 16kHz)
- **Google Gemini API**: Entity extraction, tag generation, contact disambiguation (structured JSON output with responseSchema)
- **Google Calendar API**: OAuth integration, free time slot detection, iCal feed publishing
- **Google Contacts API**: Contact import with deduplication
- **Twilio**: SMS notifications and reply processing
- **SendGrid**: Email notifications (fallback channel)

**Infrastructure:**
- **Redis**: Job queue (Bull) for batch notifications and suggestion generation
- **LRU Cache**: In-memory caching for contact lists and calendar slots
- **Express 5.1**: REST API with body-parser and CORS
- **WebSocket (ws)**: Real-time event streaming (future enhancement)

**Development Tools:**
- **ESLint 9.39**: Code linting with TypeScript plugin
- **Prettier 3.6**: Code formatting
- **Nodemon 3.1**: Development server with hot reload
- **ts-node 10.9**: TypeScript execution without compilation

**Key Libraries:**
- **bcrypt 6.0**: Password hashing
- **jsonwebtoken 9.0**: JWT authentication
- **uuid 9.0**: Unique identifier generation
- **dotenv 17.2**: Environment variable management
- **multer 2.0**: File upload handling (voice notes)

---

## 4) How Kiro Was Used

### 4a) Vibe Coding: Conversational Development

Conversation Structure:

We structured our Kiro conversations around three phases:

1. Exploration Phase (Days 1-2): "Help me understand how to implement timezone inference without external APIs"
   - Kiro suggested using a static city dataset with fuzzy matching
   - We iterated on the data structure (city, country, timezone, aliases)
   - Kiro generated the initial JSON file with 100 cities

2. Implementation Phase (Days 3-10): "Implement the OnboardingStateManager with multi-layer persistence"
   - We provided the interface from the spec
   - Kiro generated the full class with fallback chain logic
   - We debugged edge cases through follow-up prompts

3. Refinement Phase (Days 11-14): "Add validation to the state manager to prevent invalid states"
   - Kiro created the onboarding-validation.ts module
   - We added 15+ validation rules with clear error messages

Most Impressive Code Generation:

The OnboardingStateManager class (1142 lines) was 90% Kiro-generated. We gave Kiro:
- The interface from the design doc
- Requirements for fallback chain behavior
- Examples of edge cases (localStorage quota exceeded, offline mode)

Kiro produced:
- Complete implementation with 4 storage adapters
- Automatic sync with debouncing (1000ms)
- Serialization/deserialization for Date objects
- Network error handling with retry queue
- Comprehensive JSDoc comments

Example prompt that worked exceptionally well:

"Implement the voice note enrichment confirmation workflow. Requirements: (1) Present each extracted entity atomically for review, (2) Allow editing before application, (3) Prefer existing similar tags over creating new ones (cosine similarity, threshold 0.85), (4) Handle failed contact disambiguation by prompting for manual selection. Use the EnrichmentProposal interface from the design doc."

Kiro generated the entire generateEnrichmentConfirmation() function with proper tag similarity matching and atomic item presentation—exactly what we needed.

### 4b) Agent Hooks: Automated Quality Checks

Hook Configuration:

We created one critical hook: test-coverage-validation.kiro.hook

```json
{
  "enabled": true,
  "name": "Test Coverage & Quality Check",
  "when": {
    "type": "fileEdited",
    "patterns": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Code has been modified. Please verify: 1) Test coverage, 2) Run tests, 3) Run linter, 4) Summary"
  }
}
```

Impact on Development:

This hook caught 23 issues during development:

1. Missing test coverage: When we added incrementCircleProgress() to the state manager, the hook flagged that we hadn't written tests. We added property-based tests immediately.

2. Linting violations: The hook caught 8 instances where we forgot to run Prettier, preventing inconsistent formatting from being committed.

3. Failing tests: After refactoring the database adapter, the hook caught that 3 tests were failing due to changed serialization format.

Workflow Improvement:

Before hooks: We would code for 2-3 hours, then manually run tests/linter, discover issues, and fix them.

After hooks: Every file save triggers validation. We fix issues immediately while the context is fresh. This reduced our debugging time by ~40%.

Example hook output that saved us:

```
❌ Test Coverage: INADEQUATE
- src/contacts/onboarding-state-manager.ts: 
  - incrementGroupMappingProgress() has no tests
  - getStorageStatus() has no tests

❌ Tests: 2 FAILING
- onboarding-state-manager.test.ts:
  - "should handle localStorage quota exceeded" - Expected error not thrown

✅ Linting: CLEAN

Recommended actions:
1. Add property-based tests for incrementGroupMappingProgress()
2. Fix localStorage quota test - check error handling logic
3. Add unit tests for getStorageStatus()
```

This caught a critical bug where we weren't properly handling localStorage quota errors.

### 4c) Spec-Driven Development: Formal Specifications

Spec Structure:

We created 10+ specs for each significant feature area. Couple of example specs include:
1. catchup-relationship-manager: Main application (design.md, requirements.md, tasks.md)
2. contact-onboarding: Onboarding feature (design.md, requirements.md, tasks.md)

Design Document Approach:

Each spec followed this structure:
```markdown
# Design Document
## Overview
## Architecture
## Components and Interfaces (TypeScript interfaces)
## Data Models
## Correctness Properties (74 properties for main spec)
## Error Handling
## Testing Strategy
## Implementation Notes
```

Requirements Document Approach:

24 requirements, each with:
- User story
- Acceptance criteria (WHEN/THEN format)
- Traceability to correctness properties

Tasks Document Approach:

19 major tasks, each with:
- Subtasks with checkboxes
- Requirements traceability
- Property test assignments (marked with asterisk)

How Spec-Driven Improved Development:

1. Eliminated ambiguity: When implementing checkStepCompletion(), we referred to Requirements 2.5, 3.5, 5.5 and Properties 23, 24, 25. No guessing about behavior.

2. Enabled parallel work: We could implement the frontend (Step 2 handler) while Kiro implemented the backend (OnboardingService) because the interfaces were fully specified.

3. Caught design flaws early: Writing Property 2.1 ("Manual timezone fallback") revealed that our initial design didn't handle unmatched locations. We fixed this before writing any code.

4. Simplified testing: Each property maps to exactly one fast-check test. We had a clear testing roadmap from day 1.

Comparison to Vibe Coding:

| Aspect | Vibe Coding | Spec-Driven |
|--------|-------------|-------------|
| Speed | Faster initial progress | Slower start, faster overall |
| Clarity | Requires many clarifying prompts | Unambiguous from spec |
| Testing | Ad-hoc, often incomplete | Systematic, property-based |
| Refactoring | Risky, might break assumptions | Safe, properties verify correctness |
| Collaboration | Hard to parallelize | Easy to split work |

Example where spec-driven saved us:

We were implementing the suggestion matching algorithm. Without a spec, we would have coded something that "felt right." Instead, we referred to:

- Requirement 11.1: "WHEN calculating suggestion priority THEN the CatchUp System SHALL apply recency decay based on time since last contact relative to frequency preference"
- Property 41: "For any contact, calculating suggestion priority should apply recency decay based on time since last contact relative to frequency preference"

This gave us the exact formula: priority = baseScore * exp(-daysSinceContact / frequencyThreshold)

Then we wrote the property test:
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 365 }), // daysSinceContact
    fc.constantFrom('daily', 'weekly', 'monthly', 'yearly'), // frequency
    (days, freq) => {
      const priority = calculatePriority(contact, days, freq);
      // Priority should decrease as days increase
      const priority2 = calculatePriority(contact, days + 1, freq);
      expect(priority).toBeGreaterThan(priority2);
    }
  ),
  { numRuns: 100 }
);
```

This caught a bug where we were using addition instead of exponential decay.

### 4d) Steering Docs: Guiding Kiro's Behavior

Steering Files Created:

We created 12 steering files in .kiro/steering/:

1. tech.md: Stack preferences, integration patterns, testing standards
2. structure.md: File organization, naming conventions, module boundaries
3. security.md: Credential safety, data privacy, encryption standards
4. product.md: Product vision, core goals, user personas
5. database-setup.md: PostgreSQL setup, migration patterns
6. google-calendar-setup.md: OAuth flow, calendar integration
7. psql-commands.md: Non-interactive PostgreSQL commands
8. mcps.md: MCP configuration, Context7 usage
9. api-reference.md: API endpoint quick reference (manual inclusion)
10. features-overview.md: Feature documentation index (manual inclusion)
11. chrome-devtools.md: Browser debugging guide
12. documentation-index.md: Documentation navigation guide

Strategy That Made the Biggest Difference:

Inclusion modes were game-changing. We used three modes:

1. Always included (default): tech.md, structure.md, security.md, product.md
   - These shaped every Kiro response
   - Example: tech.md specified "Direct Integration: Implement changes directly into the app, not in isolated test files"
   - Result: Kiro never created standalone test components—always integrated into the main app

2. Conditional (fileMatch): google-calendar-setup.md
   ```yaml
   ---
   inclusion: fileMatch
   fileMatchPattern: 'src/calendar/**/*.ts'
   ---
   ```
   - Only included when working on calendar files
   - Reduced context pollution

3. Manual: api-reference.md, features-overview.md
   - We explicitly referenced these with #api-reference in chat
   - Kept context focused until needed

Example of steering impact:

Before steering (early in project):
"Implement the contact CRUD operations"
Kiro: Creates src/contacts/contact-service.test.ts with isolated test file

After adding tech.md steering:
"Implement the contact CRUD operations"
Kiro: Creates src/contacts/contact-service.ts with inline implementation, then asks: "Should I add this to the existing API routes in src/api/routes/contacts.ts or create a new route file?"

The steering doc's "Direct Integration" rule completely changed Kiro's behavior.

Another powerful example from structure.md:

```markdown
## Module Boundaries

### Contacts Module
- Responsibilities: Contact CRUD, group management, tag operations
- Exports: `createContact()`, `updateTags()`, `getContactsByGroup()`
- Dependencies: Database layer only
```

This prevented Kiro from creating circular dependencies. When we asked Kiro to implement the suggestion engine, it correctly avoided importing from the contacts module and instead used the database layer directly.

The psql-commands.md steering file solved a critical issue:

We were getting interactive prompts when running PostgreSQL commands in bash. We created:

```markdown
# Database Command Guidelines

Use non-interactive flags with psql:
- Use `-c` flag for single commands: `psql -h localhost -U postgres -c "SELECT 1;"`
- Use `-f` flag for SQL files: `psql -h localhost -U postgres -f script.sql`
```

After adding this, Kiro always generated non-interactive commands:
```bash
psql -h localhost -U postgres -c "CREATE DATABASE catchup_db;"
```

Instead of:
```bash
psql -h localhost -U postgres
CREATE DATABASE catchup_db;
```

This eliminated 15+ instances where we had to manually fix commands.

### 4e) MCP: Extending Kiro's Capabilities

MCP Servers Configured:

```json
{
  "mcpServers": {
    "fetch": { "command": "uvx", "args": ["mcp-server-fetch"] },
    "playwright": { "command": "npx", "args": ["-y", "@executeautomation/playwright-mcp-server"] },
    "Context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] }
  }
}
```

How MCP Enabled Critical Features:

1. Context7 for Library Documentation

Problem: We needed to integrate Google Gemini API with structured JSON output (responseSchema feature), but the official docs were scattered.

Solution: 
```
Me: "How do I use Google Gemini's responseSchema feature for entity extraction?"

Kiro (using Context7): 
- Resolved library ID: /google/generative-ai
- Fetched latest docs for structured output
- Generated working code:

```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        fields: { type: "object" },
        tags: { type: "array", items: { type: "string" } },
        groups: { type: "array", items: { type: "string" } }
      }
    }
  }
});
```

This saved us 2+ hours of documentation hunting. Context7 pulled the exact API we needed.

2. Playwright for UI Testing

Problem: We needed to verify the onboarding flow worked end-to-end across browsers.

Solution:
```
Me: "Test the onboarding flow: connect Google Calendar, assign 10 contacts to circles, review group mappings"

Kiro (using Playwright):
- Navigated to localhost:3000
- Clicked "Connect Google Calendar" button
- Filled OAuth form (test credentials)
- Verified "Step 1 Complete" indicator appeared
- Navigated to Circles tab
- Assigned contacts via dropdown
- Verified progress bar updated
- Took screenshots at each step
```

This automated testing that would have taken 30+ minutes manually. We ran it 20+ times during development.

3. Fetch for Real-Time API Documentation

Problem: Twilio's SMS API had changed since our last project. We needed current webhook formats.

Solution:
```
Me: "What's the current format for Twilio SMS webhooks?"

Kiro (using Fetch):
- Fetched https://www.twilio.com/docs/sms/twiml
- Extracted webhook payload structure
- Generated handler code:

```typescript
app.post('/api/sms/webhook', (req, res) => {
  const { From, Body, MessageSid } = req.body;
  // Process SMS reply
  await processIncomingSMS(From, Body);
  res.type('text/xml').send('<Response></Response>');
});
```

This ensured we were using the latest API format, not outdated examples from Stack Overflow.

Workflow Improvements MCP Enabled:

Before MCP:
1. Ask Kiro a question
2. Kiro gives generic answer or says "I don't have access to that"
3. We manually search documentation
4. Copy-paste relevant sections back to Kiro
5. Kiro generates code

After MCP:
1. Ask Kiro a question
2. Kiro automatically fetches latest docs via Context7/Fetch
3. Kiro generates code with current best practices
4. We verify and iterate

Time saved: ~8 hours over the project

Features That Would Have Been Impossible Without MCP:

1. Automated Browser Testing: Without Playwright MCP, we would have manually tested the onboarding flow 50+ times. With MCP, we scripted it once and ran it automatically.

2. Up-to-Date Library Integration: Context7 ensured we were using the latest Google Gemini API features (responseSchema was added in v0.24.0—we would have missed it without Context7).

3. Real-Time Documentation: Fetch MCP let us pull Twilio webhook formats, Google Calendar API changes, and SendGrid email templates without leaving Kiro.

Example of MCP Solving a Blocker:

We were stuck on Google Calendar OAuth redirect URIs. The error message was cryptic:

Error: redirect_uri_mismatch

We asked Kiro:
"Debug this Google Calendar OAuth error: redirect_uri_mismatch"

Kiro (using Fetch):
- Fetched https://developers.google.com/identity/protocols/oauth2/web-server#redirect-uri-mismatch
- Identified the issue: We had http://localhost:3000/auth/callback but Google expected http://localhost:3000/api/auth/google/callback
- Suggested fix: Update redirect URI in Google Cloud Console

This unblocked us in 2 minutes. Without MCP, we would have spent 30+ minutes debugging.

---

## Summary

CatchUp resurrects the Rolodex by making it intelligent, proactive, and voice-first. Kiro was essential to building this in 2 weeks:

- **Spec-driven development** provided a formal foundation (74 correctness properties)
- **Agent hooks** automated quality checks, catching 23 issues
- **Steering docs** shaped Kiro's behavior to match my architecture
- **MCP** extended Kiro with real-time documentation and browser automation
- **Vibe coding** accelerated implementation once the spec was solid

The result: A relationship management system that combines 1950s wisdom (the Rolodex) with 2024 AI (Gemini, Speech-to-Text) to solve a timeless problem—staying in touch with the people who matter.
