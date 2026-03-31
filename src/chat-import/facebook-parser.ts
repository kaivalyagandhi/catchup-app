/**
 * Facebook Messenger Chat Export Parser
 *
 * Parses Facebook's "Download Your Information" JSON export format.
 * The export contains a `participants` array, a `messages` array,
 * plus Facebook-specific fields like `title`, `thread_path`, and
 * `is_still_participant`.
 *
 * Expected JSON shape:
 * {
 *   "participants": [{ "name": "User One" }, { "name": "User Two" }],
 *   "messages": [
 *     {
 *       "sender_name": "User One",
 *       "timestamp_ms": 1672531200000,
 *       "content": "Hello!",
 *       "type": "Generic",
 *       "is_unsent": false
 *     }
 *   ],
 *   "title": "Chat with User Two",
 *   "thread_path": "inbox/user_abc123",
 *   "is_still_participant": true
 * }
 *
 * Facebook exports encode non-ASCII characters as escaped UTF-8 byte
 * sequences (e.g., "\u00c3\u00a9" for "é"). The parser decodes these
 * back to proper Unicode strings.
 *
 * Requirements: 24.4, 24.7, 24.8
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

// ─── Facebook Parser ─────────────────────────────────────────────────────────

export class FacebookParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseFacebookJson(text);
  }
}

/**
 * Decode Facebook's escaped UTF-8 byte sequences back to proper Unicode.
 *
 * Facebook exports encode non-ASCII characters as Latin-1 interpreted UTF-8
 * byte sequences. For example, "é" (U+00E9) is encoded as "\u00c3\u00a9"
 * which are the two UTF-8 bytes 0xC3 0xA9 interpreted as Latin-1 code points.
 *
 * We convert each character to its Latin-1 byte value, then decode the
 * resulting byte sequence as UTF-8.
 */
export function decodeFacebookString(str: string): string {
  try {
    // Convert each char code to a byte, then decode as UTF-8
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    // If decoding fails, return the original string
    return str;
  }
}

/**
 * Parse Facebook Messenger JSON export content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseFacebookJson(text: string): ParseResult {
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  if (!text.trim()) {
    return { platform: 'facebook', participants: [], messages: [], errors: [] };
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      platform: 'facebook',
      participants: [],
      messages: [],
      errors: [{ message: `Invalid JSON: ${(e as Error).message}` }],
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      platform: 'facebook',
      participants: [],
      messages: [],
      errors: [{ message: 'JSON root is not an object' }],
    };
  }

  const root = data as Record<string, unknown>;
  const rawMessages = root.messages;

  if (!Array.isArray(rawMessages)) {
    return {
      platform: 'facebook',
      participants: [],
      messages: [],
      errors: [{ message: 'Missing or invalid "messages" array in JSON' }],
    };
  }

  // ── Process messages ─────────────────────────────────────────────────────
  const participantMap = new Map<
    string,
    { displayName: string; messageCount: number; firstDate: Date; lastDate: Date }
  >();

  for (let i = 0; i < rawMessages.length; i++) {
    const entry = rawMessages[i];

    if (!entry || typeof entry !== 'object') {
      errors.push({ entry: i, message: 'Message entry is not an object' });
      continue;
    }

    const msg = entry as Record<string, unknown>;

    // Skip unsent messages
    if (msg.is_unsent === true) {
      continue;
    }

    // Validate timestamp
    const timestampMs = msg.timestamp_ms;
    if (typeof timestampMs !== 'number' || !isFinite(timestampMs)) {
      errors.push({
        entry: i,
        message: 'Missing or invalid "timestamp_ms"',
        raw: JSON.stringify(entry).slice(0, 200),
      });
      continue;
    }

    const timestamp = new Date(timestampMs);
    if (isNaN(timestamp.getTime())) {
      errors.push({
        entry: i,
        message: 'Invalid timestamp value',
        raw: JSON.stringify(entry).slice(0, 200),
      });
      continue;
    }

    // Validate sender
    const rawSenderName = msg.sender_name;
    if (typeof rawSenderName !== 'string' || rawSenderName.trim() === '') {
      errors.push({
        entry: i,
        message: 'Missing or invalid "sender_name"',
        raw: JSON.stringify(entry).slice(0, 200),
      });
      continue;
    }

    // Decode Facebook's UTF-8 escaped strings
    const senderName = decodeFacebookString(rawSenderName);

    // Determine if system message (type !== "Generic")
    const msgType = typeof msg.type === 'string' ? msg.type : 'Generic';
    const isSystemMessage = msgType !== 'Generic';

    // Content may be absent for some message types (photos, shares, etc.)
    const rawContent = typeof msg.content === 'string' ? msg.content : '';
    const content = decodeFacebookString(rawContent);

    messages.push({
      sender: isSystemMessage ? '__system__' : senderName,
      content,
      timestamp,
      isSystemMessage,
    });

    // Track participant stats (skip system messages)
    if (!isSystemMessage) {
      const normalized = normalizeIdentifier(senderName);
      const key = normalized.identifier;

      const existing = participantMap.get(key);
      if (existing) {
        existing.messageCount++;
        if (timestamp < existing.firstDate) existing.firstDate = new Date(timestamp);
        if (timestamp > existing.lastDate) existing.lastDate = new Date(timestamp);
        if (senderName.length > existing.displayName.length) {
          existing.displayName = senderName;
        }
      } else {
        participantMap.set(key, {
          displayName: senderName,
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
    platform: 'facebook',
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
