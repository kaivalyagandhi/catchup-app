/**
 * Incremental Enrichment Analyzer
 * 
 * Triggers enrichment analysis at natural breakpoints during voice note recording.
 * Manages progressive suggestion generation and merging.
 * 
 * Features:
 * - Word count tracking and natural pause detection
 * - Debounced trigger logic (5+ words or 0.8 second pause)
 * - Suggestion merging and deduplication
 * - Integration with EntityExtractionService and ContactDisambiguationService
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { EntityExtractionService } from './entity-extraction-service.js';
import { ContactDisambiguationService } from './contact-disambiguation-service.js';
import { Contact, ExtractedEntities } from '../types/index.js';

/**
 * Enrichment suggestion with confidence and source tracking
 */
export interface EnrichmentSuggestion {
  id: string;
  type: 'tag' | 'note' | 'interest' | 'event' | 'location' | 'phone' | 'email';
  value: string;
  confidence: number;
  sourceText: string;
  contactHint?: string;
}

/**
 * Enrichment trigger configuration
 */
export interface EnrichmentTriggerConfig {
  minWordCount: number;      // 50 words
  pauseThresholdMs: number;  // 2000ms
  maxPendingWords: number;   // 200 words
  debounceMs: number;        // 500ms to prevent rapid triggers
}

/**
 * Session enrichment state
 */
interface EnrichmentState {
  sessionId: string;
  suggestions: EnrichmentSuggestion[];
  processedWordCount: number;
  lastAnalyzedAt: number;
  pendingText: string;
  fullTranscript: string;  // Accumulated full transcript for context
  lastTriggerTime: number;
  userContacts: Contact[]; // User's contacts for context-aware extraction
}

/**
 * Default configuration - optimized for responsive live updates
 */
const DEFAULT_CONFIG: EnrichmentTriggerConfig = {
  minWordCount: 5,        // Trigger after 5 words for faster feedback
  pauseThresholdMs: 800,  // Trigger after 0.8 second pause
  maxPendingWords: 100,   // Don't let too many words accumulate
  debounceMs: 200,        // Faster response between triggers
};

/**
 * Incremental Enrichment Analyzer Service
 */
export class IncrementalEnrichmentAnalyzer {
  private config: EnrichmentTriggerConfig;
  private extractionService: EntityExtractionService;
  private disambiguationService: ContactDisambiguationService;
  private sessionStates: Map<string, EnrichmentState> = new Map();

  constructor(
    extractionService?: EntityExtractionService,
    disambiguationService?: ContactDisambiguationService,
    config?: Partial<EnrichmentTriggerConfig>
  ) {
    this.extractionService = extractionService || new EntityExtractionService();
    this.disambiguationService = disambiguationService || new ContactDisambiguationService();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process new transcript text for a session
   * 
   * Tracks word count and detects natural pauses to trigger enrichment analysis.
   * 
   * Requirements: 2.1
   * 
   * @param sessionId - Session ID
   * @param newText - New transcript text (can be interim or final)
   * @param isFinal - Whether this is final transcript text
   * @returns True if enrichment was triggered
   * 
   * @example
   * ```typescript
   * const triggered = await analyzer.processTranscript(
   *   'session-123',
   *   'I had coffee with John today.',
   *   true
   * );
   * ```
   */
  async processTranscript(
    sessionId: string,
    newText: string,
    isFinal: boolean,
    userContacts?: Contact[]
  ): Promise<boolean> {
    // Get or create session state
    let state = this.sessionStates.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        suggestions: [],
        processedWordCount: 0,
        lastAnalyzedAt: 0,
        pendingText: '',
        fullTranscript: '',
        lastTriggerTime: 0,
        userContacts: userContacts || [],
      };
      this.sessionStates.set(sessionId, state);
    }

    // Update contacts if provided
    if (userContacts && userContacts.length > 0) {
      state.userContacts = userContacts;
    }

    // Only accumulate final text
    if (!isFinal) {
      return false;
    }

    // Add new text to both pending buffer AND full transcript
    state.pendingText += (state.pendingText ? ' ' : '') + newText;
    state.fullTranscript += (state.fullTranscript ? ' ' : '') + newText;

    // Count words in pending text (for trigger logic)
    const pendingWordCount = this.countWords(state.pendingText);
    const currentTime = Date.now();
    const timeSinceLastAnalysis = currentTime - state.lastAnalyzedAt;

    console.log(`[EnrichmentAnalyzer] Session ${sessionId}: pendingWords=${pendingWordCount}, totalWords=${this.countWords(state.fullTranscript)}, contacts=${state.userContacts.length}`);

    // Check if we should trigger enrichment
    const shouldTrigger = this.shouldTriggerEnrichment(
      pendingWordCount,
      timeSinceLastAnalysis,
      currentTime - state.lastTriggerTime,
      state.lastAnalyzedAt
    );

    console.log(`[EnrichmentAnalyzer] shouldTrigger=${shouldTrigger}`);

    if (shouldTrigger) {
      // Trigger enrichment analysis using FULL transcript for context
      await this.triggerEnrichment(sessionId, state);
      state.lastTriggerTime = currentTime;
      return true;
    }

    return false;
  }

  /**
   * Get current suggestions for a session
   * 
   * @param sessionId - Session ID
   * @returns Array of enrichment suggestions
   * 
   * @example
   * ```typescript
   * const suggestions = analyzer.getSuggestions('session-123');
   * console.log(`Found ${suggestions.length} suggestions`);
   * ```
   */
  getSuggestions(sessionId: string): EnrichmentSuggestion[] {
    const state = this.sessionStates.get(sessionId);
    return state ? [...state.suggestions] : [];
  }

  /**
   * Finalize enrichment for a session
   * 
   * Performs final analysis on any remaining pending text and returns
   * all suggestions in a format compatible with EnrichmentService.
   * 
   * Requirements: 2.2
   * 
   * @param sessionId - Session ID
   * @param contacts - Contacts to extract entities for
   * @returns Map of contact ID to extracted entities
   * 
   * @example
   * ```typescript
   * const entitiesMap = await analyzer.finalize('session-123', [contact1, contact2]);
   * ```
   */
  async finalize(
    sessionId: string,
    contacts: Contact[]
  ): Promise<Map<string, ExtractedEntities>> {
    const state = this.sessionStates.get(sessionId);
    if (!state) {
      return new Map();
    }

    // Process any remaining pending text
    if (state.pendingText.trim()) {
      await this.triggerEnrichment(sessionId, state);
    }

    // Convert suggestions to ExtractedEntities format
    const entitiesMap = await this.convertSuggestionsToEntities(
      state,
      contacts
    );

    // Clean up session state
    this.sessionStates.delete(sessionId);

    return entitiesMap;
  }

  /**
   * Clear session state
   * 
   * @param sessionId - Session ID
   */
  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }

  /**
   * Check if enrichment should be triggered
   * 
   * Requirements: 2.1
   * 
   * @param wordCount - Current word count in pending text
   * @param timeSinceLastAnalysis - Time since last analysis (ms)
   * @param timeSinceLastTrigger - Time since last trigger (ms)
   * @param lastAnalyzedAt - Timestamp of last analysis (0 if never analyzed)
   * @returns True if enrichment should be triggered
   * @private
   */
  private shouldTriggerEnrichment(
    wordCount: number,
    timeSinceLastAnalysis: number,
    timeSinceLastTrigger: number,
    lastAnalyzedAt: number = 0
  ): boolean {
    // Debounce: Don't trigger too frequently
    if (timeSinceLastTrigger < this.config.debounceMs) {
      return false;
    }

    // Trigger on word count threshold
    if (wordCount >= this.config.minWordCount) {
      return true;
    }

    // Trigger on natural pause (2+ seconds since last analysis)
    // Only check pause if we've analyzed before (lastAnalyzedAt > 0)
    if (
      lastAnalyzedAt > 0 &&
      wordCount > 0 &&
      timeSinceLastAnalysis >= this.config.pauseThresholdMs
    ) {
      return true;
    }

    // Trigger if pending text is getting too large
    if (wordCount >= this.config.maxPendingWords) {
      return true;
    }

    return false;
  }

  /**
   * Trigger enrichment analysis
   * 
   * Uses the same processing as finalization:
   * 1. Disambiguate contacts using Gemini + fuzzy matching
   * 2. Extract entities for each identified contact
   * 3. Convert to suggestions
   * 
   * Requirements: 2.2, 2.3, 2.4
   * 
   * @param sessionId - Session ID
   * @param state - Session enrichment state
   * @private
   */
  private async triggerEnrichment(
    sessionId: string,
    state: EnrichmentState
  ): Promise<void> {
    if (!state.fullTranscript.trim()) {
      return;
    }

    try {
      const transcriptToAnalyze = state.fullTranscript;
      const suggestions: EnrichmentSuggestion[] = [];

      if (state.userContacts.length > 0) {
        // Step 1: Disambiguate contacts (same as finalization)
        const disambiguationResult = await this.disambiguationService.disambiguateDetailed(
          transcriptToAnalyze,
          state.userContacts
        );

        const identifiedContacts = disambiguationResult.matches;
        console.log(`[EnrichmentAnalyzer] Disambiguated ${identifiedContacts.length} contacts: ${identifiedContacts.map(c => c.name).join(', ')}`);

        // Step 2: Extract entities for each identified contact (same as finalization)
        if (identifiedContacts.length > 0) {
          const entitiesMap = await this.extractionService.extractForMultipleContacts(
            transcriptToAnalyze,
            identifiedContacts
          );

          // Step 3: Convert to suggestions grouped by contact
          for (const contact of identifiedContacts) {
            const entities = entitiesMap.get(contact.id);
            if (entities) {
              const contactSuggestions = this.entitiesToSuggestionsForContact(
                entities,
                transcriptToAnalyze,
                contact.name
              );
              suggestions.push(...contactSuggestions);
            }
          }
        }
      } else {
        // No contacts - fall back to generic extraction
        const entities = await this.extractionService.extractGeneric(transcriptToAnalyze);
        const genericSuggestions = this.entitiesToSuggestions(entities, transcriptToAnalyze, []);
        suggestions.push(...genericSuggestions);
      }

      // Replace suggestions entirely
      state.suggestions = suggestions;

      // Update state
      state.processedWordCount = this.countWords(state.fullTranscript);
      state.lastAnalyzedAt = Date.now();
      state.pendingText = '';
    } catch (error) {
      console.error(`Enrichment analysis failed for session ${sessionId}:`, error);
      // Don't throw - allow recording to continue
    }
  }

  /**
   * Convert entities to suggestions for a specific contact
   * @private
   */
  private entitiesToSuggestionsForContact(
    entities: ExtractedEntities,
    sourceText: string,
    contactName: string
  ): EnrichmentSuggestion[] {
    const suggestions: EnrichmentSuggestion[] = [];

    // Location
    if (entities.fields.location) {
      suggestions.push({
        id: this.generateSuggestionId('location', `${contactName}:${entities.fields.location}`),
        type: 'location',
        value: entities.fields.location,
        confidence: 0.85,
        sourceText,
        contactHint: contactName,
      });
    }

    // Phone
    if (entities.fields.phone) {
      suggestions.push({
        id: this.generateSuggestionId('phone', `${contactName}:${entities.fields.phone}`),
        type: 'phone',
        value: entities.fields.phone,
        confidence: 0.9,
        sourceText,
        contactHint: contactName,
      });
    }

    // Email
    if (entities.fields.email) {
      suggestions.push({
        id: this.generateSuggestionId('email', `${contactName}:${entities.fields.email}`),
        type: 'email',
        value: entities.fields.email,
        confidence: 0.9,
        sourceText,
        contactHint: contactName,
      });
    }

    // Notes
    if (entities.fields.customNotes) {
      suggestions.push({
        id: this.generateSuggestionId('note', `${contactName}:${entities.fields.customNotes}`),
        type: 'note',
        value: entities.fields.customNotes,
        confidence: 0.7,
        sourceText,
        contactHint: contactName,
      });
    }

    // Tags
    for (const tag of entities.tags) {
      suggestions.push({
        id: this.generateSuggestionId('tag', `${contactName}:${tag}`),
        type: 'tag',
        value: tag,
        confidence: 0.8,
        sourceText,
        contactHint: contactName,
      });
    }

    // Groups as interests
    for (const group of entities.groups) {
      suggestions.push({
        id: this.generateSuggestionId('interest', `${contactName}:${group}`),
        type: 'interest',
        value: group,
        confidence: 0.75,
        sourceText,
        contactHint: contactName,
      });
    }

    return suggestions;
  }

  /**
   * Convert extracted entities to enrichment suggestions
   * 
   * @param entities - Extracted entities
   * @param sourceText - Source transcript text
   * @param userContacts - User's contacts for matching
   * @returns Array of enrichment suggestions
   * @private
   */
  private entitiesToSuggestions(
    entities: ExtractedEntities,
    sourceText: string,
    userContacts: Contact[] = []
  ): EnrichmentSuggestion[] {
    const suggestions: EnrichmentSuggestion[] = [];

    // Match extracted contact names to actual contacts
    const matchedContacts: string[] = [];
    if (entities.contactNames) {
      for (const name of entities.contactNames) {
        const matchedContact = this.findMatchingContact(name, userContacts);
        if (matchedContact) {
          matchedContacts.push(matchedContact.name);
        } else {
          matchedContacts.push(name); // Use raw name if no match
        }
      }
    }

    // Use the first matched contact as the primary contact for field updates
    const primaryContact = matchedContacts.length > 0 ? matchedContacts[0] : undefined;

    // Convert tags to suggestions (assign to primary contact)
    for (const tag of entities.tags) {
      suggestions.push({
        id: this.generateSuggestionId('tag', tag),
        type: 'tag',
        value: tag,
        confidence: 0.8,
        sourceText,
        contactHint: primaryContact,
      });
    }

    // Convert location from fields (assign to primary contact)
    if (entities.fields.location) {
      suggestions.push({
        id: this.generateSuggestionId('location', entities.fields.location),
        type: 'location',
        value: entities.fields.location,
        confidence: 0.85,
        sourceText,
        contactHint: primaryContact,
      });
    }

    // Convert phone from fields
    if (entities.fields.phone) {
      suggestions.push({
        id: this.generateSuggestionId('phone', entities.fields.phone),
        type: 'phone',
        value: entities.fields.phone,
        confidence: 0.9,
        sourceText,
        contactHint: primaryContact,
      });
    }

    // Convert email from fields
    if (entities.fields.email) {
      suggestions.push({
        id: this.generateSuggestionId('email', entities.fields.email),
        type: 'email',
        value: entities.fields.email,
        confidence: 0.9,
        sourceText,
        contactHint: primaryContact,
      });
    }

    // Convert notes from fields
    if (entities.fields.customNotes) {
      suggestions.push({
        id: this.generateSuggestionId('note', entities.fields.customNotes),
        type: 'note',
        value: entities.fields.customNotes,
        confidence: 0.7,
        sourceText,
        contactHint: primaryContact,
      });
    }

    // Groups are treated as interests
    for (const group of entities.groups) {
      suggestions.push({
        id: this.generateSuggestionId('interest', group),
        type: 'interest',
        value: group,
        confidence: 0.75,
        sourceText,
      });
    }

    return suggestions;
  }

  /**
   * Merge new suggestions with existing ones
   * 
   * Deduplicates by type and value, keeping highest confidence version.
   * 
   * Requirements: 2.3, 2.4
   * 
   * @param existing - Existing suggestions
   * @param newSuggestions - New suggestions to merge
   * @returns Merged suggestions
   * @private
   */
  private mergeSuggestions(
    existing: EnrichmentSuggestion[],
    newSuggestions: EnrichmentSuggestion[]
  ): EnrichmentSuggestion[] {
    // Create a map for deduplication
    const suggestionMap = new Map<string, EnrichmentSuggestion>();

    // Add existing suggestions
    for (const suggestion of existing) {
      const key = this.getSuggestionKey(suggestion);
      suggestionMap.set(key, suggestion);
    }

    // Merge new suggestions
    for (const newSuggestion of newSuggestions) {
      const key = this.getSuggestionKey(newSuggestion);
      const existingSuggestion = suggestionMap.get(key);

      if (!existingSuggestion) {
        // New suggestion
        suggestionMap.set(key, newSuggestion);
      } else if (newSuggestion.confidence > existingSuggestion.confidence) {
        // Replace with higher confidence version
        suggestionMap.set(key, newSuggestion);
      }
      // Otherwise keep existing suggestion
    }

    return Array.from(suggestionMap.values());
  }

  /**
   * Convert suggestions to ExtractedEntities format for EnrichmentService
   * 
   * Requirements: 2.2
   * 
   * @param state - Session enrichment state
   * @param contacts - Contacts to extract for
   * @returns Map of contact ID to extracted entities
   * @private
   */
  private async convertSuggestionsToEntities(
    state: EnrichmentState,
    contacts: Contact[]
  ): Promise<Map<string, ExtractedEntities>> {
    const entitiesMap = new Map<string, ExtractedEntities>();

    // If no contacts, return empty map
    if (contacts.length === 0) {
      return entitiesMap;
    }

    // Group suggestions by type
    const tags = state.suggestions
      .filter(s => s.type === 'tag')
      .map(s => s.value);
    
    const groups = state.suggestions
      .filter(s => s.type === 'interest')
      .map(s => s.value);

    const notes = state.suggestions
      .filter(s => s.type === 'note')
      .map(s => s.value)
      .join('. ');

    // For now, apply all suggestions to all contacts
    // In a more sophisticated implementation, we could use contactHint
    // to assign suggestions to specific contacts
    for (const contact of contacts) {
      entitiesMap.set(contact.id, {
        fields: notes ? { customNotes: notes } : {},
        tags,
        groups,
        lastContactDate: undefined,
      });
    }

    return entitiesMap;
  }

  /**
   * Generate a unique suggestion ID based on type and value
   * 
   * @param type - Suggestion type
   * @param value - Suggestion value
   * @returns Suggestion ID
   * @private
   */
  private generateSuggestionId(type: string, value: string): string {
    return `${type}:${value.toLowerCase().replace(/\s+/g, '-')}`;
  }

  /**
   * Get deduplication key for a suggestion
   * 
   * @param suggestion - Enrichment suggestion
   * @returns Deduplication key
   * @private
   */
  private getSuggestionKey(suggestion: EnrichmentSuggestion): string {
    return `${suggestion.type}:${suggestion.value.toLowerCase()}`;
  }

  /**
   * Count words in text
   * 
   * @param text - Text to count words in
   * @returns Word count
   * @private
   */
  private countWords(text: string): number {
    if (!text.trim()) {
      return 0;
    }
    return text.trim().split(/\s+/).length;
  }

  /**
   * Find a matching contact from the user's contact list
   * Uses fuzzy matching on name
   * 
   * @param extractedName - Name extracted from transcript
   * @param contacts - User's contacts
   * @returns Matching contact or undefined
   * @private
   */
  private findMatchingContact(extractedName: string, contacts: Contact[]): Contact | undefined {
    if (!extractedName || contacts.length === 0) {
      return undefined;
    }

    const normalizedExtracted = extractedName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = contacts.find(
      c => c.name.toLowerCase() === normalizedExtracted
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial match (extracted name is part of contact name or vice versa)
    const partialMatch = contacts.find(c => {
      const normalizedContact = c.name.toLowerCase();
      return normalizedContact.includes(normalizedExtracted) ||
             normalizedExtracted.includes(normalizedContact);
    });
    if (partialMatch) {
      return partialMatch;
    }

    // Try matching first name only
    const extractedFirstName = normalizedExtracted.split(' ')[0];
    const firstNameMatch = contacts.find(c => {
      const contactFirstName = c.name.toLowerCase().split(' ')[0];
      return contactFirstName === extractedFirstName;
    });
    if (firstNameMatch) {
      return firstNameMatch;
    }

    return undefined;
  }
}

// Singleton instance (lazy initialization)
let _instance: IncrementalEnrichmentAnalyzer | null = null;

/**
 * Get singleton instance of IncrementalEnrichmentAnalyzer
 */
export function getIncrementalEnrichmentAnalyzer(): IncrementalEnrichmentAnalyzer {
  if (!_instance) {
    _instance = new IncrementalEnrichmentAnalyzer();
  }
  return _instance;
}
