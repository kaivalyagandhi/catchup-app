/**
 * Tests for Facebook Messenger chat export parser
 *
 * Validates: Requirements 24.4, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseFacebookJson, decodeFacebookString } from './facebook-parser';

describe('FacebookParser', () => {
  // ── Basic parsing ────────────────────────────────────────────────────────

  describe('basic JSON parsing', () => {
    it('should parse a valid Facebook export with two participants', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }, { name: 'User Two' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic', is_unsent: false },
          { sender_name: 'User Two', timestamp_ms: 1672531260000, content: 'Hi there!', type: 'Generic', is_unsent: false },
          { sender_name: 'User One', timestamp_ms: 1672531320000, content: 'How are you?', type: 'Generic' },
        ],
        title: 'Chat with User Two',
        thread_path: 'inbox/user_abc123',
        is_still_participant: true,
      });

      const result = parseFacebookJson(json);

      expect(result.platform).toBe('facebook');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      const user1 = result.participants.find((p) => p.displayName === 'User One');
      expect(user1).toBeDefined();
      expect(user1!.messageCount).toBe(2);

      const user2 = result.participants.find((p) => p.displayName === 'User Two');
      expect(user2).toBeDefined();
      expect(user2!.messageCount).toBe(1);
    });

    it('should parse timestamps correctly', () => {
      const json = JSON.stringify({
        participants: [{ name: 'Alice' }],
        messages: [
          { sender_name: 'Alice', timestamp_ms: 1672531200000, content: 'Test', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts).toBeInstanceOf(Date);
      expect(ts.getTime()).toBe(1672531200000);
    });
  });

  // ── Unsent messages ──────────────────────────────────────────────────────

  describe('unsent messages', () => {
    it('should skip messages with is_unsent set to true', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Visible', type: 'Generic', is_unsent: false },
          { sender_name: 'User One', timestamp_ms: 1672531260000, content: 'Removed', type: 'Generic', is_unsent: true },
          { sender_name: 'User One', timestamp_ms: 1672531320000, content: 'Also visible', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('Visible');
      expect(result.messages[1].content).toBe('Also visible');
      expect(result.participants[0].messageCount).toBe(2);
    });
  });

  // ── System messages ──────────────────────────────────────────────────────

  describe('system messages', () => {
    it('should detect non-Generic type as system messages', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }, { name: 'User Two' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic' },
          { sender_name: 'User One', timestamp_ms: 1672531260000, content: 'User One named the group "Friends"', type: 'Share' },
          { sender_name: 'User Two', timestamp_ms: 1672531320000, content: 'Nice!', type: 'Generic' },
        ],
        title: 'Friends',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(3);

      const systemMsg = result.messages[1];
      expect(systemMsg.isSystemMessage).toBe(true);
      expect(systemMsg.sender).toBe('__system__');

      const userMsg = result.messages[0];
      expect(userMsg.isSystemMessage).toBe(false);
      expect(userMsg.sender).toBe('User One');
    });

    it('should not count system messages toward participant stats', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic' },
          { sender_name: 'User One', timestamp_ms: 1672531260000, content: 'Changed photo', type: 'Share' },
          { sender_name: 'User One', timestamp_ms: 1672531320000, content: 'Bye!', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].messageCount).toBe(2);
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should track first and last message dates per participant', () => {
      const json = JSON.stringify({
        participants: [{ name: 'Alice' }, { name: 'Bob' }],
        messages: [
          { sender_name: 'Alice', timestamp_ms: 1672531200000, content: 'First', type: 'Generic' },
          { sender_name: 'Bob', timestamp_ms: 1672531260000, content: 'Reply', type: 'Generic' },
          { sender_name: 'Alice', timestamp_ms: 1672617600000, content: 'Last', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      const alice = result.participants.find((p) => p.displayName === 'Alice');
      expect(alice).toBeDefined();
      expect(alice!.messageCount).toBe(2);
      expect(alice!.firstMessageDate.getTime()).toBe(1672531200000);
      expect(alice!.lastMessageDate.getTime()).toBe(1672617600000);
    });

    it('should normalize participant identifiers via identifier-normalizer', () => {
      const json = JSON.stringify({
        participants: [{ name: 'CoolUser_123' }],
        messages: [
          { sender_name: 'CoolUser_123', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
          { sender_name: 'CoolUser_123', timestamp_ms: 1672531260000, content: 'Again', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].identifier).toBe('cooluser_123');
      expect(result.participants[0].identifierType).toBe('username');
    });
  });

  // ── Facebook UTF-8 decoding ──────────────────────────────────────────────

  describe('Facebook UTF-8 string decoding', () => {
    it('should decode Facebook escaped UTF-8 byte sequences', () => {
      // "é" is U+00E9, encoded in UTF-8 as bytes 0xC3 0xA9
      // Facebook exports these as "\u00c3\u00a9"
      const encoded = '\u00c3\u00a9';
      expect(decodeFacebookString(encoded)).toBe('é');
    });

    it('should pass through plain ASCII strings unchanged', () => {
      expect(decodeFacebookString('Hello World')).toBe('Hello World');
    });

    it('should decode sender names with non-ASCII characters', () => {
      // Simulate Facebook encoding of "José" → "Jos\u00c3\u00a9"
      const json = JSON.stringify({
        participants: [{ name: 'Jos\u00c3\u00a9' }],
        messages: [
          { sender_name: 'Jos\u00c3\u00a9', timestamp_ms: 1672531200000, content: 'Hola!', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages[0].sender).toBe('José');
      expect(result.messages[0].content).toBe('Hola!');
    });

    it('should decode message content with non-ASCII characters', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User' }],
        messages: [
          { sender_name: 'User', timestamp_ms: 1672531200000, content: 'Caf\u00c3\u00a9', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages[0].content).toBe('Café');
    });
  });

  // ── Messages with missing content ────────────────────────────────────────

  describe('messages with missing content', () => {
    it('should handle messages without content field (photos, shares)', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('');
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should handle empty input', () => {
      const result = parseFacebookJson('');

      expect(result.platform).toBe('facebook');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid JSON', () => {
      const result = parseFacebookJson('not valid json {{{');

      expect(result.platform).toBe('facebook');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should return error when JSON root is not an object', () => {
      const result = parseFacebookJson('"just a string"');

      expect(result.platform).toBe('facebook');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not an object');
    });

    it('should return error when messages array is missing', () => {
      const json = JSON.stringify({ participants: [{ name: 'User One' }], title: 'Chat' });
      const result = parseFacebookJson(json);

      expect(result.platform).toBe('facebook');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('messages');
    });

    it('should skip malformed entries and continue parsing', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Good', type: 'Generic' },
          { sender_name: 'User One', timestamp_ms: 'not-a-number', content: 'Bad timestamp', type: 'Generic' },
          null,
          { timestamp_ms: 1672531320000, content: 'No sender', type: 'Generic' },
          { sender_name: 'User One', timestamp_ms: 1672531380000, content: 'Also good', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(3);
      expect(result.participants[0].messageCount).toBe(2);
    });

    it('should handle entry that is not an object', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [42, 'string', true],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as facebook', () => {
      const result = parseFacebookJson('');
      expect(result.platform).toBe('facebook');
    });

    it('should return all required fields', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include valid timestamps on all messages', () => {
      const json = JSON.stringify({
        participants: [{ name: 'a' }, { name: 'b' }],
        messages: [
          { sender_name: 'a', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
          { sender_name: 'b', timestamp_ms: 1672531260000, content: 'Hey', type: 'Generic' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const json = JSON.stringify({
        participants: [{ name: 'User One' }],
        messages: [
          { sender_name: 'User One', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
          { sender_name: 'User One', timestamp_ms: 1672531260000, content: 'System', type: 'Share' },
        ],
        title: 'Chat',
      });

      const result = parseFacebookJson(json);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });
  });
});
