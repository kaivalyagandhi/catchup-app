/**
 * Account Management Routes
 *
 * Handles account-level operations including deletion and data export
 */

import { Router, Response } from 'express';
import { accountService } from '../../contacts/account-service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * DELETE /api/account
 * Delete user account and all associated data
 */
router.delete('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      res.status(400).json({ error: 'Password confirmation is required' });
      return;
    }

    // In a real implementation, verify the password here
    // For now, we'll proceed with deletion

    await accountService.deleteUserAccount(req.userId);

    res.json({
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
});

/**
 * GET /api/account/export
 * Export all user data for GDPR compliance
 */
router.get('/export', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const format = (req.query.format as 'json' | 'csv') || 'json';

    if (format !== 'json' && format !== 'csv') {
      res.status(400).json({ error: 'Invalid format. Must be "json" or "csv"' });
      return;
    }

    const exportData = await accountService.exportUserData(req.userId, format);

    // Set appropriate headers
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

    res.send(exportData.data);
  } catch (error) {
    console.error('Error exporting user data:', error);
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to export user data' });
    }
  }
});

export default router;
