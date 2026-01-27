# Repository Cleanup Requirements

## Overview
Comprehensive cleanup and organization of the CatchUp repository to remove obsolete files, consolidate documentation, organize example code, and improve project maintainability.

## User Stories

### 1. File Organization
As a developer, I want example files organized in a dedicated location so that I can easily find reference implementations without cluttering the main source code.

**Acceptance Criteria:**
- 1.1 All backend example files (`*-example.ts`) are moved from `src/` to `docs/examples/backend/`
- 1.2 All frontend example files (`*-integration-example.js`) are moved from `public/js/` to `docs/examples/frontend/`
- 1.3 Example files remain functional with updated import paths where necessary
- 1.4 A README.md is created in `docs/examples/` explaining the purpose and organization of examples

### 2. Test File Organization
As a developer, I want test HTML files organized in a dedicated testing directory so that the public/js folder contains only production code.

**Acceptance Criteria:**
- 2.1 All `*.test.html` files are moved from `public/js/` to `tests/html/`
- 2.2 Dashboard HTML files (`sms-monitoring-dashboard.html`, `test-dashboard.html`, `twilio-testing.html`) are moved to `tests/html/`
- 2.3 A README.md is created in `tests/html/` explaining how to use the manual test files
- 2.4 Any relative paths in moved HTML files are updated to work from new location

### 3. Backup File Removal
As a developer, I want obsolete backup files removed so that the repository doesn't contain duplicate or outdated code.

**Acceptance Criteria:**
- 3.1 `public/js/circular-visualizer-v1-backup.js` is deleted (migration verified complete)
- 3.2 `public/index.html.backup` is deleted
- 3.3 No other backup files exist in the repository

### 4. Code Quality Improvements
As a developer, I want unused imports and dead code removed so that the codebase is clean and maintainable.

**Acceptance Criteria:**
- 4.1 Unused import `CircleAssignmentCreateData` is removed from `src/contacts/circle-assignment-service.ts`
- 4.2 TypeScript compilation produces no unused import warnings
- 4.3 All tests continue to pass after cleanup

### 5. TODO Tracking Document
As a developer, I want a centralized document tracking all unimplemented features so that I can prioritize future work.

**Acceptance Criteria:**
- 5.1 A `docs/development/UNIMPLEMENTED_FEATURES.md` document is created
- 5.2 Document includes all TODO comments found in the codebase with file locations
- 5.3 Document categorizes TODOs by priority (high/medium/low)
- 5.4 Document includes brief descriptions of each unimplemented feature
- 5.5 Document is linked from `docs/INDEX.md`

### 6. Steering Documentation Enhancement
As a developer using Kiro, I want relevant project files included in steering docs so that AI assistance has proper context.

**Acceptance Criteria:**
- 6.1 A new steering file `.kiro/steering/testing-guide.md` is created with testing conventions
- 6.2 A new steering file `.kiro/steering/voice-notes-architecture.md` is created for voice feature context
- 6.3 A new steering file `.kiro/steering/google-integrations.md` is created for Google API patterns
- 6.4 Existing steering files are reviewed and updated if outdated
- 6.5 `documentation-index.md` steering file is updated to reflect new organization

### 7. Documentation Index Update
As a developer, I want the documentation index updated to reflect the new organization so that I can find files easily.

**Acceptance Criteria:**
- 7.1 `docs/INDEX.md` is updated to include new `docs/examples/` section
- 7.2 `docs/INDEX.md` is updated to reference `tests/html/` for manual testing
- 7.3 `docs/INDEX.md` is updated to include `UNIMPLEMENTED_FEATURES.md`
- 7.4 Any broken links in `docs/INDEX.md` are fixed

## Out of Scope
- Implementing the TODO features (tracked separately)
- Archiving completed specs (keeping for reference per user request)
- Major code refactoring beyond cleanup
- Automated test conversion (keeping manual test HTML files)
