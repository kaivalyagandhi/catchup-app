/**
 * Tests for Instagram chat export parser
 *
 * Validates: Requirements 24.2, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseInstagramJson } from './instagram-parser';

describe('InstagramParser', () => {
  // ── Basic parsing ────────────────────────────────────────────────────────

  describe('basic JSON parsing', () => {
    it('should parse a valid Instagram export with two participants', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }, { name: 'user2' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic' },
          { sender_name: 'user2', timestamp_ms: 1672531260000, content: 'Hi there!', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 1672531320000, content: 'How are you?', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.platform).toBe('instagram');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      const user1 = result.participants.find((p) => p.displayName === 'user1');
      expect(user1).toBeDefined();
      expect(user1!.messageCount).toBe(2);

      const user2 = result.participants.find((p) => p.displayName === 'user2');
      expect(user2).toBeDefined();
      expect(user2!.messageCount).toBe(1);
    });

    it('should parse timestamps correctly', () => {
      const json = JSON.stringify({
        participants: [{ name: 'alice' }],
        messages: [
          { sender_name: 'alice', timestamp_ms: 1672531200000, content: 'Test', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts).toBeInstanceOf(Date);
      expect(ts.getTime()).toBe(1672531200000);
    });
  });

  // ── System messages ──────────────────────────────────────────────────────

  describe('system messages', () => {
    it('should detect non-Generic type as system messages', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }, { name: 'user2' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 1672531260000, content: 'user1 named the group "Friends"', type: 'Share' },
          { sender_name: 'user2', timestamp_ms: 1672531320000, content: 'Nice!', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.messages).toHaveLength(3);

      const systemMsg = result.messages[1];
      expect(systemMsg.isSystemMessage).toBe(true);
      expect(systemMsg.sender).toBe('__system__');

      const userMsg = result.messages[0];
      expect(userMsg.isSystemMessage).toBe(false);
      expect(userMsg.sender).toBe('user1');
    });

    it('should not count system messages toward participant stats', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Hello!', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 1672531260000, content: 'Changed photo', type: 'Share' },
          { sender_name: 'user1', timestamp_ms: 1672531320000, content: 'Bye!', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].messageCount).toBe(2); // only Generic messages
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should track first and last message dates per participant', () => {
      const json = JSON.stringify({
        participants: [{ name: 'alice' }, { name: 'bob' }],
        messages: [
          { sender_name: 'alice', timestamp_ms: 1672531200000, content: 'First', type: 'Generic' },
          { sender_name: 'bob', timestamp_ms: 1672531260000, content: 'Reply', type: 'Generic' },
          { sender_name: 'alice', timestamp_ms: 1672617600000, content: 'Last', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      const alice = result.participants.find((p) => p.displayName === 'alice');
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
      });

      const result = parseInstagramJson(json);

      expect(result.participants).toHaveLength(1);
      // Username-like identifiers get lowercased
      expect(result.participants[0].identifier).toBe('cooluser_123');
      expect(result.participants[0].identifierType).toBe('username');
    });
  });

  // ── Messages with missing content ────────────────────────────────────────

  describe('messages with missing content', () => {
    it('should handle messages without content field (photos, shares)', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('');
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should handle empty input', () => {
      const result = parseInstagramJson('');

      expect(result.platform).toBe('instagram');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid JSON', () => {
      const result = parseInstagramJson('not valid json {{{');

      expect(result.platform).toBe('instagram');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });

    it('should return error when JSON root is not an object', () => {
      const result = parseInstagramJson('"just a string"');

      expect(result.platform).toBe('instagram');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not an object');
    });

    it('should return error when messages array is missing', () => {
      const json = JSON.stringify({ participants: [{ name: 'user1' }] });
      const result = parseInstagramJson(json);

      expect(result.platform).toBe('instagram');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('messages');
    });

    it('should skip malformed entries and continue parsing', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Good', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 'not-a-number', content: 'Bad timestamp', type: 'Generic' },
          null,
          { timestamp_ms: 1672531320000, content: 'No sender', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 1672531380000, content: 'Also good', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

      expect(result.messages).toHaveLength(2); // only the two valid Generic messages
      expect(result.errors).toHaveLength(3); // bad timestamp, null entry, missing sender
      expect(result.participants[0].messageCount).toBe(2);
    });

    it('should handle entry that is not an object', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [42, 'string', true],
      });

      const result = parseInstagramJson(json);

      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as instagram', () => {
      const result = parseInstagramJson('');
      expect(result.platform).toBe('instagram');
    });

    it('should return all required fields', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
        ],
      });

      const result = parseInstagramJson(json);

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
      });

      const result = parseInstagramJson(json);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const json = JSON.stringify({
        participants: [{ name: 'user1' }],
        messages: [
          { sender_name: 'user1', timestamp_ms: 1672531200000, content: 'Hi', type: 'Generic' },
          { sender_name: 'user1', timestamp_ms: 1672531260000, content: 'System', type: 'Share' },
        ],
      });

      const result = parseInstagramJson(json);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });
  });
});
