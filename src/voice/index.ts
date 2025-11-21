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
