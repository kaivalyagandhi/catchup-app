/**
 * Job Types
 * 
 * Minimal job interface for Cloud Tasks processors.
 * Replaces Bull/BullMQ types after migration to Cloud Tasks.
 */

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
}
