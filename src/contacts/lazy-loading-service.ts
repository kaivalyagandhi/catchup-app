/**
 * Lazy Loading Service
 * 
 * Provides lazy loading utilities for onboarding steps and components.
 * Requirements: 4.2, 9.1
 */

export interface LazyLoadConfig {
  threshold?: number; // Intersection observer threshold (0-1)
  rootMargin?: string; // Margin around root element
  loadDelay?: number; // Delay before loading (ms)
}

export type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export interface LazyLoadable<T> {
  id: string;
  state: LoadState;
  data: T | null;
  error: Error | null;
  load: () => Promise<T>;
}

/**
 * Create a lazy loadable item
 */
export function createLazyLoadable<T>(
  id: string,
  loader: () => Promise<T>
): LazyLoadable<T> {
  let state: LoadState = 'idle';
  let data: T | null = null;
  let error: Error | null = null;
  let loadPromise: Promise<T> | null = null;
  
  const load = async (): Promise<T> => {
    // Return existing promise if already loading
    if (loadPromise) {
      return loadPromise;
    }
    
    // Return cached data if already loaded
    if (state === 'loaded' && data !== null) {
      return data;
    }
    
    state = 'loading';
    error = null;
    
    loadPromise = loader()
      .then((result) => {
        state = 'loaded';
        data = result;
        loadPromise = null;
        return result;
      })
      .catch((err) => {
        state = 'error';
        error = err;
        loadPromise = null;
        throw err;
      });
    
    return loadPromise;
  };
  
  return {
    id,
    get state() { return state; },
    get data() { return data; },
    get error() { return error; },
    load,
  };
}

/**
 * Lazy load onboarding step component
 */
export interface OnboardingStep {
  id: string;
  name: string;
  component: LazyLoadable<any>;
  preload?: boolean;
}

export function createOnboardingSteps(
  steps: Array<{
    id: string;
    name: string;
    loader: () => Promise<any>;
    preload?: boolean;
  }>
): OnboardingStep[] {
  return steps.map(step => ({
    id: step.id,
    name: step.name,
    component: createLazyLoadable(step.id, step.loader),
    preload: step.preload,
  }));
}

/**
 * Preload next steps in background
 */
export async function preloadNextSteps(
  steps: OnboardingStep[],
  currentStepIndex: number,
  lookahead: number = 1
): Promise<void> {
  const nextSteps = steps.slice(
    currentStepIndex + 1,
    currentStepIndex + 1 + lookahead
  );
  
  await Promise.all(
    nextSteps.map(step => {
      if (step.component.state === 'idle') {
        return step.component.load().catch(() => {
          // Ignore preload errors
        });
      }
      return Promise.resolve();
    })
  );
}

/**
 * Create intersection observer for lazy loading
 */
export function createLazyLoadObserver(
  callback: (element: Element) => void,
  config: LazyLoadConfig = {}
): IntersectionObserver {
  const {
    threshold = 0.1,
    rootMargin = '50px',
  } = config;
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold,
      rootMargin,
    }
  );
  
  return observer;
}

/**
 * Lazy load images
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (placeholder) {
      img.src = placeholder;
    }
    
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      resolve();
    };
    tempImg.onerror = reject;
    tempImg.src = src;
  });
}

/**
 * Batch lazy load items with concurrency limit
 */
export async function batchLazyLoad<T>(
  items: LazyLoadable<T>[],
  concurrency: number = 3
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...items];
  const inProgress: Promise<T>[] = [];
  
  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (inProgress.length < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = item.load();
      inProgress.push(promise);
      
      promise
        .then((result) => {
          results.push(result);
          const index = inProgress.indexOf(promise);
          if (index > -1) {
            inProgress.splice(index, 1);
          }
        })
        .catch(() => {
          // Remove from in-progress on error
          const index = inProgress.indexOf(promise);
          if (index > -1) {
            inProgress.splice(index, 1);
          }
        });
    }
    
    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }
  
  return results;
}

/**
 * Create a lazy loading cache
 */
export class LazyLoadCache<T> {
  private cache: Map<string, LazyLoadable<T>>;
  private maxSize: number;
  private accessOrder: string[];
  
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }
  
  get(key: string, loader: () => Promise<T>): LazyLoadable<T> {
    let item = this.cache.get(key);
    
    if (!item) {
      item = createLazyLoadable(key, loader);
      this.set(key, item);
    }
    
    // Update access order
    this.updateAccessOrder(key);
    
    return item;
  }
  
  private set(key: string, item: LazyLoadable<T>): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, item);
    this.accessOrder.push(key);
  }
  
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  delete(key: string): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }
}
