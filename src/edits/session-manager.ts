/**
 * Session Manager
 *
 * Manages chat session lifecycle and edit association.
 * Handles starting, ending, and cancelling sessions.
 *
 * Requirements: 4.1, 4.4, 4.6, 4.7
 */

import pool from '../db/connection';
import { ChatSession, ChatSessionStatus, PendingEdit } from '../types';
import { EditRepository } from './edit-repository';

/**
 * Chat Session Repository Interface
 */
export interface ChatSessionRepositoryInterface {
  create(userId: string): Promise<ChatSession>;
  update(id: string, userId: string, data: { status?: ChatSessionStatus; endedAt?: Date }): Promise<ChatSession>;
  findById(id: string, userId: string): Promise<ChatSession | null>;
  findActiveByUserId(userId: string): Promise<ChatSession | null>;
}

/**
 * PostgreSQL Chat Session Repository Implementation
 */
export class ChatSessionRepository implements ChatSessionRepositoryInterface {
  /**
   * Create a new chat session
   */
  async create(userId: string): Promise<ChatSession> {
    const result = await pool.query(
      `INSERT INTO chat_sessions (user_id, status)
       VALUES ($1, 'active')
       RETURNING *`,
      [userId]
    );

    return this.mapRowToChatSession(result.rows[0]);
  }

  /**
   * Update a chat session
   */
  async update(
    id: string,
    userId: string,
    data: { status?: ChatSessionStatus; endedAt?: Date }
  ): Promise<ChatSession> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.endedAt !== undefined) {
      updates.push(`ended_at = $${paramCount++}`);
      values.push(data.endedAt);
    }

    if (updates.length === 0) {
      const session = await this.findById(id, userId);
      if (!session) {
        throw new Error('Chat session not found');
      }
      return session;
    }

    values.push(id, userId);

    const result = await pool.query(
      `UPDATE chat_sessions SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Chat session not found');
    }

    return this.mapRowToChatSession(result.rows[0]);
  }

  /**
   * Find a chat session by ID
   */
  async findById(id: string, userId: string): Promise<ChatSession | null> {
    const result = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToChatSession(result.rows[0]);
  }

  /**
   * Find active session for a user
   */
  async findActiveByUserId(userId: string): Promise<ChatSession | null> {
    const result = await pool.query(
      `SELECT * FROM chat_sessions 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToChatSession(result.rows[0]);
  }

  /**
   * Map database row to ChatSession object
   */
  private mapRowToChatSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status as ChatSessionStatus,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
    };
  }
}

/**
 * Session Manager Interface
 */
export interface SessionManagerInterface {
  startSession(userId: string): Promise<ChatSession>;
  endSession(sessionId: string, userId: string): Promise<void>;
  cancelSession(sessionId: string, userId: string): Promise<void>;
  getSession(sessionId: string, userId: string): Promise<ChatSession | null>;
  getActiveSession(userId: string): Promise<ChatSession | null>;
  getSessionEdits(sessionId: string, userId: string): Promise<PendingEdit[]>;
}

/**
 * Session Manager Implementation
 */
export class SessionManager implements SessionManagerInterface {
  private sessionRepository: ChatSessionRepository;
  private editRepository: EditRepository;

  constructor(
    sessionRepository?: ChatSessionRepository,
    editRepository?: EditRepository
  ) {
    this.sessionRepository = sessionRepository || new ChatSessionRepository();
    this.editRepository = editRepository || new EditRepository();
  }

  /**
   * Start a new session
   * Requirements: 4.1, 4.7
   */
  async startSession(userId: string): Promise<ChatSession> {
    // Close any existing active sessions first
    const existingSession = await this.sessionRepository.findActiveByUserId(userId);
    if (existingSession) {
      await this.sessionRepository.update(existingSession.id, userId, {
        status: 'completed',
        endedAt: new Date(),
      });
    }

    // Create new session
    return this.sessionRepository.create(userId);
  }

  /**
   * End session (preserve edits)
   * Requirements: 4.6
   */
  async endSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId, userId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    await this.sessionRepository.update(sessionId, userId, {
      status: 'completed',
      endedAt: new Date(),
    });
  }

  /**
   * Cancel session (remove all session edits)
   * Requirements: 4.4
   */
  async cancelSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId, userId);
    if (!session) {
      throw new Error('Chat session not found');
    }

    // Delete all pending edits for this session
    await this.editRepository.deleteBySessionId(sessionId, userId);

    // Update session status
    await this.sessionRepository.update(sessionId, userId, {
      status: 'cancelled',
      endedAt: new Date(),
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    return this.sessionRepository.findById(sessionId, userId);
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<ChatSession | null> {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Get all edits for a session
   */
  async getSessionEdits(sessionId: string, userId: string): Promise<PendingEdit[]> {
    return this.editRepository.findBySessionId(sessionId, userId);
  }
}
