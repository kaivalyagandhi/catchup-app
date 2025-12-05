/**
 * Onboarding Repositories Index
 *
 * Central export point for all onboarding-related repositories.
 * Provides easy access to repository instances and types.
 */

// Onboarding State Repository
export {
  PostgresOnboardingRepository,
  type OnboardingRepository,
  type OnboardingStateRecord,
  type OnboardingStateCreateData,
  type OnboardingStateUpdateData,
  type OnboardingStep,
  type OnboardingTriggerType,
  create as createOnboardingState,
  update as updateOnboardingStateRecord,
  findByUserId as findOnboardingStateByUserId,
  deleteState as deleteOnboardingState,
  markStepComplete,
  markComplete as markOnboardingComplete,
} from './onboarding-repository';

// Circle Assignment Repository
export {
  PostgresCircleAssignmentRepository,
  type CircleAssignmentRepository,
  type CircleAssignmentRecord,
  type CircleAssignmentCreateData,
  type CircleDistribution,
  type DunbarCircle,
  type AssignedBy,
  create as createCircleAssignment,
  findByContactId as findCircleAssignmentsByContactId,
  findByUserId as findCircleAssignmentsByUserId,
  getCircleDistribution,
  getContactsInCircle,
  getRecentAssignments,
} from './circle-assignment-repository';

// Weekly Catchup Repository
export {
  PostgresWeeklyCatchupRepository,
  type WeeklyCatchupRepository,
  type WeeklyCatchupSessionRecord,
  type WeeklyCatchupSessionCreateData,
  type WeeklyCatchupSessionUpdateData,
  type ContactReviewItem,
  create as createWeeklyCatchupSession,
  update as updateWeeklyCatchupSession,
  findById as findWeeklyCatchupSessionById,
  findByWeek as findWeeklyCatchupSessionByWeek,
  findCurrentSession as findCurrentWeeklyCatchupSession,
  findRecentSessions as findRecentWeeklyCatchupSessions,
  markContactReviewed,
  markComplete as markWeeklyCatchupComplete,
  markSkipped as markWeeklyCatchupSkipped,
  getUnreviewedContacts,
} from './weekly-catchup-repository';

// Achievement Repository
export {
  PostgresAchievementRepository,
  type AchievementRepository,
  type AchievementRecord,
  type AchievementCreateData,
  type AchievementType,
  type NetworkHealthScoreRecord,
  type NetworkHealthScoreCreateData,
  createAchievement,
  findAchievementsByUserId,
  hasAchievement,
  getAchievementCount,
  createNetworkHealthScore,
  getLatestNetworkHealthScore,
  getNetworkHealthHistory,
} from './achievement-repository';

// Extended Contact Repository with circle methods
export { type DunbarCircle as ContactDunbarCircle } from './repository';

// Onboarding State Manager (client-side state management)
export {
  OnboardingStateManager,
  getOnboardingStateManager,
  type OnboardingState,
  initializeOnboardingState,
  loadOnboardingState,
  saveOnboardingState,
  updateOnboardingState,
  dismissOnboarding,
  resumeOnboarding,
  checkStepCompletion,
  markStep1Complete,
  updateGoogleCalendarConnection,
  updateGoogleContactsConnection,
  updateCircleProgress,
  incrementCircleProgress,
  updateGroupMappingProgress,
  incrementGroupMappingProgress,
  getStepCompletionStatus,
  getCircleProgress,
  getGroupMappingProgress,
} from './onboarding-state-manager';
