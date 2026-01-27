# Unimplemented Features & TODOs

This document tracks all unimplemented features and TODO comments found in the CatchUp codebase. Features are categorized by priority to help guide future development work.

**Last Updated**: January 2025

---

## 🔴 High Priority (Core Functionality)

These features affect core user experience and should be prioritized for implementation.

### 1. Timezone Preferences

**Impact**: Users in different timezones see incorrect times for availability and calendar events.

| File | Line | Description |
|------|------|-------------|
| `src/calendar/availability-service.ts` | 197 | Use user's timezone instead of hardcoded UTC |
| `src/calendar/calendar-service.ts` | 426 | Get timezone from user preferences |
| `src/calendar/calendar-event-generator.ts` | 169 | Use user's timezone preference |

**Current Behavior**: All times are displayed in UTC regardless of user location.

**Desired Behavior**: 
- Store user's timezone preference in user settings
- Convert all calendar times to user's local timezone
- Display times in user's preferred timezone throughout the app

**Implementation Notes**:
- Add `timezone` field to user preferences table
- Implement timezone selection UI in settings
- Update all calendar-related services to use user timezone
- Consider using libraries like `date-fns-tz` or `luxon` for timezone handling

---

### 2. Contact Preview Functionality

**Impact**: Users cannot preview contact archival/import changes before applying them.

| File | Line | Description |
|------|------|-------------|
| `src/contacts/setup-flow-service.ts` | 128 | Implement preview functionality for contact operations |

**Current Behavior**: Preview functionality is stubbed out and returns empty array.

**Desired Behavior**:
- Show users which contacts will be affected by archival/import operations
- Display contact details (name, email, phone) in preview
- Allow users to review and confirm before applying changes
- Provide summary statistics (e.g., "5 contacts will be archived")

**Implementation Notes**:
- The `previewContactArchival` method exists but needs implementation
- Should return array of contacts that match archival criteria
- Consider pagination for large contact lists
- Add UI component to display preview results

---

### 3. Contact Archival Functionality

**Impact**: Users cannot archive contacts they no longer want to track.

| File | Line | Description |
|------|------|-------------|
| `src/contacts/setup-flow-service.ts` | 149 | Implement archival functionality for contacts |

**Current Behavior**: Archival functionality is stubbed out and only logs selections.

**Desired Behavior**:
- Archive contacts based on user selections
- Move archived contacts to separate table or mark with `archived` flag
- Exclude archived contacts from main directory view
- Provide "View Archived Contacts" option
- Allow users to restore archived contacts

**Implementation Notes**:
- The `applyContactArchival` method exists but needs implementation
- Consider adding `archived_at` timestamp field
- Update queries to filter out archived contacts by default
- Add UI for managing archived contacts
- Consider soft delete vs. hard delete approach

---

## 🟡 Medium Priority (Enhancements)

These features would improve performance and user experience but are not critical.

### 4. Calendar Feed Cache Invalidation

**Impact**: Calendar feeds may show stale data until cache expires naturally.

| File | Line | Description |
|------|------|-------------|
| `src/calendar/feed-service.ts` | 254 | Implement cache invalidation when caching is added |

**Current Behavior**: No caching implemented yet, but TODO exists for future implementation.

**Desired Behavior**:
- Invalidate calendar feed cache when relevant data changes
- Trigger cache refresh when:
  - User updates availability preferences
  - New suggestions are generated
  - Calendar events are added/modified
  - User disconnects/reconnects calendar

**Implementation Notes**:
- First implement caching layer (Redis or in-memory)
- Add cache invalidation hooks to relevant services
- Consider cache TTL strategy (e.g., 5-15 minutes)
- Monitor cache hit rates and adjust strategy

---

### 5. Webhook Notifications for Real-Time Updates

**Impact**: Users must manually refresh to see calendar feed updates.

| File | Line | Description |
|------|------|-------------|
| `src/calendar/feed-service.ts` | 255 | Implement webhook notifications for real-time updates |

**Current Behavior**: Calendar feeds are static until user refreshes.

**Desired Behavior**:
- Send webhook notifications when calendar feed changes
- Support webhook subscriptions for calendar clients
- Notify subscribers of new suggestions or availability changes
- Follow iCalendar webhook standards (if applicable)

**Implementation Notes**:
- Research iCalendar webhook/push notification standards
- Implement webhook registration endpoint
- Add webhook delivery queue (consider using job queue)
- Handle webhook failures and retries
- Provide webhook management UI for users

---

### 6. Add Suggestions to Calendar Feed

**Impact**: Users cannot subscribe to suggestions via calendar feed.

| File | Line | Description |
|------|------|-------------|
| `src/matching/suggestion-service.ts` | 466 | Add generated suggestions to calendar feed |

**Current Behavior**: Suggestions are generated but not added to calendar feed.

**Desired Behavior**:
- Include AI-generated suggestions in user's calendar feed
- Display suggestions as tentative events
- Allow users to accept/decline suggestions from calendar
- Update suggestion status when calendar event is modified

**Implementation Notes**:
- Integrate with `feed-service.ts` to add suggestions
- Format suggestions as iCalendar events
- Mark suggestions with special category or status
- Handle suggestion acceptance/rejection via calendar

---

### 7. Frequency Preference Prompts

**Impact**: Users without frequency preferences may not get optimal suggestions.

| File | Line | Description |
|------|------|-------------|
| `src/matching/suggestion-service.ts` | 531 | Prompt for frequency preference if not set |

**Current Behavior**: System continues without prompting if frequency preference is missing.

**Desired Behavior**:
- Detect when user hasn't set frequency preferences for contacts
- Prompt user to set preferences during suggestion generation
- Provide smart defaults based on contact circle/relationship
- Allow bulk preference setting for multiple contacts

**Implementation Notes**:
- Add API flag to indicate missing preferences
- Create UI prompt/modal for setting preferences
- Consider onboarding flow to set initial preferences
- Track which contacts need preference updates

---

## 🟢 Low Priority (Testing & Infrastructure)

These items improve code quality and testing but don't affect end users directly.

### 8. Calendar Service Integration Tests

**Impact**: Limited test coverage for Google Calendar API integration.

| File | Line | Description |
|------|------|-------------|
| `src/calendar/calendar-service.test.ts` | 348 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 353 | Add integration test for free slot identification |
| `src/calendar/calendar-service.test.ts` | 358 | Add integration test for minimum slot duration |
| `src/calendar/calendar-service.test.ts` | 363 | Add integration test for overlapping events |
| `src/calendar/calendar-service.test.ts` | 368 | Add integration test for all-day event filtering |
| `src/calendar/calendar-service.test.ts` | 375 | Add integration test for calendar sync |
| `src/calendar/calendar-service.test.ts` | 387 | Add integration test for selected calendars |
| `src/calendar/calendar-service.test.ts` | 392 | Add integration test for availability prediction refresh |

**Current Behavior**: Test stubs exist but integration tests are not implemented.

**Desired Behavior**:
- Comprehensive integration tests for all calendar operations
- Mock Google Calendar API responses
- Test error handling and edge cases
- Verify calendar sync behavior
- Test availability calculation logic

**Implementation Notes**:
- Use test fixtures for Google Calendar API responses
- Consider using `nock` or similar for HTTP mocking
- Test both success and failure scenarios
- Add tests to CI/CD pipeline
- Document test setup and requirements

---

## 📊 Summary Statistics

- **Total TODOs**: 17
- **High Priority**: 5 (29%)
- **Medium Priority**: 4 (24%)
- **Low Priority**: 8 (47%)

---

## 🎯 Recommended Implementation Order

Based on user impact and dependencies:

1. **Timezone Preferences** (High) - Affects all calendar features
2. **Contact Preview & Archival** (High) - Core contact management features
3. **Calendar Feed Cache** (Medium) - Foundation for real-time updates
4. **Add Suggestions to Feed** (Medium) - Enhances core matching feature
5. **Webhook Notifications** (Medium) - Enables real-time experience
6. **Frequency Preference Prompts** (Medium) - Improves suggestion quality
7. **Integration Tests** (Low) - Improves code quality and reliability

---

## 📝 Contributing

When implementing features from this list:

1. Update this document to mark the feature as "In Progress" or "Completed"
2. Create a feature spec in `.kiro/specs/` for complex features
3. Add tests for new functionality
4. Update relevant user documentation
5. Remove the TODO comment from the source code
6. Link the PR/commit that implements the feature

---

## 🔗 Related Documentation

- [API Documentation](../API.md)
- [Development Quick Start](QUICK_START.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)
- [Feature Specifications](.kiro/specs/)
