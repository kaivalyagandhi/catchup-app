import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as voiceService from '../../voice/voice-service';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// POST /voice-notes - Upload and process a voice note
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const voiceNote = await voiceService.processVoiceNote(
      userId,
      req.file.buffer,
      req.file.originalname
    );
    
    res.status(201).json(voiceNote);
  } catch (error) {
    console.error('Error processing voice note:', error);
    res.status(500).json({ error: 'Failed to process voice note' });
  }
});

// GET /voice-notes/:id - Get a specific voice note
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const voiceNote = await voiceService.getVoiceNote(req.params.id);
    
    if (!voiceNote) {
      return res.status(404).json({ error: 'Voice note not found' });
    }
    
    res.json(voiceNote);
  } catch (error) {
    console.error('Error fetching voice note:', error);
    res.status(500).json({ error: 'Failed to fetch voice note' });
  }
});

// POST /voice-notes/:id/enrichment - Apply enrichment from voice note
router.post('/:id/enrichment', async (req: Request, res: Response) => {
  try {
    const { userId, contactId, enrichmentItems } = req.body;
    
    if (!userId || !enrichmentItems || !Array.isArray(enrichmentItems)) {
      return res.status(400).json({ error: 'userId and enrichmentItems array are required' });
    }
    
    const result = await voiceService.applyEnrichment(
      contactId || null,
      userId,
      enrichmentItems
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error applying enrichment:', error);
    res.status(500).json({ error: 'Failed to apply enrichment' });
  }
});

export default router;
