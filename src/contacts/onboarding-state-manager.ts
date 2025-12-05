/**
 * Onboarding State Manager
 *
 * Manages onboarding state with a fallback chain:
 * localStorage → sessionStorage → memory → database
 *
 * This class provides a unified interface for state persistence across
 * different storage mechanisms, ensuring state is never lost.
 *
 * Includes network error handling with offline detection and sync queue.
 * Includes validation for all state updates to ensure data integrity.
 *
 * Requirements: 1.1, 1.5, 12.2, 12.4, All requirements (reliability, data integrity)
 */

import { getOnboardingNetworkManager } from './onboarding-network-manager';
import {
  validateOnboardingState,
  validateStepCompletion,
  showValidationErrors,
} from './onboarding-validation';

/**
 * Onboarding state structure matching the simplified 3-step flow
 */
export interface OnboardingState {
  userId: string;
  isComplete: boolean;
  currentStep: 1 | 2 | 3;
  dismissedAt?: Date;

  // Step 1: Integrations
  steps: {
    integrations: {
      complete: boolean;
      googleCalendar: boolean;
      googleContacts: boolean;
    };
    // Step 2: Circles
    circles: {
      complete: boolean;
      contactsCategorized: number;
      totalContacts: number;
    };
    // Step 3: Groups
    groups: {
      complete: boolean;
      mappingsReviewed: number;
      totalMappings: number;
    };
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Storage interface for different persistence mechanisms
 */
interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  isAvailable(): boolean;
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      console.warn('LocalStorage get failed:', _error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage set failed:', e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('LocalStorage remove failed:', e);
    }
  }
}

/**
 * SessionStorage adapter
 */
class SessionStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return sessionStorage.getItem(key);
    } catch (_error) {
      console.warn('SessionStorage get failed:', _error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('SessionStorage set failed:', e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('SessionStorage remove failed:', e);
    }
  }
}

/**
 * Memory storage adapter (fallback when browser storage is unavailable)
 */
class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  isAvailable(): boolean {
    return true; // Always available
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

/**
 * Database adapter for server-side persistence
 */
class DatabaseAdapter {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async get(userId: string): Promise<OnboardingState | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/onboarding/state?userId=${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch onboarding state: ${response.statusText}`);
      }
      const data = await response.json();
      return this.deserializeState(data);
    } catch (e) {
      console.warn('Database get failed:', e);
      return null;
    }
  }

  async set(state: OnboardingState): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/onboarding/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.serializeState(state)),
      });
      if (!response.ok) {
        throw new Error(`Failed to save onboarding state: ${response.statusText}`);
      }
    } catch (e) {
      console.warn('Database set failed:', e);
      throw e;
    }
  }

  async init(userId: string): Promise<OnboardingState> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/onboarding/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        throw new Error(`Failed to initialize onboarding: ${response.statusText}`);
      }
      const data = await response.json();
      return this.deserializeState(data);
    } catch (e) {
      console.error('Database init failed:', e);
      throw e;
    }
  }

  private serializeState(state: OnboardingState): Record<string, unknown> {
    return {
      userId: state.userId,
      isComplete: state.isComplete,
      currentStep: state.currentStep,
      dismissedAt: state.dismissedAt?.toISOString(),
      integrationsComplete: state.steps.integrations.complete,
      googleCalendarConnected: state.steps.integrations.googleCalendar,
      googleContactsConnected: state.steps.integrations.googleContacts,
      circlesComplete: state.steps.circles.complete,
      contactsCategorized: state.steps.circles.contactsCategorized,
      totalContacts: state.steps.circles.totalContacts,
      groupsComplete: state.steps.groups.complete,
      mappingsReviewed: state.steps.groups.mappingsReviewed,
      totalMappings: state.steps.groups.totalMappings,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  private deserializeState(data: Record<string, unknown>): OnboardingState {
    const dismissedAtValue = (data.dismissedAt || data.dismissed_at) as string | undefined;
    const createdAtValue = (data.createdAt || data.created_at) as string | number | undefined;
    const updatedAtValue = (data.updatedAt || data.updated_at) as string | number | undefined;

    return {
      userId: (data.userId as string) || '',
      isComplete: Boolean(data.isComplete || data.is_complete),
      currentStep: ((data.currentStep || data.current_step) as 1 | 2 | 3) || 1,
      dismissedAt: dismissedAtValue ? new Date(dismissedAtValue) : undefined,
      steps: {
        integrations: {
          complete: Boolean(data.integrationsComplete || data.integrations_complete),
          googleCalendar: Boolean(data.googleCalendarConnected || data.google_calendar_connected),
          googleContacts: Boolean(data.googleContactsConnected || data.google_contacts_connected),
        },
        circles: {
          complete: Boolean(data.circlesComplete || data.circles_complete),
          contactsCategorized: Number(data.contactsCategorized || data.contacts_categorized) || 0,
          totalContacts: Number(data.totalContacts || data.total_contacts) || 0,
        },
        groups: {
          complete: Boolean(data.groupsComplete || data.groups_complete),
          mappingsReviewed: Number(data.mappingsReviewed || data.mappings_reviewed) || 0,
          totalMappings: Number(data.totalMappings || data.total_mappings) || 0,
        },
      },
      createdAt: new Date(createdAtValue || Date.now()),
      updatedAt: new Date(updatedAtValue || Date.now()),
    };
  }
}

/**
 * Onboarding State Manager
 *
 * Manages onboarding state with automatic fallback chain and sync
 */
export class OnboardingStateManager {
  private static readonly STORAGE_KEY = 'catchup-onboarding-state';
  private static readonly SYNC_DEBOUNCE_MS = 1000;

  private localStorage: LocalStorageAdapter;
  private sessionStorage: SessionStorageAdapter;
  private memoryStorage: MemoryStorageAdapter;
  private database: DatabaseAdapter;

  private currentState: OnboardingState | null = null;
  private syncTimeout: NodeJS.Timeout | null = null;

  constructor(apiBaseUrl?: string) {
    this.localStorage = new LocalStorageAdapter();
    this.sessionStorage = new SessionStorageAdapter();
    this.memoryStorage = new MemoryStorageAdapter();
    this.database = new DatabaseAdapter(apiBaseUrl);
  }

  /**
   * Initialize onboarding state for a new user
   * Requirements: 1.1, 1.5
   */
  async initializeState(userId: string): Promise<OnboardingState> {
    // Check if state already exists
    const existing = await this.loadState(userId);
    if (existing && !existing.isComplete) {
      return existing;
    }

    // Create new state
    const state: OnboardingState = {
      userId,
      isComplete: false,
      currentStep: 1,
      steps: {
        integrations: {
          complete: false,
          googleCalendar: false,
          googleContacts: false,
        },
        circles: {
          complete: false,
          contactsCategorized: 0,
          totalContacts: 0,
        },
        groups: {
          complete: false,
          mappingsReviewed: 0,
          totalMappings: 0,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize in database
    try {
      const dbState = await this.database.init(userId);
      this.currentState = dbState;
    } catch (e) {
      console.warn('Failed to initialize state in database, using local state:', e);
      this.currentState = state;
    }

    // Save to local storage
    await this.saveToLocalStorage(this.currentState);

    return this.currentState;
  }

  /**
   * Load state with fallback chain: localStorage → sessionStorage → memory → database
   * Requirements: 1.5, 12.2
   */
  async loadState(userId: string): Promise<OnboardingState | null> {
    // Try localStorage first
    if (this.localStorage.isAvailable()) {
      const localData = await this.localStorage.get(OnboardingStateManager.STORAGE_KEY);
      if (localData) {
        try {
          const state = JSON.parse(localData);
          if (state.userId === userId) {
            this.currentState = this.deserializeStateFromLocal(state);
            return this.currentState;
          }
        } catch (e) {
          console.warn('Failed to parse localStorage state:', e);
        }
      }
    }

    // Try sessionStorage
    if (this.sessionStorage.isAvailable()) {
      const sessionData = await this.sessionStorage.get(OnboardingStateManager.STORAGE_KEY);
      if (sessionData) {
        try {
          const state = JSON.parse(sessionData);
          if (state.userId === userId) {
            this.currentState = this.deserializeStateFromLocal(state);
            // Restore to localStorage
            await this.saveToLocalStorage(this.currentState);
            return this.currentState;
          }
        } catch (e) {
          console.warn('Failed to parse sessionStorage state:', e);
        }
      }
    }

    // Try memory storage
    const memoryData = await this.memoryStorage.get(OnboardingStateManager.STORAGE_KEY);
    if (memoryData) {
      try {
        const state = JSON.parse(memoryData);
        if (state.userId === userId) {
          this.currentState = this.deserializeStateFromLocal(state);
          // Restore to localStorage and sessionStorage
          await this.saveToLocalStorage(this.currentState);
          return this.currentState;
        }
      } catch (e) {
        console.warn('Failed to parse memory state:', e);
      }
    }

    // Finally, try database
    try {
      const dbState = await this.database.get(userId);
      if (dbState) {
        this.currentState = dbState;
        // Restore to local storage
        await this.saveToLocalStorage(this.currentState);
        return this.currentState;
      }
    } catch (e) {
      console.warn('Failed to load state from database:', e);
    }

    return null;
  }

  /**
   * Save state to all available storage mechanisms with validation
   * Requirements: 1.5, 12.2, 12.4, All requirements (data integrity)
   */
  async saveState(state: OnboardingState): Promise<void> {
    // Validate state before saving
    const validationResult = validateOnboardingState(state);
    if (!validationResult.isValid) {
      console.error('Invalid onboarding state:', validationResult.errors);
      showValidationErrors(validationResult);
      throw new Error(`Invalid onboarding state: ${validationResult.errors.join(', ')}`);
    }

    // Show warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn('Onboarding state warnings:', validationResult.warnings);
      showValidationErrors(validationResult);
    }

    state.updatedAt = new Date();
    this.currentState = state;

    // Save to local storage immediately
    await this.saveToLocalStorage(state);

    // Debounce database sync
    this.scheduleDatabaseSync(state);
  }

  /**
   * Update specific fields in the state
   */
  async updateState(userId: string, updates: Partial<OnboardingState>): Promise<OnboardingState> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    const updatedState: OnboardingState = {
      ...state,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveState(updatedState);
    return updatedState;
  }

  /**
   * Get current state (from cache if available)
   */
  getCurrentState(): OnboardingState | null {
    return this.currentState;
  }

  /**
   * Dismiss onboarding (save state and mark as dismissed)
   * Requirements: 1.5, 12.1
   */
  async dismissOnboarding(userId: string): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      return;
    }

    state.dismissedAt = new Date();
    await this.saveState(state);
  }

  /**
   * Resume onboarding (clear dismissed flag)
   * Requirements: 1.5, 12.2, 12.4
   */
  async resumeOnboarding(userId: string): Promise<OnboardingState | null> {
    const state = await this.loadState(userId);
    if (!state) {
      return null;
    }

    state.dismissedAt = undefined;
    await this.saveState(state);
    return state;
  }

  /**
   * Clear all state (for testing or reset)
   */
  async clearState(_userId: string): Promise<void> {
    await this.localStorage.remove(OnboardingStateManager.STORAGE_KEY);
    await this.sessionStorage.remove(OnboardingStateManager.STORAGE_KEY);
    await this.memoryStorage.remove(OnboardingStateManager.STORAGE_KEY);
    this.currentState = null;
  }

  /**
   * Force sync to database immediately
   * Requirements: All requirements (reliability)
   */
  async syncToDatabase(): Promise<void> {
    if (!this.currentState) {
      return;
    }

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    const networkManager = getOnboardingNetworkManager();

    // Check if online
    if (!networkManager.isNetworkOnline()) {
      console.warn('Offline: Queueing state update for sync when connection is restored');
      networkManager.addToQueue('state', this.currentState);
      return;
    }

    try {
      await this.database.set(this.currentState);
    } catch (e) {
      console.error('Failed to sync state to database:', e);

      // Queue for retry if it's a network error
      if (e instanceof Error && (e.message.includes('fetch') || e.message.includes('network'))) {
        console.log('Network error detected, queueing for retry');
        networkManager.addToQueue('state', this.currentState);
      } else {
        throw e;
      }
    }
  }

  /**
   * Check and update step completion status with validation
   * Requirements: 2.5, 3.5, 5.5, All requirements (data integrity)
   */
  async checkStepCompletion(userId: string): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      return;
    }

    let needsUpdate = false;

    // Check Step 1: Both integrations connected
    if (!state.steps.integrations.complete) {
      if (state.steps.integrations.googleCalendar && state.steps.integrations.googleContacts) {
        state.steps.integrations.complete = true;
        needsUpdate = true;
      }
    }

    // Check Step 2: 50%+ contacts categorized
    if (!state.steps.circles.complete && state.steps.circles.totalContacts > 0) {
      const percentCategorized =
        state.steps.circles.contactsCategorized / state.steps.circles.totalContacts;
      if (percentCategorized >= 0.5) {
        state.steps.circles.complete = true;
        needsUpdate = true;
      }
    }

    // Check Step 3: All mappings reviewed
    if (!state.steps.groups.complete && state.steps.groups.totalMappings > 0) {
      if (state.steps.groups.mappingsReviewed >= state.steps.groups.totalMappings) {
        state.steps.groups.complete = true;
        needsUpdate = true;
      }
    }

    // Check overall completion: All 3 steps complete
    if (!state.isComplete) {
      if (
        state.steps.integrations.complete &&
        state.steps.circles.complete &&
        state.steps.groups.complete
      ) {
        state.isComplete = true;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Validate step completion logic
      const validationResult = validateStepCompletion(state);
      if (!validationResult.isValid) {
        console.error('Step completion validation failed:', validationResult.errors);
        showValidationErrors(validationResult);
        return; // Don't save invalid state
      }

      // Show warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('Step completion warnings:', validationResult.warnings);
      }

      await this.saveState(state);
    }
  }

  /**
   * Mark Step 1 (Integrations) as complete
   * Requirements: 2.5
   */
  async markStep1Complete(
    userId: string,
    googleCalendar: boolean,
    googleContacts: boolean
  ): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.integrations.googleCalendar = googleCalendar;
    state.steps.integrations.googleContacts = googleContacts;

    // Check if both are connected
    if (googleCalendar && googleContacts) {
      state.steps.integrations.complete = true;
      // Move to Step 2
      if (state.currentStep === 1) {
        state.currentStep = 2;
      }
    }

    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Update Google Calendar connection status
   * Requirements: 2.5
   */
  async updateGoogleCalendarConnection(userId: string, connected: boolean): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.integrations.googleCalendar = connected;
    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Update Google Contacts connection status
   * Requirements: 2.5
   */
  async updateGoogleContactsConnection(userId: string, connected: boolean): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.integrations.googleContacts = connected;
    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Mark Step 2 (Circles) progress
   * Requirements: 3.5
   */
  async updateCircleProgress(
    userId: string,
    contactsCategorized: number,
    totalContacts: number
  ): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.circles.contactsCategorized = contactsCategorized;
    state.steps.circles.totalContacts = totalContacts;

    // Check if 50%+ categorized
    if (totalContacts > 0) {
      const percentCategorized = contactsCategorized / totalContacts;
      if (percentCategorized >= 0.5) {
        state.steps.circles.complete = true;
        // Move to Step 3
        if (state.currentStep === 2) {
          state.currentStep = 3;
        }
      }
    }

    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Increment circle progress (when a single contact is categorized)
   * Requirements: 3.5
   */
  async incrementCircleProgress(userId: string): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.circles.contactsCategorized += 1;
    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Mark Step 3 (Groups) progress
   * Requirements: 5.5
   */
  async updateGroupMappingProgress(
    userId: string,
    mappingsReviewed: number,
    totalMappings: number
  ): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.groups.mappingsReviewed = mappingsReviewed;
    state.steps.groups.totalMappings = totalMappings;

    // Check if all mappings reviewed
    if (totalMappings > 0 && mappingsReviewed >= totalMappings) {
      state.steps.groups.complete = true;
    }

    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Increment group mapping progress (when a single mapping is reviewed)
   * Requirements: 5.5
   */
  async incrementGroupMappingProgress(userId: string): Promise<void> {
    const state = await this.loadState(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    state.steps.groups.mappingsReviewed += 1;
    await this.saveState(state);
    await this.checkStepCompletion(userId);
  }

  /**
   * Get completion status for each step
   * Requirements: 2.5, 3.5, 5.5
   */
  async getStepCompletionStatus(userId: string): Promise<{
    step1Complete: boolean;
    step2Complete: boolean;
    step3Complete: boolean;
    overallComplete: boolean;
  }> {
    const state = await this.loadState(userId);
    if (!state) {
      return {
        step1Complete: false,
        step2Complete: false,
        step3Complete: false,
        overallComplete: false,
      };
    }

    return {
      step1Complete: state.steps.integrations.complete,
      step2Complete: state.steps.circles.complete,
      step3Complete: state.steps.groups.complete,
      overallComplete: state.isComplete,
    };
  }

  /**
   * Get detailed progress for Step 2 (Circles)
   * Requirements: 3.5
   */
  async getCircleProgress(userId: string): Promise<{
    contactsCategorized: number;
    totalContacts: number;
    percentComplete: number;
    isComplete: boolean;
  }> {
    const state = await this.loadState(userId);
    if (!state) {
      return {
        contactsCategorized: 0,
        totalContacts: 0,
        percentComplete: 0,
        isComplete: false,
      };
    }

    const percentComplete =
      state.steps.circles.totalContacts > 0
        ? Math.round(
            (state.steps.circles.contactsCategorized / state.steps.circles.totalContacts) * 100
          )
        : 0;

    return {
      contactsCategorized: state.steps.circles.contactsCategorized,
      totalContacts: state.steps.circles.totalContacts,
      percentComplete,
      isComplete: state.steps.circles.complete,
    };
  }

  /**
   * Get detailed progress for Step 3 (Groups)
   * Requirements: 5.5
   */
  async getGroupMappingProgress(userId: string): Promise<{
    mappingsReviewed: number;
    totalMappings: number;
    percentComplete: number;
    isComplete: boolean;
  }> {
    const state = await this.loadState(userId);
    if (!state) {
      return {
        mappingsReviewed: 0,
        totalMappings: 0,
        percentComplete: 0,
        isComplete: false,
      };
    }

    const percentComplete =
      state.steps.groups.totalMappings > 0
        ? Math.round((state.steps.groups.mappingsReviewed / state.steps.groups.totalMappings) * 100)
        : 0;

    return {
      mappingsReviewed: state.steps.groups.mappingsReviewed,
      totalMappings: state.steps.groups.totalMappings,
      percentComplete,
      isComplete: state.steps.groups.complete,
    };
  }

  /**
   * Save to local storage with fallback chain
   * Requirements: 12.2
   */
  private async saveToLocalStorage(state: OnboardingState): Promise<void> {
    const serialized = JSON.stringify(this.serializeStateForLocal(state));
    let savedSuccessfully = false;
    const failedStorages: string[] = [];

    // Try localStorage
    if (this.localStorage.isAvailable()) {
      try {
        await this.localStorage.set(OnboardingStateManager.STORAGE_KEY, serialized);
        savedSuccessfully = true;
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        failedStorages.push('localStorage');
      }
    } else {
      failedStorages.push('localStorage (unavailable)');
    }

    // Also save to sessionStorage as backup
    if (this.sessionStorage.isAvailable()) {
      try {
        await this.sessionStorage.set(OnboardingStateManager.STORAGE_KEY, serialized);
        savedSuccessfully = true;
      } catch (error) {
        console.warn('Failed to save to sessionStorage:', error);
        failedStorages.push('sessionStorage');
      }
    } else {
      failedStorages.push('sessionStorage (unavailable)');
    }

    // Always save to memory as final fallback
    try {
      await this.memoryStorage.set(OnboardingStateManager.STORAGE_KEY, serialized);
      savedSuccessfully = true;
    } catch (error) {
      console.error('Failed to save to memory storage:', error);
      failedStorages.push('memory');
    }

    // Show user message if storage is limited
    if (failedStorages.length > 0 && failedStorages.includes('localStorage')) {
      console.warn(
        'Browser storage is limited. Your progress is saved temporarily but may be lost if you close this tab.'
      );
    }

    if (!savedSuccessfully) {
      throw new Error('Failed to save state to any storage mechanism');
    }
  }

  /**
   * Schedule database sync with debouncing
   */
  private scheduleDatabaseSync(state: OnboardingState): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => {
      try {
        await this.database.set(state);
      } catch (e) {
        console.error('Failed to sync state to database:', e);
      }
    }, OnboardingStateManager.SYNC_DEBOUNCE_MS);
  }

  /**
   * Serialize state for storage
   */
  private serializeStateForLocal(state: OnboardingState): Record<string, unknown> {
    return {
      userId: state.userId,
      isComplete: state.isComplete,
      currentStep: state.currentStep,
      dismissedAt: state.dismissedAt?.toISOString(),
      steps: state.steps,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize state from storage
   */
  private deserializeStateFromLocal(data: Record<string, unknown>): OnboardingState {
    return {
      userId: data.userId as string,
      isComplete: data.isComplete as boolean,
      currentStep: data.currentStep as 1 | 2 | 3,
      dismissedAt: data.dismissedAt ? new Date(data.dismissedAt as string) : undefined,
      steps: data.steps as OnboardingState['steps'],
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  /**
   * Get storage availability status
   * Requirements: 12.2
   */
  getStorageStatus(): {
    localStorage: boolean;
    sessionStorage: boolean;
    memory: boolean;
    message: string;
  } {
    const localAvailable = this.localStorage.isAvailable();
    const sessionAvailable = this.sessionStorage.isAvailable();
    const memoryAvailable = this.memoryStorage.isAvailable();

    let message = '';
    if (!localAvailable && !sessionAvailable) {
      message =
        'Browser storage is disabled. Your progress will only be saved for this session and may be lost if you close this tab.';
    } else if (!localAvailable) {
      message =
        'localStorage is unavailable. Your progress is saved to sessionStorage and will be lost when you close this tab.';
    } else {
      message = 'All storage mechanisms are available.';
    }

    return {
      localStorage: localAvailable,
      sessionStorage: sessionAvailable,
      memory: memoryAvailable,
      message,
    };
  }
}

// Export singleton instance for convenience
let defaultManager: OnboardingStateManager | null = null;

export function getOnboardingStateManager(apiBaseUrl?: string): OnboardingStateManager {
  if (!defaultManager) {
    defaultManager = new OnboardingStateManager(apiBaseUrl);
  }
  return defaultManager;
}

// Convenience exports for common operations
export async function initializeOnboardingState(userId: string): Promise<OnboardingState> {
  return getOnboardingStateManager().initializeState(userId);
}

export async function loadOnboardingState(userId: string): Promise<OnboardingState | null> {
  return getOnboardingStateManager().loadState(userId);
}

export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  return getOnboardingStateManager().saveState(state);
}

export async function updateOnboardingState(
  userId: string,
  updates: Partial<OnboardingState>
): Promise<OnboardingState> {
  return getOnboardingStateManager().updateState(userId, updates);
}

export async function dismissOnboarding(userId: string): Promise<void> {
  return getOnboardingStateManager().dismissOnboarding(userId);
}

export async function resumeOnboarding(userId: string): Promise<OnboardingState | null> {
  return getOnboardingStateManager().resumeOnboarding(userId);
}

export async function checkStepCompletion(userId: string): Promise<void> {
  return getOnboardingStateManager().checkStepCompletion(userId);
}

export async function markStep1Complete(
  userId: string,
  googleCalendar: boolean,
  googleContacts: boolean
): Promise<void> {
  return getOnboardingStateManager().markStep1Complete(userId, googleCalendar, googleContacts);
}

export async function updateGoogleCalendarConnection(
  userId: string,
  connected: boolean
): Promise<void> {
  return getOnboardingStateManager().updateGoogleCalendarConnection(userId, connected);
}

export async function updateGoogleContactsConnection(
  userId: string,
  connected: boolean
): Promise<void> {
  return getOnboardingStateManager().updateGoogleContactsConnection(userId, connected);
}

export async function updateCircleProgress(
  userId: string,
  contactsCategorized: number,
  totalContacts: number
): Promise<void> {
  return getOnboardingStateManager().updateCircleProgress(
    userId,
    contactsCategorized,
    totalContacts
  );
}

export async function incrementCircleProgress(userId: string): Promise<void> {
  return getOnboardingStateManager().incrementCircleProgress(userId);
}

export async function updateGroupMappingProgress(
  userId: string,
  mappingsReviewed: number,
  totalMappings: number
): Promise<void> {
  return getOnboardingStateManager().updateGroupMappingProgress(
    userId,
    mappingsReviewed,
    totalMappings
  );
}

export async function incrementGroupMappingProgress(userId: string): Promise<void> {
  return getOnboardingStateManager().incrementGroupMappingProgress(userId);
}

export async function getStepCompletionStatus(userId: string): Promise<{
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  overallComplete: boolean;
}> {
  return getOnboardingStateManager().getStepCompletionStatus(userId);
}

export async function getCircleProgress(userId: string): Promise<{
  contactsCategorized: number;
  totalContacts: number;
  percentComplete: number;
  isComplete: boolean;
}> {
  return getOnboardingStateManager().getCircleProgress(userId);
}

export async function getGroupMappingProgress(userId: string): Promise<{
  mappingsReviewed: number;
  totalMappings: number;
  percentComplete: number;
  isComplete: boolean;
}> {
  return getOnboardingStateManager().getGroupMappingProgress(userId);
}
