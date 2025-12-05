/**
 * Onboarding Analytics Tracker
 * 
 * Tracks key onboarding events for product insights:
 * - Onboarding start
 * - Step completions
 * - Dismissals and resumes
 * - Completion rate
 * - Time to complete
 * 
 * Requirements: All requirements (product insights)
 */

export interface OnboardingEvent {
  userId: string;
  eventType: OnboardingEventType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum OnboardingEventType {
  ONBOARDING_STARTED = 'onboarding_started',
  STEP_1_STARTED = 'step_1_started',
  STEP_1_COMPLETED = 'step_1_completed',
  STEP_2_STARTED = 'step_2_started',
  STEP_2_COMPLETED = 'step_2_completed',
  STEP_3_STARTED = 'step_3_started',
  STEP_3_COMPLETED = 'step_3_completed',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  ONBOARDING_DISMISSED = 'onboarding_dismissed',
  ONBOARDING_RESUMED = 'onboarding_resumed',
  CIRCLE_ASSIGNED = 'circle_assigned',
  AI_SUGGESTION_ACCEPTED = 'ai_suggestion_accepted',
  AI_SUGGESTION_REJECTED = 'ai_suggestion_rejected',
  GROUP_MAPPING_ACCEPTED = 'group_mapping_accepted',
  GROUP_MAPPING_REJECTED = 'group_mapping_rejected',
  SEARCH_USED = 'search_used',
  EDUCATIONAL_TIP_EXPANDED = 'educational_tip_expanded',
}

export class OnboardingAnalytics {
  private static instance: OnboardingAnalytics;
  private events: OnboardingEvent[] = [];
  private sessionStartTime: Date | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OnboardingAnalytics {
    if (!OnboardingAnalytics.instance) {
      OnboardingAnalytics.instance = new OnboardingAnalytics();
    }
    return OnboardingAnalytics.instance;
  }

  /**
   * Track an onboarding event
   */
  track(userId: string, eventType: OnboardingEventType, metadata?: Record<string, any>): void {
    const event: OnboardingEvent = {
      userId,
      eventType,
      timestamp: new Date(),
      metadata: metadata || {},
    };

    // Store event in memory
    this.events.push(event);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Onboarding Analytics]', event);
    }

    // Send to analytics service (if configured)
    this.sendToAnalyticsService(event);

    // Store in database for later analysis
    this.persistEvent(event);
  }

  /**
   * Track onboarding start
   */
  trackOnboardingStarted(userId: string): void {
    this.sessionStartTime = new Date();
    this.track(userId, OnboardingEventType.ONBOARDING_STARTED, {
      startTime: this.sessionStartTime.toISOString(),
    });
  }

  /**
   * Track step started
   */
  trackStepStarted(userId: string, step: number): void {
    const eventType = step === 1 ? OnboardingEventType.STEP_1_STARTED :
                      step === 2 ? OnboardingEventType.STEP_2_STARTED :
                      OnboardingEventType.STEP_3_STARTED;
    
    this.track(userId, eventType, {
      step,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track step completed
   */
  trackStepCompleted(userId: string, step: number, metadata?: Record<string, any>): void {
    const eventType = step === 1 ? OnboardingEventType.STEP_1_COMPLETED :
                      step === 2 ? OnboardingEventType.STEP_2_COMPLETED :
                      OnboardingEventType.STEP_3_COMPLETED;
    
    this.track(userId, eventType, {
      step,
      completedAt: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Track onboarding completion
   */
  trackOnboardingCompleted(userId: string): void {
    const completionTime = new Date();
    const timeToComplete = this.sessionStartTime 
      ? completionTime.getTime() - this.sessionStartTime.getTime()
      : null;

    this.track(userId, OnboardingEventType.ONBOARDING_COMPLETED, {
      completedAt: completionTime.toISOString(),
      timeToCompleteMs: timeToComplete,
      timeToCompleteMinutes: timeToComplete ? Math.round(timeToComplete / 60000) : null,
    });
  }

  /**
   * Track onboarding dismissal
   */
  trackOnboardingDismissed(userId: string, currentStep: number): void {
    this.track(userId, OnboardingEventType.ONBOARDING_DISMISSED, {
      dismissedAt: new Date().toISOString(),
      currentStep,
    });
  }

  /**
   * Track onboarding resume
   */
  trackOnboardingResumed(userId: string, resumedStep: number): void {
    this.track(userId, OnboardingEventType.ONBOARDING_RESUMED, {
      resumedAt: new Date().toISOString(),
      resumedStep,
    });
  }

  /**
   * Track circle assignment
   */
  trackCircleAssigned(userId: string, contactId: string, circle: string, wasAISuggestion: boolean): void {
    this.track(userId, OnboardingEventType.CIRCLE_ASSIGNED, {
      contactId,
      circle,
      wasAISuggestion,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track AI suggestion acceptance
   */
  trackAISuggestionAccepted(userId: string, contactId: string, suggestedCircle: string, confidence: number): void {
    this.track(userId, OnboardingEventType.AI_SUGGESTION_ACCEPTED, {
      contactId,
      suggestedCircle,
      confidence,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track AI suggestion rejection
   */
  trackAISuggestionRejected(userId: string, contactId: string, suggestedCircle: string, selectedCircle: string): void {
    this.track(userId, OnboardingEventType.AI_SUGGESTION_REJECTED, {
      contactId,
      suggestedCircle,
      selectedCircle,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track group mapping acceptance
   */
  trackGroupMappingAccepted(userId: string, mappingId: string, googleGroupId: string, targetGroupId: string): void {
    this.track(userId, OnboardingEventType.GROUP_MAPPING_ACCEPTED, {
      mappingId,
      googleGroupId,
      targetGroupId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track group mapping rejection
   */
  trackGroupMappingRejected(userId: string, mappingId: string, googleGroupId: string): void {
    this.track(userId, OnboardingEventType.GROUP_MAPPING_REJECTED, {
      mappingId,
      googleGroupId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track search usage
   */
  trackSearchUsed(userId: string, query: string, resultsCount: number): void {
    this.track(userId, OnboardingEventType.SEARCH_USED, {
      query: query.substring(0, 50), // Truncate for privacy
      resultsCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track educational tip expansion
   */
  trackEducationalTipExpanded(userId: string): void {
    this.track(userId, OnboardingEventType.EDUCATIONAL_TIP_EXPANDED, {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all events for a user
   */
  getEvents(userId: string): OnboardingEvent[] {
    return this.events.filter(event => event.userId === userId);
  }

  /**
   * Get completion rate statistics
   */
  async getCompletionStats(): Promise<{
    started: number;
    completed: number;
    completionRate: number;
    averageTimeMinutes: number;
  }> {
    // This would typically query the database
    // For now, return mock data structure
    const started = this.events.filter(e => e.eventType === OnboardingEventType.ONBOARDING_STARTED).length;
    const completed = this.events.filter(e => e.eventType === OnboardingEventType.ONBOARDING_COMPLETED).length;
    
    const completionRate = started > 0 ? (completed / started) * 100 : 0;
    
    // Calculate average time to complete
    const completionEvents = this.events.filter(e => e.eventType === OnboardingEventType.ONBOARDING_COMPLETED);
    const totalTime = completionEvents.reduce((sum, event) => {
      return sum + (event.metadata?.timeToCompleteMinutes || 0);
    }, 0);
    const averageTimeMinutes = completionEvents.length > 0 ? totalTime / completionEvents.length : 0;

    return {
      started,
      completed,
      completionRate,
      averageTimeMinutes,
    };
  }

  /**
   * Get step completion funnel
   */
  async getStepFunnel(userId?: string): Promise<{
    step1Started: number;
    step1Completed: number;
    step2Started: number;
    step2Completed: number;
    step3Started: number;
    step3Completed: number;
  }> {
    const filterByUser = (events: OnboardingEvent[]) => 
      userId ? events.filter(e => e.userId === userId) : events;

    return {
      step1Started: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_1_STARTED)).length,
      step1Completed: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_1_COMPLETED)).length,
      step2Started: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_2_STARTED)).length,
      step2Completed: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_2_COMPLETED)).length,
      step3Started: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_3_STARTED)).length,
      step3Completed: filterByUser(this.events.filter(e => e.eventType === OnboardingEventType.STEP_3_COMPLETED)).length,
    };
  }

  /**
   * Get dismissal and resume statistics
   */
  async getDismissalStats(): Promise<{
    dismissed: number;
    resumed: number;
    resumeRate: number;
  }> {
    const dismissed = this.events.filter(e => e.eventType === OnboardingEventType.ONBOARDING_DISMISSED).length;
    const resumed = this.events.filter(e => e.eventType === OnboardingEventType.ONBOARDING_RESUMED).length;
    const resumeRate = dismissed > 0 ? (resumed / dismissed) * 100 : 0;

    return {
      dismissed,
      resumed,
      resumeRate,
    };
  }

  /**
   * Get AI suggestion acceptance rate
   */
  async getAISuggestionStats(): Promise<{
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  }> {
    const accepted = this.events.filter(e => e.eventType === OnboardingEventType.AI_SUGGESTION_ACCEPTED).length;
    const rejected = this.events.filter(e => e.eventType === OnboardingEventType.AI_SUGGESTION_REJECTED).length;
    const total = accepted + rejected;
    const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

    return {
      accepted,
      rejected,
      acceptanceRate,
    };
  }

  /**
   * Send event to external analytics service
   * (e.g., Google Analytics, Mixpanel, Segment)
   */
  private sendToAnalyticsService(event: OnboardingEvent): void {
    // Check if analytics service is configured
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // Google Analytics 4
      (window as any).gtag('event', event.eventType, {
        user_id: event.userId,
        ...event.metadata,
      });
    }

    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      // Mixpanel
      (window as any).mixpanel.track(event.eventType, {
        userId: event.userId,
        ...event.metadata,
      });
    }

    if (typeof window !== 'undefined' && (window as any).analytics) {
      // Segment
      (window as any).analytics.track(event.eventType, {
        userId: event.userId,
        ...event.metadata,
      });
    }
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: OnboardingEvent): Promise<void> {
    try {
      // Send to backend API for database storage
      await fetch('/api/analytics/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to persist analytics event:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
    this.sessionStartTime = null;
  }
}

// Export singleton instance
export const onboardingAnalytics = OnboardingAnalytics.getInstance();
