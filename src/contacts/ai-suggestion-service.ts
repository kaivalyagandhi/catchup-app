/**
 * AI Suggestion Service
 *
 * Service for analyzing contacts and generating circle assignment suggestions
 * based on communication patterns, interaction history, and user behavior.
 */

import { Contact, InteractionLog, InteractionType, CalendarEvent } from '../types';
import { PostgresContactRepository } from './repository';
import { PostgresInteractionRepository } from './interaction-repository';
import { getCachedEvents } from '../calendar/calendar-events-repository';

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
  analyzeContactForOnboarding(
    userId: string,
    contactId: string,
    calendarEvents: CalendarEvent[]
  ): Promise<CircleSuggestion>;
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
   * Analyze a contact for onboarding with optimized scoring factors
   * Requirements: 5.2
   * 
   * This method is optimized for new users during onboarding who don't have
   * interaction history in CatchUp yet. It uses:
   * - Calendar events (35%): Shared calendar events as strongest signal
   * - Metadata richness (30%): Populated contact fields
   * - Contact age (15%): How long contact has existed
   * - Communication frequency (10%): Interactions per month (if available)
   * - Recency (10%): Days since last contact (if available)
   * 
   * @param userId - The user ID
   * @param contactId - The contact ID to analyze
   * @param calendarEvents - Calendar events to analyze for shared attendees
   * @returns Circle suggestion with confidence score
   */
  async analyzeContactForOnboarding(
    userId: string,
    contactId: string,
    calendarEvents: CalendarEvent[]
  ): Promise<CircleSuggestion> {
    // Get contact data
    const contact = await this.contactRepository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get interaction data (may be empty for new users)
    const interactions = await this.interactionRepository.findByContactId(contactId, userId);

    // Calculate new onboarding-optimized factors
    const calendarScore = this.calculateCalendarEventScore(contact, calendarEvents);
    const metadataScore = this.calculateMetadataRichnessScore(contact);
    const ageScore = this.calculateContactAgeScore(contact);

    // Calculate existing factors (with lower weight for new users)
    const frequencyFactor = this.calculateFrequencyFactor(interactions, new Date());
    const recencyFactor = this.calculateRecencyFactor(interactions, new Date());
    
    // Calculate voice notes factor
    const voiceNotesFactor = await this.calculateVoiceNotesFactor(contact.id, userId);

    // Weighted combination optimized for onboarding
    // UPDATED: Adjusted weights to include voice notes factor (10%)
    const weightedScore =
      calendarScore * 0.40 +      // Decreased from 0.45 - still strongest signal
      metadataScore * 0.30 +      // Decreased from 0.35 - second strongest
      voiceNotesFactor.value * 0.10 +  // NEW - voice notes engagement
      ageScore * 0.10 +           // Same
      frequencyFactor.value * 0.05 +  // Same
      recencyFactor.value * 0.05;     // Same

    // Build factors array for transparency
    const factors: SuggestionFactor[] = [
      {
        type: 'calendar_events',
        weight: 0.40,
        value: calendarScore,
        description: `Calendar event score: ${calendarScore}`,
      },
      {
        type: 'communication_frequency',
        weight: 0.30,
        value: metadataScore,
        description: `Metadata richness: ${metadataScore}`,
      },
      voiceNotesFactor,  // Already has weight: 0.10
      {
        type: 'recency',
        weight: 0.10,
        value: ageScore,
        description: `Contact age score: ${ageScore}`,
      },
      frequencyFactor,
      recencyFactor,
    ];

    // Determine circle based on weighted score
    const { suggestedCircle, confidence, alternatives } = this.determineCircle(factors, userId);

    return {
      contactId,
      suggestedCircle,
      confidence,
      factors,
      alternativeCircles: alternatives,
    };
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

    // Factor 5: Voice notes enrichment (NEW)
    const voiceNotesFactor = await this.calculateVoiceNotesFactor(contact.id, userId);
    factors.push(voiceNotesFactor);

    return factors;
  }

  /**
   * Calculate communication frequency factor
   */
  private calculateFrequencyFactor(interactions: InteractionLog[], now: Date): SuggestionFactor {
    if (interactions.length === 0) {
      return {
        type: 'communication_frequency',
        weight: 0.05,  // Low weight for onboarding
        value: 25,     // Give baseline score instead of 0
        description: 'No interaction history (baseline score)',
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
      weight: 0.05,  // Low weight for onboarding
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
        weight: 0.05,  // Low weight for onboarding
        value: 25,     // Give baseline score instead of 0
        description: 'No recent interactions (baseline score)',
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
      weight: 0.05,  // Low weight for onboarding
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
   * Calculate voice notes enrichment factor
   * 
   * Voice notes indicate active engagement and relationship importance.
   * Scoring based on:
   * - Number of voice notes about this contact
   * - Recency of voice notes
   * - Amount of enrichment applied (tags, fields, etc.)
   */
  private async calculateVoiceNotesFactor(
    contactId: string,
    userId: string
  ): Promise<SuggestionFactor> {
    try {
      const pool = (await import('../db/connection')).default;

      // Query voice notes for this contact
      const result = await pool.query(
        `SELECT 
          COUNT(DISTINCT vnc.voice_note_id) as note_count,
          COUNT(DISTINCT ei.id) as enrichment_count,
          MAX(vn.recording_timestamp) as last_note_date
         FROM voice_note_contacts vnc
         JOIN voice_notes vn ON vnc.voice_note_id = vn.id
         LEFT JOIN enrichment_items ei ON ei.voice_note_id = vn.id 
           AND ei.contact_id = vnc.contact_id 
           AND ei.applied = true
         WHERE vnc.contact_id = $1 
           AND vn.user_id = $2
           AND vn.status IN ('ready', 'applied')`,
        [contactId, userId]
      );

      const noteCount = parseInt(result.rows[0]?.note_count || '0');
      const enrichmentCount = parseInt(result.rows[0]?.enrichment_count || '0');
      const lastNoteDate = result.rows[0]?.last_note_date;

      if (noteCount === 0) {
        return {
          type: 'multi_channel',  // Reuse multi_channel type for voice notes
          weight: 0.10,
          value: 0,
          description: 'No voice notes',
        };
      }

      // Calculate recency score (0-30 points)
      let recencyScore = 0;
      if (lastNoteDate) {
        const daysSinceNote = (Date.now() - new Date(lastNoteDate).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceNote < 7) recencyScore = 30;
        else if (daysSinceNote < 30) recencyScore = 20;
        else if (daysSinceNote < 90) recencyScore = 10;
        else recencyScore = 5;
      }

      // Calculate frequency score (0-40 points)
      // 5+ notes = 40, 3-4 notes = 30, 2 notes = 20, 1 note = 10
      let frequencyScore = 0;
      if (noteCount >= 5) frequencyScore = 40;
      else if (noteCount >= 3) frequencyScore = 30;
      else if (noteCount >= 2) frequencyScore = 20;
      else frequencyScore = 10;

      // Calculate enrichment score (0-30 points)
      // 10+ enrichments = 30, 5+ = 20, 2+ = 10, 1 = 5
      let enrichmentScore = 0;
      if (enrichmentCount >= 10) enrichmentScore = 30;
      else if (enrichmentCount >= 5) enrichmentScore = 20;
      else if (enrichmentCount >= 2) enrichmentScore = 10;
      else if (enrichmentCount >= 1) enrichmentScore = 5;

      const totalScore = recencyScore + frequencyScore + enrichmentScore;

      return {
        type: 'multi_channel',  // Reuse multi_channel type
        weight: 0.10,
        value: totalScore,
        description: `${noteCount} voice note${noteCount !== 1 ? 's' : ''}, ${enrichmentCount} enrichment${enrichmentCount !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Error calculating voice notes factor:', error);
      return {
        type: 'multi_channel',
        weight: 0.10,
        value: 0,
        description: 'Error calculating voice notes',
      };
    }
  }

  /**
   * Calculate calendar event score based on shared calendar events
   * Requirements: 5.2, 5.3
   * 
   * Counts calendar events where the contact's email appears as an attendee.
   * This is a strong signal for relationship depth during onboarding.
   * UPDATED: More generous scoring to generate better suggestions
   */
  private calculateCalendarEventScore(
    contact: Contact,
    calendarEvents: CalendarEvent[]
  ): number {
    if (!contact.email || calendarEvents.length === 0) {
      return 0;
    }

    const contactEmail = contact.email.toLowerCase();

    // Count events where contact's email appears as attendee
    const sharedEvents = calendarEvents.filter((event) =>
      event.attendees?.some((attendee) => 
        attendee.email?.toLowerCase() === contactEmail
      )
    );

    const count = sharedEvents.length;

    // UPDATED: More generous scoring for better suggestions
    // 10+ events = 100, 5+ = 85, 3+ = 70, 2 = 55, 1 = 40, 0 = 0
    if (count >= 10) return 100;
    if (count >= 5) return 85;
    if (count >= 3) return 70;
    if (count >= 2) return 55;
    if (count >= 1) return 40;
    return 0;
  }

  /**
   * Calculate metadata richness score based on populated contact fields
   * Requirements: 5.4
   * 
   * Scores based on:
   * - email: +5
   * - phone: +5
   * - location: +10
   * - customNotes: +10
   * - linkedIn: +5
   * - instagram: +5
   * - xHandle: +5
   * - otherSocialMedia: +5 per platform
   * 
   * Normalized to 0-100 range
   */
  private calculateMetadataRichnessScore(contact: Contact): number {
    let score = 0;

    // Email
    if (contact.email) score += 5;

    // Phone
    if (contact.phone) score += 5;

    // Location
    if (contact.location) score += 10;

    // Custom notes
    if (contact.customNotes) score += 10;

    // Social profiles
    if (contact.linkedIn) score += 5;
    if (contact.instagram) score += 5;
    if (contact.xHandle) score += 5;

    // Other social media platforms
    if (contact.otherSocialMedia) {
      const platformCount = Object.keys(contact.otherSocialMedia).length;
      score += Math.min(15, platformCount * 5); // Max 15 points for other platforms
    }

    // Normalize to 0-100 range
    // Maximum possible score is ~60 (all fields populated)
    // Multiply by 1.67 to scale to 100
    return Math.min(100, Math.round(score * 1.67));
  }

  /**
   * Calculate contact age score based on how long the contact has existed
   * Requirements: 5.2
   * 
   * Older contacts in Google Contacts likely represent more established relationships.
   * Score based on contact age:
   * - 5+ years: 100
   * - 3-5 years: 85
   * - 2-3 years: 70
   * - 1-2 years: 55
   * - 6-12 months: 40
   * - 3-6 months: 25
   * - < 3 months: 10
   */
  private calculateContactAgeScore(contact: Contact): number {
    if (!contact.createdAt) {
      return 50; // Default score if no creation date
    }

    const now = new Date();
    const ageInDays = (now.getTime() - contact.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const ageInYears = ageInDays / 365;

    if (ageInYears >= 5) return 100;
    if (ageInYears >= 3) return 85;
    if (ageInYears >= 2) return 70;
    if (ageInYears >= 1) return 55;
    if (ageInDays >= 180) return 40; // 6 months
    if (ageInDays >= 90) return 25;  // 3 months
    return 10;
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

    // Log scoring for debugging
    console.log(`[AI Suggestions] Weighted score: ${weightedScore.toFixed(2)}, factors:`, 
      factors.map(f => `${f.type}=${f.value.toFixed(1)} (weight=${f.weight})`).join(', '));

    // Determine circle based on score
    // UPDATED: Further lowered thresholds to generate more suggestions
    // Inner Circle (10): 65-100 (was 75-100, originally 85-100)
    // Close Friends (25): 45-64 (was 55-74, originally 70-84)
    // Active Friends (50): 25-44 (was 35-54, originally 50-69)
    // Casual Network (100): 0-24 (was 0-34, originally 0-49)
    let suggestedCircle: DunbarCircle;
    let confidence: number;

    if (weightedScore >= 65) {
      suggestedCircle = 'inner';
      confidence = Math.min(100, 60 + (weightedScore - 65) * 1.2);
    } else if (weightedScore >= 45) {
      suggestedCircle = 'close';
      confidence = Math.min(100, 55 + (weightedScore - 45) * 1.5);
    } else if (weightedScore >= 25) {
      suggestedCircle = 'active';
      confidence = Math.min(100, 50 + (weightedScore - 25) * 1.5);
    } else {
      suggestedCircle = 'casual';
      confidence = Math.min(100, 45 + weightedScore * 1.0);
    }

    console.log(`[AI Suggestions] Determined circle: ${suggestedCircle} (confidence: ${confidence.toFixed(1)})`);

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

export const analyzeContactForOnboarding = (
  userId: string,
  contactId: string,
  calendarEvents: CalendarEvent[]
) => defaultService.analyzeContactForOnboarding(userId, contactId, calendarEvents);
