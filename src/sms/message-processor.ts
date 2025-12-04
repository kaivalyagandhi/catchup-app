/**
 * Message Processor Service
 *
 * Routes incoming SMS/MMS messages to appropriate AI processors,
 * stores enrichments in database with correct metadata, and handles
 * error recovery with retry logic.
 *
 * Requirements: 2.3, 2.4, 3.4, 4.4, 5.4
 */

import pool from '../db/connection';
import { TwilioWebhookPayload } from '../api/routes/sms-webhook';
import { AIProcessor, EnrichmentData, ProcessingResult } from './ai-processor';
import { MediaDownloader, MediaDownloadResult } from './media-downloader';
import { incrementSMSCounter } from './sms-rate-limiter';
import {
  processWithErrorHandling,
  ErrorContext,
  DEFAULT_RETRY_CONFIG,
  logErrorWithContext,
  notifyUserOfFailure,
  SMSProcessingError,
} from './sms-error-handler';
import { smsMonitoringService } from './sms-monitoring-service';

/**
 * Message type classification
 */
export enum MessageType {
  SMS = 'sms',
  MMS = 'mms',
}

/**
 * Content type classification
 */
export enum ContentType {
  TEXT = 'text',
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * Message processing result
 */
export interface MessageProcessingResult {
  success: boolean;
  enrichmentIds: string[];
  error?: string;
  processingTime: number;
}

/**
 * Message Processor Service
 */
export class MessageProcessor {
  private aiProcessor: AIProcessor;
  private mediaDownloader: MediaDownloader;

  constructor(aiProcessor?: AIProcessor, mediaDownloader?: MediaDownloader) {
    this.aiProcessor = aiProcessor || new AIProcessor();
    this.mediaDownloader = mediaDownloader || new MediaDownloader();
  }

  /**
   * Process an incoming message from Twilio webhook
   *
   * Requirements: 2.3 - Process messages and extract enrichments
   * Requirements: 9.1, 9.2, 9.3, 9.4 - Comprehensive error handling
   *
   * @param payload - Twilio webhook payload
   * @param userId - User ID (from phone number lookup)
   * @returns Processing result
   */
  async processMessage(
    payload: TwilioWebhookPayload,
    userId: string
  ): Promise<MessageProcessingResult> {
    const startTime = Date.now();

    // Detect message type and content type early for error context
    const messageType = this.detectMessageType(payload);
    const contentType = this.detectContentType(payload);

    // Track message received
    smsMonitoringService.trackMessageReceived(messageType, contentType);

    // Build error context for comprehensive logging
    // Requirement 9.1: Include user ID, message type, and error details
    const errorContext: ErrorContext = {
      userId,
      phoneNumber: payload.From,
      messageSid: payload.MessageSid,
      messageType,
      contentType,
      mediaUrl: payload.MediaUrl0,
      timestamp: new Date(),
    };

    try {
      // Increment rate limit counter
      await incrementSMSCounter(payload.From);

      console.log('Processing message:', {
        messageSid: payload.MessageSid,
        userId,
        messageType,
        contentType,
      });

      // Process with comprehensive error handling
      // Requirements: 9.2 - Retry with exponential backoff (max 3 attempts)
      // Requirements: 9.3 - Notify user after all retries fail
      // Requirements: 9.4 - Fail immediately for unrecoverable errors
      const result = await processWithErrorHandling(
        async () => {
          return await this.routeToProcessor(payload, userId, messageType, contentType);
        },
        errorContext,
        DEFAULT_RETRY_CONFIG
      );

      const processingTime = Date.now() - startTime;

      if (result.success && result.result) {
        // Track successful processing
        smsMonitoringService.trackMessageProcessed(messageType, contentType, processingTime, true);

        return {
          success: true,
          enrichmentIds: result.result.enrichmentIds,
          processingTime,
        };
      } else {
        // Track failed processing
        smsMonitoringService.trackMessageProcessed(messageType, contentType, processingTime, false);

        // Track error
        const errorType = (result.error as SMSProcessingError)?.errorType || 'UNKNOWN_ERROR';
        smsMonitoringService.trackError(
          errorType,
          result.error?.message || 'Processing failed',
          errorContext
        );

        // Error was handled and user was notified
        return {
          success: false,
          enrichmentIds: [],
          error: result.error?.message || 'Processing failed',
          processingTime,
        };
      }
    } catch (error) {
      // Unexpected error outside of error handling
      const processingTime = Date.now() - startTime;
      console.error('Unexpected message processing error:', error);

      // Track failed processing
      smsMonitoringService.trackMessageProcessed(messageType, contentType, processingTime, false);

      // Track error
      const errorType = (error as SMSProcessingError)?.errorType || 'UNEXPECTED_ERROR';
      smsMonitoringService.trackError(errorType, (error as Error).message, errorContext);

      // Log with context
      await logErrorWithContext(error as Error, errorContext);

      // Notify user
      await notifyUserOfFailure(
        userId,
        payload.From,
        (error as SMSProcessingError).errorType,
        errorContext
      );

      return {
        success: false,
        enrichmentIds: [],
        error: (error as Error).message,
        processingTime,
      };
    }
  }

  /**
   * Detect message type (SMS vs MMS)
   *
   * @param payload - Twilio webhook payload
   * @returns Message type
   */
  private detectMessageType(payload: TwilioWebhookPayload): MessageType {
    const numMedia = parseInt(payload.NumMedia || '0', 10);
    return numMedia > 0 ? MessageType.MMS : MessageType.SMS;
  }

  /**
   * Detect content type from message
   *
   * @param payload - Twilio webhook payload
   * @returns Content type
   */
  private detectContentType(payload: TwilioWebhookPayload): ContentType {
    const numMedia = parseInt(payload.NumMedia || '0', 10);

    if (numMedia === 0) {
      return ContentType.TEXT;
    }

    // Check first media item's content type
    const mediaContentType = payload.MediaContentType0 || '';

    if (mediaContentType.startsWith('audio/')) {
      return ContentType.AUDIO;
    } else if (mediaContentType.startsWith('image/')) {
      return ContentType.IMAGE;
    } else if (mediaContentType.startsWith('video/')) {
      return ContentType.VIDEO;
    }

    // Default to text if we can't determine
    return ContentType.TEXT;
  }

  /**
   * Route message to appropriate AI processor
   *
   * Requirements: 2.3 - Route to appropriate processor
   *
   * @param payload - Twilio webhook payload
   * @param userId - User ID
   * @param messageType - Message type (SMS/MMS)
   * @param contentType - Content type (text/audio/image/video)
   * @returns Processing result with enrichment IDs
   */
  private async routeToProcessor(
    payload: TwilioWebhookPayload,
    userId: string,
    messageType: MessageType,
    contentType: ContentType
  ): Promise<{ enrichmentIds: string[] }> {
    let processingResult: ProcessingResult;
    let mediaUrl: string | undefined;
    let mediaContentType: string | undefined;

    switch (contentType) {
      case ContentType.TEXT:
        // Process text message
        const text = payload.Body || '';
        processingResult = await this.aiProcessor.processContent(text, 'text/plain');
        break;

      case ContentType.AUDIO:
        // Download and process audio
        mediaUrl = payload.MediaUrl0;
        mediaContentType = payload.MediaContentType0;
        if (!mediaUrl) {
          throw new Error('Audio URL not found in payload');
        }
        processingResult = await this.processMedia(mediaUrl, mediaContentType || 'audio/ogg');
        break;

      case ContentType.IMAGE:
        // Download and process image
        mediaUrl = payload.MediaUrl0;
        mediaContentType = payload.MediaContentType0;
        if (!mediaUrl) {
          throw new Error('Image URL not found in payload');
        }
        processingResult = await this.processMedia(mediaUrl, mediaContentType || 'image/jpeg');
        break;

      case ContentType.VIDEO:
        // Download and process video
        mediaUrl = payload.MediaUrl0;
        mediaContentType = payload.MediaContentType0;
        if (!mediaUrl) {
          throw new Error('Video URL not found in payload');
        }
        processingResult = await this.processMedia(mediaUrl, mediaContentType || 'video/mp4');
        break;

      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Store enrichments in database
    const enrichmentIds = await this.storeEnrichments(
      userId,
      processingResult.enrichments,
      messageType,
      contentType,
      {
        phoneNumber: payload.From,
        messageSid: payload.MessageSid,
        mediaType: mediaContentType,
        originalMessage: payload.Body,
        transcript: processingResult.transcript,
      }
    );

    return { enrichmentIds };
  }

  /**
   * Download and process media file
   *
   * @param mediaUrl - URL to download media from
   * @param contentType - MIME type of the media
   * @returns Processing result
   */
  private async processMedia(mediaUrl: string, contentType: string): Promise<ProcessingResult> {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      throw new Error('TWILIO_AUTH_TOKEN not configured');
    }

    // Download media
    const downloadResult: MediaDownloadResult = await this.mediaDownloader.downloadMedia(
      mediaUrl,
      authToken
    );

    try {
      // Process with AI
      const result = await this.aiProcessor.processContent(
        downloadResult.buffer,
        downloadResult.contentType
      );

      return result;
    } finally {
      // Clean up temporary file if it exists
      if (downloadResult.tempFilePath) {
        await this.mediaDownloader.deleteTempFile(downloadResult.tempFilePath);
      }
    }
  }

  /**
   * Store enrichments in database with correct metadata
   *
   * Requirements: 2.4 - Store with source type "sms"
   * Requirements: 3.4 - Store with source type "mms" and media type "audio"
   * Requirements: 4.4 - Store with source type "mms" and media type "image"
   * Requirements: 5.4 - Store with source type "mms" and media type "video"
   *
   * @param userId - User ID
   * @param enrichments - Extracted enrichment data
   * @param messageType - Message type (SMS/MMS)
   * @param contentType - Content type
   * @param metadata - Source metadata
   * @returns Array of created enrichment IDs
   */
  private async storeEnrichments(
    userId: string,
    enrichments: EnrichmentData,
    messageType: MessageType,
    contentType: ContentType,
    metadata: {
      phoneNumber: string;
      messageSid: string;
      mediaType?: string;
      originalMessage?: string;
      transcript?: string;
    }
  ): Promise<string[]> {
    const client = await pool.connect();
    const enrichmentIds: string[] = [];

    try {
      await client.query('BEGIN');

      // Determine source type
      // Requirement 2.4: SMS messages get source "sms"
      // Requirements 3.4, 4.4, 5.4: MMS messages get source "mms"
      const source = messageType === MessageType.SMS ? 'sms' : 'mms';

      // Build source metadata
      const sourceMetadata: Record<string, any> = {
        phoneNumber: metadata.phoneNumber,
        messageSid: metadata.messageSid,
      };

      if (messageType === MessageType.MMS) {
        // Requirements 3.4, 4.4, 5.4: Include media type for MMS
        sourceMetadata.mediaType = metadata.mediaType || contentType;
      }

      if (metadata.originalMessage) {
        sourceMetadata.originalMessage = metadata.originalMessage;
      }

      if (metadata.transcript) {
        sourceMetadata.transcript = metadata.transcript;
      }

      // Store contact enrichments
      for (const contact of enrichments.contacts) {
        const result = await client.query(
          `INSERT INTO enrichment_items (
            user_id, item_type, action, value, 
            source, source_metadata, accepted, applied
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            userId,
            'field', // Contact mentions are stored as field enrichments
            'add',
            JSON.stringify({ name: contact.name, context: contact.context }),
            source,
            JSON.stringify(sourceMetadata),
            false, // Requirement 6.1: Default to pending (not accepted)
            false,
          ]
        );
        enrichmentIds.push(result.rows[0].id);
      }

      // Store tag enrichments
      for (const tag of enrichments.tags) {
        const result = await client.query(
          `INSERT INTO enrichment_items (
            user_id, item_type, action, value,
            source, source_metadata, accepted, applied
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            userId,
            'tag',
            'add',
            tag,
            source,
            JSON.stringify(sourceMetadata),
            false, // Requirement 6.1: Default to pending
            false,
          ]
        );
        enrichmentIds.push(result.rows[0].id);
      }

      // Store location enrichments
      for (const location of enrichments.locations) {
        const result = await client.query(
          `INSERT INTO enrichment_items (
            user_id, item_type, action, field_name, value,
            source, source_metadata, accepted, applied
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            userId,
            'field',
            'add',
            'location',
            location,
            source,
            JSON.stringify(sourceMetadata),
            false, // Requirement 6.1: Default to pending
            false,
          ]
        );
        enrichmentIds.push(result.rows[0].id);
      }

      // Store notes enrichment
      if (enrichments.notes && enrichments.notes.trim()) {
        const result = await client.query(
          `INSERT INTO enrichment_items (
            user_id, item_type, action, field_name, value,
            source, source_metadata, accepted, applied
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            userId,
            'field',
            'add',
            'customNotes',
            enrichments.notes,
            source,
            JSON.stringify(sourceMetadata),
            false, // Requirement 6.1: Default to pending
            false,
          ]
        );
        enrichmentIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');

      console.log(`Stored ${enrichmentIds.length} enrichment items for user ${userId}`);

      return enrichmentIds;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to store enrichments:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const messageProcessor = new MessageProcessor();
