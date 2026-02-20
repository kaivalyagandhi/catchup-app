# Implementation Plan

## Phase 1: Create Directory Structure

- [x] 1. Create new directories for reorganization
  - [x] 1.1 Create `docs/examples/` directory structure
    - Create `docs/examples/backend/api/`, `docs/examples/backend/api/routes/`
    - Create `docs/examples/backend/calendar/`, `docs/examples/backend/contacts/`
    - Create `docs/examples/backend/integrations/`, `docs/examples/backend/jobs/`
    - Create `docs/examples/backend/matching/`, `docs/examples/backend/sms/`
    - Create `docs/examples/backend/voice/`
    - Create `docs/examples/frontend/`
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Create `tests/html/dashboards/` directory structure
    - _Requirements: 2.1, 2.2_

## Phase 2: Move Backend Example Files

- [x] 2. Move API example files
  - [x] 2.1 Move `src/api/google-sso-example.ts` to `docs/examples/backend/api/`
  - [x] 2.2 Move `src/api/google-sso-auth-example.ts` to `docs/examples/backend/api/`
  - [x] 2.3 Move `src/api/google-sso-error-handler-example.ts` to `docs/examples/backend/api/`
  - [x] 2.4 Move `src/api/oauth-state-manager-example.ts` to `docs/examples/backend/api/`
  - [x] 2.5 Move `src/api/routes/auth-statistics-example.ts` to `docs/examples/backend/api/routes/`
  - [x] 2.6 Move `src/api/routes/contacts-secured-example.ts` to `docs/examples/backend/api/routes/`
    - _Requirements: 1.1_

- [x] 3. Move calendar and contacts example files
  - [x] 3.1 Move `src/calendar/example-usage.ts` to `docs/examples/backend/calendar/`
  - [x] 3.2 Move `src/calendar/feed-api-example.ts` to `docs/examples/backend/calendar/`
  - [x] 3.3 Move `src/contacts/account-example.ts` to `docs/examples/backend/contacts/`
  - [x] 3.4 Move `src/contacts/error-handling-demo.ts` to `docs/examples/backend/contacts/`
  - [x] 3.5 Move `src/contacts/onboarding-example.ts` to `docs/examples/backend/contacts/`
  - [x] 3.6 Move `src/contacts/onboarding-state-manager-example.ts` to `docs/examples/backend/contacts/`
    - _Requirements: 1.1_

- [x] 4. Move integrations, jobs, and matching example files
  - [x] 4.1 Move `src/integrations/sync-service-example.ts` to `docs/examples/backend/integrations/`
  - [x] 4.2 Move `src/integrations/token-refresh-example.ts` to `docs/examples/backend/integrations/`
  - [x] 4.3 Move `src/jobs/example-usage.ts` to `docs/examples/backend/jobs/`
  - [x] 4.4 Move `src/matching/example-usage.ts` to `docs/examples/backend/matching/`
  - [x] 4.5 Move `src/matching/group-matching-example.ts` to `docs/examples/backend/matching/`
    - _Requirements: 1.1_

- [x] 5. Move SMS example files
  - [x] 5.1 Move `src/sms/ai-processor-example.ts` to `docs/examples/backend/sms/`
  - [x] 5.2 Move `src/sms/error-handling-example.ts` to `docs/examples/backend/sms/`
  - [x] 5.3 Move `src/sms/media-downloader-example.ts` to `docs/examples/backend/sms/`
  - [x] 5.4 Move `src/sms/message-processor-example.ts` to `docs/examples/backend/sms/`
  - [x] 5.5 Move `src/sms/twiml-generator-example.ts` to `docs/examples/backend/sms/`
    - _Requirements: 1.1_

- [x] 6. Move voice example files
  - [x] 6.1 Move `src/voice/contact-disambiguation-example.ts` to `docs/examples/backend/voice/`
  - [x] 6.2 Move `src/voice/enrichment-example.ts` to `docs/examples/backend/voice/`
  - [x] 6.3 Move `src/voice/entity-extraction-example.ts` to `docs/examples/backend/voice/`
  - [x] 6.4 Move `src/voice/transcription-example.ts` to `docs/examples/backend/voice/`
  - [x] 6.5 Move `src/voice/websocket-example.ts` to `docs/examples/backend/voice/`
  - [x] 6.6 Move `src/voice/example-usage.ts` to `docs/examples/backend/voice/`
    - _Requirements: 1.1_

## Phase 3: Move Frontend Example Files

- [x] 7. Move frontend integration example files
  - [x] 7.1 Move `public/js/ai-suggestion-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.2 Move `public/js/contact-pruning-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.3 Move `public/js/educational-features-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.4 Move `public/js/enrichment-review-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.5 Move `public/js/gamification-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.6 Move `public/js/manage-circles-flow-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.7 Move `public/js/mobile-responsive-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.8 Move `public/js/onboarding-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.9 Move `public/js/preference-setting-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.10 Move `public/js/uncategorized-tracker-integration-example.js` to `docs/examples/frontend/`
  - [x] 7.11 Move `public/js/weekly-catchup-integration-example.js` to `docs/examples/frontend/`
    - _Requirements: 1.2_

## Phase 4: Move Test HTML Files

- [x] 8. Move component test HTML files (batch 1)
  - [x] 8.1 Move `public/js/accessibility-enhancements.test.html` to `tests/html/`
  - [x] 8.2 Move `public/js/ai-suggestion-ui.test.html` to `tests/html/`
  - [x] 8.3 Move `public/js/archived-contacts-manager.test.html` to `tests/html/`
  - [x] 8.4 Move `public/js/audio-manager.test.html` to `tests/html/`
  - [x] 8.5 Move `public/js/circular-visualizer.test.html` to `tests/html/`
  - [x] 8.6 Move `public/js/circular-visualizer-drag-test.html` to `tests/html/`
  - [x] 8.7 Move `public/js/circular-visualizer-group-filter.test.html` to `tests/html/`
  - [x] 8.8 Move `public/js/circular-visualizer-v2.test.html` to `tests/html/`
  - [x] 8.9 Move `public/js/contact-selector.test.html` to `tests/html/`
  - [x] 8.10 Move `public/js/educational-features.test.html` to `tests/html/`
    - _Requirements: 2.1_

- [x] 9. Move component test HTML files (batch 2)
  - [x] 9.1 Move `public/js/enrichment-panel.test.html` to `tests/html/`
  - [x] 9.2 Move `public/js/enrichment-review.test.html` to `tests/html/`
  - [x] 9.3 Move `public/js/gamification-ui.test.html` to `tests/html/`
  - [x] 9.4 Move `public/js/google-contacts.test.html` to `tests/html/`
  - [x] 9.5 Move `public/js/google-sso.test.html` to `tests/html/`
  - [x] 9.6 Move `public/js/google-sso-test-mode.test.html` to `tests/html/`
  - [x] 9.7 Move `public/js/manage-circles-flow.test.html` to `tests/html/`
  - [x] 9.8 Move `public/js/mobile-responsive.test.html` to `tests/html/`
  - [x] 9.9 Move `public/js/onboarding-animations-test.html` to `tests/html/`
  - [x] 9.10 Move `public/js/onboarding-controller.test.html` to `tests/html/`
    - _Requirements: 2.1_

- [x] 10. Move component test HTML files (batch 3)
  - [x] 10.1 Move `public/js/onboarding-responsive-test.html` to `tests/html/`
  - [x] 10.2 Move `public/js/onboarding-step-indicator.test.html` to `tests/html/`
  - [x] 10.3 Move `public/js/onboarding-theme-test.html` to `tests/html/`
  - [x] 10.4 Move `public/js/preference-setting-ui.test.html` to `tests/html/`
  - [x] 10.5 Move `public/js/privacy-features.test.html` to `tests/html/`
  - [x] 10.6 Move `public/js/recording-indicator.test.html` to `tests/html/`
  - [x] 10.7 Move `public/js/recording-indicator-controls.test.html` to `tests/html/`
  - [x] 10.8 Move `public/js/step1-integrations-handler.test.html` to `tests/html/`
  - [x] 10.9 Move `public/js/step2-circles-handler.test.html` to `tests/html/`
  - [x] 10.10 Move `public/js/step3-group-mapping-handler.test.html` to `tests/html/`
    - _Requirements: 2.1_

- [x] 11. Move component test HTML files (batch 4)
  - [x] 11.1 Move `public/js/theme-manager.test.html` to `tests/html/`
  - [x] 11.2 Move `public/js/theme-toggle.test.html` to `tests/html/`
  - [x] 11.3 Move `public/js/transcript-manager.test.html` to `tests/html/`
  - [x] 11.4 Move `public/js/uncategorized-tracker.test.html` to `tests/html/`
  - [x] 11.5 Move `public/js/voice-notes-history.test.html` to `tests/html/`
  - [x] 11.6 Move `public/js/voice-notes-integration.test.html` to `tests/html/`
  - [x] 11.7 Move `public/js/weekly-catchup.test.html` to `tests/html/`
    - _Requirements: 2.1_

- [x] 12. Move dashboard HTML files
  - [x] 12.1 Move `public/sms-monitoring-dashboard.html` to `tests/html/dashboards/`
  - [x] 12.2 Move `public/test-dashboard.html` to `tests/html/dashboards/`
  - [x] 12.3 Move `public/twilio-testing.html` to `tests/html/dashboards/`
    - _Requirements: 2.2_

## Phase 5: Delete Obsolete Files

- [x] 13. Remove backup and obsolete files
  - [x] 13.1 Delete `public/js/circular-visualizer-v1-backup.js`
  - [x] 13.2 Delete `public/index.html.backup`
    - _Requirements: 3.1, 3.2_

## Phase 6: Code Quality Fixes

- [x] 14. Fix unused imports and code issues
  - [x] 14.1 Remove unused `CircleAssignmentCreateData` import from `src/contacts/circle-assignment-service.ts`
  - [x] 14.2 Run `npm run typecheck` to verify no TypeScript errors
  - [x] 14.3 Run `npm test` to verify all tests pass
    - _Requirements: 4.1, 4.2, 4.3_

## Phase 7: Create Documentation

- [x] 15. Create README files for new directories
  - [x] 15.1 Create `docs/examples/README.md` with examples documentation
  - [x] 15.2 Create `tests/html/README.md` with manual testing documentation
    - _Requirements: 1.4, 2.3_

- [x] 16. Create unimplemented features tracking document
  - [x] 16.1 Create `docs/development/UNIMPLEMENTED_FEATURES.md` with all TODOs
    - Include high priority: timezone preferences, preview/archival functionality
    - Include medium priority: cache invalidation, webhooks, calendar feed
    - Include low priority: integration tests
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 17. Update documentation index
  - [x] 17.1 Update `docs/INDEX.md` to include examples section
  - [x] 17.2 Update `docs/INDEX.md` to include tests/html reference
  - [x] 17.3 Update `docs/INDEX.md` to include UNIMPLEMENTED_FEATURES.md link
    - _Requirements: 5.5, 7.1, 7.2, 7.3_

## Phase 8: Create Steering Documentation

- [x] 18. Create new steering files
  - [x] 18.1 Create `.kiro/steering/testing-guide.md` with testing conventions
    - Include vitest and fast-check patterns
    - Include manual testing with HTML files
    - Include test naming conventions
    - _Requirements: 6.1_
  - [x] 18.2 Create `.kiro/steering/voice-notes-architecture.md` with voice feature context
    - Include AudioManager, TranscriptManager, EnrichmentPanel pipeline
    - Include WebSocket streaming architecture
    - Include Google Speech-to-Text patterns
    - _Requirements: 6.2_
  - [x] 18.3 Create `.kiro/steering/google-integrations.md` with Google API patterns
    - Include SSO authentication flow
    - Include Calendar OAuth patterns
    - Include Contacts sync architecture
    - _Requirements: 6.3_

- [x] 19. Update existing steering files
  - [x] 19.1 Update `.kiro/steering/documentation-index.md` to reflect new organization
    - Add docs/examples/ reference
    - Add tests/html/ reference
    - Add UNIMPLEMENTED_FEATURES.md reference
    - _Requirements: 6.4, 6.5_

## Phase 9: Final Validation

- [x] 20. Validate cleanup completion
  - [x] 20.1 Run `npm run typecheck` to verify TypeScript compilation
  - [x] 20.2 Run `npm test` to verify all tests pass
  - [x] 20.3 Run `npm run lint` to verify code quality
  - [x] 20.4 Verify no broken links in documentation
    - _Requirements: 4.2, 4.3, 7.4_
