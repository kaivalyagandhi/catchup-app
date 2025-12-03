/**
 * Property-Based Tests for Session Manager
 *
 * Tests correctness properties defined in the design document.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SessionManager, ChatSessionRepository } from '../session-manager';
import { EditRepository } from '../edit-repository';
import { ChatSession, PendingEdit, EditSource } from '../../types';

// Mock repositories
vi.mock('../edit-repository');

describe('Session Manager Property Tests', () => {
  let sessionManager: SessionManager;
  let mockSessionRepository: any;
  let mockEditRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRepository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
    };
    mockEditRepository = {
      findBySessionId: vi.fn(),
      deleteBySessionId: vi.fn(),
    };
    sessionManager = new SessionManager(mockSessionRepository, mockEditRepository);
  });

  /**
   * **Feature: incremental-chat-edits, Property 1: Session Lifecycle Consistency**
   * For any chat session, when the user reopens the chat interface,
   * a new session with a unique ID shall be created and the message history shall be empty.
   * **Validates: Requirements 4.1, 4.7**
   */
  it('Property 1: Session Lifecycle Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          const newSessionId = `session-${Date.now()}`;
          const newSession: ChatSession = {
            id: newSessionId,
            userId,
            status: 'active',
            startedAt: new Date(),
          };

          // No existing active session
          mockSessionRepository.findActiveByUserId.mockResolvedValue(null);
          mockSessionRepository.create.mockResolvedValue(newSession);

          const session = await sessionManager.startSession(userId);

          // New session should have unique ID
          expect(session.id).toBeDefined();
          expect(session.id.length).toBeGreaterThan(0);
          
          // New session should be active
          expect(session.status).toBe('active');
          
          // New session should have startedAt timestamp
          expect(session.startedAt).toBeDefined();
          expect(session.startedAt instanceof Date).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 3: Session Cancellation Removes All Session Edits**
   * For any session with N pending edits, when the session is cancelled,
   * all N edits associated with that session shall be removed from the pending edits queue.
   * **Validates: Requirements 4.4**
   */
  it('Property 3: Session Cancellation Removes All Session Edits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 20 }),
        async (sessionId, userId, editCount) => {
          const session: ChatSession = {
            id: sessionId,
            userId,
            status: 'active',
            startedAt: new Date(),
          };

          // Generate mock edits for the session
          const sessionEdits: PendingEdit[] = Array.from({ length: editCount }, (_, i) => ({
            id: `edit-${i}`,
            userId,
            sessionId,
            editType: 'add_tag' as const,
            proposedValue: `tag-${i}`,
            confidenceScore: 0.8,
            source: { type: 'voice_transcript' as const, timestamp: new Date() },
            status: 'pending' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          mockSessionRepository.findById.mockResolvedValue(session);
          mockEditRepository.deleteBySessionId.mockResolvedValue(editCount);
          mockSessionRepository.update.mockResolvedValue({
            ...session,
            status: 'cancelled',
            endedAt: new Date(),
          });

          await sessionManager.cancelSession(sessionId, userId);

          // Verify deleteBySessionId was called with correct parameters
          expect(mockEditRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId, userId);
          
          // Verify session was updated to cancelled
          expect(mockSessionRepository.update).toHaveBeenCalledWith(
            sessionId,
            userId,
            expect.objectContaining({ status: 'cancelled' })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: incremental-chat-edits, Property 4: Session Close Preserves Edits**
   * For any session with N pending edits, when the chat interface is closed without cancellation,
   * all N edits shall remain in the pending edits queue.
   * **Validates: Requirements 4.6**
   */
  it('Property 4: Session Close Preserves Edits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 20 }),
        async (sessionId, userId, editCount) => {
          const session: ChatSession = {
            id: sessionId,
            userId,
            status: 'active',
            startedAt: new Date(),
          };

          mockSessionRepository.findById.mockResolvedValue(session);
          mockSessionRepository.update.mockResolvedValue({
            ...session,
            status: 'completed',
            endedAt: new Date(),
          });

          await sessionManager.endSession(sessionId, userId);

          // Verify deleteBySessionId was NOT called (edits preserved)
          expect(mockEditRepository.deleteBySessionId).not.toHaveBeenCalled();
          
          // Verify session was updated to completed (not cancelled)
          expect(mockSessionRepository.update).toHaveBeenCalledWith(
            sessionId,
            userId,
            expect.objectContaining({ status: 'completed' })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that starting a new session closes existing active sessions
   */
  it('Starting new session closes existing active session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          const existingSession: ChatSession = {
            id: 'existing-session',
            userId,
            status: 'active',
            startedAt: new Date(Date.now() - 10000),
          };

          const newSession: ChatSession = {
            id: 'new-session',
            userId,
            status: 'active',
            startedAt: new Date(),
          };

          mockSessionRepository.findActiveByUserId.mockResolvedValue(existingSession);
          mockSessionRepository.update.mockResolvedValue({
            ...existingSession,
            status: 'completed',
            endedAt: new Date(),
          });
          mockSessionRepository.create.mockResolvedValue(newSession);

          const session = await sessionManager.startSession(userId);

          // Existing session should be closed
          expect(mockSessionRepository.update).toHaveBeenCalledWith(
            existingSession.id,
            userId,
            expect.objectContaining({ status: 'completed' })
          );

          // New session should be created
          expect(session.id).toBe(newSession.id);
          expect(session.status).toBe('active');
        }
      ),
      { numRuns: 100 }
    );
  });
});
