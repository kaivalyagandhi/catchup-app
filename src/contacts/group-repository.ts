/**
 * Group Repository
 *
 * Data access layer for group operations.
 */

import pool from '../db/connection';
import { Group } from '../types';

/**
 * Extended Group type with contact count
 */
export interface GroupWithCount extends Group {
  contactCount: number;
}

/**
 * Group Repository Interface
 */
export interface GroupRepository {
  create(
    userId: string,
    name: string,
    isDefault?: boolean,
    isPromotedFromTag?: boolean
  ): Promise<Group>;
  update(id: string, userId: string, name: string): Promise<Group>;
  findById(id: string, userId: string): Promise<Group | null>;
  findAll(userId: string, includeArchived?: boolean): Promise<Group[]>;
  archive(id: string, userId: string): Promise<void>;
  assignContact(contactId: string, groupId: string, userId: string): Promise<void>;
  removeContact(contactId: string, groupId: string, userId: string): Promise<void>;
  bulkAssignContacts(contactIds: string[], groupId: string, userId: string): Promise<void>;
  bulkRemoveContacts(contactIds: string[], groupId: string, userId: string): Promise<void>;
  createDefaultGroups(userId: string): Promise<Group[]>;
  getGroupWithContactCount(id: string, userId: string): Promise<GroupWithCount | null>;
  listGroupsWithContactCounts(userId: string): Promise<GroupWithCount[]>;
  getGroupContacts(groupId: string, userId: string): Promise<any[]>;
}

/**
 * PostgreSQL Group Repository Implementation
 * 
 * IMPORTANT - Requirements: 15.5
 * All group operations are LOCAL ONLY. Groups are created and managed
 * exclusively in the CatchUp database. NO API calls are made to Google Contacts
 * when creating, updating, or deleting groups.
 */
export class PostgresGroupRepository implements GroupRepository {
  async create(
    userId: string,
    name: string,
    isDefault: boolean = false,
    isPromotedFromTag: boolean = false
  ): Promise<Group> {
    const result = await pool.query(
      `INSERT INTO groups (user_id, name, is_default, is_promoted_from_tag)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, isDefault, isPromotedFromTag]
    );

    return this.mapRowToGroup(result.rows[0]);
  }

  async update(id: string, userId: string, name: string): Promise<Group> {
    const result = await pool.query(
      `UPDATE groups SET name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [name, id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Group not found');
    }

    return this.mapRowToGroup(result.rows[0]);
  }

  async findById(id: string, userId: string): Promise<Group | null> {
    const result = await pool.query('SELECT * FROM groups WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroup(result.rows[0]);
  }

  async findAll(userId: string, includeArchived: boolean = false): Promise<Group[]> {
    let query = 'SELECT * FROM groups WHERE user_id = $1';
    if (!includeArchived) {
      query += ' AND archived = false';
    }
    query += ' ORDER BY name ASC';

    const result = await pool.query(query, [userId]);

    return result.rows.map((row) => this.mapRowToGroup(row));
  }

  async archive(id: string, userId: string): Promise<void> {
    const result = await pool.query(
      'UPDATE groups SET archived = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Group not found');
    }
  }

  async assignContact(contactId: string, groupId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact and group belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      const groupCheck = await client.query(
        'SELECT id FROM groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );
      if (groupCheck.rows.length === 0) {
        throw new Error('Group not found');
      }

      // Insert or ignore if already exists
      await client.query(
        `INSERT INTO contact_groups (contact_id, group_id)
         VALUES ($1, $2)
         ON CONFLICT (contact_id, group_id) DO NOTHING`,
        [contactId, groupId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeContact(contactId: string, groupId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify contact and group belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );
      if (contactCheck.rows.length === 0) {
        throw new Error('Contact not found');
      }

      const groupCheck = await client.query(
        'SELECT id FROM groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );
      if (groupCheck.rows.length === 0) {
        throw new Error('Group not found');
      }

      await client.query('DELETE FROM contact_groups WHERE contact_id = $1 AND group_id = $2', [
        contactId,
        groupId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkAssignContacts(contactIds: string[], groupId: string, userId: string): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify group belongs to user
      const groupCheck = await client.query(
        'SELECT id FROM groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );
      if (groupCheck.rows.length === 0) {
        throw new Error('Group not found');
      }

      // Verify all contacts belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
        [contactIds, userId]
      );
      if (contactCheck.rows.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Bulk insert
      const values = contactIds.map((contactId) => `('${contactId}', '${groupId}')`).join(',');
      await client.query(
        `INSERT INTO contact_groups (contact_id, group_id)
         VALUES ${values}
         ON CONFLICT (contact_id, group_id) DO NOTHING`
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkRemoveContacts(contactIds: string[], groupId: string, userId: string): Promise<void> {
    if (contactIds.length === 0) {
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify group belongs to user
      const groupCheck = await client.query(
        'SELECT id FROM groups WHERE id = $1 AND user_id = $2',
        [groupId, userId]
      );
      if (groupCheck.rows.length === 0) {
        throw new Error('Group not found');
      }

      // Verify all contacts belong to user
      const contactCheck = await client.query(
        'SELECT id FROM contacts WHERE id = ANY($1) AND user_id = $2',
        [contactIds, userId]
      );
      if (contactCheck.rows.length !== contactIds.length) {
        throw new Error('One or more contacts not found');
      }

      // Bulk delete
      await client.query(
        'DELETE FROM contact_groups WHERE contact_id = ANY($1) AND group_id = $2',
        [contactIds, groupId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createDefaultGroups(userId: string): Promise<Group[]> {
    const defaultGroupNames = [
      'Close Friends',
      'Friends',
      'Remote Friends',
      'College Friends',
      'High School Friends',
    ];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const groups: Group[] = [];
      for (const name of defaultGroupNames) {
        const result = await client.query(
          `INSERT INTO groups (user_id, name, is_default)
           VALUES ($1, $2, true)
           RETURNING *`,
          [userId, name]
        );
        groups.push(this.mapRowToGroup(result.rows[0]));
      }

      await client.query('COMMIT');
      return groups;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getGroupWithContactCount(id: string, userId: string): Promise<GroupWithCount | null> {
    const result = await pool.query(
      `SELECT g.*, COUNT(cg.contact_id) as contact_count
       FROM groups g
       LEFT JOIN contact_groups cg ON g.id = cg.group_id
       WHERE g.id = $1 AND g.user_id = $2
       GROUP BY g.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToGroupWithCount(result.rows[0]);
  }

  async listGroupsWithContactCounts(userId: string): Promise<GroupWithCount[]> {
    const result = await pool.query(
      `SELECT g.*, COUNT(cg.contact_id) as contact_count
       FROM groups g
       LEFT JOIN contact_groups cg ON g.id = cg.group_id
       WHERE g.user_id = $1 AND g.archived = false
       GROUP BY g.id
       ORDER BY g.name ASC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToGroupWithCount(row));
  }

  async getGroupContacts(groupId: string, userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone
       FROM contacts c
       INNER JOIN contact_groups cg ON c.id = cg.contact_id
       WHERE cg.group_id = $1 AND c.user_id = $2 AND c.archived = false
       ORDER BY c.name ASC`,
      [groupId, userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
    }));
  }

  private mapRowToGroup(row: any): Group {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      isDefault: row.is_default,
      isPromotedFromTag: row.is_promoted_from_tag,
      archived: row.archived,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToGroupWithCount(row: any): GroupWithCount {
    return {
      ...this.mapRowToGroup(row),
      contactCount: parseInt(row.contact_count, 10) || 0,
    };
  }
}
