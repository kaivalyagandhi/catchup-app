/**
 * Tests for X/Twitter DM chat export parser
 *
 * Validates: Requirements 24.5, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseTwitterJson } from './twitter-parser';

describe('TwitterParser', () => {
  // ── Basic parsing ────────────────────────────────────────────────────────

  describe('basic JSON parsing', () => {
    it('should parse a valid Twitter DM export with two participants', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '123456-789012',
            messages: [
              {
                messageCreate: {
                  id: 'msg1',
                  senderId: '123456',
                  text: 'Hello!',
                  createdAt: '2023-01-01T10:00:00.000Z',
                },
              },
              {
                messageCreate: {
                  id: 'msg2',
                  senderId: '789012',
                  text: 'Hi there!',
                  createdAt: '2023-01-01T10:01:00.000Z',
                },
              },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.platform).toBe('twitter');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse timestamps correctly from ISO strings', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '111-222',
            messages: [
              {
                messageCreate: {
                  id: 'msg1',
                  senderId: '111',
                  text: 'Test',
                  createdAt: '2023-06-15T14:30:00.000Z',
                },
              },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts).toBeInstanceOf(Date);
      expect(ts.toISOString()).toBe('2023-06-15T14:30:00.000Z');
    });

    it('should parse multiple conversations', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              {
                messageCreate: {
                  id: 'msg1',
                  senderId: '100',
                  text: 'Hello from conv1',
                  createdAt: '2023-01-01T10:00:00.000Z',
                },
              },
            ],
          },
        },
        {
          dmConversation: {
            conversationId: 'conv2',
            messages: [
              {
                messageCreate: {
                  id: 'msg2',
                  senderId: '200',
                  text: 'Hello from conv2',
                  createdAt: '2023-01-02T10:00:00.000Z',
                },
              },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(2);
      expect(result.participants).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should track message counts per participant', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '123-456',
            messages: [
              { messageCreate: { id: 'm1', senderId: '123', text: 'A', createdAt: '2023-01-01T10:00:00.000Z' } },
              { messageCreate: { id: 'm2', senderId: '456', text: 'B', createdAt: '2023-01-01T10:01:00.000Z' } },
              { messageCreate: { id: 'm3', senderId: '123', text: 'C', createdAt: '2023-01-01T10:02:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      const p123 = result.participants.find((p) => p.identifier === '123');
      expect(p123).toBeDefined();
      expect(p123!.messageCount).toBe(2);

      const p456 = result.participants.find((p) => p.identifier === '456');
      expect(p456).toBeDefined();
      expect(p456!.messageCount).toBe(1);
    });

    it('should track first and last message dates per participant', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '123-456',
            messages: [
              { messageCreate: { id: 'm1', senderId: '123', text: 'First', createdAt: '2023-01-01T10:00:00.000Z' } },
              { messageCreate: { id: 'm2', senderId: '123', text: 'Middle', createdAt: '2023-06-15T10:00:00.000Z' } },
              { messageCreate: { id: 'm3', senderId: '123', text: 'Last', createdAt: '2023-12-31T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      const p = result.participants.find((p) => p.identifier === '123');
      expect(p).toBeDefined();
      expect(p!.firstMessageDate.toISOString()).toBe('2023-01-01T10:00:00.000Z');
      expect(p!.lastMessageDate.toISOString()).toBe('2023-12-31T10:00:00.000Z');
    });

    it('should use username identifierType for Twitter numeric IDs', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '111-222',
            messages: [
              { messageCreate: { id: 'm1', senderId: '9876543210', text: 'Hi', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].identifierType).toBe('username');
    });

    it('should aggregate participant across multiple conversations', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '100', text: 'A', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
        {
          dmConversation: {
            conversationId: 'conv2',
            messages: [
              { messageCreate: { id: 'm2', senderId: '100', text: 'B', createdAt: '2023-06-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].messageCount).toBe(2);
      expect(result.participants[0].firstMessageDate.toISOString()).toBe('2023-01-01T10:00:00.000Z');
      expect(result.participants[0].lastMessageDate.toISOString()).toBe('2023-06-01T10:00:00.000Z');
    });

    it('should use senderId as displayName', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '111-222',
            messages: [
              { messageCreate: { id: 'm1', senderId: '42', text: 'Hi', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.participants[0].displayName).toBe('42');
    });
  });

  // ── Messages with missing text ───────────────────────────────────────────

  describe('messages with missing text', () => {
    it('should handle messages without text field', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '111-222',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('');
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── All messages are non-system ──────────────────────────────────────────

  describe('system messages', () => {
    it('should mark all Twitter DM messages as non-system', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: '111-222',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Hello', createdAt: '2023-01-01T10:00:00.000Z' } },
              { messageCreate: { id: 'm2', senderId: '222', text: 'Hi', createdAt: '2023-01-01T10:01:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      for (const msg of result.messages) {
        expect(msg.isSystemMessage).toBe(false);
      }
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should handle empty input', () => {
      const result = parseTwitterJson('');

      expect(result.platform).toBe('twitter');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid JSON', () => {
      const result = parseTwitterJson('not valid json {{{');

      expect(result.platform).toBe('twitter');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should return error when JSON root is not an array', () => {
      const result = parseTwitterJson('{"not": "an array"}');

      expect(result.platform).toBe('twitter');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not an array');
    });

    it('should skip conversation entries that are not objects', () => {
      const json = JSON.stringify([42, 'string', null, true]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(4);
    });

    it('should skip entries missing dmConversation', () => {
      const json = JSON.stringify([{ someOtherKey: 'value' }]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('dmConversation');
    });

    it('should skip conversations with missing messages array', () => {
      const json = JSON.stringify([
        { dmConversation: { conversationId: 'conv1' } },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('messages');
    });

    it('should skip malformed message entries and continue parsing', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Good', createdAt: '2023-01-01T10:00:00.000Z' } },
              null,
              { messageCreate: { id: 'm3', senderId: '', text: 'No sender', createdAt: '2023-01-01T10:02:00.000Z' } },
              { noMessageCreate: true },
              { messageCreate: { id: 'm5', senderId: '111', text: 'Also good', createdAt: '2023-01-01T10:04:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(3);
      expect(result.participants[0].messageCount).toBe(2);
    });

    it('should skip messages with invalid timestamps', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Good', createdAt: '2023-01-01T10:00:00.000Z' } },
              { messageCreate: { id: 'm2', senderId: '111', text: 'Bad', createdAt: 'not-a-date' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should skip messages with missing createdAt', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'No date' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('createdAt');
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as twitter', () => {
      const result = parseTwitterJson('');
      expect(result.platform).toBe('twitter');
    });

    it('should return all required fields', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Hi', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include valid timestamps on all messages', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Hi', createdAt: '2023-01-01T10:00:00.000Z' } },
              { messageCreate: { id: 'm2', senderId: '222', text: 'Hey', createdAt: '2023-01-01T10:01:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const json = JSON.stringify([
        {
          dmConversation: {
            conversationId: 'conv1',
            messages: [
              { messageCreate: { id: 'm1', senderId: '111', text: 'Hi', createdAt: '2023-01-01T10:00:00.000Z' } },
            ],
          },
        },
      ]);

      const result = parseTwitterJson(json);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });
  });
});
