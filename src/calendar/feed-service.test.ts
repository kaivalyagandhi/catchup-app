/**
 * Calendar Feed Service Tests
 *
 * Tests for calendar feed publishing functionality.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as feedService from './feed-service';
import { Suggestion, Contact, SuggestionStatus, TriggerType, TagSource } from '../types';

describe('Calendar Feed Service', () => {
  describe('publishSuggestionFeed', () => {
    it('should generate signed URLs for iCal and Google Calendar', () => {
      const userId = 'test-user-123';
      const result = feedService.publishSuggestionFeed(userId);

      expect(result.iCalUrl).toContain('.ics');
      expect(result.googleCalendarUrl).toContain('calendar.google.com');
      expect(result.googleCalendarUrl).toContain(encodeURIComponent(result.iCalUrl));
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate different tokens for different users', () => {
      const result1 = feedService.publishSuggestionFeed('user-1');
      const result2 = feedService.publishSuggestionFeed('user-2');

      expect(result1.iCalUrl).not.toBe(result2.iCalUrl);
    });

    it('should respect custom expiration hours', () => {
      const userId = 'test-user-123';
      const expirationHours = 24;
      const result = feedService.publishSuggestionFeed(userId, expirationHours);

      const expectedExpiration = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration.getTime());

      // Allow 1 second tolerance for test execution time
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('verifySignedToken', () => {
    it('should verify valid tokens', () => {
      const userId = 'test-user-123';
      const { iCalUrl } = feedService.publishSuggestionFeed(userId);
      
      // Extract token from URL
      const token = iCalUrl.split('/').pop()?.replace('.ics', '') || '';
      
      const verified = feedService.verifySignedToken(token);
      
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userId);
      expect(verified?.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject invalid tokens', () => {
      const verified = feedService.verifySignedToken('invalid-token');
      expect(verified).toBeNull();
    });

    it('should reject expired tokens', () => {
      const userId = 'test-user-123';
      // Create a token that expires immediately
      const { iCalUrl } = feedService.publishSuggestionFeed(userId, -1);
      const token = iCalUrl.split('/').pop()?.replace('.ics', '') || '';
      
      const verified = feedService.verifySignedToken(token);
      expect(verified).toBeNull();
    });
  });

  describe('generateFeedContent', () => {
    let mockSuggestions: Suggestion[];
    let mockContacts: Map<string, Contact>;

    beforeEach(() => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockSuggestions = [
        {
          id: 'suggestion-1',
          userId: 'user-1',
          contactId: 'contact-1',
          triggerType: TriggerType.TIMEBOUND,
          proposedTimeslot: {
            start: tomorrow,
            end: new Date(tomorrow.getTime() + 60 * 60 * 1000),
            timezone: 'America/New_York',
          },
          reasoning: 'It has been 2 weeks since you last connected',
          status: SuggestionStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'suggestion-2',
          userId: 'user-1',
          contactId: 'contact-2',
          triggerType: TriggerType.SHARED_ACTIVITY,
          proposedTimeslot: {
            start: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
            end: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
            timezone: 'America/New_York',
          },
          reasoning: 'You both enjoy hiking and there is a group hike this weekend',
          status: SuggestionStatus.ACCEPTED,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'suggestion-3',
          userId: 'user-1',
          contactId: 'contact-3',
          triggerType: TriggerType.TIMEBOUND,
          proposedTimeslot: {
            start: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
            end: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
            timezone: 'America/New_York',
          },
          reasoning: 'Monthly catch-up',
          status: SuggestionStatus.DISMISSED,
          createdAt: now,
          updatedAt: now,
        },
      ];

      mockContacts = new Map([
        [
          'contact-1',
          {
            id: 'contact-1',
            userId: 'user-1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            phone: '+1234567890',
            groups: [],
            tags: [],
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
        [
          'contact-2',
          {
            id: 'contact-2',
            userId: 'user-1',
            name: 'Bob Smith',
            email: 'bob@example.com',
            groups: [],
            tags: [],
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
        [
          'contact-3',
          {
            id: 'contact-3',
            userId: 'user-1',
            name: 'Charlie Brown',
            groups: [],
            tags: [],
            archived: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
      ]);
    });

    it('should generate valid iCal format', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      expect(content).toContain('BEGIN:VCALENDAR');
      expect(content).toContain('END:VCALENDAR');
      expect(content).toContain('VERSION:2.0');
      expect(content).toContain('PRODID:-//CatchUp//Relationship Manager//EN');
    });

    it('should include only pending and accepted suggestions', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      // Should include pending and accepted
      expect(content).toContain('Alice Johnson');
      expect(content).toContain('Bob Smith');
      
      // Should not include dismissed
      expect(content).not.toContain('Charlie Brown');
    });

    it('should include contact details in event description', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      expect(content).toContain('alice@example.com');
      expect(content).toContain('+1234567890');
    });

    it('should include reasoning in event description', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      expect(content).toContain('It has been 2 weeks since you last connected');
      expect(content).toContain('You both enjoy hiking');
    });

    it('should set correct event status based on suggestion status', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      // Pending suggestions should be TENTATIVE
      const pendingEventIndex = content.indexOf('Alice Johnson');
      const pendingStatusIndex = content.indexOf('STATUS:', pendingEventIndex);
      const pendingStatus = content.substring(pendingStatusIndex, pendingStatusIndex + 20);
      expect(pendingStatus).toContain('TENTATIVE');

      // Accepted suggestions should be CONFIRMED
      const acceptedEventIndex = content.indexOf('Bob Smith');
      const acceptedStatusIndex = content.indexOf('STATUS:', acceptedEventIndex);
      const acceptedStatus = content.substring(acceptedStatusIndex, acceptedStatusIndex + 20);
      expect(acceptedStatus).toContain('CONFIRMED');
    });

    it('should handle empty suggestions list', () => {
      const content = feedService.generateFeedContent([], mockContacts);

      expect(content).toContain('BEGIN:VCALENDAR');
      expect(content).toContain('END:VCALENDAR');
      expect(content).not.toContain('BEGIN:VEVENT');
    });

    it('should skip suggestions with missing contacts', () => {
      const suggestions = [mockSuggestions[0]];
      const emptyContacts = new Map<string, Contact>();

      const content = feedService.generateFeedContent(suggestions, emptyContacts);

      expect(content).toContain('BEGIN:VCALENDAR');
      expect(content).not.toContain('BEGIN:VEVENT');
    });

    it('should escape special characters in iCal format', () => {
      const specialSuggestion: Suggestion = {
        ...mockSuggestions[0],
        reasoning: 'Test; with, special\ncharacters\\backslash',
      };

      const content = feedService.generateFeedContent([specialSuggestion], mockContacts);

      expect(content).toContain('\\;');
      expect(content).toContain('\\,');
      expect(content).toContain('\\n');
      expect(content).toContain('\\\\');
    });

    it('should set TRANSP to TRANSPARENT to not block time', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      expect(content).toContain('TRANSP:TRANSPARENT');
    });

    it('should include unique UIDs for each event', () => {
      const content = feedService.generateFeedContent(mockSuggestions, mockContacts);

      expect(content).toContain('UID:catchup-suggestion-1@catchup.app');
      expect(content).toContain('UID:catchup-suggestion-2@catchup.app');
    });
  });

  describe('updateFeedEvent', () => {
    it('should complete without errors', async () => {
      await expect(feedService.updateFeedEvent('suggestion-123')).resolves.toBeUndefined();
    });
  });
});
