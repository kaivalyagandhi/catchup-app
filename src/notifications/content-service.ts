/**
 * Notification Content Service
 *
 * Generates notification text for suggestions with timeslot, contact name,
 * reasoning, and action options.
 */

import { Suggestion, Contact, TimeSlot } from '../types';

export interface NotificationContent {
  sms: string;
  email: {
    subject: string;
    text: string;
    html: string;
  };
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a time for display
 */
function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleTimeString('en-US', options);
}

/**
 * Format a timeslot for display
 */
function formatTimeslot(timeslot: TimeSlot): string {
  const date = formatDate(timeslot.start);
  const startTime = formatTime(timeslot.start);
  const endTime = formatTime(timeslot.end);
  return `${date} ${startTime}-${endTime}`;
}

/**
 * Generate notification text for SMS
 */
export function generateNotificationText(suggestion: Suggestion, contact: Contact): string {
  const timeslot = formatTimeslot(suggestion.proposedTimeslot);
  const name = contact.name;
  const reasoning = suggestion.reasoning;

  // Format concisely for SMS
  const message = `CatchUp: Connect with ${name}?\n\n` +
    `When: ${timeslot}\n` +
    `Why: ${reasoning}\n\n` +
    `Reply:\n` +
    `• "Accept" to confirm\n` +
    `• "Dismiss" to skip\n` +
    `• "Snooze" to remind later`;

  return message;
}

/**
 * Generate draft message for accepted suggestion
 */
export function generateDraftMessage(suggestion: Suggestion, contact: Contact): string {
  const timeslot = formatTimeslot(suggestion.proposedTimeslot);
  const name = contact.name.split(' ')[0]; // Use first name

  const message = `Hey ${name}! Want to catch up ${timeslot.toLowerCase()}? Let me know if that works for you!`;

  return message;
}

/**
 * Generate complete notification content (SMS and email)
 */
export function generateNotificationContent(
  suggestion: Suggestion,
  contact: Contact
): NotificationContent {
  const timeslot = formatTimeslot(suggestion.proposedTimeslot);
  const name = contact.name;
  const reasoning = suggestion.reasoning;

  // SMS content (concise)
  const sms = generateNotificationText(suggestion, contact);

  // Email content (more detailed)
  const emailSubject = `Time to catch up with ${name}?`;

  const emailText =
    `Hi there!\n\n` +
    `It looks like a good time to connect with ${name}.\n\n` +
    `Proposed Time: ${timeslot}\n` +
    `Reason: ${reasoning}\n\n` +
    `What would you like to do?\n` +
    `• Accept: Confirm this catchup and we'll help you reach out\n` +
    `• Dismiss: Skip this suggestion\n` +
    `• Snooze: Remind me later\n\n` +
    `Reply to this email with your choice, or visit the CatchUp app to take action.\n\n` +
    `Best,\n` +
    `The CatchUp Team`;

  const emailHtml =
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
    `<h2 style="color: #333;">Time to catch up with ${name}?</h2>` +
    `<p>It looks like a good time to connect with <strong>${name}</strong>.</p>` +
    `<div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">` +
    `<p style="margin: 5px 0;"><strong>Proposed Time:</strong> ${timeslot}</p>` +
    `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reasoning}</p>` +
    `</div>` +
    `<h3 style="color: #333;">What would you like to do?</h3>` +
    `<ul style="list-style: none; padding: 0;">` +
    `<li style="margin: 10px 0;">✅ <strong>Accept:</strong> Confirm this catchup and we'll help you reach out</li>` +
    `<li style="margin: 10px 0;">❌ <strong>Dismiss:</strong> Skip this suggestion</li>` +
    `<li style="margin: 10px 0;">⏰ <strong>Snooze:</strong> Remind me later</li>` +
    `</ul>` +
    `<p>Reply to this email with your choice, or visit the CatchUp app to take action.</p>` +
    `<p style="color: #666; font-size: 12px; margin-top: 30px;">Best,<br>The CatchUp Team</p>` +
    `</div>`;

  return {
    sms,
    email: {
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    },
  };
}
