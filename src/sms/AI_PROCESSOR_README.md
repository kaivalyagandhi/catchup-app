# AI Processor Service

The AI Processor service handles intelligent content analysis for SMS/MMS enrichment using Google Cloud AI services.

## Features

- **Text Analysis**: Extract contact enrichments from text messages using Gemini API
- **Audio Transcription**: Convert voice notes to text using Speech-to-Text API
- **Audio Enrichment**: Transcribe and extract enrichments from audio files
- **Image Analysis**: Extract information from photos using Gemini Vision API
- **Video Analysis**: Analyze video content using Gemini multimodal API
- **Automatic Type Detection**: Process content based on MIME type

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Processor                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Text Processing                                     │    │
│  │ - Direct Gemini API call                           │    │
│  │ - Extract contacts, tags, locations, notes         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Audio Processing                                    │    │
│  │ 1. Speech-to-Text API → Transcript                 │    │
│  │ 2. Gemini API → Enrichments                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Image Processing                                    │    │
│  │ - Gemini Vision API                                │    │
│  │ - OCR + visual analysis                            │    │
│  │ - Extract business card info, context              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Video Processing                                    │    │
│  │ - Gemini Multimodal API                            │    │
│  │ - Visual + audio analysis                          │    │
│  │ - Extract people, activities, context              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Text Processing

```typescript
import { aiProcessor } from './ai-processor';

const text = 'Just met Sarah at the coffee shop. She loves hiking and photography.';
const enrichments = await aiProcessor.extractFromText(text);

console.log(enrichments);
// {
//   contacts: [{ name: 'Sarah', context: 'met at coffee shop' }],
//   tags: ['hiking', 'photography'],
//   locations: ['coffee shop'],
//   notes: 'Enjoys outdoor activities and creative hobbies'
// }
```

### Audio Processing

```typescript
import { aiProcessor } from './ai-processor';

const audioBuffer = await downloadAudioFromTwilio(mediaUrl);
const result = await aiProcessor.extractFromAudio(audioBuffer);

console.log('Transcript:', result.transcript);
console.log('Enrichments:', result.enrichments);
console.log('Processing time:', result.processingTime, 'ms');
```

### Image Processing

```typescript
import { aiProcessor } from './ai-processor';

const imageBuffer = await downloadImageFromTwilio(mediaUrl);
const enrichments = await aiProcessor.extractFromImage(imageBuffer);

console.log(enrichments);
// Extracts text from business cards, identifies people, locations, etc.
```

### Video Processing

```typescript
import { aiProcessor } from './ai-processor';

const videoBuffer = await downloadVideoFromTwilio(mediaUrl);
const result = await aiProcessor.extractFromVideo(videoBuffer);

console.log('Enrichments:', result.enrichments);
console.log('Processing time:', result.processingTime, 'ms');
```

### Automatic Type Detection

```typescript
import { aiProcessor } from './ai-processor';

// Automatically routes to the correct processor based on content type
const result = await aiProcessor.processContent(content, 'audio/ogg');
```

## Enrichment Data Structure

All processors return enrichment data in a consistent format:

```typescript
interface EnrichmentData {
  contacts: Array<{
    name: string;      // Contact name
    context: string;   // Context about the contact
  }>;
  tags: string[];      // Interest tags (1-3 words)
  locations: string[]; // Places mentioned
  notes: string;       // Additional context
}
```

## Configuration

### Environment Variables

```bash
# Google Cloud Configuration
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp  # Optional, defaults to this

# Speech-to-Text Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR
GOOGLE_CLOUD_API_KEY=your_api_key

SPEECH_TO_TEXT_LANGUAGE_CODE=en-US  # Optional, defaults to en-US
```

### Supported Audio Formats

- OGG Opus (default for MMS)
- MP3
- WAV
- FLAC
- AMR

### Supported Image Formats

- JPEG
- PNG
- GIF
- WebP

### Supported Video Formats

- MP4
- MOV
- AVI
- WebM

## Error Handling

All methods throw descriptive errors that can be caught and handled:

```typescript
try {
  const enrichments = await aiProcessor.extractFromText(text);
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle authentication error
  } else if (error.message.includes('quota')) {
    // Handle quota exceeded
  } else {
    // Handle other errors
  }
}
```

## Performance Considerations

### Processing Times

- **Text**: 1-3 seconds
- **Audio**: 5-15 seconds (depends on length)
- **Image**: 2-5 seconds
- **Video**: 10-30 seconds (depends on length)

### Optimization Tips

1. **Batch Processing**: Process multiple items in parallel when possible
2. **Caching**: Cache results for identical content
3. **Size Limits**: Enforce 5MB limit before processing
4. **Timeouts**: Set appropriate timeouts for long-running operations

### Cost Optimization

1. **Text First**: Process text captions before downloading media
2. **Smart Routing**: Use cheaper models for simple content
3. **Compression**: Compress media before sending to API
4. **Sampling**: For long videos, sample frames instead of full analysis

## API Quotas

### Google Cloud Speech-to-Text

- Free tier: 60 minutes/month
- Standard pricing: $0.006/15 seconds

### Google Gemini API

- Free tier: 15 requests/minute, 1500 requests/day
- Paid tier: Higher limits available

## Testing

See `ai-processor-example.ts` for usage examples.

## Integration with Message Processor

The AI processor is used by the message processor service:

```typescript
import { aiProcessor } from './ai-processor';
import { messageProcessor } from './message-processor';

// Message processor calls AI processor based on content type
const result = await messageProcessor.processMessage(twilioPayload, user);
```

## Requirements Mapping

- **Requirement 2.3**: Text enrichment extraction using Gemini API ✓
- **Requirement 3.2**: Audio transcription using Speech-to-Text API ✓
- **Requirement 3.3**: Text enrichment extraction from transcripts ✓
- **Requirement 4.2**: Image analysis using Gemini Vision API ✓
- **Requirement 4.3**: Text extraction from images (OCR) ✓
- **Requirement 5.2**: Video analysis using Gemini multimodal API ✓
- **Requirement 5.3**: Visual and audio context extraction from videos ✓

## Future Enhancements

1. **Streaming Support**: Real-time processing for long audio/video
2. **Multi-language**: Support for multiple languages
3. **Custom Models**: Fine-tuned models for better accuracy
4. **Batch API**: Use batch API for cost savings
5. **Caching Layer**: Redis cache for duplicate content
