/**
 * Real-time Notification Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeNotificationService } from './realtime-service';
import { Suggestion, Contact, TriggerType, SuggestionStatus } from '../types';

// Mock dependencies
vi.mock('../contacts/repository', () => ({
  findById: vi.fn(),
}));

vi.mock('./preferences-repository', () => ({
  getPreferences: vi.fn(),
  getDefaultPreferences: vi.fn(),
}));

describe('RealtimeNotificationService', () => {
  const mockContact: Contact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'John Doe',
    phone: '+19876543210',
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
    triggerType: TriggerType.SHARED_ACTIVITY,
    proposedTimeslot: {
      start: new Date('2024-03-15T14:00:00Z'),
      end: new Date('2024-03-15T15:00:00Z'),
      timezone: 'America/New_York',
    },
    reasoning: 'Concert event matches shared interest in music',
    status: SuggestionStatus.PENDING,
    calendarEventId: 'event-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('sendRealtimeNotification', () => {
    it('should send SMS and email when both enabled', async () => {
      const mockSMSService = {
        sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'SMS123', attempts: 1 }),
      };

      const mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'EMAIL123', attempts: 1 }),
      };

      const contactRepository = await import('../contacts/repository');
      (contactRepository.findById as any) = vi.fn().mockResolvedValue(mockContact);

      const preferencesRepository = await import('./preferences-repository');
      (preferencesRepository.getPreferences as any) = vi.fn().mockResolvedValue({
        smsEnabled: true,
        emailEnabled: true,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      });

      const service = new RealtimeNotificationService(mockSMSService as any, mockEmailService as any);

      const result = await service.sendRealtimeNotification('user-1', mockSuggestion);

      expect(result.suggestionId).toBe('suggestion-1');
      expect(result.smsDelivered).toBe(true);
      expect(result.emailDelivered).toBe(true);
      expect(result.publishedToFeed).toBe(true);
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        '+19876543210',
        expect.stringContaining('John Doe')
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: expect.stringContaining('John Doe'),
        })
      );
    });

    it('should only send SMS when email disabled', async () => {
      const mockSMSService = {
        sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'SMS123', attempts: 1 }),
      };

      const mockEmailService = {
        sendEmail: vi.fn(),
      };

      const contactRepository = await import('../contacts/repository');
      (contactRepository.findById as any) = vi.fn().mockResolvedValue(mockContact);

      const preferencesRepository = await import('./preferences-repository');
      (preferencesRepository.getPreferences as any) = vi.fn().mockResolvedValue({
        smsEnabled: true,
        emailEnabled: false,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      });

      const service = new RealtimeNotificationService(mockSMSService as any, mockEmailService as any);

      const result = await service.sendRealtimeNotification('user-1', mockSuggestion);

      expect(result.smsDelivered).toBe(true);
      expect(result.emailDelivered).toBe(false);
      expect(mockSMSService.sendSMS).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle contact not found error', async () => {
      const mockSMSService = {
        sendSMS: vi.fn(),
      };

      const mockEmailService = {
        sendEmail: vi.fn(),
      };

      const contactRepository = await import('../contacts/repository');
      (contactRepository.findById as any) = vi.fn().mockResolvedValue(null);

      const service = new RealtimeNotificationService(mockSMSService as any, mockEmailService as any);

      const result = await service.sendRealtimeNotification('user-1', mockSuggestion);

      expect(result.error).toContain('Contact');
      expect(result.smsDelivered).toBe(false);
      expect(result.emailDelivered).toBe(false);
    });

    it('should handle SMS delivery failure', async () => {
      const mockSMSService = {
        sendSMS: vi.fn().mockResolvedValue({ success: false, error: 'Network error', attempts: 3 }),
      };

      const mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'EMAIL123', attempts: 1 }),
      };

      const contactRepository = await import('../contacts/repository');
      (contactRepository.findById as any) = vi.fn().mockResolvedValue(mockContact);

      const preferencesRepository = await import('./preferences-repository');
      (preferencesRepository.getPreferences as any) = vi.fn().mockResolvedValue({
        smsEnabled: true,
        emailEnabled: true,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      });

      const service = new RealtimeNotificationService(mockSMSService as any, mockEmailService as any);

      const result = await service.sendRealtimeNotification('user-1', mockSuggestion);

      expect(result.smsDelivered).toBe(false);
      expect(result.emailDelivered).toBe(true);
    });
  });

  describe('sendBulkRealtimeNotifications', () => {
    it('should send notifications for multiple suggestions', async () => {
      const mockSMSService = {
        sendSMS: vi.fn().mockResolvedValue({ success: true, messageId: 'SMS123', attempts: 1 }),
      };

      const mockEmailService = {
        sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'EMAIL123', attempts: 1 }),
      };

      const contactRepository = await import('../contacts/repository');
      (contactRepository.findById as any) = vi.fn().mockResolvedValue(mockContact);

      const preferencesRepository = await import('./preferences-repository');
      (preferencesRepository.getPreferences as any) = vi.fn().mockResolvedValue({
        smsEnabled: true,
        emailEnabled: true,
        batchDay: 0,
        batchTime: '09:00',
        timezone: 'America/New_York',
      });

      const service = new RealtimeNotificationService(mockSMSService as any, mockEmailService as any);

      const suggestions = [mockSuggestion, { ...mockSuggestion, id: 'suggestion-2' }];
      const results = await service.sendBulkRealtimeNotifications('user-1', suggestions);

      expect(results).toHaveLength(2);
      expect(results[0].suggestionId).toBe('suggestion-1');
      expect(results[1].suggestionId).toBe('suggestion-2');
      expect(mockSMSService.sendSMS).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
    });
  });
});
