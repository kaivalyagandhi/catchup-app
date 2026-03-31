/**
 * Apple Contacts Service
 *
 * Provides vCard parsing (3.0 & 4.0), printing (4.0), import, and export
 * for Apple Contacts integration.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import type { Pool, PoolClient } from 'pg';
import type { Contact } from '../types';
import type { ParseError } from '../chat-import/parser';
import { normalizePhone, normalizeEmail, normalizeUsername } from '../chat-import/identifier-normalizer';
import { findBestMatch, classifyTier, type ContactRow } from '../chat-import/matching';
import { addSourceToContact } from './source-tracking';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VCardContact {
  fullName: string;
  firstName?: string;
  lastName?: string;
  phones: Array<{ type: string; value: string }>;
  emails: Array<{ type: string; value: string }>;
  organization?: string;
  address?: string;
  socialProfiles: Array<{ type: string; value: string }>;
  notes?: string;
}

export interface ImportResult {
  imported: number;
  merged: number;
  created: number;
  errors: ParseError[];
}

export interface AppleContactsService {
  parseVCard(fileContent: string): Promise<{ contacts: VCardContact[]; errors: ParseError[] }>;
  printVCard(contacts: Contact[]): string;
  importVCard(userId: string, fileContent: string): Promise<ImportResult>;
  exportToVCard(userId: string, contactIds?: string[]): Promise<string>;
}

// ─── vCard Parsing ───────────────────────────────────────────────────────────

/**
 * Unfold vCard lines: continuation lines start with a space or tab (RFC 6350 §3.2).
 */
export function unfoldLines(raw: string): string[] {
  // Normalize line endings to \n
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Unfold: a line starting with space/tab is a continuation of the previous line
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n');
}

/**
 * Decode quoted-printable encoded string.
 * Handles multi-byte UTF-8 sequences (e.g., =C3=BC → ü).
 */
export function decodeQuotedPrintable(value: string): string {
  // Remove soft line breaks first
  const cleaned = value.replace(/=\r?\n/g, '');

  // Collect all bytes, then decode as UTF-8
  const bytes: number[] = [];
  let i = 0;
  while (i < cleaned.length) {
    if (cleaned[i] === '=' && i + 2 < cleaned.length && /[0-9A-Fa-f]{2}/.test(cleaned.slice(i + 1, i + 3))) {
      bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(cleaned.charCodeAt(i));
      i++;
    }
  }

  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Extract the property name from a vCard line (before the first : or ;).
 */
function extractPropertyName(line: string): string {
  // Property name is everything before the first : or ;
  const colonIdx = line.indexOf(':');
  const semiIdx = line.indexOf(';');

  let endIdx: number;
  if (colonIdx === -1 && semiIdx === -1) return line.toUpperCase();
  if (colonIdx === -1) endIdx = semiIdx;
  else if (semiIdx === -1) endIdx = colonIdx;
  else endIdx = Math.min(colonIdx, semiIdx);

  return line.slice(0, endIdx).toUpperCase();
}

/**
 * Extract the value after the first colon in a vCard line.
 */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return '';
  return line.slice(colonIdx + 1);
}

/**
 * Extract TYPE parameter from a vCard property line.
 * Handles both vCard 3.0 (TYPE=WORK) and 4.0 (TYPE=work) styles,
 * as well as shorthand (e.g., TEL;WORK:...).
 */
function extractType(line: string): string {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return 'other';

  const params = line.slice(0, colonIdx);
  // Look for TYPE= parameter
  const typeMatch = params.match(/TYPE=([^;,:\s]+)/i);
  if (typeMatch) return typeMatch[1].toLowerCase();

  // Shorthand types (e.g., TEL;WORK;VOICE:...)
  const parts = params.split(';');
  const knownTypes = ['home', 'work', 'cell', 'mobile', 'fax', 'pager', 'voice', 'pref', 'internet'];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase().trim();
    if (knownTypes.includes(part)) return part;
  }

  return 'other';
}

/**
 * Extract social profile type and value from X-SOCIALPROFILE or IMPP lines.
 */
function extractSocialProfile(line: string): { type: string; value: string } | null {
  const value = extractValue(line);
  if (!value) return null;

  const colonIdx = line.indexOf(':');
  const params = colonIdx > 0 ? line.slice(0, colonIdx).toLowerCase() : '';

  // Try to detect the platform from TYPE or x-service-type parameter
  let type = 'other';
  const typeMatch = params.match(/(?:type|x-service-type)=([^;,:\s]+)/i);
  if (typeMatch) {
    type = typeMatch[1].toLowerCase();
  } else if (value.includes('twitter.com') || value.includes('x.com')) {
    type = 'twitter';
  } else if (value.includes('instagram.com')) {
    type = 'instagram';
  } else if (value.includes('linkedin.com')) {
    type = 'linkedin';
  } else if (value.includes('facebook.com')) {
    type = 'facebook';
  }

  // For IMPP, strip the protocol prefix (e.g., "xmpp:", "x-apple:")
  let cleanValue = value;
  if (line.toUpperCase().startsWith('IMPP')) {
    const protoIdx = value.indexOf(':');
    if (protoIdx !== -1) {
      cleanValue = value.slice(protoIdx + 1);
    }
  }

  return { type, value: cleanValue.trim() };
}

/**
 * Parse a single vCard block (between BEGIN:VCARD and END:VCARD) into a VCardContact.
 */
export function parseSingleVCard(lines: string[]): VCardContact | null {
  const contact: VCardContact = {
    fullName: '',
    phones: [],
    emails: [],
    socialProfiles: [],
  };

  let isQuotedPrintable = false;

  for (const line of lines) {
    const propName = extractPropertyName(line);
    isQuotedPrintable = /ENCODING=QUOTED-PRINTABLE/i.test(line);

    let value = extractValue(line);
    if (isQuotedPrintable) {
      value = decodeQuotedPrintable(value);
    }

    switch (propName) {
      case 'FN':
        contact.fullName = value.trim();
        break;

      case 'N': {
        // N:LastName;FirstName;MiddleName;Prefix;Suffix
        const parts = value.split(';');
        contact.lastName = parts[0]?.trim() || undefined;
        contact.firstName = parts[1]?.trim() || undefined;
        // If no FN was set, construct from N
        if (!contact.fullName && (contact.firstName || contact.lastName)) {
          contact.fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
        }
        break;
      }

      case 'TEL': {
        const type = extractType(line);
        if (value.trim()) {
          contact.phones.push({ type, value: value.trim() });
        }
        break;
      }

      case 'EMAIL': {
        const type = extractType(line);
        if (value.trim()) {
          contact.emails.push({ type, value: value.trim() });
        }
        break;
      }

      case 'ORG':
        // ORG can have multiple components separated by ;
        contact.organization = value.split(';')[0]?.trim() || undefined;
        break;

      case 'ADR': {
        // ADR:;;Street;City;State;Zip;Country
        const adrParts = value.split(';').map((p) => p.trim()).filter(Boolean);
        if (adrParts.length > 0) {
          contact.address = adrParts.join(', ');
        }
        break;
      }

      case 'X-SOCIALPROFILE':
      case 'IMPP': {
        const profile = extractSocialProfile(line);
        if (profile) {
          contact.socialProfiles.push(profile);
        }
        break;
      }

      case 'NOTE':
        contact.notes = value.trim() || undefined;
        break;

      default:
        // Skip VERSION, PRODID, UID, REV, PHOTO, etc.
        break;
    }
  }

  // A valid vCard must have at least a name
  if (!contact.fullName) return null;

  return contact;
}

/**
 * Parse a vCard file containing one or more vCard entries.
 * Supports vCard 3.0 and 4.0 formats.
 * Skips malformed entries gracefully, logging errors.
 *
 * Requirements: 14.1, 14.2, 14.3
 */
export async function parseVCard(
  fileContent: string,
): Promise<{ contacts: VCardContact[]; errors: ParseError[] }> {
  const contacts: VCardContact[] = [];
  const errors: ParseError[] = [];

  const allLines = unfoldLines(fileContent);

  let currentBlock: string[] = [];
  let inCard = false;
  let entryIndex = 0;
  let blockStartLine = 0;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();

    if (line.toUpperCase() === 'BEGIN:VCARD') {
      inCard = true;
      currentBlock = [];
      blockStartLine = i + 1;
      entryIndex++;
      continue;
    }

    if (line.toUpperCase() === 'END:VCARD') {
      if (inCard) {
        try {
          const parsed = parseSingleVCard(currentBlock);
          if (parsed) {
            contacts.push(parsed);
          } else {
            errors.push({
              entry: entryIndex,
              line: blockStartLine,
              message: 'vCard entry has no valid name (FN or N field missing)',
            });
          }
        } catch (err) {
          errors.push({
            entry: entryIndex,
            line: blockStartLine,
            message: `Failed to parse vCard entry: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
      inCard = false;
      currentBlock = [];
      continue;
    }

    if (inCard && line) {
      currentBlock.push(allLines[i]); // Use original (not trimmed) for value extraction
    }
  }

  // If we ended while still inside a card, that's malformed
  if (inCard && currentBlock.length > 0) {
    errors.push({
      entry: entryIndex,
      line: blockStartLine,
      message: 'vCard entry missing END:VCARD delimiter',
    });
  }

  return { contacts, errors };
}

// ─── vCard Printing ──────────────────────────────────────────────────────────

/**
 * Escape special characters in vCard values per RFC 6350.
 */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Serialize a single Contact to vCard 4.0 format lines.
 */
function contactToVCardLines(contact: Contact): string[] {
  const lines: string[] = [];

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:4.0');

  // FN (required)
  lines.push(`FN:${escapeVCardValue(contact.name)}`);

  // N (structured name — best effort split)
  const nameParts = contact.name.split(/\s+/);
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : contact.name;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`);

  // TEL
  if (contact.phone) {
    lines.push(`TEL;TYPE=cell:${contact.phone}`);
  }

  // EMAIL
  if (contact.email) {
    lines.push(`EMAIL;TYPE=home:${contact.email}`);
  }

  // ORG
  if (contact.location) {
    // We don't have a dedicated org field on Contact, but we can use location context
    // Actually, location is location — skip ORG unless we have it
  }

  // Social profiles
  if (contact.instagram) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${contact.instagram}`);
  }
  if (contact.xHandle) {
    lines.push(`X-SOCIALPROFILE;TYPE=twitter:${contact.xHandle}`);
  }
  if (contact.linkedIn) {
    lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${contact.linkedIn}`);
  }
  if (contact.otherSocialMedia) {
    for (const [platform, handle] of Object.entries(contact.otherSocialMedia)) {
      if (handle) {
        lines.push(`X-SOCIALPROFILE;TYPE=${escapeVCardValue(platform)}:${handle}`);
      }
    }
  }

  // ADR (from location)
  if (contact.location) {
    lines.push(`ADR:;;${escapeVCardValue(contact.location)};;;;`);
  }

  // NOTE
  if (contact.customNotes) {
    lines.push(`NOTE:${escapeVCardValue(contact.customNotes)}`);
  }

  lines.push('END:VCARD');

  return lines;
}

/**
 * Serialize an array of Contact records to a valid vCard 4.0 string.
 *
 * Requirements: 14.5, 14.6
 */
export function printVCard(contacts: Contact[]): string {
  const allLines: string[] = [];

  for (const contact of contacts) {
    allLines.push(...contactToVCardLines(contact));
  }

  return allLines.join('\r\n') + '\r\n';
}

// ─── Import Logic ────────────────────────────────────────────────────────────

/**
 * Import contacts from a vCard file. Matches against existing contacts
 * using the same matching logic as Req 7 (phone, email, name fuzzy match).
 * Merges data for matches, creates new contacts for unmatched.
 * Adds 'apple' to sources array.
 *
 * Requirements: 14.4, 14.5
 */
export async function importVCard(
  pool: Pool,
  userId: string,
  fileContent: string,
): Promise<ImportResult> {
  const { contacts: vcardContacts, errors } = await parseVCard(fileContent);

  if (vcardContacts.length === 0) {
    return { imported: 0, merged: 0, created: 0, errors };
  }

  // Fetch existing contacts for matching
  const { rows: existingRows } = await pool.query(
    `SELECT id, name, phone, email, instagram, x_handle, linked_in
     FROM contacts
     WHERE user_id = $1 AND archived_at IS NULL`,
    [userId],
  );
  const existingContacts: ContactRow[] = existingRows;

  let merged = 0;
  let created = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const vc of vcardContacts) {
      const matchResult = matchVCardToContacts(vc, existingContacts);

      if (matchResult.contactId && classifyTier(matchResult.confidence) !== 'unmatched') {
        // Merge into existing contact
        await mergeVCardIntoContact(client, matchResult.contactId, vc);
        await addSourceToContact(client, matchResult.contactId, 'apple');
        merged++;
      } else {
        // Create new contact
        const newId = await createContactFromVCard(client, userId, vc);
        // Add to existing contacts list so subsequent vCards can match
        existingContacts.push({
          id: newId,
          name: vc.fullName,
          phone: vc.phones[0]?.value || null,
          email: vc.emails[0]?.value || null,
          instagram: null,
          x_handle: null,
          linked_in: null,
        });
        created++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  return {
    imported: merged + created,
    merged,
    created,
    errors,
  };
}

/**
 * Match a VCardContact against existing contacts using the same logic as Req 7.
 */
function matchVCardToContacts(
  vc: VCardContact,
  contacts: ContactRow[],
): { contactId: string | null; confidence: number } {
  // Build a pseudo-participant for each identifier the vCard has
  let bestConfidence = 0;
  let bestContactId: string | null = null;

  // Try phone match first (highest confidence)
  for (const phone of vc.phones) {
    const participant = {
      identifier: phone.value,
      identifierType: 'phone' as const,
      displayName: vc.fullName,
      messageCount: 0,
      firstMessageDate: new Date(),
      lastMessageDate: new Date(),
    };
    const match = findBestMatch(participant, contacts);
    if (match.confidence > bestConfidence) {
      bestConfidence = match.confidence;
      bestContactId = match.contactId;
    }
  }

  // Try email match
  for (const email of vc.emails) {
    const participant = {
      identifier: email.value,
      identifierType: 'email' as const,
      displayName: vc.fullName,
      messageCount: 0,
      firstMessageDate: new Date(),
      lastMessageDate: new Date(),
    };
    const match = findBestMatch(participant, contacts);
    if (match.confidence > bestConfidence) {
      bestConfidence = match.confidence;
      bestContactId = match.contactId;
    }
  }

  // Try name match
  if (vc.fullName) {
    const participant = {
      identifier: vc.fullName,
      identifierType: 'display_name' as const,
      displayName: vc.fullName,
      messageCount: 0,
      firstMessageDate: new Date(),
      lastMessageDate: new Date(),
    };
    const match = findBestMatch(participant, contacts);
    if (match.confidence > bestConfidence) {
      bestConfidence = match.confidence;
      bestContactId = match.contactId;
    }
  }

  return { contactId: bestContactId, confidence: bestConfidence };
}

/**
 * Merge vCard data into an existing contact — fills in missing fields only.
 */
async function mergeVCardIntoContact(
  client: PoolClient,
  contactId: string,
  vc: VCardContact,
): Promise<void> {
  // Fetch current contact data
  const { rows } = await client.query(
    `SELECT phone, email, custom_notes, location, instagram, x_handle, linked_in
     FROM contacts WHERE id = $1`,
    [contactId],
  );
  if (rows.length === 0) return;

  const current = rows[0];
  const updates: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  // Fill phone if missing
  if (!current.phone && vc.phones.length > 0) {
    updates.push(`phone = $${paramIdx++}`);
    values.push(vc.phones[0].value);
  }

  // Fill email if missing
  if (!current.email && vc.emails.length > 0) {
    updates.push(`email = $${paramIdx++}`);
    values.push(vc.emails[0].value);
  }

  // Fill notes if missing
  if (!current.custom_notes && vc.notes) {
    updates.push(`custom_notes = $${paramIdx++}`);
    values.push(vc.notes);
  }

  // Fill location from address if missing
  if (!current.location && vc.address) {
    updates.push(`location = $${paramIdx++}`);
    values.push(vc.address);
  }

  // Fill social profiles if missing
  for (const profile of vc.socialProfiles) {
    if (profile.type === 'instagram' && !current.instagram) {
      updates.push(`instagram = $${paramIdx++}`);
      values.push(profile.value);
    } else if ((profile.type === 'twitter' || profile.type === 'x') && !current.x_handle) {
      updates.push(`x_handle = $${paramIdx++}`);
      values.push(profile.value);
    } else if (profile.type === 'linkedin' && !current.linked_in) {
      updates.push(`linked_in = $${paramIdx++}`);
      values.push(profile.value);
    }
  }

  if (updates.length > 0) {
    values.push(contactId);
    await client.query(
      `UPDATE contacts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx}`,
      values,
    );
  }
}

/**
 * Create a new contact from a VCardContact.
 */
async function createContactFromVCard(
  client: PoolClient,
  userId: string,
  vc: VCardContact,
): Promise<string> {
  // Extract social handles
  let instagram: string | null = null;
  let xHandle: string | null = null;
  let linkedIn: string | null = null;

  for (const profile of vc.socialProfiles) {
    if (profile.type === 'instagram' && !instagram) instagram = profile.value;
    else if ((profile.type === 'twitter' || profile.type === 'x') && !xHandle) xHandle = profile.value;
    else if (profile.type === 'linkedin' && !linkedIn) linkedIn = profile.value;
  }

  const { rows } = await client.query(
    `INSERT INTO contacts (
      user_id, name, phone, email, instagram, x_handle, linked_in,
      location, custom_notes, source, sources
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual', ARRAY['apple'])
    RETURNING id`,
    [
      userId,
      vc.fullName,
      vc.phones[0]?.value || null,
      vc.emails[0]?.value || null,
      instagram,
      xHandle,
      linkedIn,
      vc.address || null,
      vc.notes || null,
    ],
  );

  return rows[0].id;
}

// ─── Export Logic ────────────────────────────────────────────────────────────

/**
 * Export contacts to vCard 4.0 format.
 * If contactIds is provided, exports only those contacts; otherwise exports all.
 *
 * Requirements: 14.5
 */
export async function exportToVCard(
  pool: Pool,
  userId: string,
  contactIds?: string[],
): Promise<string> {
  let query: string;
  let params: any[];

  if (contactIds && contactIds.length > 0) {
    query = `SELECT * FROM contacts WHERE user_id = $1 AND id = ANY($2) AND archived_at IS NULL`;
    params = [userId, contactIds];
  } else {
    query = `SELECT * FROM contacts WHERE user_id = $1 AND archived_at IS NULL ORDER BY name`;
    params = [userId];
  }

  const { rows } = await pool.query(query, params);

  // Map rows to Contact objects
  const contacts: Contact[] = rows.map(mapRowToContact);

  return printVCard(contacts);
}

/**
 * Map a database row to a Contact object (minimal mapping for export).
 */
function mapRowToContact(row: any): Contact {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    linkedIn: row.linked_in || undefined,
    instagram: row.instagram || undefined,
    xHandle: row.x_handle || undefined,
    otherSocialMedia: row.other_social_media ? JSON.parse(row.other_social_media) : undefined,
    location: row.location || undefined,
    timezone: row.timezone || undefined,
    customNotes: row.custom_notes || undefined,
    lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
    frequencyPreference: row.frequency_preference || undefined,
    groups: row.groups || [],
    tags: row.tags || [],
    archived: !!row.archived_at,
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
    sources: row.sources || [],
    googleResourceName: row.google_resource_name || undefined,
    googleEtag: row.google_etag || undefined,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
    dunbarCircle: row.dunbar_circle || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ─── Service Factory ─────────────────────────────────────────────────────────

/**
 * Create an AppleContactsService instance backed by a PostgreSQL pool.
 */
export function createAppleContactsService(dbPool: Pool): AppleContactsService {
  return {
    parseVCard: (fileContent: string) => parseVCard(fileContent),
    printVCard: (contacts: Contact[]) => printVCard(contacts),
    importVCard: (userId: string, fileContent: string) => importVCard(dbPool, userId, fileContent),
    exportToVCard: (userId: string, contactIds?: string[]) => exportToVCard(dbPool, userId, contactIds),
  };
}
