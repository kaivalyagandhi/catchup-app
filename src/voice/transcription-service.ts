/**
 * Transcription Service
 *
 * Handles real-time audio transcription using Google Cloud Speech-to-Text API.
 * Supports streaming recognition with interim and final results.
 */

import { Duplex } from 'stream';
import { google } from '@google-cloud/speech/build/protos/protos';
import {
  getSpeechClient,
  getStreamingRecognitionConfig,
  SpeechToTextConfig,
} from '../integrations/google-speech-config';

/**
 * Transcription stream interface
 */
export interface TranscriptionStream {
  id: string;
  stream: Duplex;
  isActive: boolean;
  startTime: Date;
  retryCount: number;
  audioBuffer: Buffer[];
}

/**
 * Streaming configuration options
 */
export interface StreamingConfig {
  encoding?: google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
  sampleRateHertz?: number;
  languageCode?: string;
  interimResults?: boolean;
}

/**
 * Transcription result
 */
export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

/**
 * Event handlers for transcription events
 */
export interface TranscriptionEventHandlers {
  onInterimResult?: (result: TranscriptionResult) => void;
  onFinalResult?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
}

/**
 * Reconnection configuration
 */
export interface ReconnectionConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * TranscriptionService class
 *
 * Manages streaming audio transcription with Google Cloud Speech-to-Text API
 */
export class TranscriptionService {
  private activeStreams: Map<string, TranscriptionStream> = new Map();
  private eventHandlers: TranscriptionEventHandlers = {};
  private streamConfigs: Map<string, StreamingConfig> = new Map();

  // Default reconnection configuration
  private reconnectionConfig: ReconnectionConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Start a new streaming recognition session
   *
   * @param config - Streaming configuration options
   * @returns TranscriptionStream instance
   */
  async startStream(config?: StreamingConfig): Promise<TranscriptionStream> {
    const client = getSpeechClient();

    // Generate unique stream ID
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Prepare recognition config
    const recognitionConfig = getStreamingRecognitionConfig({
      encoding: config?.encoding || google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
      sampleRateHertz: config?.sampleRateHertz || 16000,
      languageCode: config?.languageCode || 'en-US',
    } as Partial<SpeechToTextConfig>);

    // Create streaming request
    const request = {
      config: recognitionConfig,
      interimResults: config?.interimResults !== undefined ? config.interimResults : true,
    };

    // Initialize streaming recognize
    const recognizeStream = client.streamingRecognize(request);

    // Set up event handlers
    recognizeStream.on('data', (data: any) => {
      this.handleStreamData(streamId, data);
    });

    recognizeStream.on('error', (error: Error) => {
      this.handleStreamError(streamId, error);
    });

    recognizeStream.on('end', () => {
      this.handleStreamEnd(streamId);
    });

    // Create transcription stream object
    const transcriptionStream: TranscriptionStream = {
      id: streamId,
      stream: recognizeStream,
      isActive: true,
      startTime: new Date(),
      retryCount: 0,
      audioBuffer: [],
    };

    // Store active stream and config
    this.activeStreams.set(streamId, transcriptionStream);
    this.streamConfigs.set(streamId, config || {});

    return transcriptionStream;
  }

  /**
   * Send audio chunk to the stream
   *
   * @param transcriptionStream - The transcription stream
   * @param audioChunk - Audio data buffer
   */
  async sendAudioChunk(
    transcriptionStream: TranscriptionStream,
    audioChunk: Buffer
  ): Promise<void> {
    if (!transcriptionStream.isActive) {
      throw new Error('Stream is not active');
    }

    const stream = this.activeStreams.get(transcriptionStream.id);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Buffer audio chunk for potential reconnection
    stream.audioBuffer.push(audioChunk);

    // Keep buffer size manageable (last 10 seconds worth of audio at 16kHz)
    const maxBufferSize = 50; // ~10 seconds at typical chunk sizes
    if (stream.audioBuffer.length > maxBufferSize) {
      stream.audioBuffer.shift();
    }

    try {
      // Write audio chunk to the stream
      stream.stream.write(audioChunk);
    } catch (error) {
      console.error('Error writing to stream:', error);
      // Attempt reconnection
      await this.attemptReconnection(transcriptionStream);
    }
  }

  /**
   * Close the stream and get final transcript
   *
   * @param transcriptionStream - The transcription stream to close
   * @returns Promise that resolves when stream is closed
   */
  async closeStream(transcriptionStream: TranscriptionStream): Promise<void> {
    const stream = this.activeStreams.get(transcriptionStream.id);
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Mark stream as inactive
    stream.isActive = false;

    // End the stream
    stream.stream.end();

    // Remove from active streams
    this.activeStreams.delete(transcriptionStream.id);
  }

  /**
   * Register event handler for interim results
   *
   * @param callback - Callback function for interim results
   */
  onInterimResult(callback: (result: TranscriptionResult) => void): void {
    this.eventHandlers.onInterimResult = callback;
  }

  /**
   * Register event handler for final results
   *
   * @param callback - Callback function for final results
   */
  onFinalResult(callback: (result: TranscriptionResult) => void): void {
    this.eventHandlers.onFinalResult = callback;
  }

  /**
   * Register event handler for errors
   *
   * @param callback - Callback function for errors
   */
  onError(callback: (error: Error) => void): void {
    this.eventHandlers.onError = callback;
  }

  /**
   * Register event handler for reconnection attempts
   *
   * @param callback - Callback function for reconnection attempts
   */
  onReconnecting(callback: (attempt: number) => void): void {
    this.eventHandlers.onReconnecting = callback;
  }

  /**
   * Register event handler for successful reconnection
   *
   * @param callback - Callback function for successful reconnection
   */
  onReconnected(callback: () => void): void {
    this.eventHandlers.onReconnected = callback;
  }

  /**
   * Set custom reconnection configuration
   *
   * @param config - Reconnection configuration
   */
  setReconnectionConfig(config: Partial<ReconnectionConfig>): void {
    this.reconnectionConfig = {
      ...this.reconnectionConfig,
      ...config,
    };
  }

  /**
   * Handle stream data events
   *
   * @param streamId - Stream identifier
   * @param data - Recognition response data
   */
  private handleStreamData(streamId: string, data: any): void {
    if (!data.results || data.results.length === 0) {
      return;
    }

    const result = data.results[0];
    if (!result.alternatives || result.alternatives.length === 0) {
      return;
    }

    const alternative = result.alternatives[0];
    const transcriptionResult: TranscriptionResult = {
      transcript: alternative.transcript || '',
      isFinal: result.isFinal || false,
      confidence: alternative.confidence,
    };

    // Log transcription result for debugging
    console.log(
      `Stream ${streamId} - ${transcriptionResult.isFinal ? 'Final' : 'Interim'}: ${transcriptionResult.transcript}`
    );

    // Call appropriate event handler
    if (transcriptionResult.isFinal) {
      if (this.eventHandlers.onFinalResult) {
        this.eventHandlers.onFinalResult(transcriptionResult);
      }
    } else {
      if (this.eventHandlers.onInterimResult) {
        this.eventHandlers.onInterimResult(transcriptionResult);
      }
    }
  }

  /**
   * Handle stream error events
   *
   * @param streamId - Stream identifier
   * @param error - Error object
   */
  private async handleStreamError(streamId: string, error: Error): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return;
    }

    console.error(`Transcription stream ${streamId} error:`, error);

    // Check if error is recoverable (code 11 is DEADLINE_EXCEEDED)
    const errorCode = (error as any).code;
    const isRecoverable = errorCode === 11 || errorCode === 'DEADLINE_EXCEEDED';

    if (isRecoverable && stream.retryCount < this.reconnectionConfig.maxRetries) {
      // Attempt reconnection
      await this.attemptReconnection(stream);
    } else {
      // Mark stream as inactive
      stream.isActive = false;

      // Notify error handler
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error);
      }
    }
  }

  /**
   * Handle stream end events
   *
   * @param streamId - Stream identifier
   */
  private handleStreamEnd(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.isActive = false;
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Get active stream count
   *
   * @returns Number of active streams
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Check if a stream is active
   *
   * @param transcriptionStream - The transcription stream to check
   * @returns True if stream is active
   */
  isStreamActive(transcriptionStream: TranscriptionStream): boolean {
    const stream = this.activeStreams.get(transcriptionStream.id);
    return stream ? stream.isActive : false;
  }

  /**
   * Attempt to reconnect a failed stream
   *
   * @param transcriptionStream - The transcription stream to reconnect
   */
  private async attemptReconnection(transcriptionStream: TranscriptionStream): Promise<void> {
    const stream = this.activeStreams.get(transcriptionStream.id);
    if (!stream) {
      return;
    }

    // Increment retry count
    stream.retryCount++;

    // Check if max retries exceeded
    if (stream.retryCount > this.reconnectionConfig.maxRetries) {
      console.error(
        `Max retries (${this.reconnectionConfig.maxRetries}) exceeded for stream ${stream.id}`
      );
      stream.isActive = false;
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectionConfig.initialDelayMs *
        Math.pow(this.reconnectionConfig.backoffMultiplier, stream.retryCount - 1),
      this.reconnectionConfig.maxDelayMs
    );

    console.log(
      `Attempting reconnection for stream ${stream.id} (attempt ${stream.retryCount}/${this.reconnectionConfig.maxRetries}) after ${delay}ms`
    );

    // Notify reconnection attempt
    if (this.eventHandlers.onReconnecting) {
      this.eventHandlers.onReconnecting(stream.retryCount);
    }

    // Wait before reconnecting
    await this.sleep(delay);

    try {
      // Get original config
      const config = this.streamConfigs.get(stream.id);

      // Create new stream
      const client = getSpeechClient();
      const recognitionConfig = getStreamingRecognitionConfig({
        encoding:
          config?.encoding || google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
        sampleRateHertz: config?.sampleRateHertz || 16000,
        languageCode: config?.languageCode || 'en-US',
      } as Partial<SpeechToTextConfig>);

      const request = {
        config: recognitionConfig,
        interimResults: config?.interimResults !== undefined ? config.interimResults : true,
      };

      const recognizeStream = client.streamingRecognize(request);

      // Set up event handlers
      recognizeStream.on('data', (data: any) => {
        this.handleStreamData(stream.id, data);
      });

      recognizeStream.on('error', (error: Error) => {
        this.handleStreamError(stream.id, error);
      });

      recognizeStream.on('end', () => {
        this.handleStreamEnd(stream.id);
      });

      // Replace old stream with new one
      stream.stream = recognizeStream;
      stream.isActive = true;

      // Replay buffered audio chunks
      console.log(`Replaying ${stream.audioBuffer.length} buffered audio chunks`);
      for (const chunk of stream.audioBuffer) {
        recognizeStream.write(chunk);
      }

      // Notify successful reconnection
      if (this.eventHandlers.onReconnected) {
        this.eventHandlers.onReconnected();
      }

      console.log(`Successfully reconnected stream ${stream.id}`);
    } catch (error) {
      console.error(`Reconnection failed for stream ${stream.id}:`, error);

      // Try again if retries remaining
      if (stream.retryCount < this.reconnectionConfig.maxRetries) {
        await this.attemptReconnection(transcriptionStream);
      } else {
        stream.isActive = false;
        if (this.eventHandlers.onError) {
          this.eventHandlers.onError(error as Error);
        }
      }
    }
  }

  /**
   * Sleep utility for delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transcribe a complete audio file (non-streaming)
   *
   * @param audioBuffer - Audio file buffer
   * @param config - Optional configuration
   * @returns Transcription result
   */
  async transcribeAudioFile(
    audioBuffer: Buffer,
    config?: Partial<SpeechToTextConfig>
  ): Promise<TranscriptionResult> {
    const client = getSpeechClient();

    const audio = {
      content: audioBuffer.toString('base64'),
    };

    const recognitionConfig = {
      encoding:
        config?.encoding || google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
      sampleRateHertz: config?.sampleRateHertz || 48000,
      languageCode: config?.languageCode || 'en-US',
      enableAutomaticPunctuation: true,
    };

    const request = {
      audio,
      config: recognitionConfig,
    };

    console.log('Sending audio to Google Speech-to-Text API...');
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      throw new Error('No transcription results returned');
    }

    // Combine all transcripts
    const transcript = response.results
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    const confidence = response.results[0]?.alternatives?.[0]?.confidence || 0;

    console.log(`Transcription result: "${transcript}" (confidence: ${confidence})`);

    return {
      transcript,
      isFinal: true,
      confidence,
    };
  }
}
