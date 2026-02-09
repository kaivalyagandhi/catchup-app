/**
 * Contact Disambiguation Service
 *
 * Identifies which contacts are mentioned in voice note transcripts.
 * Uses Google Gemini API to extract person names and fuzzy matching to map them to user's contacts.
 *
 * Features:
 * - Multi-contact identification (supports multiple people in one voice note)
 * - Fuzzy name matching with Levenshtein distance
 * - Partial match support for user review
 * - Fallback to manual selection when no matches found
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { GenerativeModel } from '@google/generative-ai';
import { getContactNameModel } from '../integrations/google-gemini-config.js';
import { Contact } from '../types/index.js';

/**
 * Result of contact disambiguation
 */
export interface DisambiguationResult {
  /** Matched contacts with high confidence */
  matches: Contact[];
  /** Partial matches that may need user review */
  partialMatches: PartialMatch[];
  /** Names that couldn't be matched */
  unmatchedNames: string[];
}

/**
 * Partial match for user review
 */
export interface PartialMatch {
  /** Extracted name from transcript */
  extractedName: string;
  /** Potential contact matches */
  candidates: ContactMatch[];
}

/**
 * Contact match with confidence score
 */
export interface ContactMatch {
  contact: Contact;
  /** Similarity score (0-1, higher is better) */
  score: number;
  /** Reason for the match */
  reason: string;
}

/**
 * Contact Disambiguation Service
 *
 * Identifies contacts mentioned in voice note transcripts.
 */
export class ContactDisambiguationService {
  private model: GenerativeModel;

  /** Threshold for automatic matching (0-1) */
  private readonly EXACT_MATCH_THRESHOLD = 0.65;

  /** Threshold for partial matching (0-1) */
  private readonly PARTIAL_MATCH_THRESHOLD = 0.45;

  /** Maximum number of partial match candidates to return */
  private readonly MAX_CANDIDATES = 3;

  constructor(customModel?: GenerativeModel) {
    this.model = customModel || getContactNameModel();
  }

  /**
   * Disambiguate contacts mentioned in a transcript
   *
   * Identifies all contacts mentioned in the voice note and matches them
   * to the user's contact list using fuzzy matching.
   *
   * @param transcript - Voice note transcript text
   * @param userContacts - User's contact list
   * @returns Array of matched contacts (empty if no matches found)
   *
   * @example
   * ```typescript
   * const contacts = await service.disambiguate(
   *   "Had lunch with John and Jane today",
   *   userContactList
   * );
   * // Returns: [johnContact, janeContact]
   * ```
   */
  async disambiguate(transcript: string, userContacts: Contact[]): Promise<Contact[]> {
    // Step 1: Extract person names from transcript using Gemini
    const names = await this.identifyContactNames(transcript);

    console.log(`[Disambiguation] Extracted names from transcript: ${JSON.stringify(names)}`);

    if (names.length === 0) {
      return [];
    }

    // Step 2: Match names to user's contacts
    const result = await this.matchToContacts(names, userContacts);

    console.log(`[Disambiguation] Matches: ${result.matches.map((c) => c.name).join(', ')}`);
    console.log(
      `[Disambiguation] Partial matches: ${JSON.stringify(result.partialMatches.map((p) => ({ name: p.extractedName, candidates: p.candidates.map((c) => ({ name: c.contact.name, score: c.score })) })))}`
    );
    console.log(`[Disambiguation] Unmatched: ${result.unmatchedNames.join(', ')}`);

    // Return only high-confidence matches
    // Partial matches and unmatched names trigger manual selection UI
    return result.matches;
  }

  /**
   * Get detailed disambiguation result including partial matches
   *
   * Useful for UI that wants to show partial matches for user review.
   *
   * @param transcript - Voice note transcript text
   * @param userContacts - User's contact list
   * @returns Detailed disambiguation result
   */
  async disambiguateDetailed(
    transcript: string,
    userContacts: Contact[]
  ): Promise<DisambiguationResult> {
    const names = await this.identifyContactNames(transcript);

    console.log(`[Disambiguation] Extracted names from transcript: ${JSON.stringify(names)}`);

    if (names.length === 0) {
      return {
        matches: [],
        partialMatches: [],
        unmatchedNames: [],
      };
    }

    const result = await this.matchToContacts(names, userContacts);

    console.log(`[Disambiguation] Matches: ${result.matches.map((c) => c.name).join(', ')}`);
    console.log(
      `[Disambiguation] Partial matches: ${JSON.stringify(result.partialMatches.map((p) => ({ name: p.extractedName, candidates: p.candidates.map((c) => ({ name: c.contact.name, score: c.score })) })))}`
    );
    console.log(`[Disambiguation] Unmatched: ${result.unmatchedNames.join(', ')}`);

    return result;
  }

  /**
   * Use Gemini to identify contact names in transcript
   *
   * Extracts person names mentioned in the voice note using NLP.
   *
   * @param transcript - Voice note transcript text
   * @returns Array of person names
   *
   * @example
   * ```typescript
   * const names = await service.identifyContactNames(
   *   "Met with Sarah and Mike at the coffee shop"
   * );
   * // Returns: ["Sarah", "Mike"]
   * ```
   */
  async identifyContactNames(transcript: string): Promise<string[]> {
    try {
      const prompt = this.buildNameExtractionPrompt(transcript);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text);

      // Extract and clean names
      const names = Array.isArray(parsed.names) ? parsed.names : [];

      // Filter out empty strings and trim whitespace
      return names.map((name: string) => name.trim()).filter((name: string) => name.length > 0);
    } catch (error) {
      console.error('Failed to identify contact names:', error);
      return [];
    }
  }

  /**
   * Match identified names to user's contacts using fuzzy matching
   *
   * Uses Levenshtein distance for fuzzy string matching to handle:
   * - Typos and misspellings
   * - Partial names (first name only)
   * - Nicknames vs full names
   *
   * @param names - Extracted person names
   * @param userContacts - User's contact list
   * @returns Disambiguation result with matches and partial matches
   */
  async matchToContacts(names: string[], userContacts: Contact[]): Promise<DisambiguationResult> {
    const result: DisambiguationResult = {
      matches: [],
      partialMatches: [],
      unmatchedNames: [],
    };

    for (const name of names) {
      const candidates = this.findMatchingContacts(name, userContacts);

      if (candidates.length === 0) {
        // No matches found
        result.unmatchedNames.push(name);
      } else if (candidates[0].score >= this.EXACT_MATCH_THRESHOLD) {
        // High confidence match
        result.matches.push(candidates[0].contact);
      } else if (candidates[0].score >= this.PARTIAL_MATCH_THRESHOLD) {
        // Partial match - needs user review
        result.partialMatches.push({
          extractedName: name,
          candidates: candidates.slice(0, this.MAX_CANDIDATES),
        });
      } else {
        // Score too low
        result.unmatchedNames.push(name);
      }
    }

    return result;
  }

  /**
   * Find matching contacts for a given name
   *
   * @param name - Person name to match
   * @param userContacts - User's contact list
   * @returns Array of contact matches sorted by score (descending)
   * @private
   */
  private findMatchingContacts(name: string, userContacts: Contact[]): ContactMatch[] {
    const matches: ContactMatch[] = [];
    const nameLower = name.toLowerCase();

    for (const contact of userContacts) {
      const contactNameLower = contact.name.toLowerCase();

      // Calculate similarity scores for different matching strategies
      const exactScore = this.calculateExactMatchScore(nameLower, contactNameLower);
      const fuzzyScore = this.calculateFuzzyScore(nameLower, contactNameLower);
      const partialScore = this.calculatePartialMatchScore(nameLower, contactNameLower);

      // Use the best score
      const bestScore = Math.max(exactScore, fuzzyScore, partialScore);

      if (bestScore > 0) {
        matches.push({
          contact,
          score: bestScore,
          reason: this.getMatchReason(exactScore, fuzzyScore, partialScore),
        });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate exact match score
   *
   * @param name - Extracted name (lowercase)
   * @param contactName - Contact name (lowercase)
   * @returns Score (0-1)
   * @private
   */
  private calculateExactMatchScore(name: string, contactName: string): number {
    if (name === contactName) {
      return 1.0;
    }
    return 0;
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   *
   * @param name - Extracted name (lowercase)
   * @param contactName - Contact name (lowercase)
   * @returns Score (0-1)
   * @private
   */
  private calculateFuzzyScore(name: string, contactName: string): number {
    const distance = this.levenshteinDistance(name, contactName);
    const maxLength = Math.max(name.length, contactName.length);

    if (maxLength === 0) {
      return 0;
    }

    // Convert distance to similarity score (0-1)
    const similarity = 1 - distance / maxLength;

    // Apply threshold - only return score if similarity is reasonable
    return similarity >= 0.5 ? similarity : 0;
  }

  /**
   * Calculate partial match score (first name, last name, etc.)
   *
   * @param name - Extracted name (lowercase)
   * @param contactName - Contact name (lowercase)
   * @returns Score (0-1)
   * @private
   */
  private calculatePartialMatchScore(name: string, contactName: string): number {
    const nameParts = name.split(/\s+/);
    const contactParts = contactName.split(/\s+/);

    let bestScore = 0;

    // Check if any part of the extracted name matches any part of the contact name
    for (const namePart of nameParts) {
      // Skip empty parts but allow single characters (for nicknames like "J")
      if (namePart.length === 0) continue;

      for (const contactPart of contactParts) {
        if (namePart === contactPart) {
          // Exact match on a name part - high confidence for first name matches
          // If matching first name (first part of contact name), give higher score
          const isFirstName = contactPart === contactParts[0];
          bestScore = Math.max(bestScore, isFirstName ? 0.95 : 0.85);
        } else if (contactPart.startsWith(namePart) || namePart.startsWith(contactPart)) {
          // One name is a prefix of the other (e.g., "Mike" matches "Michael")
          const isFirstName = contactPart === contactParts[0];
          const prefixScore =
            Math.min(namePart.length, contactPart.length) /
            Math.max(namePart.length, contactPart.length);
          bestScore = Math.max(bestScore, prefixScore * (isFirstName ? 0.9 : 0.8));
        } else {
          // Fuzzy match on name parts
          const fuzzyScore = this.calculateFuzzyScore(namePart, contactPart);
          if (fuzzyScore > 0.5) {
            // Higher weight for first name fuzzy matches
            const isFirstName = contactPart === contactParts[0];
            const weight = isFirstName ? 0.85 : 0.75;
            bestScore = Math.max(bestScore, fuzzyScore * weight);
          }
        }
      }
    }

    return bestScore;
  }

  /**
   * Calculate Levenshtein distance between two strings
   *
   * Measures the minimum number of single-character edits (insertions, deletions, substitutions)
   * required to change one string into another.
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   * @private
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create matrix
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get human-readable match reason
   *
   * @param exactScore - Exact match score
   * @param fuzzyScore - Fuzzy match score
   * @param partialScore - Partial match score
   * @returns Match reason string
   * @private
   */
  private getMatchReason(exactScore: number, fuzzyScore: number, partialScore: number): string {
    if (exactScore === 1.0) {
      return 'Exact name match';
    } else if (fuzzyScore > partialScore) {
      return 'Similar name (fuzzy match)';
    } else {
      return 'Partial name match';
    }
  }

  /**
   * Build prompt for name extraction
   *
   * @param transcript - Voice note transcript
   * @returns Formatted prompt
   * @private
   */
  private buildNameExtractionPrompt(transcript: string): string {
    return `Extract all person names mentioned in the following voice note transcript.

Transcript:
${transcript}

Instructions:
- Extract only person names (not places, organizations, or other entities)
- Include first names, last names, or full names as mentioned
- Do not include pronouns (he, she, they, etc.)
- Do not include the speaker themselves
- Return an empty array if no person names are mentioned

Examples:
- "Had lunch with John" → ["John"]
- "Met Sarah and Mike at the park" → ["Sarah", "Mike"]
- "Went hiking today" → []
- "Called my mom" → ["mom"]`;
  }
}
