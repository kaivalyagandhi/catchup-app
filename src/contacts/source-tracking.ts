/**
 * Source Tracking Utilities
 *
 * Provides functions for managing the `sources` array on contacts,
 * ensuring no duplicates and supporting multi-platform import tracking.
 *
 * Requirements: 18.2, 18.3, 18.5
 */

import type { Pool, PoolClient } from 'pg';

/**
 * Valid source values for the contacts sources array.
 */
export const VALID_SOURCES = [
  'manual',
  'google',
  'apple',
  'calendar',
  'voice_note',
  'chat_import',
] as const;

export type ContactSource = (typeof VALID_SOURCES)[number];

/**
 * Adds a source to a contact's sources array only if not already present.
 * Uses PostgreSQL array operations to ensure no duplicates.
 *
 * @param queryable - A Pool or PoolClient to execute the query on
 * @param contactId - The contact ID to update
 * @param source - The source string to add
 * @returns true if the source was added, false if it was already present
 */
export async function addSourceToContact(
  queryable: Pool | PoolClient,
  contactId: string,
  source: string,
): Promise<boolean> {
  const result = await queryable.query(
    `UPDATE contacts
     SET sources = array_append(sources, $2)
     WHERE id = $1 AND NOT ($2 = ANY(COALESCE(sources, '{}')))
     RETURNING id`,
    [contactId, source],
  );

  return (result.rowCount ?? 0) > 0;
}
