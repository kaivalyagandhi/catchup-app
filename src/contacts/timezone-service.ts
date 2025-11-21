/**
 * Timezone Service
 *
 * Handles timezone inference from location using static city dataset
 * and fuzzy string matching (Levenshtein distance).
 */

import { CityTimezoneData } from '../types';
import cityTimezonesData from './city-timezones.json';

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of location names
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
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
 * Calculate similarity score between two strings (0-1, higher is more similar)
 */
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Timezone Service Interface
 */
export interface TimezoneService {
  inferTimezoneFromLocation(location: string): string | null;
  getCityDataset(): CityTimezoneData[];
  findBestMatch(location: string): { city: CityTimezoneData; score: number } | null;
}

/**
 * Timezone Service Implementation
 */
export class TimezoneServiceImpl implements TimezoneService {
  private cityData: CityTimezoneData[];
  private readonly SIMILARITY_THRESHOLD = 0.7; // Minimum similarity score for a match

  constructor() {
    this.cityData = cityTimezonesData as CityTimezoneData[];
  }

  /**
   * Infer timezone from location string
   * Returns timezone identifier or null if no match found
   */
  inferTimezoneFromLocation(location: string): string | null {
    if (!location || location.trim() === '') {
      return null;
    }

    const normalizedLocation = location.trim().toLowerCase();

    // Try exact match first (case-insensitive)
    for (const city of this.cityData) {
      if (city.city.toLowerCase() === normalizedLocation) {
        return city.timezone;
      }

      // Check aliases
      if (city.aliases) {
        for (const alias of city.aliases) {
          if (alias.toLowerCase() === normalizedLocation) {
            return city.timezone;
          }
        }
      }
    }

    // Try fuzzy matching
    const bestMatch = this.findBestMatch(location);
    if (bestMatch && bestMatch.score >= this.SIMILARITY_THRESHOLD) {
      return bestMatch.city.timezone;
    }

    // No match found
    return null;
  }

  /**
   * Find best matching city using fuzzy string matching
   */
  findBestMatch(location: string): { city: CityTimezoneData; score: number } | null {
    if (!location || location.trim() === '') {
      return null;
    }

    const normalizedLocation = location.trim();
    let bestMatch: { city: CityTimezoneData; score: number } | null = null;
    let bestScore = 0;

    for (const city of this.cityData) {
      // Check city name
      const cityScore = similarityScore(normalizedLocation, city.city);
      if (cityScore > bestScore) {
        bestScore = cityScore;
        bestMatch = { city, score: cityScore };
      }

      // Check aliases
      if (city.aliases) {
        for (const alias of city.aliases) {
          const aliasScore = similarityScore(normalizedLocation, alias);
          if (aliasScore > bestScore) {
            bestScore = aliasScore;
            bestMatch = { city, score: aliasScore };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get the complete city timezone dataset
   */
  getCityDataset(): CityTimezoneData[] {
    return this.cityData;
  }
}

// Export singleton instance
export const timezoneService = new TimezoneServiceImpl();
