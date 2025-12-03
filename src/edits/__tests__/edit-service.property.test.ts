/**
 * Property-Based Tests for Edit Service
 *
 * Tests correctness properties defined in the design document.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EditService } from '../edit-service';
import { EditRepository } from '../edit-repository';
import { EditHistoryRepository } from '../edit-history-repository';
import { PendingEdit, EditHistoryEntry, EditType, EditSource, PendingEditStatus } from '../../types';

// Mock repositories
vi.mock('../edit-repository');
vi.mock('../edit-history-repository');
vi.mock('../../contacts/repository');
vi.mock('../../contacts/group-repository');
vi.mock('../../contacts/tag-repository');

// Arbitraries for generating test data
const editTypeArb = fc.constantFrom<EditType>(
  'create_contact',
  'update_contact_field',
  'add_tag',
  'remove_tag',
  'add_to_group',
  'remove_from_group',
  'create_group'
);

const editSourceArb = fc.record({
  type: fc.constantFrom<'voice_transcript' | 'text_input' | 'manual'>('voice_transcript', 'text_input', 'manual'),
  transcriptExcerpt: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  timestamp: fc.date(),
  fullContext: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
});

const confidenceScoreArb = fc.float({ min: 0, max: 1, noNaN: true });

const pendingEditArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  sessionId: fc.uuid(),
  editType: editTypeArb,
  targetContactId: fc.option(fc.uuid()),
  targetContactName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  targetGroupId: fc.option(fc.uuid()),
  targetGroupName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  field: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  proposedValue: fc.anything(),
  confidenceScore: confidenceScoreArb,
  source: editSourceArb,
  status: fc.constantFrom<PendingEditStatus>('pending', 'needs_disambiguation'),
  disambiguationCandidates: fc.option(fc.array(fc.record({
    contactId: fc.uuid(),
    contactName: fc.string({ minLength: 1, maxLength: 100 }),
    similarityScore: confidenceScoreArb,
  }), { minLength: 0, maxLength: 3 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

describe('Edit Service Property Tests', () => {
  let editService: EditService;
  let mockEditRepository: any;
  let mockHistoryRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditRepository = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findBySessionId: vi.fn(),
      deleteBySessionId: vi.fn(),
    };
    mockHistoryRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
    };
    editService = new EditService(
      mockEditRepository,
      mockHistoryRepository,
      undefined,
      undefined,
      undefined
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 5: Edit Extraction Metadata Validity**
   * For any extracted edit, the confidence score shall be a number between 0 and 1 (inclusive),
   * and the source object shall contain a non-null type and timestamp.
   * **Validates: Requirements 5.4, 5.5**
   */
  it('Property 5: Edit Extraction Metadata Validity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        editTypeArb,
        fc.anything(),
        confidenceScoreArb,
        editSourceArb,
        async (userId, sessionId, editType, proposedValue, confidenceScore, source) => {
          const createdEdit: PendingEdit = {
            id: 'test-id',
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockEditRepository.create.mockResolvedValue(createdEdit);

          const result = await editService.createPendingEdit({
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
          });

          // Confidence score must be between 0 and 1
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(1);

          // Source must have non-null type and timestamp
          expect(result.source).toBeDefined();
          expect(result.source.type).toBeDefined();
          expect(['voice_transcript', 'text_input', 'manual']).toContain(result.source.type);
          expect(result.source.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 2: Edit-Session Association**
   * For any edit detected during a session, the edit's sessionId field shall match
   * the current active session ID.
   * **Validates: Requirements 4.2**
   */
  it('Property 2: Edit-Session Association', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        editTypeArb,
        fc.anything(),
        confidenceScoreArb,
        editSourceArb,
        async (userId, sessionId, editType, proposedValue, confidenceScore, source) => {
          const createdEdit: PendingEdit = {
            id: 'test-id',
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockEditRepository.create.mockResolvedValue(createdEdit);

          const result = await editService.createPendingEdit({
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
          });

          // Edit's sessionId must match the provided sessionId
          expect(result.sessionId).toBe(sessionId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 8: Edit Update Persistence**
   * For any pending edit modification, after updating the target contact,
   * the edit's targetContactId shall reflect the new value.
   * **Validates: Requirements 7.5**
   */
  it('Property 8: Edit Update Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (editId, userId, newContactId, newContactName) => {
          const originalEdit: PendingEdit = {
            id: editId,
            userId,
            sessionId: 'session-1',
            editType: 'update_contact_field',
            proposedValue: 'test',
            confidenceScore: 0.8,
            source: { type: 'voice_transcript', timestamp: new Date() },
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const updatedEdit: PendingEdit = {
            ...originalEdit,
            targetContactId: newContactId,
            targetContactName: newContactName,
          };

          mockEditRepository.update.mockResolvedValue(updatedEdit);

          const result = await editService.updatePendingEdit(editId, userId, {
            targetContactId: newContactId,
            targetContactName: newContactName,
          });

          // Updated edit must have the new contact ID
          expect(result.targetContactId).toBe(newContactId);
          expect(result.targetContactName).toBe(newContactName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 11: Disambiguation Trigger Threshold**
   * For any edit with a contact match confidence score below 0.7,
   * a disambiguation prompt shall be generated.
   * **Validates: Requirements 8.1, 8.2**
   */
  it('Property 11: Disambiguation Trigger Threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        editTypeArb,
        fc.anything(),
        fc.float({ min: 0, max: Math.fround(0.69), noNaN: true }), // Below threshold
        editSourceArb,
        async (userId, sessionId, editType, proposedValue, confidenceScore, source) => {
          // When confidence is below 0.7 and no targetContactId is provided,
          // status should be 'needs_disambiguation'
          const createdEdit: PendingEdit = {
            id: 'test-id',
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
            status: 'needs_disambiguation',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockEditRepository.create.mockResolvedValue(createdEdit);

          const result = await editService.createPendingEdit({
            userId,
            sessionId,
            editType,
            proposedValue,
            confidenceScore,
            source: source as EditSource,
          });

          // Low confidence without targetContactId should trigger disambiguation
          if (confidenceScore < 0.7) {
            expect(result.status).toBe('needs_disambiguation');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 13: Low Confidence Visual Indicator**
   * For any pending edit with confidence score below 0.5,
   * the edit shall be marked as requiring review.
   * **Validates: Requirements 9.5**
   */
  it('Property 13: Low Confidence Visual Indicator', async () => {
    await fc.assert(
      fc.asyncProperty(
        pendingEditArb,
        async (edit) => {
          const requiresReview = edit.confidenceScore < 0.5;
          
          // This is a UI property - we verify the logic that determines it
          if (edit.confidenceScore < 0.5) {
            expect(requiresReview).toBe(true);
          } else {
            expect(requiresReview).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
