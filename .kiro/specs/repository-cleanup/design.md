# Repository Cleanup Design

## Overview
This document outlines the technical approach for cleaning up and reorganizing the CatchUp repository.

## File Inventory

### Backend Example Files to Move (25 files)
**Source:** `src/` → **Destination:** `docs/examples/backend/`

| Current Location | New Location |
|-----------------|--------------|
| `src/api/google-sso-example.ts` | `docs/examples/backend/api/google-sso-example.ts` |
| `src/api/google-sso-auth-example.ts` | `docs/examples/backend/api/google-sso-auth-example.ts` |
| `src/api/google-sso-error-handler-example.ts` | `docs/examples/backend/api/google-sso-error-handler-example.ts` |
| `src/api/oauth-state-manager-example.ts` | `docs/examples/backend/api/oauth-state-manager-example.ts` |
| `src/api/routes/auth-statistics-example.ts` | `docs/examples/backend/api/routes/auth-statistics-example.ts` |
| `src/api/routes/contacts-secured-example.ts` | `docs/examples/backend/api/routes/contacts-secured-example.ts` |
| `src/calendar/example-usage.ts` | `docs/examples/backend/calendar/example-usage.ts` |
| `src/calendar/feed-api-example.ts` | `docs/examples/backend/calendar/feed-api-example.ts` |
| `src/contacts/account-example.ts` | `docs/examples/backend/contacts/account-example.ts` |
| `src/contacts/error-handling-demo.ts` | `docs/examples/backend/contacts/error-handling-demo.ts` |
| `src/contacts/onboarding-example.ts` | `docs/examples/backend/contacts/onboarding-example.ts` |
| `src/contacts/onboarding-state-manager-example.ts` | `docs/examples/backend/contacts/onboarding-state-manager-example.ts` |
| `src/integrations/sync-service-example.ts` | `docs/examples/backend/integrations/sync-service-example.ts` |
| `src/integrations/token-refresh-example.ts` | `docs/examples/backend/integrations/token-refresh-example.ts` |
| `src/jobs/example-usage.ts` | `docs/examples/backend/jobs/example-usage.ts` |
| `src/matching/example-usage.ts` | `docs/examples/backend/matching/example-usage.ts` |
| `src/matching/group-matching-example.ts` | `docs/examples/backend/matching/group-matching-example.ts` |
| `src/sms/ai-processor-example.ts` | `docs/examples/backend/sms/ai-processor-example.ts` |
| `src/sms/error-handling-example.ts` | `docs/examples/backend/sms/error-handling-example.ts` |
| `src/sms/media-downloader-example.ts` | `docs/examples/backend/sms/media-downloader-example.ts` |
| `src/sms/message-processor-example.ts` | `docs/examples/backend/sms/message-processor-example.ts` |
| `src/sms/twiml-generator-example.ts` | `docs/examples/backend/sms/twiml-generator-example.ts` |
| `src/voice/contact-disambiguation-example.ts` | `docs/examples/backend/voice/contact-disambiguation-example.ts` |
| `src/voice/enrichment-example.ts` | `docs/examples/backend/voice/enrichment-example.ts` |
| `src/voice/entity-extraction-example.ts` | `docs/examples/backend/voice/entity-extraction-example.ts` |
| `src/voice/transcription-example.ts` | `docs/examples/backend/voice/transcription-example.ts` |
| `src/voice/websocket-example.ts` | `docs/examples/backend/voice/websocket-example.ts` |
| `src/voice/example-usage.ts` | `docs/examples/backend/voice/example-usage.ts` |

### Frontend Example Files to Move (10 files)
**Source:** `public/js/` → **Destination:** `docs/examples/frontend/`

| Current Location | New Location |
|-----------------|--------------|
| `public/js/ai-suggestion-integration-example.js` | `docs/examples/frontend/ai-suggestion-integration-example.js` |
| `public/js/contact-pruning-integration-example.js` | `docs/examples/frontend/contact-pruning-integration-example.js` |
| `public/js/educational-features-integration-example.js` | `docs/examples/frontend/educational-features-integration-example.js` |
| `public/js/enrichment-review-integration-example.js` | `docs/examples/frontend/enrichment-review-integration-example.js` |
| `public/js/gamification-integration-example.js` | `docs/examples/frontend/gamification-integration-example.js` |
| `public/js/manage-circles-flow-integration-example.js` | `docs/examples/frontend/manage-circles-flow-integration-example.js` |
| `public/js/mobile-responsive-integration-example.js` | `docs/examples/frontend/mobile-responsive-integration-example.js` |
| `public/js/onboarding-integration-example.js` | `docs/examples/frontend/onboarding-integration-example.js` |
| `public/js/preference-setting-integration-example.js` | `docs/examples/frontend/preference-setting-integration-example.js` |
| `public/js/uncategorized-tracker-integration-example.js` | `docs/examples/frontend/uncategorized-tracker-integration-example.js` |
| `public/js/weekly-catchup-integration-example.js` | `docs/examples/frontend/weekly-catchup-integration-example.js` |

### Test HTML Files to Move (36 files)
**Source:** `public/js/` and `public/` → **Destination:** `tests/html/`

| Current Location | New Location |
|-----------------|--------------|
| `public/js/accessibility-enhancements.test.html` | `tests/html/accessibility-enhancements.test.html` |
| `public/js/ai-suggestion-ui.test.html` | `tests/html/ai-suggestion-ui.test.html` |
| `public/js/archived-contacts-manager.test.html` | `tests/html/archived-contacts-manager.test.html` |
| `public/js/audio-manager.test.html` | `tests/html/audio-manager.test.html` |
| `public/js/circular-visualizer.test.html` | `tests/html/circular-visualizer.test.html` |
| `public/js/circular-visualizer-drag-test.html` | `tests/html/circular-visualizer-drag-test.html` |
| `public/js/circular-visualizer-group-filter.test.html` | `tests/html/circular-visualizer-group-filter.test.html` |
| `public/js/circular-visualizer-v2.test.html` | `tests/html/circular-visualizer-v2.test.html` |
| `public/js/contact-selector.test.html` | `tests/html/contact-selector.test.html` |
| `public/js/educational-features.test.html` | `tests/html/educational-features.test.html` |
| `public/js/enrichment-panel.test.html` | `tests/html/enrichment-panel.test.html` |
| `public/js/enrichment-review.test.html` | `tests/html/enrichment-review.test.html` |
| `public/js/gamification-ui.test.html` | `tests/html/gamification-ui.test.html` |
| `public/js/google-contacts.test.html` | `tests/html/google-contacts.test.html` |
| `public/js/google-sso.test.html` | `tests/html/google-sso.test.html` |
| `public/js/google-sso-test-mode.test.html` | `tests/html/google-sso-test-mode.test.html` |
| `public/js/manage-circles-flow.test.html` | `tests/html/manage-circles-flow.test.html` |
| `public/js/mobile-responsive.test.html` | `tests/html/mobile-responsive.test.html` |
| `public/js/onboarding-animations-test.html` | `tests/html/onboarding-animations-test.html` |
| `public/js/onboarding-controller.test.html` | `tests/html/onboarding-controller.test.html` |
| `public/js/onboarding-responsive-test.html` | `tests/html/onboarding-responsive-test.html` |
| `public/js/onboarding-step-indicator.test.html` | `tests/html/onboarding-step-indicator.test.html` |
| `public/js/onboarding-theme-test.html` | `tests/html/onboarding-theme-test.html` |
| `public/js/preference-setting-ui.test.html` | `tests/html/preference-setting-ui.test.html` |
| `public/js/privacy-features.test.html` | `tests/html/privacy-features.test.html` |
| `public/js/recording-indicator.test.html` | `tests/html/recording-indicator.test.html` |
| `public/js/recording-indicator-controls.test.html` | `tests/html/recording-indicator-controls.test.html` |
| `public/js/step1-integrations-handler.test.html` | `tests/html/step1-integrations-handler.test.html` |
| `public/js/step2-circles-handler.test.html` | `tests/html/step2-circles-handler.test.html` |
| `public/js/step3-group-mapping-handler.test.html` | `tests/html/step3-group-mapping-handler.test.html` |
| `public/js/theme-manager.test.html` | `tests/html/theme-manager.test.html` |
| `public/js/theme-toggle.test.html` | `tests/html/theme-toggle.test.html` |
| `public/js/transcript-manager.test.html` | `tests/html/transcript-manager.test.html` |
| `public/js/uncategorized-tracker.test.html` | `tests/html/uncategorized-tracker.test.html` |
| `public/js/voice-notes-history.test.html` | `tests/html/voice-notes-history.test.html` |
| `public/js/voice-notes-integration.test.html` | `tests/html/voice-notes-integration.test.html` |
| `public/js/weekly-catchup.test.html` | `tests/html/weekly-catchup.test.html` |
| `public/sms-monitoring-dashboard.html` | `tests/html/dashboards/sms-monitoring-dashboard.html` |
| `public/test-dashboard.html` | `tests/html/dashboards/test-dashboard.html` |
| `public/twilio-testing.html` | `tests/html/dashboards/twilio-testing.html` |

### Files to Delete (2 files)
| File | Reason |
|------|--------|
| `public/js/circular-visualizer-v1-backup.js` | Migration to v2 complete (documented in CIRCULAR_VISUALIZER_V2_MIGRATION.md) |
| `public/index.html.backup` | Obsolete backup file |

## TODO Inventory

### High Priority (Core Functionality)
| File | Line | Description |
|------|------|-------------|
| `src/contacts/setup-flow-service.ts` | 128 | Implement preview functionality |
| `src/contacts/setup-flow-service.ts` | 149 | Implement archival functionality |
| `src/calendar/availability-service.ts` | 197 | Use user's timezone (hardcoded UTC) |
| `src/calendar/calendar-service.ts` | 426 | Get timezone from user preferences |
| `src/calendar/calendar-event-generator.ts` | 169 | Use user's timezone preference |

### Medium Priority (Enhancements)
| File | Line | Description |
|------|------|-------------|
| `src/calendar/feed-service.ts` | 254 | Implement cache invalidation |
| `src/calendar/feed-service.ts` | 255 | Implement webhook notifications for real-time updates |
| `src/matching/suggestion-service.ts` | 466 | Add to calendar feed |
| `src/matching/suggestion-service.ts` | 531 | Prompt for frequency preference if not set |

### Low Priority (Testing)
| File | Line | Description |
|------|------|-------------|
| `src/calendar/calendar-service.test.ts` | 348 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 353 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 358 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 363 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 368 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 375 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 387 | Add integration test with mocked Google Calendar API |
| `src/calendar/calendar-service.test.ts` | 392 | Add integration test with mocked Google Calendar API |

## Steering Documentation Recommendations

### New Steering Files to Create

#### 1. `testing-guide.md`
Content to include:
- Testing conventions (vitest for unit tests, fast-check for property tests)
- Manual testing with HTML test files in `tests/html/`
- Test file naming conventions
- Property-based testing patterns used in the project

#### 2. `voice-notes-architecture.md`
Content to include:
- Voice note processing pipeline (AudioManager → TranscriptManager → EnrichmentPanel)
- WebSocket streaming architecture
- Google Speech-to-Text integration patterns
- Entity extraction with Gemini API

#### 3. `google-integrations.md`
Content to include:
- Google SSO authentication flow
- Google Calendar OAuth patterns
- Google Contacts sync architecture
- Token refresh and error handling patterns

### Existing Steering Files to Update

#### `documentation-index.md`
- Add reference to `docs/examples/` directory
- Add reference to `tests/html/` directory
- Add reference to `UNIMPLEMENTED_FEATURES.md`

## Directory Structure After Cleanup

```
catchup-app/
├── .kiro/
│   ├── specs/           # Feature specifications (unchanged)
│   └── steering/        # Steering docs (3 new files added)
├── docs/
│   ├── examples/        # NEW: Example code
│   │   ├── backend/     # TypeScript examples
│   │   ├── frontend/    # JavaScript examples
│   │   └── README.md    # Examples documentation
│   ├── development/
│   │   └── UNIMPLEMENTED_FEATURES.md  # NEW: TODO tracking
│   └── ...              # Existing docs (unchanged)
├── public/
│   ├── js/              # Production JS only (examples/tests removed)
│   └── css/             # Unchanged
├── src/                 # Production code only (examples removed)
├── tests/
│   ├── html/            # NEW: Manual test HTML files
│   │   ├── dashboards/  # Dashboard HTML files
│   │   └── README.md    # Testing documentation
│   └── integration/     # Existing integration tests
└── ...
```

## Validation Approach

1. **TypeScript Compilation**: Run `npm run typecheck` to ensure no compilation errors
2. **Test Suite**: Run `npm test` to ensure all tests pass
3. **Lint Check**: Run `npm run lint` to ensure code quality
4. **Manual Verification**: Spot-check moved files are accessible
