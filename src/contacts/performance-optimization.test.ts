/**
 * Performance Optimization Tests
 * 
 * Tests for pagination, virtual scrolling, and lazy loading services.
 * Requirements: 4.2, 9.1, 11.1
 */

import { describe, it, expect } from 'vitest';
import {
  paginateArray,
  buildPaginationClause,
  createPaginatedResult,
  calculateOptimalPageSize,
} from './pagination-service';
import {
  calculateVirtualScrollState,
  getVirtualScrollItems,
  hasVirtualScrollStateChanged,
  chunkItems,
} from './virtual-scroll-service';
import {
  createLazyLoadable,
  createOnboardingSteps,
  LazyLoadCache,
} from './lazy-loading-service';

describe('Pagination Service', () => {
  describe('paginateArray', () => {
    it('should paginate array correctly', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const result = paginateArray(items, { page: 1, pageSize: 10 });
      
      expect(result.items.length).toBe(10);
      expect(result.items[0].id).toBe(0);
      expect(result.pagination.totalItems).toBe(100);
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });
    
    it('should handle last page correctly', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      
      const result = paginateArray(items, { page: 3, pageSize: 10 });
      
      expect(result.items.length).toBe(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
    
    it('should handle empty array', () => {
      const result = paginateArray([], { page: 1, pageSize: 10 });
      
      expect(result.items.length).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
  
  describe('buildPaginationClause', () => {
    it('should build correct SQL clause', () => {
      const clause = buildPaginationClause({
        page: 2,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      
      expect(clause.limit).toBe(20);
      expect(clause.offset).toBe(20);
      expect(clause.orderBy).toBe('name ASC');
    });
  });
  
  describe('calculateOptimalPageSize', () => {
    it('should calculate optimal page size', () => {
      const pageSize = calculateOptimalPageSize(600, 40, 2);
      
      expect(pageSize).toBeGreaterThanOrEqual(20);
      expect(pageSize).toBe(Math.ceil(600 / 40) * 2);
    });
    
    it('should have minimum page size of 20', () => {
      const pageSize = calculateOptimalPageSize(100, 50, 1);
      
      expect(pageSize).toBe(20);
    });
  });
});

describe('Virtual Scroll Service', () => {
  describe('calculateVirtualScrollState', () => {
    it('should calculate visible range correctly', () => {
      const state = calculateVirtualScrollState(100, 200, {
        itemHeight: 40,
        containerHeight: 400,
        bufferSize: 5,
        overscan: 3,
      });
      
      expect(state.visibleStartIndex).toBe(5); // 200 / 40
      expect(state.visibleEndIndex).toBe(15); // (200 + 400) / 40
      expect(state.renderStartIndex).toBe(0); // max(0, 5 - 5 - 3)
      expect(state.renderEndIndex).toBe(23); // min(100, 15 + 5 + 3)
      expect(state.totalHeight).toBe(4000); // 100 * 40
    });
    
    it('should handle scroll at top', () => {
      const state = calculateVirtualScrollState(100, 0, {
        itemHeight: 40,
        containerHeight: 400,
      });
      
      expect(state.visibleStartIndex).toBe(0);
      expect(state.renderStartIndex).toBe(0);
    });
    
    it('should handle scroll at bottom', () => {
      const state = calculateVirtualScrollState(100, 3600, {
        itemHeight: 40,
        containerHeight: 400,
      });
      
      expect(state.visibleStartIndex).toBe(90);
      expect(state.renderEndIndex).toBe(100);
    });
  });
  
  describe('getVirtualScrollItems', () => {
    it('should return correct slice of items', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const state = {
        scrollTop: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 10,
        renderStartIndex: 0,
        renderEndIndex: 15,
        totalHeight: 4000,
        offsetY: 0,
      };
      
      const result = getVirtualScrollItems(items, state);
      
      expect(result.length).toBe(15);
      expect(result[0]).toBe(0);
      expect(result[14]).toBe(14);
    });
  });
  
  describe('hasVirtualScrollStateChanged', () => {
    it('should detect significant changes', () => {
      const oldState = {
        scrollTop: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 10,
        renderStartIndex: 0,
        renderEndIndex: 15,
        totalHeight: 4000,
        offsetY: 0,
      };
      
      const newState = {
        ...oldState,
        renderStartIndex: 5,
        renderEndIndex: 20,
      };
      
      expect(hasVirtualScrollStateChanged(oldState, newState, 1)).toBe(true);
    });
    
    it('should ignore insignificant changes', () => {
      const oldState = {
        scrollTop: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 10,
        renderStartIndex: 0,
        renderEndIndex: 15,
        totalHeight: 4000,
        offsetY: 0,
      };
      
      const newState = {
        ...oldState,
        scrollTop: 5,
      };
      
      expect(hasVirtualScrollStateChanged(oldState, newState, 5)).toBe(false);
    });
  });
  
  describe('chunkItems', () => {
    it('should chunk items correctly', () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const chunks = chunkItems(items, 10);
      
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(10);
      expect(chunks[1].length).toBe(10);
      expect(chunks[2].length).toBe(5);
    });
  });
});

describe('Lazy Loading Service', () => {
  describe('createLazyLoadable', () => {
    it('should create lazy loadable item', async () => {
      const loader = async () => 'test data';
      const item = createLazyLoadable('test', loader);
      
      expect(item.id).toBe('test');
      expect(item.state).toBe('idle');
      expect(item.data).toBeNull();
      
      const data = await item.load();
      
      expect(data).toBe('test data');
      expect(item.state).toBe('loaded');
      expect(item.data).toBe('test data');
    });
    
    it('should cache loaded data', async () => {
      let callCount = 0;
      const loader = async () => {
        callCount++;
        return 'test data';
      };
      const item = createLazyLoadable('test', loader);
      
      await item.load();
      await item.load();
      
      expect(callCount).toBe(1);
    });
    
    it('should handle errors', async () => {
      const loader = async () => {
        throw new Error('Load failed');
      };
      const item = createLazyLoadable('test', loader);
      
      await expect(item.load()).rejects.toThrow('Load failed');
      expect(item.state).toBe('error');
      expect(item.error).toBeTruthy();
    });
  });
  
  describe('createOnboardingSteps', () => {
    it('should create onboarding steps', () => {
      const steps = createOnboardingSteps([
        {
          id: 'step1',
          name: 'Step 1',
          loader: async () => 'data1',
        },
        {
          id: 'step2',
          name: 'Step 2',
          loader: async () => 'data2',
          preload: true,
        },
      ]);
      
      expect(steps.length).toBe(2);
      expect(steps[0].id).toBe('step1');
      expect(steps[0].component.state).toBe('idle');
      expect(steps[1].preload).toBe(true);
    });
  });
  
  describe('LazyLoadCache', () => {
    it('should cache items', () => {
      const cache = new LazyLoadCache<string>(3);
      
      const item1 = cache.get('key1', async () => 'value1');
      const item2 = cache.get('key1', async () => 'value2');
      
      expect(item1).toBe(item2); // Same instance
    });
    
    it('should evict oldest items when at capacity', () => {
      const cache = new LazyLoadCache<string>(2);
      
      cache.get('key1', async () => 'value1');
      cache.get('key2', async () => 'value2');
      cache.get('key3', async () => 'value3');
      
      expect(cache.has('key1')).toBe(false); // Evicted
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
    });
    
    it('should update access order', () => {
      const cache = new LazyLoadCache<string>(2);
      
      cache.get('key1', async () => 'value1');
      cache.get('key2', async () => 'value2');
      cache.get('key1', async () => 'value1'); // Access key1 again
      cache.get('key3', async () => 'value3');
      
      expect(cache.has('key1')).toBe(true); // Not evicted (recently accessed)
      expect(cache.has('key2')).toBe(false); // Evicted (oldest)
      expect(cache.has('key3')).toBe(true);
    });
  });
});
