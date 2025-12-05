/**
 * Onboarding Service
 *
 * Orchestrates the contact onboarding flow, managing state persistence,
 * progress tracking, and milestone detection.
 *
 * Requirements: 1.1, 1.4, 1.5, 2.1, 3.2, 11.1, 11.5
 */

import {
  PostgresOnboardingRepository,
  OnboardingStateRecord,
  OnboardingStep,
  OnboardingTriggerType,
} from './onboarding-repository';
import { PostgresContactRepository, DunbarCircle } from './repository';

/**
 * Onboarding trigger configuration
 */
export interface OnboardingTrigger {
  type: OnboardingTriggerType;
  source?: 'google' | 'manual' | 'onboarding_flow';
  contactCount?: number;
}

/**
 * Circle assignment for batch operations
 */
export interface CircleAssignment {
  contactId: string;
  circle: DunbarCircle;
  confidence?: number;
  userOverride?: boolean;
}

/**
 * Onboarding progress information
 */
export interface OnboardingProgress {
  totalContacts: number;
  categorizedContacts: number;
  uncategorizedContacts: number;
  percentComplete: number;
  currentMilestone: string;
  nextMilestone: string;
}

/**
 * Onboarding completion status
 * Requirements: 11.2, 11.4
 */
export interface OnboardingCompletionStatus {
  isComplete: boolean;
  hasUncategorizedContacts: boolean;
  uncategorizedCount: number;
  totalContacts: number;
  completedAt?: Date;
}

/**
 * Milestone definitions
 * Note: Thresholds are checked in reverse order (highest to lowest)
 * to find the current milestone
 */
const MILESTONES = [
  { threshold: 1.0, name: 'Complete', next: 'Complete' },
  { threshold: 0.9, name: 'Almost Done', next: 'Complete' },
  { threshold: 0.75, name: '75% Complete', next: 'Almost Done' },
  { threshold: 0.5, name: 'Halfway There', next: '75% Complete' },
  { threshold: 0.25, name: '25% Complete', next: 'Halfway There' },
  { threshold: 0.01, name: 'First Contact', next: '25% Complete' }, // Any progress > 0
  { threshold: 0, name: 'Getting Started', next: 'First Contact' },
];

/**
 * Onboarding Service Interface
 */
export interface OnboardingService {
  initializeOnboarding(userId: string, trigger: OnboardingTrigger): Promise<OnboardingStateRecord>;
  getOnboardingState(userId: string): Promise<OnboardingStateRecord | null>;
  updateProgress(userId: string, step: string, data: any): Promise<void>;
  completeOnboarding(userId: string): Promise<void>;
  getUncategorizedContacts(userId: string): Promise<any[]>;
  batchCategorizeContacts(userId: string, assignments: CircleAssignment[]): Promise<void>;
  getProgress(userId: string): Promise<OnboardingProgress>;
  markStepComplete(userId: string, step: string): Promise<void>;
  resumeOnboarding(userId: string): Promise<OnboardingStateRecord | null>;
  exitOnboarding(userId: string): Promise<void>;
  getCompletionStatus(userId: string): Promise<OnboardingCompletionStatus>;
  flagNewContactForCategorization(userId: string, contactId: string): Promise<void>;
}

/**
 * PostgreSQL Onboarding Service Implementation
 */
export class PostgresOnboardingService implements OnboardingService {
  private onboardingRepo: PostgresOnboardingRepository;
  private contactRepo: PostgresContactRepository;
  private progressCache: Map<string, { progress: OnboardingProgress; timestamp: number }>;
  private readonly CACHE_TTL_MS = 30 * 1000; // 30 seconds

  constructor(
    onboardingRepo?: PostgresOnboardingRepository,
    contactRepo?: PostgresContactRepository
  ) {
    this.onboardingRepo = onboardingRepo || new PostgresOnboardingRepository();
    this.contactRepo = contactRepo || new PostgresContactRepository();
    this.progressCache = new Map();
  }

  /**
   * Initialize onboarding for a user
   * Requirements: 1.1, 2.1
   */
  async initializeOnboarding(
    userId: string,
    trigger: OnboardingTrigger
  ): Promise<OnboardingStateRecord> {
    // Check if onboarding already exists
    const existing = await this.onboardingRepo.findByUserId(userId);
    if (existing && !existing.completedAt) {
      // Resume existing onboarding
      return existing;
    }

    // Get contact counts for progress tracking
    const allContacts = await this.contactRepo.findAll(userId, { archived: false });
    const uncategorized = await this.contactRepo.findUncategorized(userId);

    // Determine starting step based on trigger
    let currentStep: OnboardingStep = 'welcome';
    if (trigger.type === 'post_import') {
      currentStep = 'circle_assignment';
    } else if (trigger.type === 'manage') {
      currentStep = 'circle_assignment';
    }

    // Create new onboarding state
    const state = await this.onboardingRepo.create({
      userId,
      triggerType: trigger.type,
      currentStep,
      progressData: {
        categorizedCount: allContacts.length - uncategorized.length,
        totalCount: allContacts.length,
        milestonesReached: ['Getting Started'],
        timeSpent: 0,
      },
    });

    return state;
  }

  /**
   * Get current onboarding state
   * Requirements: 1.5
   */
  async getOnboardingState(userId: string): Promise<OnboardingStateRecord | null> {
    return this.onboardingRepo.findByUserId(userId);
  }

  /**
   * Resume onboarding from saved state
   * Requirements: 1.5
   */
  async resumeOnboarding(userId: string): Promise<OnboardingStateRecord | null> {
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state || state.completedAt) {
      return null;
    }

    // Refresh progress data
    const progress = await this.getProgress(userId);
    await this.onboardingRepo.update(userId, {
      progressData: {
        categorizedCount: progress.categorizedContacts,
        totalCount: progress.totalContacts,
        milestonesReached: state.progressData.milestonesReached,
        timeSpent: state.progressData.timeSpent,
      },
    });

    return this.onboardingRepo.findByUserId(userId);
  }

  /**
   * Exit onboarding (save progress)
   * Requirements: 1.5
   */
  async exitOnboarding(userId: string): Promise<void> {
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state) {
      return;
    }

    // Update progress before exiting
    const progress = await this.getProgress(userId);
    await this.onboardingRepo.update(userId, {
      progressData: {
        ...state.progressData,
        categorizedCount: progress.categorizedContacts,
        totalCount: progress.totalContacts,
      },
    });
  }

  /**
   * Update onboarding progress
   * Requirements: 1.4, 1.5
   */
  async updateProgress(userId: string, step: string, data: any): Promise<void> {
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    // Get current progress
    const progress = await this.getProgress(userId);

    // Check for milestone achievements
    const currentMilestone = this.getCurrentMilestone(progress.percentComplete / 100);
    const milestonesReached = state.progressData.milestonesReached || [];

    if (!milestonesReached.includes(currentMilestone.name)) {
      milestonesReached.push(currentMilestone.name);
    }

    // Update state with new progress
    await this.onboardingRepo.update(userId, {
      currentStep: step as OnboardingStep,
      progressData: {
        categorizedCount: progress.categorizedContacts,
        totalCount: progress.totalContacts,
        milestonesReached,
        timeSpent: state.progressData.timeSpent + (data.timeSpent || 0),
      },
    });
  }

  /**
   * Mark a step as complete
   * Requirements: 1.4
   */
  async markStepComplete(userId: string, step: string): Promise<void> {
    await this.onboardingRepo.markStepComplete(userId, step);
  }

  /**
   * Complete onboarding
   * Requirements: 1.4, 1.5
   */
  async completeOnboarding(userId: string): Promise<void> {
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    // Mark all steps as complete
    const allSteps: OnboardingStep[] = [
      'welcome',
      'import_contacts',
      'circle_assignment',
      'preference_setting',
      'group_overlay',
      'completion',
    ];

    await this.onboardingRepo.update(userId, {
      currentStep: 'completion',
      completedSteps: allSteps,
      completedAt: new Date(),
      progressData: {
        ...state.progressData,
        milestonesReached: [...state.progressData.milestonesReached, 'Complete'],
      },
    });

    await this.onboardingRepo.markComplete(userId);
  }

  /**
   * Get uncategorized contacts with pagination
   * Requirements: 11.1, 4.2 - Implement pagination for large contact lists
   */
  async getUncategorizedContacts(
    userId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<any[]> {
    const allUncategorized = await this.contactRepo.findUncategorized(userId);

    // If no pagination options, return all
    if (!options || !options.page || !options.pageSize) {
      return allUncategorized;
    }

    // Apply pagination
    const { page, pageSize } = options;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return allUncategorized.slice(startIndex, endIndex);
  }

  /**
   * Get uncategorized contacts count
   * Requirements: 11.1
   */
  async getUncategorizedContactsCount(userId: string): Promise<number> {
    const uncategorized = await this.contactRepo.findUncategorized(userId);
    return uncategorized.length;
  }

  /**
   * Batch categorize contacts
   * Requirements: 3.2, 5.5
   */
  async batchCategorizeContacts(userId: string, assignments: CircleAssignment[]): Promise<void> {
    if (assignments.length === 0) {
      return;
    }

    // Group assignments by circle for batch operations
    const assignmentsByCircle = new Map<DunbarCircle, string[]>();

    for (const assignment of assignments) {
      const contactIds = assignmentsByCircle.get(assignment.circle) || [];
      contactIds.push(assignment.contactId);
      assignmentsByCircle.set(assignment.circle, contactIds);
    }

    // Execute batch assignments
    for (const [circle, contactIds] of assignmentsByCircle.entries()) {
      await this.contactRepo.batchAssignToCircle(contactIds, userId, circle);
    }

    // Invalidate progress cache after batch update
    this.invalidateProgressCache(userId);

    // Update progress
    const state = await this.onboardingRepo.findByUserId(userId);
    if (state) {
      const progress = await this.getProgress(userId, false); // Skip cache
      await this.onboardingRepo.update(userId, {
        progressData: {
          ...state.progressData,
          categorizedCount: progress.categorizedContacts,
          totalCount: progress.totalContacts,
        },
      });
    }
  }

  /**
   * Get onboarding progress with caching
   * Requirements: 1.4, 4.2 - Add caching for frequently accessed data
   */
  async getProgress(userId: string, useCache: boolean = true): Promise<OnboardingProgress> {
    // Check cache first
    if (useCache) {
      const cached = this.progressCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.progress;
      }
    }

    const allContacts = await this.contactRepo.findAll(userId, { archived: false });
    const uncategorized = await this.contactRepo.findUncategorized(userId);

    const totalContacts = allContacts.length;
    const categorizedContacts = totalContacts - uncategorized.length;
    const uncategorizedContacts = uncategorized.length;
    const percentComplete =
      totalContacts > 0 ? Math.round((categorizedContacts / totalContacts) * 100) : 0;

    const milestone = this.getCurrentMilestone(percentComplete / 100);

    const progress: OnboardingProgress = {
      totalContacts,
      categorizedContacts,
      uncategorizedContacts,
      percentComplete,
      currentMilestone: milestone.name,
      nextMilestone: milestone.next,
    };

    // Cache the result
    this.progressCache.set(userId, { progress, timestamp: Date.now() });

    return progress;
  }

  /**
   * Invalidate progress cache for a user
   */
  invalidateProgressCache(userId: string): void {
    this.progressCache.delete(userId);
  }

  /**
   * Get current milestone based on completion percentage
   */
  private getCurrentMilestone(percentComplete: number): { name: string; next: string } {
    // Find the highest milestone threshold that has been reached
    // MILESTONES are already sorted from highest to lowest
    for (const milestone of MILESTONES) {
      if (percentComplete >= milestone.threshold) {
        return {
          name: milestone.name,
          next: milestone.next,
        };
      }
    }

    // Fallback to Getting Started
    return MILESTONES[MILESTONES.length - 1];
  }

  /**
   * Get onboarding completion status
   * Requirements: 11.2, 11.4
   */
  async getCompletionStatus(userId: string): Promise<OnboardingCompletionStatus> {
    const state = await this.onboardingRepo.findByUserId(userId);
    const uncategorized = await this.contactRepo.findUncategorized(userId);
    const allContacts = await this.contactRepo.findAll(userId, { archived: false });

    return {
      isComplete: state?.completedAt !== undefined,
      hasUncategorizedContacts: uncategorized.length > 0,
      uncategorizedCount: uncategorized.length,
      totalContacts: allContacts.length,
      completedAt: state?.completedAt,
    };
  }

  /**
   * Flag a new contact for categorization
   * Requirements: 11.5
   *
   * This method is called when a new contact is added after onboarding completion.
   * It ensures the contact is flagged as uncategorized and will appear in the next
   * Weekly Catchup session or management mode.
   */
  async flagNewContactForCategorization(userId: string, contactId: string): Promise<void> {
    // Verify the contact exists and belongs to the user
    const contact = await this.contactRepo.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check if onboarding is complete
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state || !state.completedAt) {
      // Onboarding not complete, no need to flag
      return;
    }

    // If contact already has a circle, no need to flag
    if (contact.dunbarCircle) {
      return;
    }

    // Contact is already uncategorized by virtue of having no dunbar_circle
    // No additional flagging needed - the findUncategorized query will pick it up
    // This method serves as a hook for future enhancements (e.g., notifications)
  }

  /**
   * Check if onboarding should be auto-triggered for a user
   * Returns true if user has contacts but no onboarding state or incomplete onboarding
   * Requirements: 1.1, 2.1, 11.1
   */
  async shouldTriggerOnboarding(userId: string): Promise<boolean> {
    // Check if user has any contacts
    const contacts = await this.contactRepo.findAll(userId, { archived: false });
    if (contacts.length === 0) {
      return false; // No contacts, no need for onboarding
    }

    // Check if user has onboarding state
    const state = await this.onboardingRepo.findByUserId(userId);

    // Trigger if no state exists
    if (!state) {
      return true;
    }

    // Trigger if onboarding is incomplete and user has uncategorized contacts
    if (!state.completedAt) {
      const uncategorized = await this.contactRepo.findUncategorized(userId);
      return uncategorized.length > 0;
    }

    // Don't trigger if onboarding is complete
    return false;
  }

  /**
   * Update onboarding state with partial updates
   * Requirements: All requirements (state management)
   */
  async updateOnboardingState(userId: string, stateUpdate: Partial<OnboardingStateRecord>): Promise<void> {
    const state = await this.onboardingRepo.findByUserId(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    await this.onboardingRepo.update(userId, stateUpdate);
  }

  /**
   * Sync local state to server
   * Merges local state with server state, preferring local for most fields
   * Requirements: All requirements (state management)
   */
  async syncLocalState(userId: string, localState: any): Promise<void> {
    const serverState = await this.onboardingRepo.findByUserId(userId);
    
    if (!serverState) {
      // No server state exists, create from local state
      await this.initializeOnboarding(userId, {
        type: localState.triggerType || 'manual',
        source: 'onboarding_flow',
      });
      
      // Update with local state data
      await this.onboardingRepo.update(userId, {
        currentStep: localState.currentStep,
        completedSteps: localState.completedSteps || [],
        progressData: localState.progressData || {},
      });
      return;
    }

    // Merge local state with server state
    const mergedProgressData = {
      ...serverState.progressData,
      ...localState.progressData,
    };

    await this.onboardingRepo.update(userId, {
      currentStep: localState.currentStep || serverState.currentStep,
      completedSteps: localState.completedSteps || serverState.completedSteps,
      progressData: mergedProgressData,
    });
  }
}

// Default instance for backward compatibility
const defaultService = new PostgresOnboardingService();

export const initializeOnboarding = (userId: string, trigger: OnboardingTrigger) =>
  defaultService.initializeOnboarding(userId, trigger);
export const getOnboardingState = (userId: string) => defaultService.getOnboardingState(userId);
export const updateProgress = (userId: string, step: string, data: any) =>
  defaultService.updateProgress(userId, step, data);
export const completeOnboarding = (userId: string) => defaultService.completeOnboarding(userId);
export const getUncategorizedContacts = (userId: string) =>
  defaultService.getUncategorizedContacts(userId);
export const batchCategorizeContacts = (userId: string, assignments: CircleAssignment[]) =>
  defaultService.batchCategorizeContacts(userId, assignments);
export const getProgress = (userId: string) => defaultService.getProgress(userId);
export const markStepComplete = (userId: string, step: string) =>
  defaultService.markStepComplete(userId, step);
export const resumeOnboarding = (userId: string) => defaultService.resumeOnboarding(userId);
export const exitOnboarding = (userId: string) => defaultService.exitOnboarding(userId);
export const getCompletionStatus = (userId: string) => defaultService.getCompletionStatus(userId);
export const flagNewContactForCategorization = (userId: string, contactId: string) =>
  defaultService.flagNewContactForCategorization(userId, contactId);
export const shouldTriggerOnboarding = (userId: string) =>
  defaultService.shouldTriggerOnboarding(userId);
