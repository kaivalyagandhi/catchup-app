/**
 * Tests for WhatsApp chat export parser
 *
 * Validates: Requirements 24.1, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseWhatsAppText } from './whatsapp-parser';

describe('WhatsAppParser', () => {
  // ── Bracket format (US 12h with seconds) ─────────────────────────────────

  describe('bracket format — US 12h with seconds', () => {
    it('should parse basic bracket-format messages', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] John: Hello there',
        '[1/2/23, 10:01:00 AM] Jane: Hi! How are you?',
        '[1/2/23, 10:02:00 AM] John: I\'m doing great',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.platform).toBe('whatsapp');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      const john = result.participants.find((p) => p.displayName === 'John');
      expect(john).toBeDefined();
      expect(john!.messageCount).toBe(2);

      const jane = result.participants.find((p) => p.displayName === 'Jane');
      expect(jane).toBeDefined();
      expect(jane!.messageCount).toBe(1);
    });

    it('should parse timestamps correctly for US format', () => {
      const text = '[1/2/23, 10:00:00 AM] John: Hello';
      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts.getFullYear()).toBe(2023);
      // MM/DD → month=1, day=2
      expect(ts.getMonth()).toBe(0); // January (0-indexed)
      expect(ts.getDate()).toBe(2);
      expect(ts.getHours()).toBe(10);
      expect(ts.getMinutes()).toBe(0);
    });

    it('should handle PM times correctly', () => {
      const text = '[1/2/23, 2:30:00 PM] John: Afternoon message';
      const result = parseWhatsAppText(text);

      expect(result.messages[0].timestamp.getHours()).toBe(14);
      expect(result.messages[0].timestamp.getMinutes()).toBe(30);
    });

    it('should handle 12:00 AM as midnight', () => {
      const text = '[1/2/23, 12:00:00 AM] John: Midnight message';
      const result = parseWhatsAppText(text);

      expect(result.messages[0].timestamp.getHours()).toBe(0);
    });

    it('should handle 12:00 PM as noon', () => {
      const text = '[1/2/23, 12:00:00 PM] John: Noon message';
      const result = parseWhatsAppText(text);

      expect(result.messages[0].timestamp.getHours()).toBe(12);
    });
  });

  // ── Dash format (US 12h no seconds) ──────────────────────────────────────

  describe('dash format — US 12h no seconds', () => {
    it('should parse dash-separated format', () => {
      const text = [
        '1/2/23, 10:00 AM - John: Hello there',
        '1/2/23, 10:01 AM - Jane: Hi!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.platform).toBe('whatsapp');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── EU dot separator (24h) ───────────────────────────────────────────────

  describe('EU dot separator — 24h', () => {
    it('should parse DD.MM.YY format with 24h time', () => {
      const text = [
        '[02.01.23, 14:00:00] Hans: Hallo',
        '[02.01.23, 14:05:00] Greta: Hi Hans!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      const ts = result.messages[0].timestamp;
      expect(ts.getFullYear()).toBe(2023);
      expect(ts.getMonth()).toBe(0); // January
      expect(ts.getDate()).toBe(2);
      expect(ts.getHours()).toBe(14);
    });

    it('should parse DD.MM.YY format without seconds', () => {
      const text = [
        '[02.01.23, 14:00] Hans: Hallo',
        '[02.01.23, 14:05] Greta: Hi!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── 24h slash format ─────────────────────────────────────────────────────

  describe('24h slash format', () => {
    it('should parse DD/MM/YY 24h format', () => {
      const text = [
        '[02/01/23, 14:00:00] Alice: Bonjour',
        '[02/01/23, 14:05:00] Bob: Salut!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
    });
  });

  // ── System messages ──────────────────────────────────────────────────────

  describe('system messages', () => {
    it('should detect system messages (no sender)', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] Messages and calls are end-to-end encrypted.',
        '[1/2/23, 10:01:00 AM] John: Hello!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(2);

      const systemMsg = result.messages[0];
      expect(systemMsg.isSystemMessage).toBe(true);
      expect(systemMsg.sender).toBe('__system__');
      expect(systemMsg.content).toContain('end-to-end encrypted');

      const userMsg = result.messages[1];
      expect(userMsg.isSystemMessage).toBe(false);
      expect(userMsg.sender).toBe('John');
    });

    it('should not count system messages as participants', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] Messages and calls are end-to-end encrypted.',
        '[1/2/23, 10:00:00 AM] John created this group',
        '[1/2/23, 10:01:00 AM] John: Hello!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      // Only John should be a participant (system messages excluded)
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].displayName).toBe('John');
      expect(result.participants[0].messageCount).toBe(1);
    });
  });

  // ── Multi-line messages ──────────────────────────────────────────────────

  describe('multi-line messages', () => {
    it('should handle multi-line messages', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] John: Line one',
        'Line two of the same message',
        'Line three',
        '[1/2/23, 10:01:00 AM] Jane: Single line reply',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe(
        'Line one\nLine two of the same message\nLine three',
      );
      expect(result.messages[1].content).toBe('Single line reply');
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should track first and last message dates per participant', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] John: First message',
        '[1/3/23, 11:00:00 AM] Jane: Reply',
        '[1/5/23, 2:00:00 PM] John: Last message',
      ].join('\n');

      const result = parseWhatsAppText(text);

      const john = result.participants.find((p) => p.displayName === 'John');
      expect(john).toBeDefined();
      expect(john!.messageCount).toBe(2);
      expect(john!.firstMessageDate.getDate()).toBe(2);
      expect(john!.lastMessageDate.getDate()).toBe(5);
    });

    it('should normalize participant identifiers', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] +1 (555) 123-4567: Hello',
        '[1/2/23, 10:01:00 AM] +1 (555) 123-4567: Another message',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].identifier).toBe('+15551234567');
      expect(result.participants[0].identifierType).toBe('phone');
      expect(result.participants[0].messageCount).toBe(2);
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should report errors for unparseable lines before first message', () => {
      const text = [
        'This is some random header text',
        '[1/2/23, 10:00:00 AM] John: Hello',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(1);
    });

    it('should return error when no date format can be detected', () => {
      const text = 'Just plain text with no timestamps at all';
      const result = parseWhatsAppText(text);

      expect(result.platform).toBe('whatsapp');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const result = parseWhatsAppText('');

      expect(result.platform).toBe('whatsapp');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });

    it('should skip blank lines without errors', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] John: Hello',
        '',
        '',
        '[1/2/23, 10:01:00 AM] Jane: Hi!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as whatsapp', () => {
      const result = parseWhatsAppText('');
      expect(result.platform).toBe('whatsapp');
    });

    it('should return all required fields', () => {
      const text = '[1/2/23, 10:00:00 AM] John: Hello';
      const result = parseWhatsAppText(text);

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include valid timestamps on all messages', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] John: Hello',
        '[1/2/23, 10:01:00 AM] Jane: Hi!',
      ].join('\n');

      const result = parseWhatsAppText(text);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const text = [
        '[1/2/23, 10:00:00 AM] System message without sender',
        '[1/2/23, 10:01:00 AM] John: Hello',
      ].join('\n');

      const result = parseWhatsAppText(text);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Full-year dates ──────────────────────────────────────────────────────

  describe('full-year dates', () => {
    it('should handle 4-digit years', () => {
      const text = '[1/2/2023, 10:00:00 AM] John: Hello';
      const result = parseWhatsAppText(text);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].timestamp.getFullYear()).toBe(2023);
    });
  });
});
