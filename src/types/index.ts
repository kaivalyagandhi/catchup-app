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
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  FLEXIBLE = 'flexible',
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
  contactId: string;
  triggerType: TriggerType;
  proposedTimeslot: TimeSlot;
  reasoning: string;
  status: SuggestionStatus;
  dismissalReason?: string;
  calendarEventId?: string;
  snoozedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  audioUrl: string;
  transcript: string;
  contactId?: string;
  extractedEntities?: ExtractedEntities;
  processed: boolean;
  createdAt: Date;
}

export interface ExtractedEntities {
  fields: Record<string, any>;
  tags: string[];
  groups: string[];
  lastContactDate?: Date;
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
  title: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAvailable: boolean;
  source: string;
  createdAt: Date;
}
