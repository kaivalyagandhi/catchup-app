# Implementation Plan

- [x] 1. Set up Twilio integration and database schema
  - Create Twilio account and configure phone number
  - Set up environment variables for Twilio credentials
  - Create database migration for user_phone_numbers table
  - Add source and source_metadata columns to enrichment_items table
  - Create indexes for phone number lookups
  - _Requirements: 1.1, 2.1, 7.1_

- [x] 2. Implement phone number verification service
  - Create phone-number-service.ts with verification code generation
  - Implement 6-digit code generation with 10-minute expiration
  - Add phone number encryption using AES-256
  - Create database repository for user_phone_numbers
  - Implement verification code validation logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1_

- [ ]* 2.1 Write property test for verification code generation
  - **Property 1: Verification code generation**
  - **Validates: Requirements 1.1**

- [ ]* 2.2 Write property test for valid code acceptance
  - **Property 2: Valid code acceptance**
  - **Validates: Requirements 1.2**

- [ ]* 2.3 Write property test for invalid code rejection
  - **Property 3: Invalid code rejection**
  - **Validates: Requirements 1.3**

- [ ]* 2.4 Write property test for code expiration
  - **Property 4: Code expiration enforcement**
  - **Validates: Requirements 1.4**

- [ ]* 2.5 Write property test for phone number unlinking
  - **Property 5: Phone number unlinking**
  - **Validates: Requirements 1.5**

- [ ]* 2.6 Write property test for phone number encryption
  - **Property 27: Phone number encryption**
  - **Validates: Requirements 10.1**

- [x] 3. Create API routes for phone number management
  - Implement POST /api/user/phone-number endpoint
  - Implement POST /api/user/phone-number/verify endpoint
  - Implement GET /api/user/phone-number endpoint
  - Implement DELETE /api/user/phone-number endpoint
  - Add authentication middleware to all endpoints
  - Integrate with Twilio to send verification SMS
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 3.1 Write unit tests for phone number API routes
  - Test phone number linking flow
  - Test verification code validation
  - Test phone number unlinking
  - Test authentication requirements
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Implement Twilio webhook handler
  - Create POST /api/sms/webhook endpoint
  - Implement Twilio signature validation
  - Parse SMS and MMS payloads
  - Look up user by phone number
  - Return TwiML response immediately
  - Queue message for async processing
  - _Requirements: 2.1, 2.2, 7.1, 7.2_

- [ ]* 4.1 Write property test for webhook signature validation
  - **Property 6: Webhook signature validation**
  - **Validates: Requirements 7.1**

- [ ]* 4.2 Write property test for invalid signature rejection
  - **Property 7: Invalid signature rejection**
  - **Validates: Requirements 7.2**

- [ ]* 4.3 Write property test for valid signature processing
  - **Property 8: Valid signature processing**
  - **Validates: Requirements 7.3**

- [ ]* 4.4 Write property test for security event logging
  - **Property 9: Security event logging**
  - **Validates: Requirements 7.5**

- [x] 5. Implement rate limiting service
  - Create rate-limiter.ts using Redis or in-memory cache
  - Implement 20 messages per hour limit per phone number
  - Add counter increment and expiration logic
  - Implement quota checking and remaining count
  - Add time window reset functionality
  - _Requirements: 8.1, 8.2, 8.4_

- [ ]* 5.1 Write property test for rate limit enforcement
  - **Property 20: Rate limit enforcement**
  - **Validates: Requirements 8.1, 8.2**

- [ ]* 5.2 Write property test for rate limit notification
  - **Property 21: Rate limit notification**
  - **Validates: Requirements 8.3**

- [ ]* 5.3 Write property test for rate limit reset
  - **Property 22: Rate limit reset**
  - **Validates: Requirements 8.4**

- [x] 6. Implement media downloader service
  - Create media-downloader.ts for downloading from Twilio URLs
  - Add file size validation (5MB limit)
  - Implement streaming download to avoid memory issues
  - Add timeout handling for slow downloads
  - Create temporary file cleanup logic
  - _Requirements: 3.1, 4.1, 4.5, 5.1, 5.5_

- [ ]* 6.1 Write property test for media size validation
  - **Property 14: Media size validation**
  - **Validates: Requirements 4.5, 5.5**

- [ ]* 6.2 Write property test for temporary media cleanup
  - **Property 28: Temporary media cleanup**
  - **Validates: Requirements 10.2**

- [x] 7. Implement AI processing service
  - Create ai-processor.ts for Google Cloud integration
  - Implement audio transcription using Speech-to-Text API
  - Implement text enrichment extraction using Gemini API
  - Implement image analysis using Gemini Vision API
  - Implement video analysis using Gemini multimodal API
  - Parse structured JSON responses from Gemini
  - _Requirements: 2.3, 3.2, 3.3, 4.2, 4.3, 5.2, 5.3_

- [ ]* 7.1 Write property test for audio transcription error handling
  - **Property 12: Audio transcription error handling**
  - **Validates: Requirements 3.5**

- [ ]* 7.2 Write unit tests for AI processing service
  - Test transcription with mock Speech-to-Text API
  - Test enrichment extraction with mock Gemini API
  - Test image analysis with mock Gemini Vision
  - Test video analysis with mock Gemini multimodal
  - Test error handling for API failures
  - _Requirements: 2.3, 3.2, 3.3, 4.2, 5.2_

- [x] 8. Implement message processor service
  - Create message-processor.ts for routing messages
  - Detect message type (SMS vs MMS)
  - Detect content type (text, audio, image, video)
  - Route to appropriate AI processor
  - Store enrichments in database with correct metadata
  - Implement error handling with retry logic
  - _Requirements: 2.3, 2.4, 3.4, 4.4, 5.4_

- [ ]* 8.1 Write property test for SMS source tagging
  - **Property 10: SMS source tagging**
  - **Validates: Requirements 2.4**

- [ ]* 8.2 Write property test for voice note metadata tagging
  - **Property 11: Voice note metadata tagging**
  - **Validates: Requirements 3.4**

- [ ]* 8.3 Write property test for image metadata tagging
  - **Property 13: Image metadata tagging**
  - **Validates: Requirements 4.4**

- [ ]* 8.4 Write property test for video metadata tagging
  - **Property 15: Video metadata tagging**
  - **Validates: Requirements 5.4**

- [ ]* 8.5 Write property test for pending status initialization
  - **Property 16: Pending status initialization**
  - **Validates: Requirements 6.1**

- [ ]* 8.6 Write property test for metadata-only retention
  - **Property 29: Metadata-only retention**
  - **Validates: Requirements 10.3**

- [x] 9. Implement error handling and retry logic
  - Create error classification (recoverable vs unrecoverable)
  - Implement retry logic with exponential backoff (max 3 attempts)
  - Add comprehensive error logging with context
  - Implement user notification for failures
  - Add audit logging for security events
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 9.1 Write property test for error logging with context
  - **Property 23: Error logging with context**
  - **Validates: Requirements 9.1**

- [ ]* 9.2 Write property test for retry logic
  - **Property 24: Retry logic for recoverable errors**
  - **Validates: Requirements 9.2**

- [ ]* 9.3 Write property test for failure notification
  - **Property 25: Failure notification after retries**
  - **Validates: Requirements 9.3**

- [ ]* 9.4 Write property test for unrecoverable error handling
  - **Property 26: Unrecoverable error handling**
  - **Validates: Requirements 9.4**

- [x] 10. Implement TwiML response generator
  - Create twiml-generator.ts for generating XML responses
  - Implement success confirmation message
  - Implement error messages for various failure types
  - Implement rate limit message with reset time
  - Implement unverified number message
  - Add XML escaping for special characters
  - _Requirements: 2.5, 8.3_

- [ ]* 10.1 Write unit tests for TwiML generator
  - Test XML structure validation
  - Test message formatting
  - Test special character escaping
  - Test all message types (success, error, rate limit)
  - _Requirements: 2.5, 8.3_

- [x] 11. Enhance enrichment review UI
  - Update web app to display source information (sms/mms)
  - Show media type for MMS enrichments (audio/image/video)
  - Display original message text when available
  - Add filtering by source type
  - Ensure approve/edit/reject functionality works with new sources
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ]* 11.1 Write property test for approval status transition
  - **Property 17: Approval status transition**
  - **Validates: Requirements 6.3**

- [ ]* 11.2 Write property test for edit persistence
  - **Property 18: Edit persistence**
  - **Validates: Requirements 6.4**

- [ ]* 11.3 Write property test for rejection status transition
  - **Property 19: Rejection status transition**
  - **Validates: Requirements 6.5**

- [x] 12. Implement account deletion cascade
  - Update user deletion logic to remove phone numbers
  - Cascade delete enrichments from SMS/MMS sources
  - Add cleanup for any remaining temporary files
  - Test cascade deletion thoroughly
  - _Requirements: 10.5_

- [ ]* 12.1 Write property test for account deletion cascade
  - **Property 30: Account deletion cascade**
  - **Validates: Requirements 10.5**

- [x] 13. Add monitoring and logging
  - Implement metrics tracking (messages received, processing time, error rates)
  - Add performance monitoring for AI API calls
  - Create dashboard for SMS/MMS usage statistics
  - Set up alerts for high error rates
  - Add cost tracking for Twilio and Google Cloud usage
  - _Requirements: 9.1_

- [ ]* 13.1 Write unit tests for monitoring service
  - Test metrics collection
  - Test alert triggering logic
  - Test cost calculation
  - _Requirements: 9.1_

- [x] 14. Create user documentation
  - Write user guide for phone number verification
  - Document supported message types and formats
  - Create examples for each enrichment type
  - Document rate limits and file size limits
  - Add troubleshooting guide
  - _Requirements: All_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration testing
  - Test complete phone number verification flow
  - Test SMS enrichment end-to-end
  - Test voice note enrichment end-to-end
  - Test image enrichment end-to-end
  - Test video enrichment end-to-end
  - Test rate limiting behavior
  - Test error handling and retry logic
  - Test webhook signature validation
  - _Requirements: All_

- [ ]* 16.1 Write integration tests for complete flows
  - Test phone verification flow
  - Test SMS to enrichment flow
  - Test MMS to enrichment flow
  - Test rate limiting flow
  - Test error recovery flow
  - _Requirements: All_

- [x] 17. Security audit and testing
  - Verify phone number encryption at rest
  - Test webhook signature validation thoroughly
  - Verify rate limiting prevents abuse
  - Test temporary file cleanup
  - Verify PII handling compliance
  - Test account deletion cascade
  - _Requirements: 7.1, 7.2, 8.1, 10.1, 10.2, 10.5_

- [ ]* 17.1 Write security tests
  - Test encryption/decryption
  - Test signature validation edge cases
  - Test rate limit bypass attempts
  - Test unauthorized access attempts
  - _Requirements: 7.1, 7.2, 8.1, 10.1_

- [x] 18. Performance optimization
  - Optimize database queries with proper indexes
  - Implement connection pooling for external APIs
  - Add caching for frequently accessed data
  - Optimize media download streaming
  - Test under load (100+ concurrent messages)
  - _Requirements: All_

- [ ]* 18.1 Write performance tests
  - Test webhook response time (< 5s target)
  - Test concurrent message processing
  - Test database query performance
  - Test memory usage during media processing
  - _Requirements: All_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
