# Implementation Plan: Cloud SQL Cost Optimization

## Overview

This implementation plan covers connection pool optimization, batch upserts for calendar events, GCP configuration updates, and documentation of serverless alternatives. The goal is to reduce Cloud SQL costs while maintaining performance and reliability.

## Tasks

- [ ] 1. Update connection pool configuration
  - [ ] 1.1 Modify `src/db/connection.ts` to set min=0, max=5, idleTimeoutMillis=10000
  - [ ] 1.2 Add connection acquire/release logging for debugging
  - [ ] 1.3 Implement retry logic with exponential backoff on connection failure
  - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8_

- [ ] 2. Update environment variables documentation
  - [ ] 2.1 Update `.env.example` with DATABASE_POOL_MIN=0
  - [ ] 2.2 Update `.env.example` with DATABASE_POOL_MAX=5
  - _Requirements: 2.1, 2.2_

- [ ] 3. Implement batch calendar event upserts
  - [ ] 3.1 Modify `src/calendar/calendar-events-repository.ts` to use multi-row VALUES clause
  - [ ] 3.2 Implement batch processing with 100 rows per statement
  - [ ] 3.3 Add conditional updates using IS DISTINCT FROM to skip unchanged rows
  - [ ] 3.4 Maintain transactional guarantee (all succeed or all fail)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 3.5 Write unit tests for connection pool configuration
  - **Property 1: Connection pool min configuration**
  - **Property 2: Connection pool max configuration**
  - **Property 3: Connection pool idle timeout**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 3.6 Write property-based tests for batch upsert round-trip
  - **Property 6: Batch upsert round-trip**
  - **Validates: Requirements 3.7**
  - Tag: `Feature: cloud-sql-cost-optimization, Property 6: Batch upsert round-trip`

- [ ]* 4. Configure GCP Cloud SQL settings
  - [ ]* 4.1 Enable automated backups with 7-day retention (via GCP console or gcloud)
  - [ ]* 4.2 Set maintenance window to Sunday 02:00-06:00 UTC
  - [ ]* 4.3 Disable query insights to reduce monitoring overhead
  - [ ]* 4.4 Set log_min_duration_statement=1000 to log slow queries
  - _Requirements: 1.6, 7.1, 7.3, 7.8_

- [ ] 5. Update cost optimization documentation
  - [ ] 5.1 Update `docs/deployment/COST_OPTIMIZATION.md` with serverless alternatives evaluation
  - [ ] 5.2 Document Neon, Supabase, and self-hosted PostgreSQL comparison
  - [ ] 5.3 Include break-even analysis for migration decision
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ]* 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7. Configure Cloud Monitoring alerts
  - [ ]* 7.1 Set alert for CPU utilization >80% sustained over 15 minutes
  - [ ]* 7.2 Set alert for storage usage >80%
  - [ ]* 7.3 Set alert for active connections >20
  - [ ]* 7.4 Set alert for disk queue depth >1000
  - [ ]* 7.5 Configure billing alert at $12/month threshold
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Connection pool changes support scale-to-zero behavior on Cloud Run
- Batch upserts reduce database round-trips from 100 to 1-2 for typical calendar syncs