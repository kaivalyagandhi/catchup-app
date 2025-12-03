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
import { Contact, VoiceNote, VoiceNoteStatus, ExtractedEntities } from '../types';
import { MultiContactEnrichmentProposal } from './enrichment-service';
import { IncrementalEnrichmentAnalyzer, EnrichmentSuggestion } from './incremental-enrichment-analyzer';

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
  pausedAt?: Date;
  totalPausedDuration: number; // in milliseconds
  pauseTimeoutId?: NodeJS.Timeout;
  audioSegments: Buffer[]; // For long recording segmentation
  lastSegmentTime: Date;
  userContacts?: Contact[]; // User's contacts for incremental enrichment context
  emittedSuggestionIds?: Set<string>; // Track which suggestions have been emitted to avoid duplicates
}

/**
 * Configuration constants
 */
const LONG_RECORDING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const PAUSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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
  PAUSE_TIMEOUT = 'pause_timeout',
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
  private enrichmentAnalyzer: IncrementalEnrichmentAnalyzer;
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
    this.enrichmentAnalyzer = new IncrementalEnrichmentAnalyzer(
      this.extractionService,
      this.disambiguationService
    );
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
      totalPausedDuration: 0,
      audioSegments: [],
      lastSegmentTime: new Date(),
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
   * Handles long recording segmentation for recordings exceeding 10 minutes.
   * 
   * Requirements: 1.3, 1.4, 1.5, 7.5
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

    console.log(`[VoiceNoteService] Received audio chunk for session ${sessionId}: ${audioChunk.byteLength} bytes`);

    // Store audio chunk for segmentation
    session.audioSegments.push(audioChunk);

    // Check if recording exceeds 10 minutes
    const recordingDuration = this.getElapsedRecordingTime(sessionId);
    if (recordingDuration >= LONG_RECORDING_THRESHOLD_MS) {
      // Check if we need to create a new segment (every 10 minutes of recording time)
      const timeSinceLastSegment = Date.now() - session.lastSegmentTime.getTime();
      if (timeSinceLastSegment >= LONG_RECORDING_THRESHOLD_MS) {
        await this.segmentLongRecording(sessionId);
      }
    }

    // Send audio chunk to transcription stream
    console.log(`[VoiceNoteService] Sending audio chunk to transcription stream ${session.transcriptionStream.id}`);
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

      // Check if we have incremental enrichment results to use
      const incrementalSuggestions = this.enrichmentAnalyzer.getSuggestions(sessionId);
      
      let identifiedContacts: Contact[] = [];
      let entitiesMap: Map<string, ExtractedEntities> = new Map();

      if (incrementalSuggestions && incrementalSuggestions.length > 0) {
        // Use incremental results - convert suggestions back to entities format
        console.log(`Using ${incrementalSuggestions.length} incremental suggestions for finalization`);
        
        // Get unique contact names from suggestions
        const contactNames = new Set<string>();
        for (const suggestion of incrementalSuggestions) {
          if (suggestion.contactHint) {
            contactNames.add(suggestion.contactHint);
          }
        }

        // Match contact names to actual contacts using fuzzy matching
        for (const name of contactNames) {
          // Try exact match first
          let contact = userContacts.find(c => 
            c.name.toLowerCase() === name.toLowerCase()
          );
          
          // If no exact match, try partial/fuzzy matching
          if (!contact) {
            const nameLower = name.toLowerCase();
            const nameParts = nameLower.split(/\s+/);
            
            // Try to find contact by first or last name
            contact = userContacts.find(c => {
              const contactNameLower = c.name.toLowerCase();
              const contactParts = contactNameLower.split(/\s+/);
              
              // Check if any part of the extracted name matches any part of the contact name
              return nameParts.some(part => 
                contactParts.some(cPart => 
                  cPart.includes(part) || part.includes(cPart)
                )
              );
            });
          }
          
          if (contact) {
            identifiedContacts.push(contact);
          } else {
            console.warn(`[VoiceNoteService] Could not find contact for name: "${name}"`);
          }
        }

        // Convert suggestions to entities map
        for (const contact of identifiedContacts) {
          const contactSuggestions = incrementalSuggestions.filter(
            s => s.contactHint?.toLowerCase() === contact.name.toLowerCase()
          );
          
          const entities: ExtractedEntities = {
            fields: {},
            tags: [],
            groups: [],
            lastContactDate: undefined,
          };

          for (const suggestion of contactSuggestions) {
            switch (suggestion.type) {
              case 'location':
                entities.fields.location = suggestion.value;
                break;
              case 'phone':
                entities.fields.phone = suggestion.value;
                break;
              case 'email':
                entities.fields.email = suggestion.value;
                break;
              case 'note':
                entities.fields.customNotes = suggestion.value;
                break;
              case 'tag':
                entities.tags.push(suggestion.value);
                break;
              case 'interest':
                entities.groups.push(suggestion.value);
                break;
            }
          }

          entitiesMap.set(contact.id, entities);
        }
      } else {
        // No incremental results - run full extraction (fallback)
        console.log('No incremental suggestions, running full extraction');
        
        // Step 1: Disambiguate contacts
        const disambiguationResult = await this.disambiguationService.disambiguateDetailed(
          transcript,
          userContacts
        );

        identifiedContacts = disambiguationResult.matches;

        // Step 2: Extract entities for each contact
        entitiesMap = identifiedContacts.length > 0
          ? await this.extractionService.extractForMultipleContacts(
              transcript,
              identifiedContacts
            )
          : new Map();
      }

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
      this.enrichmentAnalyzer.clearSession(sessionId);

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
   * Pause an active session
   * 
   * Stops capturing audio and preserves the current transcript state.
   * Tracks when the session was paused to calculate total paused duration.
   * Starts a 5-minute timeout timer to prompt the user.
   * 
   * Requirements: 6.1, 6.2, 6.4
   * 
   * @param sessionId - Session ID
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'recording') {
      throw new Error(`Session ${sessionId} is not in recording state`);
    }

    // Record pause time
    session.pausedAt = new Date();
    session.status = 'paused';
    
    // Start 5-minute timeout
    session.pauseTimeoutId = setTimeout(() => {
      this.handlePauseTimeout(sessionId);
    }, PAUSE_TIMEOUT_MS);
    
    this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
      status: 'paused',
      pausedAt: session.pausedAt,
    });
  }

  /**
   * Resume a paused session
   * 
   * Continues capturing audio and appending to the existing transcript.
   * Calculates and accumulates the paused duration.
   * 
   * Requirements: 6.1, 6.2
   * 
   * @param sessionId - Session ID
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
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

    // Clear pause timeout if it exists
    if (session.pauseTimeoutId) {
      clearTimeout(session.pauseTimeoutId);
      session.pauseTimeoutId = undefined;
    }

    session.status = 'recording';
    
    this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
      status: 'recording',
      totalPausedDuration: session.totalPausedDuration,
    });
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

    // Clear pause timeout if it exists
    if (session.pauseTimeoutId) {
      clearTimeout(session.pauseTimeoutId);
      session.pauseTimeoutId = undefined;
    }

    // Close transcription stream
    await this.transcriptionService.closeStream(session.transcriptionStream);

    // Remove session
    this.activeSessions.delete(sessionId);
    this.enrichmentAnalyzer.clearSession(sessionId);

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
   * Get elapsed recording time for a session (excluding paused duration)
   * 
   * @param sessionId - Session ID
   * @returns Elapsed time in milliseconds
   */
  getElapsedRecordingTime(sessionId: string): number {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const totalElapsed = Date.now() - session.startTime.getTime();
    
    // If currently paused, add the current pause duration
    let currentPauseDuration = 0;
    if (session.status === 'paused' && session.pausedAt) {
      currentPauseDuration = Date.now() - session.pausedAt.getTime();
    }

    return totalElapsed - session.totalPausedDuration - currentPauseDuration;
  }

  /**
   * Handle pause timeout (5 minutes)
   * 
   * Emits a timeout event to prompt the user to continue or finalize.
   * 
   * Requirements: 6.4
   * 
   * @param sessionId - Session ID
   * @private
   */
  private handlePauseTimeout(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return; // Session may have been finalized or cancelled
    }

    if (session.status !== 'paused') {
      return; // Session was resumed before timeout
    }

    // Emit timeout event
    this.emitSessionEvent(sessionId, SessionEvent.PAUSE_TIMEOUT, {
      pausedDuration: session.pausedAt 
        ? Date.now() - session.pausedAt.getTime() 
        : 0,
    });
  }

  /**
   * Segment long recording into manageable chunks
   * 
   * For recordings exceeding 10 minutes, this method creates a segment
   * boundary and prepares for the next segment. This helps with processing
   * and prevents memory issues with very long recordings.
   * 
   * Requirements: 7.5
   * 
   * @param sessionId - Session ID
   * @private
   */
  private async segmentLongRecording(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    console.log(`Segmenting long recording for session ${sessionId}`);

    // Mark the current segment boundary in the transcript
    // This helps identify where segments were split during processing
    session.finalTranscript += ' [SEGMENT] ';

    // Update last segment time
    session.lastSegmentTime = new Date();

    // Clear old audio segments to free memory
    // Keep only recent segments (last 1 minute worth)
    const recentSegmentCount = Math.min(session.audioSegments.length, 600); // ~1 min at 100ms chunks
    session.audioSegments = session.audioSegments.slice(-recentSegmentCount);

    // Emit event for monitoring/logging
    this.emitSessionEvent(sessionId, SessionEvent.STATUS_CHANGE, {
      status: session.status,
      segmented: true,
      recordingDuration: this.getElapsedRecordingTime(sessionId),
    });
  }

  /**
   * Set up transcription event handlers for a session
   * 
   * @param session - Voice note session
   * @private
   */
  private setupTranscriptionHandlers(session: VoiceNoteSession): void {
    // Handle interim results
    // Track last enrichment analysis time to debounce API calls
    let lastEnrichmentAnalysisTime = 0;
    const ENRICHMENT_DEBOUNCE_MS = 3000; // Only analyze every 3 seconds max
    let enrichmentAnalysisTimeout: NodeJS.Timeout | null = null;

    this.transcriptionService.onInterimResult((result: TranscriptionResult) => {
      if (!result.isFinal) {
        session.interimTranscript = result.transcript;
        
        // Update final transcript with the latest interim result (Google sends full transcript each time)
        session.finalTranscript = result.transcript;
        
        this.emitSessionEvent(session.id, SessionEvent.INTERIM_TRANSCRIPT, {
          transcript: result.transcript,
          confidence: result.confidence,
        });
        
        // Debounce enrichment analysis to reduce API quota usage
        // Only analyze if we have user contacts and enough time has passed
        if (session.userContacts && session.userContacts.length > 0) {
          const now = Date.now();
          const timeSinceLastAnalysis = now - lastEnrichmentAnalysisTime;
          
          // Clear any pending timeout
          if (enrichmentAnalysisTimeout) {
            clearTimeout(enrichmentAnalysisTimeout);
          }
          
          // Schedule analysis after debounce period
          if (timeSinceLastAnalysis >= ENRICHMENT_DEBOUNCE_MS) {
            // Enough time has passed, analyze immediately
            console.log(`[VoiceNoteService] Analyzing enrichment immediately (${timeSinceLastAnalysis}ms since last)`);
            lastEnrichmentAnalysisTime = now;
            this.analyzeForEnrichment(session.id, result.transcript).catch(err => {
              console.error('Error in incremental enrichment:', err);
            });
          } else {
            // Schedule for later
            const delayMs = ENRICHMENT_DEBOUNCE_MS - timeSinceLastAnalysis;
            console.log(`[VoiceNoteService] Debouncing enrichment analysis (${delayMs}ms delay)`);
            enrichmentAnalysisTimeout = setTimeout(() => {
              console.log(`[VoiceNoteService] Analyzing enrichment after debounce`);
              lastEnrichmentAnalysisTime = Date.now();
              this.analyzeForEnrichment(session.id, session.finalTranscript).catch(err => {
                console.error('Error in incremental enrichment:', err);
              });
            }, delayMs);
          }
        } else {
          console.log(`[VoiceNoteService] Skipping enrichment analysis - no user contacts set for session ${session.id}`);
        }
      }
    });

    // Handle final results
    this.transcriptionService.onFinalResult((result: TranscriptionResult) => {
      if (result.isFinal) {
        console.log(`[VoiceNoteService] Final result received for session ${session.id}: "${result.transcript}"`);
        
        // Update final transcript with the final result
        session.finalTranscript = result.transcript;
        
        // Clear interim transcript
        session.interimTranscript = '';
        
        this.emitSessionEvent(session.id, SessionEvent.FINAL_TRANSCRIPT, {
          transcript: result.transcript,
          fullTranscript: session.finalTranscript,
          confidence: result.confidence,
        });
        
        // Trigger incremental enrichment analysis on final results
        // Only analyze if we have user contacts and haven't analyzed recently
        if (session.userContacts && session.userContacts.length > 0) {
          const timeSinceLastAnalysis = Date.now() - lastEnrichmentAnalysisTime;
          if (timeSinceLastAnalysis >= 1000) {
            // Only analyze if it's been at least 1 second since last analysis
            console.log(`[VoiceNoteService] Triggering enrichment analysis on final result for session ${session.id} with ${session.userContacts.length} contacts`);
            lastEnrichmentAnalysisTime = Date.now();
            this.analyzeForEnrichment(session.id, result.transcript).catch(err => {
              console.error('Error in incremental enrichment:', err);
            });
          } else {
            console.log(`[VoiceNoteService] Skipping final result enrichment analysis - analyzed too recently (${timeSinceLastAnalysis}ms ago)`);
          }
        } else {
          console.log(`[VoiceNoteService] Skipping enrichment analysis on final result - no user contacts set for session ${session.id}`);
        }
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

  /**
   * Analyze transcript for incremental enrichment
   * 
   * Triggers enrichment analysis at natural breakpoints and emits suggestions.
   * Groups suggestions by contact and emits one event per contact.
   * Only emits NEW suggestions that haven't been sent before to avoid duplicates.
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
   * 
   * @param sessionId - Session ID
   * @param newText - New transcript text to analyze
   * @private
   */
  private async analyzeForEnrichment(sessionId: string, newText: string): Promise<void> {
    try {
      // Get session to access user contacts
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        console.warn(`Session ${sessionId} not found for enrichment analysis`);
        return;
      }

      const userContacts = session.userContacts || [];
      
      console.log(`[EnrichmentAnalysis] Session ${sessionId}: analyzing "${newText.substring(0, 50)}..." with ${userContacts.length} contacts`);
      
      // Process the new text with user contacts for context (Proposal A & B)
      const triggered = await this.enrichmentAnalyzer.processTranscript(
        sessionId, 
        newText, 
        true, 
        userContacts
      );
      
      console.log(`[EnrichmentAnalysis] Session ${sessionId}: triggered=${triggered}`);
      
      // If enrichment was triggered, get and emit only NEW suggestions
      if (triggered) {
        const allSuggestions = this.enrichmentAnalyzer.getSuggestions(sessionId);
        console.log(`[EnrichmentAnalysis] Session ${sessionId}: got ${allSuggestions.length} total suggestions`);
        
        // Initialize emitted suggestions tracking if needed
        if (!session.emittedSuggestionIds) {
          session.emittedSuggestionIds = new Set();
        }
        
        // Filter to only NEW suggestions that haven't been emitted yet
        const newSuggestions = allSuggestions.filter(s => !session.emittedSuggestionIds!.has(s.id));
        
        console.log(`[EnrichmentAnalysis] Session ${sessionId}: ${newSuggestions.length} new suggestions (${allSuggestions.length} total, ${session.emittedSuggestionIds.size} already emitted)`);
        
        if (newSuggestions && newSuggestions.length > 0) {
          console.log(`Emitting ${newSuggestions.length} NEW enrichment suggestions for session ${sessionId}`);
          console.log(`Suggestion details:`, newSuggestions);
          
          // Mark these suggestions as emitted
          for (const suggestion of newSuggestions) {
            session.emittedSuggestionIds.add(suggestion.id);
          }
          
          // Group suggestions by contact hint
          const groupedByContact = this.groupSuggestionsByContact(newSuggestions);
          
          // Emit one event per contact
          for (const [contactName, suggestions] of groupedByContact) {
            console.log(`[EnrichmentAnalysis] Emitting ${suggestions.length} suggestions for contact: ${contactName}`);
            
            this.emit('enrichment_update', {
              sessionId,
              contactId: this.generateContactId(contactName),
              contactName,
              suggestions,
            });
          }
        } else {
          console.log(`[EnrichmentAnalysis] Session ${sessionId}: triggered but no NEW suggestions to emit`);
        }
      }
    } catch (error) {
      console.error('Error analyzing for enrichment:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    }
  }

  /**
   * Group suggestions by contact hint
   * 
   * Requirements: 6.1, 6.3, 6.4
   * 
   * @param suggestions - Array of suggestions
   * @returns Map of contact name to suggestions
   * @private
   */
  private groupSuggestionsByContact(suggestions: EnrichmentSuggestion[]): Map<string, EnrichmentSuggestion[]> {
    const grouped = new Map<string, EnrichmentSuggestion[]>();
    
    for (const suggestion of suggestions) {
      const contactName = suggestion.contactHint || 'Unknown Contact';
      
      if (!grouped.has(contactName)) {
        grouped.set(contactName, []);
      }
      
      grouped.get(contactName)!.push(suggestion);
    }
    
    return grouped;
  }

  /**
   * Generate a consistent contact ID from contact name
   * 
   * Requirements: 6.2
   * 
   * @param contactName - Contact name
   * @returns Contact ID
   * @private
   */
  private generateContactId(contactName: string): string {
    // Use a simple hash-like approach: lowercase and replace spaces with hyphens
    return contactName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Set user contacts for a session (for incremental enrichment context)
   * 
   * @param sessionId - Session ID
   * @param contacts - User's contacts
   */
  setSessionContacts(sessionId: string, contacts: Contact[]): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.userContacts = contacts;
      console.log(`Set ${contacts.length} contacts for session ${sessionId}`);
    }
  }
}

// Export singleton instance
export const voiceNoteService = new VoiceNoteService();
