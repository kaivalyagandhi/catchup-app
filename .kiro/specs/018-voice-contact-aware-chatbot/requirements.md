# Requirements Document

## Introduction

This feature enhances the CatchUp chatbot to be context-aware of the user's contact data, enabling natural language queries about contacts while maintaining seamless integration with the existing contact edit workflow. Users can ask questions like "who are my friends in SF?" and then naturally transition to making edits like "add the 'tech' tag to Sarah". The feature works in both text chat and voice mode, supporting a conversational flow that combines querying and editing contacts.

## Glossary

- **Chatbot**: The conversational interface accessible via the floating chat icon that processes user queries
- **Contact Data**: User's stored contacts including names, locations, tags, groups, circles, last contact dates, and other metadata
- **Query**: A natural language question or request from the user about their contacts
- **Voice Mode**: Audio-based interaction where the user speaks queries and receives spoken responses
- **Text Mode**: Keyboard-based interaction through the chat window
- **Contact Query Engine**: The backend service that interprets natural language queries and retrieves matching contacts
- **Query Intent**: The parsed understanding of what the user is asking (e.g., filter by location, find by tag)
- **Query Response**: The formatted answer returned to the user containing relevant contact information
- **Edit Context**: The current set of contacts being discussed, which can be targeted for batch edits
- **Conversational Flow**: The ability to chain queries and edits naturally (e.g., query → review → edit)

## Requirements

### Requirement 1

**User Story:** As a user, I want to ask natural language questions about my contacts in the chat, so that I can quickly find information without manually searching.

#### Acceptance Criteria

1. WHEN a user types a contact-related query in the chat THEN the Chatbot SHALL interpret the query intent and return matching contacts
2. WHEN a user asks "who are my friends in [location]?" THEN the Chatbot SHALL return contacts that have the specified location in their profile
3. WHEN a user asks "who have I not talked to recently?" THEN the Chatbot SHALL return contacts sorted by last contact date (oldest first)
4. WHEN a user asks about contacts with specific tags THEN the Chatbot SHALL filter and return contacts matching those tags
5. WHEN no contacts match the query THEN the Chatbot SHALL respond with a helpful message indicating no matches were found

### Requirement 2

**User Story:** As a user, I want to use voice mode to ask questions about my contacts, so that I can get answers hands-free.

#### Acceptance Criteria

1. WHEN a user speaks a contact query in voice mode THEN the Chatbot SHALL transcribe, interpret, and respond with matching contacts
2. WHEN the Chatbot responds to a voice query THEN the Chatbot SHALL format the response for text-to-speech readability
3. WHEN voice transcription completes THEN the Chatbot SHALL process the query within 2 seconds
4. IF voice transcription fails THEN the Chatbot SHALL display an error message and suggest using text input

### Requirement 3

**User Story:** As a user, I want the chatbot to understand various ways I might phrase contact queries, so that I don't have to use specific keywords.

#### Acceptance Criteria

1. WHEN a user uses synonyms for contact attributes (e.g., "city" instead of "location") THEN the Chatbot SHALL correctly interpret the query
2. WHEN a user asks a follow-up question THEN the Chatbot SHALL maintain context from the previous query
3. WHEN a query is ambiguous THEN the Chatbot SHALL ask a clarifying question before returning results
4. WHEN a user references a group or circle by name THEN the Chatbot SHALL filter contacts by that group or circle

### Requirement 4

**User Story:** As a user, I want to see contact query results in a clear, organized format, so that I can quickly scan the information.

#### Acceptance Criteria

1. WHEN the Chatbot returns multiple contacts THEN the Chatbot SHALL display them in a formatted list with key details
2. WHEN displaying contact results THEN the Chatbot SHALL show name, relevant matching attribute, and last contact date
3. WHEN more than 10 contacts match THEN the Chatbot SHALL paginate results and offer to show more
4. WHEN a single contact matches THEN the Chatbot SHALL display detailed information about that contact

### Requirement 5

**User Story:** As a user, I want to perform edits on contacts returned by queries, so that I can efficiently update multiple contacts in a conversational flow.

#### Acceptance Criteria

1. WHEN viewing query results THEN the Chatbot SHALL maintain an edit context with the returned contacts
2. WHEN a user says "add [tag] to them" or "add [tag] to these contacts" THEN the Chatbot SHALL create pending edits for all contacts in the current edit context
3. WHEN a user says "move them to [group]" THEN the Chatbot SHALL create pending group assignment edits for contacts in context
4. WHEN creating batch edits THEN the Chatbot SHALL show a confirmation with the number of contacts affected before applying
5. WHEN a user says "update [field] to [value] for [contact name]" THEN the Chatbot SHALL create a pending edit for that specific contact

### Requirement 6

**User Story:** As a developer, I want the query engine to use efficient database queries, so that responses are fast even with large contact lists.

#### Acceptance Criteria

1. WHEN processing a contact query THEN the Contact Query Engine SHALL complete database operations within 500ms for up to 1000 contacts
2. WHEN building database queries THEN the Contact Query Engine SHALL use parameterized queries to prevent SQL injection
3. WHEN the query involves multiple filters THEN the Contact Query Engine SHALL combine them efficiently using indexed columns

### Requirement 7

**User Story:** As a user, I want the chatbot to understand time-based queries, so that I can find contacts based on interaction history.

#### Acceptance Criteria

1. WHEN a user asks "who haven't I contacted in [time period]?" THEN the Chatbot SHALL calculate the date threshold and filter contacts accordingly
2. WHEN a user asks "who did I talk to last week?" THEN the Chatbot SHALL return contacts with interactions in that time range
3. WHEN parsing time expressions THEN the Chatbot SHALL support formats like "2 weeks", "a month", "last Tuesday", "this year"

### Requirement 8

**User Story:** As a user, I want to combine multiple criteria in my queries, so that I can find specific subsets of contacts.

#### Acceptance Criteria

1. WHEN a user combines location and tag filters (e.g., "friends in NYC who like hiking") THEN the Chatbot SHALL apply all filters with AND logic
2. WHEN a user uses OR logic explicitly (e.g., "contacts in SF or LA") THEN the Chatbot SHALL return contacts matching either criterion
3. WHEN filters return no results THEN the Chatbot SHALL suggest relaxing criteria and show partial matches

### Requirement 9

**User Story:** As a user, I want the chatbot to seamlessly switch between query mode and edit mode, so that I can have a natural conversation about my contacts.

#### Acceptance Criteria

1. WHEN a user's message contains a query intent THEN the Chatbot SHALL respond with contact information
2. WHEN a user's message contains an edit intent THEN the Chatbot SHALL create pending edits and show them in the enrichment review panel
3. WHEN a user asks a query after making edits THEN the Chatbot SHALL clear the previous edit context and start fresh
4. WHEN a user references "them" or "these contacts" THEN the Chatbot SHALL use the contacts from the most recent query result

### Requirement 10

**User Story:** As a user, I want to see my pending edits from chat queries in the same review panel as voice note enrichments, so that I have a unified editing experience.

#### Acceptance Criteria

1. WHEN the Chatbot creates pending edits from a query THEN the Chatbot SHALL display them in the existing enrichment review panel
2. WHEN pending edits are created THEN the Chatbot SHALL tag them with source "chat_query" to distinguish from voice enrichments
3. WHEN the user approves or rejects edits THEN the Chatbot SHALL update its context to reflect the current state
