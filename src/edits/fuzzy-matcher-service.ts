/**
 * Fuzzy Matcher Service
 *
 * Handles contact/group matching with similarity scoring using Levenshtein distance.
 * Used for finding contacts when processing voice transcripts.
 *
 * Requirements: 7.2, 7.3, 8.1
 */

import { FuzzyMatchResult, Contact, Group } from '../types';
import { PostgresContactRepository } from '../contacts/repository';
import { PostgresGroupRepository } from '../contacts/group-repository';

const MATCH_THRESHOLD = 0.7;

/**
 * Fuzzy Matcher Service Interface
 */
export interface FuzzyMatcherServiceInterface {
  searchContacts(userId: string, query: string, limit?: number): Promise<FuzzyMatchResult[]>;
  searchGroups(userId: string, query: string, limit?: number): Promise<FuzzyMatchResult[]>;
  findBestMatch(userId: string, extractedName: string): Promise<FuzzyMatchResult | null>;
  calculateSimilarity(str1: string, str2: string): number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Fuzzy Matcher Service Implementation
 */
export class FuzzyMatcherService implements FuzzyMatcherServiceInterface {
  private contactRepository: PostgresContactRepository;
  private groupRepository: PostgresGroupRepository;

  constructor(
    contactRepository?: PostgresContactRepository,
    groupRepository?: PostgresGroupRepository
  ) {
    this.contactRepository = contactRepository || new PostgresContactRepository();
    this.groupRepository = groupRepository || new PostgresGroupRepository();
  }

  /**
   * Calculate similarity score between two strings (0-1, higher is more similar)
   */
  calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  /**
   * Search contacts by name with fuzzy matching
   * Returns results sorted by similarity score (descending)
   * Requirements: 7.3
   */
  async searchContacts(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<FuzzyMatchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const contacts = await this.contactRepository.findAll(userId, { archived: false });
    const results: FuzzyMatchResult[] = [];

    for (const contact of contacts) {
      const similarity = this.calculateSimilarity(query, contact.name);
      if (similarity > 0.3) { // Include partial matches
        results.push({
          id: contact.id,
          name: contact.name,
          type: 'contact',
          similarityScore: similarity,
        });
      }
    }

    // Sort by similarity score descending
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    return results.slice(0, limit);
  }

  /**
   * Search groups by name with fuzzy matching
   * Returns results sorted by similarity score (descending)
   */
  async searchGroups(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<FuzzyMatchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const groups = await this.groupRepository.findAll(userId, false);
    const results: FuzzyMatchResult[] = [];

    for (const group of groups) {
      const similarity = this.calculateSimilarity(query, group.name);
      if (similarity > 0.3) {
        results.push({
          id: group.id,
          name: group.name,
          type: 'group',
          similarityScore: similarity,
        });
      }
    }

    // Sort by similarity score descending
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    return results.slice(0, limit);
  }

  /**
   * Find best matching contact for an extracted name
   * Returns null if no match above threshold
   * Requirements: 8.1
   */
  async findBestMatch(
    userId: string,
    extractedName: string
  ): Promise<FuzzyMatchResult | null> {
    const results = await this.searchContacts(userId, extractedName, 1);
    
    if (results.length === 0) {
      return null;
    }

    const bestMatch = results[0];
    
    // Only return if above threshold
    if (bestMatch.similarityScore >= MATCH_THRESHOLD) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Get disambiguation candidates for an extracted name
   * Returns top 3 candidates with similarity scores
   * Requirements: 8.2
   */
  async getDisambiguationCandidates(
    userId: string,
    extractedName: string
  ): Promise<FuzzyMatchResult[]> {
    const results = await this.searchContacts(userId, extractedName, 3);
    return results;
  }
}
