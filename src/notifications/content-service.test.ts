/**
 * Notification Content Service Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateNotificationText,
  generateDraftMessage,
  generateNotificationContent,
} from './content-service';
import { Suggestion, Contact, TriggerType, SuggestionStatus, TagSource } from '../types';

describe('Notification Content Service', () => {
  const mockContact: Contact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    groups: [],
    tags: [],
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSuggestion: Suggestion = {
    id: 'suggestion-1',
    userId: 'user-1',
    contactId: 'contact-1',
    triggerType: TriggerType.TIMEBOUND,
    proposedTimeslot: {
      start: new Date('2024-03-15T14:00:00Z'),
      end: new Date('2024-03-15T15:00:00Z'),
      timezone: 'America/New_York',
    },
    reasoning: "It's been 3 weeks since you last connected",
    status: SuggestionStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('generateNotificationText', () => {
    it('should include contact name', () => {
      const text = generateNotificationText(mockSuggestion, mockContact);
      expect(text).toContain('John Doe');
    });

    it('should include timeslot', () => {
      const text = generateNotificationText(mockSuggestion, mockContact);
      expect(text).toContain('When:');
    });

    it('should include reasoning', () => {
      const text = generateNotificationText(mockSuggestion, mockContact);
      expect(text).toContain("It's been 3 weeks since you last connected");
    });

    it('should include action options', () => {
      const text = generateNotificationText(mockSuggestion, mockContact);
      expect(text).toContain('Accept');
      expect(text).toContain('Dismiss');
      expect(text).toContain('Snooze');
    });

    it('should be concise for SMS', () => {
      const text = generateNotificationText(mockSuggestion, mockContact);
      // SMS should be reasonably short (under 500 chars is good)
      expect(text.length).toBeLessThan(500);
    });
  });

  describe('generateDraftMessage', () => {
    it('should include contact first name', () => {
      const draft = generateDraftMessage(mockSuggestion, mockContact);
      expect(draft).toContain('John');
    });

    it('should include timeslot', () => {
      const draft = generateDraftMessage(mockSuggestion, mockContact);
      expect(draft.toLowerCase()).toMatch(/fri|sat|sun|mon|tue|wed|thu/);
    });

    it('should be friendly and casual', () => {
      const draft = generateDraftMessage(mockSuggestion, mockContact);
      expect(draft).toMatch(/hey|hi/i);
      expect(draft).toContain('catch up');
    });

    it('should handle single-word names', () => {
      const singleNameContact = { ...mockContact, name: 'Madonna' };
      const draft = generateDraftMessage(mockSuggestion, singleNameContact);
      expect(draft).toContain('Madonna');
    });
  });

  describe('generateNotificationContent', () => {
    it('should generate SMS content', () => {
      const content = generateNotificationContent(mockSuggestion, mockContact);
      expect(content.sms).toBeDefined();
      expect(content.sms).toContain('John Doe');
    });

    it('should generate email subject', () => {
      const content = generateNotificationContent(mockSuggestion, mockContact);
      expect(content.email.subject).toBeDefined();
      expect(content.email.subject).toContain('John Doe');
    });

    it('should generate email text content', () => {
      const content = generateNotificationContent(mockSuggestion, mockContact);
      expect(content.email.text).toBeDefined();
      expect(content.email.text).toContain('John Doe');
      expect(content.email.text).toContain(mockSuggestion.reasoning);
    });

    it('should generate email HTML content', () => {
      const content = generateNotificationContent(mockSuggestion, mockContact);
      expect(content.email.html).toBeDefined();
      expect(content.email.html).toContain('<div');
      expect(content.email.html).toContain('John Doe');
      expect(content.email.html).toContain(mockSuggestion.reasoning);
    });

    it('should include all required information in email', () => {
      const content = generateNotificationContent(mockSuggestion, mockContact);
      
      // Check text version
      expect(content.email.text).toContain('Proposed Time:');
      expect(content.email.text).toContain('Reason:');
      expect(content.email.text).toContain('Accept');
      expect(content.email.text).toContain('Dismiss');
      expect(content.email.text).toContain('Snooze');

      // Check HTML version
      expect(content.email.html).toContain('Proposed Time:');
      expect(content.email.html).toContain('Reason:');
      expect(content.email.html).toContain('Accept');
      expect(content.email.html).toContain('Dismiss');
      expect(content.email.html).toContain('Snooze');
    });
  });
});
