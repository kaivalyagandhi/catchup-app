/**
 * Calendar Friend Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarFriendServiceImpl } from './calendar-friend-service';
import { DateRange } from '../types';

// Mock googleapis
vi.mock('googleapis', () => {
  const mockOAuth2 = vi.fn(function () {
    return {
      setCredentials: vi.fn(),
    };
  });

  return {
    google: {
      auth: {
        OAuth2: mockOAuth2,
      },
      calendar: vi.fn(),
    },
  };
});

describe('CalendarFriendService', () => {
  let service: CalendarFriendServiceImpl;

  beforeEach(() => {
    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';

    service = new CalendarFriendServiceImpl();
  });

  describe('identifyFrequentContacts', () => {
    it('should identify contacts who appear in multiple events', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      // Mock calendar API responses
      const mockCalendar = {
        calendarList: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'calendar-1', summary: 'Primary' }],
            },
          }),
        },
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  start: { dateTime: '2024-06-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
                {
                  start: { dateTime: '2024-07-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
                {
                  start: { dateTime: '2024-08-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                    { email: 'jane@example.com', displayName: 'Jane Smith' },
                  ],
                },
              ],
            },
          }),
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.calendar).mockReturnValue(mockCalendar as any);

      // Set minimum frequency to 1 to include all contacts
      const result = await service.identifyFrequentContacts(userId, accessToken, dateRange, undefined, 1);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].name).toBe('John Doe');
      expect(result[0].frequency).toBe(3);
      expect(result[1].email).toBe('jane@example.com');
      expect(result[1].frequency).toBe(1);
    });

    it('should filter contacts by minimum frequency', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      // Mock calendar API responses
      const mockCalendar = {
        calendarList: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'calendar-1', summary: 'Primary' }],
            },
          }),
        },
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  start: { dateTime: '2024-06-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
                {
                  start: { dateTime: '2024-07-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
                {
                  start: { dateTime: '2024-08-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'jane@example.com', displayName: 'Jane Smith' },
                  ],
                },
              ],
            },
          }),
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.calendar).mockReturnValue(mockCalendar as any);

      // Set minimum frequency to 2
      const result = await service.identifyFrequentContacts(
        userId,
        accessToken,
        dateRange,
        undefined,
        2
      );

      // Only John should be returned (frequency 2), Jane should be filtered out (frequency 1)
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].frequency).toBe(2);
    });

    it('should skip events without attendees', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      // Mock calendar API responses with events without attendees
      const mockCalendar = {
        calendarList: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'calendar-1', summary: 'Primary' }],
            },
          }),
        },
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  start: { dateTime: '2024-06-01T10:00:00Z' },
                  summary: 'Solo event',
                  // No attendees
                },
                {
                  start: { dateTime: '2024-07-01T10:00:00Z' },
                  attendees: [], // Empty attendees
                },
              ],
            },
          }),
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.calendar).mockReturnValue(mockCalendar as any);

      const result = await service.identifyFrequentContacts(userId, accessToken, dateRange);

      expect(result).toHaveLength(0);
    });

    it('should skip organizer and self attendees', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      // Mock calendar API responses
      const mockCalendar = {
        calendarList: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'calendar-1', summary: 'Primary' }],
            },
          }),
        },
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  start: { dateTime: '2024-06-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'organizer@example.com', organizer: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
              ],
            },
          }),
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.calendar).mockReturnValue(mockCalendar as any);

      const result = await service.identifyFrequentContacts(
        userId,
        accessToken,
        dateRange,
        undefined,
        1
      );

      // Only John should be returned, not the user or organizer
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
    });

    it('should track last event date for each contact', async () => {
      const userId = 'user-1';
      const accessToken = 'mock-token';
      const dateRange: DateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
        timezone: 'UTC',
      };

      // Mock calendar API responses
      const mockCalendar = {
        calendarList: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'calendar-1', summary: 'Primary' }],
            },
          }),
        },
        events: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  start: { dateTime: '2024-06-01T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
                {
                  start: { dateTime: '2024-08-15T10:00:00Z' },
                  attendees: [
                    { email: 'user@example.com', self: true },
                    { email: 'john@example.com', displayName: 'John Doe' },
                  ],
                },
              ],
            },
          }),
        },
      };

      const { google } = await import('googleapis');
      vi.mocked(google.calendar).mockReturnValue(mockCalendar as any);

      const result = await service.identifyFrequentContacts(
        userId,
        accessToken,
        dateRange,
        undefined,
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].lastEventDate).toEqual(new Date('2024-08-15T10:00:00Z'));
    });
  });
});
