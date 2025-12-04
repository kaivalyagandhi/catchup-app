# Requirements Document

## Introduction

The SMS/MMS Enrichment feature enables users to send contact enrichment information to CatchUp via text messages, voice notes, images, and videos to a dedicated phone number. This feature leverages Twilio for message reception and Google Cloud AI services for content processing, providing a frictionless way to capture relationship context on-the-go.

## Glossary

- **CatchUp System**: The relationship management application
- **Enrichment Item**: A piece of information about a contact (tag, note, location, relationship context)
- **SMS**: Short Message Service - text-only messages up to 160 characters
- **MMS**: Multimedia Messaging Service - messages containing media (audio, images, videos)
- **Twilio Platform**: Third-party SMS/MMS gateway service
- **Webhook**: HTTP callback endpoint that receives real-time message notifications
- **Gemini API**: Google's multimodal AI service for content analysis
- **Speech-to-Text API**: Google's audio transcription service
- **User Phone Number**: The verified phone number associated with a user's CatchUp account
- **TwiML**: Twilio Markup Language for generating SMS responses

## Requirements

### Requirement 1

**User Story:** As a user, I want to link my phone number to my CatchUp account, so that I can send enrichment messages from my phone.

#### Acceptance Criteria

1. WHEN a user provides their phone number THEN the CatchUp System SHALL send a verification code via SMS
2. WHEN a user enters a valid verification code THEN the CatchUp System SHALL link the phone number to their account
3. WHEN a user enters an invalid verification code THEN the CatchUp System SHALL reject the verification and maintain the unverified state
4. WHEN a verification code expires after 10 minutes THEN the CatchUp System SHALL require the user to request a new code
5. WHEN a user unlinks their phone number THEN the CatchUp System SHALL remove the association and stop processing messages from that number

### Requirement 2

**User Story:** As a user, I want to send text messages about contacts to CatchUp, so that I can quickly capture information while on-the-go.

#### Acceptance Criteria

1. WHEN a user sends an SMS to the CatchUp phone number THEN the CatchUp System SHALL receive the message via Twilio webhook
2. WHEN the Twilio Platform delivers a webhook request THEN the CatchUp System SHALL validate the Twilio signature before processing
3. WHEN a verified user sends a text message THEN the CatchUp System SHALL extract contact names, tags, and notes using Gemini API
4. WHEN the CatchUp System processes a text message THEN the CatchUp System SHALL store extracted enrichments with source type "sms"
5. WHEN the CatchUp System completes processing THEN the CatchUp System SHALL send a confirmation message to the user within 5 seconds

### Requirement 3

**User Story:** As a user, I want to send voice notes about contacts to CatchUp, so that I can capture detailed information hands-free while driving or walking.

#### Acceptance Criteria

1. WHEN a user sends an audio MMS to the CatchUp phone number THEN the CatchUp System SHALL download the audio file from Twilio
2. WHEN the CatchUp System receives an audio file THEN the CatchUp System SHALL transcribe it using Speech-to-Text API
3. WHEN transcription completes THEN the CatchUp System SHALL extract enrichments from the transcript using Gemini API
4. WHEN the CatchUp System processes a voice note THEN the CatchUp System SHALL store extracted enrichments with source type "mms" and media type "audio"
5. WHEN audio transcription fails THEN the CatchUp System SHALL log the error and notify the user of processing failure

### Requirement 4

**User Story:** As a user, I want to send photos of business cards to CatchUp, so that I can quickly capture contact information from networking events.

#### Acceptance Criteria

1. WHEN a user sends an image MMS to the CatchUp phone number THEN the CatchUp System SHALL download the image file from Twilio
2. WHEN the CatchUp System receives an image file THEN the CatchUp System SHALL analyze it using Gemini Vision API
3. WHEN the image contains text THEN the CatchUp System SHALL extract text using OCR capabilities
4. WHEN the CatchUp System processes an image THEN the CatchUp System SHALL store extracted enrichments with source type "mms" and media type "image"
5. WHEN the image size exceeds 5MB THEN the CatchUp System SHALL reject the message and notify the user of the size limit

### Requirement 5

**User Story:** As a user, I want to send videos from events to CatchUp, so that I can capture rich context about group gatherings and social interactions.

#### Acceptance Criteria

1. WHEN a user sends a video MMS to the CatchUp phone number THEN the CatchUp System SHALL download the video file from Twilio
2. WHEN the CatchUp System receives a video file THEN the CatchUp System SHALL analyze it using Gemini multimodal API
3. WHEN the CatchUp System processes a video THEN the CatchUp System SHALL extract both visual and audio context
4. WHEN the CatchUp System processes a video THEN the CatchUp System SHALL store extracted enrichments with source type "mms" and media type "video"
5. WHEN the video size exceeds 5MB THEN the CatchUp System SHALL reject the message and notify the user of the size limit

### Requirement 6

**User Story:** As a user, I want to review enrichments extracted from my messages, so that I can approve, edit, or reject them before they update my contacts.

#### Acceptance Criteria

1. WHEN the CatchUp System extracts enrichments THEN the CatchUp System SHALL store them with status "pending"
2. WHEN a user views the web application THEN the CatchUp System SHALL display all pending enrichments with their source information
3. WHEN a user approves an enrichment THEN the CatchUp System SHALL update the status to "approved" and apply it to the contact
4. WHEN a user edits an enrichment THEN the CatchUp System SHALL save the modified content before applying it
5. WHEN a user rejects an enrichment THEN the CatchUp System SHALL update the status to "rejected" and exclude it from contact updates

### Requirement 7

**User Story:** As a system administrator, I want webhook requests to be authenticated, so that only legitimate Twilio messages are processed.

#### Acceptance Criteria

1. WHEN the CatchUp System receives a webhook request THEN the CatchUp System SHALL validate the X-Twilio-Signature header
2. WHEN the signature validation fails THEN the CatchUp System SHALL reject the request with HTTP 403 status
3. WHEN the signature validation succeeds THEN the CatchUp System SHALL proceed with message processing
4. WHEN the CatchUp System validates signatures THEN the CatchUp System SHALL use the Twilio auth token and request URL
5. WHEN an unauthorized request is detected THEN the CatchUp System SHALL log the security event for audit purposes

### Requirement 8

**User Story:** As a user, I want rate limiting on my message processing, so that accidental spam or abuse doesn't overwhelm the system or incur excessive costs.

#### Acceptance Criteria

1. WHEN a user sends messages THEN the CatchUp System SHALL limit processing to 20 messages per hour per phone number
2. WHEN the rate limit is exceeded THEN the CatchUp System SHALL reject additional messages until the time window resets
3. WHEN a message is rate limited THEN the CatchUp System SHALL send a notification explaining the limit
4. WHEN the time window resets THEN the CatchUp System SHALL resume normal message processing
5. WHEN rate limit counters are stored THEN the CatchUp System SHALL use Redis or in-memory cache with automatic expiration

### Requirement 9

**User Story:** As a developer, I want comprehensive error handling for message processing, so that failures are logged and users receive helpful feedback.

#### Acceptance Criteria

1. WHEN message processing fails THEN the CatchUp System SHALL log the error with context including user ID, message type, and error details
2. WHEN a recoverable error occurs THEN the CatchUp System SHALL retry processing up to 3 times with exponential backoff
3. WHEN all retries fail THEN the CatchUp System SHALL notify the user of the processing failure
4. WHEN an unrecoverable error occurs THEN the CatchUp System SHALL immediately notify the user without retrying
5. WHEN errors are logged THEN the CatchUp System SHALL include sufficient information for debugging without exposing sensitive data

### Requirement 10

**User Story:** As a user, I want my phone number and message content to be stored securely, so that my privacy is protected.

#### Acceptance Criteria

1. WHEN phone numbers are stored THEN the CatchUp System SHALL encrypt them at rest using AES-256 encryption
2. WHEN media files are downloaded THEN the CatchUp System SHALL store them temporarily and delete them after processing
3. WHEN enrichments are stored THEN the CatchUp System SHALL retain only extracted metadata, not original media files
4. WHEN 30 days have passed since processing THEN the CatchUp System SHALL permanently delete any remaining temporary media files
5. WHEN a user deletes their account THEN the CatchUp System SHALL remove all associated phone numbers and enrichment data
