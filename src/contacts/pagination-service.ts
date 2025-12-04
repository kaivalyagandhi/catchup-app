/**
 * Pagination Service
 *
 * Provides pagination utilities for large contact lists to improve performance.
 * Requirements: 4.2, 9.1, 11.1
 */

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Paginate an array of items
 */
export function paginateArray<T>(items: T[], options: PaginationOptions): PaginatedResult<T> {
  const { page, pageSize } = options;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Validate page number
  const validPage = Math.max(1, Math.min(page, totalPages || 1));

  // Calculate slice indices
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Get page items
  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    pagination: {
      page: validPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
    },
  };
}

/**
 * Build SQL pagination clause
 */
export function buildPaginationClause(options: PaginationOptions): {
  limit: number;
  offset: number;
  orderBy: string;
} {
  const { page, pageSize, sortBy = 'created_at', sortOrder = 'desc' } = options;

  const limit = pageSize;
  const offset = (page - 1) * pageSize;
  const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

  return { limit, offset, orderBy };
}

/**
 * Create paginated result from database query
 */
export function createPaginatedResult<T>(
  items: T[],
  totalCount: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const { page, pageSize } = options;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Calculate optimal page size based on viewport and item size
 */
export function calculateOptimalPageSize(
  viewportHeight: number,
  itemHeight: number,
  bufferMultiplier: number = 2
): number {
  const visibleItems = Math.ceil(viewportHeight / itemHeight);
  return Math.max(20, visibleItems * bufferMultiplier);
}
