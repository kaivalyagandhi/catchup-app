/**
 * Edits API Routes
 *
 * API endpoints for managing pending edits, edit history, and sessions.
 *
 * Requirements: 7.5, 7.6, 7.7, 4.1, 4.4, 4.6, 1.4, 10.2
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { EditService } from '../../edits/edit-service';
import { SessionManager } from '../../edits/session-manager';
import { FuzzyMatcherService } from '../../edits/fuzzy-matcher-service';
import { EditType, EditSource } from '../../types';

const router = Router();
const editService = new EditService();
const sessionManager = new SessionManager();
const fuzzyMatcher = new FuzzyMatcherService();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// Pending Edits Routes
// ============================================

/**
 * GET /api/edits/pending
 * List all pending edits for the authenticated user
 */
router.get('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const edits = await editService.getPendingEdits(userId);
    res.json({ edits });
  } catch (error: any) {
    console.error('Error fetching pending edits:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch pending edits',
    });
  }
});

/**
 * GET /api/edits/pending/:id
 * Get a single pending edit
 */
router.get('/pending/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const edit = await editService.getPendingEdit(req.params.id, userId);

    if (!edit) {
      return res.status(404).json({ error: 'Pending edit not found' });
    }

    res.json({ edit });
  } catch (error: any) {
    console.error('Error fetching pending edit:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch pending edit',
    });
  }
});

/**
 * POST /api/edits/pending
 * Create a new pending edit
 */
router.post('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      sessionId,
      editType,
      targetContactId,
      targetContactName,
      targetGroupId,
      targetGroupName,
      field,
      proposedValue,
      confidenceScore,
      source,
    } = req.body;

    console.log(
      `[EditsAPI] POST /edits/pending - received: editType=${editType}, field=${field}, proposedValue=${proposedValue}`
    );

    if (!editType || proposedValue === undefined || confidenceScore === undefined || !source) {
      return res.status(400).json({
        error: 'Missing required fields: editType, proposedValue, confidenceScore, source',
      });
    }

    // If sessionId is provided, verify it exists; otherwise get or create an active session
    let finalSessionId = sessionId;

    if (sessionId) {
      // Verify the session exists
      const session = await sessionManager.getSession(sessionId, userId);
      if (!session) {
        console.warn(`Session ${sessionId} not found, will use active session instead`);
        finalSessionId = null;
      }
    }

    // If no valid sessionId, get or create an active session
    if (!finalSessionId) {
      let activeSession = await sessionManager.getActiveSession(userId);
      if (!activeSession) {
        activeSession = await sessionManager.startSession(userId);
      }
      finalSessionId = activeSession.id;
    }

    const edit = await editService.createPendingEdit({
      userId,
      sessionId: finalSessionId,
      editType: editType as EditType,
      targetContactId,
      targetContactName,
      targetGroupId,
      targetGroupName,
      field,
      proposedValue,
      confidenceScore,
      source: source as EditSource,
    });

    // Determine if this is a new edit or a duplicate
    // If the edit was created very recently (within 1 second), it's new (201)
    // Otherwise it's a duplicate that was returned from the database (200)
    const isNewEdit = edit.createdAt && Date.now() - edit.createdAt.getTime() < 1000;

    const statusCode = isNewEdit ? 201 : 200;
    const isDuplicate = !isNewEdit;

    res.status(statusCode).json({
      edit,
      isDuplicate,
      message: isDuplicate ? 'Duplicate edit already exists' : 'Edit created successfully',
    });
  } catch (error: any) {
    console.error('Error creating pending edit:', error);
    res.status(500).json({
      error: error.message || 'Failed to create pending edit',
    });
  }
});

/**
 * PATCH /api/edits/pending/:id
 * Update a pending edit
 */
router.patch('/pending/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { targetContactId, targetContactName, targetGroupId, targetGroupName, proposedValue } =
      req.body;

    const edit = await editService.updatePendingEdit(req.params.id, userId, {
      targetContactId,
      targetContactName,
      targetGroupId,
      targetGroupName,
      proposedValue,
    });

    res.json({ edit });
  } catch (error: any) {
    console.error('Error updating pending edit:', error);
    if (error.message === 'Pending edit not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to update pending edit',
    });
  }
});

/**
 * DELETE /api/edits/pending/:id
 * Dismiss a pending edit
 */
router.delete('/pending/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await editService.dismissEdit(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing pending edit:', error);
    if (error.message === 'Pending edit not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to dismiss pending edit',
    });
  }
});

/**
 * POST /api/edits/pending/:id/submit
 * Submit a pending edit (apply and move to history)
 */
router.post('/pending/:id/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const historyEntry = await editService.submitEdit(req.params.id, userId);
    res.json({ historyEntry });
  } catch (error: any) {
    console.error('Error submitting edit:', error);
    if (error.message === 'Pending edit not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to submit edit',
    });
  }
});

/**
 * POST /api/edits/pending/:id/resolve-disambiguation
 * Resolve disambiguation by selecting a contact
 */
router.post(
  '/pending/:id/resolve-disambiguation',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { contactId } = req.body;

      if (!contactId) {
        return res.status(400).json({ error: 'Missing required field: contactId' });
      }

      const edit = await editService.resolveDisambiguation(req.params.id, userId, contactId);
      res.json({ edit });
    } catch (error: any) {
      console.error('Error resolving disambiguation:', error);
      if (error.message === 'Pending edit not found' || error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({
        error: error.message || 'Failed to resolve disambiguation',
      });
    }
  }
);

// ============================================
// Edit History Routes
// ============================================

/**
 * GET /api/edits/history
 * List edit history for the authenticated user with pagination
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const history = await editService.getEditHistory(userId, {
      limit,
      offset,
      dateFrom,
      dateTo,
    });

    res.json({ history });
  } catch (error: any) {
    console.error('Error fetching edit history:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch edit history',
    });
  }
});

// ============================================
// Session Routes
// ============================================

/**
 * POST /api/edits/sessions
 * Start a new chat session
 */
router.post('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const session = await sessionManager.startSession(userId);
    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({
      error: error.message || 'Failed to start session',
    });
  }
});

/**
 * GET /api/edits/sessions/active
 * Get the active session for the user
 */
router.get('/sessions/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const session = await sessionManager.getActiveSession(userId);
    res.json({ session });
  } catch (error: any) {
    console.error('Error fetching active session:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch active session',
    });
  }
});

/**
 * GET /api/edits/sessions/:id
 * Get a session by ID
 */
router.get('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const session = await sessionManager.getSession(req.params.id, userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch session',
    });
  }
});

/**
 * GET /api/edits/sessions/:id/edits
 * Get all edits for a session
 */
router.get('/sessions/:id/edits', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const edits = await sessionManager.getSessionEdits(req.params.id, userId);
    res.json({ edits });
  } catch (error: any) {
    console.error('Error fetching session edits:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch session edits',
    });
  }
});

/**
 * PATCH /api/edits/sessions/:id
 * End a session (preserve edits)
 */
router.patch('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await sessionManager.endSession(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error ending session:', error);
    if (error.message === 'Chat session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to end session',
    });
  }
});

/**
 * DELETE /api/edits/sessions/:id
 * Cancel a session (remove all session edits)
 */
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await sessionManager.cancelSession(req.params.id, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling session:', error);
    if (error.message === 'Chat session not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({
      error: error.message || 'Failed to cancel session',
    });
  }
});

// ============================================
// Fuzzy Search Routes
// ============================================

/**
 * GET /api/edits/search/contacts
 * Search contacts with fuzzy matching
 */
router.get('/search/contacts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ error: 'Missing required query parameter: q' });
    }

    const results = await fuzzyMatcher.searchContacts(userId, query, limit);
    res.json({ results });
  } catch (error: any) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      error: error.message || 'Failed to search contacts',
    });
  }
});

/**
 * GET /api/edits/search/groups
 * Search groups with fuzzy matching
 */
router.get('/search/groups', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ error: 'Missing required query parameter: q' });
    }

    const results = await fuzzyMatcher.searchGroups(userId, query, limit);
    res.json({ results });
  } catch (error: any) {
    console.error('Error searching groups:', error);
    res.status(500).json({
      error: error.message || 'Failed to search groups',
    });
  }
});

export default router;
