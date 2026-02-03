/**
 * Scheduling Availability API Routes
 *
 * API endpoints for availability collection.
 * Requirements: 4.1-4.14, 5.1-5.7, 6.1-6.10
 */

import { Router, Request, Response } from 'express';
import * as availabilityCollectionService from '../../scheduling/availability-collection-service';
import { SubmitAvailabilityData } from '../../types/scheduling';

const router = Router();

/**
 * GET /api/scheduling/availability/:token - Get plan info for public availability page
 * This endpoint does NOT require authentication
 */
router.get('/availability/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const planInfo = await availabilityCollectionService.getPublicPlanInfo(token);
    res.json(planInfo);
  } catch (error: any) {
    console.error('Error getting plan info:', error);
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('cancelled')) {
      return res.status(410).json({ error: error.message });
    }
    if (error.message.includes('finalized')) {
      return res.status(410).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to get plan info' });
  }
});

/**
 * POST /api/scheduling/availability/:token - Submit availability
 * This endpoint does NOT require authentication
 */
router.post('/availability/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, timezone, availableSlots } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!timezone) {
      return res.status(400).json({ error: 'Timezone is required' });
    }

    if (!availableSlots || !Array.isArray(availableSlots)) {
      return res.status(400).json({ error: 'availableSlots must be an array' });
    }

    const data: SubmitAvailabilityData = {
      name: name.trim(),
      timezone,
      availableSlots,
    };

    const availability = await availabilityCollectionService.submitAvailability(token, data);
    res.status(201).json(availability);
  } catch (error: any) {
    console.error('Error submitting availability:', error);
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('cancelled') || error.message.includes('finalized')) {
      return res.status(410).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to submit availability' });
  }
});

/**
 * POST /api/scheduling/plans/:id/initiator-availability - Save initiator availability
 * This endpoint requires authentication
 */
router.post('/plans/:id/initiator-availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, availableSlots, source } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!availableSlots || !Array.isArray(availableSlots)) {
      return res.status(400).json({ error: 'availableSlots must be an array' });
    }

    const availability = await availabilityCollectionService.saveInitiatorAvailability(
      id,
      userId,
      availableSlots,
      source || 'manual'
    );
    res.status(201).json(availability);
  } catch (error: any) {
    console.error('Error saving initiator availability:', error);
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to save availability' });
  }
});

/**
 * GET /api/scheduling/plans/:id/availability - Get all availability for dashboard
 * This endpoint requires authentication
 */
router.get('/plans/:id/availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const availability = await availabilityCollectionService.getAvailabilityForPlan(
      id,
      userId as string
    );
    res.json(availability);
  } catch (error: any) {
    console.error('Error getting availability:', error);
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

/**
 * GET /api/scheduling/plans/:id/overlaps - Get overlap calculations
 * This endpoint requires authentication
 */
router.get('/plans/:id/overlaps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const overlaps = await availabilityCollectionService.calculateOverlaps(id, userId as string);
    
    // Convert Map to object for JSON serialization
    const overlapsObj: Record<string, any> = {};
    overlaps.forEach((value, key) => {
      overlapsObj[key] = value;
    });

    res.json(overlapsObj);
  } catch (error: any) {
    console.error('Error calculating overlaps:', error);
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(500).json({ error: 'Failed to calculate overlaps' });
  }
});

export default router;
