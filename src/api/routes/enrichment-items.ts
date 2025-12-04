import { Router, Request, Response } from 'express';
import pool from '../../db/connection';

const router = Router();

/**
 * GET /api/enrichment-items - List enrichment items with filters
 * Requirements: 6.2
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, source, status, contactId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    // Build query with filters
    let query = `
      SELECT 
        ei.id,
        ei.voice_note_id,
        ei.contact_id,
        ei.item_type,
        ei.action,
        ei.field_name,
        ei.value,
        ei.accepted,
        ei.applied,
        ei.source,
        ei.source_metadata,
        ei.created_at,
        ei.user_id,
        c.name as contact_name
      FROM enrichment_items ei
      LEFT JOIN contacts c ON ei.contact_id = c.id
      WHERE ei.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Filter by source (web, sms, mms)
    if (source) {
      query += ` AND ei.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    // Filter by status (accepted/pending/rejected)
    if (status === 'pending') {
      query += ` AND ei.accepted = false AND ei.applied = false`;
    } else if (status === 'accepted') {
      query += ` AND ei.accepted = true`;
    } else if (status === 'rejected') {
      query += ` AND ei.accepted = false AND ei.applied = true`;
    }

    // Filter by contact
    if (contactId) {
      query += ` AND ei.contact_id = $${paramIndex}`;
      params.push(contactId);
      paramIndex++;
    }

    query += ` ORDER BY ei.created_at DESC`;

    const result = await pool.query(query, params);

    // Transform rows to include parsed source_metadata
    const enrichmentItems = result.rows.map((row) => ({
      id: row.id,
      voiceNoteId: row.voice_note_id,
      contactId: row.contact_id,
      contactName: row.contact_name,
      itemType: row.item_type,
      action: row.action,
      fieldName: row.field_name,
      value: row.value,
      accepted: row.accepted,
      applied: row.applied,
      source: row.source || 'web',
      sourceMetadata: row.source_metadata || {},
      createdAt: row.created_at,
    }));

    res.json(enrichmentItems);
  } catch (error) {
    console.error('Error fetching enrichment items:', error);
    res.status(500).json({ error: 'Failed to fetch enrichment items' });
  }
});

/**
 * PATCH /api/enrichment-items/:id - Update enrichment item status
 * Requirements: 6.3, 6.4, 6.5
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, accepted, value } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (accepted !== undefined) {
      updates.push(`accepted = $${paramIndex}`);
      params.push(accepted);
      paramIndex++;
    }

    if (value !== undefined) {
      updates.push(`value = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    params.push(id);
    params.push(userId);

    const query = `
      UPDATE enrichment_items
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Enrichment item not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      voiceNoteId: row.voice_note_id,
      contactId: row.contact_id,
      itemType: row.item_type,
      action: row.action,
      fieldName: row.field_name,
      value: row.value,
      accepted: row.accepted,
      applied: row.applied,
      source: row.source || 'web',
      sourceMetadata: row.source_metadata || {},
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error updating enrichment item:', error);
    res.status(500).json({ error: 'Failed to update enrichment item' });
  }
});

/**
 * POST /api/enrichment-items/apply - Apply accepted enrichment items
 * Requirements: 6.3
 */
router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, enrichmentIds } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!enrichmentIds || !Array.isArray(enrichmentIds) || enrichmentIds.length === 0) {
      res.status(400).json({ error: 'enrichmentIds array is required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let appliedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const enrichmentId of enrichmentIds) {
        try {
          // Get enrichment item
          const itemResult = await client.query(
            `SELECT * FROM enrichment_items WHERE id = $1 AND user_id = $2 AND accepted = true`,
            [enrichmentId, userId]
          );

          if (itemResult.rows.length === 0) {
            errors.push(`Enrichment ${enrichmentId} not found or not accepted`);
            failedCount++;
            continue;
          }

          const item = itemResult.rows[0];

          // Apply based on item type
          switch (item.item_type) {
            case 'tag':
              // Add tag to contact
              if (item.contact_id) {
                await client.query(
                  `INSERT INTO contact_tags (contact_id, tag_id, user_id)
                   SELECT $1, t.id, $2
                   FROM tags t
                   WHERE t.text = $3 AND t.user_id = $2
                   ON CONFLICT DO NOTHING`,
                  [item.contact_id, userId, item.value]
                );
              }
              break;

            case 'field':
              // Update contact field
              if (item.contact_id && item.field_name) {
                const updateQuery = `
                  UPDATE contacts
                  SET ${item.field_name} = $1
                  WHERE id = $2 AND user_id = $3
                `;
                await client.query(updateQuery, [item.value, item.contact_id, userId]);
              }
              break;

            case 'group':
              // Add contact to group
              if (item.contact_id) {
                // Find or create group
                let groupResult = await client.query(
                  `SELECT id FROM groups WHERE name = $1 AND user_id = $2`,
                  [item.value, userId]
                );

                let groupId;
                if (groupResult.rows.length === 0) {
                  // Create group
                  const newGroupResult = await client.query(
                    `INSERT INTO groups (name, user_id) VALUES ($1, $2) RETURNING id`,
                    [item.value, userId]
                  );
                  groupId = newGroupResult.rows[0].id;
                } else {
                  groupId = groupResult.rows[0].id;
                }

                // Add contact to group
                await client.query(
                  `INSERT INTO contact_groups (contact_id, group_id, user_id)
                   VALUES ($1, $2, $3)
                   ON CONFLICT DO NOTHING`,
                  [item.contact_id, groupId, userId]
                );
              }
              break;

            case 'lastContactDate':
              // Update last contact date
              if (item.contact_id) {
                await client.query(
                  `UPDATE contacts SET last_contact_date = $1 WHERE id = $2 AND user_id = $3`,
                  [item.value, item.contact_id, userId]
                );
              }
              break;
          }

          // Mark as applied
          await client.query(`UPDATE enrichment_items SET applied = true WHERE id = $1`, [
            enrichmentId,
          ]);

          appliedCount++;
        } catch (itemError) {
          console.error(`Error applying enrichment ${enrichmentId}:`, itemError);
          errors.push(`Failed to apply enrichment ${enrichmentId}`);
          failedCount++;
        }
      }

      await client.query('COMMIT');

      res.json({
        success: failedCount === 0,
        appliedCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error applying enrichment items:', error);
    res.status(500).json({ error: 'Failed to apply enrichment items' });
  }
});

export default router;
