/**
 * iMessage Chat Export Parser
 *
 * Parses CSV exports from tools like iMazing with columns for
 * date, sender, message text, and attachment indicators.
 *
 * Supports two common CSV formats:
 *
 * Format A (iMazing-style, quoted):
 *   "Type","Date","Sender","Text"
 *   "Message","2023-01-01 10:00:00","John","Hello there"
 *   "Attachment","2023-01-01 10:02:00","John","image.jpg"
 *
 * Format B (simple, unquoted):
 *   From,Time,Body
 *   john,2023-01-01 10:00,Hello
 *   jane,2023-01-01 10:01,Hi!
 *
 * The parser auto-detects column mapping from headers.
 *
 * Requirements: 24.3, 24.7, 24.8
 */

import {
  ChatParser,
  ChatPlatform,
  ParseResult,
  Participant,
  ParsedMessage,
  ParseError,
} from './parser';
import { normalizeIdentifier } from './identifier-normalizer';

// ─── Column mapping ──────────────────────────────────────────────────────────

interface ColumnMapping {
  sender: number;
  date: number;
  text: number;
  type: number | null; // optional "Type" column (iMazing format)
}

/** Header aliases grouped by semantic role */
const SENDER_ALIASES = ['sender', 'from', 'author', 'name', 'contact'];
const DATE_ALIASES = ['date', 'time', 'timestamp', 'datetime', 'sent'];
const TEXT_ALIASES = ['text', 'body', 'message', 'content', 'msg'];
const TYPE_ALIASES = ['type', 'kind', 'msgtype'];

// ─── iMessage Parser ─────────────────────────────────────────────────────────

export class IMessageParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseIMessageCsv(text);
  }
}

/**
 * Parse iMessage CSV export content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseIMessageCsv(text: string): ParseResult {
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  if (!text.trim()) {
    return { platform: 'imessage', participants: [], messages: [], errors: [] };
  }

  const lines = splitCsvLines(text);

  if (lines.length === 0) {
    return { platform: 'imessage', participants: [], messages: [], errors: [] };
  }

  // ── Detect column mapping from header row ────────────────────────────────
  const headerRow = parseCsvRow(lines[0]);
  const mapping = detectColumnMapping(headerRow);

  if (!mapping) {
    return {
      platform: 'imessage',
      participants: [],
      messages: [],
      errors: [
        {
          line: 1,
          message: `Unable to detect column mapping from headers: ${headerRow.join(', ')}`,
          raw: lines[0],
        },
      ],
    };
  }

  // ── Process data rows ────────────────────────────────────────────────────
  const participantMap = new Map<
    string,
    { displayName: string; messageCount: number; firstDate: Date; lastDate: Date }
  >();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCsvRow(line);
    const lineNum = i + 1; // 1-based line number

    // Validate we have enough columns
    const maxRequired = Math.max(mapping.sender, mapping.date, mapping.text);
    if (fields.length <= maxRequired) {
      errors.push({
        line: lineNum,
        message: `Row has ${fields.length} columns, expected at least ${maxRequired + 1}`,
        raw: line.slice(0, 200),
      });
      continue;
    }

    const senderRaw = fields[mapping.sender].trim();
    const dateRaw = fields[mapping.date].trim();
    const textRaw = fields[mapping.text];
    const typeRaw = mapping.type !== null ? fields[mapping.type]?.trim().toLowerCase() : null;

    // Validate sender
    if (!senderRaw) {
      errors.push({
        line: lineNum,
        message: 'Missing sender value',
        raw: line.slice(0, 200),
      });
      continue;
    }

    // Parse date
    const timestamp = parseDate(dateRaw);
    if (!timestamp || isNaN(timestamp.getTime())) {
      errors.push({
        line: lineNum,
        message: `Invalid date: "${dateRaw}"`,
        raw: line.slice(0, 200),
      });
      continue;
    }

    // Determine if this is an attachment/system row
    const isAttachment = typeRaw === 'attachment';
    const isSystemMessage = isAttachment;

    const content = textRaw ?? '';

    messages.push({
      sender: isSystemMessage ? '__system__' : senderRaw,
      content: isAttachment ? `[Attachment: ${content}]` : content,
      timestamp,
      isSystemMessage,
    });

    // Track participant stats (skip system messages)
    if (!isSystemMessage) {
      const normalized = normalizeIdentifier(senderRaw);
      const key = normalized.identifier;

      const existing = participantMap.get(key);
      if (existing) {
        existing.messageCount++;
        if (timestamp < existing.firstDate) existing.firstDate = new Date(timestamp);
        if (timestamp > existing.lastDate) existing.lastDate = new Date(timestamp);
        // Keep the longer display name
        if (senderRaw.length > existing.displayName.length) {
          existing.displayName = senderRaw;
        }
      } else {
        participantMap.set(key, {
          displayName: senderRaw,
          messageCount: 1,
          firstDate: new Date(timestamp),
          lastDate: new Date(timestamp),
        });
      }
    }
  }

  // ── Build participants array ─────────────────────────────────────────────
  const participants: Participant[] = [];
  for (const [identifier, stats] of participantMap) {
    const normalized = normalizeIdentifier(identifier);
    participants.push({
      identifier: normalized.identifier,
      identifierType: normalized.identifierType,
      displayName: stats.displayName,
      messageCount: stats.messageCount,
      firstMessageDate: stats.firstDate,
      lastMessageDate: stats.lastDate,
    });
  }

  return {
    platform: 'imessage',
    participants,
    messages,
    errors,
  };
}

// ─── CSV parsing utilities ───────────────────────────────────────────────────

/**
 * Split text into logical CSV lines, respecting quoted fields that may
 * contain newlines.
 */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      // Check for escaped quote ("")
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        current += '""';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // End of logical line
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // skip \n in \r\n
      }
      if (current.trim()) {
        lines.push(current);
      }
      current = '';
    } else {
      current += ch;
    }
  }

  // Last line
  if (current.trim()) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV row into an array of field values.
 * Handles quoted fields with escaped quotes ("").
 */
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (!inQuotes) {
        inQuotes = true;
        i++;
        continue;
      }
      // Inside quotes: check for escaped quote
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      // Closing quote
      inQuotes = false;
      i++;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Last field
  fields.push(current);

  return fields;
}

/**
 * Detect column mapping from header row by matching known aliases.
 */
function detectColumnMapping(headers: string[]): ColumnMapping | null {
  const lower = headers.map((h) => h.trim().toLowerCase());

  const sender = findIndex(lower, SENDER_ALIASES);
  const date = findIndex(lower, DATE_ALIASES);
  const text = findIndex(lower, TEXT_ALIASES);
  const type = findIndex(lower, TYPE_ALIASES);

  if (sender === -1 || date === -1 || text === -1) {
    return null;
  }

  return { sender, date, text, type: type === -1 ? null : type };
}

function findIndex(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

// ─── Date parsing ────────────────────────────────────────────────────────────

/**
 * Parse a date string in common CSV export formats:
 *  - "2023-01-01 10:00:00"
 *  - "2023-01-01 10:00"
 *  - "2023-01-01T10:00:00"
 *  - "1/1/2023 10:00:00 AM"
 *  - "01/01/2023 10:00"
 */
function parseDate(raw: string): Date | null {
  if (!raw) return null;

  // Try ISO-like format first: YYYY-MM-DD HH:MM[:SS]
  const isoMatch = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (isoMatch) {
    const [, y, m, d, h, min, sec] = isoMatch;
    return new Date(
      parseInt(y),
      parseInt(m) - 1,
      parseInt(d),
      parseInt(h),
      parseInt(min),
      sec ? parseInt(sec) : 0,
    );
  }

  // US format: M/D/YYYY H:MM[:SS] [AM|PM]
  const usMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i,
  );
  if (usMatch) {
    const [, m, d, yRaw, hRaw, min, sec, ampm] = usMatch;
    let year = parseInt(yRaw);
    if (year < 100) year += 2000;
    let hour = parseInt(hRaw);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'PM' && hour !== 12) hour += 12;
      if (upper === 'AM' && hour === 12) hour = 0;
    }
    return new Date(year, parseInt(m) - 1, parseInt(d), hour, parseInt(min), sec ? parseInt(sec) : 0);
  }

  // Fallback: try native Date constructor
  const fallback = new Date(raw);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

// ─── Stream utility ──────────────────────────────────────────────────────────

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // flush
  return result;
}
