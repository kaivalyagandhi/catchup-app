/**
 * AI Processor Service for SMS/MMS Enrichment
 *
 * Handles AI processing of different content types:
 * - Text: Extract enrichments using Gemini API
 * - Audio: Transcribe using Speech-to-Text, then extract enrichments
 * - Image: Analyze using Gemini Vision API
 * - Video: Analyze using Gemini multimodal API
 *
 * Requirements: 2.3, 3.2, 3.3, 4.2, 4.3, 5.2, 5.3
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from '@google-cloud/speech/build/protos/protos';
import { getSpeechClient } from '../integrations/google-speech-config';
import { getGeminiClient } from '../integrations/google-gemini-config';
import { smsMonitoringService } from './sms-monitoring-service';

/**
 * Enrichment data extracted from content
 */
export interface EnrichmentData {
  contacts: Array<{
    name: string;
    context: string;
  }>;
  tags: string[];
  locations: string[];
  notes: string;
}

/**
 * AI processing result
 */
export interface ProcessingResult {
  enrichments: EnrichmentData;
  processingTime: number;
  transcript?: string; // For audio/video content
}

/**
 * AI Processor Service
 */
export class AIProcessor {
  private geminiClient: GoogleGenerativeAI;

  constructor() {
    this.geminiClient = getGeminiClient();
  }

  /**
   * Extract enrichments from text using Gemini API
   *
   * Requirements: 2.3
   *
   * @param text - Text content to analyze
   * @returns Enrichment data
   */
  async extractFromText(text: string): Promise<EnrichmentData> {
    const startTime = Date.now();

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `Extract contact enrichment information from this text message.

Text: "${text}"

Extract the following information:
1. Contact names mentioned (people the user is talking about)
2. Tags (1-3 word descriptors of interests, hobbies, or characteristics)
3. Locations mentioned (cities, places, venues)
4. Notes (any other relevant context about the contacts)

Return a JSON object with this structure:
{
  "contacts": [{"name": "string", "context": "string"}],
  "tags": ["string"],
  "locations": ["string"],
  "notes": "string"
}

If no information is found for a category, return an empty array or empty string.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const jsonText = response.text();

      const enrichments = JSON.parse(jsonText) as EnrichmentData;

      const processingTime = Date.now() - startTime;
      console.log(`Text enrichment extraction completed in ${processingTime}ms`);

      // Track AI call
      smsMonitoringService.trackAICall('gemini', processingTime, true);
      smsMonitoringService.trackGoogleCloudCost('gemini', 1);

      return enrichments;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Error extracting enrichments from text:', error);

      // Track failed AI call
      smsMonitoringService.trackAICall('gemini', processingTime, false);

      throw new Error(`Failed to extract enrichments from text: ${(error as Error).message}`);
    }
  }

  /**
   * Transcribe audio using Speech-to-Text API
   *
   * Requirements: 3.2
   *
   * @param audioBuffer - Audio file buffer
   * @returns Transcription text
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const startTime = Date.now();

    try {
      const client = getSpeechClient();

      const audio = {
        content: audioBuffer.toString('base64'),
      };

      // Configure for common audio formats from MMS
      const config = {
        encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.OGG_OPUS,
        sampleRateHertz: 48000,
        languageCode: process.env.SPEECH_TO_TEXT_LANGUAGE_CODE || 'en-US',
        enableAutomaticPunctuation: true,
        model: 'default',
      };

      const request = {
        audio,
        config,
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
      const processingTime = Date.now() - startTime;

      console.log(
        `Audio transcription completed in ${processingTime}ms: "${transcript}" (confidence: ${confidence})`
      );

      // Track AI call - estimate audio duration (rough estimate: 1 minute per 100KB)
      const audioMinutes = Math.max(0.1, audioBuffer.length / (100 * 1024));
      smsMonitoringService.trackAICall('speechToText', processingTime, true);
      smsMonitoringService.trackGoogleCloudCost('speechToText', audioMinutes);

      return transcript;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Error transcribing audio:', error);

      // Track failed AI call
      smsMonitoringService.trackAICall('speechToText', processingTime, false);

      throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
    }
  }

  /**
   * Extract enrichments from audio (transcribe + extract)
   *
   * Requirements: 3.2, 3.3
   *
   * @param audioBuffer - Audio file buffer
   * @returns Processing result with enrichments and transcript
   */
  async extractFromAudio(audioBuffer: Buffer): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Transcribe audio
      const transcript = await this.transcribeAudio(audioBuffer);

      // Step 2: Extract enrichments from transcript
      const enrichments = await this.extractFromText(transcript);

      const processingTime = Date.now() - startTime;

      return {
        enrichments,
        processingTime,
        transcript,
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  /**
   * Extract enrichments from image using Gemini Vision API
   *
   * Requirements: 4.2, 4.3
   *
   * @param imageBuffer - Image file buffer
   * @returns Enrichment data
   */
  async extractFromImage(imageBuffer: Buffer): Promise<EnrichmentData> {
    const startTime = Date.now();

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `Analyze this image and extract contact enrichment information.

Look for:
1. Business cards (extract names, contact info)
2. Text in the image (signs, documents, etc.)
3. People in the image (if identifiable)
4. Locations or venues visible
5. Activities or interests shown
6. Any other relevant context

Return a JSON object with this structure:
{
  "contacts": [{"name": "string", "context": "string"}],
  "tags": ["string"],
  "locations": ["string"],
  "notes": "string"
}

If no information is found for a category, return an empty array or empty string.`;

      // Convert buffer to base64 for Gemini API
      const imageBase64 = imageBuffer.toString('base64');

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg', // Twilio typically sends JPEG
          },
        },
      ]);

      const response = result.response;
      const jsonText = response.text();

      const enrichments = JSON.parse(jsonText) as EnrichmentData;

      const processingTime = Date.now() - startTime;
      console.log(`Image enrichment extraction completed in ${processingTime}ms`);

      // Track AI call
      smsMonitoringService.trackAICall('gemini', processingTime, true);
      smsMonitoringService.trackGoogleCloudCost('gemini', 1);

      return enrichments;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Error extracting enrichments from image:', error);

      // Track failed AI call
      smsMonitoringService.trackAICall('gemini', processingTime, false);

      throw new Error(`Failed to extract enrichments from image: ${(error as Error).message}`);
    }
  }

  /**
   * Extract enrichments from video using Gemini multimodal API
   *
   * Requirements: 5.2, 5.3
   *
   * @param videoBuffer - Video file buffer
   * @returns Processing result with enrichments
   */
  async extractFromVideo(videoBuffer: Buffer): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `Analyze this video and extract contact enrichment information.

Look for:
1. People in the video (names if mentioned or visible)
2. Spoken content (conversations, mentions)
3. Visual context (locations, activities, events)
4. Text visible in the video (signs, captions, etc.)
5. Interests or hobbies shown
6. Any other relevant context about relationships

Return a JSON object with this structure:
{
  "contacts": [{"name": "string", "context": "string"}],
  "tags": ["string"],
  "locations": ["string"],
  "notes": "string"
}

If no information is found for a category, return an empty array or empty string.`;

      // Convert buffer to base64 for Gemini API
      const videoBase64 = videoBuffer.toString('base64');

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: videoBase64,
            mimeType: 'video/mp4', // Twilio typically sends MP4
          },
        },
      ]);

      const response = result.response;
      const jsonText = response.text();

      const enrichments = JSON.parse(jsonText) as EnrichmentData;

      const processingTime = Date.now() - startTime;
      console.log(`Video enrichment extraction completed in ${processingTime}ms`);

      // Track AI call
      smsMonitoringService.trackAICall('gemini', processingTime, true);
      smsMonitoringService.trackGoogleCloudCost('gemini', 1);

      return {
        enrichments,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Error extracting enrichments from video:', error);

      // Track failed AI call
      smsMonitoringService.trackAICall('gemini', processingTime, false);

      throw new Error(`Failed to extract enrichments from video: ${(error as Error).message}`);
    }
  }

  /**
   * Process content based on type
   *
   * Convenience method that routes to the appropriate processor.
   *
   * @param content - Content buffer or text
   * @param contentType - MIME type of the content
   * @returns Processing result
   */
  async processContent(
    content: Buffer | string,
    contentType: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      let enrichments: EnrichmentData;
      let transcript: string | undefined;

      if (typeof content === 'string') {
        // Text content
        enrichments = await this.extractFromText(content);
      } else if (contentType.startsWith('audio/')) {
        // Audio content
        const result = await this.extractFromAudio(content);
        enrichments = result.enrichments;
        transcript = result.transcript;
      } else if (contentType.startsWith('image/')) {
        // Image content
        enrichments = await this.extractFromImage(content);
      } else if (contentType.startsWith('video/')) {
        // Video content
        const result = await this.extractFromVideo(content);
        enrichments = result.enrichments;
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        enrichments,
        processingTime,
        transcript,
      };
    } catch (error) {
      console.error('Error processing content:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiProcessor = new AIProcessor();
