/**
 * Onboarding Analytics - Frontend Integration
 * 
 * Tracks onboarding events for product insights
 * Integrates with backend analytics service
 */

class OnboardingAnalytics {
  constructor() {
    this.sessionStartTime = null;
    this.events = [];
  }

  /**
   * Track onboarding started
   */
  trackOnboardingStarted(userId) {
    this.sessionStartTime = new Date();
    this.track(userId, 'onboarding_started', {
      startTime: this.sessionStartTime.toISOString(),
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });
  }

  /**
   * Track step started
   */
  trackStepStarted(userId, step) {
    const eventType = `step_${step}_started`;
    this.track(userId, eventType, {
      step,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track step completed
   */
  trackStepCompleted(userId, step, metadata = {}) {
    const eventType = `step_${step}_completed`;
    this.track(userId, eventType, {
      step,
      completedAt: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Track onboarding completed
   */
  trackOnboardingCompleted(userId) {
    const completionTime = new Date();
    const timeToComplete = this.sessionStartTime 
      ? completionTime.getTime() - this.sessionStartTime.getTime()
      : null;

    this.track(userId, 'onboarding_completed', {
      completedAt: completionTime.toISOString(),
      timeToCompleteMs: timeToComplete,
      timeToCompleteMinutes: timeToComplete ? Math.round(timeToComplete / 60000) : null,
    });
  }

  /**
   * Track onboarding dismissed
   */
  trackOnboardingDismissed(userId, currentStep) {
    this.track(userId, 'onboarding_dismissed', {
      dismissedAt: new Date().toISOString(),
      currentStep,
    });
  }

  /**
   * Track onboarding resumed
   */
  trackOnboardingResumed(userId, resumedStep) {
    this.track(userId, 'onboarding_resumed', {
      resumedAt: new Date().toISOString(),
      resumedStep,
    });
  }

  /**
   * Track circle assignment
   */
  trackCircleAssigned(userId, contactId, circle, wasAISuggestion) {
    this.track(userId, 'circle_assigned', {
      contactId,
      circle,
      wasAISuggestion,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track AI suggestion accepted
   */
  trackAISuggestionAccepted(userId, contactId, suggestedCircle, confidence) {
    this.track(userId, 'ai_suggestion_accepted', {
      contactId,
      suggestedCircle,
      confidence,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track AI suggestion rejected
   */
  trackAISuggestionRejected(userId, contactId, suggestedCircle, selectedCircle) {
    this.track(userId, 'ai_suggestion_rejected', {
      contactId,
      suggestedCircle,
      selectedCircle,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track group mapping accepted
   */
  trackGroupMappingAccepted(userId, mappingId, googleGroupId, targetGroupId) {
    this.track(userId, 'group_mapping_accepted', {
      mappingId,
      googleGroupId,
      targetGroupId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track group mapping rejected
   */
  trackGroupMappingRejected(userId, mappingId, googleGroupId) {
    this.track(userId, 'group_mapping_rejected', {
      mappingId,
      googleGroupId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track search used
   */
  trackSearchUsed(userId, query, resultsCount) {
    this.track(userId, 'search_used', {
      queryLength: query.length,
      resultsCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track educational tip expanded
   */
  trackEducationalTipExpanded(userId) {
    this.track(userId, 'educational_tip_expanded', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track step navigation (when user clicks on a step)
   */
  trackStepNavigation(userId, fromStep, toStep) {
    this.track(userId, 'step_navigation', {
      fromStep,
      toStep,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Core tracking method
   */
  track(userId, eventType, metadata = {}) {
    const event = {
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Store in memory
    this.events.push(event);

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[Onboarding Analytics]', event);
    }

    // Send to backend
    this.sendToBackend(event);

    // Send to external analytics services
    this.sendToExternalServices(event);
  }

  /**
   * Send event to backend API
   */
  async sendToBackend(event) {
    try {
      await fetch('/api/analytics/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send analytics event to backend:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Send to external analytics services
   */
  sendToExternalServices(event) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.eventType, {
        user_id: event.userId,
        ...event.metadata,
      });
    }

    // Mixpanel
    if (typeof mixpanel !== 'undefined') {
      mixpanel.track(event.eventType, {
        userId: event.userId,
        ...event.metadata,
      });
    }

    // Segment
    if (typeof analytics !== 'undefined') {
      analytics.track(event.eventType, {
        userId: event.userId,
        ...event.metadata,
      });
    }
  }

  /**
   * Get all tracked events
   */
  getEvents() {
    return this.events;
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents() {
    this.events = [];
    this.sessionStartTime = null;
  }
}

// Create singleton instance
const onboardingAnalytics = new OnboardingAnalytics();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = onboardingAnalytics;
}
