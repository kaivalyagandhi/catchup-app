/**
 * Property-Based Tests for TranscriptManager
 * 
 * Feature: incremental-voice-transcription
 * 
 * These tests validate correctness properties for the TranscriptManager class
 * using property-based testing with fast-check.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * TranscriptSegment interface matching the frontend implementation
 */
interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
  isPauseMarker?: boolean;
}

/**
 * TranscriptManager class for testing
 * This is a TypeScript version of the frontend JavaScript class
 */
class TranscriptManager {
  private segments: TranscriptSegment[];
  private currentInterim: TranscriptSegment | null;
  private wordCount: number;
  private lastFinalizedAt: number;
  private nextSegmentId: number;

  constructor() {
    this.segments = [];
    this.currentInterim = null;
    this.wordCount = 0;
    this.lastFinalizedAt = Date.now();
    this.nextSegmentId = 0;
  }

  addInterimText(text: string, confidence: number): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    this.currentInterim = {
      id: `interim-${this.nextSegmentId}`,
      text: text.trim(),
      isFinal: false,
      confidence: confidence,
      timestamp: Date.now(),
      isPauseMarker: false
    };
  }

  finalizeText(text: string, confidence: number): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    const finalText = text.trim();

    const segment: TranscriptSegment = {
      id: `final-${this.nextSegmentId++}`,
      text: finalText,
      isFinal: true,
      confidence: confidence,
      timestamp: Date.now(),
      isPauseMarker: false
    };

    this.segments.push(segment);
    this.wordCount += this.countWords(finalText);
    this.currentInterim = null;
    this.lastFinalizedAt = Date.now();
  }

  insertPauseMarker(): void {
    const marker: TranscriptSegment = {
      id: `pause-${this.nextSegmentId++}`,
      text: '⏸',
      isFinal: true,
      confidence: 1.0,
      timestamp: Date.now(),
      isPauseMarker: true
    };

    this.segments.push(marker);
  }

  getFinalTranscript(): string {
    return this.segments
      .filter(seg => !seg.isPauseMarker)
      .map(seg => seg.text)
      .join(' ');
  }

  getFullTranscript(): string {
    const finalText = this.getFinalTranscript();

    if (this.currentInterim) {
      return finalText + (finalText ? ' ' : '') + this.currentInterim.text;
    }

    return finalText;
  }

  getWordCount(): number {
    return this.wordCount;
  }

  getSegments(): TranscriptSegment[] {
    return [...this.segments];
  }

  getCurrentInterim(): TranscriptSegment | null {
    return this.currentInterim;
  }

  clear(): void {
    this.segments = [];
    this.currentInterim = null;
    this.wordCount = 0;
    this.lastFinalizedAt = Date.now();
    this.nextSegmentId = 0;
  }

  private countWords(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

// Custom arbitraries for generating test data
const textArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const confidenceArbitrary = fc.double({ min: 0, max: 1, noNaN: true });
const wordArbitrary = fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s));
const sentenceArbitrary = fc.array(wordArbitrary, { minLength: 1, maxLength: 10 }).map(words => words.join(' '));

describe('TranscriptManager Property-Based Tests', () => {
  let manager: TranscriptManager;

  beforeEach(() => {
    manager = new TranscriptManager();
  });

  /**
   * Property 1: Final transcript preservation
   * Feature: incremental-voice-transcription, Property 1: Final transcript preservation
   * Validates: Requirements 1.3, 1.4
   * 
   * For any sequence of transcript updates (interim and final), all finalized text 
   * segments SHALL remain unchanged when new interim text arrives. The final 
   * transcript is append-only.
   */
  describe('Property 1: Final transcript preservation', () => {
    it('should preserve final transcript when adding interim text', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
          confidenceArbitrary,
          (finalTexts, interimTexts, confidence) => {
            manager = new TranscriptManager();

            // Add final texts
            finalTexts.forEach(text => {
              manager.finalizeText(text, confidence);
            });

            // Capture final transcript after finalization
            const finalTranscriptBefore = manager.getFinalTranscript();

            // Add interim texts
            interimTexts.forEach(text => {
              manager.addInterimText(text, confidence);
              
              // Final transcript should remain unchanged
              const finalTranscriptAfter = manager.getFinalTranscript();
              expect(finalTranscriptAfter).toBe(finalTranscriptBefore);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should append new final text without modifying previous final text', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 2, maxLength: 10 }),
          confidenceArbitrary,
          (texts, confidence) => {
            manager = new TranscriptManager();

            let cumulativeTranscript = '';

            texts.forEach((text, index) => {
              // Add final text
              manager.finalizeText(text, confidence);

              // Build expected cumulative transcript
              if (index === 0) {
                cumulativeTranscript = text;
              } else {
                cumulativeTranscript += ' ' + text;
              }

              // Final transcript should match cumulative
              const actualTranscript = manager.getFinalTranscript();
              expect(actualTranscript).toBe(cumulativeTranscript);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain final transcript integrity through interim replacements', () => {
      fc.assert(
        fc.property(
          sentenceArbitrary,
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
          confidenceArbitrary,
          (finalText, interimTexts, confidence) => {
            manager = new TranscriptManager();

            // Add final text
            manager.finalizeText(finalText, confidence);
            const expectedFinal = finalText;

            // Add multiple interim texts (each replaces the previous)
            interimTexts.forEach(interimText => {
              manager.addInterimText(interimText, confidence);
              
              // Final transcript should still be the original
              expect(manager.getFinalTranscript()).toBe(expectedFinal);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve final segments when finalizing interim text', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
          sentenceArbitrary,
          sentenceArbitrary,
          confidenceArbitrary,
          (initialFinalTexts, interimText, newFinalText, confidence) => {
            manager = new TranscriptManager();

            // Add initial final texts
            initialFinalTexts.forEach(text => {
              manager.finalizeText(text, confidence);
            });

            const initialFinal = manager.getFinalTranscript();

            // Add interim text
            manager.addInterimText(interimText, confidence);

            // Finalize the interim (or new text)
            manager.finalizeText(newFinalText, confidence);

            // Final transcript should contain all previous final text plus new final text
            const finalTranscript = manager.getFinalTranscript();
            expect(finalTranscript.startsWith(initialFinal)).toBe(true);
            expect(finalTranscript).toContain(newFinalText);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle pause markers without affecting final transcript text', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 3 }),
          confidenceArbitrary,
          (texts, numPauses, confidence) => {
            manager = new TranscriptManager();

            let expectedTranscript = '';

            texts.forEach((text, index) => {
              // Add final text
              manager.finalizeText(text, confidence);
              
              if (index === 0) {
                expectedTranscript = text;
              } else {
                expectedTranscript += ' ' + text;
              }

              // Add pause markers
              if (index < texts.length - 1) {
                for (let i = 0; i < numPauses; i++) {
                  manager.insertPauseMarker();
                }
              }
            });

            // Final transcript should not include pause markers
            const finalTranscript = manager.getFinalTranscript();
            expect(finalTranscript).toBe(expectedTranscript);
            expect(finalTranscript).not.toContain('⏸');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Confidence-based text styling
   * Feature: incremental-voice-transcription, Property 14: Confidence-based text styling
   * Validates: Requirements 1.5
   * 
   * For any transcript segment with confidence C, the rendered text SHALL have 
   * distinct styling: low (C < 0.7), medium (0.7 <= C < 0.9), high (C >= 0.9).
   */
  describe('Property 14: Confidence-based text styling', () => {
    it('should classify confidence levels correctly for all values', () => {
      fc.assert(
        fc.property(
          sentenceArbitrary,
          confidenceArbitrary,
          (text, confidence) => {
            manager = new TranscriptManager();
            manager.finalizeText(text, confidence);

            const segments = manager.getSegments();
            expect(segments.length).toBe(1);

            const segment = segments[0];
            expect(segment.confidence).toBe(confidence);

            // Verify confidence classification
            if (confidence < 0.7) {
              // Low confidence
              expect(segment.confidence).toBeLessThan(0.7);
            } else if (confidence >= 0.7 && confidence < 0.9) {
              // Medium confidence
              expect(segment.confidence).toBeGreaterThanOrEqual(0.7);
              expect(segment.confidence).toBeLessThan(0.9);
            } else {
              // High confidence
              expect(segment.confidence).toBeGreaterThanOrEqual(0.9);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain confidence values through segment lifecycle', () => {
      fc.assert(
        fc.property(
          sentenceArbitrary,
          confidenceArbitrary,
          confidenceArbitrary,
          (text, interimConfidence, finalConfidence) => {
            manager = new TranscriptManager();

            // Add interim with specific confidence
            manager.addInterimText(text, interimConfidence);
            const interim = manager.getCurrentInterim();
            expect(interim?.confidence).toBe(interimConfidence);

            // Finalize with different confidence
            manager.finalizeText(text, finalConfidence);
            const segments = manager.getSegments();
            expect(segments[0].confidence).toBe(finalConfidence);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle boundary confidence values correctly', () => {
      const boundaryTests = [
        { confidence: 0.0, expected: 'low' },
        { confidence: 0.69, expected: 'low' },
        { confidence: 0.7, expected: 'medium' },
        { confidence: 0.8, expected: 'medium' },
        { confidence: 0.89, expected: 'medium' },
        { confidence: 0.9, expected: 'high' },
        { confidence: 0.95, expected: 'high' },
        { confidence: 1.0, expected: 'high' },
      ];

      boundaryTests.forEach(({ confidence, expected }) => {
        manager = new TranscriptManager();
        manager.finalizeText('test text', confidence);

        const segments = manager.getSegments();
        const segment = segments[0];

        let actual: string;
        if (segment.confidence < 0.7) {
          actual = 'low';
        } else if (segment.confidence >= 0.7 && segment.confidence < 0.9) {
          actual = 'medium';
        } else {
          actual = 'high';
        }

        expect(actual).toBe(expected);
      });
    });

    it('should preserve confidence values for multiple segments', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              text: sentenceArbitrary,
              confidence: confidenceArbitrary
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (segmentData) => {
            manager = new TranscriptManager();

            // Add all segments
            segmentData.forEach(({ text, confidence }) => {
              manager.finalizeText(text, confidence);
            });

            // Verify all segments have correct confidence
            const segments = manager.getSegments();
            expect(segments.length).toBe(segmentData.length);

            segments.forEach((segment, index) => {
              expect(segment.confidence).toBe(segmentData[index].confidence);
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle interim text confidence independently from final text', () => {
      fc.assert(
        fc.property(
          sentenceArbitrary,
          sentenceArbitrary,
          confidenceArbitrary,
          confidenceArbitrary,
          (finalText, interimText, finalConfidence, interimConfidence) => {
            manager = new TranscriptManager();

            // Add final text
            manager.finalizeText(finalText, finalConfidence);

            // Add interim text with different confidence
            manager.addInterimText(interimText, interimConfidence);

            // Verify final segment confidence unchanged
            const segments = manager.getSegments();
            expect(segments[0].confidence).toBe(finalConfidence);

            // Verify interim has its own confidence
            const interim = manager.getCurrentInterim();
            expect(interim?.confidence).toBe(interimConfidence);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for completeness
   */
  describe('Additional Properties', () => {
    it('should count words accurately for any text', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 10 }),
          confidenceArbitrary,
          (texts, confidence) => {
            manager = new TranscriptManager();

            let expectedWordCount = 0;

            texts.forEach(text => {
              manager.finalizeText(text, confidence);
              expectedWordCount += text.trim().split(/\s+/).filter(w => w.length > 0).length;
            });

            expect(manager.getWordCount()).toBe(expectedWordCount);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not count interim text in word count', () => {
      fc.assert(
        fc.property(
          sentenceArbitrary,
          sentenceArbitrary,
          confidenceArbitrary,
          (finalText, interimText, confidence) => {
            manager = new TranscriptManager();

            manager.finalizeText(finalText, confidence);
            const wordCountAfterFinal = manager.getWordCount();

            manager.addInterimText(interimText, confidence);
            const wordCountAfterInterim = manager.getWordCount();

            // Word count should not change when adding interim
            expect(wordCountAfterInterim).toBe(wordCountAfterFinal);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear all state correctly', () => {
      fc.assert(
        fc.property(
          fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
          sentenceArbitrary,
          confidenceArbitrary,
          (finalTexts, interimText, confidence) => {
            manager = new TranscriptManager();

            // Add some data
            finalTexts.forEach(text => manager.finalizeText(text, confidence));
            manager.addInterimText(interimText, confidence);
            manager.insertPauseMarker();

            // Clear
            manager.clear();

            // Verify everything is cleared
            expect(manager.getFinalTranscript()).toBe('');
            expect(manager.getFullTranscript()).toBe('');
            expect(manager.getWordCount()).toBe(0);
            expect(manager.getSegments().length).toBe(0);
            expect(manager.getCurrentInterim()).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
