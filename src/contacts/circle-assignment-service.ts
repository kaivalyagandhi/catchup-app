/**
 * Circle Assignment Service
 *
 * Business logic for assigning contacts to Dunbar circles.
 * Handles circle capacity validation, distribution calculations,
 * batch assignments, and rebalancing suggestions.
 *
 * Requirements: 3.3, 4.3, 5.3, 5.5, 14.4
 */

import { PostgresContactRepository, DunbarCircle } from './repository';
import {
  PostgresCircleAssignmentRepository,
  CircleDistribution,
  AssignedBy,
} from './circle-assignment-repository';
import { Contact } from '../types';

/**
 * Circle capacity status
 */
export type CircleCapacityStatus = 'under' | 'optimal' | 'over';

/**
 * Circle capacity information
 */
export interface CircleCapacityInfo {
  circle: DunbarCircle;
  currentSize: number;
  recommendedSize: number;
  maxSize: number;
  status: CircleCapacityStatus;
  message?: string;
}

/**
 * Rebalancing suggestion
 */
export interface RebalancingSuggestion {
  contactId: string;
  contactName: string;
  currentCircle: DunbarCircle;
  suggestedCircle: DunbarCircle;
  reason: string;
  confidence: number;
}

/**
 * Circle assignment data
 */
export interface CircleAssignment {
  contactId: string;
  circle: DunbarCircle;
  confidence?: number;
  userOverride?: boolean;
}

/**
 * Circle definitions based on Dunbar's number
 */
export const CIRCLE_DEFINITIONS = {
  inner: {
    id: 'inner' as DunbarCircle,
    name: 'Inner Circle',
    description: 'Your closest confidants—people you\'d call in a crisis',
    recommendedSize: 10,
    maxSize: 10,
    defaultFrequency: 'weekly',
    color: '#8b5cf6',
  },
  close: {
    id: 'close' as DunbarCircle,
    name: 'Close Friends',
    description: 'Good friends you regularly share life updates with',
    recommendedSize: 25,
    maxSize: 25,
    defaultFrequency: 'biweekly',
    color: '#3b82f6',
  },
  active: {
    id: 'active' as DunbarCircle,
    name: 'Active Friends',
    description: 'People you want to stay connected with regularly',
    recommendedSize: 50,
    maxSize: 50,
    defaultFrequency: 'monthly',
    color: '#10b981',
  },
  casual: {
    id: 'casual' as DunbarCircle,
    name: 'Casual Network',
    description: 'Acquaintances you keep in touch with occasionally',
    recommendedSize: 100,
    maxSize: 100,
    defaultFrequency: 'quarterly',
    color: '#f59e0b',
  },
};

/**
 * Circle Assignment Service Interface
 */
export interface CircleAssignmentService {
  assignToCircle(
    userId: string,
    contactId: string,
    circle: DunbarCircle,
    assignedBy: AssignedBy,
    confidence?: number,
    reason?: string
  ): Promise<Contact>;

  batchAssign(
    userId: string,
    assignments: CircleAssignment[],
    assignedBy: AssignedBy
  ): Promise<void>;

  validateCircleCapacity(userId: string, circle: DunbarCircle): Promise<CircleCapacityInfo>;

  getCircleDistribution(userId: string): Promise<CircleDistribution>;

  suggestCircleRebalancing(userId: string): Promise<RebalancingSuggestion[]>;
}

/**
 * Circle Assignment Service Implementation
 */
export class CircleAssignmentServiceImpl implements CircleAssignmentService {
  constructor(
    private contactRepository: PostgresContactRepository = new PostgresContactRepository(),
    private assignmentRepository: PostgresCircleAssignmentRepository = new PostgresCircleAssignmentRepository()
  ) {}

  /**
   * Assign a contact to a circle
   * Requirements: 3.3, 5.3
   */
  async assignToCircle(
    userId: string,
    contactId: string,
    circle: DunbarCircle,
    assignedBy: AssignedBy = 'user',
    confidence?: number,
    reason?: string
  ): Promise<Contact> {
    // Validate circle name
    if (!this.isValidCircle(circle)) {
      throw new Error(`Invalid circle: ${circle}`);
    }

    // Get current contact state
    const contact = await this.contactRepository.findById(contactId, userId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const fromCircle = contact.dunbarCircle;

    // Update contact's circle
    const updatedContact = await this.contactRepository.assignToCircle(
      contactId,
      userId,
      circle,
      confidence
    );

    // Record assignment in history
    await this.assignmentRepository.create({
      userId,
      contactId,
      fromCircle,
      toCircle: circle,
      assignedBy,
      confidence,
      reason,
    });

    return updatedContact;
  }

  /**
   * Batch assign contacts to circles
   * Requirements: 5.5
   */
  async batchAssign(
    userId: string,
    assignments: CircleAssignment[],
    assignedBy: AssignedBy = 'user'
  ): Promise<void> {
    if (assignments.length === 0) {
      return;
    }

    // Validate all circles
    for (const assignment of assignments) {
      if (!this.isValidCircle(assignment.circle)) {
        throw new Error(`Invalid circle: ${assignment.circle}`);
      }
    }

    // Group assignments by circle for efficient batch updates
    const assignmentsByCircle = new Map<DunbarCircle, string[]>();
    for (const assignment of assignments) {
      const contactIds = assignmentsByCircle.get(assignment.circle) || [];
      contactIds.push(assignment.contactId);
      assignmentsByCircle.set(assignment.circle, contactIds);
    }

    // Get current states for all contacts
    const contactStates = new Map<string, DunbarCircle | undefined>();
    for (const assignment of assignments) {
      const contact = await this.contactRepository.findById(assignment.contactId, userId);
      if (!contact) {
        throw new Error(`Contact not found: ${assignment.contactId}`);
      }
      contactStates.set(assignment.contactId, contact.dunbarCircle);
    }

    // Perform batch updates by circle
    for (const [circle, contactIds] of assignmentsByCircle) {
      await this.contactRepository.batchAssignToCircle(contactIds, userId, circle);
    }

    // Record all assignments in history
    for (const assignment of assignments) {
      await this.assignmentRepository.create({
        userId,
        contactId: assignment.contactId,
        fromCircle: contactStates.get(assignment.contactId),
        toCircle: assignment.circle,
        assignedBy,
        confidence: assignment.confidence,
        reason: assignment.userOverride ? 'User override' : undefined,
      });
    }
  }

  /**
   * Validate circle capacity
   * Requirements: 4.3
   */
  async validateCircleCapacity(userId: string, circle: DunbarCircle): Promise<CircleCapacityInfo> {
    if (!this.isValidCircle(circle)) {
      throw new Error(`Invalid circle: ${circle}`);
    }

    const definition = CIRCLE_DEFINITIONS[circle];
    const distribution = await this.assignmentRepository.getCircleDistribution(userId);
    const currentSize = distribution[circle];

    let status: CircleCapacityStatus;
    let message: string | undefined;

    if (currentSize < definition.recommendedSize) {
      status = 'under';
      message = `You have room for ${definition.recommendedSize - currentSize} more contacts in this circle`;
    } else if (currentSize <= definition.maxSize) {
      status = 'optimal';
      if (currentSize > definition.recommendedSize) {
        message = `This circle is slightly above the recommended size of ${definition.recommendedSize}`;
      }
    } else {
      status = 'over';
      message = `This circle has ${currentSize - definition.maxSize} more contacts than recommended. Consider moving some to a larger circle.`;
    }

    return {
      circle,
      currentSize,
      recommendedSize: definition.recommendedSize,
      maxSize: definition.maxSize,
      status,
      message,
    };
  }

  /**
   * Get circle distribution
   * Requirements: 3.3
   */
  async getCircleDistribution(userId: string): Promise<CircleDistribution> {
    return this.assignmentRepository.getCircleDistribution(userId);
  }

  /**
   * Suggest circle rebalancing
   * Requirements: 14.4
   */
  async suggestCircleRebalancing(userId: string): Promise<RebalancingSuggestion[]> {
    const suggestions: RebalancingSuggestion[] = [];
    const distribution = await this.assignmentRepository.getCircleDistribution(userId);

    // Check each circle for imbalance (>150% of recommended size)
    const circles: DunbarCircle[] = ['inner', 'close', 'active', 'casual'];

    for (const circle of circles) {
      const definition = CIRCLE_DEFINITIONS[circle];
      const currentSize = distribution[circle];
      const threshold = definition.recommendedSize * 1.5;

      if (currentSize > threshold) {
        // Get contacts in this circle
        const contactIds = await this.assignmentRepository.getContactsInCircle(userId, circle);

        // Suggest moving some contacts to the next larger circle
        const targetCircle = this.getNextLargerCircle(circle);
        if (targetCircle) {
          // Get contact details for the most recently added contacts
          const contacts = await Promise.all(
            contactIds
              .slice(0, Math.ceil(currentSize - definition.recommendedSize))
              .map((id) => this.contactRepository.findById(id, userId))
          );

          for (const contact of contacts) {
            if (contact) {
              suggestions.push({
                contactId: contact.id,
                contactName: contact.name,
                currentCircle: circle,
                suggestedCircle: targetCircle,
                reason: `${definition.name} is over capacity (${currentSize}/${definition.recommendedSize} recommended)`,
                confidence: 0.7,
              });
            }
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Validate if a circle name is valid
   */
  private isValidCircle(circle: string): circle is DunbarCircle {
    return ['inner', 'close', 'active', 'casual'].includes(circle);
  }

  /**
   * Get the next larger circle
   */
  private getNextLargerCircle(circle: DunbarCircle): DunbarCircle | null {
    const order: DunbarCircle[] = ['inner', 'close', 'active', 'casual'];
    const index = order.indexOf(circle);
    return index < order.length - 1 ? order[index + 1] : null;
  }
}

// Default instance for backward compatibility
const defaultService = new CircleAssignmentServiceImpl();

export const assignToCircle = (
  userId: string,
  contactId: string,
  circle: DunbarCircle,
  assignedBy: AssignedBy = 'user',
  confidence?: number,
  reason?: string
) => defaultService.assignToCircle(userId, contactId, circle, assignedBy, confidence, reason);

export const batchAssign = (
  userId: string,
  assignments: CircleAssignment[],
  assignedBy: AssignedBy = 'user'
) => defaultService.batchAssign(userId, assignments, assignedBy);

export const validateCircleCapacity = (userId: string, circle: DunbarCircle) =>
  defaultService.validateCircleCapacity(userId, circle);

export const getCircleDistribution = (userId: string) =>
  defaultService.getCircleDistribution(userId);

export const suggestCircleRebalancing = (userId: string) =>
  defaultService.suggestCircleRebalancing(userId);
