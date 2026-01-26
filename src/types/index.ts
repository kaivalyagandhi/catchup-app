/**
 * Types Module
 *
 * Central location for all TypeScript type definitions and interfaces
 * used across the CatchUp application.
 */

// Enums
export enum FrequencyOption {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  FLEXIBLE = 'flexible',
  NA = 'na',
}

export enum InteractionType {
  HANGOUT = 'hangout',
  CALL = 'call',
  TEXT = 'text',
  CALENDAR_EVENT = 'calendar_event',
}

export enum TagSource {
  VOICE_MEMO = 'voice_memo',
  MANUAL = 'manual',
  NOTIFICATION_REPLY = 'notification_reply',
  AI_EDIT = 'ai_edit',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  SNOOZED = 'snoozed',
}

export enum TriggerType {
  SHARED_ACTIVITY = 'shared_activity',
  TIMEBOUND = 'timebound',
}

// Core data model interfaces
export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  linkedIn?: string;
  instagram?: string;
  xHandle?: string;
  otherSocialMedia?: Record<string, string>;
  location?: string;
  timezone?: string;
  customNotes?: string;
  lastContactDate?: Date;
  frequencyPreference?: FrequencyOption;
  groups: string[];
  tags: Tag[];
  archived: boolean;
  source?: 'manual' | 'google' | 'calendar' | 'voice_note';
  googleResourceName?: string;
  googleEtag?: string;
  lastSyncedAt?: Date;
  // Dunbar circle fields for onboarding (Simplified 4-circle system)
  dunbarCircle?: 'inner' | 'close' | 'active' | 'casual';
  circleAssignedAt?: Date;
  circleConfidence?: number;
  aiSuggestedCircle?: 'inner' | 'close' | 'active' | 'casual';
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  isPromotedFromTag: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  text: string;
  source: TagSource;
  createdAt: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  timezone: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Suggestion {
  id: string;
  userId: string;
  contactId: string; // Kept for backward compatibility, use contacts array for new code
  contacts: Contact[]; // Array of contacts (1 for individual, 2-3 for group)
  type: 'individual' | 'group';
  triggerType: TriggerType;
  proposedTimeslot: TimeSlot;
  reasoning: string;
  status: SuggestionStatus;
  dismissalReason?: string;
  calendarEventId?: string;
  snoozedUntil?: Date;
  priority: number;
  sharedContext?: SharedContextScore; // For group suggestions
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedContextScore {
  score: number; // 0-100
  factors: {
    commonGroups: string[];
    sharedTags: string[];
    coMentionedInVoiceNotes: number;
    overlappingInterests: string[];
  };
}

export interface InteractionLog {
  id: string;
  userId: string;
  contactId: string;
  date: Date;
  type: InteractionType;
  notes?: string;
  suggestionId?: string;
  createdAt: Date;
}

export interface CityTimezoneData {
  city: string;
  country: string;
  timezone: string;
  aliases?: string[];
}

export interface AvailabilityParams {
  manualTimeBlocks?: TimeBlock[];
  commuteWindows?: CommuteWindow[];
  nighttimeStart?: string;
  nighttimeEnd?: string;
}

export interface TimeBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CommuteWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface NotificationPreferences {
  smsEnabled: boolean;
  emailEnabled: boolean;
  batchDay: number;
  batchTime: string;
  timezone: string;
}

export interface GoogleCalendar {
  id: string;
  userId: string;
  calendarId: string;
  name: string;
  description?: string;
  selected: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceNote {
  id: string;
  userId: string;
  transcript: string;
  recordingTimestamp: Date;
  status: VoiceNoteStatus;
  extractedEntities?: Record<string, ExtractedEntities>;
  enrichmentData?: any;
  contacts: Contact[];
  createdAt: Date;
  updatedAt: Date;
}

export type VoiceNoteStatus =
  | 'recording'
  | 'paused'
  | 'transcribing'
  | 'extracting'
  | 'ready'
  | 'applied'
  | 'error';

export interface ExtractedEntities {
  contactNames?: string[];
  fields: Record<string, any>;
  tags: string[];
  groups: string[];
  lastContactDate?: Date;
}

export interface VoiceNoteFilters {
  contactIds?: string[];
  status?: VoiceNoteStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}

export interface EnrichmentProposal {
  contactId: string | null;
  items: EnrichmentItem[];
  requiresContactSelection: boolean;
}

export interface EnrichmentItem {
  id: string;
  type: 'field' | 'tag' | 'group' | 'lastContactDate';
  action: 'add' | 'update' | 'remove';
  field?: string;
  value: any;
  accepted: boolean;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  googleEventId: string;
  calendarId: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  isBusy: boolean;
  location?: string;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Incremental Chat Edits Types
// Requirements: 5.4, 5.5, 7.1
// ============================================

/**
 * Edit types supported by the system
 */
export type EditType =
  | 'create_contact'
  | 'update_contact_field'
  | 'add_tag'
  | 'remove_tag'
  | 'add_to_group'
  | 'remove_from_group'
  | 'create_group';

/**
 * Source of an edit (voice transcript, text input, or manual)
 */
export interface EditSource {
  type: 'voice_transcript' | 'text_input' | 'manual';
  transcriptExcerpt?: string;
  timestamp: Date;
  fullContext?: string;
}

/**
 * Candidate contact for disambiguation
 */
export interface DisambiguationCandidate {
  contactId: string;
  contactName: string;
  similarityScore: number;
}

/**
 * Pending edit status
 */
export type PendingEditStatus = 'pending' | 'needs_disambiguation';

/**
 * Pending edit awaiting user confirmation
 */
export interface PendingEdit {
  id: string;
  userId: string;
  sessionId: string;
  editType: EditType;
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  proposedValue: any;
  confidenceScore: number;
  source: EditSource;
  status: PendingEditStatus;
  disambiguationCandidates?: DisambiguationCandidate[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Immutable edit history entry
 */
export interface EditHistoryEntry {
  id: string;
  userId: string;
  originalEditId: string;
  editType: EditType;
  targetContactId?: string;
  targetContactName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  field?: string;
  appliedValue: any;
  previousValue?: any;
  source: EditSource;
  submittedAt: Date;
}

/**
 * Chat session status
 */
export type ChatSessionStatus = 'active' | 'completed' | 'cancelled';

/**
 * Chat session for grouping edits
 */
export interface ChatSession {
  id: string;
  userId: string;
  status: ChatSessionStatus;
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Chat message type
 */
export type ChatMessageType = 'user' | 'system';

/**
 * Reference to an edit in a chat message
 */
export interface EditReference {
  editId: string;
  displayText: string;
  editType: EditType;
}

/**
 * Disambiguation option in chat
 */
export interface DisambiguationOption {
  contactId: string;
  contactName: string;
  similarityScore: number;
}

/**
 * Chat message in the conversation
 */
export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  timestamp: Date;
  editReferences?: EditReference[];
  disambiguationOptions?: DisambiguationOption[];
}

/**
 * Fuzzy match result for contacts/groups
 */
export interface FuzzyMatchResult {
  id: string;
  name: string;
  type: 'contact' | 'group';
  similarityScore: number;
}

/**
 * Options for querying edit history
 */
export interface EditHistoryOptions {
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Transcript segment for incremental processing
 */
export interface TranscriptSegment {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
}

/**
 * Detected edit from transcript processing
 */
export interface DetectedEdit {
  editType: EditType;
  extractedName?: string;
  field?: string;
  value: any;
  confidence: number;
  sourceSegment: TranscriptSegment;
}
