/**
 * Bulk Contact Operations API Routes
 *
 * POST /api/contacts/bulk — Bulk operations (archive, add_tag, assign_group, assign_circle)
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../../db/connection';

const router = Router();

const MAX_CONTACTS_PER_REQUEST = 200;

type BulkOperation = 'archive' | 'add_tag' | 'assign_group' | 'assign_circle';

interface BulkRequest {
  contactIds: string[];
  operation: BulkOperation;
  params?: {
    tag?: string;
    groupId?: string;
    circle?: number | string;
  };
}

const VALID_OPERATIONS: BulkOperation[] = ['archive', 'add_tag', 'assign_group', 'assign_circle'];
const VALID_CIRCLES = ['inner', 'close', 'active', 'casual'];

/**
 * POST /api/contacts/bulk
 * Execute bulk operations on contacts in a single transaction
 * Requirements: 16.1–16.8
 */
router.post('/bulk', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { contactIds, operation, params } = req.body as BulkRequest;

  // Validate contactIds
  if (!contactIds || !Array.isArray(contactIds)) {
    return res.status(400).json({
      success: false,
      error: 'contactIds array is required',
    });
  }

  if (contactIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one contact ID is required',
    });
  }

  // Enforce 200-contact limit (Req 16.8)
  if (contactIds.length > MAX_CONTACTS_PER_REQUEST) {
    return res.status(400).json({
      success: false,
      error: `Maximum ${MAX_CONTACTS_PER_REQUEST} contacts per request. Received ${contactIds.length}.`,
    });
  }

  // Validate operation
  if (!operation || !VALID_OPERATIONS.includes(operation)) {
    return res.status(400).json({
      success: false,
      error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}`,
    });
  }

  // Validate operation-specific params
  if (operation === 'add_tag') {
    if (!params?.tag || typeof params.tag !== 'string' || params.tag.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'params.tag is required for add_tag operation',
      });
    }
  }

  if (operation === 'assign_group') {
    if (!params?.groupId || typeof params.groupId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'params.groupId is required for assign_group operation',
      });
    }
  }

  if (operation === 'assign_circle') {
    const circle = params?.circle;
    if (!circle || !VALID_CIRCLES.includes(String(circle))) {
      return res.status(400).json({
        success: false,
        error: `params.circle is required for assign_circle operation. Must be one of: ${VALID_CIRCLES.join(', ')}`,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify all contacts belong to user
    const verifyResult = await client.query(
      'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
      [contactIds, userId]
    );

    const foundIds = new Set(verifyResult.rows.map((r: any) => r.id));
    const missingIds = contactIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Some contacts were not found',
        failedContactIds: missingIds,
      });
    }

    // Execute the operation
    let affectedCount = 0;

    switch (operation) {
      case 'archive': {
        const result = await client.query(
          `UPDATE contacts
           SET archived_at = NOW(), updated_at = NOW()
           WHERE id = ANY($1) AND user_id = $2 AND archived_at IS NULL`,
          [contactIds, userId]
        );
        affectedCount = result.rowCount || 0;
        break;
      }

      case 'add_tag': {
        const tagText = params!.tag!.trim();

        // Find or create the tag
        const tagResult = await client.query(
          `INSERT INTO tags (text, source, user_id)
           VALUES ($1, 'manual', $2)
           ON CONFLICT (user_id, LOWER(text)) DO UPDATE SET text = EXCLUDED.text
           RETURNING id`,
          [tagText, userId]
        );
        const tagId = tagResult.rows[0].id;

        // Bulk assign tag to all contacts
        const values = contactIds.map((cid) => `('${cid}', '${tagId}')`).join(',');
        await client.query(
          `INSERT INTO contact_tags (contact_id, tag_id)
           VALUES ${values}
           ON CONFLICT (contact_id, tag_id) DO NOTHING`
        );
        affectedCount = contactIds.length;
        break;
      }

      case 'assign_group': {
        const groupId = params!.groupId!;

        // Verify group exists and belongs to user
        const groupCheck = await client.query(
          'SELECT id FROM groups WHERE id = $1 AND user_id = $2',
          [groupId, userId]
        );
        if (groupCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Group not found',
          });
        }

        // Bulk assign contacts to group
        const groupValues = contactIds.map((cid) => `('${cid}', '${groupId}')`).join(',');
        await client.query(
          `INSERT INTO contact_groups (contact_id, group_id)
           VALUES ${groupValues}
           ON CONFLICT (contact_id, group_id) DO NOTHING`
        );
        affectedCount = contactIds.length;
        break;
      }

      case 'assign_circle': {
        const circle = String(params!.circle!);
        const result = await client.query(
          `UPDATE contacts
           SET dunbar_circle = $1, circle_assigned_at = NOW(), updated_at = NOW()
           WHERE id = ANY($2) AND user_id = $3`,
          [circle, contactIds, userId]
        );
        affectedCount = result.rowCount || 0;
        break;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      operation,
      affectedCount,
      message: `Successfully applied ${operation} to ${affectedCount} contact(s)`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing bulk operation:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk operation failed. All changes have been rolled back.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    client.release();
  }
});

export default router;
