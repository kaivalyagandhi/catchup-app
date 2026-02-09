/**
 * Gamification Service
 *
 * Business logic for gamification features including progress tracking,
 * milestone detection, achievement awarding, streak tracking, and
 * network health score calculation.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import {
  PostgresAchievementRepository,
  AchievementType,
  AchievementRecord,
  NetworkHealthScoreRecord,
} from './achievement-repository';
import { PostgresOnboardingRepository } from './onboarding-repository';
import { PostgresContactRepository, DunbarCircle } from './repository';
import { CircleAssignmentServiceImpl, CIRCLE_DEFINITIONS } from './circle-assignment-service';

/**
 * Progress information
 */
export interface ProgressInfo {
  totalContacts: number;
  categorizedContacts: number;
  uncategorizedContacts: number;
  percentComplete: number;
  currentMilestone: string;
  nextMilestone: string;
  milestonesReached: string[];
}

/**
 * Milestone definition
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  threshold: number; // percentage or count
  type: 'percentage' | 'count' | 'circle';
  achievementType?: AchievementType;
}

/**
 * Streak information
 */
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
}

/**
 * Network health breakdown
 */
export interface NetworkHealthBreakdown {
  overallScore: number;
  circleBalanceScore: number;
  engagementScore: number;
  maintenanceScore: number;
  details: {
    circleBalance: string;
    engagement: string;
    maintenance: string;
  };
}

/**
 * Gamification Service Interface
 */
export interface GamificationService {
  getProgress(userId: string): Promise<ProgressInfo>;
  detectAndAwardMilestones(userId: string): Promise<AchievementRecord[]>;
  checkAndAwardAchievement(
    userId: string,
    achievementType: AchievementType
  ): Promise<AchievementRecord | null>;
  getStreakInfo(userId: string): Promise<StreakInfo>;
  updateStreak(userId: string): Promise<StreakInfo>;
  calculateNetworkHealth(userId: string): Promise<NetworkHealthBreakdown>;
  getAchievements(userId: string): Promise<AchievementRecord[]>;
}

/**
 * Milestone definitions
 */
const MILESTONES: Milestone[] = [
  {
    id: 'first_contact',
    name: 'First Contact',
    description: 'Categorized your first contact',
    threshold: 1,
    type: 'count',
    achievementType: 'first_contact_categorized',
  },
  {
    id: 'quarter_complete',
    name: '25% Complete',
    description: 'Categorized 25% of your contacts',
    threshold: 25,
    type: 'percentage',
  },
  {
    id: 'half_complete',
    name: 'Halfway There',
    description: 'Categorized 50% of your contacts',
    threshold: 50,
    type: 'percentage',
  },
  {
    id: 'three_quarters',
    name: '75% Complete',
    description: 'Categorized 75% of your contacts',
    threshold: 75,
    type: 'percentage',
  },
  {
    id: 'all_categorized',
    name: 'All Categorized',
    description: 'Categorized all your contacts',
    threshold: 100,
    type: 'percentage',
    achievementType: 'all_contacts_categorized',
  },
  {
    id: 'inner_circle_complete',
    name: 'Inner Circle Complete',
    description: 'Filled your Inner Circle',
    threshold: 1,
    type: 'circle',
    achievementType: 'inner_circle_complete',
  },
];

/**
 * Gamification Service Implementation
 */
export class GamificationServiceImpl implements GamificationService {
  constructor(
    private achievementRepository: PostgresAchievementRepository = new PostgresAchievementRepository(),
    private onboardingRepository: PostgresOnboardingRepository = new PostgresOnboardingRepository(),
    private contactRepository: PostgresContactRepository = new PostgresContactRepository(),
    private circleService: CircleAssignmentServiceImpl = new CircleAssignmentServiceImpl()
  ) {}

  /**
   * Get current progress information
   * Requirements: 8.1
   */
  async getProgress(userId: string): Promise<ProgressInfo> {
    // Get all contacts
    const allContacts = await this.contactRepository.findAll(userId);
    const totalContacts = allContacts.length;

    // Count categorized contacts (those with a circle assigned)
    const categorizedContacts = allContacts.filter((c) => c.dunbarCircle !== null).length;
    const uncategorizedContacts = totalContacts - categorizedContacts;

    // Calculate percentage
    const percentComplete =
      totalContacts > 0 ? Math.round((categorizedContacts / totalContacts) * 100) : 0;

    // Get onboarding state for milestones reached
    const onboardingState = await this.onboardingRepository.findByUserId(userId);
    const milestonesReached = onboardingState?.progressData?.milestonesReached || [];

    // Determine current and next milestone
    const { currentMilestone, nextMilestone } = this.getMilestoneStatus(
      percentComplete,
      categorizedContacts,
      milestonesReached
    );

    return {
      totalContacts,
      categorizedContacts,
      uncategorizedContacts,
      percentComplete,
      currentMilestone,
      nextMilestone,
      milestonesReached,
    };
  }

  /**
   * Detect and award milestones based on current progress
   * Requirements: 8.2
   */
  async detectAndAwardMilestones(userId: string): Promise<AchievementRecord[]> {
    const progress = await this.getProgress(userId);
    const newAchievements: AchievementRecord[] = [];

    // Check each milestone
    for (const milestone of MILESTONES) {
      // Skip if already reached
      if (progress.milestonesReached.includes(milestone.id)) {
        continue;
      }

      let shouldAward = false;

      if (milestone.type === 'percentage') {
        shouldAward = progress.percentComplete >= milestone.threshold;
      } else if (milestone.type === 'count') {
        shouldAward = progress.categorizedContacts >= milestone.threshold;
      } else if (milestone.type === 'circle') {
        // Check if inner circle has contacts
        const distribution = await this.circleService.getCircleDistribution(userId);
        shouldAward = distribution.inner > 0;
      }

      if (shouldAward) {
        // Mark milestone as reached
        await this.markMilestoneReached(userId, milestone.id);

        // Award achievement if defined
        if (milestone.achievementType) {
          const achievement = await this.checkAndAwardAchievement(
            userId,
            milestone.achievementType
          );
          if (achievement) {
            newAchievements.push(achievement);
          }
        }
      }
    }

    return newAchievements;
  }

  /**
   * Check and award a specific achievement
   * Requirements: 8.3
   */
  async checkAndAwardAchievement(
    userId: string,
    achievementType: AchievementType
  ): Promise<AchievementRecord | null> {
    // Check if already has achievement
    const hasAchievement = await this.achievementRepository.hasAchievement(userId, achievementType);

    if (hasAchievement) {
      return null;
    }

    // Award the achievement
    const achievement = await this.achievementRepository.createAchievement({
      userId,
      achievementType,
      achievementData: {
        awardedAt: new Date().toISOString(),
      },
    });

    return achievement;
  }

  /**
   * Get streak information
   * Requirements: 8.4
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    const onboardingState = await this.onboardingRepository.findByUserId(userId);

    if (!onboardingState) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
      };
    }

    const streakData = (onboardingState.progressData as any).streakData || {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date().toISOString(),
    };

    return {
      currentStreak: streakData.currentStreak || 0,
      longestStreak: streakData.longestStreak || 0,
      lastActivityDate: new Date(streakData.lastActivityDate),
    };
  }

  /**
   * Update streak based on activity
   * Requirements: 8.4
   */
  async updateStreak(userId: string): Promise<StreakInfo> {
    const streakInfo = await this.getStreakInfo(userId);
    const now = new Date();
    const lastActivity = streakInfo.lastActivityDate;

    // Calculate days since last activity
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newCurrentStreak = streakInfo.currentStreak;
    let newLongestStreak = streakInfo.longestStreak;

    if (daysSinceLastActivity === 0) {
      // Same day, no change
      return streakInfo;
    } else if (daysSinceLastActivity === 1) {
      // Consecutive day, increment streak
      newCurrentStreak += 1;
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    } else {
      // Streak broken, reset to 1
      newCurrentStreak = 1;
    }

    // Update onboarding state with new streak data
    const onboardingState = await this.onboardingRepository.findByUserId(userId);
    if (onboardingState) {
      const updatedProgressData = {
        ...onboardingState.progressData,
        streakData: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: now.toISOString(),
        },
      } as any;

      await this.onboardingRepository.update(userId, {
        progressData: updatedProgressData,
      });
    }

    // Check for streak achievements
    if (newCurrentStreak >= 3) {
      await this.checkAndAwardAchievement(userId, 'week_streak_3');
    }
    if (newCurrentStreak >= 10) {
      await this.checkAndAwardAchievement(userId, 'week_streak_10');
    }

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: now,
    };
  }

  /**
   * Calculate network health score
   * Requirements: 8.5
   */
  async calculateNetworkHealth(userId: string): Promise<NetworkHealthBreakdown> {
    const distribution = await this.circleService.getCircleDistribution(userId);
    const totalCategorized =
      distribution.inner + distribution.close + distribution.active + distribution.casual;

    // Calculate circle balance score (0-100)
    const circleBalanceScore = this.calculateCircleBalance(distribution);

    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagementScore(totalCategorized, distribution);

    // Calculate maintenance score (0-100)
    const maintenanceScore = await this.calculateMaintenanceScore(userId);

    // Overall score is weighted average
    const overallScore = Math.round(
      circleBalanceScore * 0.4 + engagementScore * 0.3 + maintenanceScore * 0.3
    );

    // Save the score
    await this.achievementRepository.createNetworkHealthScore({
      userId,
      score: overallScore,
      circleBalanceScore,
      engagementScore,
      maintenanceScore,
    });

    // Check for health achievement
    if (overallScore >= 90) {
      await this.checkAndAwardAchievement(userId, 'network_health_excellent');
    }
    if (circleBalanceScore >= 90) {
      await this.checkAndAwardAchievement(userId, 'balanced_network');
    }

    return {
      overallScore,
      circleBalanceScore,
      engagementScore,
      maintenanceScore,
      details: {
        circleBalance: this.getCircleBalanceDescription(circleBalanceScore),
        engagement: this.getEngagementDescription(engagementScore),
        maintenance: this.getMaintenanceDescription(maintenanceScore),
      },
    };
  }

  /**
   * Get all achievements for a user
   * Requirements: 8.3
   */
  async getAchievements(userId: string): Promise<AchievementRecord[]> {
    return this.achievementRepository.findAchievementsByUserId(userId);
  }

  /**
   * Calculate circle balance score
   */
  private calculateCircleBalance(distribution: any): number {
    let score = 100;

    // Check each circle against recommended size
    for (const [circleId, definition] of Object.entries(CIRCLE_DEFINITIONS)) {
      const currentSize = distribution[circleId] || 0;
      const recommended = definition.recommendedSize;
      const max = definition.maxSize;

      if (currentSize > max) {
        // Over capacity - significant penalty
        const overBy = currentSize - max;
        score -= Math.min(30, overBy * 2);
      } else if (currentSize > recommended * 1.5) {
        // Over recommended but under max - moderate penalty
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(totalCategorized: number, distribution: any): number {
    if (totalCategorized === 0) {
      return 0;
    }

    let score = 0;

    // Points for having contacts in each circle (4-circle system)
    if (distribution.inner > 0) score += 30;
    if (distribution.close > 0) score += 30;
    if (distribution.active > 0) score += 25;
    if (distribution.casual > 0) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculate maintenance score based on recent activity
   */
  private async calculateMaintenanceScore(userId: string): Promise<number> {
    const onboardingState = await this.onboardingRepository.findByUserId(userId);

    if (!onboardingState) {
      return 50; // Default score
    }

    const daysSinceUpdate = Math.floor(
      (Date.now() - onboardingState.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Score decreases with days since last update
    if (daysSinceUpdate === 0) return 100;
    if (daysSinceUpdate <= 3) return 90;
    if (daysSinceUpdate <= 7) return 75;
    if (daysSinceUpdate <= 14) return 60;
    if (daysSinceUpdate <= 30) return 40;
    return 20;
  }

  /**
   * Get milestone status
   */
  private getMilestoneStatus(
    percentComplete: number,
    categorizedCount: number,
    milestonesReached: string[]
  ): { currentMilestone: string; nextMilestone: string } {
    let currentMilestone = 'Getting Started';
    let nextMilestone = 'First Contact';

    for (let i = 0; i < MILESTONES.length; i++) {
      const milestone = MILESTONES[i];
      const isReached = milestonesReached.includes(milestone.id);

      if (isReached) {
        currentMilestone = milestone.name;
        // Find next unreached milestone
        for (let j = i + 1; j < MILESTONES.length; j++) {
          if (!milestonesReached.includes(MILESTONES[j].id)) {
            nextMilestone = MILESTONES[j].name;
            break;
          }
        }
      } else {
        // First unreached milestone
        if (currentMilestone === 'Getting Started') {
          nextMilestone = milestone.name;
        }
        break;
      }
    }

    if (percentComplete === 100) {
      currentMilestone = 'Complete';
      nextMilestone = 'Maintain Your Network';
    }

    return { currentMilestone, nextMilestone };
  }

  /**
   * Mark milestone as reached
   */
  private async markMilestoneReached(userId: string, milestoneId: string): Promise<void> {
    const onboardingState = await this.onboardingRepository.findByUserId(userId);

    if (!onboardingState) {
      return;
    }

    const milestonesReached = onboardingState.progressData.milestonesReached || [];

    if (!milestonesReached.includes(milestoneId)) {
      milestonesReached.push(milestoneId);

      await this.onboardingRepository.update(userId, {
        progressData: {
          ...onboardingState.progressData,
          milestonesReached,
        },
      });
    }
  }

  /**
   * Get circle balance description
   */
  private getCircleBalanceDescription(score: number): string {
    if (score >= 90) return 'Excellent - Your circles are well balanced';
    if (score >= 75) return 'Good - Minor adjustments recommended';
    if (score >= 60) return 'Fair - Some circles may need rebalancing';
    return 'Needs attention - Consider rebalancing your circles';
  }

  /**
   * Get engagement description
   */
  private getEngagementDescription(score: number): string {
    if (score >= 90) return 'Excellent - Active across all circles';
    if (score >= 75) return 'Good - Most circles have contacts';
    if (score >= 60) return 'Fair - Some circles need attention';
    return 'Low - Add contacts to more circles';
  }

  /**
   * Get maintenance description
   */
  private getMaintenanceDescription(score: number): string {
    if (score >= 90) return 'Excellent - Recently active';
    if (score >= 75) return 'Good - Regular activity';
    if (score >= 60) return 'Fair - Could use more attention';
    return 'Low - Time to review your network';
  }
}

// Default instance
const defaultService = new GamificationServiceImpl();

export const getProgress = (userId: string) => defaultService.getProgress(userId);
export const detectAndAwardMilestones = (userId: string) =>
  defaultService.detectAndAwardMilestones(userId);
export const checkAndAwardAchievement = (userId: string, achievementType: AchievementType) =>
  defaultService.checkAndAwardAchievement(userId, achievementType);
export const getStreakInfo = (userId: string) => defaultService.getStreakInfo(userId);
export const updateStreak = (userId: string) => defaultService.updateStreak(userId);
export const calculateNetworkHealth = (userId: string) =>
  defaultService.calculateNetworkHealth(userId);
export const getAchievements = (userId: string) => defaultService.getAchievements(userId);
