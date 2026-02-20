# Requirements Document

## Introduction

This spec optimizes the steering documentation files in `.kiro/steering/` for accuracy and brevity. The steering files provide context to Kiro about the CatchUp project. Recent infrastructure changes (Redis optimization, Cloud Tasks migration, memory optimization, Google sync optimization) have introduced new components that need documentation, while some existing documentation may be outdated or overly verbose.

## Glossary

- **Steering_File**: A markdown file in `.kiro/steering/` that provides project context to Kiro
- **Always_Included_File**: A steering file with `inclusion: always` that is included in every Kiro context
- **Manual_Inclusion_File**: A steering file with `inclusion: manual` that is only included when explicitly referenced
- **Accuracy**: Documentation correctly reflects the current codebase state
- **Brevity**: Documentation uses minimal words while maintaining clarity and completeness

## Requirements

### Requirement 1: Verify Always-Included File Accuracy

**User Story:** As a developer, I want the always-included steering files to accurately reflect the current codebase, so that Kiro provides correct guidance.

#### Acceptance Criteria

1. THE Steering_File `project.md` SHALL accurately list all source directories in `src/`
2. THE Steering_File `project.md` SHALL correctly describe the tech stack including "Upstash Redis (HTTP)" for caching and "Google Cloud Tasks" for job processing
3. THE Steering_File `project.md` SHALL mention memory monitoring utilities (memory-monitor, memory-circuit-breaker, lru-cache) in the utils description
4. THE Steering_File `testing-guide.md` SHALL accurately describe the testing stack and conventions
5. THE Steering_File `mcps.md` SHALL contain valid MCP usage instructions

### Requirement 2: Update API Reference for New Routes

**User Story:** As a developer, I want the API reference to include all current routes, so that Kiro can help me work with the API correctly.

#### Acceptance Criteria

1. THE Steering_File `api-reference.md` SHALL include the `/api/jobs/:jobName` route for Cloud Tasks job handling
2. THE Steering_File `api-reference.md` SHALL document that the jobs route uses OIDC authentication from Cloud Tasks
3. WHEN a route is removed from the codebase, THE Steering_File `api-reference.md` SHALL NOT reference that route

### Requirement 3: Optimize Google Integrations Documentation

**User Story:** As a developer, I want the Google integrations documentation to be accurate and concise, so that Kiro understands the architecture without excessive context.

#### Acceptance Criteria

1. THE Steering_File `google-integrations.md` SHALL accurately describe the sync optimization components (TokenHealthMonitor, CircuitBreakerManager, AdaptiveSyncScheduler, CalendarWebhookManager, SyncOrchestrator)
2. THE Steering_File `google-integrations.md` SHALL reference "Cloud Tasks" for background jobs (not BullMQ)
3. THE Steering_File `google-integrations.md` SHALL be reduced in length by at least 20% while maintaining essential information
4. THE Steering_File `google-integrations.md` SHALL remove redundant explanations and consolidate similar concepts

### Requirement 4: Verify Voice Notes Architecture Accuracy

**User Story:** As a developer, I want the voice notes architecture documentation to be accurate, so that Kiro can help me work with the voice notes system.

#### Acceptance Criteria

1. THE Steering_File `voice-notes-architecture.md` SHALL accurately describe the current voice notes components
2. THE Steering_File `voice-notes-architecture.md` SHALL reference correct file paths for all mentioned components
3. IF any voice notes components have been added or removed, THEN THE Steering_File `voice-notes-architecture.md` SHALL be updated accordingly

### Requirement 5: Evaluate Chrome DevTools Documentation

**User Story:** As a developer, I want the Chrome DevTools documentation to be minimal if the feature is disabled, so that it doesn't consume unnecessary context.

#### Acceptance Criteria

1. IF Chrome DevTools MCP is disabled in `.kiro/settings/mcp.json`, THEN THE Steering_File `chrome-devtools.md` SHALL be reduced to a minimal stub with re-enablement instructions
2. THE Steering_File `chrome-devtools.md` SHALL NOT exceed 20 lines if the feature is disabled

### Requirement 6: Cross-Reference Consistency

**User Story:** As a developer, I want all steering files to use consistent terminology and references, so that Kiro receives coherent context.

#### Acceptance Criteria

1. THE Steering_Files SHALL use consistent terminology for shared concepts (e.g., "Cloud Tasks" not "BullMQ" for job processing)
2. THE Steering_Files SHALL NOT contain contradictory information about the tech stack
3. THE Steering_Files SHALL reference the same file paths for shared components

### Requirement 7: Remove Outdated Information

**User Story:** As a developer, I want outdated information removed from steering files, so that Kiro doesn't provide incorrect guidance.

#### Acceptance Criteria

1. THE Steering_Files SHALL NOT reference BullMQ for job processing (migrated to Cloud Tasks)
2. THE Steering_Files SHALL NOT reference ioredis for caching (migrated to Upstash HTTP client)
3. THE Steering_Files SHALL NOT reference files or components that no longer exist in the codebase
