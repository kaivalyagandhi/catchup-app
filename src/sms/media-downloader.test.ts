/**
 * Tests for Media Downloader Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MediaDownloader } from './media-downloader';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { AddressInfo } from 'net';

describe('MediaDownloader', () => {
  let downloader: MediaDownloader;
  let testServer: http.Server;
  let serverPort: number;
  const testTempDir = path.join(process.cwd(), 'temp', 'test-media');

  beforeEach(async () => {
    downloader = new MediaDownloader({
      maxSizeMB: 5,
      timeoutMs: 5000,
      tempDir: testTempDir
    });

    // Clean up test directory
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    // Close test server if running
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer.close(() => resolve());
      });
    }
  });

  describe('validateMediaSize', () => {
    it('should return true for files within size limit', () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(downloader.validateMediaSize(buffer)).toBe(true);
    });

    it('should return true for size in bytes within limit', () => {
      const size = 3 * 1024 * 1024; // 3MB
      expect(downloader.validateMediaSize(size)).toBe(true);
    });

    it('should return false for files exceeding size limit', () => {
      const size = 6 * 1024 * 1024; // 6MB (exceeds 5MB limit)
      expect(downloader.validateMediaSize(size)).toBe(false);
    });

    it('should return false for buffer exceeding size limit', () => {
      const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      expect(downloader.validateMediaSize(buffer)).toBe(false);
    });

    it('should respect custom max size parameter', () => {
      const size = 8 * 1024 * 1024; // 8MB
      expect(downloader.validateMediaSize(size, 10)).toBe(true);
      expect(downloader.validateMediaSize(size, 5)).toBe(false);
    });

    it('should handle edge case at exact limit', () => {
      const size = 5 * 1024 * 1024; // Exactly 5MB
      expect(downloader.validateMediaSize(size)).toBe(true);
    });

    it('should handle edge case just over limit', () => {
      const size = 5 * 1024 * 1024 + 1; // 5MB + 1 byte
      expect(downloader.validateMediaSize(size)).toBe(false);
    });
  });

  describe('downloadMedia', () => {
    beforeEach(() => {
      // Create a test HTTP server
      testServer = http.createServer((req, res) => {
        const auth = req.headers.authorization;
        
        // Check authentication
        if (!auth || !auth.startsWith('Basic ')) {
          res.writeHead(401);
          res.end('Unauthorized');
          return;
        }

        // Simulate different endpoints
        if (req.url === '/valid-media') {
          const data = Buffer.from('test media content');
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': data.length.toString()
          });
          res.end(data);
        } else if (req.url === '/large-media') {
          // Simulate file larger than 5MB
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': (6 * 1024 * 1024).toString()
          });
          // Send some data
          res.write(Buffer.alloc(1024));
          res.end();
        } else if (req.url === '/slow-media') {
          // Simulate slow download (will timeout)
          res.writeHead(200, {
            'Content-Type': 'audio/ogg'
          });
          // Don't send data, let it timeout
        } else if (req.url === '/error-media') {
          res.writeHead(500);
          res.end('Server Error');
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      return new Promise<void>((resolve) => {
        testServer.listen(0, () => {
          serverPort = (testServer.address() as AddressInfo).port;
          resolve();
        });
      });
    });

    it('should successfully download valid media', async () => {
      const url = `http://localhost:${serverPort}/valid-media`;
      const result = await downloader.downloadMedia(url, 'test-token');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.toString()).toBe('test media content');
      expect(result.contentType).toBe('image/jpeg');
      expect(result.size).toBe(18);
    });

    it('should reject media exceeding size limit', async () => {
      const url = `http://localhost:${serverPort}/large-media`;
      
      await expect(downloader.downloadMedia(url, 'test-token'))
        .rejects.toThrow('exceeds 5MB limit');
    });

    it('should timeout on slow downloads', async () => {
      const slowDownloader = new MediaDownloader({
        timeoutMs: 1000, // 1 second timeout
        tempDir: testTempDir
      });
      
      const url = `http://localhost:${serverPort}/slow-media`;
      
      await expect(slowDownloader.downloadMedia(url, 'test-token'))
        .rejects.toThrow('timeout');
    }, 10000);

    it('should handle HTTP error responses', async () => {
      const url = `http://localhost:${serverPort}/error-media`;
      
      await expect(downloader.downloadMedia(url, 'test-token'))
        .rejects.toThrow('HTTP 500');
    });

    it('should handle 404 not found', async () => {
      const url = `http://localhost:${serverPort}/not-found`;
      
      await expect(downloader.downloadMedia(url, 'test-token'))
        .rejects.toThrow('HTTP 404');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should delete files older than specified days', async () => {
      // Create temp directory
      await fs.mkdir(testTempDir, { recursive: true });

      // Create test files with different ages
      const oldFile = path.join(testTempDir, 'old-file.txt');
      const newFile = path.join(testTempDir, 'new-file.txt');

      await fs.writeFile(oldFile, 'old content');
      await fs.writeFile(newFile, 'new content');

      // Modify old file's timestamp to 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      await fs.utimes(oldFile, oldDate, oldDate);

      // Clean up files older than 30 days
      const deletedCount = await downloader.cleanupTempFiles(30);

      expect(deletedCount).toBe(1);

      // Verify old file is deleted
      await expect(fs.access(oldFile)).rejects.toThrow();

      // Verify new file still exists
      await expect(fs.access(newFile)).resolves.toBeUndefined();
    });

    it('should handle empty directory', async () => {
      const deletedCount = await downloader.cleanupTempFiles(30);
      expect(deletedCount).toBe(0);
    });

    it('should create temp directory if it does not exist', async () => {
      // Ensure directory doesn't exist
      await fs.rm(testTempDir, { recursive: true, force: true });

      const deletedCount = await downloader.cleanupTempFiles(30);
      expect(deletedCount).toBe(0);

      // Verify directory was created
      const stats = await fs.stat(testTempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle different age thresholds', async () => {
      await fs.mkdir(testTempDir, { recursive: true });

      // Create files with different ages
      const file1 = path.join(testTempDir, 'file1.txt');
      const file2 = path.join(testTempDir, 'file2.txt');
      const file3 = path.join(testTempDir, 'file3.txt');

      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');
      await fs.writeFile(file3, 'content3');

      // Set different ages
      const date1 = new Date();
      date1.setDate(date1.getDate() - 5);
      await fs.utimes(file1, date1, date1);

      const date2 = new Date();
      date2.setDate(date2.getDate() - 15);
      await fs.utimes(file2, date2, date2);

      const date3 = new Date();
      date3.setDate(date3.getDate() - 35);
      await fs.utimes(file3, date3, date3);

      // Clean up files older than 10 days
      const deletedCount = await downloader.cleanupTempFiles(10);

      expect(deletedCount).toBe(2); // file2 and file3

      // Verify file1 still exists
      await expect(fs.access(file1)).resolves.toBeUndefined();
    });
  });

  describe('deleteTempFile', () => {
    it('should delete specified file', async () => {
      await fs.mkdir(testTempDir, { recursive: true });
      const filePath = path.join(testTempDir, 'test-file.txt');
      await fs.writeFile(filePath, 'test content');

      await downloader.deleteTempFile(filePath);

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should not throw error if file does not exist', async () => {
      const filePath = path.join(testTempDir, 'non-existent.txt');
      
      await expect(downloader.deleteTempFile(filePath)).resolves.toBeUndefined();
    });
  });

  describe('getTempDirSize', () => {
    it('should return total size of temp directory', async () => {
      await fs.mkdir(testTempDir, { recursive: true });

      // Create test files
      await fs.writeFile(path.join(testTempDir, 'file1.txt'), 'a'.repeat(1000));
      await fs.writeFile(path.join(testTempDir, 'file2.txt'), 'b'.repeat(2000));

      const size = await downloader.getTempDirSize();

      expect(size).toBe(3000);
    });

    it('should return 0 for empty directory', async () => {
      const size = await downloader.getTempDirSize();
      expect(size).toBe(0);
    });

    it('should return 0 if directory does not exist', async () => {
      await fs.rm(testTempDir, { recursive: true, force: true });
      
      const size = await downloader.getTempDirSize();
      expect(size).toBe(0);
    });
  });

  describe('downloadMediaToFile', () => {
    beforeEach(() => {
      // Create a test HTTP server
      testServer = http.createServer((req, res) => {
        if (req.url === '/valid-media') {
          const data = Buffer.from('test media content for file');
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': data.length.toString()
          });
          res.end(data);
        } else if (req.url === '/large-media') {
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': (6 * 1024 * 1024).toString()
          });
          res.write(Buffer.alloc(1024));
          res.end();
        }
      });

      return new Promise<void>((resolve) => {
        testServer.listen(0, () => {
          serverPort = (testServer.address() as AddressInfo).port;
          resolve();
        });
      });
    });

    it('should download media to file and return buffer', async () => {
      const url = `http://localhost:${serverPort}/valid-media`;
      const result = await downloader.downloadMediaToFile(url, 'test-token');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.toString()).toBe('test media content for file');
      expect(result.contentType).toBe('image/jpeg');
      expect(result.tempFilePath).toBeDefined();

      // Verify file exists
      if (result.tempFilePath) {
        const fileContent = await fs.readFile(result.tempFilePath);
        expect(fileContent.toString()).toBe('test media content for file');
      }
    });

    it('should reject large files and clean up partial download', async () => {
      const url = `http://localhost:${serverPort}/large-media`;
      
      await expect(downloader.downloadMediaToFile(url, 'test-token'))
        .rejects.toThrow('exceeds 5MB limit');

      // Verify no temp files left behind
      const files = await fs.readdir(testTempDir).catch(() => []);
      expect(files.length).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete download and cleanup workflow', async () => {
      await fs.mkdir(testTempDir, { recursive: true });

      // Create multiple temp files
      const file1 = path.join(testTempDir, 'temp1.txt');
      const file2 = path.join(testTempDir, 'temp2.txt');
      
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      // Set old timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      await fs.utimes(file1, oldDate, oldDate);

      // Get initial size
      const initialSize = await downloader.getTempDirSize();
      expect(initialSize).toBeGreaterThan(0);

      // Clean up old files
      const deletedCount = await downloader.cleanupTempFiles(30);
      expect(deletedCount).toBe(1);

      // Verify size decreased
      const finalSize = await downloader.getTempDirSize();
      expect(finalSize).toBeLessThan(initialSize);
    });
  });
});
