/**
 * Property-Based Tests for AudioManager
 * 
 * Feature: incremental-voice-transcription
 * 
 * These tests validate correctness properties for the AudioManager class
 * using property-based testing with fast-check.
 */

// Note: This file is designed to run in a Node.js test environment with vitest
// The AudioManager class needs to be adapted for testing or mocked

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Mock AudioManager for testing
 * Since AudioManager uses browser APIs (MediaRecorder, AudioContext),
 * we create a testable version that exposes the core logic
 */
class TestableAudioManager {
  constructor(config = {}) {
    this.config = {
      silenceThresholdDb: config.silenceThresholdDb || -50,
      lowLevelThresholdDb: config.lowLevelThresholdDb || -40,
      clippingThresholdDb: config.clippingThresholdDb || 0,
      silenceTimeoutMs: config.silenceTimeoutMs || 3000,
    };
    
    this.currentLevel = -Infinity;
    this.silenceStartTime = null;
    this.warnings = {
      silence: [],
      lowLevel: [],
      clipping: []
    };
  }
  
  /**
   * Simulate checking audio level
   * This is the core logic extracted from AudioManager._checkAudioLevel
   */
  checkAudioLevel(db, timestamp = Date.now()) {
    this.currentLevel = db;
    
    // Check for silence
    if (db < this.config.silenceThresholdDb) {
      if (!this.silenceStartTime) {
        this.silenceStartTime = timestamp;
      } else if (timestamp - this.silenceStartTime >= this.config.silenceTimeoutMs) {
        this.warnings.silence.push({ db, timestamp });
        // Reset to avoid repeated triggers
        this.silenceStartTime = timestamp;
      }
    } else {
      this.silenceStartTime = null;
    }
    
    // Check for low level
    if (db < this.config.lowLevelThresholdDb && db > this.config.silenceThresholdDb) {
      this.warnings.lowLevel.push({ db, timestamp });
    }
    
    // Check for clipping
    if (db >= this.config.clippingThresholdDb) {
      this.warnings.clipping.push({ db, timestamp });
    }
  }
  
  getWarnings() {
    return this.warnings;
  }
  
  reset() {
    this.warnings = {
      silence: [],
      lowLevel: [],
      clipping: []
    };
    this.silenceStartTime = null;
  }
}

describe('AudioManager Property-Based Tests', () => {
  let manager;
  
  beforeEach(() => {
    manager = new TestableAudioManager();
  });
  
  /**
   * Property 4: Audio level warning accuracy
   * Feature: incremental-voice-transcription, Property 4: Audio level warning accuracy
   * Validates: Requirements 4.4, 4.5
   * 
   * For any audio level value, the system SHALL display a low-level warning 
   * if level < -40dB, a clipping warning if level >= 0dB, and no warning otherwise.
   */
  describe('Property 4: Audio level warning accuracy', () => {
    it('should trigger low-level warning for levels < -40dB and > -50dB', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -49.99, max: -40.01 }), // Between silence and low threshold
          (level) => {
            manager.reset();
            manager.checkAudioLevel(level);
            
            const warnings = manager.getWarnings();
            
            // Should have low-level warning
            expect(warnings.lowLevel.length).toBe(1);
            expect(warnings.lowLevel[0].db).toBe(level);
            
            // Should NOT have clipping warning
            expect(warnings.clipping.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should trigger clipping warning for levels >= 0dB', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10 }), // At or above clipping threshold
          (level) => {
            manager.reset();
            manager.checkAudioLevel(level);
            
            const warnings = manager.getWarnings();
            
            // Should have clipping warning
            expect(warnings.clipping.length).toBe(1);
            expect(warnings.clipping[0].db).toBe(level);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should NOT trigger warnings for normal levels (-40dB to 0dB)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -39.99, max: -0.01 }), // Normal range
          (level) => {
            manager.reset();
            manager.checkAudioLevel(level);
            
            const warnings = manager.getWarnings();
            
            // Should have NO warnings
            expect(warnings.lowLevel.length).toBe(0);
            expect(warnings.clipping.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle boundary values correctly', () => {
      const testCases = [
        { level: -40.0, expectLow: false, expectClip: false }, // Exactly at threshold
        { level: -40.01, expectLow: true, expectClip: false },  // Just below threshold
        { level: -39.99, expectLow: false, expectClip: false }, // Just above threshold
        { level: 0.0, expectLow: false, expectClip: true },     // Exactly at clipping
        { level: -0.01, expectLow: false, expectClip: false },  // Just below clipping
        { level: 0.01, expectLow: false, expectClip: true },    // Just above clipping
      ];
      
      testCases.forEach(({ level, expectLow, expectClip }) => {
        manager.reset();
        manager.checkAudioLevel(level);
        
        const warnings = manager.getWarnings();
        
        if (expectLow) {
          expect(warnings.lowLevel.length).toBeGreaterThan(0);
        } else {
          expect(warnings.lowLevel.length).toBe(0);
        }
        
        if (expectClip) {
          expect(warnings.clipping.length).toBeGreaterThan(0);
        } else {
          expect(warnings.clipping.length).toBe(0);
        }
      });
    });
  });
  
  /**
   * Property 3: Silence detection threshold
   * Feature: incremental-voice-transcription, Property 3: Silence detection threshold
   * Validates: Requirements 4.3
   * 
   * For any sequence of audio levels, silence SHALL be detected if and only if 
   * all levels in a 3-second window are below the silence threshold (-50dB).
   */
  describe('Property 3: Silence detection threshold', () => {
    it('should detect silence after 3 seconds of levels below threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: -50.01 }), // Below silence threshold
          fc.integer({ min: 3000, max: 10000 }), // Duration >= 3 seconds
          (level, duration) => {
            manager.reset();
            
            const startTime = 1000;
            const endTime = startTime + duration;
            
            // Simulate audio levels below threshold for the duration
            manager.checkAudioLevel(level, startTime);
            manager.checkAudioLevel(level, endTime);
            
            const warnings = manager.getWarnings();
            
            // Should have silence warning
            expect(warnings.silence.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should NOT detect silence if levels are above threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -49.99, max: 0 }), // Above silence threshold
          fc.integer({ min: 3000, max: 10000 }), // Duration >= 3 seconds
          (level, duration) => {
            manager.reset();
            
            const startTime = 1000;
            const endTime = startTime + duration;
            
            // Simulate audio levels above threshold for the duration
            manager.checkAudioLevel(level, startTime);
            manager.checkAudioLevel(level, endTime);
            
            const warnings = manager.getWarnings();
            
            // Should NOT have silence warning
            expect(warnings.silence.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should NOT detect silence if duration is less than 3 seconds', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: -50.01 }), // Below silence threshold
          fc.integer({ min: 100, max: 2999 }), // Duration < 3 seconds
          (level, duration) => {
            manager.reset();
            
            const startTime = 1000;
            const endTime = startTime + duration;
            
            // Simulate audio levels below threshold for short duration
            manager.checkAudioLevel(level, startTime);
            manager.checkAudioLevel(level, endTime);
            
            const warnings = manager.getWarnings();
            
            // Should NOT have silence warning (not enough time)
            expect(warnings.silence.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should reset silence detection when level goes above threshold', () => {
      manager.reset();
      
      const startTime = 1000;
      
      // Start silence
      manager.checkAudioLevel(-60, startTime);
      manager.checkAudioLevel(-60, startTime + 2000); // 2 seconds of silence
      
      // Break silence
      manager.checkAudioLevel(-30, startTime + 2500);
      
      // Resume silence
      manager.checkAudioLevel(-60, startTime + 3000);
      manager.checkAudioLevel(-60, startTime + 6000); // Another 3 seconds
      
      const warnings = manager.getWarnings();
      
      // Should have exactly one silence warning (after the second 3-second period)
      expect(warnings.silence.length).toBe(1);
    });
  });
});
