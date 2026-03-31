/**
 * Apple Contacts Service Tests
 *
 * Tests for vCard parsing (3.0 & 4.0), printing (4.0), and round-trip.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.6
 */

import { describe, it, expect } from 'vitest';
import {
  parseVCard,
  printVCard,
  parseSingleVCard,
  unfoldLines,
  decodeQuotedPrintable,
  type VCardContact,
} from './apple-contacts-service';
import type { Contact } from '../types';
import { FrequencyOption } from '../types';

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    userId: 'u1',
    name: 'John Doe',
    groups: [],
    tags: [],
    archived: false,
    sources: ['manual'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── unfoldLines ─────────────────────────────────────────────────────────────

describe('unfoldLines', () => {
  it('should join continuation lines starting with space', () => {
    const input = 'FN:John\r\n Doe';
    const result = unfoldLines(input);
    // Per RFC 6350 §3.2, the folding whitespace (space) is consumed
    expect(result).toContain('FN:JohnDoe');
  });

  it('should join continuation lines starting with tab', () => {
    const input = 'FN:John\r\n\tDoe';
    const result = unfoldLines(input);
    expect(result).toContain('FN:JohnDoe');
  });

  it('should handle normal lines without folding', () => {
    const input = 'FN:John Doe\r\nTEL:+1234567890';
    const result = unfoldLines(input);
    expect(result).toEqual(['FN:John Doe', 'TEL:+1234567890']);
  });
});

// ─── decodeQuotedPrintable ───────────────────────────────────────────────────

describe('decodeQuotedPrintable', () => {
  it('should decode hex-encoded characters', () => {
    expect(decodeQuotedPrintable('M=C3=BCller')).toBe('Müller');
  });

  it('should remove soft line breaks', () => {
    expect(decodeQuotedPrintable('Hello=\r\nWorld')).toBe('HelloWorld');
  });

  it('should pass through plain text unchanged', () => {
    expect(decodeQuotedPrintable('Hello World')).toBe('Hello World');
  });
});

// ─── parseSingleVCard ────────────────────────────────────────────────────────

describe('parseSingleVCard', () => {
  it('should parse FN and N fields', () => {
    const lines = ['FN:John Doe', 'N:Doe;John;;;'];
    const result = parseSingleVCard(lines);
    expect(result).not.toBeNull();
    expect(result!.fullName).toBe('John Doe');
    expect(result!.firstName).toBe('John');
    expect(result!.lastName).toBe('Doe');
  });

  it('should construct fullName from N when FN is missing', () => {
    const lines = ['N:Smith;Jane;;;'];
    const result = parseSingleVCard(lines);
    expect(result).not.toBeNull();
    expect(result!.fullName).toBe('Jane Smith');
  });

  it('should parse TEL with type', () => {
    const lines = ['FN:Test', 'TEL;TYPE=cell:+15551234567'];
    const result = parseSingleVCard(lines);
    expect(result!.phones).toEqual([{ type: 'cell', value: '+15551234567' }]);
  });

  it('should parse EMAIL with type', () => {
    const lines = ['FN:Test', 'EMAIL;TYPE=work:test@example.com'];
    const result = parseSingleVCard(lines);
    expect(result!.emails).toEqual([{ type: 'work', value: 'test@example.com' }]);
  });

  it('should parse ORG', () => {
    const lines = ['FN:Test', 'ORG:Acme Corp;Engineering'];
    const result = parseSingleVCard(lines);
    expect(result!.organization).toBe('Acme Corp');
  });

  it('should parse ADR', () => {
    const lines = ['FN:Test', 'ADR:;;123 Main St;Springfield;IL;62701;US'];
    const result = parseSingleVCard(lines);
    expect(result!.address).toContain('123 Main St');
    expect(result!.address).toContain('Springfield');
  });

  it('should parse NOTE', () => {
    const lines = ['FN:Test', 'NOTE:Met at conference'];
    const result = parseSingleVCard(lines);
    expect(result!.notes).toBe('Met at conference');
  });

  it('should parse X-SOCIALPROFILE', () => {
    const lines = ['FN:Test', 'X-SOCIALPROFILE;TYPE=instagram:johndoe'];
    const result = parseSingleVCard(lines);
    expect(result!.socialProfiles).toEqual([{ type: 'instagram', value: 'johndoe' }]);
  });

  it('should parse IMPP', () => {
    const lines = ['FN:Test', 'IMPP;TYPE=twitter:x-apple:@johndoe'];
    const result = parseSingleVCard(lines);
    expect(result!.socialProfiles).toHaveLength(1);
    expect(result!.socialProfiles[0].type).toBe('twitter');
    expect(result!.socialProfiles[0].value).toBe('@johndoe');
  });

  it('should return null for entries without a name', () => {
    const lines = ['TEL:+1234567890'];
    const result = parseSingleVCard(lines);
    expect(result).toBeNull();
  });

  it('should parse TEL with shorthand type', () => {
    const lines = ['FN:Test', 'TEL;WORK;VOICE:+15551234567'];
    const result = parseSingleVCard(lines);
    expect(result!.phones[0].type).toBe('work');
  });
});

// ─── parseVCard (full file) ──────────────────────────────────────────────────

describe('parseVCard', () => {
  it('should parse a vCard 4.0 file with one entry', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:John Doe',
      'N:Doe;John;;;',
      'TEL;TYPE=cell:+15551234567',
      'EMAIL;TYPE=home:john@example.com',
      'END:VCARD',
    ].join('\r\n');

    const { contacts, errors } = await parseVCard(content);
    expect(errors).toHaveLength(0);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].fullName).toBe('John Doe');
    expect(contacts[0].phones).toHaveLength(1);
    expect(contacts[0].emails).toHaveLength(1);
  });

  it('should parse a vCard 3.0 file', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Jane Smith',
      'N:Smith;Jane;;;',
      'TEL;TYPE=WORK:+15559876543',
      'ORG:Acme Corp',
      'END:VCARD',
    ].join('\r\n');

    const { contacts, errors } = await parseVCard(content);
    expect(errors).toHaveLength(0);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].fullName).toBe('Jane Smith');
    expect(contacts[0].organization).toBe('Acme Corp');
  });

  it('should parse multiple vCard entries', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:Alice',
      'END:VCARD',
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:Bob',
      'END:VCARD',
    ].join('\r\n');

    const { contacts, errors } = await parseVCard(content);
    expect(errors).toHaveLength(0);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].fullName).toBe('Alice');
    expect(contacts[1].fullName).toBe('Bob');
  });

  it('should skip malformed entries and continue parsing (Req 14.3)', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'TEL:+1234567890', // No FN — malformed
      'END:VCARD',
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:Valid Contact',
      'END:VCARD',
    ].join('\r\n');

    const { contacts, errors } = await parseVCard(content);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].fullName).toBe('Valid Contact');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('no valid name');
  });

  it('should handle missing END:VCARD', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:Incomplete',
    ].join('\r\n');

    const { contacts, errors } = await parseVCard(content);
    expect(contacts).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('missing END:VCARD');
  });

  it('should handle empty file', async () => {
    const { contacts, errors } = await parseVCard('');
    expect(contacts).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('should handle line folding', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:John',
      'NOTE:This is a long note that ',
      ' continues on the next line',
      'END:VCARD',
    ].join('\r\n');

    const { contacts } = await parseVCard(content);
    expect(contacts).toHaveLength(1);
    // Per RFC 6350, the leading space on the continuation line is consumed,
    // so the trailing space on the previous line provides the word break
    expect(contacts[0].notes).toBe('This is a long note that continues on the next line');
  });

  it('should handle quoted-printable encoding in vCard 3.0', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN;ENCODING=QUOTED-PRINTABLE:M=C3=BCller',
      'END:VCARD',
    ].join('\r\n');

    const { contacts } = await parseVCard(content);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].fullName).toBe('Müller');
  });

  it('should parse multiple phones and emails', async () => {
    const content = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'FN:Multi Contact',
      'TEL;TYPE=cell:+15551111111',
      'TEL;TYPE=work:+15552222222',
      'EMAIL;TYPE=home:home@example.com',
      'EMAIL;TYPE=work:work@example.com',
      'END:VCARD',
    ].join('\r\n');

    const { contacts } = await parseVCard(content);
    expect(contacts[0].phones).toHaveLength(2);
    expect(contacts[0].emails).toHaveLength(2);
  });
});

// ─── printVCard ──────────────────────────────────────────────────────────────

describe('printVCard', () => {
  it('should produce valid vCard 4.0 output', () => {
    const contact = makeContact({
      name: 'John Doe',
      phone: '+15551234567',
      email: 'john@example.com',
    });

    const output = printVCard([contact]);
    expect(output).toContain('BEGIN:VCARD');
    expect(output).toContain('VERSION:4.0');
    expect(output).toContain('FN:John Doe');
    expect(output).toContain('TEL;TYPE=cell:+15551234567');
    expect(output).toContain('EMAIL;TYPE=home:john@example.com');
    expect(output).toContain('END:VCARD');
  });

  it('should include N field with structured name', () => {
    const contact = makeContact({ name: 'John Doe' });
    const output = printVCard([contact]);
    expect(output).toContain('N:Doe;John;;;');
  });

  it('should include social profiles', () => {
    const contact = makeContact({
      name: 'Social User',
      instagram: 'instauser',
      xHandle: 'twitteruser',
      linkedIn: 'linkedinuser',
    });

    const output = printVCard([contact]);
    expect(output).toContain('X-SOCIALPROFILE;TYPE=instagram:instauser');
    expect(output).toContain('X-SOCIALPROFILE;TYPE=twitter:twitteruser');
    expect(output).toContain('X-SOCIALPROFILE;TYPE=linkedin:linkedinuser');
  });

  it('should include ADR from location', () => {
    const contact = makeContact({ name: 'Located', location: 'San Francisco, CA' });
    const output = printVCard([contact]);
    expect(output).toContain('ADR:;;San Francisco\\, CA;;;;');
  });

  it('should include NOTE from customNotes', () => {
    const contact = makeContact({ name: 'Noted', customNotes: 'Met at conference' });
    const output = printVCard([contact]);
    expect(output).toContain('NOTE:Met at conference');
  });

  it('should serialize multiple contacts', () => {
    const contacts = [
      makeContact({ name: 'Alice' }),
      makeContact({ name: 'Bob' }),
    ];

    const output = printVCard(contacts);
    const beginCount = (output.match(/BEGIN:VCARD/g) || []).length;
    const endCount = (output.match(/END:VCARD/g) || []).length;
    expect(beginCount).toBe(2);
    expect(endCount).toBe(2);
  });

  it('should handle contact with minimal fields', () => {
    const contact = makeContact({ name: 'Minimal' });
    const output = printVCard([contact]);
    expect(output).toContain('BEGIN:VCARD');
    expect(output).toContain('FN:Minimal');
    expect(output).toContain('END:VCARD');
    // Should not contain TEL or EMAIL lines
    expect(output).not.toContain('TEL');
    expect(output).not.toContain('EMAIL');
  });
});

// ─── Round-trip ──────────────────────────────────────────────────────────────

describe('vCard round-trip', () => {
  it('should preserve name through print → parse', async () => {
    const contact = makeContact({ name: 'John Doe' });
    const vcardStr = printVCard([contact]);
    const { contacts } = await parseVCard(vcardStr);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].fullName).toBe('John Doe');
  });

  it('should preserve phone through print → parse', async () => {
    const contact = makeContact({ name: 'Phone Test', phone: '+15551234567' });
    const vcardStr = printVCard([contact]);
    const { contacts } = await parseVCard(vcardStr);
    expect(contacts[0].phones).toHaveLength(1);
    expect(contacts[0].phones[0].value).toBe('+15551234567');
  });

  it('should preserve email through print → parse', async () => {
    const contact = makeContact({ name: 'Email Test', email: 'test@example.com' });
    const vcardStr = printVCard([contact]);
    const { contacts } = await parseVCard(vcardStr);
    expect(contacts[0].emails).toHaveLength(1);
    expect(contacts[0].emails[0].value).toBe('test@example.com');
  });

  it('should preserve notes through print → parse', async () => {
    const contact = makeContact({ name: 'Notes Test', customNotes: 'Important note' });
    const vcardStr = printVCard([contact]);
    const { contacts } = await parseVCard(vcardStr);
    expect(contacts[0].notes).toBe('Important note');
  });

  it('should preserve social profiles through print → parse', async () => {
    const contact = makeContact({
      name: 'Social Test',
      instagram: 'instauser',
      xHandle: 'twitteruser',
    });
    const vcardStr = printVCard([contact]);
    const { contacts } = await parseVCard(vcardStr);
    const types = contacts[0].socialProfiles.map((p) => p.type);
    expect(types).toContain('instagram');
    expect(types).toContain('twitter');
  });

  it('should preserve multiple contacts through print → parse', async () => {
    const contacts = [
      makeContact({ name: 'Alice', phone: '+15551111111' }),
      makeContact({ name: 'Bob', email: 'bob@example.com' }),
    ];
    const vcardStr = printVCard(contacts);
    const { contacts: parsed } = await parseVCard(vcardStr);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].fullName).toBe('Alice');
    expect(parsed[1].fullName).toBe('Bob');
  });
});
