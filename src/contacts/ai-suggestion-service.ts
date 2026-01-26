/**
 * AI Suggestion Service
 *
 * Service for analyzing contacts and generating circle assignment suggestions
 * based on communication patterns, interaction history, and user behavior.
 */

import { Contact, InteractionLog, InteractionType } from '../types';
import { PostgresContactRepository } from './repository';
import { PostgresInteractionRepository } from './interaction-repository';

export type DunbarCircle = 'inner' | 'close' | 'active' | 'casual';

export interface CircleSuggestion {
  contactId: string;
  suggestedCircle: DunbarCircle;
  confidence: number; // 0-100
  factors: SuggestionFactor[];
  alternativeCircles: Array<{
    circle: DunbarCircle;
    confidence: number;
  }>;
}

export interface SuggestionFactor {
  type:
    | 'communication_frequency'
    | 'recency'
    | 'consistency'
    | 'calendar_events'
    | 'response_time'
    | 'multi_channel';
  weight: number;
  value: number;
  description: string;
}

export interface UserOverride {
  userId: string;
  contactId: string;
  suggestedCircle: DunbarCircle;
  actualCircle: DunbarCircle;
  factors: SuggestionFactor[];
  recordedAt: Date;
}

/**
 * AI Suggestion Service Interface
 */
export interface AISuggestionService {
  analyzeContact(userId: string, contactId: string): Promise<CircleSuggestion>;
  batchAnalyze(userId: string, contactIds: string[]): Promise<CircleSuggestion[]>;
  recordUserOverride(
    userId: string,
    contactId: string,
    suggested: DunbarCircle,
    actual: DunbarCircle
  ): Promise<void>;
  improveModel(userId: string): Promise<void>;
}

/**
 * PostgreSQL AI Suggestion Service Implementation
 */
export class PostgresAISuggestionService implements AISuggestionService {
  private contactRepository: PostgresContactRepository;
  private interactionRepository: PostgresInteractionRepository;
  private suggestionCache: Map<string, { suggestion: CircleSuggestion; timestamp: number }>;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    contactRepository?: PostgresContactRepository,
    interactionRepository?: PostgresInteractionRepository
  ) {
    this.contactRepository = contactRepository || new PostgresContactRepository();
    this.interactionRepository = interactionRepository || new PostgresInteractionRepository();
    this.suggestionCache = new Map();
  }

  /**
   * Analyze a single contact and generate circle suggestion
   */
  async analyzeContact(userId: string, contactId: string): Promise<CircleSuggestion> {
    // Check cache first
    const cacheKey = `${userId}:${contactId}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.suggestion;
    }

    // Get contact and interaction data
    const contact = await this.contactRepository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const interactions = await this.interactionRepository.findByContactId(contactId, userId);

    // Calculate suggestion factors
    const factors = await this.calculateFactors(contact, interactions, userId);

    // Determine suggested circle based on factors
    const { suggestedCircle, confidence, alternatives } = this.determineCircle(factors, userId);

    const suggestion: CircleSuggestion = {
      contactId,
      suggestedCircle,
      confidence,
      factors,
      alternativeCircles: alternatives,
    };

    // Cache the suggestion
    this.suggestionCache.set(cacheKey, { suggestion, timestamp: Date.now() });

    return suggestion;
  }

  /**
   * Analyze multiple contacts in batch with optimized concurrency
   * Requirements: 9.1 - Optimize AI batch analysis requests
   */
  async batchAnalyze(
    userId: string,
    contactIds: string[],
    options: { concurrency?: number; useCache?: boolean } = {}
  ): Promise<CircleSuggestion[]> {
    const { concurrency = 5, useCache = true } = options;

    // If cache is disabled, clear cache for these contacts
    if (!useCache) {
      contactIds.forEach((contactId) => {
        const cacheKey = `${userId}:${contactId}`;
        this.suggestionCache.delete(cacheKey);
      });
    }

    // Process in batches with concurrency limit
    const results: CircleSuggestion[] = [];
    const queue = [...contactIds];
    const inProgress: Promise<CircleSuggestion>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      // Fill up to concurrency limit
      while (inProgress.length < concurrency && queue.length > 0) {
        const contactId = queue.shift()!;
        const promise = this.analyzeContact(userId, contactId);
        inProgress.push(promise);

        promise
          .then((suggestion) => {
            results.push(suggestion);
            const index = inProgress.indexOf(promise);
            if (index > -1) {
              inProgress.splice(index, 1);
            }
          })
          .catch((error) => {
            console.error(`Error analyzing contact ${contactId}:`, error);
            // Remove from in-progress on error
            const index = inProgress.indexOf(promise);
            if (index > -1) {
              inProgress.splice(index, 1);
            }
          });
      }

      // Wait for at least one to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  /**
   * Record user override for learning
   */
  async recordUserOverride(
    userId: string,
    contactId: string,
    suggested: DunbarCircle,
    actual: DunbarCircle
  ): Promise<void> {
    const pool = (await import('../db/connection')).default;

    // Get the factors that led to the suggestion
    const contact = await this.contactRepository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const interactions = await this.interactionRepository.findByContactId(contactId, userId);
    const factors = await this.calculateFactors(contact, interactions, userId);

    // Store the override
    await pool.query(
      `INSERT INTO ai_circle_overrides (user_id, contact_id, suggested_circle, actual_circle, factors, recorded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, contactId, suggested, actual, JSON.stringify(factors)]
    );

    // Invalidate cache for this contact
    const cacheKey = `${userId}:${contactId}`;
    this.suggestionCache.delete(cacheKey);
  }

  /**
   * Improve model based on user overrides
   * This is a placeholder for future ML model training
   */
  async improveModel(userId: string): Promise<void> {
    const pool = (await import('../db/connection')).default;

    // Get all overrides for this user
    const result = await pool.query(
      `SELECT * FROM ai_circle_overrides WHERE user_id = $1 ORDER BY recorded_at DESC`,
      [userId]
    );

    // In a real implementation, this would:
    // 1. Analyze patterns in user corrections
    // 2. Adjust factor weights based on what the user values
    // 3. Update a user-specific model or preferences
    // For now, we just log that we would do this
    console.log(`Would improve model for user ${userId} based on ${result.rows.length} overrides`);
  }

  /**
   * Calculate suggestion factors based on contact and interaction data
   */
  private async calculateFactors(
    contact: Contact,
    interactions: InteractionLog[],
    userId: string
  ): Promise<SuggestionFactor[]> {
    const factors: SuggestionFactor[] = [];
    const now = new Date();

    // Factor 1: Communication Frequency
    const frequencyFactor = this.calculateFrequencyFactor(interactions, now);
    factors.push(frequencyFactor);

    // Factor 2: Recency
    const recencyFactor = this.calculateRecencyFactor(interactions, now);
    factors.push(recencyFactor);

    // Factor 3: Consistency
    const consistencyFactor = this.calculateConsistencyFactor(interactions);
    factors.push(consistencyFactor);

    // Factor 4: Multi-channel communication
    const multiChannelFactor = this.calculateMultiChannelFactor(interactions);
    factors.push(multiChannelFactor);

    return factors;
  }

  /**
   * Calculate communication frequency factor
   */
  private calculateFrequencyFactor(interactions: InteractionLog[], now: Date): SuggestionFactor {
    if (interactions.length === 0) {
      return {
        type: 'communication_frequency',
        weight: 0.3,
        value: 0,
        description: 'No interaction history',
      };
    }

    // Calculate interactions per month over the last 6 months
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentInteractions = interactions.filter((i) => i.date >= sixMonthsAgo);
    const monthsOfData = Math.max(
      1,
      (now.getTime() - sixMonthsAgo.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const interactionsPerMonth = recentInteractions.length / monthsOfData;

    // Score: 0-100 based on frequency
    // Daily (20+/month) = 95+, Weekly (4-8/month) = 70-85, Monthly (1-2/month) = 40, Rare (<1/month) = 20
    let value: number;
    if (interactionsPerMonth >= 20) value = 95;
    else if (interactionsPerMonth >= 10) value = 85;
    else if (interactionsPerMonth >= 8) value = 80;
    else if (interactionsPerMonth >= 4) value = 70;
    else if (interactionsPerMonth >= 2) value = 50;
    else if (interactionsPerMonth >= 1) value = 40;
    else if (interactionsPerMonth >= 0.5) value = 25;
    else value = 10;

    return {
      type: 'communication_frequency',
      weight: 0.3,
      value,
      description: `${interactionsPerMonth.toFixed(1)} interactions per month`,
    };
  }

  /**
   * Calculate recency factor
   */
  private calculateRecencyFactor(interactions: InteractionLog[], now: Date): SuggestionFactor {
    if (interactions.length === 0) {
      return {
        type: 'recency',
        weight: 0.25,
        value: 0,
        description: 'No recent interactions',
      };
    }

    const mostRecent = interactions[0].date; // Already sorted DESC
    const daysSinceContact = (now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000);

    // Score: 0-100 based on recency
    // <7 days = 100, <14 days = 80, <30 days = 60, <90 days = 40, <180 days = 20, >180 days = 10
    let value: number;
    if (daysSinceContact < 7) value = 100;
    else if (daysSinceContact < 14) value = 85;
    else if (daysSinceContact < 30) value = 70;
    else if (daysSinceContact < 60) value = 50;
    else if (daysSinceContact < 90) value = 35;
    else if (daysSinceContact < 180) value = 20;
    else value = 10;

    return {
      type: 'recency',
      weight: 0.25,
      value,
      description: `Last contact ${Math.floor(daysSinceContact)} days ago`,
    };
  }

  /**
   * Calculate consistency factor
   */
  private calculateConsistencyFactor(interactions: InteractionLog[]): SuggestionFactor {
    if (interactions.length < 3) {
      return {
        type: 'consistency',
        weight: 0.2,
        value: 50,
        description: 'Insufficient data for consistency analysis',
      };
    }

    // Calculate variance in time between interactions
    const intervals: number[] = [];
    for (let i = 0; i < interactions.length - 1; i++) {
      const interval = interactions[i].date.getTime() - interactions[i + 1].date.getTime();
      intervals.push(interval / (24 * 60 * 60 * 1000)); // Convert to days
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    // Lower CV = more consistent = higher score
    // CV < 0.3 = very consistent (90), CV < 0.5 = consistent (70), CV < 1.0 = moderate (50), CV > 1.0 = inconsistent (30)
    let value: number;
    if (coefficientOfVariation < 0.3) value = 90;
    else if (coefficientOfVariation < 0.5) value = 75;
    else if (coefficientOfVariation < 0.8) value = 60;
    else if (coefficientOfVariation < 1.2) value = 45;
    else value = 30;

    return {
      type: 'consistency',
      weight: 0.2,
      value,
      description: `Interaction pattern consistency: ${coefficientOfVariation < 0.5 ? 'high' : coefficientOfVariation < 1.0 ? 'moderate' : 'low'}`,
    };
  }

  /**
   * Calculate multi-channel factor
   */
  private calculateMultiChannelFactor(interactions: InteractionLog[]): SuggestionFactor {
    if (interactions.length === 0) {
      return {
        type: 'multi_channel',
        weight: 0.15,
        value: 0,
        description: 'No interaction channels',
      };
    }

    const channels = new Set(interactions.map((i) => i.type));
    const channelCount = channels.size;

    // Score based on number of communication channels
    // 4+ channels = 100, 3 channels = 80, 2 channels = 60, 1 channel = 40
    let value: number;
    if (channelCount >= 4) value = 100;
    else if (channelCount === 3) value = 80;
    else if (channelCount === 2) value = 60;
    else value = 40;

    return {
      type: 'multi_channel',
      weight: 0.15,
      value,
      description: `${channelCount} communication channel${channelCount !== 1 ? 's' : ''} used`,
    };
  }

  /**
   * Determine circle based on weighted factors
   */
  private determineCircle(
    factors: SuggestionFactor[],
    userId: string
  ): {
    suggestedCircle: DunbarCircle;
    confidence: number;
    alternatives: Array<{ circle: DunbarCircle; confidence: number }>;
  } {
    // Calculate weighted score
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = factors.reduce((sum, f) => sum + f.value * f.weight, 0) / totalWeight;

    // Determine circle based on score
    // Simplified 4-circle scoring thresholds:
    // Inner Circle (10): 85-100
    // Close Friends (25): 70-84
    // Active Friends (50): 50-69
    // Casual Network (100): 0-49
    let suggestedCircle: DunbarCircle;
    let confidence: number;

    if (weightedScore >= 85) {
      suggestedCircle = 'inner';
      confidence = Math.min(100, 70 + (weightedScore - 85) * 2);
    } else if (weightedScore >= 70) {
      suggestedCircle = 'close';
      confidence = Math.min(100, 65 + (weightedScore - 70) * 2);
    } else if (weightedScore >= 50) {
      suggestedCircle = 'active';
      confidence = Math.min(100, 60 + (weightedScore - 50) * 1.5);
    } else {
      suggestedCircle = 'casual';
      confidence = Math.min(100, 55 + weightedScore * 0.9);
    }

    // Generate alternative suggestions
    const alternatives = this.generateAlternatives(weightedScore, suggestedCircle);

    return { suggestedCircle, confidence, alternatives };
  }

  /**
   * Generate alternative circle suggestions
   */
  private generateAlternatives(
    score: number,
    primary: DunbarCircle
  ): Array<{ circle: DunbarCircle; confidence: number }> {
    const circles: DunbarCircle[] = ['inner', 'close', 'active', 'casual'];
    const alternatives: Array<{ circle: DunbarCircle; confidence: number }> = [];

    // Add adjacent circles as alternatives with lower confidence
    const primaryIndex = circles.indexOf(primary);

    if (primaryIndex > 0) {
      // One circle closer
      alternatives.push({
        circle: circles[primaryIndex - 1],
        confidence: Math.max(30, score - 10),
      });
    }

    if (primaryIndex < circles.length - 1) {
      // One circle further
      alternatives.push({
        circle: circles[primaryIndex + 1],
        confidence: Math.max(30, score - 15),
      });
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }
}

// Default instance
const defaultService = new PostgresAISuggestionService();

export const analyzeContact = (userId: string, contactId: string) =>
  defaultService.analyzeContact(userId, contactId);

export const batchAnalyze = (userId: string, contactIds: string[]) =>
  defaultService.batchAnalyze(userId, contactIds);

export const recordUserOverride = (
  userId: string,
  contactId: string,
  suggested: DunbarCircle,
  actual: DunbarCircle
) => defaultService.recordUserOverride(userId, contactId, suggested, actual);

export const improveModel = (userId: string) => defaultService.improveModel(userId);
