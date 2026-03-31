/**
 * Tests for Google Messages / SMS Backup & Restore parser
 *
 * Validates: Requirements 24.6, 24.7, 24.8
 */

import { describe, it, expect } from 'vitest';
import { parseGoogleMessagesXml } from './google-messages-parser';

describe('GoogleMessagesParser', () => {
  // ── Basic parsing ────────────────────────────────────────────────────────

  describe('basic XML parsing', () => {
    it('should parse a valid SMS Backup & Restore export', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<smses count="3">
  <sms address="+15551234567" body="Hello there!" date="1672531200000" type="1" contact_name="John Doe" />
  <sms address="+15551234567" body="Hi! How are you?" date="1672531260000" type="2" contact_name="John Doe" />
  <sms address="+15559876543" body="Hey!" date="1672531320000" type="1" contact_name="Jane Smith" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.platform).toBe('google_messages');
      expect(result.participants).toHaveLength(2);
      expect(result.messages).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse timestamps correctly from millisecond epoch', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Test" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      const ts = result.messages[0].timestamp;
      expect(ts).toBeInstanceOf(Date);
      expect(ts.getTime()).toBe(1672531200000);
    });

    it('should extract message body content', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hello World!" date="1672531200000" type="1" contact_name="Bob" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].content).toBe('Hello World!');
    });
  });

  // ── Sent vs received messages ────────────────────────────────────────────

  describe('sent vs received messages', () => {
    it('should use __self__ as sender for type=2 (sent) messages', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="I sent this" date="1672531200000" type="2" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].sender).toBe('__self__');
    });

    it('should use address as sender for type=1 (received) messages', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="They sent this" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].sender).toBe('+15551234567');
    });

    it('should handle unknown type values gracefully', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Draft?" date="1672531200000" type="3" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      // type=3 is not sent (type=2), so sender should be the address
      expect(result.messages[0].sender).toBe('+15551234567');
      expect(result.errors).toHaveLength(0);
    });
  });

  // ── Participant tracking ─────────────────────────────────────────────────

  describe('participant tracking', () => {
    it('should build participants from unique addresses', () => {
      const xml = `<smses count="4">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="John" />
  <sms address="+15551234567" body="Hey" date="1672531260000" type="2" contact_name="John" />
  <sms address="+15559876543" body="Hello" date="1672531320000" type="1" contact_name="Jane" />
  <sms address="+15559876543" body="Bye" date="1672531380000" type="1" contact_name="Jane" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants).toHaveLength(2);

      const john = result.participants.find((p) => p.displayName === 'John');
      expect(john).toBeDefined();
      expect(john!.messageCount).toBe(2); // both sent and received count

      const jane = result.participants.find((p) => p.displayName === 'Jane');
      expect(jane).toBeDefined();
      expect(jane!.messageCount).toBe(2);
    });

    it('should track first and last message dates per participant', () => {
      const xml = `<smses count="3">
  <sms address="+15551234567" body="First" date="1672531200000" type="1" contact_name="Alice" />
  <sms address="+15551234567" body="Middle" date="1672531260000" type="2" contact_name="Alice" />
  <sms address="+15551234567" body="Last" date="1672617600000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      const alice = result.participants.find((p) => p.displayName === 'Alice');
      expect(alice).toBeDefined();
      expect(alice!.messageCount).toBe(3);
      expect(alice!.firstMessageDate.getTime()).toBe(1672531200000);
      expect(alice!.lastMessageDate.getTime()).toBe(1672617600000);
    });

    it('should normalize phone numbers via identifier normalizer', () => {
      const xml = `<smses count="1">
  <sms address="(555) 123-4567" body="Hi" date="1672531200000" type="1" contact_name="Bob" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants).toHaveLength(1);
      // (555) 123-4567 → +15551234567 via normalizer
      expect(result.participants[0].identifier).toBe('+15551234567');
      expect(result.participants[0].identifierType).toBe('phone');
    });

    it('should use contact_name as displayName', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="John Doe" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants[0].displayName).toBe('John Doe');
    });

    it('should omit displayName when contact_name is "(Unknown)"', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="(Unknown)" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants[0].displayName).toBeUndefined();
    });

    it('should omit displayName when contact_name is empty', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants[0].displayName).toBeUndefined();
    });
  });

  // ── XML entity decoding ──────────────────────────────────────────────────

  describe('XML entity decoding', () => {
    it('should decode XML entities in body text', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Tom &amp; Jerry &lt;3" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].content).toBe('Tom & Jerry <3');
    });

    it('should decode numeric character references', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hello &#33;" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].content).toBe('Hello !');
    });

    it('should decode hex character references', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Smile &#x263A;" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].content).toBe('Smile ☺');
    });

    it('should decode entities in contact_name', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="O&apos;Brien" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.participants[0].displayName).toBe("O'Brien");
    });
  });

  // ── Graceful degradation (Req 24.8) ──────────────────────────────────────

  describe('graceful degradation', () => {
    it('should handle empty input', () => {
      const result = parseGoogleMessagesXml('');

      expect(result.platform).toBe('google_messages');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle XML with no sms elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<smses count="0">
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.platform).toBe('google_messages');
      expect(result.participants).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip entries with missing address and continue', () => {
      const xml = `<smses count="2">
  <sms body="No address" date="1672531200000" type="1" contact_name="Unknown" />
  <sms address="+15551234567" body="Good one" date="1672531260000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Good one');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('address');
    });

    it('should skip entries with missing date and continue', () => {
      const xml = `<smses count="2">
  <sms address="+15551234567" body="No date" type="1" contact_name="Alice" />
  <sms address="+15551234567" body="Good one" date="1672531260000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('date');
    });

    it('should skip entries with invalid date value and continue', () => {
      const xml = `<smses count="2">
  <sms address="+15551234567" body="Bad date" date="not-a-number" type="1" contact_name="Alice" />
  <sms address="+15551234567" body="Good" date="1672531260000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('date');
    });

    it('should handle missing body attribute as empty string', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing type attribute gracefully', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="No type" date="1672531200000" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      // Missing type → NaN → not type=2, so sender is the address
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].sender).toBe('+15551234567');
    });

    it('should handle missing contact_name attribute', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.participants[0].displayName).toBeUndefined();
    });
  });

  // ── ParseResult structure (Req 24.7) ─────────────────────────────────────

  describe('ParseResult structure', () => {
    it('should always return platform as google_messages', () => {
      const result = parseGoogleMessagesXml('');
      expect(result.platform).toBe('google_messages');
    });

    it('should return all required fields', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include valid timestamps on all messages', () => {
      const xml = `<smses count="2">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="Alice" />
  <sms address="+15559876543" body="Hey" date="1672531260000" type="2" contact_name="Bob" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      for (const msg of result.messages) {
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(isNaN(msg.timestamp.getTime())).toBe(false);
      }
    });

    it('should include sender on all messages', () => {
      const xml = `<smses count="2">
  <sms address="+15551234567" body="Received" date="1672531200000" type="1" contact_name="Alice" />
  <sms address="+15551234567" body="Sent" date="1672531260000" type="2" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      for (const msg of result.messages) {
        expect(typeof msg.sender).toBe('string');
        expect(msg.sender.length).toBeGreaterThan(0);
      }
    });

    it('should mark all SMS messages as non-system messages', () => {
      const xml = `<smses count="2">
  <sms address="+15551234567" body="Hi" date="1672531200000" type="1" contact_name="Alice" />
  <sms address="+15551234567" body="Hey" date="1672531260000" type="2" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      for (const msg of result.messages) {
        expect(msg.isSystemMessage).toBe(false);
      }
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle single-quoted attributes', () => {
      const xml = `<smses count='1'>
  <sms address='+15551234567' body='Hello' date='1672531200000' type='1' contact_name='Alice' />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello');
    });

    it('should handle body with quotes inside', () => {
      const xml = `<smses count="1">
  <sms address="+15551234567" body="She said &quot;hello&quot;" date="1672531200000" type="1" contact_name="Alice" />
</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages[0].content).toBe('She said "hello"');
    });

    it('should handle large number of messages', () => {
      const entries = Array.from({ length: 100 }, (_, i) =>
        `  <sms address="+15551234567" body="Message ${i}" date="${1672531200000 + i * 1000}" type="${i % 2 === 0 ? 1 : 2}" contact_name="Alice" />`
      ).join('\n');
      const xml = `<smses count="100">\n${entries}\n</smses>`;

      const result = parseGoogleMessagesXml(xml);

      expect(result.messages).toHaveLength(100);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].messageCount).toBe(100);
    });
  });
});
