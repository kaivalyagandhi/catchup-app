/**
 * Google Contacts Sync Service
 *
 * Orchestrates full and incremental synchronization of contacts from Google Contacts.
 * Handles pagination, sync tokens, error recovery, and integrates with rate limiting.
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.6, 10.1, 10.2, 10.4, 10.6
 */

import { google } from 'googleapis';
import type { people_v1 } from 'googleapis';
import { GoogleContactsOAuthService } from './google-contacts-oauth-service';
import { ImportServiceImpl, GooglePerson } from '../contacts/import-service';
import { GoogleContactsRateLimiter } from './google-contacts-rate-limiter';
import {
  SyncStateRepository,
  PostgresSyncStateRepository,
  SyncResult,
  SyncError,
  SyncState,
} from './sync-state-repository';
import { ContactRepository, PostgresContactRepository } from '../contacts/repository';
import { getPeopleClient } from './google-contacts-config';
import { BatchProcessor, defaultBatchProcessor } from '../utils/batch-processor';
import { PerformanceMonitor, defaultPerformanceMonitor } from '../utils/performance-monitor';
import { MemoryCircuitBreaker, MemoryCircuitBreakerError } from '../utils/memory-circuit-breaker';
import { MemoryMonitor } from '../utils/memory-monitor';

/**
 * Google Contacts Sync Service
 */
export class GoogleContactsSyncService {
  private oauthService: GoogleContactsOAuthService;
  private importService: ImportServiceImpl;
  private rateLimiter: GoogleContactsRateLimiter;
  private syncStateRepository: SyncStateRepository;
  private contactRepository: ContactRepository;
  private batchProcessor: BatchProcessor;
  private performanceMonitor: PerformanceMonitor;
  private memoryBreaker: MemoryCircuitBreaker;
  private memoryMonitor: MemoryMonitor;

  constructor(
    oauthService?: GoogleContactsOAuthService,
    importService?: ImportServiceImpl,
    rateLimiter?: GoogleContactsRateLimiter,
    syncStateRepository?: SyncStateRepository,
    contactRepository?: ContactRepository,
    batchProcessor?: BatchProcessor,
    performanceMonitor?: PerformanceMonitor
  ) {
    this.oauthService = oauthService || new GoogleContactsOAuthService();
    this.importService = importService || new ImportServiceImpl();
    this.rateLimiter = rateLimiter || new GoogleContactsRateLimiter();
    this.syncStateRepository = syncStateRepository || new PostgresSyncStateRepository();
    this.contactRepository = contactRepository || new PostgresContactRepository();
    this.batchProcessor = batchProcessor || defaultBatchProcessor;
    this.performanceMonitor = performanceMonitor || defaultPerformanceMonitor;
    this.memoryBreaker = new MemoryCircuitBreaker({ maxHeapPercent: 80 });
    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * Perform full synchronization of all contacts using streaming approach
   *
   * Processes contacts one-by-one as they arrive instead of loading into memory.
   * This prevents memory buildup with large contact lists.
   *
   * Requirements: 2.2, 2.5, 12.1, 12.2
   */
  async performFullSync(userId: string, accessToken: string): Promise<SyncResult> {
    const operationId = `full-sync-${userId}-${Date.now()}`;
    const errors: SyncError[] = [];
    let contactsImported = 0;
    let pageToken: string | undefined = undefined;

    console.log(`Starting full sync for user ${userId}`);

    // Log memory before operation
    const memoryBefore = process.memoryUsage();

    // Start performance monitoring
    this.performanceMonitor.startOperation(operationId, 'Full Sync', { userId });

    try {
      // Check memory before starting
      await this.memoryBreaker.checkMemory();

      // Mark sync as in progress
      await this.syncStateRepository.markSyncInProgress(userId);

      // Get People API client (READ-ONLY operations only)
      const people = getPeopleClient({ access_token: accessToken });

      // Process pages one at a time, releasing memory after each
      do {
        try {
          // Check memory before processing each page
          await this.memoryBreaker.checkMemory();

          // Execute request with rate limiting and track API request
          this.performanceMonitor.incrementApiRequestCount(operationId);
          const response = await this.rateLimiter.executeRequest(userId, async () => {
            return await people.people.connections.list({
              resourceName: 'people/me',
              pageSize: 500, // Reduced from 1000 to lower memory usage
              pageToken: pageToken,
              personFields:
                'names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata',
            });
          });

          const connections = response.data.connections || [];
          const syncToken = response.data.nextSyncToken || undefined;
          pageToken = response.data.nextPageToken || undefined;

          console.log(
            `Fetched page with ${connections.length} contacts. ` +
              `Next page token: ${pageToken ? 'yes' : 'no'}, ` +
              `Sync token: ${syncToken ? 'yes' : 'no'}`
          );

          // Process contacts immediately without storing in arrays
          // This is the key memory optimization - process and discard
          for (const person of connections) {
            try {
              // Handle deleted contacts
              if (person.metadata?.deleted) {
                await this.importService.handleDeletedContact(userId, person.resourceName!);
                continue;
              }

              // Skip contacts without names
              if (!person.names || person.names.length === 0) {
                continue;
              }

              // Import contact immediately
              await this.importService.importContact(userId, person as GooglePerson);
              contactsImported++;

              // Periodic progress logging
              if (contactsImported % 100 === 0) {
                console.log(`Progress: ${contactsImported} contacts imported`);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(`Error importing contact ${person.resourceName}: ${errorMessage}`);
              errors.push({
                contactResourceName: person.resourceName || undefined,
                errorMessage,
                errorCode: 'IMPORT_ERROR',
              });
            }
          }

          // Store sync token if this is the last page
          if (!pageToken && syncToken) {
            await this.syncStateRepository.updateSyncToken(userId, syncToken);
            console.log(`Stored sync token for user ${userId}`);
          }

          // Force garbage collection after each page if available
          if (global.gc) {
            global.gc();
          }

          // Yield to event loop
          await new Promise((resolve) => setImmediate(resolve));
        } catch (error) {
          // Handle pagination errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error fetching page: ${errorMessage}`);

          // Check if this is a memory circuit breaker error
          if (error instanceof MemoryCircuitBreakerError) {
            console.error('Memory circuit breaker triggered during contact sync');
            throw error;
          }

          // Check if this is a token expiration error
          if (this.isSyncTokenExpiredError(error)) {
            console.log('Sync token expired during full sync (unexpected)');
            throw error;
          }

          // Check if this is an auth error
          if (this.isAuthError(error)) {
            console.log('Authentication error, attempting token refresh');
            try {
              const newAccessToken = await this.oauthService.refreshAccessToken(userId);
              // Retry with new token
              return await this.performFullSync(userId, newAccessToken);
            } catch (refreshError) {
              const refreshErrorMsg =
                refreshError instanceof Error ? refreshError.message : String(refreshError);
              throw new Error(`Token refresh failed: ${refreshErrorMsg}`);
            }
          }

          throw error;
        }
      } while (pageToken);

      // End performance monitoring
      const perfMetrics = this.performanceMonitor.endOperation(operationId, contactsImported);
      const duration = perfMetrics?.duration || 0;

      // Log memory after operation
      const memoryAfter = process.memoryUsage();
      this.memoryMonitor.logMemoryUsage('contact-sync-full', memoryBefore, memoryAfter);

      const result: SyncResult = {
        contactsImported,
        duration,
        errors,
      };

      // Mark sync as complete
      await this.syncStateRepository.markSyncComplete(userId, result);

      console.log(
        `Full sync completed for user ${userId}. ` +
          `Imported: ${contactsImported}, Duration: ${duration}ms, Errors: ${errors.length}`
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Full sync failed for user ${userId}: ${errorMessage}`);

      // End performance monitoring with error
      this.performanceMonitor.endOperation(operationId, contactsImported);

      // Mark sync as failed
      await this.syncStateRepository.markSyncFailed(userId, errorMessage);

      throw error;
    }
  }

  /**
   * Perform incremental sync using sync token
   *
   * Uses stored sync token to fetch only changed contacts since last sync.
   * Handles deleted contacts and updates sync token after completion.
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async performIncrementalSync(userId: string, accessToken: string): Promise<SyncResult> {
    const operationId = `incremental-sync-${userId}-${Date.now()}`;
    const errors: SyncError[] = [];
    let contactsUpdated = 0;
    let contactsDeleted = 0;

    console.log(`Starting incremental sync for user ${userId}`);

    // Log memory before operation
    const memoryBefore = process.memoryUsage();

    // Start performance monitoring
    this.performanceMonitor.startOperation(operationId, 'Incremental Sync', { userId });

    try {
      // Check memory before starting
      await this.memoryBreaker.checkMemory();

      // Mark sync as in progress
      await this.syncStateRepository.markSyncInProgress(userId);

      // Get sync state to retrieve sync token
      const syncState = await this.syncStateRepository.getSyncState(userId);

      if (!syncState || !syncState.syncToken) {
        console.log('No sync token found, performing full sync instead');
        return await this.performFullSync(userId, accessToken);
      }

      const syncToken = syncState.syncToken;
      console.log(`Using sync token for incremental sync`);

      // Get People API client (READ-ONLY operations only)
      // Requirements: 15.3 - Only GET requests are made to Google API
      const people = getPeopleClient({ access_token: accessToken });

      try {
        // Execute request with rate limiting and track API request
        this.performanceMonitor.incrementApiRequestCount(operationId);
        const response = await this.rateLimiter.executeRequest(userId, async () => {
          return await people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 100, // Smaller page size for incremental sync
            requestSyncToken: true,
            syncToken: syncToken,
            personFields:
              'names,emailAddresses,phoneNumbers,organizations,urls,addresses,memberships,metadata',
          });
        });

        const connections = response.data.connections || [];
        const newSyncToken = response.data.nextSyncToken || undefined;

        console.log(
          `Fetched ${connections.length} changed contacts. ` +
            `New sync token: ${newSyncToken ? 'yes' : 'no'}`
        );

        // Filter valid contacts for batch processing
        const validContacts = connections.filter((person) => {
          // Skip contacts without names
          if (!person.names || person.names.length === 0) {
            return false;
          }
          // Skip deleted contacts (handle separately)
          if (person.metadata?.deleted) {
            return false;
          }
          return true;
        });

        // Handle deleted contacts separately (not batched)
        const deletedContacts = connections.filter((person) => person.metadata?.deleted);
        for (const person of deletedContacts) {
          try {
            await this.importService.handleDeletedContact(userId, person.resourceName!);
            contactsDeleted++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error handling deleted contact ${person.resourceName}: ${errorMessage}`);
            errors.push({
              contactResourceName: person.resourceName || undefined,
              errorMessage,
              errorCode: 'DELETE_ERROR',
            });
          }
        }

        // Process valid contacts in batches
        await this.batchProcessor.processBatches(
          validContacts,
          async (batch) => {
            for (const person of batch) {
              try {
                await this.importService.importContact(userId, person as GooglePerson);
                contactsUpdated++;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error processing contact ${person.resourceName}: ${errorMessage}`);
                errors.push({
                  contactResourceName: person.resourceName || undefined,
                  errorMessage,
                  errorCode: 'IMPORT_ERROR',
                });
              }
            }
          },
          true // Use transactions
        );

        // Store new sync token
        if (newSyncToken) {
          await this.syncStateRepository.updateSyncToken(userId, newSyncToken);
          console.log(`Updated sync token for user ${userId}`);
        }

        // End performance monitoring
        const totalProcessed = contactsUpdated + contactsDeleted;
        const perfMetrics = this.performanceMonitor.endOperation(operationId, totalProcessed);
        const duration = perfMetrics?.duration || 0;

        // Log memory after operation
        const memoryAfter = process.memoryUsage();
        this.memoryMonitor.logMemoryUsage('contact-sync-incremental', memoryBefore, memoryAfter);

        const result: SyncResult = {
          contactsUpdated,
          contactsDeleted,
          syncToken: newSyncToken,
          duration,
          errors,
        };

        // Mark sync as complete
        await this.syncStateRepository.markSyncComplete(userId, result);

        console.log(
          `Incremental sync completed for user ${userId}. ` +
            `Updated: ${contactsUpdated}, Deleted: ${contactsDeleted}, ` +
            `Duration: ${duration}ms, Errors: ${errors.length}`
        );

        return result;
      } catch (error) {
        // Handle sync token expiration (410 Gone)
        if (this.isSyncTokenExpiredError(error)) {
          console.log('Sync token expired, triggering full sync');
          return await this.handleTokenExpiration(userId, accessToken);
        }

        // Handle auth errors
        if (this.isAuthError(error)) {
          console.log('Authentication error, attempting token refresh');
          try {
            const newAccessToken = await this.oauthService.refreshAccessToken(userId);
            // Retry with new token
            return await this.performIncrementalSync(userId, newAccessToken);
          } catch (refreshError) {
            const refreshErrorMsg =
              refreshError instanceof Error ? refreshError.message : String(refreshError);
            throw new Error(`Token refresh failed: ${refreshErrorMsg}`);
          }
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Incremental sync failed for user ${userId}: ${errorMessage}`);

      // End performance monitoring with error
      const totalProcessed = contactsUpdated + contactsDeleted;
      this.performanceMonitor.endOperation(operationId, totalProcessed);

      // Mark sync as failed
      await this.syncStateRepository.markSyncFailed(userId, errorMessage);

      throw error;
    }
  }

  /**
   * Handle sync token expiration (410 Gone error)
   *
   * Automatically triggers full synchronization when sync token expires.
   *
   * Requirements: 3.6
   */
  async handleTokenExpiration(userId: string, accessToken: string): Promise<SyncResult> {
    console.log(`Handling sync token expiration for user ${userId}`);

    // Clear the expired sync token
    await this.syncStateRepository.updateSyncToken(userId, '');

    // Perform full sync to establish new sync token
    return await this.performFullSync(userId, accessToken);
  }

  /**
   * Get current sync state for user
   */
  async getSyncState(userId: string): Promise<SyncState | null> {
    return await this.syncStateRepository.getSyncState(userId);
  }

  /**
   * Store sync token after successful sync
   */
  async storeSyncToken(userId: string, syncToken: string): Promise<void> {
    await this.syncStateRepository.updateSyncToken(userId, syncToken);
  }

  /**
   * Check if error is a sync token expiration error (410 Gone)
   */
  private isSyncTokenExpiredError(error: any): boolean {
    // Check for HTTP 410 status
    if (error.code === 410 || error.status === 410) {
      return true;
    }

    // Check for error message
    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return message.includes('sync token') && message.includes('expired');
    }

    // Check for Google API specific error structure
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.some((e: any) => e.reason === 'syncTokenExpired');
    }

    return false;
  }

  /**
   * Check if error is an authentication error (401)
   */
  private isAuthError(error: any): boolean {
    // Check for HTTP 401 status
    if (error.code === 401 || error.status === 401) {
      return true;
    }

    // Check for error message
    if (error.message && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return (
        message.includes('unauthorized') ||
        message.includes('invalid credentials') ||
        message.includes('token expired')
      );
    }

    return false;
  }
}

// Export singleton instance
export const googleContactsSyncService = new GoogleContactsSyncService();
