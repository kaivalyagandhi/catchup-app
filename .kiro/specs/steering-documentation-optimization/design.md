# Design Document: Steering Documentation Optimization

## Overview

This design specifies the exact changes needed to optimize the steering documentation files in `.kiro/steering/` for accuracy and brevity. The optimization involves verifying current content against the codebase, updating outdated references, and reducing verbosity while maintaining essential information.

### Current State Analysis

| File | Lines | Status | Action |
|------|-------|--------|--------|
| `project.md` | 67 | Accurate | Minor update (utils description) |
| `testing-guide.md` | 35 | Accurate | No changes needed |
| `mcps.md` | 10 | Accurate | No changes needed |
| `api-reference.md` | 56 | Accurate | Already includes `/api/jobs` route |
| `google-integrations.md` | 108 | Verbose | Reduce by 20%+ |
| `voice-notes-architecture.md` | 62 | Accurate | No changes needed |
| `chrome-devtools.md` | 27 | Disabled feature | Reduce to stub |

### Key Findings

1. **No BullMQ/ioredis references** - Steering files are already clean of outdated queue/cache references
2. **API reference is current** - Already includes `/api/jobs/:jobName` route with OIDC auth note
3. **Source structure is accurate** - All directories in `project.md` exist in codebase
4. **Chrome DevTools is disabled** - `disabled: true` in `.kiro/settings/mcp.json`
5. **Memory utilities exist** - `memory-monitor.ts`, `memory-circuit-breaker.ts`, `lru-cache.ts` all present

## Architecture

No architectural changes required. This is a documentation-only optimization.

## Components and Interfaces

### Component 1: project.md Updates

**Current utils description:**
```
utils/         # Caching, encryption, rate limiting, memory monitoring
```

**Verified utilities in `src/utils/`:**
- `cache.ts`, `http-redis-client.ts` - Caching
- `encryption.ts` - Encryption
- `rate-limiter.ts` - Rate limiting
- `memory-monitor.ts`, `memory-circuit-breaker.ts`, `lru-cache.ts` - Memory monitoring
- `batch-processor.ts`, `concurrency.ts` - Processing utilities
- `validation.ts`, `error-handling.ts` - Validation/errors

**Action:** No change needed - current description is accurate and concise.

### Component 2: api-reference.md Verification

**Current entry:**
```
| `/api/jobs` | jobs-handler | Cloud Tasks job receiver (OIDC auth) |
```

**Verified against `src/api/jobs-handler.ts`:**
- Route: `POST /jobs/:jobName`
- Auth: OIDC token validation via `validateOIDCToken` middleware
- Idempotency: `checkIdempotency` middleware with Redis-backed deduplication

**Action:** No change needed - already documented correctly.

### Component 3: google-integrations.md Optimization

**Current length:** 108 lines
**Target length:** ≤86 lines (20% reduction)

**Optimization strategy:**
1. Remove redundant "Key files" listings where file names are self-explanatory
2. Consolidate rate limit descriptions
3. Remove duplicate explanations of token refresh
4. Combine similar error handling patterns
5. Remove verbose algorithm descriptions

**Sections to optimize:**
- Section 1 (Google SSO): Remove env vars list (already in project.md)
- Section 2 (Calendar): Condense free time algorithm description
- Section 3 (Contacts): Remove duplicate rate limit explanation
- Section 4 (Sync Optimization): Keep as-is (core documentation)
- Common Patterns: Consolidate into single paragraph

### Component 4: chrome-devtools.md Minimization

**Current length:** 27 lines
**Target length:** ≤20 lines

**Rationale:** Chrome DevTools MCP is disabled (`disabled: true` in `.kiro/settings/mcp.json`). Full documentation is unnecessary overhead.

**New content structure:**
- Status note (disabled)
- Re-enablement instructions
- Brief tool summary (collapsed)

### Component 5: voice-notes-architecture.md Verification

**Verified components exist:**

Backend (`src/voice/`):
- ✅ `transcription-service.ts`
- ✅ `entity-extraction-service.ts`
- ✅ `contact-disambiguation-service.ts`
- ✅ `enrichment-service.ts`
- ✅ `websocket-handler.ts`
- ✅ `voice-note-service.ts`

Frontend (`public/js/`):
- ✅ `audio-manager.js`
- ✅ `transcript-manager.js`
- ✅ `enrichment-panel.js`

**Action:** No changes needed - all documented components exist.

### Component 6: testing-guide.md Verification

**Verified against codebase:**
- ✅ Vitest used (see `*.test.ts` files throughout)
- ✅ fast-check used (see `*-properties.test.ts` files)
- ✅ Test co-location pattern followed
- ✅ Manual HTML tests in `tests/html/`

**Action:** No changes needed.

### Component 7: mcps.md Verification

**Current content:** Context7 usage instructions
**MCP status in `.kiro/settings/mcp.json`:** Context7 is `disabled: true`

**Action:** No change needed - instructions remain valid for when user enables it.

## Data Models

No data models involved - documentation-only changes.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Directory Structure Accuracy

*For any* directory listed in the `project.md` source structure section, that directory should exist in the actual `src/` folder of the codebase.

**Validates: Requirements 1.1**

### Property 2: File Path Validity

*For any* file path referenced in any steering file, that file should exist in the codebase at the specified location.

**Validates: Requirements 2.3, 4.2, 7.3**

### Property 3: Terminology Consistency

*For any* steering file, the file should not contain deprecated terminology ("BullMQ", "ioredis") and should use current terminology ("Cloud Tasks", "Upstash") when referring to job processing and caching.

**Validates: Requirements 6.1, 7.1, 7.2**

### Property 4: Component Documentation Completeness

*For any* component file in `src/integrations/` or `src/voice/` that is part of the sync optimization or voice notes system, there should be a corresponding mention in the relevant steering file (`google-integrations.md` or `voice-notes-architecture.md`).

**Validates: Requirements 3.1, 4.1**

## Error Handling

Not applicable - this is a documentation-only optimization with no runtime error scenarios.

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests (examples) and property-based tests to verify documentation accuracy.

**Unit Tests (Examples):**
- Verify `project.md` contains "Upstash Redis (HTTP)" and "Google Cloud Tasks" (Req 1.2)
- Verify `api-reference.md` contains `/api/jobs` route with OIDC auth note (Req 2.1, 2.2)
- Verify `chrome-devtools.md` is ≤20 lines when MCP is disabled (Req 5.2)
- Verify `google-integrations.md` contains "Cloud Tasks" not "BullMQ" (Req 3.2)

**Property-Based Tests:**
Use fast-check to verify universal properties across all steering files:

```typescript
import * as fc from 'fast-check';

// Property 1: Directory structure accuracy
fc.assert(fc.property(
  fc.constantFrom(...extractDirectoriesFromProjectMd()),
  (directory) => {
    return fs.existsSync(path.join('src', directory));
  }
), { numRuns: 100 });

// Property 2: File path validity
fc.assert(fc.property(
  fc.constantFrom(...extractFilePathsFromSteeringFiles()),
  (filePath) => {
    return fs.existsSync(filePath);
  }
), { numRuns: 100 });

// Property 3: Terminology consistency
fc.assert(fc.property(
  fc.constantFrom(...getSteeringFileContents()),
  (content) => {
    return !content.includes('BullMQ') && !content.includes('ioredis');
  }
), { numRuns: 100 });
```

**Test Configuration:**
- Minimum 100 iterations per property test
- Tag format: `Feature: steering-documentation-optimization, Property {N}: {description}`
- Test file location: `src/steering/steering-validation.test.ts` (if automated validation desired)

**Manual Verification:**
Given this is a documentation optimization, primary verification is manual review:
1. Run grep searches for deprecated terms
2. Verify file paths with `ls` commands
3. Compare line counts before/after optimization

## Specific Changes Required

### Change 1: google-integrations.md Optimization

**Before:** 108 lines
**Target:** ≤86 lines (20% reduction)

**Removals:**
1. Remove env vars lists (lines ~15-16, ~35, ~45) - already in project.md
2. Remove duplicate "Key files" section headers where obvious
3. Condense "Free time algorithm" to single sentence
4. Remove "Sync strategies" bullet redundancy with Section 4
5. Consolidate "Common Patterns" into 2-3 lines

**Preserved (essential):**
- All component names and file paths
- Sync optimization section (core documentation)
- OAuth scopes (security-critical)
- Rate limit values

### Change 2: chrome-devtools.md Minimization

**Before:** 27 lines
**Target:** ≤20 lines

**New structure:**
```markdown
---
inclusion: manual
---

# Chrome DevTools MCP (Disabled)

Currently disabled in `.kiro/settings/mcp.json`.

## Re-enable
1. Set `"disabled": false` in `.kiro/settings/mcp.json`
2. Start Chrome: `chrome --remote-debugging-port=9222`
3. Run `npm run dev` and navigate to app

## Key Tools
`take_snapshot`, `click`, `fill`, `hover`, `press_key`, `list_console_messages`, `list_network_requests`, `take_screenshot`, `evaluate_script`, `navigate_page`

Always take snapshot first to get element UIDs before interacting.
```

### Change 3: No Changes Required

The following files require no changes after verification:
- `project.md` - Accurate (utils description covers memory monitoring)
- `testing-guide.md` - Accurate (Vitest + fast-check confirmed)
- `mcps.md` - Valid (Context7 instructions)
- `api-reference.md` - Current (includes /api/jobs with OIDC note)
- `voice-notes-architecture.md` - Accurate (all components verified)

