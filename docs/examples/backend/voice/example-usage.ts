/**
 * Voice Processing Service - Example Usage
 *
 * This file demonstrates how to use the voice processing service
 * for transcribing audio, extracting entities, and enriching contacts.
 */

import {
  transcribeAudio,
  storeAudioFile,
  disambiguateContact,
  extractEntities,
  generateEnrichmentConfirmation,
  applyEnrichment,
} from './voice-service';
import { VoiceNoteRepository } from './voice-repository';
import { contactService } from '../contacts/service';
import { tagService } from '../contacts/tag-service';
import { groupService } from '../contacts/group-service';
import pool from '../db/connection';

/**
 * Example: Complete voice note processing workflow
 */
export async function processVoiceNote(
  userId: string,
  audioData: Buffer,
  filename: string
): Promise<void> {
  const voiceNoteRepo = new VoiceNoteRepository(pool);

  try {
    // Step 1: Store the audio file
    console.log('Storing audio file...');
    const audioUrl = await storeAudioFile(audioData, userId, filename);

    // Step 2: Transcribe the audio
    console.log('Transcribing audio...');
    const transcript = await transcribeAudio(audioData, filename);
    console.log('Transcript:', transcript);

    // Step 3: Get user's contacts for disambiguation
    const userContacts = await contactService.listContacts(userId);

    // Step 4: Disambiguate which contact the note is about
    console.log('Disambiguating contact...');
    const contact = await disambiguateContact(transcript, userContacts);

    if (contact) {
      console.log('Contact identified:', contact.name);
    } else {
      console.log('Contact disambiguation failed - will require manual selection');
    }

    // Step 5: Extract entities from the transcript
    console.log('Extracting entities...');
    const entities = await extractEntities(transcript, contact || undefined);
    console.log('Extracted entities:', entities);

    // Step 6: Create voice note record
    const voiceNote = await voiceNoteRepo.create(
      userId,
      audioUrl,
      transcript,
      contact?.id,
      entities
    );
    console.log('Voice note created:', voiceNote.id);

    // Step 7: Generate enrichment confirmation
    console.log('Generating enrichment confirmation...');
    const proposal = generateEnrichmentConfirmation(entities, contact, userContacts);
    console.log('Enrichment proposal:', {
      contactId: proposal.contactId,
      requiresContactSelection: proposal.requiresContactSelection,
      itemCount: proposal.items.length,
    });

    // Step 8: Apply enrichment (in real app, this would happen after user confirmation)
    if (proposal.contactId && proposal.items.length > 0) {
      console.log('Applying enrichment...');
      const updatedContact = await applyEnrichment(
        proposal.contactId,
        userId,
        proposal,
        contactService,
        tagService,
        groupService
      );
      console.log('Contact enriched:', updatedContact.name);

      // Mark voice note as processed
      await voiceNoteRepo.update(voiceNote.id, contact?.id || null, entities, true);
    }

    console.log('Voice note processing complete!');
  } catch (error) {
    console.error('Error processing voice note:', error);
    throw error;
  }
}


/**
 * Example: Manual contact selection workflow
 */
export async function processVoiceNoteWithManualSelection(
  userId: string,
  audioData: Buffer,
  filename: string,
  selectedContactId: string
): Promise<void> {
  const voiceNoteRepo = new VoiceNoteRepository(pool);

  try {
    // Steps 1-2: Store and transcribe
    const audioUrl = await storeAudioFile(audioData, userId, filename);
    const transcript = await transcribeAudio(audioData, filename);

    // Step 3: Get the manually selected contact
    const contact = await contactService.getContact(selectedContactId, userId);

    // Step 4: Extract entities
    const entities = await extractEntities(transcript, contact);

    // Step 5: Create voice note record
    const voiceNote = await voiceNoteRepo.create(
      userId,
      audioUrl,
      transcript,
      contact.id,
      entities
    );

    // Step 6: Generate and apply enrichment
    const userContacts = await contactService.listContacts(userId);
    const proposal = generateEnrichmentConfirmation(entities, contact, userContacts);

    if (proposal.items.length > 0) {
      await applyEnrichment(
        contact.id,
        userId,
        proposal,
        contactService,
        tagService,
        groupService
      );

      await voiceNoteRepo.update(voiceNote.id, contact.id, entities, true);
    }

    console.log('Voice note processed with manual contact selection');
  } catch (error) {
    console.error('Error processing voice note:', error);
    throw error;
  }
}

/**
 * Example: Transcription only (for testing)
 */
export async function transcribeOnly(audioData: Buffer, filename: string): Promise<string> {
  try {
    const transcript = await transcribeAudio(audioData, filename);
    return transcript;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}

/**
 * Example: Entity extraction only (for testing)
 */
export async function extractOnly(transcript: string): Promise<any> {
  try {
    const entities = await extractEntities(transcript);
    return entities;
  } catch (error) {
    console.error('Entity extraction failed:', error);
    throw error;
  }
}
