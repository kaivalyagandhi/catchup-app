/**
 * Entity Extraction Service
 * 
 * Uses Google Gemini API to extract structured contact metadata from voice note transcripts.
 * Supports single contact, generic (unknown contact), and multi-contact extraction.
 * 
 * Features:
 * - Structured JSON output using Gemini's responseSchema
 * - Context-aware extraction based on known contact information
 * - Multi-contact support for group voice notes
 * - Error handling with fallback to empty entities
 * 
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */

import { GenerativeModel } from '@google/generative-ai';
import {
  getEntityExtractionModel,
  ENTITY_EXTRACTION_SCHEMA,
} from '../integrations/google-gemini-config.js';
import { Contact, ExtractedEntities } from '../types/index.js';

/**
 * Entity Extraction Service
 * 
 * Extracts structured contact metadata from voice note transcripts using Google Gemini API.
 */
export class EntityExtractionService {
  private model: GenerativeModel;

  constructor(customModel?: GenerativeModel) {
    this.model = customModel || getEntityExtractionModel();
  }

  /**
   * Extract entities for a specific known contact
   * 
   * Uses contact information to provide context for more accurate extraction.
   * 
   * @param transcript - Voice note transcript text
   * @param contact - Known contact the voice note refers to
   * @returns Extracted entities for the contact
   * 
   * @example
   * ```typescript
   * const entities = await service.extractForContact(
   *   "Had coffee with John today. He mentioned he's into rock climbing now.",
   *   { id: '123', name: 'John Doe', ... }
   * );
   * // Returns: { fields: {}, tags: ['rock climbing', 'coffee'], groups: [], lastContactDate: '2024-01-15' }
   * ```
   */
  async extractForContact(
    transcript: string,
    contact: Contact
  ): Promise<ExtractedEntities> {
    const prompt = this.buildPromptForContact(transcript, contact);
    return this.extractEntities(prompt);
  }

  /**
   * Extract entities when contact is unknown
   * 
   * Performs generic extraction without contact context.
   * 
   * @param transcript - Voice note transcript text
   * @returns Extracted entities
   * 
   * @example
   * ```typescript
   * const entities = await service.extractGeneric(
   *   "Met someone at the gym who's really into photography."
   * );
   * // Returns: { fields: {}, tags: ['gym', 'photography'], groups: [], lastContactDate: null }
   * ```
   */
  async extractGeneric(transcript: string): Promise<ExtractedEntities> {
    const prompt = this.buildGenericPrompt(transcript);
    return this.extractEntities(prompt);
  }

  /**
   * Extract entities with user's contact list for context
   * 
   * Uses the contact list to improve name matching and provide context.
   * This is used for incremental enrichment during recording.
   * 
   * @param transcript - Voice note transcript text
   * @param userContacts - User's contact list for context
   * @returns Extracted entities with better name matching
   */
  async extractWithContactContext(
    transcript: string,
    userContacts: Contact[]
  ): Promise<ExtractedEntities> {
    const prompt = this.buildContextAwarePrompt(transcript, userContacts);
    return this.extractEntities(prompt);
  }

  /**
   * Extract entities for multiple contacts mentioned in the same voice note
   * 
   * Processes each contact separately to identify which information applies to whom.
   * 
   * @param transcript - Voice note transcript text
   * @param contacts - Array of contacts mentioned in the voice note
   * @returns Map of contact ID to extracted entities
   * 
   * @example
   * ```typescript
   * const entitiesMap = await service.extractForMultipleContacts(
   *   "Had dinner with John and Jane. John talked about his new startup, Jane mentioned her hiking trip.",
   *   [johnContact, janeContact]
   * );
   * // Returns: Map { 'john-id' => { tags: ['startup', ...] }, 'jane-id' => { tags: ['hiking', ...] } }
   * ```
   */
  async extractForMultipleContacts(
    transcript: string,
    contacts: Contact[]
  ): Promise<Map<string, ExtractedEntities>> {
    const results = new Map<string, ExtractedEntities>();

    console.log(`[EntityExtraction] Extracting for ${contacts.length} contacts from: "${transcript}"`);

    // Extract entities for each contact separately
    for (const contact of contacts) {
      try {
        console.log(`[EntityExtraction] Extracting for contact: ${contact.name}`);
        const entities = await this.extractForContact(transcript, contact);
        console.log(`[EntityExtraction] ${contact.name} entities:`, JSON.stringify(entities, null, 2));
        results.set(contact.id, entities);
      } catch (error) {
        console.error(`Failed to extract entities for contact ${contact.id}:`, error);
        // Store empty entities on failure
        results.set(contact.id, this.createEmptyEntities());
      }
    }

    return results;
  }

  /**
   * Core extraction method that calls Gemini API
   * 
   * @param prompt - Formatted prompt for entity extraction
   * @returns Extracted entities
   * @private
   */
  private async extractEntities(prompt: string): Promise<ExtractedEntities> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text);

      // Validate and transform to ExtractedEntities format
      return this.validateAndTransform(parsed);
    } catch (error) {
      console.error('Entity extraction failed:', error);
      // Return empty entities on failure to allow manual entry
      return this.createEmptyEntities();
    }
  }

  /**
   * Build prompt for known contact extraction
   * 
   * @param transcript - Voice note transcript
   * @param contact - Known contact
   * @returns Formatted prompt
   * @private
   */
  private buildPromptForContact(transcript: string, contact: Contact): string {
    return `Extract information ONLY about ${contact.name} from the following voice note transcript.

IMPORTANT: The transcript may mention multiple people. You must ONLY extract information that is specifically about ${contact.name}. Do NOT include information about other people mentioned in the transcript.

Current contact information for ${contact.name}:
- Name: ${contact.name}
${contact.phone ? `- Phone: ${contact.phone}` : ''}
${contact.email ? `- Email: ${contact.email}` : ''}
${contact.location ? `- Location: ${contact.location}` : ''}
${contact.tags.length > 0 ? `- Existing tags: ${contact.tags.map(t => t.text).join(', ')}` : ''}
${contact.groups.length > 0 ? `- Existing groups: ${contact.groups.join(', ')}` : ''}

Transcript:
${transcript}

Extract ONLY information that is explicitly about ${contact.name}:
- Contact fields (phone, email, location, notes) - ONLY if mentioned in relation to ${contact.name}
- Tags (interests, hobbies) - ONLY if ${contact.name} is associated with them
- Groups (relationship categories)
- Last contact date (if mentioned for ${contact.name})

CRITICAL: If a phone number, location, or other detail is mentioned for a DIFFERENT person in the transcript, do NOT include it here. Only include information specifically about ${contact.name}.

Return empty arrays/null values if no information about ${contact.name} is found.`;
  }

  /**
   * Build prompt for generic extraction (unknown contact)
   * 
   * @param transcript - Voice note transcript
   * @returns Formatted prompt
   * @private
   */
  private buildGenericPrompt(transcript: string): string {
    return `Extract contact information from the following voice note transcript.

Transcript:
${transcript}

Extract any information mentioned in the transcript:
- Contact names (any person names mentioned, e.g., "John", "Sarah", "Mike Smith")
- Contact fields (phone, email, social media handles, location, notes about the person)
- Tags (1-3 word descriptors of interests, hobbies, or characteristics mentioned)
- Groups (relationship categories like "College Friends", "Work Friends")
- Last contact date (if a specific interaction date is mentioned)

IMPORTANT: Pay close attention to any names mentioned in the transcript. Names are often mentioned at the beginning like "I talked to John today" or "Had lunch with Sarah".

Only include information that is explicitly mentioned or strongly implied in the transcript.
Return empty arrays/null values if no information is found.`;
  }

  /**
   * Build prompt with user's contact list for context-aware extraction
   * 
   * @param transcript - Voice note transcript
   * @param userContacts - User's contact list
   * @returns Formatted prompt with contact context
   * @private
   */
  private buildContextAwarePrompt(transcript: string, userContacts: Contact[]): string {
    // Create a list of contact names for context
    const contactNames = userContacts
      .map(c => c.name)
      .filter(name => name && name.trim())
      .slice(0, 50) // Limit to 50 contacts to avoid token limits
      .join(', ');

    return `Extract contact information from the following voice note transcript.

The user has these contacts in their address book: ${contactNames}

Transcript:
${transcript}

Extract any information mentioned in the transcript into these categories:

1. CONTACT NAMES: Match names to the user's contacts above when possible
   - If transcript says "John" and user has "John Smith", return "John Smith"
   - Pay attention to partial name matches and nicknames

2. CONTACT FIELDS (return in "fields" object):
   - location: City/place if someone is "moving to", "lives in", "relocated to" somewhere (e.g., "San Francisco", "New York")
   - phone: Phone numbers mentioned
   - email: Email addresses mentioned
   - customNotes: Important facts or updates about the person

3. TAGS: 1-3 word descriptors of interests, hobbies, or characteristics

4. GROUPS: Relationship categories like "College Friends", "Work Friends"

IMPORTANT EXTRACTION RULES:
- "Alice is moving to San Francisco" → fields.location = "San Francisco"
- "John's new number is 555-1234" → fields.phone = "555-1234"
- "She loves hiking" → tags = ["hiking"]
- Extract the CITY NAME for location, not the full phrase

Only include information that is explicitly mentioned or strongly implied.
Return empty arrays/null values if no information is found.`;
  }

  /**
   * Validate and transform API response to ExtractedEntities format
   * 
   * @param parsed - Parsed JSON from API
   * @returns Validated ExtractedEntities
   * @private
   */
  private validateAndTransform(parsed: any): ExtractedEntities {
    // Ensure required fields exist
    const contactNames = Array.isArray(parsed.contactNames) ? parsed.contactNames : [];
    const fields = parsed.fields || {};
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    
    // Parse lastContactDate if present
    let lastContactDate: Date | undefined;
    if (parsed.lastContactDate) {
      try {
        lastContactDate = new Date(parsed.lastContactDate);
        // Validate date
        if (isNaN(lastContactDate.getTime())) {
          lastContactDate = undefined;
        }
      } catch {
        lastContactDate = undefined;
      }
    }

    return {
      contactNames,
      fields,
      tags,
      groups,
      lastContactDate,
    };
  }

  /**
   * Create empty entities structure
   * 
   * Used as fallback when extraction fails.
   * 
   * @returns Empty ExtractedEntities
   * @private
   */
  private createEmptyEntities(): ExtractedEntities {
    return {
      fields: {},
      tags: [],
      groups: [],
      lastContactDate: undefined,
    };
  }
}
