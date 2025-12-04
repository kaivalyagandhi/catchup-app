/**
 * Voice Module
 *
 * Responsibilities:
 * - Audio transcription via OpenAI Whisper or similar
 * - Entity extraction using NLP
 * - Contact disambiguation
 * - Enrichment confirmation workflow
 * - Tag preference for existing similar tags
 */

export {
  transcribeAudio,
  storeAudioFile,
  disambiguateContact,
  extractEntities,
  generateEnrichmentConfirmation,
  applyEnrichment,
  preferExistingTags,
} from './voice-service';

export { VoiceNoteRepository } from './voice-repository';

export {
  TranscriptionService,
  TranscriptionStream,
  TranscriptionResult,
  StreamingConfig,
  TranscriptionEventHandlers,
  ReconnectionConfig,
} from './transcription-service';

export { EntityExtractionService } from './entity-extraction-service';

export {
  ContactDisambiguationService,
  DisambiguationResult,
  PartialMatch,
  ContactMatch,
} from './contact-disambiguation-service';

export {
  EnrichmentService,
  enrichmentService,
  ContactEnrichmentResult,
  EnrichmentApplicationResult,
  ContactEnrichmentProposal,
  MultiContactEnrichmentProposal,
} from './enrichment-service';

export {
  VoiceNoteService,
  voiceNoteService,
  VoiceNoteSession,
  SessionEvent,
} from './voice-note-service';

export { VoiceNoteWebSocketHandler, WSMessageType, WSMessage } from './websocket-handler';
