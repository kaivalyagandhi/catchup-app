/**
 * Onboarding Network Manager
 *
 * Handles network connectivity, offline detection, and sync queue
 * for onboarding state updates.
 *
 * Requirements: All requirements (reliability)
 */

export interface QueuedUpdate {
  id: string;
  timestamp: Date;
  type: 'state' | 'circle' | 'mapping';
  data: unknown;
  retryCount: number;
}

export class OnboardingNetworkManager {
  private static readonly QUEUE_KEY = 'catchup-onboarding-sync-queue';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000;

  private isOnline: boolean = navigator.onLine;
  private syncQueue: QueuedUpdate[] = [];
  private isSyncing: boolean = false;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  /**
   * Check if currently online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Set up online/offline event listeners
   */
  private setupEventListeners(): void {
    this.onlineHandler = () => {
      console.log('Network connection restored');
      this.isOnline = true;
      this.notifyOnlineStatus(true);
      this.processSyncQueue();
    };

    this.offlineHandler = () => {
      console.log('Network connection lost');
      this.isOnline = false;
      this.notifyOnlineStatus(false);
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * Notify UI about online status change
   */
  private notifyOnlineStatus(online: boolean): void {
    window.dispatchEvent(
      new CustomEvent('network-status-changed', {
        detail: { online },
      })
    );

    // Show toast notification if available
    const windowWithToast = window as Window & { showToast?: (msg: string, type: string) => void };
    if (windowWithToast.showToast) {
      if (online) {
        windowWithToast.showToast('Connection restored. Syncing your progress...', 'success');
      } else {
        windowWithToast.showToast(
          "You're offline. Changes will sync when connection is restored.",
          'warning'
        );
      }
    }
  }

  /**
   * Add update to sync queue
   */
  addToQueue(type: 'state' | 'circle' | 'mapping', data: unknown): string {
    const update: QueuedUpdate = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      data,
      retryCount: 0,
    };

    this.syncQueue.push(update);
    this.saveQueue();

    console.log(`Added ${type} update to sync queue:`, update.id);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return update.id;
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`Processing sync queue: ${this.syncQueue.length} items`);

    const itemsToSync = [...this.syncQueue];
    const successfulIds: string[] = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        successfulIds.push(item.id);
        console.log(`Successfully synced item: ${item.id}`);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);

        // Increment retry count
        item.retryCount++;

        // Remove if max retries exceeded
        if (item.retryCount >= OnboardingNetworkManager.MAX_RETRIES) {
          console.error(`Max retries exceeded for item ${item.id}, removing from queue`);
          successfulIds.push(item.id); // Remove it
        } else {
          console.log(
            `Will retry item ${item.id} (attempt ${item.retryCount}/${OnboardingNetworkManager.MAX_RETRIES})`
          );
        }
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter((item) => !successfulIds.includes(item.id));
    this.saveQueue();

    this.isSyncing = false;

    // Show success message if queue is now empty
    if (this.syncQueue.length === 0 && successfulIds.length > 0) {
      const windowWithToast = window as Window & {
        showToast?: (msg: string, type: string) => void;
      };
      if (windowWithToast.showToast) {
        windowWithToast.showToast('All changes synced successfully', 'success');
      }
    }
  }

  /**
   * Sync a single item
   */
  private async syncItem(item: QueuedUpdate): Promise<void> {
    const apiBase = (window as Window & { API_BASE?: string }).API_BASE || '/api';
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      throw new Error('No auth token available');
    }

    let endpoint = '';
    let method = 'POST';
    let body: unknown = item.data;

    switch (item.type) {
      case 'state':
        endpoint = `${apiBase}/onboarding/state`;
        method = 'PUT';
        break;
      case 'circle':
        endpoint = `${apiBase}/contacts/${(item.data as { contactId: number }).contactId}/circle`;
        method = 'POST';
        break;
      case 'mapping':
        endpoint = `${apiBase}/google-contacts/accept-mapping`;
        method = 'POST';
        break;
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(
        OnboardingNetworkManager.QUEUE_KEY,
        JSON.stringify(
          this.syncQueue.map((item) => ({
            ...item,
            timestamp: item.timestamp.toISOString(),
          }))
        )
      );
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem(OnboardingNetworkManager.QUEUE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.syncQueue = parsed.map((item: QueuedUpdate & { timestamp: string }) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    itemCount: number;
    isSyncing: boolean;
    isOnline: boolean;
  } {
    return {
      itemCount: this.syncQueue.length,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
    };
  }

  /**
   * Clear the sync queue (for testing or reset)
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}

// Export singleton instance
let defaultNetworkManager: OnboardingNetworkManager | null = null;

export function getOnboardingNetworkManager(): OnboardingNetworkManager {
  if (!defaultNetworkManager) {
    defaultNetworkManager = new OnboardingNetworkManager();
  }
  return defaultNetworkManager;
}
