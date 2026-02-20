# Implementation Plan: Steering Documentation Optimization

## Overview

Optimize steering documentation files for accuracy and brevity. Two files require changes: `google-integrations.md` (reduce by 20%+) and `chrome-devtools.md` (minimize to stub). All other files verified accurate.

## Tasks

- [x] 1. Optimize google-integrations.md
  - [x] 1.1 Remove redundant env vars lists from Sections 1, 2, 3
    - Delete `Env vars:` lines (already documented in project.md)
    - _Requirements: 3.3, 3.4_
  
  - [x] 1.2 Condense Section 2 free time algorithm
    - Reduce multi-line algorithm description to single sentence
    - _Requirements: 3.3_
  
  - [x] 1.3 Remove duplicate sync strategies from Section 3
    - Section 4 covers sync optimization comprehensively
    - _Requirements: 3.4_
  
  - [x] 1.4 Consolidate Common Patterns section
    - Combine token refresh, error handling, pagination, streaming into 2-3 concise lines
    - _Requirements: 3.3, 3.4_
  
  - [x] 1.5 Verify final line count ≤86 lines
    - Target: 20% reduction from 108 lines
    - _Requirements: 3.3_

- [x] 2. Minimize chrome-devtools.md
  - [x] 2.1 Replace content with minimal stub
    - Include: disabled status, re-enablement steps, tool list summary
    - Remove: detailed workflow, tips section
    - _Requirements: 5.1, 5.2_
  
  - [x] 2.2 Verify final line count ≤20 lines
    - _Requirements: 5.2_

- [x] 3. Checkpoint - Verify all changes
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no deprecated terminology (BullMQ, ioredis) in any steering file
  - Verify all file paths referenced still exist
  - _Requirements: 6.1, 7.1, 7.2, 7.3_

## Notes

- Files verified accurate (no changes needed): project.md, testing-guide.md, mcps.md, api-reference.md, voice-notes-architecture.md
- Primary verification is manual review of line counts and content accuracy
- All changes are documentation-only, no code modifications required
