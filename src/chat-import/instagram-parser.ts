/**
 * Instagram Chat Export Parser
 *
 * Parses Instagram's "Download Your Information" JSON export format.
 * The export contains a `participants` array and a `messages` array
 * within each conversation file.
 *
 * Expected JSON shape:
 * {
 *   "participants": [{ "name": "user1" }, { "name": "user2" }],
 *   "messages": [
 *     {
 *       "sender_name": "user1",
 *       "timestamp_ms": 1672531200000,
 *       "content": "Hello!",
 *       "type": "Generic"
 *     }
 *   ]
 * }
 *
 * Requirements: 24.2, 24.7, 24.8
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

// ─── Instagram Parser ────────────────────────────────────────────────────────

export class InstagramParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseInstagramJson(text);
  }
}

/**
 * Parse Instagram JSON export content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseInstagramJson(text: string): ParseResult {
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  if (!text.trim()) {
    return { platform: 'instagram', participants: [], messages: [], errors: [] };
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      platform: 'instagram',
      participants: [],
      messages: [],
      errors: [{ message: `Invalid JSON: ${(e as Error).message}` }],
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      platform: 'instagram',
      participants: [],
      messages: [],
      errors: [{ message: 'JSON root is not an object' }],
    };
  }

  const root = data as Record<string, unknown>;
  const rawMessages = root.messages;

  if (!Array.isArray(rawMessages)) {
    return {
      platform: 'instagram',
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
    const senderName = msg.sender_name;
    if (typeof senderName !== 'string' || senderName.trim() === '') {
      errors.push({
        entry: i,
        message: 'Missing or invalid "sender_name"',
        raw: JSON.stringify(entry).slice(0, 200),
      });
      continue;
    }

    // Determine if system message (type !== "Generic")
    const msgType = typeof msg.type === 'string' ? msg.type : 'Generic';
    const isSystemMessage = msgType !== 'Generic';

    // Content may be absent for some message types (photos, shares, etc.)
    const content = typeof msg.content === 'string' ? msg.content : '';

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
    platform: 'instagram',
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
