/**
 * Interaction Service
 *
 * Business logic layer for interaction logging operations.
 */

import {
  InteractionRepository,
  PostgresInteractionRepository,
  InteractionLogData,
} from './interaction-repository';
import { InteractionLog, InteractionType } from '../types';

/**
 * Interaction Service Interface
 */
export interface InteractionService {
  logInteraction(
    userId: string,
    contactId: string,
    date: Date,
    type: InteractionType,
    notes?: string,
    suggestionId?: string
  ): Promise<InteractionLog>;
  getInteractionHistory(contactId: string, userId: string): Promise<InteractionLog[]>;
}

/**
 * Interaction Service Implementation
 */
export class InteractionServiceImpl implements InteractionService {
  private repository: InteractionRepository;

  constructor(repository?: InteractionRepository) {
    this.repository = repository || new PostgresInteractionRepository();
  }

  async logInteraction(
    userId: string,
    contactId: string,
    date: Date,
    type: InteractionType,
    notes?: string,
    suggestionId?: string
  ): Promise<InteractionLog> {
    // Validate inputs
    if (!userId || !contactId) {
      throw new Error('User ID and Contact ID are required');
    }

    if (!date) {
      throw new Error('Date is required');
    }

    if (!type) {
      throw new Error('Interaction type is required');
    }

    // Validate interaction type
    const validTypes = Object.values(InteractionType);
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid interaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate date is not in the future
    if (date > new Date()) {
      throw new Error('Interaction date cannot be in the future');
    }

    const data: InteractionLogData = {
      userId,
      contactId,
      date,
      type,
      notes,
      suggestionId,
    };

    return await this.repository.create(data);
  }

  async getInteractionHistory(contactId: string, userId: string): Promise<InteractionLog[]> {
    if (!userId || !contactId) {
      throw new Error('User ID and Contact ID are required');
    }

    return await this.repository.findByContactId(contactId, userId);
  }
}

// Export singleton instance
export const interactionService = new InteractionServiceImpl();
