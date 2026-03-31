/**
 * Tests for parser infrastructure — detectPlatform function
 *
 * Validates: Requirements 5.5
 */

import { describe, it, expect } from 'vitest';
import { detectPlatform } from './parser';

describe('detectPlatform', () => {
  // ── WhatsApp (.txt with date/time patterns) ──────────────────────────────

  describe('WhatsApp detection', () => {
    it('should detect WhatsApp from bracket date format (US)', () => {
      const header = Buffer.from(
        '[1/2/23, 10:00:00 AM] John: Hello\n[1/2/23, 10:01:00 AM] Jane: Hi',
      );
      expect(detectPlatform('chat.txt', header)).toBe('whatsapp');
    });

    it('should detect WhatsApp from bracket date format (EU dots)', () => {
      const header = Buffer.from(
        '[01.02.23, 10:00:00] John: Hello\n[01.02.23, 10:01:00] Jane: Hi',
      );
      expect(detectPlatform('chat.txt', header)).toBe('whatsapp');
    });

    it('should detect WhatsApp from dash-separated format', () => {
      const header = Buffer.from(
        '1/2/23, 10:00 AM - John: Hello\n1/2/23, 10:01 AM - Jane: Hi',
      );
      expect(detectPlatform('chat.txt', header)).toBe('whatsapp');
    });

    it('should detect WhatsApp with DD/MM/YYYY format', () => {
      const header = Buffer.from(
        '[02/01/2023, 10:00:00] John: Hello',
      );
      expect(detectPlatform('export.txt', header)).toBe('whatsapp');
    });

    it('should return null for .txt without WhatsApp patterns', () => {
      const header = Buffer.from('Just a plain text file\nwith some lines');
      expect(detectPlatform('notes.txt', header)).toBeNull();
    });
  });

  // ── Instagram (.json with participants + messages, no title/thread_path) ─

  describe('Instagram detection', () => {
    it('should detect Instagram JSON', () => {
      const header = Buffer.from(
        JSON.stringify({
          participants: [{ name: 'user1' }],
          messages: [{ sender_name: 'user1', content: 'hi' }],
        }),
      );
      expect(detectPlatform('messages.json', header)).toBe('instagram');
    });
  });

  // ── Facebook (.json with participants + messages + title + thread_path) ──

  describe('Facebook detection', () => {
    it('should detect Facebook JSON with title and thread_path', () => {
      const header = Buffer.from(
        JSON.stringify({
          participants: [{ name: 'user1' }],
          messages: [{ sender_name: 'user1', content: 'hi' }],
          title: 'Chat with user1',
          thread_path: 'inbox/user1_abc123',
          is_still_participant: true,
        }),
      );
      expect(detectPlatform('message_1.json', header)).toBe('facebook');
    });

    it('should detect Facebook JSON with is_still_participant', () => {
      const header = Buffer.from(
        JSON.stringify({
          participants: [{ name: 'user1' }],
          messages: [],
          title: 'Group Chat',
          is_still_participant: true,
        }),
      );
      expect(detectPlatform('message.json', header)).toBe('facebook');
    });
  });

  // ── Twitter (.json with dmConversation) ──────────────────────────────────

  describe('Twitter detection', () => {
    it('should detect Twitter JSON with dmConversation', () => {
      const header = Buffer.from(
        JSON.stringify([
          { dmConversation: { conversationId: '123', messages: [] } },
        ]),
      );
      expect(detectPlatform('direct-messages.json', header)).toBe('twitter');
    });
  });

  // ── Google Messages/SMS (.xml with <smses> root) ─────────────────────────

  describe('Google Messages/SMS detection', () => {
    it('should detect SMS Backup XML', () => {
      const header = Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n<smses count="42">',
      );
      expect(detectPlatform('sms-backup.xml', header)).toBe('google_messages');
    });

    it('should return null for non-SMS XML', () => {
      const header = Buffer.from(
        '<?xml version="1.0"?>\n<root><item>data</item></root>',
      );
      expect(detectPlatform('data.xml', header)).toBeNull();
    });
  });

  // ── iMessage (.csv with date/sender/text headers) ────────────────────────

  describe('iMessage detection', () => {
    it('should detect iMessage CSV with typical headers', () => {
      const header = Buffer.from(
        '"Type","Date","Sender","Text"\n"Message","2023-01-01","John","Hello"',
      );
      expect(detectPlatform('imessage-export.csv', header)).toBe('imessage');
    });

    it('should detect iMessage CSV with From/Body/Time headers', () => {
      const header = Buffer.from(
        'From,Time,Body\njohn,2023-01-01 10:00,Hello',
      );
      expect(detectPlatform('chat.csv', header)).toBe('imessage');
    });

    it('should return null for CSV without message-like headers', () => {
      const header = Buffer.from('Name,Age,City\nJohn,30,NYC');
      expect(detectPlatform('contacts.csv', header)).toBeNull();
    });
  });

  // ── Unknown extensions ───────────────────────────────────────────────────

  describe('unknown formats', () => {
    it('should return null for unsupported extensions', () => {
      expect(detectPlatform('file.pdf', Buffer.from('PDF content'))).toBeNull();
      expect(detectPlatform('file.docx', Buffer.from('docx'))).toBeNull();
      expect(detectPlatform('file', Buffer.from('no extension'))).toBeNull();
    });
  });
});
