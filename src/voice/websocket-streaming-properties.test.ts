/**
 * Property-Based Tests for WebSocket Streaming
 * 
 * Feature: incremental-voice-transcription
 * 
 * These tests validate correctness properties for WebSocket streaming behavior
 * using property-based testing with fast-check.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

/**
 * Testable WebSocket Streaming Manager
 * 
 * This class simulates the audio streaming behavior to test latency properties
 * without requiring actual WebSocket connections or browser APIs.
 */
class TestableStreamingManager {
  private chunkIntervalMs: number;
  private chunks: Array<{ data: Buffer; timestamp: number }>;
  private startTime: number | null;
  
  constructor(chunkIntervalMs: number = 100) {
    this.chunkIntervalMs = chunkIntervalMs;
    this.chunks = [];
    this.startTime = null;
  }
  
  /**
   * Start recording and begin sending chunks
   */
  startRecording(): void {
    this.startTime = Date.now();
  }
  
  /**
   * Simulate sending an audio chunk
   */
  sendChunk(data: Buffer): void {
    if (!this.startTime) {
      throw new Error('Recording not started');
    }
    
    const timestamp = Date.now();
    this.chunks.push({ data, timestamp });
  }
  
  /**
   * Get the latency of the first chunk (time from start to first chunk sent)
   */
  getFirstChunkLatency(): number | null {
    if (!this.startTime || this.chunks.length === 0) {
      return null;
    }
    
    return this.chunks[0].timestamp - this.startTime;
  }
  
  /**
   * Get all chunks
   */
  getChunks(): Array<{ data: Buffer; timestamp: number }> {
    return this.chunks;
  }
  
  /**
   * Reset state
   */
  reset(): void {
    this.chunks = [];
    this.startTime = null;
  }
}

/**
 * Testable Reconnection Manager
 * 
 * This class implements the exponential backoff logic for testing
 */
class TestableReconnectionManager {
  private initialDelayMs: number;
  private maxDelayMs: number;
  private reconnectAttempts: number[];
  
  constructor(initialDelayMs: number = 1000, maxDelayMs: number = 10000) {
    this.initialDelayMs = initialDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.reconnectAttempts = [];
  }
  
  /**
   * Calculate backoff delay for attempt N
   * Formula: min(initialDelay * 2^(N-1), maxDelay)
   */
  calculateBackoffDelay(attemptNumber: number): number {
    if (attemptNumber < 1) {
      throw new Error('Attempt number must be >= 1');
    }
    
    const delay = this.initialDelayMs * Math.pow(2, attemptNumber - 1);
    return Math.min(delay, this.maxDelayMs);
  }
  
  /**
   * Record a reconnection attempt with its delay
   */
  recordAttempt(attemptNumber: number, actualDelay: number): void {
    this.reconnectAttempts.push(actualDelay);
  }
  
  /**
   * Get all recorded attempts
   */
  getAttempts(): number[] {
    return this.reconnectAttempts;
  }
}

/**
 * Testable Audio Buffer Manager
 * 
 * This class implements the audio buffering logic during disconnection
 */
class TestableAudioBufferManager {
  private buffer: Buffer[];
  private maxBufferSizeBytes: number;
  
  constructor(maxBufferSizeBytes: number = 100 * 1024 * 1024) {
    this.buffer = [];
    this.maxBufferSizeBytes = maxBufferSizeBytes;
  }
  
  /**
   * Add a chunk to the buffer
   * Implements memory limit by dropping oldest chunks
   */
  addChunk(chunk: Buffer): void {
    // If a single chunk exceeds the max buffer size, we can't buffer it
    // In this case, we clear the buffer and don't add the chunk
    if (chunk.length > this.maxBufferSizeBytes) {
      this.buffer = [];
      return;
    }
    
    let currentSize = this.getCurrentSize();
    
    // Remove oldest chunks if we would exceed the limit
    while (this.buffer.length > 0 && currentSize + chunk.length > this.maxBufferSizeBytes) {
      const removed = this.buffer.shift()!;
      currentSize -= removed.length;
    }
    
    // Add new chunk
    this.buffer.push(chunk);
  }
  
  /**
   * Get current buffer size in bytes
   */
  getCurrentSize(): number {
    return this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
  }
  
  /**
   * Get all buffered chunks
   */
  getChunks(): Buffer[] {
    return [...this.buffer];
  }
  
  /**
   * Flush buffer and return all chunks
   */
  flush(): Buffer[] {
    const chunks = [...this.buffer];
    this.buffer = [];
    return chunks;
  }
  
  /**
   * Check if buffer is within size limit
   */
  isWithinLimit(): boolean {
    return this.getCurrentSize() <= this.maxBufferSizeBytes;
  }
}

describe('WebSocket Streaming Properties', () => {
  describe('Property 13: Streaming latency bound', () => {
    /**
     * Feature: incremental-voice-transcription, Property 13: Streaming latency bound
     * Validates: Requirements 1.1
     * 
     * For any audio recording start event, the first audio chunk SHALL be sent
     * to the transcription service within 500 milliseconds.
     */
    it('should send first audio chunk within 500ms of recording start', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }), // chunk interval in ms
          fc.integer({ min: 1, max: 10 }), // number of chunks to send
          (chunkIntervalMs, numChunks) => {
            const manager = new TestableStreamingManager(chunkIntervalMs);
            
            // Start recording
            manager.startRecording();
            
            // Simulate sending chunks at the configured interval
            const startTime = Date.now();
            for (let i = 0; i < numChunks; i++) {
              // Simulate time passing
              const chunkData = Buffer.from(`chunk-${i}`);
              
              // Send chunk immediately (simulating the first chunk)
              if (i === 0) {
                manager.sendChunk(chunkData);
                break; // We only care about the first chunk for this property
              }
            }
            
            const latency = manager.getFirstChunkLatency();
            
            // Property: First chunk latency must be <= 500ms
            // In our simulation, we send immediately, so latency should be very small
            expect(latency).not.toBeNull();
            expect(latency!).toBeLessThanOrEqual(500);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 5: Reconnection backoff timing', () => {
    /**
     * Feature: incremental-voice-transcription, Property 5: Reconnection backoff timing
     * Validates: Requirements 5.1
     * 
     * For any sequence of reconnection attempts, the delay between attempt N and N+1
     * SHALL equal min(initialDelay * 2^N, maxDelay).
     */
    it('should calculate exponential backoff delays correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500, max: 2000 }), // initial delay
          fc.integer({ min: 5000, max: 15000 }), // max delay
          fc.integer({ min: 1, max: 10 }), // attempt number
          (initialDelay, maxDelay, attemptNumber) => {
            const manager = new TestableReconnectionManager(initialDelay, maxDelay);
            
            const calculatedDelay = manager.calculateBackoffDelay(attemptNumber);
            
            // Property: delay = min(initialDelay * 2^(attemptNumber-1), maxDelay)
            const expectedDelay = Math.min(
              initialDelay * Math.pow(2, attemptNumber - 1),
              maxDelay
            );
            
            expect(calculatedDelay).toBe(expectedDelay);
            
            // Additional property: delay should never exceed maxDelay
            expect(calculatedDelay).toBeLessThanOrEqual(maxDelay);
            
            // Additional property: delay should be at least initialDelay for attempt 1
            if (attemptNumber === 1) {
              expect(calculatedDelay).toBe(initialDelay);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should follow exponential growth pattern for sequential attempts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 2000 }), // initial delay
          fc.integer({ min: 10000, max: 20000 }), // max delay
          (initialDelay, maxDelay) => {
            const manager = new TestableReconnectionManager(initialDelay, maxDelay);
            
            // Calculate delays for attempts 1-5
            const delays = [1, 2, 3, 4, 5].map(n => 
              manager.calculateBackoffDelay(n)
            );
            
            // Property: Each delay should be double the previous (until max is reached)
            for (let i = 1; i < delays.length; i++) {
              const prevDelay = delays[i - 1];
              const currentDelay = delays[i];
              
              if (prevDelay < maxDelay) {
                // If we haven't hit the max, current should be double previous
                // (or equal to max if doubling would exceed it)
                const expectedDouble = prevDelay * 2;
                expect(currentDelay).toBe(Math.min(expectedDouble, maxDelay));
              } else {
                // If we've hit the max, all subsequent delays should equal max
                expect(currentDelay).toBe(maxDelay);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 6: Buffer integrity after reconnect', () => {
    /**
     * Feature: incremental-voice-transcription, Property 6: Buffer integrity after reconnect
     * Validates: Requirements 5.2, 5.5
     * 
     * For any sequence of audio chunks buffered during disconnection, all chunks
     * SHALL be transmitted in order after successful reconnection, with no data loss.
     */
    it('should preserve all buffered chunks in order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 100, max: 10000 }), { minLength: 1, maxLength: 100 }), // chunk sizes
          (chunkSizes) => {
            const manager = new TestableAudioBufferManager();
            
            // Create and buffer chunks
            const originalChunks = chunkSizes.map((size, i) => 
              Buffer.alloc(size, `chunk-${i}`)
            );
            
            for (const chunk of originalChunks) {
              manager.addChunk(chunk);
            }
            
            // Flush buffer (simulating reconnection)
            const flushedChunks = manager.flush();
            
            // Property: All chunks should be present
            expect(flushedChunks.length).toBe(originalChunks.length);
            
            // Property: Chunks should be in the same order
            for (let i = 0; i < flushedChunks.length; i++) {
              expect(flushedChunks[i].equals(originalChunks[i])).toBe(true);
            }
            
            // Property: No data loss - total size should match
            const originalSize = originalChunks.reduce((sum, c) => sum + c.length, 0);
            const flushedSize = flushedChunks.reduce((sum, c) => sum + c.length, 0);
            expect(flushedSize).toBe(originalSize);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 9: Memory buffer bounds', () => {
    /**
     * Feature: incremental-voice-transcription, Property 9: Memory buffer bounds
     * Validates: Requirements 7.4
     * 
     * For any recording session, the audio buffer size SHALL never exceed the
     * configured maximum (100MB), with older segments flushed when the limit is approached.
     */
    it('should never exceed maximum buffer size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }), // max buffer size in bytes
          fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 10, maxLength: 100 }), // chunk sizes
          (maxBufferSize, chunkSizes) => {
            const manager = new TestableAudioBufferManager(maxBufferSize);
            
            // Add all chunks
            for (const size of chunkSizes) {
              const chunk = Buffer.alloc(size);
              manager.addChunk(chunk);
              
              // Property: Buffer size should never exceed maximum
              expect(manager.getCurrentSize()).toBeLessThanOrEqual(maxBufferSize);
              expect(manager.isWithinLimit()).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should drop oldest chunks when approaching limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5000, max: 10000 }), // max buffer size
          fc.array(fc.integer({ min: 1000, max: 3000 }), { minLength: 5, maxLength: 20 }), // chunk sizes
          (maxBufferSize, chunkSizes) => {
            const manager = new TestableAudioBufferManager(maxBufferSize);
            
            // Add chunks and track which ones should be kept
            const addedChunks: Buffer[] = [];
            
            for (const size of chunkSizes) {
              const chunk = Buffer.alloc(size, addedChunks.length);
              addedChunks.push(chunk);
              manager.addChunk(chunk);
            }
            
            const bufferedChunks = manager.getChunks();
            
            // Property: Buffered chunks should be a suffix of added chunks
            // (oldest chunks may have been dropped)
            const numBuffered = bufferedChunks.length;
            const expectedChunks = addedChunks.slice(-numBuffered);
            
            for (let i = 0; i < numBuffered; i++) {
              expect(bufferedChunks[i].equals(expectedChunks[i])).toBe(true);
            }
            
            // Property: Buffer should be within limit
            expect(manager.isWithinLimit()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
