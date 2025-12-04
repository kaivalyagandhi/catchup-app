/**
 * Account Deletion API Routes
 *
 * Handles user account deletion and related SMS/MMS data cleanup
 *
 * Requirement 10.5: Account deletion cascade
 */

import { Router, Request, Response } from 'express';
import { accountDeletionService } from '../../sms/account-deletion-service';

const router = Router();

/**
 * GET /api/account/sms-data-stats - Get statistics about SMS/MMS data
 * Shows user what data will be deleted
 *
 * Query params:
 * - userId: User ID (required)
 */
router.get('/sms-data-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    const stats = await accountDeletionService.getUserSMSDataStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching SMS data stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS data statistics',
    });
  }
});

/**
 * DELETE /api/account/sms-data - Delete all SMS/MMS-related data for a user
 *
 * Body:
 * - userId: User ID (required)
 *
 * This endpoint should be called as part of the account deletion flow
 */
router.delete('/sms-data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required in request body' });
      return;
    }

    console.log(`Deleting SMS/MMS data for user ${userId}`);

    const result = await accountDeletionService.deleteUserSMSData(userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'SMS/MMS data deleted successfully',
        phoneNumbersDeleted: result.phoneNumbersDeleted,
        enrichmentsDeleted: result.enrichmentsDeleted,
        tempFilesDeleted: result.tempFilesDeleted,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete SMS/MMS data',
        phoneNumbersDeleted: result.phoneNumbersDeleted,
        enrichmentsDeleted: result.enrichmentsDeleted,
        tempFilesDeleted: result.tempFilesDeleted,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('Error deleting SMS/MMS data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete SMS/MMS data',
      details: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/account/phone-number - Delete phone number only
 *
 * Body:
 * - userId: User ID (required)
 *
 * This is a lighter-weight operation that only removes the phone number
 * without deleting enrichments
 */
router.delete('/phone-number', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required in request body' });
      return;
    }

    const deletedCount = await accountDeletionService.deleteUserPhoneNumber(userId);

    res.json({
      success: true,
      message: 'Phone number deleted successfully',
      phoneNumbersDeleted: deletedCount,
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete phone number',
      details: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/account/enrichments - Delete SMS/MMS enrichments only
 *
 * Body:
 * - userId: User ID (required)
 *
 * This removes enrichments from SMS/MMS sources without deleting the phone number
 */
router.delete('/enrichments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required in request body' });
      return;
    }

    const deletedCount = await accountDeletionService.deleteUserEnrichments(userId);

    res.json({
      success: true,
      message: 'SMS/MMS enrichments deleted successfully',
      enrichmentsDeleted: deletedCount,
    });
  } catch (error) {
    console.error('Error deleting enrichments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete enrichments',
      details: (error as Error).message,
    });
  }
});

export default router;
