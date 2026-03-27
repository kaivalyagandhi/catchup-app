# Requirements Document

## Introduction

V1 redesign of the CatchUp app to focus exclusively on contact enrichment, organization, and relationship-aware catchup suggestions. The app currently has ~75% implementation across too many features. This redesign narrows scope by: (1) removing all scheduling and SMS/Twilio code first to clean the codebase, (2) redesigning the landing page and onboarding to deliver first value within 60 seconds via progressive disclosure, (3) adding a home dashboard as the default view with actionable relationship insights, (4) adding chat history import from external messaging platforms as the key new differentiator, (5) completing contact management features that are currently stubbed, (6) adding a contact detail panel to surface enrichment data, (7) adding vCard-based Apple Contacts import/export, and (8) introducing a user-controlled enrichment review flow where changes are never auto-synced to external sources. The result is a laser-focused contact enrichment and relationship management tool with a clear path from signup to "aha moment."

## Glossary

- **CatchUp_App**: The Express.js 5 + TypeScript backend application with Vanilla JS frontend, PostgreSQL database, Upstash Redis cache, and Google Cloud Tasks job processing.
- **Chat_History_Parser**: A backend service that accepts exported chat history files from messaging platforms and extracts structured interaction data (messages, timestamps, participants, topics, sentiment).
- **Chat_Export_File**: A file exported from a messaging platform (Instagram, iMessage, Facebook Messenger, WhatsApp, X/Twitter DMs, Google Messages/SMS) containing conversation history in the platform's native export format (JSON, CSV, XML, or text).
- **Interaction_Summary**: A structured record derived from parsed chat history containing communication frequency, topic keywords, sentiment scores, and last interaction date for a specific contact.
- **Contact_Match**: The result of matching a conversation participant from a Chat_Export_File to an existing Contact record using name, phone number, email, or social handle. Includes a confidence score and match tier (auto, likely, unmatched).
- **Pending_Enrichment**: An Interaction_Summary that has not yet been linked to a Contact, stored in a review queue for the user to resolve later.
- **Enrichment_Record**: A database record linking a parsed Interaction_Summary to a Contact, including the source platform, import timestamp, and raw data reference.
- **Enrichment_Review**: A user-facing diff view showing proposed changes from enrichment data alongside current contact/source values, requiring explicit user approval before any sync to external sources.
- **Google_Sync_Back_Service**: A backend service that pushes user-approved local CatchUp edits (name, phone, email, notes) back to Google Contacts via the People API write endpoints. Changes are never auto-synced; they require explicit user review and approval.
- **Sync_Back_Operation**: A single write operation to Google Contacts representing one field change, stored with before/after values for reversibility.
- **Apple_Contacts_Service**: A backend service that imports contacts via vCard file upload and exports contacts back to vCard format.
- **vCard_Parser**: A component that parses vCard (.vcf) files into Contact records, supporting vCard 3.0 and 4.0 formats.
- **vCard_Printer**: A component that serializes Contact records back into valid vCard format for export/download.
- **Bulk_Operation**: A single API request that applies the same action (archive, tag, group assign, circle assign) to multiple contacts simultaneously.
- **Contact**: The core data model (id, userId, name, phone, email, social handles, location, timezone, customNotes, lastContactDate, frequencyPreference, groups, tags, dunbarCircle, sources, googleResourceName).
- **Contact_Detail_Panel**: A slide-out panel or dedicated page showing a contact's full profile including enrichment data, relationship timeline, source badges, and sync status.
- **Import_Record**: A database record tracking a completed or in-progress chat history import, including platform, file name, import date, participant count, match statistics, and status.
- **Stale_Module**: A source directory or route file belonging to scheduling (src/scheduling/), SMS/Twilio (src/sms/), or their associated frontend files that are not part of v1 scope.
- **Home_Dashboard**: The default landing page for authenticated users, showing a relationship health summary, actionable items (pending enrichments, import status, stale relationships), and quick-access cards for key actions.
- **Relationship_Health_Indicator**: A per-contact visual indicator (e.g., green/yellow/red dot or trend arrow) showing whether communication frequency is healthy, declining, or stale based on the user's frequency preferences and enrichment data.
- **Progressive_Onboarding**: An onboarding approach that delivers first value immediately after Google sync (showing contacts with basic relationship data), then progressively nudges users toward deeper features (chat import, circle assignment, group organization) through contextual prompts rather than a mandatory wizard.
- **In_App_Notification**: A persistent notification record stored in the database and displayed in a notification center UI, triggered by async system events (import completion, AI enrichment ready, sync conflicts, reminders). Designed with a delivery channel abstraction so email and push notifications can be added as additional channels later.

## Requirements

### Requirement 1: Landing Page Redesign for V1 Value Proposition

**User Story:** As a prospective user visiting the landing page, I want to immediately understand that CatchUp helps me understand my relationships through real conversation data, so that I'm motivated to sign up.

#### Acceptance Criteria

1. THE landing page hero section SHALL update the headline and subtitle to reflect the v1 value proposition: relationship intelligence from real conversation data (chat history enrichment, contact organization, catchup suggestions). The current messaging about scheduling and SMS reminders SHALL be removed.
2. THE landing page features section SHALL highlight v1 features: import chat history from messaging platforms, see who you talk to most, get AI-powered catchup suggestions, organize contacts into circles and groups, and sync across Google and Apple contacts. Features for scheduling, SMS, and Twilio SHALL be removed.
3. THE "How it works" section SHALL present the v1 user journey in 3-4 steps: Sign in with Google → See your contacts with relationship context → Import your chat history for deeper insights → Get suggestions on who to catch up with.
4. THE testimonials section SHALL reflect the v1 value proposition (relationship intelligence, contact enrichment) rather than scheduling or SMS features.
5. THE landing page SHALL retain the existing Stone & Clay design system aesthetic, dark/light theme toggle, and responsive layout.
6. THE landing page SHALL display a "Get Started with Google" primary CTA and a "Learn More" secondary CTA, consistent with the current layout.

### Requirement 2: Progressive Onboarding Flow

**User Story:** As a new user, I want to see value from CatchUp within 60 seconds of signing up, so that I understand why this app is worth my time before being asked to do any organizational work.

#### Acceptance Criteria

1. WHEN a new user completes Google SSO, THE CatchUp_App SHALL immediately trigger Google Contacts sync in the background and display a brief loading state ("Syncing your contacts...") with an estimated time.
2. WHEN Google Contacts sync completes, THE CatchUp_App SHALL redirect the user directly to the Home_Dashboard (Req 3) showing their contacts with basic relationship data derived from Google Contacts metadata (name, email, phone, last synced date) and calendar co-attendance data if calendar is connected. This is the first "aha moment" — the user sees their contacts with context.
3. THE onboarding flow SHALL NOT require circle assignment, frequency preference setting, or group organization before showing the Home_Dashboard. These activities SHALL be deferred to post-onboarding contextual nudges.
4. AFTER the user has viewed the Home_Dashboard, THE CatchUp_App SHALL display a dismissible "Get deeper insights" prompt card suggesting the user import chat history, with WhatsApp highlighted as the fastest option ("Export a WhatsApp chat in under a minute"). This card SHALL appear on the Home_Dashboard and be dismissible.
5. THE CatchUp_App SHALL display contextual nudge cards on the Home_Dashboard for deferred activities: "Organize your circles" (shown when uncategorized contacts > 10), "Set catchup frequency" (shown after first circle assignment), and "Import more platforms" (shown after first successful chat import). Each nudge SHALL be dismissible and not shown again for 7 days after dismissal.
6. THE existing onboarding state machine (onboarding-service.ts) SHALL be updated to support the progressive flow: the 'welcome' and 'circle_assignment' steps become optional post-onboarding activities rather than gates.
7. WHEN a returning user who skipped circle assignment opens the "Organize Your Circles" flow (from the nudge card or Directory → Circles tab), THE CatchUp_App SHALL use the existing Step2CirclesHandler modal from spec 031 with no changes to the circles UX.

### Requirement 3: Home Dashboard

**User Story:** As a returning user, I want a dashboard that shows me what needs my attention and surfaces relationship insights, so that I can take meaningful action quickly.

#### Acceptance Criteria

1. THE Home_Dashboard SHALL be the default page when an authenticated user opens the app, replacing the current Directory page as the default.
2. THE Home_Dashboard SHALL display an "Action Items" section at the top containing cards for: pending enrichments count (links to Req 4 queue), pending sync changes count (links to Req 9 review), active import jobs in progress (links to Req 7 status), and pending likely matches from imports (links to Req 3 confirmation list).
3. THE Home_Dashboard SHALL display a "Relationship Insights" section showing: total contacts count, contacts with enrichment data count, top 5 "catch up soon" suggestions (contacts with declining communication frequency or overdue based on frequency preferences), and a "stale relationships" count (contacts with no interaction in 3+ months).
4. THE Home_Dashboard SHALL display a "Quick Actions" section with cards for: "Import Chat History" (opens import wizard), "Record Voice Note" (opens voice recorder), "View All Contacts" (navigates to Directory), and "Organize Circles" (opens Step2CirclesHandler modal).
5. THE Home_Dashboard SHALL display contextual nudge cards from the Progressive_Onboarding (Req 2 AC 5) when applicable.
6. THE Home_Dashboard SHALL update action item counts in real-time (or on page focus) without requiring a full page reload.
7. THE Home_Dashboard SHALL be responsive and render as a single-column layout on mobile devices.
8. THE sidebar navigation SHALL be updated to: Home (dashboard, default) | Directory | Suggestions | Settings. The Scheduling and Edits nav items SHALL be removed. The Edits functionality SHALL be accessible from the Home_Dashboard action items and Contact_Detail_Panel.
9. WHEN the user has no enrichment data and no calendar connected (zero state), THE Home_Dashboard SHALL still display value by showing: total contacts imported from Google, contacts with phone/email data, a prominent "Get started" card explaining the three ways to enrich contacts (import chat history, connect calendar, record voice notes), and basic suggestions derived from Google Contacts metadata (e.g., contacts with no recent interaction log).

### Requirement 4: Contacts Table Enrichment Columns

**User Story:** As a user browsing my contacts list, I want to see relationship health indicators at a glance without clicking into each contact, so that I can quickly identify who needs attention.

#### Acceptance Criteria

1. THE contacts table SHALL display a "Last Interaction" column showing the most recent interaction date across all sources (Google Calendar, chat imports, voice notes, manual logs) formatted as relative time (e.g., "3 days ago", "2 months ago").
2. THE contacts table SHALL display a Relationship_Health_Indicator column showing a visual status: green dot (on track — last interaction within frequency preference), yellow dot (attention — approaching overdue), red dot (overdue — past frequency preference window), or gray dot (no data — no interaction history or frequency preference set).
3. THE contacts table SHALL display platform source icons (small Google, Apple, WhatsApp, Instagram, etc. icons) next to each contact name showing which platforms have contributed data.
4. THE contacts table SHALL display the contact's top topic tag (from the most recent Enrichment_Record) as a subtle label, truncated to fit the column width.
5. THE contacts table columns SHALL be configurable: users can show/hide the enrichment columns via a column picker dropdown. The default view SHALL show: Name, Last Interaction, Health Indicator, Sources, Circle, and Groups.
6. THE contacts table SHALL support sorting by the "Last Interaction" column (ascending/descending) to help users find contacts they haven't talked to recently.

### Requirement 5: Chat History Import Wizard

**User Story:** As a user, I want a guided experience for importing chat history from my messaging platforms, so that I understand what to export, how to upload it, and what happens next.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide an "Import Chat History" entry point accessible from the Home_Dashboard quick actions, the Directory page, and from the onboarding nudge card (Req 2 AC 4).
2. WHEN the user opens the import wizard, THE CatchUp_App SHALL display a platform selection screen showing supported platforms (WhatsApp, Instagram, Facebook Messenger, iMessage, X/Twitter DMs, Google Messages/SMS) with recognizable platform icons. WhatsApp SHALL be visually highlighted with a "Fastest — export in under a minute" label since it's the only platform with instant export.
3. WHEN the user selects a platform, THE CatchUp_App SHALL display platform-specific step-by-step instructions with screenshots explaining how to request and download the data export from that platform (e.g., "Go to Instagram Settings → Privacy → Download Your Information → Request Download").
4. THE import wizard SHALL include a "My export isn't ready yet" option that saves the selected platform as a pending import and offers to send an email reminder to the user after 24 hours (for platforms like Instagram/Facebook where data downloads are not instant).
5. WHEN the user has a file ready, THE CatchUp_App SHALL provide a drag-and-drop file upload area that accepts the Chat_Export_File and auto-detects the platform and format using file extension and content signatures (XML root element for SMS Backup, JSON schema shape for Instagram/Facebook/Twitter, text line patterns for WhatsApp).
6. THE CatchUp_App SHALL accept files up to 200MB in size per upload by using streaming/chunked parsing (SAX-style for XML, streaming JSON parser, line-by-line for text) rather than loading the entire file into memory.
7. IF a Chat_Export_File exceeds 200MB, THEN THE CatchUp_App SHALL return a user-friendly error with the maximum allowed file size.
8. IF the uploaded file does not match a supported format, THEN THE CatchUp_App SHALL return a descriptive error message identifying the expected format for the detected platform.

### Requirement 6: Chat History Parsing and Interaction Extraction

**User Story:** As a user, I want the system to extract meaningful relationship signals from my chat history, so that my contact profiles reflect real interaction patterns.

#### Acceptance Criteria

1. WHEN a Chat_Export_File is successfully parsed, THE Chat_History_Parser SHALL generate an Interaction_Summary for each unique conversation participant containing: message count, first message date, last message date, average messages per month, and participant identifiers. This structural extraction SHALL happen synchronously during the import job.
2. WHEN an Interaction_Summary is generated, THE Chat_History_Parser SHALL enqueue a separate deferred background job via Google Cloud Tasks to perform AI enrichment (topic extraction and sentiment analysis) using the Google Gemini API. The import SHALL be considered complete before AI enrichment finishes.
3. WHEN the deferred AI enrichment job runs, THE Chat_History_Parser SHALL use the Google Gemini API to extract top 10 topic keywords and compute a sentiment score (positive/neutral/negative) from message content in batches of up to 100 messages.
4. THE Chat_History_Parser SHALL normalize participant identifiers across platforms (phone numbers to E.164 format, usernames to lowercase, email addresses to lowercase).
5. FOR ALL valid Interaction_Summary objects, serializing to JSON then deserializing SHALL produce an equivalent Interaction_Summary (round-trip property).

### Requirement 7: Tiered Contact Matching from Chat History

**User Story:** As a user, I want chat history participants to be intelligently matched to my existing contacts with minimal manual effort, so that enrichment data lands on the right profiles without overwhelming me.

#### Acceptance Criteria

1. WHEN Interaction_Summaries are generated from an import, THE CatchUp_App SHALL classify each participant into one of three match tiers based on confidence score:
   - **Auto-match (0.7+)**: Phone number exact match (after E.164 normalization), email exact match (case-insensitive), or social handle exact match. These are linked automatically with no user action required.
   - **Likely match (0.5–0.7)**: Name fuzzy match with support for nickname/alias matching against known aliases stored on the Contact. These are presented as a quick-confirm list.
   - **Unmatched (below 0.5)**: No plausible match found. These go into the Pending_Enrichment review queue.
2. WHEN presenting likely matches for user confirmation, THE CatchUp_App SHALL display a compact review list showing the chat participant name/identifier alongside the suggested Contact with the match reason (e.g., "Name similarity: Mike S → Michael Smith, 0.62"), with one-tap Confirm / Reject / Skip actions.
3. WHEN a participant is unmatched, THE CatchUp_App SHALL store the Interaction_Summary as a Pending_Enrichment and sort unmatched participants by message frequency descending, so the most active conversation partners surface first.
4. FOR unmatched participants with high message frequency (top 20% of participants in the import), THE CatchUp_App SHALL display a smart suggestion: "[Participant] sent you [N] messages — create a contact or link to someone?"
5. THE CatchUp_App SHALL allow the user to skip the entire matching review step and come back later. All unresolved likely matches and unmatched participants SHALL be stored as Pending_Enrichments accessible from the contact page.
6. WHEN a Contact_Match is confirmed (automatically or by user), THE CatchUp_App SHALL create an Enrichment_Record linking the Interaction_Summary to the matched Contact.
7. THE CatchUp_App SHALL require JWT authentication on all chat history import and matching endpoints.

### Requirement 8: Pending Enrichment Review Queue

**User Story:** As a user, I want to review and resolve unmatched chat participants at my own pace, so that I'm not forced to do it all at import time.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide a "Pending Enrichments" view accessible from the contacts page showing all Pending_Enrichment records grouped by import (platform and date).
2. EACH Pending_Enrichment entry SHALL display: participant name/identifier, platform source, message count, date range of messages, and a "Link to Contact" / "Create Contact" / "Dismiss" action set.
3. WHEN the user clicks "Link to Contact", THE CatchUp_App SHALL present a searchable contact picker that allows the user to search by name, email, or phone and select an existing Contact.
4. WHEN the user clicks "Create Contact", THE CatchUp_App SHALL create a new Contact pre-populated with the participant's identifiers (name, phone, handle) and link the Pending_Enrichment as an Enrichment_Record.
5. WHEN the user clicks "Dismiss", THE CatchUp_App SHALL mark the Pending_Enrichment as dismissed and hide it from the default view (with an option to show dismissed items).
6. THE CatchUp_App SHALL display a badge count of pending enrichments on the contacts page navigation to remind users of unresolved items.
7. WHEN AI enrichment (topics, sentiment) completes for a Pending_Enrichment's Interaction_Summary, THE CatchUp_App SHALL update the Pending_Enrichment entry to show the enriched data (topics, sentiment) to help the user decide whether to link it.

### Requirement 9: Contact Detail Panel

**User Story:** As a user, I want to see a rich profile view for each contact that surfaces enrichment data, relationship context, and source information, so that I can understand my relationship at a glance.

#### Acceptance Criteria

1. WHEN the user clicks on a contact in the contacts table, THE CatchUp_App SHALL open a Contact_Detail_Panel as a slide-out panel from the right side of the screen.
2. THE Contact_Detail_Panel SHALL display the contact's core fields (name, phone, email, social handles, location, timezone, notes) with inline edit capability.
3. THE Contact_Detail_Panel SHALL display a "Relationship Summary" section showing: last interaction date (across all sources), total message count (aggregated from all Enrichment_Records), communication frequency trend (increasing/stable/declining), and overall sentiment.
4. THE Contact_Detail_Panel SHALL display an "Enrichment Sources" section showing per-platform cards for each Enrichment_Record, each displaying: platform icon and name, message count, date range, top topics as tags, and sentiment indicator.
5. THE Contact_Detail_Panel SHALL display source badges showing all platforms that have contributed data to the contact profile (google, apple, chat_import with specific platform, voice_note, manual, calendar).
6. THE Contact_Detail_Panel SHALL display the contact's circle assignment, group memberships, and tags with the ability to edit each.
7. THE Contact_Detail_Panel SHALL display a sync status indicator showing whether the contact is synced with Google Contacts (synced / pending changes / has conflicts) and the last sync timestamp.
8. WHEN the Contact_Detail_Panel is open, THE CatchUp_App SHALL trap keyboard focus within the panel and support Escape to close.
9. THE Contact_Detail_Panel SHALL be responsive and render as a full-screen view on mobile devices.
10. WHEN the Contact_Detail_Panel is open and the contacts table is visible, THE CatchUp_App SHALL support arrow-up and arrow-down keyboard navigation to move to the previous/next contact in the table, updating the panel content without closing and reopening it (master-detail pattern).

### Requirement 10: Contact Profile Enrichment Display

**User Story:** As a user, I want my contact profiles to display enrichment data from imported chat history, so that I can see relationship context at a glance.

#### Acceptance Criteria

1. WHEN an Enrichment_Record exists for a Contact, THE CatchUp_App SHALL display the communication frequency (messages per month), last interaction date, and top topics on the Contact_Detail_Panel.
2. WHEN multiple Enrichment_Records exist for a Contact from different platforms, THE CatchUp_App SHALL aggregate the data and display a combined view with per-platform breakdown.
3. WHEN an Enrichment_Record contains a more recent last interaction date than the Contact's existing lastContactDate, THE CatchUp_App SHALL update the Contact's lastContactDate to the more recent value.
4. THE CatchUp_App SHALL store Enrichment_Records in a dedicated database table with columns: id, contact_id, user_id, platform, message_count, first_message_date, last_message_date, avg_messages_per_month, topics (JSONB), sentiment, raw_data_reference, imported_at.
5. WHEN a user deletes an Enrichment_Record, THE CatchUp_App SHALL remove the enrichment data from the Contact's profile and revert the lastContactDate to the next most recent value from remaining Enrichment_Records or the original value.

### Requirement 11: Chat History Import Status and Progress

**User Story:** As a user, I want to see the progress of my chat history import, so that I know when enrichment is complete and can review results.

#### Acceptance Criteria

1. WHEN a Chat_Export_File upload begins processing, THE CatchUp_App SHALL create a background job via Google Cloud Tasks and return a job ID to the client.
2. WHILE a chat history import job is processing, THE CatchUp_App SHALL display an inline progress indicator in the import wizard showing the current phase (parsing, extracting, matching), percentage complete, and count of contacts matched so far.
3. WHEN a chat history import job completes, THE CatchUp_App SHALL display a summary screen showing: total participants found, contacts auto-matched, likely matches awaiting confirmation, unmatched participants added to pending queue, and enrichment records created.
4. THE import summary screen SHALL provide direct links to: "Review Likely Matches" (navigates to the confirmation list from Req 7), "Review Pending Enrichments" (navigates to the queue from Req 8), and "View Contacts" (navigates to the contacts table).
5. IF a chat history import job fails, THEN THE CatchUp_App SHALL display the error message and failed phase inline in the import wizard with a "Retry" option.
6. THE CatchUp_App SHALL allow a user to have at most 3 concurrent import jobs to prevent resource exhaustion.

### Requirement 12: Import History and Data Management

**User Story:** As a user, I want to see a history of my imports and manage imported data, so that I can track what I've imported and control my data.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide an "Import History" view accessible from the contacts page or settings showing all Import_Records sorted by date descending.
2. EACH Import_Record SHALL display: platform icon and name, file name, import date, total participants found, contacts matched, pending enrichments remaining, and status (complete, processing, failed).
3. WHEN the user clicks "Delete Import" on an Import_Record, THE CatchUp_App SHALL display a confirmation dialog explaining that all Enrichment_Records from this import will be removed and contact lastContactDate values will be recalculated.
4. WHEN the user confirms import deletion, THE CatchUp_App SHALL remove all Enrichment_Records and Pending_Enrichments associated with the Import_Record and revert affected Contact fields to their pre-import values.
5. THE CatchUp_App SHALL provide a "Re-import" action on an Import_Record that opens the import wizard pre-configured for the same platform, allowing the user to upload a newer export file that replaces the previous import's data.
6. THE CatchUp_App SHALL NOT store raw message content after parsing is complete. Only Interaction_Summaries (aggregate statistics, topics, sentiment) SHALL be persisted. The raw_data_reference field SHALL store a hash of the original file for deduplication, not the content itself.

### Requirement 13: Google Contacts 2-Way Sync with User Review

**User Story:** As a user, I want edits I make in CatchUp to be syncable back to Google Contacts, but only after I review and approve the changes, so that I don't accidentally overwrite data in Google.

#### Acceptance Criteria

1. WHEN a user edits a Contact field (name, phone, email, or customNotes) on a Contact with a googleResourceName, THE Google_Sync_Back_Service SHALL create a Sync_Back_Operation record containing the contact ID, field name, previous value, new value, and timestamp, with status set to 'pending_review'.
2. THE CatchUp_App SHALL display a "Pending Sync Changes" indicator (badge count) on the contacts page and in the Contact_Detail_Panel showing how many local edits have not yet been synced to Google.
3. WHEN the user opens the sync review interface (from the badge or Contact_Detail_Panel), THE CatchUp_App SHALL display a diff view for each pending Sync_Back_Operation showing: contact name, field changed, CatchUp value (new), Google value (current), with per-change Approve / Skip checkboxes and a bulk "Approve All" / "Skip All" option.
4. WHEN the user approves one or more Sync_Back_Operations, THE Google_Sync_Back_Service SHALL enqueue Google Cloud Tasks jobs to push the approved changes to Google Contacts via the People API updateContact endpoint.
5. THE Google_Sync_Back_Service SHALL use the Contact's stored googleEtag for optimistic concurrency control when writing to Google Contacts.
6. IF the Google API returns a 409 conflict (etag mismatch), THEN THE Google_Sync_Back_Service SHALL fetch the latest version from Google, update the diff view to show the new Google value, and let the user re-review the change.
7. WHEN a Sync_Back_Operation completes successfully, THE Google_Sync_Back_Service SHALL update the Contact's googleEtag and lastSyncedAt fields and mark the operation as 'synced'.
8. THE CatchUp_App SHALL provide an undo endpoint that accepts a Sync_Back_Operation ID and reverts the change both locally and on Google Contacts by restoring the previous value.
9. THE Google_Sync_Back_Service SHALL require the `https://www.googleapis.com/auth/contacts` OAuth scope (read-write) instead of the current read-only scope, and SHALL request the upgraded scope via an incremental authorization prompt only when the user first attempts to approve a sync-back.
10. THE Contact_Detail_Panel SHALL display a sync status indicator showing whether the contact is synced, has pending changes awaiting review, or has a sync conflict.

### Requirement 14: Apple Contacts Import and Export via vCard

**User Story:** As a user, I want to import my Apple Contacts into CatchUp via vCard files and export my CatchUp contacts back to vCard format, so that I can manage contacts across ecosystems.

#### Acceptance Criteria

1. WHEN a user uploads a vCard (.vcf) file, THE vCard_Parser SHALL parse the file into Contact records supporting vCard 3.0 and 4.0 formats.
2. WHEN parsing a vCard file, THE vCard_Parser SHALL extract: name (FN/N), phone (TEL), email (EMAIL), organization (ORG), address (ADR), social profiles (X-SOCIALPROFILE, IMPP), and notes (NOTE).
3. IF a vCard file contains malformed entries, THEN THE vCard_Parser SHALL skip the malformed entry, log the error, and continue parsing remaining entries.
4. WHEN importing contacts from a vCard file, THE Apple_Contacts_Service SHALL match imported contacts against existing Contact records using the same matching logic as Requirement 7 (phone, email, name fuzzy match) and merge data for matched contacts rather than creating duplicates.
5. THE CatchUp_App SHALL provide a "Export to vCard" action that serializes selected contacts (or all contacts) into a valid vCard 4.0 file for download.
6. THE vCard_Printer SHALL serialize Contact records back into valid vCard 4.0 format.
7. FOR ALL valid Contact records, parsing a vCard then printing then parsing SHALL produce an equivalent Contact record (round-trip property).

### Requirement 15: Contact Archival Implementation

**User Story:** As a user, I want to archive contacts I no longer actively track, so that my contact list stays focused on current relationships.

#### Acceptance Criteria

1. WHEN a user requests to archive contacts, THE CatchUp_App SHALL first call the previewArchival endpoint returning the list of contacts that would be archived with their name, email, phone, groups, and circle assignment.
2. WHEN the user confirms the archival preview, THE CatchUp_App SHALL set the archived_at timestamp on each selected Contact and exclude those contacts from the default contact list, suggestion generation, and circle/group views.
3. THE CatchUp_App SHALL provide a dedicated "Archived Contacts" view accessible from the contacts page that lists all archived contacts sorted by archived_at descending.
4. WHEN a user restores an archived contact, THE CatchUp_App SHALL clear the archived_at timestamp and restore the contact to the default contact list with all previous group and circle assignments intact.
5. THE CatchUp_App SHALL display the count of archived contacts on the contacts page as a badge or label next to the "Archived" view link.

### Requirement 16: Bulk Contact Operations

**User Story:** As a user, I want to perform actions on multiple contacts at once, so that I can efficiently organize large contact lists.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide a multi-select mode on the contacts list that allows selecting multiple contacts via checkboxes.
2. WHEN contacts are selected in multi-select mode, THE CatchUp_App SHALL display a bulk action toolbar with options: Archive, Add Tag, Assign to Group, and Assign to Circle.
3. WHEN the user executes a Bulk_Operation to archive, THE CatchUp_App SHALL send a single API request containing all selected contact IDs and archive all contacts in a single database transaction.
4. WHEN the user executes a Bulk_Operation to add a tag, THE CatchUp_App SHALL prompt for the tag text, then apply the tag to all selected contacts in a single database transaction.
5. WHEN the user executes a Bulk_Operation to assign to a group, THE CatchUp_App SHALL present a group picker, then assign all selected contacts to the chosen group in a single database transaction.
6. WHEN the user executes a Bulk_Operation to assign to a circle, THE CatchUp_App SHALL present a circle picker (inner/close/active/casual), then assign all selected contacts to the chosen circle in a single database transaction.
7. IF a Bulk_Operation fails for any contact in the batch, THEN THE CatchUp_App SHALL roll back the entire transaction and return an error identifying which contacts failed and the reason.
8. THE CatchUp_App SHALL limit Bulk_Operations to a maximum of 200 contacts per request to prevent timeout issues.

### Requirement 17: Enrichment Data in AI Suggestion Engine

**User Story:** As a user, I want the AI suggestion engine to use my imported chat history data when generating catchup suggestions, so that suggestions reflect real relationship patterns.

#### Acceptance Criteria

1. WHEN generating catchup suggestions, THE AI_Suggestion_Engine SHALL incorporate Enrichment_Record data (communication frequency, recency, sentiment) as additional signal factors alongside existing interaction logs and calendar data.
2. WHEN an Enrichment_Record indicates a declining communication frequency (current month average less than 50% of the 6-month average) for a Contact, THE AI_Suggestion_Engine SHALL increase the priority score for that Contact's catchup suggestion.
3. WHEN an Enrichment_Record indicates a negative sentiment trend for a Contact, THE AI_Suggestion_Engine SHALL include the sentiment context in the suggestion reasoning text.
4. THE AI_Suggestion_Engine SHALL use configurable signal weights stored in a configuration table with defaults: Enrichment_Record signals at 25%, existing interaction logs at 35%, calendar data at 25%, and contact metadata at 15%. These weights SHALL be adjustable without code changes.
5. WHEN no Enrichment_Records exist for a Contact, THE AI_Suggestion_Engine SHALL generate suggestions using only existing signals with no degradation in suggestion quality.
6. THE AI_Suggestion_Engine SHALL log which signal weights contributed to each suggestion to enable future tuning based on user accept/dismiss patterns.
7. THE Suggestions page SHALL display enrichment context in each suggestion card's reasoning section, showing specific data points from Enrichment_Records (e.g., "You exchanged 847 WhatsApp messages with Sarah in the last 6 months, but haven't talked in 3 weeks") rather than generic labels like "High interaction frequency."

### Requirement 18: Contact Source Tracking for Multi-Platform Import

**User Story:** As a user, I want to see which platforms my contact data came from, so that I understand the provenance of enrichment data.

#### Acceptance Criteria

1. THE Contact model SHALL replace the single `source` field with a `sources` array field (type `string[]`) that can contain multiple values from: 'manual', 'google', 'apple', 'calendar', 'voice_note', 'chat_import'.
2. WHEN a Contact is created or enriched from a chat history import, THE CatchUp_App SHALL add 'chat_import' to the Contact's sources array (if not already present) and store the specific platform (instagram, imessage, facebook, whatsapp, twitter, google_messages) in the Enrichment_Record.
3. WHEN a Contact is created from an Apple Contacts import, THE CatchUp_App SHALL add 'apple' to the Contact's sources array.
4. THE Contact_Detail_Panel SHALL display source badges showing all platforms that have contributed data to the contact profile.
5. THE CatchUp_App SHALL allow filtering contacts by source on the contacts list page.
6. THE database migration SHALL convert existing single-value `source` fields to the new `sources` array format, preserving existing values.

### Requirement 19: Remove Scheduling Module

**User Story:** As a developer, I want all scheduling code removed from the v1 codebase, so that the app is focused and the codebase is maintainable.

#### Acceptance Criteria

1. THE CatchUp_App SHALL remove the entire `src/scheduling/` directory including: availability-collection-service.ts, availability-repository.ts, conflict-resolution-service.ts, invite-link-repository.ts, invite-link-service.ts, notification-repository.ts, preferences-repository.ts, scheduling-notification-service.ts, scheduling-preferences-service.ts, scheduling-repository.ts, scheduling-service.ts, and index.ts.
2. THE CatchUp_App SHALL remove the scheduling API routes: scheduling.ts, scheduling-availability.ts, scheduling-preferences.ts, and scheduling-notifications.ts from `src/api/routes/`.
3. THE CatchUp_App SHALL remove the scheduling route registrations from `src/api/server.ts` (the four `app.use('/api/scheduling', ...)` lines).
4. THE CatchUp_App SHALL remove scheduling-related frontend files from `public/js/` including any files prefixed with scheduling-, plan-, or availability-.
5. THE CatchUp_App SHALL remove the public availability page route (`/availability/:token`) and the `public/availability.html` file.
6. THE CatchUp_App SHALL remove the scheduling type exports from `src/types/index.ts` (the `export * from './scheduling'` line).
7. WHEN the scheduling module is removed, THE CatchUp_App SHALL continue to compile without TypeScript errors and all remaining tests SHALL pass.

### Requirement 20: Remove SMS/Twilio Module

**User Story:** As a developer, I want all Twilio SMS code removed from the v1 codebase, so that unused dependencies and code paths are eliminated.

#### Acceptance Criteria

1. THE CatchUp_App SHALL remove the entire `src/sms/` directory including all SMS processing, Twilio webhook, rate limiting, monitoring, and media downloading services.
2. THE CatchUp_App SHALL remove the SMS/Twilio API routes from `src/api/routes/`: sms-webhook.ts, sms-monitoring.ts, sms-performance.ts, twilio-test.ts, and phone-number.ts.
3. THE CatchUp_App SHALL remove the SMS/Twilio route registrations from `src/api/server.ts` (the sms-webhook, sms-monitoring, sms-performance, twilio-test, and phone-number route lines).
4. THE CatchUp_App SHALL remove SMS delivery from the notification system, retaining only email (SendGrid) delivery in `src/notifications/`.
5. THE CatchUp_App SHALL remove the Twilio testing UI files from `public/` if present.
6. WHEN the SMS/Twilio module is removed, THE CatchUp_App SHALL continue to compile without TypeScript errors and all remaining tests SHALL pass.

### Requirement 21: Remove Stale Documentation

**User Story:** As a developer, I want stale markdown files removed from the project root, so that the repository is clean and documentation is trustworthy.

#### Acceptance Criteria

1. THE CatchUp_App SHALL remove all implementation-tracking markdown files from the project root directory that document completed or obsolete work (files matching patterns: *_COMPLETE.md, *_SUCCESS.md, *_FIX.md, *_GUIDE.md, *_SUMMARY.md, *_STATUS.md, *_TASK.md, *_RESEARCH.md, *_CHECKLIST.md, *_ANALYSIS.md, *_PROGRESS.md, *_RESULTS.md).
2. THE CatchUp_App SHALL remove README files scattered in `public/js/` subdirectories that document internal implementation details.
3. THE CatchUp_App SHALL preserve the root README.md, .env.example, and any configuration files (.prettierrc.json, .gitignore, tsconfig.json).
4. THE CatchUp_App SHALL preserve documentation in `docs/` that is referenced by active features.

### Requirement 22: Fix Inconsistent API Authentication

**User Story:** As a developer, I want all API routes to use consistent JWT authentication, so that the app has a uniform security model.

#### Acceptance Criteria

1. THE CatchUp_App SHALL audit all API routes under `/api/` and identify routes that use query parameter authentication (e.g., `?userId=`) instead of JWT Bearer token authentication.
2. WHEN an API route is found using query parameter authentication, THE CatchUp_App SHALL migrate the route to use the existing JWT authentication middleware (`requireAuth`).
3. THE CatchUp_App SHALL remove any query parameter-based user identification from migrated routes and extract the userId exclusively from the JWT token payload.
4. IF a route currently serves both authenticated and unauthenticated access patterns, THEN THE CatchUp_App SHALL split the route into separate authenticated and public endpoints.
5. THE CatchUp_App SHALL verify that all protected API routes return 401 Unauthorized when no valid JWT token is provided.

### Requirement 23: Streamline Calendar Integration as Enrichment Source

**User Story:** As a user, I want my Google Calendar data to automatically enrich my contact profiles with meeting history, so that CatchUp understands who I meet with and how often — without needing a separate calendar UI.

#### Acceptance Criteria

1. THE CatchUp_App SHALL retain the Google Calendar OAuth connection as an optional step accessible from the Settings page (Req 25) and from a Home_Dashboard nudge card ("Connect your calendar for richer insights").
2. WHEN a user connects their Google Calendar, THE CatchUp_App SHALL sync calendar events in the background and extract attendee co-occurrence data (who the user meets with, how often, most recent meeting date) to feed into contact enrichment and suggestion signals.
3. THE CatchUp_App SHALL store calendar-derived enrichment data on Contact records: meeting count, last meeting date, and meeting frequency, using the user's stored timezone preference for date calculations. IF no timezone preference is set, THE CatchUp_App SHALL default to UTC.
4. THE CatchUp_App SHALL remove the Calendar page from the main navigation. Calendar events SHALL NOT be browsable or viewable as a standalone feature in v1.
5. THE CatchUp_App SHALL remove or disable the availability service (free slot calculation), iCal feed generation, and calendar event generator (creating events) — these are v2 scheduling capabilities.
6. THE CatchUp_App SHALL retain the calendar sync service (`src/calendar/calendar-service.ts`) and calendar event storage for background enrichment processing, but remove calendar-specific API routes that expose event browsing, availability, or feed endpoints.
7. THE Contact_Detail_Panel (Req 9) SHALL display calendar-derived data alongside chat import enrichment: "12 meetings in the last 6 months" with the most recent meeting date, shown as a calendar source card in the Enrichment Sources section.
8. THE AI_Suggestion_Engine (Req 17) SHALL continue to use calendar co-attendance as a signal for catchup suggestions, weighted alongside enrichment data, interaction logs, and contact metadata.
9. WHEN the calendar sync detects a new meeting attendee who matches an existing Contact, THE CatchUp_App SHALL update the Contact's lastContactDate if the meeting date is more recent.

### Requirement 24: Chat History Parser — Platform-Specific Formats

**User Story:** As a developer, I want well-defined parsers for each messaging platform's export format, so that chat history import is reliable and testable.

#### Acceptance Criteria

1. THE Chat_History_Parser SHALL implement a WhatsApp parser that handles the native text export format with locale-dependent date patterns (e.g., `[MM/DD/YY, HH:MM:SS]`, `[DD/MM/YY, HH:MM:SS]`, `[DD.MM.YY, HH:MM:SS]`) by attempting multiple known date format patterns and selecting the one that produces valid dates for the majority of lines. The parser SHALL handle multi-line messages and system messages.
2. THE Chat_History_Parser SHALL implement an Instagram parser that handles the JSON export format from Instagram's "Download Your Information" feature, extracting messages from the `messages` array within each conversation.
3. THE Chat_History_Parser SHALL implement an iMessage parser that handles CSV exports (from tools like iMazing) with columns for date, sender, message text, and attachment indicators.
4. THE Chat_History_Parser SHALL implement a Facebook Messenger parser that handles the JSON export format from Facebook's "Download Your Information" feature, extracting messages from the `messages` array.
5. THE Chat_History_Parser SHALL implement an X/Twitter DM parser that handles the JSON export format from Twitter's data download, extracting messages from the `dmConversation` objects.
6. THE Chat_History_Parser SHALL implement a Google Messages/SMS parser that handles XML files exported by the "SMS Backup & Restore" Android app, extracting messages from `<sms>` elements with attributes: `address` (phone number), `body` (message text), `date` (Unix timestamp ms), `type` (1=received, 2=sent), and `contact_name`.
7. THE Chat_History_Parser SHALL expose a common `ParseResult` interface from all platform parsers containing: platform identifier, participant list, message array (each with timestamp, sender, and content), and parse error array.
8. WHEN a parser encounters lines or entries it cannot parse, THE parser SHALL add the error to the parse error array and continue processing remaining entries (graceful degradation) rather than failing the entire import.
9. THE Chat_History_Parser SHALL implement a Pretty_Printer that serializes a ParseResult back into a human-readable text format for debugging and export.
10. FOR ALL valid ParseResult objects, serializing to JSON then deserializing SHALL produce an equivalent ParseResult (round-trip property for the structured format, not the original platform format).

### Requirement 25: Unified Settings Page

**User Story:** As a user, I want a single settings page where I can manage all my preferences, so that I don't have to hunt through scattered modals.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide a dedicated Settings page accessible from the main navigation sidebar.
2. THE Settings page SHALL consolidate the following preference sections: Profile (name, email, timezone selection searchable by city name or timezone identifier), Notification Preferences (in-app notification types to enable/disable, future email delivery preferences), Connected Accounts (Google Contacts sync status with scope level, Google Calendar connection status with connect/disconnect option, pending sync count), Import History (link to import history view from Req 12), and Display Preferences (theme toggle, keyboard shortcuts).
3. THE Settings page SHALL display the user's connected Google account with a "Disconnect" option and the current OAuth scope level (read-only vs. read-write).
4. THE Settings page SHALL display the timezone selection UI that allows searching by city name or timezone identifier.
5. WHEN the user changes any setting, THE CatchUp_App SHALL save the change immediately (auto-save) and display a brief confirmation toast.

### Requirement 26: In-App Notification System

**User Story:** As a user, I want to be notified when async operations complete or need my attention, so that I don't have to keep checking back manually.

#### Acceptance Criteria

1. THE CatchUp_App SHALL provide a notification center accessible via a bell icon in the app header/sidebar, displaying a badge count of unread notifications.
2. THE notification center SHALL display a scrollable list of In_App_Notifications sorted by timestamp descending, each showing: icon (based on event type), title, description, timestamp (relative), read/unread state, and an optional action link (e.g., "Review matches", "View contact").
3. THE CatchUp_App SHALL generate In_App_Notifications for the following system events:
   - **Import complete**: "Your [platform] import finished — [N] contacts enriched, [M] pending matches" (action: link to import summary)
   - **Import failed**: "Your [platform] import failed during [phase]" (action: link to retry)
   - **AI enrichment ready**: "AI analysis complete for your [platform] import — topics and sentiment now available" (action: link to enriched contacts)
   - **Export reminder**: "Your [platform] data export should be ready — continue your import" (action: link to import wizard for that platform, triggered 24h after "My export isn't ready yet" from Req 5 AC 4)
   - **Sync conflict**: "[N] sync conflicts detected with Google Contacts" (action: link to sync review from Req 13)
   - **Pending enrichments reminder**: "You have [N] unmatched participants waiting for review" (action: link to pending enrichment queue from Req 8, triggered 48h after import if unresolved items remain)
4. THE CatchUp_App SHALL store In_App_Notifications in a database table with columns: id, user_id, event_type, title, description, action_url, read (boolean), created_at.
5. WHEN the user clicks on a notification, THE CatchUp_App SHALL mark it as read and navigate to the action_url if present.
6. THE CatchUp_App SHALL provide a "Mark all as read" action in the notification center.
7. THE CatchUp_App SHALL automatically delete notifications older than 30 days to prevent unbounded growth.
8. THE notification system SHALL use a delivery channel abstraction (interface with `send(userId, notification)` method) so that email and push notification channels can be added as additional delivery mechanisms in the future without changing the event-producing code.
9. THE Home_Dashboard (Req 3) action items section SHALL pull from the same notification data source, showing the most recent unread notifications as action cards.

### Requirement 27: Frontend Modularization

**User Story:** As a developer, I want the monolithic app.js broken into focused ES modules, so that the codebase is maintainable and new features can be developed without navigating 8000+ lines of code.

#### Acceptance Criteria

1. THE CatchUp_App SHALL refactor the monolithic `public/js/app.js` (8400+ lines) into focused ES modules, one per page or major feature area: `home-dashboard.js`, `directory-page.js`, `suggestions-page.js`, `settings-page.js`, `contact-detail-panel.js`, `import-wizard.js`, `notification-center.js`, and `app-shell.js` (navigation, auth, theme).
2. EACH module SHALL use ES module syntax (`import`/`export`) and be loaded via `<script type="module">` tags or dynamic `import()` for code splitting.
3. THE `app-shell.js` module SHALL own the sidebar navigation, page routing, authentication state, theme management, and global utilities (toast, confirm dialog, fetch wrapper).
4. SHARED utilities (escapeHtml, formatDateTime, formatRelativeTime, fetchWithRetry, showToast, showConfirm) SHALL be extracted into a `utils.js` module imported by other modules.
5. THE refactoring SHALL NOT change any user-facing behavior — all existing functionality SHALL work identically after modularization.
6. EACH new page module (home-dashboard, import-wizard, notification-center, contact-detail-panel) SHALL be created as a separate file from the start rather than added to app.js.
