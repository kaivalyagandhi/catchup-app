/**
 * Calendar Event Generator
 *
 * Generates realistic calendar events for testing time-bound suggestions.
 * Creates availability slots across multiple days with varied times.
 */

import pool from '../db/connection';
import { CalendarEvent } from '../types';

export enum TimeOfDay {
  Morning = 'morning',    // 8am-12pm
  Afternoon = 'afternoon', // 12pm-5pm
  Evening = 'evening'      // 5pm-9pm
}

export interface SlotOptions {
  includeWeekends?: boolean;
  timesOfDay?: TimeOfDay[];
  slotDuration?: number; // minutes
}

/**
 * Calendar Event Generator Implementation
 */
export class CalendarEventGenerator {
  /**
   * Generate availability slots for a user across a date range
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async generateAvailabilitySlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    options: SlotOptions = {}
  ): Promise<CalendarEvent[]> {
    const {
      includeWeekends = true,
      timesOfDay = [TimeOfDay.Morning, TimeOfDay.Afternoon, TimeOfDay.Evening],
      slotDuration = 60 // 1 hour default
    } = options;

    const client = await pool.connect();
    const events: CalendarEvent[] = [];

    try {
      await client.query('BEGIN');

      // Iterate through each day in the range
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Skip weekends if not included
        if (isWeekend && !includeWeekends) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Generate slots for each time of day
        for (const timeOfDay of timesOfDay) {
          const slot = this.createSlotForTimeOfDay(
            currentDate,
            timeOfDay,
            slotDuration
          );

          // Insert into database
          const result = await client.query<{
            id: string;
            user_id: string;
            summary: string;
            start_time: Date;
            end_time: Date;
            timezone: string;
            is_busy: boolean;
            google_event_id: string;
            calendar_id: string;
            created_at: Date;
          }>(
            `INSERT INTO calendar_events (
              user_id, google_event_id, calendar_id, summary, start_time, end_time, timezone, is_busy
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
              userId,
              `test-event-${Date.now()}-${Math.random()}`, // google_event_id
              'test-calendar', // calendar_id
              slot.title, // summary
              slot.startTime,
              slot.endTime,
              slot.timezone,
              !slot.isAvailable // is_busy (inverse of isAvailable)
            ]
          );

          const row = result.rows[0];
          events.push({
            id: row.id,
            userId: row.user_id,
            title: row.summary,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone,
            isAvailable: !row.is_busy, // Convert is_busy back to isAvailable
            source: 'test',
            createdAt: row.created_at
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await client.query('COMMIT');
      return events;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a time slot for a specific time of day
   */
  private createSlotForTimeOfDay(
    date: Date,
    timeOfDay: TimeOfDay,
    durationMinutes: number
  ): {
    title: string;
    startTime: Date;
    endTime: Date;
    timezone: string;
    isAvailable: boolean;
  } {
    const startTime = new Date(date);
    
    // Set the hour based on time of day
    switch (timeOfDay) {
      case TimeOfDay.Morning:
        // Random time between 8am-11am
        startTime.setHours(8 + Math.floor(Math.random() * 3), 0, 0, 0);
        break;
      case TimeOfDay.Afternoon:
        // Random time between 12pm-4pm
        startTime.setHours(12 + Math.floor(Math.random() * 4), 0, 0, 0);
        break;
      case TimeOfDay.Evening:
        // Random time between 5pm-8pm
        startTime.setHours(17 + Math.floor(Math.random() * 3), 0, 0, 0);
        break;
    }

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    return {
      title: `Available - ${timeOfDay}`,
      startTime,
      endTime,
      timezone: 'UTC', // TODO: Use user's timezone preference
      isAvailable: true
    };
  }

  /**
   * Delete all calendar events for a user
   */
  async deleteUserCalendarEvents(userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE user_id = $1',
      [userId]
    );
    return result.rowCount || 0;
  }

  /**
   * Get calendar events for a user within a date range
   */
  async getCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const result = await pool.query<{
      id: string;
      user_id: string;
      summary: string;
      start_time: Date;
      end_time: Date;
      timezone: string;
      is_busy: boolean;
      created_at: Date;
    }>(
      `SELECT * FROM calendar_events
       WHERE user_id = $1
       AND start_time >= $2
       AND end_time <= $3
       ORDER BY start_time ASC`,
      [userId, startDate, endDate]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.summary,
      startTime: row.start_time,
      endTime: row.end_time,
      timezone: row.timezone,
      isAvailable: !row.is_busy, // Convert is_busy to isAvailable
      source: 'test',
      createdAt: row.created_at
    }));
  }
}

// Export singleton instance
export const calendarEventGenerator = new CalendarEventGenerator();
