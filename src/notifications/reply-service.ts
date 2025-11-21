/**
 * Notification Reply Processing Service
 *
 * Handles parsing and processing of SMS and email replies to notifications.
 * Extracts suggestion actions and contact metadata using NLP.
 */

import { Contact, ExtractedEntities, EnrichmentProposal, Suggestion, SuggestionStatus } from '../types';
import * as voiceService from '../voice/voice-service';
import * as suggestionRepository from '../matching/suggestion-repository';
import * as contactRepository from '../contacts/repository';
import * as interactionRepository from '../contacts/interaction-repository';
import { SMSService, smsService as defaultSMSService } from './sms-service';
import { EmailService, emailService as defaultEmailService } from './email-service';

export interface ReplyAction {
  type: 'accept' | 'dismiss' | 'snooze' | 'none';
  suggestionId?: string;
  dismissalReason?: string;
  snoozeDuration?: number; // in hours
}

export interface ReplyMetadata {
  hasMetadata: boolean;
  entities?: ExtractedEntities;
  contactId?: string;
}

export interface ReplyProcessingResult {
  action: ReplyAction;
  metadata: ReplyMetadata;
  enrichmentProposal?: EnrichmentProposal;
  confirmationSent: boolean;
  error?: string;
}

/**
 * Reply Processing Service
 */
export class ReplyProcessingService {
  private smsService: SMSService;
  private emailService: EmailService;

  constructor(smsService?: SMSService, emailService?: EmailService) {
    this.smsService = smsService || defaultSMSService;
    this.emailService = emailService || defaultEmailService;
  }

  /**
   * Process incoming SMS reply
   */
  async processIncomingSMS(
    from: string,
    body: string,
    userId: string
  ): Promise<ReplyProcessingResult> {
    console.log(`Processing SMS reply from ${from} for user ${userId}`);
    return await this.processReply(body, userId, from, 'sms');
  }

  /**
   * Process incoming email reply
   */
  async processIncomingEmail(
    from: string,
    subject: string,
    body: string,
    userId: string
  ): Promise<ReplyProcessingResult> {
    console.log(`Processing email reply from ${from} for user ${userId}`);
    // Combine subject and body for processing
    const fullText = `${subject}\n\n${body}`;
    return await this.processReply(fullText, userId, from, 'email');
  }

  /**
   * Process reply text (common logic for SMS and email)
   */
  private async processReply(
    text: string,
    userId: string,
    replyAddress: string,
    channel: 'sms' | 'email'
  ): Promise<ReplyProcessingResult> {
    const result: ReplyProcessingResult = {
      action: { type: 'none' },
      metadata: { hasMetadata: false },
      confirmationSent: false,
    };

    try {
      // Parse for suggestion actions
      const action = this.parseSuggestionAction(text);
      result.action = action;

      // If action found, process it
      if (action.type !== 'none' && action.suggestionId) {
        await this.processSuggestionAction(action, userId);
      }

      // Extract contact metadata from reply
      const entities = await voiceService.extractEntities(text);

      if (this.hasSignificantMetadata(entities)) {
        result.metadata = {
          hasMetadata: true,
          entities,
        };

        // Try to determine which contact this metadata is about
        // For now, we'll need the user to specify or we'll use context from the original notification
        const contacts = await contactRepository.findAll(userId);
        const contact = await this.determineContactFromContext(text, contacts);

        // Generate enrichment proposal
        result.enrichmentProposal = voiceService.generateEnrichmentConfirmation(
          entities,
          contact,
          contacts
        );

        // Send confirmation message
        const confirmationText = this.generateEnrichmentConfirmationText(
          result.enrichmentProposal,
          contact
        );

        if (channel === 'sms') {
          const smsResult = await this.smsService.sendSMS(replyAddress, confirmationText);
          result.confirmationSent = smsResult.success;
        } else {
          const emailResult = await this.emailService.sendEmail({
            to: replyAddress,
            subject: 'Confirm Contact Updates',
            text: confirmationText,
          });
          result.confirmationSent = emailResult.success;
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error processing reply:', error);
      result.error = errorMessage;
      return result;
    }
  }

  /**
   * Parse reply text for suggestion actions
   */
  private parseSuggestionAction(text: string): ReplyAction {
    const lowerText = text.toLowerCase();

    // Check for accept
    if (lowerText.includes('accept') || lowerText.includes('yes') || lowerText.includes('confirm')) {
      return { type: 'accept' };
    }

    // Check for dismiss
    if (lowerText.includes('dismiss') || lowerText.includes('no') || lowerText.includes('skip')) {
      // Try to extract dismissal reason
      const dismissalReason = this.extractDismissalReason(text);
      return { type: 'dismiss', dismissalReason };
    }

    // Check for snooze
    if (lowerText.includes('snooze') || lowerText.includes('remind') || lowerText.includes('later')) {
      // Try to extract snooze duration
      const snoozeDuration = this.extractSnoozeDuration(text);
      return { type: 'snooze', snoozeDuration };
    }

    return { type: 'none' };
  }

  /**
   * Extract dismissal reason from text
   */
  private extractDismissalReason(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('met') && lowerText.includes('recently')) {
      return 'met too recently';
    }

    if (lowerText.includes('busy') || lowerText.includes('no time')) {
      return 'too busy';
    }

    if (lowerText.includes('not interested')) {
      return 'not interested';
    }

    return undefined;
  }

  /**
   * Extract snooze duration from text (in hours)
   */
  private extractSnoozeDuration(text: string): number {
    const lowerText = text.toLowerCase();

    // Check for specific durations
    if (lowerText.includes('1 day') || lowerText.includes('tomorrow')) {
      return 24;
    }

    if (lowerText.includes('1 week') || lowerText.includes('next week')) {
      return 168; // 7 days
    }

    if (lowerText.includes('2 weeks')) {
      return 336; // 14 days
    }

    // Default to 24 hours
    return 24;
  }

  /**
   * Process suggestion action (accept, dismiss, snooze)
   */
  private async processSuggestionAction(action: ReplyAction, userId: string): Promise<void> {
    if (!action.suggestionId) {
      return;
    }

    const suggestion = await suggestionRepository.findById(action.suggestionId, userId);
    if (!suggestion) {
      throw new Error(`Suggestion ${action.suggestionId} not found`);
    }

    switch (action.type) {
      case 'accept':
        await suggestionRepository.update(action.suggestionId, userId, {
          status: SuggestionStatus.ACCEPTED,
        });

        // Create interaction log
        await interactionRepository.create({
          userId,
          contactId: suggestion.contactId,
          date: suggestion.proposedTimeslot.start,
          type: 'hangout',
          suggestionId: action.suggestionId,
        });
        break;

      case 'dismiss':
        await suggestionRepository.update(action.suggestionId, userId, {
          status: SuggestionStatus.DISMISSED,
          dismissalReason: action.dismissalReason,
        });

        // If dismissed as "met too recently", update last contact date
        if (action.dismissalReason === 'met too recently') {
          await contactRepository.update(suggestion.contactId, userId, {
            lastContactDate: new Date(),
          });
        }
        break;

      case 'snooze':
        const snoozedUntil = new Date();
        snoozedUntil.setHours(snoozedUntil.getHours() + (action.snoozeDuration || 24));

        await suggestionRepository.update(action.suggestionId, userId, {
          status: SuggestionStatus.SNOOZED,
          snoozedUntil,
        });
        break;
    }
  }

  /**
   * Check if extracted entities contain significant metadata
   */
  private hasSignificantMetadata(entities: ExtractedEntities): boolean {
    return (
      Object.keys(entities.fields || {}).length > 0 ||
      (entities.tags && entities.tags.length > 0) ||
      (entities.groups && entities.groups.length > 0) ||
      entities.lastContactDate !== undefined
    );
  }

  /**
   * Determine which contact the metadata is about from context
   */
  private async determineContactFromContext(
    text: string,
    contacts: Contact[]
  ): Promise<Contact | null> {
    // Use the voice service's disambiguation logic
    return await voiceService.disambiguateContact(text, contacts);
  }

  /**
   * Generate confirmation text for enrichment proposal
   */
  private generateEnrichmentConfirmationText(
    proposal: EnrichmentProposal,
    contact: Contact | null
  ): string {
    const contactName = contact ? contact.name : 'Unknown Contact';

    let text = `CatchUp: Confirm updates for ${contactName}?\n\n`;

    if (proposal.requiresContactSelection) {
      text += 'Please specify which contact this is about.\n\n';
    }

    text += 'Proposed changes:\n';

    for (const item of proposal.items) {
      if (!item.accepted) continue;

      switch (item.type) {
        case 'field':
          text += `• ${item.action} ${item.field}: ${item.value}\n`;
          break;
        case 'tag':
          text += `• Add tag: ${item.value}\n`;
          break;
        case 'group':
          text += `• Add to group: ${item.value}\n`;
          break;
        case 'lastContactDate':
          text += `• Update last contact: ${new Date(item.value).toLocaleDateString()}\n`;
          break;
      }
    }

    text += '\nReply:\n';
    text += '• "Accept all" to confirm\n';
    text += '• "Reject all" to cancel\n';
    text += '• "Modify" to make changes\n';

    return text;
  }
}

// Export singleton instance (lazy initialization to avoid errors in tests)
let _replyProcessingService: ReplyProcessingService | null = null;

export const replyProcessingService = {
  get instance(): ReplyProcessingService {
    if (!_replyProcessingService) {
      _replyProcessingService = new ReplyProcessingService();
    }
    return _replyProcessingService;
  },
  processIncomingSMS(from: string, body: string, userId: string) {
    return this.instance.processIncomingSMS(from, body, userId);
  },
  processIncomingEmail(from: string, subject: string, body: string, userId: string) {
    return this.instance.processIncomingEmail(from, subject, body, userId);
  },
};
