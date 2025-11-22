/**
 * Calendar Friend Identification Service
 *
 * Analyzes calendar events to identify frequent contacts and suggest
 * them as friends during the onboarding process.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { DateRange } from '../types';

export interface FrequentContact {
  email: string;
  name?: string;
  frequency: number; // Number of events with this contact
  lastEventDate?: Date;
}

export interface CalendarFriendService {
  identifyFrequentContacts(
    userId: string,
    accessToken: string,
    dateRange: DateRange,
    refreshToken?: string,
    minFrequency?: number
  ): Promise<FrequentContact[]>;
}

/**
 * Calendar Friend Service Implementation
 */
export class CalendarFriendServiceImpl implements CalendarFriendService {
  /**
   * Create OAuth2 client
   */
  private createOAuth2Client(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials not configured');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Get OAuth2 client with credentials
   */
  private getAuthenticatedClient(accessToken: string, refreshToken?: string): OAuth2Client {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  }

  /**
   * Identify frequent contacts from calendar events
   * Analyzes calendar events to find people the user meets with regularly
   * 
   * Requirements: 19.6
   */
  async identifyFrequentContacts(
    userId: string,
    accessToken: string,
    dateRange: DateRange,
    refreshToken?: string,
    minFrequency: number = 3 // Minimum number of events to be considered frequent
  ): Promise<FrequentContact[]> {
    const auth = this.getAuthenticatedClient(accessToken, refreshToken);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
      // Fetch all calendars
      const calendarListResponse = await calendar.calendarList.list();
      const calendars = calendarListResponse.data.items || [];

      // Track contacts by email
      const contactMap = new Map<string, FrequentContact>();

      // Fetch events from all calendars
      for (const cal of calendars) {
        if (!cal.id) continue;

        try {
          const eventsResponse = await calendar.events.list({
            calendarId: cal.id,
            timeMin: dateRange.start.toISOString(),
            timeMax: dateRange.end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          });

          const events = eventsResponse.data.items || [];

          // Process each event
          for (const event of events) {
            // Skip events without attendees
            if (!event.attendees || event.attendees.length === 0) {
              continue;
            }

            // Get event date
            const eventDate = event.start?.dateTime
              ? new Date(event.start.dateTime)
              : event.start?.date
                ? new Date(event.start.date)
                : undefined;

            // Process each attendee
            for (const attendee of event.attendees) {
              // Skip the organizer (likely the user themselves)
              if (attendee.organizer || attendee.self) {
                continue;
              }

              const email = attendee.email;
              if (!email) continue;

              // Update or create contact entry
              const existing = contactMap.get(email);
              if (existing) {
                existing.frequency++;
                // Update last event date if this event is more recent
                if (eventDate && (!existing.lastEventDate || eventDate > existing.lastEventDate)) {
                  existing.lastEventDate = eventDate;
                }
              } else {
                contactMap.set(email, {
                  email,
                  name: attendee.displayName || undefined,
                  frequency: 1,
                  lastEventDate: eventDate,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching events from calendar ${cal.id}:`, error);
          // Continue with other calendars
        }
      }

      // Filter by minimum frequency and sort by frequency (descending)
      const frequentContacts = Array.from(contactMap.values())
        .filter((contact) => contact.frequency >= minFrequency)
        .sort((a, b) => b.frequency - a.frequency);

      return frequentContacts;
    } catch (error) {
      console.error('Error identifying frequent contacts:', error);
      throw new Error(
        `Failed to identify frequent contacts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const calendarFriendService = new CalendarFriendServiceImpl();
