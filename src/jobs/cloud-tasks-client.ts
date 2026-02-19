/**
 * Cloud Tasks Client Wrapper
 * 
 * Provides a BullMQ-compatible interface for easy migration from BullMQ to Cloud Tasks.
 * Uses HTTP-based Cloud Tasks API instead of TCP-based Redis connections.
 */

import { CloudTasksClient } from '@google-cloud/tasks';
import { createHash } from 'crypto';
import { QUEUE_CONFIGS } from './cloud-tasks-config';

export interface TaskOptions {
  delay?: number; // Delay in seconds
  scheduleTime?: Date; // Absolute schedule time
  attempts?: number; // Max retry attempts (overrides queue config)
}

export class CloudTasksQueue {
  private client: CloudTasksClient;
  private projectId: string;
  private location: string;
  private serviceUrl: string;
  private serviceAccountEmail: string;
  private queueName: string;
  private jobName: string;

  constructor(jobName: string) {
    this.client = new CloudTasksClient();
    this.projectId = process.env.GCP_PROJECT_ID || 'catchup-479221';
    this.location = process.env.GCP_REGION || 'us-central1';
    this.serviceUrl = process.env.CLOUD_RUN_URL || 'http://localhost:3000';
    this.serviceAccountEmail = process.env.SERVICE_ACCOUNT_EMAIL || '402592213346-compute@developer.gserviceaccount.com';
    
    const config = QUEUE_CONFIGS[jobName];
    if (!config) {
      throw new Error(`Unknown job type: ${jobName}`);
    }
    this.queueName = config.name;
    this.jobName = jobName;
  }

  /**
   * Add a task to the queue (BullMQ-compatible interface)
   */
  async add(jobName: string, data: any, options?: TaskOptions): Promise<string> {
    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(jobName, data);
    
    // Calculate schedule time
    let scheduleTime: { seconds: number } | undefined;
    if (options?.scheduleTime) {
      scheduleTime = { seconds: Math.floor(options.scheduleTime.getTime() / 1000) };
    } else if (options?.delay) {
      scheduleTime = { seconds: Math.floor(Date.now() / 1000) + options.delay };
    }
    
    // Validate schedule time (max 30 days)
    if (scheduleTime) {
      const maxScheduleLimit = 30 * 24 * 60 * 60; // 30 days in seconds
      const now = Math.floor(Date.now() / 1000);
      if (scheduleTime.seconds - now > maxScheduleLimit) {
        throw new Error('Schedule time cannot be more than 30 days in the future');
      }
      if (scheduleTime.seconds < now) {
        throw new Error('Schedule time cannot be in the past');
      }
    }

    // Create task
    const task = {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: `${this.serviceUrl}/api/jobs/${jobName}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          data,
          idempotencyKey,
          jobName
        })).toString('base64'),
        oidcToken: {
          serviceAccountEmail: this.serviceAccountEmail,
          audience: this.serviceUrl
        }
      },
      scheduleTime
    };

    const parent = this.client.queuePath(this.projectId, this.location, this.queueName);
    
    try {
      const [response] = await this.client.createTask({ parent, task });
      console.log(`[Cloud Tasks] Created task: ${response.name}`);
      return response.name || '';
    } catch (error: any) {
      console.error(`[Cloud Tasks] Error creating task:`, error);
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Generate idempotency key from job name and data
   */
  private generateIdempotencyKey(jobName: string, data: any): string {
    const hash = createHash('sha256');
    hash.update(jobName);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Close the client (for compatibility with BullMQ)
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}
