# Media Downloader Service

## Overview

The Media Downloader service handles downloading media files from Twilio URLs with built-in safety features including size validation, streaming downloads, timeout handling, and automatic cleanup of temporary files.

## Features

- **Size Validation**: Enforces 5MB file size limit (configurable)
- **Streaming Downloads**: Avoids loading entire files into memory
- **Timeout Handling**: Prevents hanging on slow downloads (30s default)
- **Temporary File Management**: Automatic cleanup of old files
- **Authentication**: Supports Twilio Basic Auth with account SID extraction

## Usage

### Basic Download

```typescript
import { mediaDownloader } from './media-downloader';

// Download media to memory
const result = await mediaDownloader.downloadMedia(
  'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MEyyy',
  'your-twilio-auth-token'
);

console.log('Downloaded:', result.size, 'bytes');
console.log('Content-Type:', result.contentType);
console.log('Buffer:', result.buffer);
```

### Download to File (for large files)

```typescript
// Download to temporary file using streaming
const result = await mediaDownloader.downloadMediaToFile(
  'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages/MMxxx/Media/MEyyy',
  'your-twilio-auth-token'
);

console.log('Saved to:', result.tempFilePath);

// Process the file...

// Clean up when done
if (result.tempFilePath) {
  await mediaDownloader.deleteTempFile(result.tempFilePath);
}
```

### Custom Configuration

```typescript
import { MediaDownloader } from './media-downloader';

const customDownloader = new MediaDownloader({
  maxSizeMB: 10,           // Allow up to 10MB files
  timeoutMs: 60000,        // 60 second timeout
  tempDir: '/custom/path'  // Custom temp directory
});
```

### Size Validation

```typescript
// Validate buffer size
const buffer = Buffer.from('data');
const isValid = mediaDownloader.validateMediaSize(buffer);

// Validate size in bytes
const sizeInBytes = 3 * 1024 * 1024; // 3MB
const isValid = mediaDownloader.validateMediaSize(sizeInBytes);

// Custom size limit
const isValid = mediaDownloader.validateMediaSize(buffer, 10); // 10MB limit
```

### Cleanup Operations

```typescript
// Clean up files older than 30 days
const deletedCount = await mediaDownloader.cleanupTempFiles(30);
console.log(`Deleted ${deletedCount} old files`);

// Delete specific file
await mediaDownloader.deleteTempFile('/path/to/temp/file');

// Get temp directory size
const sizeInBytes = await mediaDownloader.getTempDirSize();
console.log(`Temp directory size: ${sizeInBytes} bytes`);
```

## Error Handling

The service throws descriptive errors for various failure scenarios:

```typescript
try {
  const result = await mediaDownloader.downloadMedia(url, token);
} catch (error) {
  if (error.message.includes('exceeds 5MB limit')) {
    // Handle file too large
  } else if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('HTTP')) {
    // Handle HTTP errors (404, 500, etc.)
  } else {
    // Handle other errors
  }
}
```

## Common Error Messages

- `"Media file exceeds 5MB limit"` - File is too large
- `"Download timeout after 30000ms"` - Download took too long
- `"Failed to download media: HTTP 404"` - Resource not found
- `"Failed to download media: HTTP 500"` - Server error
- `"Request error: ..."` - Network or connection error

## Integration with Twilio

The service automatically handles Twilio authentication:

1. Extracts Account SID from Twilio URL format
2. Creates Basic Auth header with Account SID and Auth Token
3. Downloads media with proper authentication

Twilio URL format:
```
https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages/{MessageSid}/Media/{MediaSid}
```

## Temporary File Management

### Default Behavior

- Temp files are stored in `temp/media/` directory
- Files are automatically created with unique names
- Files should be deleted after processing

### Cleanup Strategy

1. **Immediate Cleanup**: Delete files right after processing
   ```typescript
   const result = await mediaDownloader.downloadMediaToFile(url, token);
   // Process file...
   await mediaDownloader.deleteTempFile(result.tempFilePath);
   ```

2. **Scheduled Cleanup**: Run periodic cleanup job
   ```typescript
   // In a cron job or scheduled task
   setInterval(async () => {
     const deleted = await mediaDownloader.cleanupTempFiles(30);
     console.log(`Cleaned up ${deleted} old files`);
   }, 24 * 60 * 60 * 1000); // Daily
   ```

## Performance Considerations

### Memory Usage

- `downloadMedia()`: Loads entire file into memory (use for small files < 5MB)
- `downloadMediaToFile()`: Streams to disk (use for larger files or memory-constrained environments)

### Streaming Benefits

- Constant memory usage regardless of file size
- Size validation during download (stops early if too large)
- Better for concurrent downloads

### Timeout Configuration

- Default: 30 seconds
- Adjust based on expected file sizes and network conditions
- Consider user experience (don't make users wait too long)

## Security Considerations

1. **Size Limits**: Prevents memory exhaustion attacks
2. **Timeouts**: Prevents resource exhaustion from slow downloads
3. **Authentication**: Requires valid Twilio auth token
4. **Temp File Cleanup**: Prevents disk space exhaustion
5. **Path Validation**: Uses safe file paths to prevent directory traversal

## Testing

The service includes comprehensive tests covering:

- Size validation (within/exceeding limits)
- Successful downloads
- Timeout handling
- HTTP error responses
- File cleanup operations
- Streaming downloads
- Integration scenarios

Run tests:
```bash
npm test src/sms/media-downloader.test.ts
```

## Requirements Validation

This implementation satisfies the following requirements:

- **3.1**: Downloads audio files from Twilio URLs
- **4.1**: Downloads image files from Twilio URLs
- **4.5**: Validates image size (5MB limit)
- **5.1**: Downloads video files from Twilio URLs
- **5.5**: Validates video size (5MB limit)

## Related Services

- **Phone Number Service**: Manages user phone number verification
- **Message Processor**: Routes messages to appropriate handlers
- **AI Processor**: Processes downloaded media with AI services
- **Rate Limiter**: Controls message processing rate

## Future Enhancements

- Progress callbacks for large downloads
- Retry logic with exponential backoff
- Parallel download support
- Compression before storage
- CDN integration for faster downloads
