/**
 * Voice Note Service
 * 
 * Orchestrates the complete voice note workflow:
 * 1. Create recording session
 * 2. Process audio chunks with real-time transcription
 * 3. Finalize voice note with disambiguation → extraction → proposal
 * 
 * This service coordinates:
 * - TranscriptionService (Google Speech-to-Text)
 * - ContactDisambiguationService (Gemini API)
 * - EntityExtractionService (Gemini API)
 * - EnrichmentService (proposal generation)
 * - VoiceNoteRepository (persistence)
 * 
 * Requirements: 1.1-1.9, 2.1-2.6, 3.1-3.6
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  TranscriptionService,
  TranscriptionStream,
  TranscriptionResult,
} from './transcription-service';
import { ContactDisambiguationService } from './contact-disambiguation-service';
import { EntityExtractionService } from './entity-extraction-service';
import { EnrichmentService } from './enrichment-service';
import { VoiceNoteRepository } from './voice-repository';
import { Contact, VoiceNote, VoiceNoteStatus } from '../types';
import { MultiContactEnrichmentProposal } from './enrichment-service';

/**
 * Voice note session state
 */
export interface VoiceNoteSession {
  id: string;
  userId: string;
  transcriptionStream: TranscriptionStream;
  interimTranscript: string;
  finalTranscript: string;
  startTime: Date;
  status: VoiceNoteStatus;
}

/**
 * Session event types
 */
export enum SessionEvent {
  INTERIM_TRANSCRIPT = 'interim_transcript',
  FINAL_TRANSCRIPT = 'final_transcript',
  STATUS_CHANGE = 'status_change',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  RECONNECTED = 'reconnected',
}

/**
 * Voice Note Service
 * 
 * Main orchestration service for voice note processing.
 */
export class VoiceNoteService extends EventEmitter {
  private static instance: VoiceNoteService;
  
  private transcriptionService: TranscriptionService;
  private disambiguationService: ContactDisambiguationService;
  private extractionService: EntityExtractionService;
  private enrichmentService: EnrichmentService;
  private repository: VoiceNoteRepository;
  
  private activeSessions: Map<string, VoiceNoteSession> = new Map();

  constructor(
    transcriptionService?: TranscriptionService,
    disambiguationService?: ContactDisambiguationService,
    extractionService?: EntityExtractionService,
    enrichmentService?: EnrichmentService,
    repository?: VoiceNoteRepository
  ) {
    super();
    this.transcriptionService = transcriptionService || new TranscriptionService();
    this.disambiguationService = disambiguationService || new ContactDisambiguationService();
    this.extractionService = extractionService || new EntityExtractionService();
    this.enrichmentService = enrichmentService || new EnrichmentService();
    this.repository = repository || new VoiceNoteRepository();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): VoiceNoteService {
    if (!VoiceNoteService.instance) {
      VoiceNoteService.instance = new VoiceNoteService();
    }
    return VoiceNoteService.instance;
  }

  /**
   * Create a new voice note recording session
   * 
   * Initializes a streaming transcription session and returns session metadata.
   * 
   * Requirements: 1.1, 1.2, 1.3
   * 
   * @param userId - User ID
   * @param languageCode - Language code for transcription (default: 'en-US')
   * @returns Voice note session
   * 
   * @example
   * ```typescript
   * const session = await service.createSession('user-123');
   * console.log(`Session ${session.id} started`);
   * ```
   */
  async createSession(userId: string, languageCode: string = 'en-US'): Promise<VoiceNoteSession> {
    console.log(`Creating voice note session for user ${userId}`);
    
    // Start transcription stream
    const transcriptionStream = await this.transcriptionService.startStream({
      languageCode,
      interimResults: true,
    });
    
    console.log(`Transcription stream started: ${transcriptionStream.id}`);

    // Create session
    const session: VoiceNoteSession = {
      id: uuidv4(),
      userId,
      transcriptionStream,
      interimTranscript: '',
      finalTranscript: '',
      startTime: new Date(),
      status: 'recording',
    };

    // Store active session
    this.activeSessions.set(session.id, session);

    // Set up transcription event handlers
    this.setupTranscriptionHandlers(session);

    // Emit status change
    this.emitSessionEvent(session.id, SessionEvent.STATUS_CHANGE, {
      status: 'recording',
    });

    return session;
  }

  /**
   * Process an audio chunk for a session
   * 
   * Streams audio to Google Speech-to-Text for real-time transcription.
   * 
   * Requirements: 1.3, 1.4, 1.5
   * 
   * @param sessionId - Session ID
   * @param audioChunk - Audio data buffer
   * 
   * @example
   * ```typescript
   * await service.processAudioChunk(session.id, audioBuffer);
   * ```
   */
  async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'recording') {
      throw new Error(`Session ${sessionId} is not in recording state`);
    }

    // Send audio chunk to transcription stream
    await this.transcriptionService.sendAudioChunk(
      session.transcriptionStream,
      audioChunk
    );
  }

  /**
   * Finalize voice note and trigger processing pipeline
   * 
   * Orchestrates the complete workflow:
   * 1. Close transcription stream
   * 2. Disambiguate contacts
   * 3. Extract entities for each contact
   * 4. Generate enrichment proposal
   * 5. Persist voice note
   * 
   * Requirements: 1.7, 2.1-2.6, 3.1-3.6
   * 
   * @param sessionId - Session ID
   * @param userContacts - User's contact list for disambiguation
   * @returns Finalized voice note with enrichment proposal
   * 
   * @example
   * ```typescript
   * const result = await service.finalizeVoiceNote(session.id, userContacts);
   * console.log(`Voice note ${result.voiceNote.id} created`);
   * console.log(`Enrichment proposal has ${result.proposal.contactProposals.length} contacts`);
   * ```
   */
  async finalizeVoiceNote(
    sessionId: string,
    userContacts: Contact[]
  ): Promise<{
    voiceNote: VoiceNote;
    proposal: MultiContactEnrichmentProposal;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Update status to transcribing
      session.status = 'transcribing';
      this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
        status: 'transcribing',
      });

      // Close transcription stream
      await this.transcriptionService.closeStream(session.transcriptionStream);

      // Get final transcript
      const transcript = session.finalTranscript.trim();
      if (!transcript) {
        throw new Error('No transcript available');
      }

      // Create initial voice note record
      const voiceNote = await this.repository.create({
        userId: session.userId,
        transcript,
        recordingTimestamp: session.startTime,
        status: 'transcribing',
      });

      // Update status to extracting
      session.status = 'extracting';
      this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
        status: 'extracting',
      });

      // Step 1: Disambiguate contacts
      const disambiguationResult = await this.disambiguationService.disambiguateDetailed(
        transcript,
        userContacts
      );

      // Combine high-confidence matches
      const identifiedContacts = disambiguationResult.matches;

      // Step 2: Extract entities for each contact
      const entitiesMap = identifiedContacts.length > 0
        ? await this.extractionService.extractForMultipleContacts(
            transcript,
            identifiedContacts
          )
        : new Map();

      // Step 3: Generate enrichment proposal
      const proposal = await this.enrichmentService.generateProposal(
        voiceNote.id,
        entitiesMap,
        identifiedContacts
      );

      // Step 4: Associate contacts with voice note
      if (identifiedContacts.length > 0) {
        await this.repository.associateContacts(
          voiceNote.id,
          session.userId,
          identifiedContacts.map(c => c.id)
        );
      }

      // Step 5: Update voice note with extracted entities and status
      const updatedVoiceNote = await this.repository.update(
        voiceNote.id,
        session.userId,
        {
          extractedEntities: Object.fromEntries(entitiesMap),
          status: 'ready',
        }
      );

      // Update session status
      session.status = 'ready';
      this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
        status: 'ready',
      });

      // Clean up session
      this.activeSessions.delete(sessionId);

      return {
        voiceNote: updatedVoiceNote,
        proposal,
      };
    } catch (error) {
      // Update status to error
      session.status = 'error';
      this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
        status: 'error',
      });
      this.emitSessionEvent(sessionId, SessionEvent.ERROR, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get active session by ID
   * 
   * @param sessionId - Session ID
   * @returns Voice note session or undefined
   */
  getSession(sessionId: string): VoiceNoteSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Cancel an active session
   * 
   * @param sessionId - Session ID
   */
  async cancelSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Close transcription stream
    await this.transcriptionService.closeStream(session.transcriptionStream);

    // Remove session
    this.activeSessions.delete(sessionId);

    // Emit status change
    this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
      status: 'cancelled',
    });
  }

  /**
   * Get all active sessions for a user
   * 
   * @param userId - User ID
   * @returns Array of active sessions
   */
  getUserSessions(userId: string): VoiceNoteSession[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.userId === userId
    );
  }

  /**
   * Set up transcription event handlers for a session
   * 
   * @param session - Voice note session
   * @private
   */
  private setupTranscriptionHandlers(session: VoiceNoteSession): void {
    // Handle interim results
    this.transcriptionService.onInterimResult((result: TranscriptionResult) => {
      if (!result.isFinal) {
        session.interimTranscript = result.transcript;
        this.emitSessionEvent(session.id, SessionEvent.INTERIM_TRANSCRIPT, {
          transcript: result.transcript,
          confidence: result.confidence,
        });
      }
    });

    // Handle final results
    this.transcriptionService.onFinalResult((result: TranscriptionResult) => {
      if (result.isFinal) {
        // Append to final transcript
        session.finalTranscript += (session.finalTranscript ? ' ' : '') + result.transcript;
        
        // Clear interim transcript
        session.interimTranscript = '';
        
        this.emitSessionEvent(session.id, SessionEvent.FINAL_TRANSCRIPT, {
          transcript: result.transcript,
          fullTranscript: session.finalTranscript,
          confidence: result.confidence,
        });
      }
    });

    // Handle errors
    this.transcriptionService.onError((error: Error) => {
      console.error(`Transcription error for session ${session.id}:`, error);
      this.emitSessionEvent(session.id, SessionEvent.ERROR, {
        error: error.message,
      });
    });

    // Handle reconnection attempts
    this.transcriptionService.onReconnecting((attempt: number) => {
      this.emitSessionEvent(session.id, SessionEvent.RECONNECTING, {
        attempt,
      });
    });

    // Handle successful reconnection
    this.transcriptionService.onReconnected(() => {
      this.emitSessionEvent(session.id, SessionEvent.RECONNECTED, {});
    });
  }

  /**
   * Emit a session event
   * 
   * @param sessionId - Session ID
   * @param event - Event type
   * @param data - Event data
   * @private
   */
  private emitSessionEvent(sessionId: string, event: SessionEvent, data: any): void {
    this.emit(event, {
      sessionId,
      ...data,
    });
  }
}

// Export singleton instance
export const voiceNoteService = new VoiceNoteService();
