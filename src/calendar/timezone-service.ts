/**
 * Timezone Service
 *
 * Handles timezone conversions for calendar features using date-fns-tz.
 * Provides utilities to convert dates between UTC and user timezones.
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

/**
 * Timezone group for UI display
 */
export interface TimezoneGroup {
  region: string;
  timezones: TimezoneInfo[];
}

/**
 * Timezone information
 */
export interface TimezoneInfo {
  value: string; // IANA timezone identifier
  label: string; // Display name
  offset: string; // UTC offset (e.g., "UTC-5")
}

/**
 * Timezone Service Interface
 */
export interface ITimezoneService {
  toUserTimezone(date: Date, userTimezone: string): Date;
  fromUserTimezone(date: Date, userTimezone: string): Date;
  formatInUserTimezone(date: Date, userTimezone: string, formatStr: string): string;
  getTimezoneList(): TimezoneGroup[];
  isValidTimezone(timezone: string): boolean;
}

/**
 * Timezone Service Implementation
 */
export class TimezoneService implements ITimezoneService {
  /**
   * Convert a UTC date to user's timezone
   *
   * @param date - Date in UTC
   * @param userTimezone - IANA timezone identifier (e.g., "America/New_York")
   * @returns Date object representing the same moment in user's timezone
   */
  toUserTimezone(date: Date, userTimezone: string): Date {
    if (!this.isValidTimezone(userTimezone)) {
      throw new Error(`Invalid timezone: ${userTimezone}`);
    }
    return toZonedTime(date, userTimezone);
  }

  /**
   * Convert a date from user's timezone to UTC
   *
   * @param date - Date in user's timezone
   * @param userTimezone - IANA timezone identifier
   * @returns Date object in UTC
   */
  fromUserTimezone(date: Date, userTimezone: string): Date {
    if (!this.isValidTimezone(userTimezone)) {
      throw new Error(`Invalid timezone: ${userTimezone}`);
    }
    return fromZonedTime(date, userTimezone);
  }

  /**
   * Format a date in user's timezone
   *
   * @param date - Date to format
   * @param userTimezone - IANA timezone identifier
   * @param formatStr - Format string (date-fns format)
   * @returns Formatted date string in user's timezone
   */
  formatInUserTimezone(date: Date, userTimezone: string, formatStr: string): string {
    if (!this.isValidTimezone(userTimezone)) {
      throw new Error(`Invalid timezone: ${userTimezone}`);
    }
    return formatInTimeZone(date, userTimezone, formatStr);
  }

  /**
   * Get list of all supported timezones grouped by region
   *
   * @returns Array of timezone groups
   */
  getTimezoneList(): TimezoneGroup[] {
    // Common timezones grouped by region
    // This is a curated list of the most commonly used timezones
    return [
      {
        region: 'Americas',
        timezones: [
          { value: 'America/New_York', label: 'Eastern Time (New York)', offset: 'UTC-5' },
          { value: 'America/Chicago', label: 'Central Time (Chicago)', offset: 'UTC-6' },
          { value: 'America/Denver', label: 'Mountain Time (Denver)', offset: 'UTC-7' },
          { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', offset: 'UTC-8' },
          { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', offset: 'UTC-9' },
          { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', offset: 'UTC-10' },
          { value: 'America/Toronto', label: 'Eastern Time (Toronto)', offset: 'UTC-5' },
          { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)', offset: 'UTC-8' },
          { value: 'America/Mexico_City', label: 'Central Time (Mexico City)', offset: 'UTC-6' },
          { value: 'America/Sao_Paulo', label: 'Brasilia Time (São Paulo)', offset: 'UTC-3' },
          {
            value: 'America/Buenos_Aires',
            label: 'Argentina Time (Buenos Aires)',
            offset: 'UTC-3',
          },
        ],
      },
      {
        region: 'Europe',
        timezones: [
          { value: 'Europe/London', label: 'Greenwich Mean Time (London)', offset: 'UTC+0' },
          { value: 'Europe/Paris', label: 'Central European Time (Paris)', offset: 'UTC+1' },
          { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', offset: 'UTC+1' },
          { value: 'Europe/Rome', label: 'Central European Time (Rome)', offset: 'UTC+1' },
          { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', offset: 'UTC+1' },
          {
            value: 'Europe/Amsterdam',
            label: 'Central European Time (Amsterdam)',
            offset: 'UTC+1',
          },
          { value: 'Europe/Brussels', label: 'Central European Time (Brussels)', offset: 'UTC+1' },
          { value: 'Europe/Vienna', label: 'Central European Time (Vienna)', offset: 'UTC+1' },
          {
            value: 'Europe/Stockholm',
            label: 'Central European Time (Stockholm)',
            offset: 'UTC+1',
          },
          { value: 'Europe/Athens', label: 'Eastern European Time (Athens)', offset: 'UTC+2' },
          { value: 'Europe/Istanbul', label: 'Turkey Time (Istanbul)', offset: 'UTC+3' },
          { value: 'Europe/Moscow', label: 'Moscow Time (Moscow)', offset: 'UTC+3' },
        ],
      },
      {
        region: 'Asia',
        timezones: [
          { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', offset: 'UTC+4' },
          { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai)', offset: 'UTC+5:30' },
          { value: 'Asia/Bangkok', label: 'Indochina Time (Bangkok)', offset: 'UTC+7' },
          { value: 'Asia/Singapore', label: 'Singapore Time (Singapore)', offset: 'UTC+8' },
          { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (Hong Kong)', offset: 'UTC+8' },
          { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', offset: 'UTC+8' },
          { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', offset: 'UTC+9' },
          { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)', offset: 'UTC+9' },
        ],
      },
      {
        region: 'Australia & Pacific',
        timezones: [
          { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', offset: 'UTC+8' },
          {
            value: 'Australia/Adelaide',
            label: 'Australian Central Time (Adelaide)',
            offset: 'UTC+9:30',
          },
          {
            value: 'Australia/Sydney',
            label: 'Australian Eastern Time (Sydney)',
            offset: 'UTC+10',
          },
          {
            value: 'Australia/Melbourne',
            label: 'Australian Eastern Time (Melbourne)',
            offset: 'UTC+10',
          },
          {
            value: 'Australia/Brisbane',
            label: 'Australian Eastern Time (Brisbane)',
            offset: 'UTC+10',
          },
          { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)', offset: 'UTC+12' },
        ],
      },
      {
        region: 'Africa & Middle East',
        timezones: [
          { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)', offset: 'UTC+2' },
          {
            value: 'Africa/Johannesburg',
            label: 'South Africa Time (Johannesburg)',
            offset: 'UTC+2',
          },
          { value: 'Africa/Lagos', label: 'West Africa Time (Lagos)', offset: 'UTC+1' },
          { value: 'Africa/Nairobi', label: 'East Africa Time (Nairobi)', offset: 'UTC+3' },
          { value: 'Asia/Jerusalem', label: 'Israel Time (Jerusalem)', offset: 'UTC+2' },
        ],
      },
      {
        region: 'Other',
        timezones: [{ value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'UTC+0' }],
      },
    ];
  }

  /**
   * Validate if a string is a valid IANA timezone identifier
   *
   * @param timezone - Timezone string to validate
   * @returns true if valid, false otherwise
   */
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current time in a specific timezone
   *
   * @param timezone - IANA timezone identifier
   * @returns Current date/time in the specified timezone
   */
  getCurrentTimeInTimezone(timezone: string): Date {
    return this.toUserTimezone(new Date(), timezone);
  }

  /**
   * Get UTC offset for a timezone at a specific date
   *
   * @param timezone - IANA timezone identifier
   * @param date - Date to check offset for (defaults to now)
   * @returns Offset string (e.g., "UTC-5", "UTC+5:30")
   */
  getTimezoneOffset(timezone: string, date: Date = new Date()): string {
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const formatted = formatInTimeZone(date, timezone, 'XXX');
    const sign = formatted.startsWith('-') ? '-' : '+';
    const offset = formatted.replace(/[+-]/, '');

    return `UTC${sign}${offset}`;
  }
}

// Export singleton instance
export const timezoneService = new TimezoneService();

// Convenience functions for direct use
export function toUserTimezone(date: Date, userTimezone: string): Date {
  return timezoneService.toUserTimezone(date, userTimezone);
}

export function fromUserTimezone(date: Date, userTimezone: string): Date {
  return timezoneService.fromUserTimezone(date, userTimezone);
}

export function formatInUserTimezone(date: Date, userTimezone: string, formatStr: string): string {
  return timezoneService.formatInUserTimezone(date, userTimezone, formatStr);
}

export function isValidTimezone(timezone: string): boolean {
  return timezoneService.isValidTimezone(timezone);
}
