/**
 * X/Twitter DM Chat Export Parser
 *
 * Parses Twitter's data download JSON export format for Direct Messages.
 * The export contains an array of `dmConversation` objects, each with
 * a `conversationId` and a `messages` array of `messageCreate` entries.
 *
 * Expected JSON shape:
 * [
 *   {
 *     "dmConversation": {
 *       "conversationId": "123456-789012",
 *       "messages": [
 *         {
 *           "messageCreate": {
 *             "id": "msg1",
 *             "senderId": "123456",
 *             "text": "Hello!",
 *             "createdAt": "2023-01-01T10:00:00.000Z"
 *           }
 *         }
 *       ]
 *     }
 *   }
 * ]
 *
 * Note: Twitter uses numeric user IDs as senderIds, not usernames.
 * The parser treats these as identifiers with identifierType 'username'.
 *
 * Requirements: 24.5, 24.7, 24.8
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

// ─── Twitter Parser ──────────────────────────────────────────────────────────

export class TwitterParser implements ChatParser {
  async parse(stream: ReadableStream, _platform: ChatPlatform): Promise<ParseResult> {
    const text = await streamToString(stream);
    return parseTwitterJson(text);
  }
}

/**
 * Parse Twitter DM JSON export content into a ParseResult.
 * Exported for direct use in tests without needing a ReadableStream.
 */
export function parseTwitterJson(text: string): ParseResult {
  const errors: ParseError[] = [];
  const messages: ParsedMessage[] = [];

  if (!text.trim()) {
    return { platform: 'twitter', participants: [], messages: [], errors: [] };
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      platform: 'twitter',
      participants: [],
      messages: [],
      errors: [{ message: `Invalid JSON: ${(e as Error).message}` }],
    };
  }

  if (!Array.isArray(data)) {
    return {
      platform: 'twitter',
      participants: [],
      messages: [],
      errors: [{ message: 'JSON root is not an array' }],
    };
  }

  // ── Process conversations ────────────────────────────────────────────────
  const participantMap = new Map<
    string,
    { displayName: string; messageCount: number; firstDate: Date; lastDate: Date }
  >();

  for (let convIdx = 0; convIdx < data.length; convIdx++) {
    const convEntry = data[convIdx];

    if (!convEntry || typeof convEntry !== 'object') {
      errors.push({ entry: convIdx, message: 'Conversation entry is not an object' });
      continue;
    }

    const convObj = convEntry as Record<string, unknown>;
    const dmConversation = convObj.dmConversation;

    if (!dmConversation || typeof dmConversation !== 'object') {
      errors.push({ entry: convIdx, message: 'Missing or invalid "dmConversation" object' });
      continue;
    }

    const conversation = dmConversation as Record<string, unknown>;
    const rawMessages = conversation.messages;

    if (!Array.isArray(rawMessages)) {
      errors.push({ entry: convIdx, message: 'Missing or invalid "messages" array in dmConversation' });
      continue;
    }

    // ── Process messages within this conversation ──────────────────────────
    for (let msgIdx = 0; msgIdx < rawMessages.length; msgIdx++) {
      const msgEntry = rawMessages[msgIdx];

      if (!msgEntry || typeof msgEntry !== 'object') {
        errors.push({ entry: convIdx, message: `Message ${msgIdx} is not an object` });
        continue;
      }

      const msgWrapper = msgEntry as Record<string, unknown>;
      const messageCreate = msgWrapper.messageCreate;

      if (!messageCreate || typeof messageCreate !== 'object') {
        errors.push({
          entry: convIdx,
          message: `Message ${msgIdx} missing "messageCreate" wrapper`,
          raw: JSON.stringify(msgEntry).slice(0, 200),
        });
        continue;
      }

      const msg = messageCreate as Record<string, unknown>;

      // Validate timestamp
      const createdAt = msg.createdAt;
      if (typeof createdAt !== 'string' || createdAt.trim() === '') {
        errors.push({
          entry: convIdx,
          message: `Message ${msgIdx} missing or invalid "createdAt"`,
          raw: JSON.stringify(msgEntry).slice(0, 200),
        });
        continue;
      }

      const timestamp = new Date(createdAt);
      if (isNaN(timestamp.getTime())) {
        errors.push({
          entry: convIdx,
          message: `Message ${msgIdx} has invalid timestamp value`,
          raw: JSON.stringify(msgEntry).slice(0, 200),
        });
        continue;
      }

      // Validate sender
      const senderId = msg.senderId;
      if (typeof senderId !== 'string' || senderId.trim() === '') {
        errors.push({
          entry: convIdx,
          message: `Message ${msgIdx} missing or invalid "senderId"`,
          raw: JSON.stringify(msgEntry).slice(0, 200),
        });
        continue;
      }

      const content = typeof msg.text === 'string' ? msg.text : '';

      messages.push({
        sender: senderId,
        content,
        timestamp,
        isSystemMessage: false,
      });

      // Track participant stats
      const normalized = normalizeIdentifier(senderId);
      const key = normalized.identifier;

      const existing = participantMap.get(key);
      if (existing) {
        existing.messageCount++;
        if (timestamp < existing.firstDate) existing.firstDate = new Date(timestamp);
        if (timestamp > existing.lastDate) existing.lastDate = new Date(timestamp);
      } else {
        participantMap.set(key, {
          displayName: senderId,
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
    participants.push({
      identifier,
      identifierType: 'username',
      displayName: stats.displayName,
      messageCount: stats.messageCount,
      firstMessageDate: stats.firstDate,
      lastMessageDate: stats.lastDate,
    });
  }

  return {
    platform: 'twitter',
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
