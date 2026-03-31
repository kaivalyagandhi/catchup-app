/**
 * Tests for iMessage chat export parser
 *
 * Validates: Requirements 24.3, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseIMessageCsv } from './imessage-parser';

describe('IMessageParser', () => {
  // ── iMazing format (quoted, with Type column) ────────────────────────────

  describe('iMazing format — quoted CSV with Type column', () => {
    it('should parse basic iMazing-style CSV', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:00:00","John","Hello there"',
        '"Message","2023-01-01 10:01:00","Jane","Hi! How are you?"',
        '"Message","2023-01-01 10:02:00","John","I\'m doing great"',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.platform).toBe('imessage');
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

    it('should parse timestamps correctly', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:30:00","John","Hello"',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts.getFullYear()).toBe(2023);
      expect(ts.getMonth()).toBe(0); // January
      expect(ts.getDate()).toBe(1);
      expect(ts.getHours()).toBe(10);
      expect(ts.getMinutes()).toBe(30);
    });

    it('should handle attachment rows as system messages', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:00:00","John","Hello"',
        '"Attachment","2023-01-01 10:02:00","John","image.jpg"',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);

      const attachment = result.messages[1];
      expect(attachment.isSystemMessage).toBe(true);
      expect(attachment.sender).toBe('__system__');
      expect(attachment.content).toBe('[Attachment: image.jpg]');

      // Attachment should not count toward participant message count
      const john = result.participants.find((p) => p.displayName === 'John');
      expect(john).toBeDefined();
      expect(john!.messageCount).toBe(1);
    });
  });

  // ── Simple format (unquoted, no Type column) ─────────────────────────────

  describe('simple format — unquoted CSV', () => {
    it('should parse simple From/Time/Body format', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        'jane,2023-01-01 10:01,Hi!',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.platform).toBe('imessage');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse Sender/Date/Message header aliases', () => {
      const csv = [
        'Sender,Date,Message',
        'Alice,2023-06-15 14:00:00,Hey there',
        'Bob,2023-06-15 14:01:00,Hello!',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse Author/Timestamp/Content header aliases', () => {
      const csv = [
        'Author,Timestamp,Content',
        'Alice,2023-06-15 14:00:00,Hey there',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.participants).toHaveLength(1);
      expect(result.messages).toHaveLength(1);
    });
  });

  // ── CSV quoting and escaping ─────────────────────────────────────────────

  describe('CSV quoting and escaping', () => {
    it('should handle fields with commas inside quotes', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:00:00","John","Hello, how are you?"',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello, how are you?');
    });

    it('should handle escaped quotes inside fields', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:00:00","John","She said ""hello"""',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('She said "hello"');
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should track first and last message dates per participant', () => {
      const csv = [
        'From,Time,Body',
        'John,2023-01-02 10:00,First message',
        'Jane,2023-01-03 11:00,Reply',
        'John,2023-01-05 14:00,Last message',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      const john = result.participants.find((p) => p.displayName === 'John');
      expect(john).toBeDefined();
      expect(john!.messageCount).toBe(2);
      expect(john!.firstMessageDate.getDate()).toBe(2);
      expect(john!.lastMessageDate.getDate()).toBe(5);
    });

    it('should normalize phone number identifiers', () => {
      const csv = [
        'From,Time,Body',
        '+1 (555) 123-4567,2023-01-01 10:00,Hello',
        '+1 (555) 123-4567,2023-01-01 10:01,Another message',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].identifier).toBe('+15551234567');
      expect(result.participants[0].identifierType).toBe('phone');
      expect(result.participants[0].messageCount).toBe(2);
    });

    it('should normalize email identifiers to lowercase', () => {
      const csv = [
        'From,Time,Body',
        'John@Example.COM,2023-01-01 10:00,Hello',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].identifier).toBe('john@example.com');
      expect(result.participants[0].identifierType).toBe('email');
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should handle empty input', () => {
      const result = parseIMessageCsv('');

      expect(result.platform).toBe('imessage');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when headers cannot be mapped', () => {
      const csv = 'Col1,Col2,Col3\na,b,c';
      const result = parseIMessageCsv(csv);

      expect(result.platform).toBe('imessage');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unable to detect column mapping');
    });

    it('should skip rows with too few columns', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        'jane',
        'bob,2023-01-01 10:02,Hi',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(3);
    });

    it('should skip rows with invalid dates', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        'jane,not-a-date,Hi',
        'bob,2023-01-01 10:02,Hey',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid date');
    });

    it('should skip rows with missing sender', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        ',2023-01-01 10:01,No sender',
        'bob,2023-01-01 10:02,Hey',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing sender');
    });

    it('should skip blank lines without errors', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        '',
        '',
        'jane,2023-01-01 10:01,Hi!',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as imessage', () => {
      const result = parseIMessageCsv('');
      expect(result.platform).toBe('imessage');
    });

    it('should return all required fields', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include valid timestamps on all messages', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
        'jane,2023-01-01 10:01,Hi!',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const csv = [
        '"Type","Date","Sender","Text"',
        '"Message","2023-01-01 10:00:00","John","Hello"',
        '"Attachment","2023-01-01 10:01:00","John","photo.png"',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Date format variations ───────────────────────────────────────────────

  describe('date format variations', () => {
    it('should handle ISO-like dates without seconds', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-01-01 10:00,Hello',
      ].join('\n');

      const result = parseIMessageCsv(csv);
      expect(result.messages[0].timestamp.getHours()).toBe(10);
      expect(result.messages[0].timestamp.getMinutes()).toBe(0);
    });

    it('should handle US date format with AM/PM', () => {
      const csv = [
        'From,Date,Body',
        'john,1/15/2023 2:30 PM,Afternoon message',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].timestamp.getHours()).toBe(14);
      expect(result.messages[0].timestamp.getMinutes()).toBe(30);
    });

    it('should handle 4-digit year ISO format with seconds', () => {
      const csv = [
        'From,Time,Body',
        'john,2023-06-15 14:30:45,Hello',
      ].join('\n');

      const result = parseIMessageCsv(csv);

      const ts = result.messages[0].timestamp;
      expect(ts.getFullYear()).toBe(2023);
      expect(ts.getMonth()).toBe(5); // June
      expect(ts.getDate()).toBe(15);
      expect(ts.getHours()).toBe(14);
      expect(ts.getMinutes()).toBe(30);
      expect(ts.getSeconds()).toBe(45);
    });
  });

  // ── Windows line endings ─────────────────────────────────────────────────

  describe('line endings', () => {
    it('should handle Windows CRLF line endings', () => {
      const csv = '"Type","Date","Sender","Text"\r\n"Message","2023-01-01 10:00:00","John","Hello"\r\n"Message","2023-01-01 10:01:00","Jane","Hi!"';

      const result = parseIMessageCsv(csv);

      expect(result.messages).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });
});
