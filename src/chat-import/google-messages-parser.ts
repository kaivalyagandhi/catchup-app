/**
 * Google Messages / SMS Backup & Restore Parser
 *
 * Parses XML files exported by the "SMS Backup & Restore" Android app.
 * Extracts messages from self-closing `<sms />` elements using simple
 * regex-based attribute extraction (no full XML parser needed).
 *
 * Expected XML shape:
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <smses count="3">
 *   <sms address="+15551234567" body="Hello!" date="1672531200000"
 *        type="1" contact_name="John Doe" />
 * </smses>
 * ```
 *
 * Key attributes:
 *  - address: phone number of the other party
 *  - body: message text content
 *  - date: timestamp in milliseconds since epoch
 *  - type: 1 = received, 2 = sent by the user
 *  - contact_name: display name from the phone's contacts
 *
 * Requirements: 24.6, 24.7, 24.8
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

// ─── Constants ───────────────────────────────────────────────────────────────

/** Sender identifier for messages sent by the device owner (type=2) */
const SELF_IDENTIFIER = '__self__';

// ─── Google Messages Parser ─────────────────────────────────────────────────

export class GoogleMessagesParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseGoogleMessagesXml(text);
  }
}

/**
 * Extract the value of an XML attribute from a tag string.
 * Handles both single and double quotes.
 */
function extractAttribute(tag: string, attr: string): string | null {
  // Match attr="value" or attr='value'
  const regex = new RegExp(`${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = tag.match(regex);
  if (!match) return null;
  return decodeXmlEntities(match[1] ?? match[2] ?? '');
}

/**
 * Decode common XML entities back to their character equivalents.
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Parse Google Messages / SMS Backup & Restore XML content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseGoogleMessagesXml(text: string): ParseResult {
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  if (!text.trim()) {
    return { platform: 'google_messages', participants: [], messages: [], errors: [] };
  }

  // ── Find all <sms ... /> or <sms ...>...</sms> elements ──────────────────
  const smsPattern = /<sms\b[^>]*\/?>/gi;
  const matches = text.matchAll(smsPattern);

  const participantMap = new Map<
    string,
    { displayName: string; messageCount: number; firstDate: Date; lastDate: Date }
  >();

  let entryIndex = 0;
  for (const match of matches) {
    const tag = match[0];

    // ── Extract required attributes ────────────────────────────────────────
    const address = extractAttribute(tag, 'address');
    const body = extractAttribute(tag, 'body');
    const dateStr = extractAttribute(tag, 'date');
    const typeStr = extractAttribute(tag, 'type');
    const contactName = extractAttribute(tag, 'contact_name');

    // Validate address
    if (!address || address.trim() === '') {
      errors.push({
        entry: entryIndex,
        message: 'Missing or empty "address" attribute',
        raw: tag.slice(0, 200),
      });
      entryIndex++;
      continue;
    }

    // Validate date
    if (!dateStr || dateStr.trim() === '') {
      errors.push({
        entry: entryIndex,
        message: 'Missing or empty "date" attribute',
        raw: tag.slice(0, 200),
      });
      entryIndex++;
      continue;
    }

    const dateMs = Number(dateStr);
    if (!isFinite(dateMs) || dateMs <= 0) {
      errors.push({
        entry: entryIndex,
        message: 'Invalid "date" attribute value',
        raw: tag.slice(0, 200),
      });
      entryIndex++;
      continue;
    }

    const timestamp = new Date(dateMs);
    if (isNaN(timestamp.getTime())) {
      errors.push({
        entry: entryIndex,
        message: 'Invalid timestamp from "date" attribute',
        raw: tag.slice(0, 200),
      });
      entryIndex++;
      continue;
    }

    // Validate type
    const smsType = typeStr ? Number(typeStr) : NaN;

    // Determine sender: type=2 means sent by user, type=1 means received
    const isSent = smsType === 2;
    const sender = isSent ? SELF_IDENTIFIER : address;

    const content = body ?? '';

    messages.push({
      sender,
      content,
      timestamp,
      isSystemMessage: false,
    });

    // Track participant stats (only for the other party, not __self__)
    const normalizedAddr = normalizeIdentifier(address);
    const key = normalizedAddr.identifier;

    const displayName = contactName && contactName.trim() !== '' && contactName !== '(Unknown)'
      ? contactName.trim()
      : undefined;

    const existing = participantMap.get(key);
    if (existing) {
      existing.messageCount++;
      if (timestamp < existing.firstDate) existing.firstDate = new Date(timestamp);
      if (timestamp > existing.lastDate) existing.lastDate = new Date(timestamp);
      // Prefer a real display name over undefined
      if (displayName && !existing.displayName) {
        existing.displayName = displayName;
      }
    } else {
      participantMap.set(key, {
        displayName: displayName ?? '',
        messageCount: 1,
        firstDate: new Date(timestamp),
        lastDate: new Date(timestamp),
      });
    }

    entryIndex++;
  }

  // ── Build participants array ─────────────────────────────────────────────
  const participants: Participant[] = [];
  for (const [identifier, stats] of participantMap) {
    const normalized = normalizeIdentifier(identifier);
    participants.push({
      identifier: normalized.identifier,
      identifierType: normalized.identifierType,
      displayName: stats.displayName || undefined,
      messageCount: stats.messageCount,
      firstMessageDate: stats.firstDate,
      lastMessageDate: stats.lastDate,
    });
  }

  return {
    platform: 'google_messages',
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
