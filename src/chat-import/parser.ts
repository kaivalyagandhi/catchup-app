/**
 * Chat Import Parser Infrastructure
 *
 * Common interfaces and types for all platform-specific chat history parsers,
 * plus platform auto-detection from file signatures.
 *
 * Requirements: 5.5, 6.4, 24.7
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChatPlatform =
  | 'whatsapp'
  | 'instagram'
  | 'imessage'
  | 'facebook'
  | 'twitter'
  | 'google_messages';

export interface ParseResult {
  platform: ChatPlatform;
  participants: Participant[];
  messages: ParsedMessage[];
  errors: ParseError[];
}

export interface Participant {
  /** Phone, username, or email */
  identifier: string;
  identifierType: 'phone' | 'email' | 'username' | 'display_name';
  displayName?: string;
  messageCount: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
}

export interface ParsedMessage {
  /** Participant identifier */
  sender: string;
  content: string;
  timestamp: Date;
  isSystemMessage: boolean;
}

export interface ParseError {
  line?: number;
  entry?: number;
  message: string;
  raw?: string;
}

// ─── ChatParser interface ────────────────────────────────────────────────────

export interface ChatParser {
  parse(stream: ReadableStream, platform: ChatPlatform): Promise<ParseResult>;
}


// ─── Platform detection ──────────────────────────────────────────────────────

/**
 * WhatsApp text exports typically start with lines like:
 *   [1/2/23, 10:00:00 AM] Sender: message
 *   1/2/23, 10:00:00 AM - Sender: message
 *   [01.02.23, 10:00:00] Sender: message
 *
 * We look for date/time bracket or dash patterns in the first few lines.
 */
const WHATSAPP_PATTERN =
  /^(\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[APap][Mm])?\]?\s*[-–—]?\s*)/m;

/**
 * Detect the chat platform from a file name and the first bytes of content.
 *
 * Detection strategy (Requirement 5.5):
 *  - WhatsApp:  .txt with date/time bracket patterns
 *  - Instagram: .json with Instagram schema shape (`"participants"` + `"messages"`)
 *  - Facebook:  .json with Facebook schema shape (`"participants"` + `"messages"` + `"title"`)
 *  - Twitter:   .json with `dmConversation` objects
 *  - Google Messages/SMS: .xml with `<smses` root element (SMS Backup & Restore)
 *  - iMessage:  .csv with iMessage-style headers
 */
export function detectPlatform(
  fileName: string,
  headerBytes: Buffer,
): ChatPlatform | null {
  const ext = extname(fileName);
  const header = headerBytes.toString('utf-8').trim();

  switch (ext) {
    case '.txt':
      return detectTextPlatform(header);
    case '.json':
      return detectJsonPlatform(header);
    case '.xml':
      return detectXmlPlatform(header);
    case '.csv':
      return detectCsvPlatform(header);
    default:
      return null;
  }
}

// ─── Extension helpers ───────────────────────────────────────────────────────

function extname(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

function detectTextPlatform(header: string): ChatPlatform | null {
  if (WHATSAPP_PATTERN.test(header)) {
    return 'whatsapp';
  }
  return null;
}

function detectJsonPlatform(header: string): ChatPlatform | null {
  // Twitter: look for dmConversation
  if (header.includes('dmConversation')) {
    return 'twitter';
  }

  // Instagram vs Facebook: both have "participants" and "messages".
  // Facebook exports also include a "title" field at the conversation level
  // and often have "thread_path" or "is_still_participant".
  const hasParticipants = header.includes('"participants"');
  const hasMessages = header.includes('"messages"');

  if (hasParticipants && hasMessages) {
    // Facebook-specific markers
    if (
      header.includes('"title"') &&
      (header.includes('"thread_path"') || header.includes('"is_still_participant"'))
    ) {
      return 'facebook';
    }
    // Instagram exports typically lack "title"/"thread_path" at the top level
    return 'instagram';
  }

  return null;
}

function detectXmlPlatform(header: string): ChatPlatform | null {
  // SMS Backup & Restore uses <smses count="..."> as root element
  if (/<smses\b/i.test(header)) {
    return 'google_messages';
  }
  return null;
}

function detectCsvPlatform(header: string): ChatPlatform | null {
  // iMessage CSV exports (e.g. from iMazing) typically have headers like:
  // "Type","Date","Sender","Text" or similar patterns with date/sender/text columns
  const firstLine = header.split(/\r?\n/)[0]?.toLowerCase() ?? '';
  if (
    (firstLine.includes('sender') || firstLine.includes('from')) &&
    (firstLine.includes('text') || firstLine.includes('message') || firstLine.includes('body')) &&
    (firstLine.includes('date') || firstLine.includes('time'))
  ) {
    return 'imessage';
  }
  return null;
}
