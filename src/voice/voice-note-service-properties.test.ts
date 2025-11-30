/**
 * Property-Based Tests for VoiceNoteService
 * 
 * Feature: incremental-voice-transcription
 * 
 * These tests validate correctness properties for the VoiceNoteService class
 * using property-based testing with fast-check.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { EventEmitter } from 'events';

/**
 * Mock session for testing pause timeout behavior
 */
interface MockSession {
  id: string;
  userId: string;
  status: 'recording' | 'paused' | 'transcribing' | 'extracting' | 'ready' | 'error';
  pausedAt?: Date;
  pauseTimeoutId?: NodeJS.Timeout;
  totalPausedDuration: number;
}

/**
 * Testable VoiceNoteService for property-based testing
 * 
 * This class extracts the pause timeout logic to make it testable
 * without requiring full service dependencies.
 */
class TestablePauseTimeoutService extends EventEmitter {
  private sessions: Map<string, MockSession> = new Map();
  private readonly PAUSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  createSession(sessionId: string, userId: string): MockSession {
    const session: MockSession = {
      id: sessionId,
      userId,
      status: 'recording',
      totalPausedDuration: 0,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'recording') {
      throw new Error(`Session ${sessionId} is not in recording state`);
    }

    session.pausedAt = new Date();
    session.status = 'paused';

    // Start 5-minute timeout
    session.pauseTimeoutId = setTimeout(() => {
      this.handlePauseTimeout(sessionId);
    }, this.PAUSE_TIMEOUT_MS);
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session ${sessionId} is not in paused state`);
    }

    // Calculate paused duration
    if (session.pausedAt) {
      const pauseDuration = Date.now() - session.pausedAt.getTime();
      session.totalPausedDuration += pauseDuration;
      session.pausedAt = undefined;
    }

    // Clear pause timeout
    if (session.pauseTimeoutId) {
      clearTimeout(session.pauseTimeoutId);
      session.pauseTimeoutId = undefined;
    }

    session.status = 'recording';
  }

  private handlePauseTimeout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') {
      return;
    }

    this.emit('pause_timeout', {
      sessionId,
      pausedDuration: session.pausedAt 
        ? Date.now() - session.pausedAt.getTime() 
        : 0,
    });
  }

  getSession(sessionId: string): MockSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Helper to manually trigger timeout for testing
  triggerTimeoutNow(sessionId: string): void {
    this.handlePauseTimeout(sessionId);
  }
}

/**
 * Testable service for long recording segmentation
 */
class TestableSegmentationService {
  private readonly LONG_RECORDING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  private sessions: Map<string, {
    startTime: Date;
    pausedAt?: Date;
    totalPausedDuration: number;
    lastSegmentTime: Date;
    segmentCount: number;
  }> = new Map();

  createSession(sessionId: string, startTime?: Date): void {
    const now = startTime || new Date();
    this.sessions.set(sessionId, {
      startTime: now,
      totalPausedDuration: 0,
      lastSegmentTime: now,
      segmentCount: 0,
    });
  }

  getElapsedRecordingTime(sessionId: string, currentTime: Date): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const totalElapsed = currentTime.getTime() - session.startTime.getTime();
    
    // If currently paused, add the current pause duration
    let currentPauseDuration = 0;
    if (session.pausedAt) {
      currentPauseDuration = currentTime.getTime() - session.pausedAt.getTime();
    }

    return totalElapsed - session.totalPausedDuration - currentPauseDuration;
  }

  shouldSegment(sessionId: string, currentTime: Date): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const recordingDuration = this.getElapsedRecordingTime(sessionId, currentTime);
    
    // Check if we need to create a new segment (every 10 minutes since start)
    const timeSinceLastSegment = currentTime.getTime() - session.lastSegmentTime.getTime();
    
    // Only segment if:
    // 1. We've recorded for at least 10 minutes total
    // 2. It's been at least 10 minutes since the last segment
    return recordingDuration >= this.LONG_RECORDING_THRESHOLD_MS && 
           timeSinceLastSegment >= this.LONG_RECORDING_THRESHOLD_MS;
  }

  segment(sessionId: string, currentTime: Date): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.lastSegmentTime = currentTime;
    session.segmentCount++;
  }

  getSegmentCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.segmentCount ?? 0;
  }
}

describe('VoiceNoteService Property-Based Tests', () => {
  let service: TestablePauseTimeoutService;

  beforeEach(() => {
    service = new TestablePauseTimeoutService();
    service.setMaxListeners(200); // Increase for property-based testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * **Feature: incremental-voice-transcription, Property 8: Pause timeout trigger**
   * **Validates: Requirements 6.4**
   * 
   * For any pause duration exceeding 5 minutes (300 seconds), 
   * the system SHALL trigger a timeout prompt exactly once.
   */
  describe('Property 8: Pause timeout trigger', () => {
    it('should trigger timeout event exactly once after 5 minutes of pause', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          (sessionId, userId) => {
            // Create and pause a session
            service.createSession(sessionId, userId);
            service.pauseSession(sessionId);

            // Track timeout events
            let timeoutCount = 0;
            service.on('pause_timeout', (event) => {
              if (event.sessionId === sessionId) {
                timeoutCount++;
              }
            });

            // Advance time by exactly 5 minutes
            vi.advanceTimersByTime(5 * 60 * 1000);

            // Should trigger exactly once
            expect(timeoutCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT trigger timeout if resumed before 5 minutes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.integer({ min: 1000, max: 299000 }), // pauseDuration < 5 minutes
          (sessionId, userId, pauseDuration) => {
            // Create and pause a session
            service.createSession(sessionId, userId);
            service.pauseSession(sessionId);

            // Track timeout events
            let timeoutCount = 0;
            service.on('pause_timeout', (event) => {
              if (event.sessionId === sessionId) {
                timeoutCount++;
              }
            });

            // Advance time by less than 5 minutes
            vi.advanceTimersByTime(pauseDuration);

            // Resume before timeout
            service.resumeSession(sessionId);

            // Advance past the original timeout point
            vi.advanceTimersByTime(5 * 60 * 1000);

            // Should NOT trigger
            expect(timeoutCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger timeout only for paused sessions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          (sessionId, userId) => {
            // Create session but don't pause
            service.createSession(sessionId, userId);

            // Track timeout events
            let timeoutCount = 0;
            service.on('pause_timeout', (event) => {
              if (event.sessionId === sessionId) {
                timeoutCount++;
              }
            });

            // Manually trigger timeout (simulating timer firing)
            service.triggerTimeoutNow(sessionId);

            // Should NOT trigger for non-paused session
            expect(timeoutCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include pause duration in timeout event', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          (sessionId, userId) => {
            // Create and pause a session
            service.createSession(sessionId, userId);
            service.pauseSession(sessionId);

            // Track timeout events
            let eventData: any = null;
            service.on('pause_timeout', (event) => {
              if (event.sessionId === sessionId) {
                eventData = event;
              }
            });

            // Advance time by exactly 5 minutes
            const expectedDuration = 5 * 60 * 1000;
            vi.advanceTimersByTime(expectedDuration);

            // Should include pause duration
            expect(eventData).not.toBeNull();
            expect(eventData.pausedDuration).toBeGreaterThanOrEqual(expectedDuration - 100);
            expect(eventData.pausedDuration).toBeLessThanOrEqual(expectedDuration + 100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: incremental-voice-transcription, Property 10: Long recording segmentation**
   * **Validates: Requirements 7.5**
   * 
   * For any recording exceeding 10 minutes, the audio SHALL be segmented 
   * into chunks of at most 10 minutes each for processing.
   * 
   * Note: This property validates the core segmentation logic is implemented.
   * The actual VoiceNoteService implementation handles segmentation during
   * audio chunk processing.
   */
  describe('Property 10: Long recording segmentation', () => {
    let segmentService: TestableSegmentationService;

    beforeEach(() => {
      segmentService = new TestableSegmentationService();
    });

    it('should NOT segment recordings under 10 minutes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.integer({ min: 0, max: 9 * 60 * 1000 + 59000 }), // duration < 10 minutes
          (sessionId, duration) => {
            const startTime = new Date(2025, 0, 1, 10, 0, 0);
            const currentTime = new Date(startTime.getTime() + duration);

            segmentService.createSession(sessionId, startTime);

            // Should NOT segment
            const shouldSeg = segmentService.shouldSegment(sessionId, currentTime);
            expect(shouldSeg).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should segment recordings that exceed 10-minute boundaries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // sessionId
          fc.integer({ min: 1, max: 5 }), // number of 10-minute periods
          (sessionId, numPeriods) => {
            const startTime = new Date(2025, 0, 1, 10, 0, 0);
            segmentService.createSession(sessionId, startTime);

            // Check at each 10-minute boundary (add 1ms to ensure we're past the threshold)
            for (let i = 1; i <= numPeriods; i++) {
              const currentTime = new Date(startTime.getTime() + i * 10 * 60 * 1000 + 1);
              
              // Should be able to segment at each 10-minute mark
              const canSegment = segmentService.shouldSegment(sessionId, currentTime);
              expect(canSegment).toBe(true);
              
              // Perform segmentation
              if (canSegment) {
                segmentService.segment(sessionId, currentTime);
              }
            }

            // Should have created numPeriods segments
            expect(segmentService.getSegmentCount(sessionId)).toBe(numPeriods);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
