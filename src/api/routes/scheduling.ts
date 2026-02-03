/**
 * Scheduling API Routes
 *
 * API endpoints for catchup plan management.
 * Requirements: 2.14, 9.1-9.10, 10.1-10.10, 12.1-12.8
 */

import { Router, Request, Response } from 'express';
import * as schedulingService from '../../scheduling/scheduling-service';
import * as conflictResolutionService from '../../scheduling/conflict-resolution-service';
import { CreatePlanData, PlanFilters, FinalizePlanData } from '../../types/scheduling';

const router = Router();

/**
 * POST /api/scheduling/plans - Create a new catchup plan
 */
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const planData: CreatePlanData = req.body;

    if (!planData.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!planData.invitees || planData.invitees.length === 0) {
      return res.status(400).json({ error: 'At least one invitee is required' });
    }

    if (!planData.dateRangeStart || !planData.dateRangeEnd) {
      return res.status(400).json({ error: 'dateRangeStart and dateRangeEnd are required' });
    }

    if (!planData.duration || planData.duration <= 0) {
      return res.status(400).json({ error: 'duration must be a positive number' });
    }

    const result = await schedulingService.createPlan(planData);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating plan:', error);
    if (error.message.includes('Date range')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

/**
 * GET /api/scheduling/plans - List plans for a user
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const { userId, status, type } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const filters: PlanFilters = {};
    if (status) {
      filters.status = status as any;
    }
    if (type) {
      filters.type = type as 'individual' | 'group';
    }

    const plans = await schedulingService.getPlansByUser(userId as string, filters);
    res.json(plans);
  } catch (error) {
    console.error('Error listing plans:', error);
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

/**
 * GET /api/scheduling/plans/:id - Get plan details
 */
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const plan = await schedulingService.getPlanById(id, userId as string);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error getting plan:', error);
    res.status(500).json({ error: 'Failed to get plan' });
  }
});


/**
 * PUT /api/scheduling/plans/:id - Update a plan
 */
router.put('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, ...updates } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const plan = await schedulingService.updatePlan(id, userId, updates);
    res.json(plan);
  } catch (error: any) {
    console.error('Error updating plan:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot edit') || error.message.includes('Date range')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * POST /api/scheduling/plans/:id/finalize - Finalize a plan
 */
router.post('/plans/:id/finalize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, finalizedTime, location, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!finalizedTime) {
      return res.status(400).json({ error: 'finalizedTime is required' });
    }

    const data: FinalizePlanData = { finalizedTime, location, notes };
    const plan = await schedulingService.finalizePlan(id, userId, data);
    res.json(plan);
  } catch (error: any) {
    console.error('Error finalizing plan:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('already')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to finalize plan' });
  }
});

/**
 * DELETE /api/scheduling/plans/:id - Cancel a plan
 */
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    await schedulingService.cancelPlan(id, userId as string);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error cancelling plan:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('already cancelled')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to cancel plan' });
  }
});

/**
 * GET /api/scheduling/plans/:id/ai-suggestions - Get AI suggestions for conflict resolution
 */
router.get('/plans/:id/ai-suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const analysis = await conflictResolutionService.analyzeConflicts(id, userId as string);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error getting AI suggestions:', error);
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to get AI suggestions' });
  }
});

/**
 * POST /api/scheduling/plans/:id/invitees - Add an invitee to a plan
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
router.post('/plans/:id/invitees', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, contactId, attendanceType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const inviteLink = await schedulingService.addInviteeToPlan(id, userId, {
      contactId,
      attendanceType: attendanceType || 'must_attend',
    });

    res.status(201).json(inviteLink);
  } catch (error: any) {
    console.error('Error adding invitee:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot edit') || error.message.includes('already an invitee')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add invitee' });
  }
});

/**
 * DELETE /api/scheduling/plans/:id/invitees/:contactId - Remove an invitee from a plan
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
router.delete('/plans/:id/invitees/:contactId', async (req: Request, res: Response) => {
  try {
    const { id, contactId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    await schedulingService.removeInviteeFromPlan(id, userId as string, contactId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing invitee:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot edit') || error.message.includes('Cannot remove the last')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to remove invitee' });
  }
});

/**
 * PUT /api/scheduling/plans/:id/invitees/:contactId - Update an invitee's attendance type
 * Requirements: 12.1 - Allow editing a plan before finalization
 */
router.put('/plans/:id/invitees/:contactId', async (req: Request, res: Response) => {
  try {
    const { id, contactId } = req.params;
    const { userId, attendanceType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!attendanceType || !['must_attend', 'nice_to_have'].includes(attendanceType)) {
      return res.status(400).json({ error: 'Valid attendanceType is required (must_attend or nice_to_have)' });
    }

    await schedulingService.updateInviteeAttendance(id, userId, contactId, attendanceType);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error updating invitee:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot edit')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update invitee' });
  }
});

/**
 * POST /api/scheduling/plans/:id/reminders - Send reminders to pending invitees
 * Requirements: 12.5 - Initiator can send reminders to invitees who haven't responded
 */
router.post('/plans/:id/reminders', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await schedulingService.sendReminders(id, userId);
    res.json({
      success: true,
      remindersSent: result.remindersSent,
      pendingInvitees: result.pendingInvitees,
      message: `Reminders sent to ${result.remindersSent} invitee${result.remindersSent !== 1 ? 's' : ''}`
    });
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Please wait') || 
        error.message.includes('All invitees') || 
        error.message.includes('Reminders can only')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

/**
 * GET /api/scheduling/plans/archived - Get archived plans for a user
 * Requirements: 10.10 - Show archived plans in Past filter
 */
router.get('/plans/archived', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const plans = await schedulingService.getArchivedPlans(userId as string);
    res.json(plans);
  } catch (error) {
    console.error('Error getting archived plans:', error);
    res.status(500).json({ error: 'Failed to get archived plans' });
  }
});

/**
 * POST /api/scheduling/plans/:id/archive - Manually archive a plan
 * Requirements: 10.10 - Allow manual archiving
 */
router.post('/plans/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await schedulingService.archivePlan(id, userId);
    res.json({ success: true, message: 'Plan archived successfully' });
  } catch (error: any) {
    console.error('Error archiving plan:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Only completed')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to archive plan' });
  }
});

/**
 * POST /api/scheduling/plans/:id/unarchive - Restore an archived plan
 * Requirements: 10.10 - Allow restoring archived plans
 */
router.post('/plans/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await schedulingService.unarchivePlan(id, userId);
    res.json({ success: true, message: 'Plan restored successfully' });
  } catch (error: any) {
    console.error('Error unarchiving plan:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to restore plan' });
  }
});

/**
 * POST /api/scheduling/auto-archive - Trigger auto-archiving of old plans
 * Requirements: 10.10 - Auto-archive completed plans after 7 days
 */
router.post('/auto-archive', async (req: Request, res: Response) => {
  try {
    const archivedCount = await schedulingService.autoArchiveOldPlans();
    res.json({ 
      success: true, 
      archivedCount,
      message: `${archivedCount} plan${archivedCount !== 1 ? 's' : ''} archived`
    });
  } catch (error) {
    console.error('Error auto-archiving plans:', error);
    res.status(500).json({ error: 'Failed to auto-archive plans' });
  }
});

export default router;
