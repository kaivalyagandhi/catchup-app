# Requirements Document

## Introduction

This specification enhances the CatchUp voice notes feature to support real-time audio transcription using Google Cloud Speech-to-Text, multiple contacts per voice note, group catchup suggestions (up to 3 contacts), and a comprehensive web-based UI for recording, reviewing, and managing voice notes with enrichment proposals.

## Glossary

- **Voice Note**: An audio recording captured via device microphone containing context about one or more contacts
- **Real-time Transcription**: Live audio-to-text conversion as the user speaks using streaming recognition
- **Enrichment Proposal**: A structured set of suggested updates to contact metadata extracted from voice note content
- **Enrichment Item**: An atomic unit of proposed change (field update, tag addition, group assignment)
- **Contact Disambiguation**: The process of identifying which contact(s) a voice note refers to
- **Group Catchup**: A suggestion to meet with 2-3 contacts simultaneously based on shared context
- **Shared Context**: Common attributes between contacts including group memberships, tags, or interests
- **Processing Status**: The current state of voice note processing (recording, transcribing, extracting, ready, applied)
- **Google Cloud Speech-to-Text**: Google's streaming speech recognition service for real-time transcription
- **Audio Recording Interface**: Web-based UI component for capturing microphone audio
- **Transcript Display**: UI component showing live or final transcription text
- **Enrichment Review Interface**: UI component for reviewing and editing proposed contact updates


## Requirements

### Requirement 1: Real-time Audio Recording and Transcription

**User Story:** As a user, I want to record voice notes with live transcription, so that I can see what's being captured in real-time and verify accuracy.

#### Acceptance Criteria

1. WHEN a user accesses the voice note interface THEN the Voice Note System SHALL display a microphone recording button
2. WHEN a user clicks the recording button THEN the Voice Note System SHALL request microphone permissions from the browser
3. WHEN microphone access is granted THEN the Voice Note System SHALL begin streaming audio to Google Cloud Speech-to-Text API
4. WHEN audio is streaming THEN the Voice Note System SHALL display interim transcription results in real-time
5. WHEN the user speaks THEN the Voice Note System SHALL update the transcript display continuously as words are recognized
6. WHEN the user pauses speaking THEN the Voice Note System SHALL finalize the current utterance and display it as confirmed text
7. WHEN the user clicks stop recording THEN the Voice Note System SHALL end the audio stream and finalize the complete transcript
8. WHEN recording is active THEN the Voice Note System SHALL display a visual indicator showing recording status
9. WHEN transcription is processing THEN the Voice Note System SHALL display a processing status indicator


### Requirement 2: Multiple Contact Support

**User Story:** As a user, I want to reference multiple contacts in a single voice note, so that I can capture context about group hangouts or shared experiences.

#### Acceptance Criteria

1. WHEN a voice note transcript mentions multiple people THEN the Voice Note System SHALL identify all referenced contacts
2. WHEN multiple contacts are identified THEN the Voice Note System SHALL associate all identified contacts with the voice note
3. WHEN disambiguation fails for any contact THEN the Voice Note System SHALL prompt the user to manually select from their contact list
4. WHEN the user manually selects contacts THEN the Voice Note System SHALL support multi-select for choosing multiple contacts
5. WHEN enrichment is extracted THEN the Voice Note System SHALL allow associating different enrichment items with different contacts
6. WHEN displaying voice note history THEN the Voice Note System SHALL show all associated contacts for each voice note


### Requirement 3: Entity Extraction for Multiple Contacts

**User Story:** As a user, I want the system to extract relevant information for each contact mentioned, so that all contacts benefit from the enrichment.

#### Acceptance Criteria

1. WHEN a voice note references multiple contacts THEN the Voice Note System SHALL extract entities for each contact independently
2. WHEN extracting entities THEN the Voice Note System SHALL identify which information applies to which contact based on context
3. WHEN information applies to all contacts THEN the Voice Note System SHALL propose adding it to all associated contacts
4. WHEN information is ambiguous THEN the Voice Note System SHALL prompt the user to specify which contact(s) it applies to
5. WHEN generating enrichment proposals THEN the Voice Note System SHALL create separate proposals for each contact
6. WHEN shared context is detected THEN the Voice Note System SHALL identify common tags or groups applicable to all contacts


### Requirement 4: Enrichment Proposal Review Interface

**User Story:** As a user, I want to review and edit proposed enrichments before applying them, so that I maintain control over contact data accuracy.

#### Acceptance Criteria

1. WHEN entity extraction completes THEN the Voice Note System SHALL display an enrichment review interface
2. WHEN the review interface is displayed THEN the Voice Note System SHALL show all proposed changes grouped by contact
3. WHEN displaying enrichment items THEN the Voice Note System SHALL show the item type, action, field name, and proposed value
4. WHEN displaying enrichment items THEN the Voice Note System SHALL provide checkboxes for accepting or rejecting each item
5. WHEN the user clicks an enrichment item THEN the Voice Note System SHALL allow inline editing of the proposed value
6. WHEN the user edits a value THEN the Voice Note System SHALL validate the input based on field type
7. WHEN the user reviews proposals THEN the Voice Note System SHALL provide accept all, reject all, and apply selected buttons
8. WHEN the user clicks apply THEN the Voice Note System SHALL update only the accepted enrichment items
9. WHEN accepted enrichment items include tags THEN the Voice Note System SHALL create or associate those tags with the corresponding contacts
10. WHEN accepted enrichment items include groups THEN the Voice Note System SHALL create groups if they don't exist and assign the corresponding contacts to those groups
11. WHEN accepted enrichment items include contact fields THEN the Voice Note System SHALL update those fields on the corresponding contact records
12. WHEN enrichment is applied THEN the Voice Note System SHALL display a confirmation message with summary of changes


### Requirement 5: Contact Selection UI

**User Story:** As a user, I want to manually select contacts when disambiguation fails, so that voice notes are properly associated even when automatic detection doesn't work.

#### Acceptance Criteria

1. WHEN contact disambiguation fails THEN the Voice Note System SHALL display a contact selection interface
2. WHEN the selection interface is displayed THEN the Voice Note System SHALL show the full contact list with search functionality
3. WHEN the user searches contacts THEN the Voice Note System SHALL filter the list by name, tags, or groups
4. WHEN the user selects contacts THEN the Voice Note System SHALL support multi-select for choosing multiple contacts
5. WHEN contacts are selected THEN the Voice Note System SHALL highlight the selected contacts visually
6. WHEN the user confirms selection THEN the Voice Note System SHALL associate the voice note with the selected contacts
7. WHEN the user confirms selection THEN the Voice Note System SHALL proceed to entity extraction for the selected contacts


### Requirement 6: Voice Notes History View

**User Story:** As a user, I want to view all my past voice notes with their enrichment summaries, so that I can review what context I've captured over time.

#### Acceptance Criteria

1. WHEN a user accesses the voice notes history THEN the Voice Note System SHALL display all voice notes in reverse chronological order
2. WHEN displaying a voice note THEN the Voice Note System SHALL show the recording date, transcript preview, and associated contacts
3. WHEN displaying a voice note THEN the Voice Note System SHALL show an enrichment summary indicating what was extracted and applied
4. WHEN the user clicks a voice note THEN the Voice Note System SHALL expand to show the full transcript
5. WHEN the user clicks a voice note THEN the Voice Note System SHALL display all enrichment items that were applied
6. WHEN displaying enrichment items THEN the Voice Note System SHALL indicate which contact each item was applied to
7. WHEN the user views history THEN the Voice Note System SHALL provide filtering by contact, date range, or processing status
8. WHEN the user views history THEN the Voice Note System SHALL provide search functionality across transcripts


### Requirement 7: Processing Status Indicators

**User Story:** As a user, I want to see the current processing status of my voice note, so that I understand what's happening and when I can review results.

#### Acceptance Criteria

1. WHEN recording starts THEN the Voice Note System SHALL display a recording status indicator
2. WHEN transcription is in progress THEN the Voice Note System SHALL display a transcribing status indicator
3. WHEN entity extraction is running THEN the Voice Note System SHALL display an extracting status indicator
4. WHEN enrichment proposals are ready THEN the Voice Note System SHALL display a ready for review status indicator
5. WHEN enrichment is applied THEN the Voice Note System SHALL display an applied status indicator
6. WHEN an error occurs THEN the Voice Note System SHALL display an error status with descriptive message
7. WHEN status changes THEN the Voice Note System SHALL update the indicator without requiring page refresh
8. WHEN processing is complete THEN the Voice Note System SHALL provide a visual notification to the user


### Requirement 8: Group Catchup Suggestions

**User Story:** As a user, I want suggestions to meet with multiple contacts simultaneously when appropriate, so that I can efficiently maintain relationships with people who share common context while still getting individual suggestions.

#### Acceptance Criteria

1. WHEN generating suggestions THEN the Suggestion System SHALL produce both one-on-one and group suggestions
2. WHEN generating suggestions THEN the Suggestion System SHALL balance group suggestions with individual suggestions based on shared context strength
3. WHEN identifying potential group suggestions THEN the Suggestion System SHALL identify groups of 2-3 contacts with strong shared context
4. WHEN identifying shared context THEN the Suggestion System SHALL consider common group memberships
5. WHEN identifying shared context THEN the Suggestion System SHALL consider overlapping tags and interests
6. WHEN identifying shared context THEN the Suggestion System SHALL consider contacts mentioned together in voice notes
7. WHEN creating a group suggestion THEN the Suggestion System SHALL verify all contacts are due for connection based on frequency preferences
8. WHEN creating a group suggestion THEN the Suggestion System SHALL match the suggestion to a calendar slot that accommodates all contacts
9. WHEN displaying a group suggestion THEN the Suggestion System SHALL show all contact names and the shared context reasoning
10. WHEN a user accepts a group suggestion THEN the Suggestion System SHALL create interaction log entries for all contacts
11. WHEN a user dismisses a group suggestion THEN the Suggestion System SHALL allow dismissing for all contacts or individual contacts
12. WHEN contacts lack strong shared context THEN the Suggestion System SHALL prioritize individual one-on-one suggestions


### Requirement 9: Enhanced Matching Logic for Balanced Suggestions

**User Story:** As a user, I want the matching algorithm to intelligently balance group and individual suggestions, so that I maintain relationships efficiently while preserving meaningful one-on-one connections.

#### Acceptance Criteria

1. WHEN calculating suggestion priority THEN the Suggestion System SHALL evaluate both individual and group suggestion opportunities
2. WHEN multiple contacts share a group THEN the Suggestion System SHALL calculate a shared context score
3. WHEN contacts have overlapping interests THEN the Suggestion System SHALL calculate a shared interest score
4. WHEN contacts were mentioned together in voice notes THEN the Suggestion System SHALL increase their group suggestion likelihood
5. WHEN the shared context score exceeds a threshold THEN the Suggestion System SHALL generate a group suggestion
6. WHEN the shared context score is below the threshold THEN the Suggestion System SHALL generate individual suggestions
7. WHEN generating group suggestions THEN the Suggestion System SHALL limit group size to maximum 3 contacts
8. WHEN matching group suggestions to timeslots THEN the Suggestion System SHALL require longer duration slots for groups
9. WHEN generating a batch of suggestions THEN the Suggestion System SHALL include a mix of both group and individual suggestions
10. WHEN a contact is included in a group suggestion THEN the Suggestion System SHALL still generate individual suggestions for that contact at appropriate intervals


### Requirement 10: Google Cloud Speech-to-Text Integration

**User Story:** As a developer, I want to use Google Cloud Speech-to-Text for transcription, so that we have real-time streaming capabilities without dependency on OpenAI.

#### Acceptance Criteria

1. WHEN the Voice Note System initializes THEN the Voice Note System SHALL authenticate with Google Cloud using service account credentials or API key
2. WHEN audio streaming begins THEN the Voice Note System SHALL configure the Speech-to-Text client with LINEAR16 encoding at 16000 Hz sample rate
3. WHEN audio chunks are captured THEN the Voice Note System SHALL stream them to the Speech-to-Text API via gRPC
4. WHEN the API returns interim results THEN the Voice Note System SHALL update the transcript display without finalizing
5. WHEN the API returns final results THEN the Voice Note System SHALL append the finalized text to the complete transcript
6. WHEN streaming encounters errors THEN the Voice Note System SHALL handle reconnection and resume transcription
7. WHEN the user's language preference is set THEN the Voice Note System SHALL configure the appropriate language code for recognition
8. WHEN transcription completes THEN the Voice Note System SHALL return the complete transcript text

### Requirement 11: Google Gemini API for Entity Extraction

**User Story:** As a developer, I want to use Google Gemini API for entity extraction, so that we have structured output capabilities and consistent Google Cloud integration.

#### Acceptance Criteria

1. WHEN entity extraction begins THEN the Voice Note System SHALL authenticate with Google Gemini API using API key
2. WHEN extracting entities THEN the Voice Note System SHALL use Gemini 2.5 Flash model for fast processing
3. WHEN calling the Gemini API THEN the Voice Note System SHALL provide a JSON schema defining the expected entity structure
4. WHEN the JSON schema is provided THEN the Voice Note System SHALL set responseMimeType to application/json
5. WHEN the JSON schema is provided THEN the Voice Note System SHALL define properties for contact fields, tags, groups, and lastContactDate
6. WHEN multiple contacts are detected THEN the Voice Note System SHALL request entity extraction for each contact separately
7. WHEN the Gemini API returns results THEN the Voice Note System SHALL parse the JSON response according to the defined schema
8. WHEN parsing fails THEN the Voice Note System SHALL return empty entities to allow manual entry fallback
9. WHEN entity extraction succeeds THEN the Voice Note System SHALL validate extracted data types match the schema


### Requirement 12: Browser Audio Capture

**User Story:** As a user, I want to record audio directly from my device microphone in the browser, so that I can create voice notes without installing additional software.

#### Acceptance Criteria

1. WHEN the recording interface loads THEN the Voice Note System SHALL check for browser MediaRecorder API support
2. WHEN the user clicks record THEN the Voice Note System SHALL request microphone access via getUserMedia API
3. WHEN microphone access is granted THEN the Voice Note System SHALL initialize MediaRecorder with appropriate audio constraints
4. WHEN recording starts THEN the Voice Note System SHALL capture audio in chunks suitable for streaming
5. WHEN audio chunks are available THEN the Voice Note System SHALL send them to the backend for transcription
6. WHEN the user clicks stop THEN the Voice Note System SHALL stop the MediaRecorder and finalize the audio stream
7. WHEN microphone access is denied THEN the Voice Note System SHALL display an error message with instructions
8. WHEN the browser doesn't support required APIs THEN the Voice Note System SHALL display a compatibility warning


### Requirement 13: Voice Note Persistence

**User Story:** As a user, I want my voice notes to be saved with all associated data, so that I can reference them later and maintain a history of captured context.

#### Acceptance Criteria

1. WHEN a voice note is created THEN the Voice Note System SHALL store the transcript text in the database
2. WHEN a voice note is created THEN the Voice Note System SHALL store the recording timestamp
3. WHEN contacts are associated THEN the Voice Note System SHALL store the contact IDs in a junction table
4. WHEN enrichment is extracted THEN the Voice Note System SHALL store the extracted entities as JSON
5. WHEN enrichment is applied THEN the Voice Note System SHALL update the voice note status to applied
6. WHEN enrichment items are accepted or rejected THEN the Voice Note System SHALL store the user's decisions
7. WHEN a user deletes a voice note THEN the Voice Note System SHALL remove the voice note and all associated data
8. WHEN querying voice notes THEN the Voice Note System SHALL support filtering by contact, date range, and status



### Requirement 14: Suggestions UI for Group Catchups

**User Story:** As a user, I want to see group suggestions clearly displayed in the suggestions feed, so that I can easily understand who is included and why they're suggested together.

#### Acceptance Criteria

1. WHEN displaying a group suggestion THEN the Suggestions UI SHALL show all contact names in the suggestion card
2. WHEN displaying a group suggestion THEN the Suggestions UI SHALL visually distinguish group suggestions from individual suggestions
3. WHEN displaying a group suggestion THEN the Suggestions UI SHALL show the shared context reasoning explaining why these contacts are grouped
4. WHEN displaying a group suggestion THEN the Suggestions UI SHALL show individual contact avatars or initials for each person
5. WHEN a user hovers over a contact in a group suggestion THEN the Suggestions UI SHALL display a tooltip with contact details
6. WHEN a user accepts a group suggestion THEN the Suggestions UI SHALL generate a draft message addressing all contacts
7. WHEN a user dismisses a group suggestion THEN the Suggestions UI SHALL provide options to dismiss for all contacts or remove individual contacts from the group
8. WHEN a user removes a contact from a group suggestion THEN the Suggestions UI SHALL update the suggestion to show remaining contacts
9. WHEN only one contact remains after removals THEN the Suggestions UI SHALL convert the suggestion to an individual suggestion
10. WHEN displaying the suggestion feed THEN the Suggestions UI SHALL intermix group and individual suggestions in priority order
