/**
 * Google Cloud Speech-to-Text Configuration
 * 
 * This module provides configuration and client initialization for Google Cloud Speech-to-Text API.
 * Supports both service account authentication and API key authentication.
 */

import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

/**
 * Configuration options for Speech-to-Text streaming
 */
export interface SpeechToTextConfig {
  encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
  sampleRateHertz: number;
  languageCode: string;
  enableAutomaticPunctuation: boolean;
  model: string;
  useEnhanced: boolean;
}

/**
 * Default configuration for Speech-to-Text
 */
export const DEFAULT_SPEECH_CONFIG: SpeechToTextConfig = {
  encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
  sampleRateHertz: 16000,
  languageCode: process.env.SPEECH_TO_TEXT_LANGUAGE_CODE || 'en-US',
  enableAutomaticPunctuation: true,
  model: 'default',
  useEnhanced: false,
};

/**
 * Initialize Speech-to-Text client
 * 
 * Authentication methods (in order of precedence):
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (service account JSON file path)
 * 2. GOOGLE_CLOUD_API_KEY environment variable (API key)
 * 3. Default application credentials (for GCP environments)
 * 
 * @returns Initialized SpeechClient instance
 * @throws Error if no valid authentication method is found
 */
export function initializeSpeechClient(): SpeechClient {
  try {
    // Check if service account credentials are provided
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Initializing Speech-to-Text client with service account credentials');
      return new SpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    }

    // Check if API key is provided (less secure, for development)
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      console.log('Initializing Speech-to-Text client with API key');
      return new SpeechClient({
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
      });
    }

    // Fall back to default application credentials
    console.log('Initializing Speech-to-Text client with default credentials');
    return new SpeechClient();
  } catch (error) {
    console.error('Failed to initialize Speech-to-Text client:', error);
    throw new Error(
      'Failed to initialize Google Cloud Speech-to-Text client. ' +
      'Please ensure GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY is set.'
    );
  }
}

/**
 * Validate Speech-to-Text configuration
 * 
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSpeechConfig(config: Partial<SpeechToTextConfig>): void {
  if (config.sampleRateHertz && (config.sampleRateHertz < 8000 || config.sampleRateHertz > 48000)) {
    throw new Error('Sample rate must be between 8000 and 48000 Hz');
  }

  if (config.languageCode && !/^[a-z]{2}-[A-Z]{2}$/.test(config.languageCode)) {
    throw new Error('Language code must be in format: xx-XX (e.g., en-US)');
  }
}

/**
 * Get streaming recognition config for Speech-to-Text API
 * 
 * @param customConfig Optional custom configuration to override defaults
 * @returns Recognition config for streaming requests
 */
export function getStreamingRecognitionConfig(
  customConfig?: Partial<SpeechToTextConfig>
): google.cloud.speech.v1.IRecognitionConfig {
  const config = { ...DEFAULT_SPEECH_CONFIG, ...customConfig };
  
  validateSpeechConfig(config);

  return {
    encoding: config.encoding,
    sampleRateHertz: config.sampleRateHertz,
    languageCode: config.languageCode,
    enableAutomaticPunctuation: config.enableAutomaticPunctuation,
    model: config.model,
    useEnhanced: config.useEnhanced,
  };
}

/**
 * Singleton Speech-to-Text client instance
 */
let speechClientInstance: SpeechClient | null = null;

/**
 * Get or create Speech-to-Text client instance
 * 
 * @returns Singleton SpeechClient instance
 */
export function getSpeechClient(): SpeechClient {
  if (!speechClientInstance) {
    speechClientInstance = initializeSpeechClient();
  }
  return speechClientInstance;
}

/**
 * Close Speech-to-Text client and cleanup resources
 */
export async function closeSpeechClient(): Promise<void> {
  if (speechClientInstance) {
    await speechClientInstance.close();
    speechClientInstance = null;
  }
}
