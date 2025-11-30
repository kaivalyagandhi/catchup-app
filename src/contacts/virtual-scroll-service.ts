/**
 * Virtual Scroll Service
 * 
 * Provides virtual scrolling utilities for rendering large lists efficiently.
 * Only renders items that are visible in the viewport.
 * Requirements: 4.2
 */

export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  bufferSize?: number; // Number of items to render outside viewport
  overscan?: number; // Additional items to render for smooth scrolling
}

export interface VirtualScrollState {
  scrollTop: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  renderStartIndex: number;
  renderEndIndex: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Calculate virtual scroll state based on scroll position
 */
export function calculateVirtualScrollState(
  totalItems: number,
  scrollTop: number,
  config: VirtualScrollConfig
): VirtualScrollState {
  const { itemHeight, containerHeight, bufferSize = 5, overscan = 3 } = config;
  
  // Calculate visible range
  const visibleStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleEndIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  // Add buffer and overscan
  const renderStartIndex = Math.max(0, visibleStartIndex - bufferSize - overscan);
  const renderEndIndex = Math.min(totalItems, visibleEndIndex + bufferSize + overscan);
  
  // Calculate total height and offset
  const totalHeight = totalItems * itemHeight;
  const offsetY = renderStartIndex * itemHeight;
  
  return {
    scrollTop,
    visibleStartIndex,
    visibleEndIndex,
    renderStartIndex,
    renderEndIndex,
    totalHeight,
    offsetY,
  };
}

/**
 * Get items to render based on virtual scroll state
 */
export function getVirtualScrollItems<T>(
  items: T[],
  state: VirtualScrollState
): T[] {
  return items.slice(state.renderStartIndex, state.renderEndIndex);
}

/**
 * Check if virtual scroll state has changed significantly
 */
export function hasVirtualScrollStateChanged(
  oldState: VirtualScrollState | null,
  newState: VirtualScrollState,
  threshold: number = 1
): boolean {
  if (!oldState) return true;
  
  return (
    Math.abs(oldState.renderStartIndex - newState.renderStartIndex) >= threshold ||
    Math.abs(oldState.renderEndIndex - newState.renderEndIndex) >= threshold
  );
}

/**
 * Debounce scroll events for performance
 */
export function createScrollDebouncer(
  callback: (scrollTop: number) => void,
  delay: number = 16 // ~60fps
): (scrollTop: number) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastScrollTop: number | null = null;
  
  return (scrollTop: number) => {
    lastScrollTop = scrollTop;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (lastScrollTop !== null) {
        callback(lastScrollTop);
      }
      timeoutId = null;
    }, delay);
  };
}

/**
 * Calculate item positions for circular layout with virtual scrolling
 */
export interface CircularPosition {
  x: number;
  y: number;
  angle: number;
  visible: boolean;
}

export function calculateCircularPositions(
  totalItems: number,
  radius: number,
  centerX: number,
  centerY: number,
  visibleStartIndex: number,
  visibleEndIndex: number
): CircularPosition[] {
  const positions: CircularPosition[] = [];
  const angleStep = (2 * Math.PI) / totalItems;
  const startAngle = -Math.PI / 2; // Start at top
  
  for (let i = 0; i < totalItems; i++) {
    const angle = startAngle + (i * angleStep);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const visible = i >= visibleStartIndex && i < visibleEndIndex;
    
    positions.push({ x, y, angle, visible });
  }
  
  return positions;
}

/**
 * Optimize rendering by grouping items into chunks
 */
export function chunkItems<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  return chunks;
}
