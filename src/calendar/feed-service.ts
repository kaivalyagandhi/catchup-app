/**
 * Calendar Feed Service
 *
 * Handles publishing suggestions as iCal/Google Calendar feeds.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import crypto from 'crypto';
import { Suggestion, Contact } from '../types';

/**
 * Calendar feed URL result
 */
export interface CalendarFeedUrl {
  iCalUrl: string;
  googleCalendarUrl: string;
  expiresAt: Date;
}

/**
 * iCal event representation
 */
interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  status: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  created: Date;
  lastModified: Date;
}

/**
 * Generate a signed token for secure feed access
 */
function generateSignedToken(userId: string, expirationHours: number = 720): { token: string; expiresAt: Date } {
  const secret = process.env.FEED_SECRET || 'default-secret-change-in-production';
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  const payload = JSON.stringify({
    userId,
    expiresAt: expiresAt.toISOString(),
  });
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  
  return { token, expiresAt };
}

/**
 * Verify a signed token
 */
export function verifySignedToken(token: string): { userId: string; expiresAt: Date } | null {
  try {
    const secret = process.env.FEED_SECRET || 'default-secret-change-in-production';
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    
    const { payload, signature } = decoded;
    const parsedPayload = JSON.parse(payload);
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Check expiration
    const expiresAt = new Date(parsedPayload.expiresAt);
    if (expiresAt < new Date()) {
      return null;
    }
    
    return {
      userId: parsedPayload.userId,
      expiresAt,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Convert suggestion to iCal event
 */
function suggestionToICalEvent(suggestion: Suggestion, contact: Contact): ICalEvent {
  const summary = `Catch up with ${contact.name}`;
  const description = `${suggestion.reasoning}\\n\\nContact: ${contact.name}${contact.phone ? `\\nPhone: ${contact.phone}` : ''}${contact.email ? `\\nEmail: ${contact.email}` : ''}`;
  
  // Map suggestion status to iCal status
  let status: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED' = 'TENTATIVE';
  if (suggestion.status === 'accepted') {
    status = 'CONFIRMED';
  } else if (suggestion.status === 'dismissed') {
    status = 'CANCELLED';
  }
  
  return {
    uid: `catchup-${suggestion.id}@catchup.app`,
    summary,
    description,
    start: suggestion.proposedTimeslot.start,
    end: suggestion.proposedTimeslot.end,
    status,
    created: suggestion.createdAt,
    lastModified: suggestion.updatedAt,
  };
}

/**
 * Generate iCal format from events
 */
function generateICalFormat(events: ICalEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CatchUp//Relationship Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CatchUp Suggestions',
    'X-WR-CALDESC:Intelligent suggestions for catching up with friends',
    'X-WR-TIMEZONE:UTC',
  ];
  
  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(event.start)}`);
    lines.push(`DTEND:${formatICalDate(event.end)}`);
    lines.push(`SUMMARY:${escapeICalText(event.summary)}`);
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    lines.push(`STATUS:${event.status}`);
    lines.push(`CREATED:${formatICalDate(event.created)}`);
    lines.push(`LAST-MODIFIED:${formatICalDate(event.lastModified)}`);
    lines.push('TRANSP:TRANSPARENT'); // Don't block time
    lines.push('END:VEVENT');
  }
  
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

/**
 * Publish suggestion feed for a user
 * 
 * Generates signed URLs for both iCal and Google Calendar subscription.
 * URLs expire after 30 days by default.
 * 
 * Requirements: 8.1, 8.2
 */
export function publishSuggestionFeed(userId: string, expirationHours: number = 720): CalendarFeedUrl {
  const { token, expiresAt } = generateSignedToken(userId, expirationHours);
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const iCalUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;
  
  // Google Calendar subscription URL format
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(iCalUrl)}`;
  
  return {
    iCalUrl,
    googleCalendarUrl,
    expiresAt,
  };
}

/**
 * Generate iCal feed content for a user's suggestions
 * 
 * This function should be called by the API endpoint that serves the feed.
 * 
 * Requirements: 8.1, 8.4
 */
export function generateFeedContent(
  suggestions: Suggestion[],
  contacts: Map<string, Contact>
): string {
  // Filter to only include pending and accepted suggestions
  const relevantSuggestions = suggestions.filter(
    (s) => s.status === 'pending' || s.status === 'accepted'
  );
  
  // Convert suggestions to iCal events
  const events = relevantSuggestions
    .map((suggestion) => {
      const contact = contacts.get(suggestion.contactId);
      if (!contact) {
        return null;
      }
      return suggestionToICalEvent(suggestion, contact);
    })
    .filter((event): event is ICalEvent => event !== null);
  
  return generateICalFormat(events);
}

/**
 * Update feed event when suggestion status changes
 * 
 * This function marks that a feed update is needed. The actual feed
 * is regenerated on-demand when accessed via the feed URL.
 * 
 * In a production system, this might trigger a cache invalidation
 * or webhook notification to calendar clients.
 * 
 * Requirements: 8.3
 */
export async function updateFeedEvent(suggestionId: string): Promise<void> {
  // In a real implementation, this would:
  // 1. Invalidate any cached feed content for the user
  // 2. Optionally send webhook notifications to subscribed clients
  // 3. Update a "last modified" timestamp for the feed
  
  // For now, we'll just log that an update is needed
  // The feed will be regenerated on next access
  console.log(`Feed update triggered for suggestion ${suggestionId}`);
  
  // TODO: Implement cache invalidation when caching is added
  // TODO: Implement webhook notifications for real-time updates
}

/**
 * Generate iCal feed content for a user's suggestions
 * 
 * @param userId - User ID
 * @returns iCal formatted string
 */
export async function generateICalFeed(userId: string): Promise<string> {
  // Import dependencies
  const { getPendingSuggestions } = await import('../matching/suggestion-service');
  const { contactService } = await import('../contacts/service');
  
  // Get pending suggestions
  const suggestions = await getPendingSuggestions(userId);
  
  // Get contacts for the suggestions
  const contactIds = [...new Set(suggestions.map(s => s.contactId))];
  const contactsMap = new Map<string, Contact>();
  
  for (const contactId of contactIds) {
    try {
      const contact = await contactService.getContact(contactId, userId);
      if (contact) {
        contactsMap.set(contactId, contact);
      }
    } catch (error) {
      console.error(`Failed to load contact ${contactId}:`, error);
    }
  }
  
  // Generate feed content
  return generateFeedContent(suggestions, contactsMap);
}
