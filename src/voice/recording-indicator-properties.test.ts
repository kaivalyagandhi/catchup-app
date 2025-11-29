/**
 * Property-Based Tests for RecordingIndicator
 * 
 * Feature: incremental-voice-transcription
 * 
 * These tests validate correctness properties for the RecordingIndicator class
 * using property-based testing with fast-check.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Testable RecordingIndicator
 * Extracts core time tracking logic for testing without DOM dependencies
 */
class TestableRecordingIndicator {
  private elapsedTime: number;
  private timerInterval: NodeJS.Timeout | null;
  private startTime: number;
  private pausedTime: number;
  private totalPausedDuration: number;

  constructor() {
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.startTime = 0;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
  }

  /**
   * Start recording timer
   * @param initialElapsed - Initial elapsed time in seconds
   */
  startTimer(initialElapsed: number = 0): void {
    this.elapsedTime = initialElapsed;
    this.startTime = Date.now() - (initialElapsed * 1000);
    this.pausedTime = 0;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - this.startTime - this.totalPausedDuration) / 1000);
      this.elapsedTime = elapsed;
    }, 1000);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.pausedTime = Date.now();
  }

  /**
   * Resume the timer
   */
  resume(): void {
    if (this.pausedTime > 0) {
      const pauseDuration = Date.now() - this.pausedTime;
      this.totalPausedDuration += pauseDuration;
      this.pausedTime = 0;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - this.startTime - this.totalPausedDuration) / 1000);
      this.elapsedTime = elapsed;
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Get current elapsed time
   */
  getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Manually update elapsed time (for testing)
   */
  updateTime(seconds: number): void {
    this.elapsedTime = seconds;
  }

  /**
   * Get actual elapsed time based on start time and paused duration
   */
  getActualElapsedTime(): number {
    if (this.startTime === 0) return 0;
    const now = Date.now();
    const pausedDuration = this.pausedTime > 0 ? (now - this.pausedTime) : 0;
    return Math.floor((now - this.startTime - this.totalPausedDuration - pausedDuration) / 1000);
  }

  /**
   * Format time for display
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

describe('RecordingIndicator Property-Based Tests', () => {
  let indicator: TestableRecordingIndicator;

  beforeEach(() => {
    indicator = new TestableRecordingIndicator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    indicator.stop();
    vi.restoreAllMocks();
  });

  /**
   * Property 12: Elapsed time accuracy
   * Feature: incremental-voice-transcription, Property 12: Elapsed time accuracy
   * Validates: Requirements 3.2
   * 
   * For any recording session with duration D seconds (excluding paused time), 
   * the displayed elapsed time SHALL equal D ± 1 second.
   */
  describe('Property 12: Elapsed time accuracy', () => {
    it('should display elapsed time within ±1 second for any duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3600 }), // Duration from 0 to 1 hour
          (durationSeconds) => {
            indicator = new TestableRecordingIndicator();
            
            // Start timer
            indicator.startTimer(0);
            
            // Advance time by the specified duration
            vi.advanceTimersByTime(durationSeconds * 1000);
            
            const displayedTime = indicator.getElapsedTime();
            const actualTime = indicator.getActualElapsedTime();
            
            // Displayed time should be within ±1 second of actual time
            const difference = Math.abs(displayedTime - actualTime);
            expect(difference).toBeLessThanOrEqual(1);
            
            indicator.stop();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain accuracy when starting with initial elapsed time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 300 }), // Initial elapsed time (0-5 minutes)
          fc.integer({ min: 1, max: 300 }),  // Additional duration (1-5 minutes)
          (initialElapsed, additionalDuration) => {
            indicator = new TestableRecordingIndicator();
            
            // Start timer with initial elapsed time
            indicator.startTimer(initialElapsed);
            
            // Advance time by additional duration
            vi.advanceTimersByTime(additionalDuration * 1000);
            
            const displayedTime = indicator.getElapsedTime();
            const expectedTime = initialElapsed + additionalDuration;
            
            // Displayed time should be within ±1 second of expected time
            const difference = Math.abs(displayedTime - expectedTime);
            expect(difference).toBeLessThanOrEqual(1);
            
            indicator.stop();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude paused time from elapsed time calculation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 60 }),   // Recording duration before pause
          fc.integer({ min: 5, max: 60 }),   // Pause duration
          fc.integer({ min: 5, max: 60 }),   // Recording duration after resume
          (beforePause, pauseDuration, afterResume) => {
            indicator = new TestableRecordingIndicator();
            
            // Start recording
            indicator.startTimer(0);
            vi.advanceTimersByTime(beforePause * 1000);
            
            // Pause
            indicator.pause();
            vi.advanceTimersByTime(pauseDuration * 1000);
            
            // Resume
            indicator.resume();
            vi.advanceTimersByTime(afterResume * 1000);
            
            const displayedTime = indicator.getElapsedTime();
            const expectedTime = beforePause + afterResume; // Pause time excluded
            
            // Displayed time should be within ±1 second of expected time (excluding pause)
            const difference = Math.abs(displayedTime - expectedTime);
            expect(difference).toBeLessThanOrEqual(1);
            
            indicator.stop();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple pause/resume cycles correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              recordDuration: fc.integer({ min: 1, max: 30 }),
              pauseDuration: fc.integer({ min: 1, max: 30 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (cycles) => {
            indicator = new TestableRecordingIndicator();
            
            let totalRecordingTime = 0;
            let totalPauseTime = 0;
            
            // Start recording
            indicator.startTimer(0);
            
            // Execute each cycle
            for (const cycle of cycles) {
              // Record
              vi.advanceTimersByTime(cycle.recordDuration * 1000);
              totalRecordingTime += cycle.recordDuration;
              
              // Pause
              indicator.pause();
              vi.advanceTimersByTime(cycle.pauseDuration * 1000);
              totalPauseTime += cycle.pauseDuration;
              
              // Resume
              indicator.resume();
            }
            
            // Final recording period
            const finalDuration = 10;
            vi.advanceTimersByTime(finalDuration * 1000);
            totalRecordingTime += finalDuration;
            
            const displayedTime = indicator.getElapsedTime();
            const expectedTime = totalRecordingTime; // Only recording time, not pause time
            
            // Displayed time should be within ±1 second of expected time
            const difference = Math.abs(displayedTime - expectedTime);
            expect(difference).toBeLessThanOrEqual(1);
            
            indicator.stop();
            return true;
          }
        ),
        { numRuns: 50 } // Fewer runs due to complexity
      );
    });

    it('should format time correctly for any valid duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 86400 }), // 0 to 24 hours in seconds
          (seconds) => {
            const formatted = indicator.formatTime(seconds);
            
            // Should match MM:SS format (at least 2 digits for minutes, exactly 2 for seconds)
            expect(formatted).toMatch(/^\d{2,}:\d{2}$/);
            
            // Parse and verify
            const [mins, secs] = formatted.split(':').map(Number);
            const reconstructed = mins * 60 + secs;
            
            // Reconstructed time should equal original
            expect(reconstructed).toBe(seconds);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases correctly', () => {
      const testCases = [
        { seconds: 0, expected: '00:00' },
        { seconds: 1, expected: '00:01' },
        { seconds: 59, expected: '00:59' },
        { seconds: 60, expected: '01:00' },
        { seconds: 61, expected: '01:01' },
        { seconds: 3599, expected: '59:59' },
        { seconds: 3600, expected: '60:00' },
        { seconds: 3661, expected: '61:01' },
      ];

      testCases.forEach(({ seconds, expected }) => {
        const formatted = indicator.formatTime(seconds);
        expect(formatted).toBe(expected);
      });
    });

    it('should update time display when manually set', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3600 }),
          (seconds) => {
            indicator.updateTime(seconds);
            const displayedTime = indicator.getElapsedTime();
            
            // Displayed time should exactly match the set time
            expect(displayedTime).toBe(seconds);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
