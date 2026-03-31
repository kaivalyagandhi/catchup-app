/**
 * WhatsApp Chat Export Parser
 *
 * Parses WhatsApp native text export files with support for:
 *  - Bracket format: [MM/DD/YY, HH:MM:SS AM/PM] Sender: message
 *  - Dash format:    MM/DD/YY, HH:MM AM/PM - Sender: message
 *  - Locale-dependent date separators: / . -
 *  - Multi-line messages (continuation lines without a timestamp prefix)
 *  - System messages (lines with timestamp but no "Sender:" pattern)
 *
 * Requirements: 24.1, 24.7, 24.8
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

// ─── Date format definitions ─────────────────────────────────────────────────

interface DateFormatPattern {
  /** Human-readable label for debugging */
  label: string;
  /** Regex that captures date components from the date/time string */
  regex: RegExp;
  /** Parse the matched groups into a Date */
  parse: (match: RegExpMatchArray) => Date | null;
}

/**
 * Known WhatsApp date/time patterns across locales.
 * We try each pattern and pick the one that produces valid dates for the
 * majority of lines.
 */
const DATE_PATTERNS: DateFormatPattern[] = [
  // MM/DD/YY, HH:MM:SS AM/PM (US 12h with seconds)
  {
    label: 'MM/DD/YY 12h+sec',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM|am|pm)$/,
    parse: (m) => buildDate(+m[3], +m[1], +m[2], to24h(+m[4], m[7]), +m[5], +m[6]),
  },
  // DD/MM/YY, HH:MM:SS AM/PM (UK/intl 12h with seconds)
  {
    label: 'DD/MM/YY 12h+sec',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM|am|pm)$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], to24h(+m[4], m[7]), +m[5], +m[6]),
  },
  // MM/DD/YY, HH:MM:SS (US 24h with seconds)
  {
    label: 'MM/DD/YY 24h+sec',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[1], +m[2], +m[4], +m[5], +m[6]),
  },
  // DD/MM/YY, HH:MM:SS (EU 24h with seconds)
  {
    label: 'DD/MM/YY 24h+sec',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], +m[6]),
  },
  // MM/DD/YY, HH:MM AM/PM (US 12h no seconds)
  {
    label: 'MM/DD/YY 12h',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/,
    parse: (m) => buildDate(+m[3], +m[1], +m[2], to24h(+m[4], m[6]), +m[5], 0),
  },
  // DD/MM/YY, HH:MM AM/PM (UK 12h no seconds)
  {
    label: 'DD/MM/YY 12h',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], to24h(+m[4], m[6]), +m[5], 0),
  },
  // MM/DD/YY, HH:MM (US 24h no seconds)
  {
    label: 'MM/DD/YY 24h',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[1], +m[2], +m[4], +m[5], 0),
  },
  // DD/MM/YY, HH:MM (EU 24h no seconds)
  {
    label: 'DD/MM/YY 24h',
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], 0),
  },
  // DD.MM.YY, HH:MM:SS (German/EU dot separator 24h)
  {
    label: 'DD.MM.YY 24h+sec',
    regex: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], +m[6]),
  },
  // DD.MM.YY, HH:MM (German/EU dot separator 24h no seconds)
  {
    label: 'DD.MM.YY 24h',
    regex: /^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),\s+(\d{1,2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], 0),
  },
  // DD-MM-YY, HH:MM:SS (dash separator 24h)
  {
    label: 'DD-MM-YY 24h+sec',
    regex: /^(\d{1,2})-(\d{1,2})-(\d{2,4}),\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], +m[6]),
  },
  // DD-MM-YY, HH:MM (dash separator 24h no seconds)
  {
    label: 'DD-MM-YY 24h',
    regex: /^(\d{1,2})-(\d{1,2})-(\d{2,4}),\s+(\d{1,2}):(\d{2})$/,
    parse: (m) => buildDate(+m[3], +m[2], +m[1], +m[4], +m[5], 0),
  },
];

// ─── Line-level regex ────────────────────────────────────────────────────────

/**
 * Matches a WhatsApp message line in bracket format:
 *   [<datetime>] <rest>
 * Group 1 = datetime string, Group 2 = rest of line after "] "
 */
const BRACKET_LINE = /^\[([^\]]+)\]\s+(.+)$/;

/**
 * Matches a WhatsApp message line in dash format:
 *   <datetime> - <rest>
 * Group 1 = datetime string, Group 2 = rest of line after " - "
 */
const DASH_LINE = /^([^[\]\n]+?)\s+-\s+(.+)$/;

// ─── Helper functions ────────────────────────────────────────────────────────

function to24h(hour: number, ampm: string): number {
  const upper = ampm.toUpperCase();
  if (upper === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function buildDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  // Expand 2-digit year
  if (year < 100) {
    year += year < 70 ? 2000 : 1900;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  if (second < 0 || second > 59) return null;

  const d = new Date(year, month - 1, day, hour, minute, second);
  // Verify the date didn't roll over (e.g. Feb 30 → Mar 2)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** Extract datetime string and rest-of-line from a raw line */
function extractDateAndRest(line: string): { dateStr: string; rest: string } | null {
  const bracketMatch = BRACKET_LINE.exec(line);
  if (bracketMatch) {
    return { dateStr: bracketMatch[1], rest: bracketMatch[2] };
  }
  const dashMatch = DASH_LINE.exec(line);
  if (dashMatch) {
    return { dateStr: dashMatch[1], rest: dashMatch[2] };
  }
  return null;
}

/**
 * Split "rest" into sender and message content.
 * WhatsApp format: "Sender Name: message text"
 * System messages have no colon-separated sender.
 */
function splitSenderAndContent(rest: string): { sender: string | null; content: string } {
  // The sender is everything before the first ": "
  const colonIdx = rest.indexOf(': ');
  if (colonIdx === -1) {
    // System message — no sender
    return { sender: null, content: rest };
  }

  const potentialSender = rest.slice(0, colonIdx);
  const content = rest.slice(colonIdx + 2);

  // Heuristic: sender names don't typically contain newlines or be very long
  // WhatsApp sender names are usually < 50 chars
  if (potentialSender.length > 100) {
    return { sender: null, content: rest };
  }

  return { sender: potentialSender, content };
}

// ─── Date format detection ───────────────────────────────────────────────────

interface RawLine {
  lineNumber: number;
  dateStr: string;
  rest: string;
  rawLine: string;
}

/**
 * Try all date format patterns against a sample of date strings.
 * Return the pattern that produces valid dates for the most lines.
 */
function detectBestDatePattern(dateStrings: string[]): DateFormatPattern | null {
  if (dateStrings.length === 0) return null;

  let bestPattern: DateFormatPattern | null = null;
  let bestCount = 0;

  for (const pattern of DATE_PATTERNS) {
    let validCount = 0;
    for (const ds of dateStrings) {
      const match = pattern.regex.exec(ds);
      if (match) {
        const date = pattern.parse(match);
        if (date !== null) {
          validCount++;
        }
      }
    }
    if (validCount > bestCount) {
      bestCount = validCount;
      bestPattern = pattern;
    }
  }

  // Require at least a majority of lines to match
  if (bestPattern && bestCount >= Math.ceil(dateStrings.length / 2)) {
    return bestPattern;
  }
  return null;
}

// ─── WhatsApp Parser ─────────────────────────────────────────────────────────

export class WhatsAppParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseWhatsAppText(text);
  }
}

/**
 * Parse WhatsApp text export content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseWhatsAppText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  // Phase 1: Extract all lines that look like they start with a timestamp
  const rawLines: RawLine[] = [];
  const continuationMap = new Map<number, string[]>(); // rawLine index → continuation lines

  let currentRawIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const extracted = extractDateAndRest(line);
    if (extracted) {
      currentRawIdx = rawLines.length;
      rawLines.push({
        lineNumber: i + 1,
        dateStr: extracted.dateStr,
        rest: extracted.rest,
        rawLine: line,
      });
      continuationMap.set(currentRawIdx, []);
    } else if (currentRawIdx >= 0) {
      // Multi-line continuation of previous message
      continuationMap.get(currentRawIdx)!.push(line);
    } else {
      // Line before any timestamp — likely file header or garbage
      errors.push({
        line: i + 1,
        message: 'Line does not match any WhatsApp message pattern',
        raw: line,
      });
    }
  }

  // Phase 2: Detect the best date format pattern
  const dateStrings = rawLines.map((r) => r.dateStr);
  const bestPattern = detectBestDatePattern(dateStrings);

  if (!bestPattern && rawLines.length > 0) {
    // Can't parse any dates — return error
    return {
      platform: 'whatsapp',
      participants: [],
      messages: [],
      errors: [
        {
          message: 'Could not detect date format in WhatsApp export',
        },
      ],
    };
  }

  // Phase 3: Parse each raw line using the detected pattern
  const participantMap = new Map<
    string,
    { displayName: string; messageCount: number; firstDate: Date; lastDate: Date }
  >();

  for (let idx = 0; idx < rawLines.length; idx++) {
    const raw = rawLines[idx];
    const continuations = continuationMap.get(idx) ?? [];

    // Parse date
    const match = bestPattern!.regex.exec(raw.dateStr);
    if (!match) {
      errors.push({
        line: raw.lineNumber,
        message: `Date does not match detected pattern (${bestPattern!.label})`,
        raw: raw.rawLine,
      });
      continue;
    }

    const timestamp = bestPattern!.parse(match);
    if (!timestamp) {
      errors.push({
        line: raw.lineNumber,
        message: 'Invalid date values',
        raw: raw.rawLine,
      });
      continue;
    }

    // Split sender and content
    const { sender, content } = splitSenderAndContent(raw.rest);

    // Append continuation lines
    const fullContent =
      continuations.length > 0 ? content + '\n' + continuations.join('\n') : content;

    const isSystemMessage = sender === null;

    // Determine the sender identifier
    const senderIdentifier = isSystemMessage ? '__system__' : sender;

    messages.push({
      sender: senderIdentifier,
      content: fullContent,
      timestamp,
      isSystemMessage,
    });

    // Track participant stats (skip system messages)
    if (!isSystemMessage) {
      const normalized = normalizeIdentifier(sender);
      const key = normalized.identifier;

      const existing = participantMap.get(key);
      if (existing) {
        existing.messageCount++;
        if (timestamp < existing.firstDate) existing.firstDate = new Date(timestamp);
        if (timestamp > existing.lastDate) existing.lastDate = new Date(timestamp);
        // Keep the longest display name variant
        if (sender.length > existing.displayName.length) {
          existing.displayName = sender;
        }
      } else {
        participantMap.set(key, {
          displayName: sender,
          messageCount: 1,
          firstDate: new Date(timestamp),
          lastDate: new Date(timestamp),
        });
      }
    }
  }

  // Phase 4: Build participants array
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
    platform: 'whatsapp',
    participants,
    messages,
    errors,
  };
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
