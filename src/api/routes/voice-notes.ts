import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as voiceService from '../../voice/voice-service';
import { VoiceNoteService } from '../../voice/voice-note-service';
import { VoiceNoteRepository } from '../../voice/voice-repository';
import { EnrichmentService } from '../../voice/enrichment-service';
import { contactService } from '../../contacts/service';
import { VoiceNoteFilters } from '../../types';

const router = Router();
const voiceNoteService = VoiceNoteService.getInstance();
const voiceNoteRepository = new VoiceNoteRepository();
const enrichmentService = new EnrichmentService();

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

// POST /api/voice-notes/sessions - Create recording session
// Requirements: 1.1, 1.2, 1.3
router.post('/sessions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, languageCode } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const session = await voiceNoteService.createSession(userId, languageCode || 'en-US');

    res.status(201).json({
      sessionId: session.id,
      userId: session.userId,
      status: session.status,
      startTime: session.startTime,
    });
  } catch (error) {
    console.error('Error creating voice note session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to create recording session',
      details: errorMessage,
    });
  }
});

// POST /api/voice-notes/:sessionId/finalize - Finalize voice note
// Requirements: 1.7, 2.1-2.6, 3.1-3.6
router.post('/:sessionId/finalize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get user's contacts for disambiguation
    const userContacts = await contactService.listContacts(userId);

    // Finalize the voice note
    const result = await voiceNoteService.finalizeVoiceNote(sessionId, userContacts);

    res.json({
      voiceNote: result.voiceNote,
      enrichmentProposal: result.proposal,
    });
  } catch (error) {
    console.error('Error finalizing voice note:', error);
    res.status(500).json({
      error: 'Failed to finalize voice note',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/voice-notes/:id - Get voice note by ID
// Requirements: 13.4
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    const voiceNote = await voiceNoteRepository.getById(id, userId as string);

    if (!voiceNote) {
      res.status(404).json({ error: 'Voice note not found' });
      return;
    }

    res.json(voiceNote);
  } catch (error) {
    console.error('Error fetching voice note:', error);
    res.status(500).json({ error: 'Failed to fetch voice note' });
  }
});

// GET /api/voice-notes - List voice notes with filters
// Requirements: 6.1-6.8, 13.4, 13.6, 13.7, 13.8
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, contactIds, status, dateFrom, dateTo, searchText } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    // Build filters
    const filters: VoiceNoteFilters = {};

    if (contactIds) {
      filters.contactIds = Array.isArray(contactIds)
        ? (contactIds as string[])
        : [contactIds as string];
    }

    if (status) {
      filters.status = status as any;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    if (searchText) {
      filters.searchText = searchText as string;
    }

    const voiceNotes = await voiceNoteRepository.listByUserId(userId as string, filters);

    res.json(voiceNotes);
  } catch (error) {
    console.error('Error listing voice notes:', error);
    res.status(500).json({ error: 'Failed to list voice notes' });
  }
});

// DELETE /api/voice-notes/:id - Delete voice note
// Requirements: 13.7
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }

    await voiceNoteRepository.delete(id, userId as string);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting voice note:', error);
    if (error instanceof Error && error.message === 'Voice note not found') {
      res.status(404).json({ error: 'Voice note not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete voice note' });
    }
  }
});

// POST /voice-notes - Upload and process a voice note (Google Speech-to-Text)
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(
      `Processing voice note upload for user ${userId}, file size: ${req.file.size} bytes`
    );

    // Use the new VoiceNoteService to process the audio
    // 1. Transcribe the audio file
    const transcriptionService = new (
      await import('../../voice/transcription-service')
    ).TranscriptionService();
    const transcriptResult = await transcriptionService.transcribeAudioFile(req.file.buffer);

    console.log(`Transcription complete: ${transcriptResult.transcript}`);

    // 2. Get user contacts and identify which ones are mentioned
    const userContacts = await contactService.listContacts(userId);
    const disambiguationService = new (
      await import('../../voice/contact-disambiguation-service')
    ).ContactDisambiguationService();
    const extractionService = new (
      await import('../../voice/entity-extraction-service')
    ).EntityExtractionService();
    const enrichmentServiceInstance = new (
      await import('../../voice/enrichment-service')
    ).EnrichmentService();

    // 3. Disambiguate which contacts are mentioned in the transcript
    const mentionedContacts = await disambiguationService.disambiguate(
      transcriptResult.transcript,
      userContacts
    );
    console.log(
      `Identified ${mentionedContacts.length} mentioned contacts:`,
      mentionedContacts.map((c) => c.name)
    );

    // 4. Extract entities only for mentioned contacts
    const entities = await extractionService.extractForMultipleContacts(
      transcriptResult.transcript,
      mentionedContacts
    );
    console.log(`Entities extracted for mentioned contacts`);

    // 5. Create voice note record with transcript
    const voiceNote = await voiceNoteRepository.create({
      userId,
      transcript: transcriptResult.transcript,
      status: 'extracting' as any,
    });

    console.log(`Voice note created: ${voiceNote.id}`);

    // 6. Generate enrichment proposal
    const proposal = await enrichmentServiceInstance.generateProposal(
      voiceNote.id,
      entities,
      mentionedContacts
    );
    console.log(`Enrichment proposal generated`);

    // 7. Associate mentioned contacts with the voice note
    if (mentionedContacts.length > 0) {
      const contactIds = mentionedContacts.map((c) => c.id);
      await voiceNoteRepository.associateContacts(voiceNote.id, userId, contactIds);
      console.log(`Associated ${contactIds.length} contacts with voice note`);
    }

    // 8. Update voice note with enrichment data and mark as ready
    const updatedVoiceNote = await voiceNoteRepository.update(voiceNote.id, userId, {
      enrichmentData: proposal,
      status: 'ready' as any,
    });

    console.log('Voice note updated with enrichment data');
    res.status(201).json(updatedVoiceNote);
  } catch (error) {
    console.error('Error processing voice note:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to process voice note',
      details: errorMessage,
    });
  }
});

// POST /api/voice-notes/:id/enrichment/apply - Apply enrichment
// Requirements: 4.8, 4.9, 4.10, 4.11
router.post('/:id/enrichment/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, enrichmentProposal } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!enrichmentProposal) {
      res.status(400).json({ error: 'enrichmentProposal is required' });
      return;
    }

    // Verify voice note exists and belongs to user
    const voiceNote = await voiceNoteRepository.getById(id, userId);
    if (!voiceNote) {
      res.status(404).json({ error: 'Voice note not found' });
      return;
    }

    // Create pending edits for each enrichment item instead of applying directly
    // This allows users to review before applying
    const { EditService } = await import('../../edits/edit-service');
    const editService = new EditService();

    let totalCreated = 0;
    let totalFailed = 0;

    for (const contactProposal of enrichmentProposal.contactProposals) {
      if (!contactProposal.contactId) continue;

      for (const item of contactProposal.items) {
        if (!item.accepted) continue;

        try {
          // Map enrichment item types to edit types
          let editType: string;
          let proposedValue: string;
          let field: string | undefined;

          if (item.type === 'tag') {
            editType = 'add_tag';
            proposedValue = item.value;
          } else if (item.type === 'group') {
            editType = 'add_to_group';
            proposedValue = item.value;
          } else if (item.type === 'field') {
            editType = 'update_contact_field';
            proposedValue = item.value;
            field = item.field; // Include the field name for field updates
          } else if (item.type === 'lastContactDate') {
            editType = 'update_contact_field';
            proposedValue = item.value;
            field = 'lastContactDate';
          } else {
            console.warn(`Unknown enrichment item type: ${item.type}`);
            totalFailed++;
            continue;
          }

          // Create a pending edit for each enrichment item
          await editService.createPendingEdit({
            userId,
            sessionId: id, // Use voice note ID as session ID
            editType: editType as any,
            field, // Include field for field updates
            proposedValue: proposedValue,
            targetContactId: contactProposal.contactId,
            targetContactName: contactProposal.contactName,
            confidenceScore: 0.9, // High confidence for enrichment
            source: {
              type: 'voice_transcript',
              transcriptExcerpt: voiceNote.transcript?.substring(0, 200),
              timestamp: new Date(),
            },
          });
          totalCreated++;
        } catch (itemError) {
          console.error(`Failed to create edit for item ${item.id}:`, itemError);
          totalFailed++;
        }
      }
    }

    // Update voice note status to 'applied' if successful
    if (totalCreated > 0) {
      await voiceNoteRepository.update(id, userId, { status: 'applied' });
    }

    res.json({
      success: totalFailed === 0,
      totalApplied: totalCreated,
      totalFailed: totalFailed,
    });
  } catch (error) {
    console.error('Error applying enrichment:', error);
    res.status(500).json({
      error: 'Failed to apply enrichment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PATCH /api/voice-notes/:id/contacts - Update contact associations
// Requirements: 2.2, 2.6
router.patch('/:id/contacts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, contactIds, action } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!contactIds || !Array.isArray(contactIds)) {
      res.status(400).json({ error: 'contactIds array is required' });
      return;
    }

    if (!action || !['add', 'remove', 'replace'].includes(action)) {
      res.status(400).json({ error: 'action must be one of: add, remove, replace' });
      return;
    }

    // Verify voice note exists and belongs to user
    const voiceNote = await voiceNoteRepository.getById(id, userId);
    if (!voiceNote) {
      res.status(404).json({ error: 'Voice note not found' });
      return;
    }

    // Handle different actions
    if (action === 'add') {
      // Add new contact associations
      await voiceNoteRepository.associateContacts(id, userId, contactIds);
    } else if (action === 'remove') {
      // Remove contact associations
      for (const contactId of contactIds) {
        await voiceNoteRepository.removeContactAssociation(id, userId, contactId);
      }
    } else if (action === 'replace') {
      // Get current contacts
      const currentContacts = await voiceNoteRepository.getAssociatedContacts(id, userId);

      // Remove all current associations
      for (const contact of currentContacts) {
        await voiceNoteRepository.removeContactAssociation(id, userId, contact.id);
      }

      // Add new associations
      await voiceNoteRepository.associateContacts(id, userId, contactIds);
    }

    // Get updated voice note with new contacts
    const updatedVoiceNote = await voiceNoteRepository.getById(id, userId);

    res.json(updatedVoiceNote);
  } catch (error) {
    console.error('Error updating contact associations:', error);
    res.status(500).json({
      error: 'Failed to update contact associations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/voice-notes/text - Process a text message for enrichment (no audio)
// This allows users to type messages like "Carol is moving to SF" and get enrichment proposals
router.post('/text', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, text } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text is required and must be a non-empty string' });
      return;
    }

    const transcript = text.trim();
    console.log(`Processing text message for user ${userId}: "${transcript}"`);

    // 1. Get user contacts for disambiguation
    const userContacts = await contactService.listContacts(userId);

    if (userContacts.length === 0) {
      res.status(200).json({
        voiceNote: null,
        enrichmentProposal: null,
        message: 'No contacts found. Add contacts first to enable enrichment.',
      });
      return;
    }

    // 2. Disambiguate which contacts are mentioned in the text
    const disambiguationService = new (
      await import('../../voice/contact-disambiguation-service')
    ).ContactDisambiguationService();
    const extractionService = new (
      await import('../../voice/entity-extraction-service')
    ).EntityExtractionService();
    const enrichmentServiceInstance = new (
      await import('../../voice/enrichment-service')
    ).EnrichmentService();

    const mentionedContacts = await disambiguationService.disambiguate(transcript, userContacts);
    console.log(
      `Identified ${mentionedContacts.length} mentioned contacts:`,
      mentionedContacts.map((c) => c.name)
    );

    if (mentionedContacts.length === 0) {
      res.status(200).json({
        voiceNote: null,
        enrichmentProposal: null,
        message: 'No contacts identified in the message. Try mentioning a contact by name.',
        mentionedContacts: [],
      });
      return;
    }

    // 3. Extract entities for mentioned contacts
    const entities = await extractionService.extractForMultipleContacts(
      transcript,
      mentionedContacts
    );
    console.log(`Entities extracted for ${mentionedContacts.length} contacts`);

    // 4. Create voice note record with the text as transcript
    const voiceNote = await voiceNoteRepository.create({
      userId,
      transcript,
      status: 'extracting' as any,
    });

    console.log(`Voice note created from text: ${voiceNote.id}`);

    // 5. Generate enrichment proposal
    const proposal = await enrichmentServiceInstance.generateProposal(
      voiceNote.id,
      entities,
      mentionedContacts
    );
    console.log(
      `Enrichment proposal generated with ${proposal.contactProposals.length} contact proposals`
    );

    // 6. Associate mentioned contacts with the voice note
    const contactIds = mentionedContacts.map((c) => c.id);
    await voiceNoteRepository.associateContacts(voiceNote.id, userId, contactIds);
    console.log(`Associated ${contactIds.length} contacts with voice note`);

    // 7. Create a chat session for this text input
    const { SessionManager } = await import('../../edits/session-manager');
    const sessionManager = new SessionManager();
    const chatSession = await sessionManager.startSession(userId);
    console.log(`Chat session created: ${chatSession.id}`);

    // 8. Create pending edits for each enrichment item (same as audio flow)
    const { EditService } = await import('../../edits/edit-service');
    const editService = new EditService();

    let totalCreated = 0;
    let totalFailed = 0;

    for (const contactProposal of proposal.contactProposals) {
      if (!contactProposal.contactId) continue;

      for (const item of contactProposal.items) {
        if (!item.accepted) continue;

        try {
          // Map enrichment item types to edit types
          let editType: string;
          let proposedValue: string;
          let field: string | undefined;

          if (item.type === 'tag') {
            editType = 'add_tag';
            proposedValue = item.value;
          } else if (item.type === 'group') {
            editType = 'add_to_group';
            proposedValue = item.value;
          } else if (item.type === 'field') {
            editType = 'update_contact_field';
            proposedValue = item.value;
            field = item.field; // Include the field name for field updates
          } else if (item.type === 'lastContactDate') {
            editType = 'update_contact_field';
            proposedValue = item.value;
            field = 'lastContactDate';
          } else {
            console.warn(`Unknown enrichment item type: ${item.type}`);
            totalFailed++;
            continue;
          }

          // Create a pending edit for each enrichment item
          await editService.createPendingEdit({
            userId,
            sessionId: chatSession.id, // Use chat session ID
            editType: editType as any,
            field, // Include field for field updates
            proposedValue: proposedValue,
            targetContactId: contactProposal.contactId,
            targetContactName: contactProposal.contactName,
            confidenceScore: 0.9, // High confidence for enrichment
            source: {
              type: 'text_input',
              transcriptExcerpt: transcript.substring(0, 200),
              timestamp: new Date(),
            },
          });
          totalCreated++;
        } catch (itemError) {
          console.error(`Failed to create edit for item ${item.id}:`, itemError);
          totalFailed++;
        }
      }
    }

    console.log(`Created ${totalCreated} pending edits from text message`);

    // 9. Update voice note with enrichment data and mark as ready
    const updatedVoiceNote = await voiceNoteRepository.update(voiceNote.id, userId, {
      enrichmentData: proposal,
      status: 'ready' as any,
    });

    // Check if there are any actual enrichment items
    const hasEnrichmentItems = proposal.contactProposals.some((cp) => cp.items.length > 0);

    res.status(201).json({
      voiceNote: updatedVoiceNote,
      enrichmentProposal: proposal,
      mentionedContacts: mentionedContacts.map((c) => ({ id: c.id, name: c.name })),
      editsCreated: totalCreated,
      message: hasEnrichmentItems
        ? `Found ${proposal.contactProposals.reduce((sum, cp) => sum + cp.items.length, 0)} enrichment items for ${mentionedContacts.length} contact(s).`
        : 'Contact identified but no new information to add.',
    });
  } catch (error) {
    console.error('Error processing text message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to process text message',
      details: errorMessage,
    });
  }
});

// Legacy endpoint - POST /voice-notes/:id/enrichment - Apply enrichment from voice note
router.post('/:id/enrichment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, enrichmentProposal } = req.body;

    if (!userId || !enrichmentProposal) {
      res.status(400).json({ error: 'userId and enrichmentProposal are required' });
      return;
    }

    const { ContactServiceImpl } = await import('../../contacts/service');
    const { TagServiceImpl } = await import('../../contacts/tag-service');
    const { GroupServiceImpl } = await import('../../contacts/group-service');

    const result = await voiceService.applyEnrichment(
      enrichmentProposal.contactId,
      userId,
      enrichmentProposal,
      new ContactServiceImpl(),
      new TagServiceImpl(),
      new GroupServiceImpl()
    );

    res.json(result);
  } catch (error) {
    console.error('Error applying enrichment:', error);
    res.status(500).json({ error: 'Failed to apply enrichment' });
  }
});

// POST /api/voice-notes/sessions/:sessionId/reject-suggestion
// Record a rejected enrichment suggestion
router.post(
  '/sessions/:sessionId/reject-suggestion',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { suggestionId } = req.body;

      if (!suggestionId) {
        res.status(400).json({ error: 'suggestionId is required' });
        return;
      }

      voiceNoteService.recordRejectedSuggestion(sessionId, suggestionId);

      res.json({
        success: true,
        message: `Suggestion ${suggestionId} recorded as rejected`,
      });
    } catch (error) {
      console.error('Error recording rejected suggestion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        error: 'Failed to record rejected suggestion',
        details: errorMessage,
      });
    }
  }
);

export default router;
