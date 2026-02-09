/**
 * Scheduling Types Module
 *
 * Type definitions for the Group Scheduling feature.
 * Requirements: 14.1-14.8
 */

// ============================================
// Enums and Type Aliases
// ============================================

/**
 * Status of a catchup plan
 */
export type PlanStatus =
  | 'draft'
  | 'collecting_availability'
  | 'ready_to_schedule'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

/**
 * Attendance type for invitees
 */
export type AttendanceType = 'must_attend' | 'nice_to_have';

/**
 * Activity type for catchup plans
 */
export type ActivityType = 'coffee' | 'dinner' | 'video_call' | 'activity' | 'other';

/**
 * Source of availability data
 */
export type AvailabilitySource = 'manual' | 'calendar';

/**
 * Notification types for scheduling events
 */
export type SchedulingNotificationType =
  | 'availability_submitted'
  | 'plan_ready'
  | 'plan_finalized'
  | 'plan_cancelled'
  | 'reminder_sent';

// ============================================
// Core Data Model Interfaces
// ============================================

/**
 * Catchup plan for coordinating meetups
 */
export interface CatchupPlan {
  id: string;
  userId: string;
  activityType?: ActivityType;
  duration: number; // minutes
  dateRangeStart: string; // ISO date string
  dateRangeEnd: string; // ISO date string
  location?: string;
  notes?: string;
  status: PlanStatus;
  finalizedTime?: string; // ISO datetime string
  invitees: PlanInvitee[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/**
 * Invitee linked to a catchup plan
 */
export interface PlanInvitee {
  id: string;
  planId: string;
  contactId: string;
  contactName: string;
  attendanceType: AttendanceType;
  hasResponded: boolean;
  createdAt: Date;
}

/**
 * Availability submission from an invitee
 */
export interface InviteeAvailability {
  id: string;
  planId: string;
  contactId?: string;
  inviteeName: string;
  timezone: string;
  availableSlots: string[]; // Format: "YYYY-MM-DD_HH:mm"
  submittedAt: Date;
  updatedAt: Date;
}

/**
 * Availability for the plan initiator
 */
export interface InitiatorAvailability {
  id: string;
  planId: string;
  userId: string;
  availableSlots: string[]; // Format: "YYYY-MM-DD_HH:mm"
  source: AvailabilitySource;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invite link for availability collection
 */
export interface InviteLink {
  id: string;
  planId: string;
  contactId: string;
  contactName?: string;
  token: string;
  url?: string; // Computed field
  expiresAt: Date;
  accessedAt?: Date;
  submittedAt?: Date;
  invalidatedAt?: Date;
  createdAt: Date;
}

/**
 * Time range for scheduling preferences
 */
export interface TimeRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  label?: string; // "mornings", "evenings", etc.
}

/**
 * User preferences for scheduling
 */
export interface SchedulingPreferences {
  id: string;
  userId: string;
  preferredDays: number[]; // 0-6 for Sunday-Saturday
  preferredTimeRanges: TimeRange[];
  preferredDurations: number[]; // minutes
  favoriteLocations: string[];
  defaultActivityType?: ActivityType;
  applyByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-app notification for scheduling events
 */
export interface SchedulingNotification {
  id: string;
  userId: string;
  planId: string;
  type: SchedulingNotificationType;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Privacy settings for calendar sharing
 */
export interface CalendarSharingSettings {
  id: string;
  userId: string;
  shareWithInnerCircle: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AI Conflict Resolution Types
// ============================================

/**
 * Type of AI suggestion for conflict resolution
 */
export type ConflictSuggestionType = 'time_suggestion' | 'exclude_attendee' | 'activity_change';

/**
 * AI-generated suggestion for resolving scheduling conflicts
 */
export interface ConflictSuggestion {
  type: ConflictSuggestionType;
  suggestedTime?: string; // ISO datetime for time_suggestion
  excludeeName?: string; // Name for exclude_attendee
  alternativeActivity?: string; // Activity for activity_change
  attendeeCount?: number;
  reasoning: string;
}

/**
 * Result of conflict analysis
 */
export interface ConflictAnalysis {
  hasPerfectOverlap: boolean;
  perfectOverlapSlots: string[];
  nearOverlapSlots: NearOverlapSlot[];
  suggestions: ConflictSuggestion[];
}

/**
 * Slot with near-perfect overlap (missing 1 must-attend)
 */
export interface NearOverlapSlot {
  slot: string;
  missingAttendees: string[];
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Data for creating a new catchup plan
 */
export interface CreatePlanData {
  userId: string;
  invitees: CreatePlanInvitee[];
  activityType?: ActivityType;
  duration: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  location?: string;
}

/**
 * Invitee data for plan creation
 */
export interface CreatePlanInvitee {
  contactId: string;
  attendanceType: AttendanceType;
}

/**
 * Result of plan creation
 */
export interface CreatePlanResult {
  plan: CatchupPlan;
  inviteLinks: InviteLinkWithContact[];
}

/**
 * Invite link with contact info for display
 */
export interface InviteLinkWithContact {
  contactId: string;
  contactName: string;
  url: string;
  attendanceType: AttendanceType;
}

/**
 * Filters for querying plans
 */
export interface PlanFilters {
  status?: PlanStatus;
  type?: 'individual' | 'group';
}

/**
 * Data for finalizing a plan
 */
export interface FinalizePlanData {
  finalizedTime: string;
  location?: string;
  notes?: string;
}

/**
 * Data for submitting availability
 */
export interface SubmitAvailabilityData {
  name: string;
  timezone: string;
  availableSlots: string[];
}

/**
 * Public plan info for availability page (no auth required)
 */
export interface PublicPlanInfo {
  initiatorName: string;
  activityType?: ActivityType;
  duration: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  inviteeName?: string;
  existingAvailability?: string[];
}

/**
 * Validation result for invite links
 */
export interface InviteLinkValidation {
  valid: boolean;
  planId?: string;
  contactId?: string;
  contactName?: string;
  error?: string;
}

// ============================================
// Availability Dashboard Types
// ============================================

/**
 * Overlap calculation for a time slot
 */
export interface SlotOverlap {
  availableCount: number;
  mustAttendCount: number;
  totalMustAttend: number;
  isPerfectOverlap: boolean;
  availableParticipants: AvailableParticipant[];
}

/**
 * Participant available for a slot
 */
export interface AvailableParticipant {
  name: string;
  isMustAttend: boolean;
}

/**
 * Dashboard data for viewing all availability
 */
export interface AvailabilityDashboardData {
  plan: CatchupPlan;
  initiatorAvailability: string[];
  inviteeAvailability: InviteeAvailability[];
  slotOverlaps: Map<string, SlotOverlap>;
  aiSuggestions?: ConflictSuggestion[];
}
