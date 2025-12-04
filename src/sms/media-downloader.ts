/**
 * Media Downloader Service
 *
 * Handles downloading media files from Twilio URLs with:
 * - File size validation (5MB limit)
 * - Streaming downloads to avoid memory issues
 * - Timeout handling for slow downloads
 * - Temporary file cleanup
 *
 * Requirements: 3.1, 4.1, 4.5, 5.1, 5.5
 */

import https from 'https';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface MediaDownloadOptions {
  maxSizeMB?: number;
  timeoutMs?: number;
  tempDir?: string;
}

export interface MediaDownloadResult {
  buffer: Buffer;
  contentType: string;
  size: number;
  tempFilePath?: string;
}

export class MediaDownloader {
  private readonly maxSizeMB: number;
  private readonly timeoutMs: number;
  private readonly tempDir: string;

  constructor(options: MediaDownloadOptions = {}) {
    this.maxSizeMB = options.maxSizeMB ?? 5;
    this.timeoutMs = options.timeoutMs ?? 30000; // 30 seconds default
    this.tempDir = options.tempDir ?? path.join(process.cwd(), 'temp', 'media');
  }

  /**
   * Download media from a URL with streaming and size validation
   *
   * @param url - The URL to download from (Twilio media URL)
   * @param authToken - Twilio auth token for authentication
   * @returns Promise resolving to buffer and metadata
   * @throws Error if download fails, times out, or exceeds size limit
   */
  async downloadMedia(url: string, authToken: string): Promise<MediaDownloadResult> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      // Prepare authentication header
      // For Twilio URLs, extract account SID; otherwise use a default username
      const accountSid = this.extractAccountSid(url) || 'ACdefault';
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const options = {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: this.timeoutMs,
      };

      const request = protocol.get(url, options, async (response) => {
        // Check response status
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download media: HTTP ${response.statusCode}`));
          return;
        }

        // Get content type and size
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);

        // Validate size before downloading
        if (contentLength > 0 && !this.validateSize(contentLength)) {
          reject(new Error(`Media file exceeds ${this.maxSizeMB}MB limit`));
          response.destroy();
          return;
        }

        // Collect chunks
        const chunks: Buffer[] = [];
        let downloadedSize = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length;

          // Check size during download
          if (!this.validateSize(downloadedSize)) {
            reject(new Error(`Media file exceeds ${this.maxSizeMB}MB limit`));
            response.destroy();
            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            contentType,
            size: downloadedSize,
          });
        });

        response.on('error', (error) => {
          reject(new Error(`Download error: ${error.message}`));
        });
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Download timeout after ${this.timeoutMs}ms`));
      });

      request.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });
    });
  }

  /**
   * Download media to a temporary file using streaming
   * Useful for very large files to avoid memory issues
   *
   * @param url - The URL to download from
   * @param authToken - Twilio auth token
   * @returns Promise resolving to file path and metadata
   */
  async downloadMediaToFile(url: string, authToken: string): Promise<MediaDownloadResult> {
    // Ensure temp directory exists
    await this.ensureTempDir();

    // Generate unique filename
    const filename = `media_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempFilePath = path.join(this.tempDir, filename);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      // For Twilio URLs, extract account SID; otherwise use a default username
      const accountSid = this.extractAccountSid(url) || 'ACdefault';
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const options = {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: this.timeoutMs,
      };

      const request = protocol.get(url, options, async (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download media: HTTP ${response.statusCode}`));
          return;
        }

        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);

        if (contentLength > 0 && !this.validateSize(contentLength)) {
          reject(new Error(`Media file exceeds ${this.maxSizeMB}MB limit`));
          response.destroy();
          return;
        }

        const fileStream = createWriteStream(tempFilePath);
        let downloadedSize = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedSize += chunk.length;

          if (!this.validateSize(downloadedSize)) {
            reject(new Error(`Media file exceeds ${this.maxSizeMB}MB limit`));
            response.destroy();
            fileStream.destroy();
            // Clean up partial file
            fs.unlink(tempFilePath).catch(() => {});
            return;
          }
        });

        try {
          await pipeline(response, fileStream);

          // Read file back to buffer
          const buffer = await fs.readFile(tempFilePath);

          resolve({
            buffer,
            contentType,
            size: downloadedSize,
            tempFilePath,
          });
        } catch (error) {
          // Clean up on error
          await fs.unlink(tempFilePath).catch(() => {});
          reject(new Error(`Stream error: ${(error as Error).message}`));
        }
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Download timeout after ${this.timeoutMs}ms`));
      });

      request.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });
    });
  }

  /**
   * Validate if a buffer or size is within the allowed limit
   *
   * @param bufferOrSize - Buffer or size in bytes
   * @param maxSizeMB - Optional max size override
   * @returns true if valid, false if exceeds limit
   */
  validateMediaSize(bufferOrSize: Buffer | number, maxSizeMB?: number): boolean {
    const size = typeof bufferOrSize === 'number' ? bufferOrSize : bufferOrSize.length;
    const limit = maxSizeMB ?? this.maxSizeMB;
    return this.validateSize(size, limit);
  }

  /**
   * Clean up temporary files older than specified days
   *
   * @param olderThanDays - Delete files older than this many days
   * @returns Promise resolving to number of files deleted
   */
  async cleanupTempFiles(olderThanDays: number = 30): Promise<number> {
    try {
      // Ensure temp directory exists
      await this.ensureTempDir();

      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);

        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Skip files that can't be accessed
          console.error(`Error processing file ${file}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Cleanup failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a specific temporary file
   *
   * @param filePath - Path to the file to delete
   */
  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete temp file: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get the size of the temp directory
   *
   * @returns Promise resolving to size in bytes
   */
  async getTempDirSize(): Promise<number> {
    try {
      await this.ensureTempDir();

      const files = await fs.readdir(this.tempDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Private helper to validate size against limit
   */
  private validateSize(sizeInBytes: number, maxSizeMB?: number): boolean {
    const limit = maxSizeMB ?? this.maxSizeMB;
    const maxBytes = limit * 1024 * 1024;
    return sizeInBytes <= maxBytes;
  }

  /**
   * Private helper to ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory: ${(error as Error).message}`);
    }
  }

  /**
   * Private helper to extract account SID from Twilio URL
   * Twilio URLs follow pattern: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/...
   * Returns null if URL doesn't match Twilio format
   */
  private extractAccountSid(url: string): string | null {
    const match = url.match(/\/Accounts\/([^\/]+)\//);
    return match ? match[1] : null;
  }
}

// Export singleton instance with default configuration
export const mediaDownloader = new MediaDownloader();
