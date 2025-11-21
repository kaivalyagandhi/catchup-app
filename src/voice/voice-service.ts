/**
 * Voice Processing Service
 *
 * Handles audio transcription, entity extraction, contact disambiguation,
 * and enrichment workflows for voice notes.
 */

import OpenAI from 'openai';
import { Contact, ExtractedEntities, EnrichmentProposal, EnrichmentItem, Tag } from '../types';

// Lazy-load OpenAI client to avoid initialization errors in tests
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Transcribes audio data to text using OpenAI Whisper
 * 
 * @param audioData - Buffer containing audio file data
 * @param filename - Original filename (used for format detection)
 * @returns Transcribed text
 * @throws Error if transcription fails
 */
export async function transcribeAudio(
  audioData: Buffer,
  filename: string = 'audio.mp3'
): Promise<string> {
  try {
    // Create a File object from the buffer
    const file = new File([audioData], filename, {
      type: getAudioMimeType(filename),
    });

    // Call OpenAI Whisper API
    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Can be made configurable
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Helper function to determine audio MIME type from filename
 */
function getAudioMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
  };
  return mimeTypes[ext || 'mp3'] || 'audio/mpeg';
}

/**
 * Store audio file (placeholder - in production would use S3 or similar)
 * 
 * @param _audioData - Buffer containing audio file data (unused in placeholder)
 * @param userId - User ID for organizing storage
 * @param filename - Original filename
 * @returns URL where the audio file is stored
 */
export async function storeAudioFile(
  _audioData: Buffer,
  userId: string,
  filename: string
): Promise<string> {
  // In production, this would upload to S3 or similar object storage
  // For now, return a placeholder URL
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `storage://${userId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Disambiguate which contact a voice note transcript refers to
 * 
 * Uses NLP to match transcript mentions to the user's contact list.
 * Returns null if disambiguation fails, allowing the system to continue
 * processing and prompt for manual contact selection.
 * 
 * @param transcript - Transcribed text from voice note
 * @param userContacts - List of user's contacts
 * @returns Matched contact or null if disambiguation fails
 */
export async function disambiguateContact(
  transcript: string,
  userContacts: Contact[]
): Promise<Contact | null> {
  if (userContacts.length === 0) {
    return null;
  }

  try {
    // Create a prompt for GPT to identify which contact is mentioned
    const contactList = userContacts
      .map((c, idx) => `${idx + 1}. ${c.name}${c.location ? ` (${c.location})` : ''}`)
      .join('\n');

    const prompt = `Given the following voice note transcript and list of contacts, identify which contact is being discussed. Return ONLY the contact number (e.g., "1", "2", etc.) or "NONE" if no clear match exists.

Transcript: "${transcript}"

Contacts:
${contactList}

Response (number only or NONE):`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a contact disambiguation assistant. Respond with only a number or NONE.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.trim();

    if (!response || response === 'NONE') {
      return null;
    }

    const contactIndex = parseInt(response, 10) - 1;

    if (isNaN(contactIndex) || contactIndex < 0 || contactIndex >= userContacts.length) {
      return null;
    }

    return userContacts[contactIndex];
  } catch (error) {
    console.error('Contact disambiguation failed:', error);
    // Return null to allow processing to continue with manual selection
    return null;
  }
}

/**
 * Extract entities and attributes from a voice note transcript
 * 
 * Uses OpenAI GPT to identify contact fields, tags, groups, and last contact date
 * from natural language. Handles extraction errors with manual entry fallback.
 * 
 * @param transcript - Transcribed text from voice note
 * @param _contact - The contact being discussed (if known, unused in current implementation)
 * @returns Extracted entities including fields, tags, groups, and dates
 */
export async function extractEntities(
  transcript: string,
  _contact?: Contact
): Promise<ExtractedEntities> {
  try {
    const prompt = `Extract structured information from this voice note about a friend. Return a JSON object with the following structure:

{
  "fields": {
    "phone": "string or null",
    "email": "string or null",
    "linkedIn": "string or null",
    "instagram": "string or null",
    "xHandle": "string or null",
    "location": "string or null",
    "customNotes": "string or null"
  },
  "tags": ["array", "of", "1-3", "word", "interest", "tags"],
  "groups": ["array", "of", "group", "names"],
  "lastContactDate": "ISO date string or null"
}

Guidelines:
- Extract only information explicitly mentioned in the transcript
- Tags should be 1-3 words describing interests, hobbies, or characteristics
- Groups should be relationship categories (e.g., "College Friends", "Work Friends")
- lastContactDate should be extracted if the transcript mentions when they last connected
- Set fields to null if not mentioned
- Return empty arrays if no tags or groups are mentioned

Voice note transcript:
"${transcript}"

JSON response:`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an entity extraction assistant. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from entity extraction');
    }

    const extracted = JSON.parse(response);

    // Validate and clean the extracted data
    const entities: ExtractedEntities = {
      fields: {},
      tags: Array.isArray(extracted.tags) ? extracted.tags.filter((t: any) => typeof t === 'string') : [],
      groups: Array.isArray(extracted.groups) ? extracted.groups.filter((g: any) => typeof g === 'string') : [],
    };

    // Extract fields
    if (extracted.fields && typeof extracted.fields === 'object') {
      const validFields = ['phone', 'email', 'linkedIn', 'instagram', 'xHandle', 'location', 'customNotes'];
      for (const field of validFields) {
        if (extracted.fields[field] && extracted.fields[field] !== null) {
          entities.fields[field] = extracted.fields[field];
        }
      }
    }

    // Extract last contact date
    if (extracted.lastContactDate) {
      try {
        entities.lastContactDate = new Date(extracted.lastContactDate);
      } catch (e) {
        // Invalid date, skip it
      }
    }

    return entities;
  } catch (error) {
    console.error('Entity extraction failed:', error);
    // Return empty entities to allow manual entry fallback
    return {
      fields: {},
      tags: [],
      groups: [],
    };
  }
}

/**
 * Generate an enrichment confirmation proposal from extracted entities
 * 
 * Presents atomic enrichment items for individual review. Supports contact
 * selection when disambiguation fails. Allows editing of field values, tags,
 * and groups before application.
 * 
 * @param entities - Extracted entities from voice note or notification reply
 * @param contact - The contact being enriched (null if disambiguation failed)
 * @param userContacts - List of user's contacts for manual selection
 * @returns Enrichment proposal with atomic items for review
 */
export function generateEnrichmentConfirmation(
  entities: ExtractedEntities,
  contact: Contact | null,
  userContacts: Contact[]
): EnrichmentProposal {
  const items: EnrichmentItem[] = [];
  let itemId = 1;

  // Create enrichment items for each field update
  if (entities.fields) {
    for (const [field, value] of Object.entries(entities.fields)) {
      if (value !== null && value !== undefined) {
        const existingValue = contact ? (contact as any)[field] : null;
        const action = existingValue ? 'update' : 'add';

        items.push({
          id: `item-${itemId++}`,
          type: 'field',
          action,
          field,
          value,
          accepted: true, // Default to accepted, user can deselect
        });
      }
    }
  }

  // Create enrichment items for each tag
  if (entities.tags && entities.tags.length > 0) {
    for (const tag of entities.tags) {
      items.push({
        id: `item-${itemId++}`,
        type: 'tag',
        action: 'add',
        value: tag,
        accepted: true,
      });
    }
  }

  // Create enrichment items for each group
  if (entities.groups && entities.groups.length > 0) {
    for (const group of entities.groups) {
      items.push({
        id: `item-${itemId++}`,
        type: 'group',
        action: 'add',
        value: group,
        accepted: true,
      });
    }
  }

  // Create enrichment item for last contact date
  if (entities.lastContactDate) {
    items.push({
      id: `item-${itemId++}`,
      type: 'lastContactDate',
      action: contact?.lastContactDate ? 'update' : 'add',
      value: entities.lastContactDate,
      accepted: true,
    });
  }

  return {
    contactId: contact?.id || null,
    items,
    requiresContactSelection: contact === null && userContacts.length > 0,
  };
}

/**
 * Apply enrichment proposal to a contact
 * 
 * Updates contact fields, generates and associates tags (1-3 words each),
 * and updates group memberships. Prefers existing similar tags over creating
 * new ones using semantic similarity matching.
 * 
 * @param contactId - ID of the contact to enrich
 * @param userId - ID of the user
 * @param proposal - Enrichment proposal with accepted items
 * @param contactService - Contact service instance
 * @param tagService - Tag service instance
 * @param groupService - Group service instance
 * @returns Updated contact
 */
export async function applyEnrichment(
  contactId: string,
  userId: string,
  proposal: EnrichmentProposal,
  contactService: any,
  tagService: any,
  groupService: any
): Promise<Contact> {
  // Filter to only accepted items
  const acceptedItems = proposal.items.filter((item) => item.accepted);

  if (acceptedItems.length === 0) {
    // No changes to apply, return current contact
    return await contactService.getContact(contactId, userId);
  }

  // Group items by type for efficient processing
  const fieldUpdates: Record<string, any> = {};
  const tagsToAdd: string[] = [];
  const groupsToAdd: string[] = [];
  let lastContactDate: Date | undefined;

  for (const item of acceptedItems) {
    switch (item.type) {
      case 'field':
        if (item.field) {
          fieldUpdates[item.field] = item.value;
        }
        break;
      case 'tag':
        tagsToAdd.push(item.value);
        break;
      case 'group':
        groupsToAdd.push(item.value);
        break;
      case 'lastContactDate':
        lastContactDate = item.value instanceof Date ? item.value : new Date(item.value);
        break;
    }
  }

  // Apply field updates (including lastContactDate)
  if (Object.keys(fieldUpdates).length > 0 || lastContactDate) {
    const updateData: any = { ...fieldUpdates };
    if (lastContactDate) {
      updateData.lastContactDate = lastContactDate;
    }
    await contactService.updateContact(contactId, userId, updateData);
  }

  // Add tags (with similarity matching to prefer existing tags)
  for (const tagText of tagsToAdd) {
    try {
      await tagService.addTag(contactId, userId, tagText, 'voice_memo');
    } catch (error) {
      console.error(`Failed to add tag "${tagText}":`, error);
      // Continue with other tags even if one fails
    }
  }

  // Add groups (create if they don't exist)
  for (const groupName of groupsToAdd) {
    try {
      // Try to find existing group by name
      const existingGroups = await groupService.listGroups(userId);
      let group = existingGroups.find(
        (g: any) => g.name.toLowerCase() === groupName.toLowerCase()
      );

      // Create group if it doesn't exist
      if (!group) {
        group = await groupService.createGroup(userId, groupName);
      }

      // Assign contact to group
      await groupService.assignContactToGroup(contactId, group.id, userId);
    } catch (error) {
      console.error(`Failed to add group "${groupName}":`, error);
      // Continue with other groups even if one fails
    }
  }

  // Return updated contact
  return await contactService.getContact(contactId, userId);
}

/**
 * Prefer existing tags over creating new ones
 * 
 * Uses semantic similarity matching to find existing tags that are similar
 * to the new tags being added. Returns a list of tag texts that should be
 * used, preferring existing similar tags when found.
 * 
 * @param newTags - Array of new tag texts to add
 * @param existingTags - Array of existing tags in the system
 * @param _similarityThreshold - Similarity threshold (default: 0.85, unused in current implementation)
 * @returns Array of tag texts to use (may include existing tag texts)
 */
export async function preferExistingTags(
  newTags: string[],
  existingTags: Tag[],
  _similarityThreshold: number = 0.85
): Promise<string[]> {
  // This is a simplified implementation
  // In production, this would use the tag service's similarity matching
  const result: string[] = [];

  for (const newTag of newTags) {
    // Check for exact match (case-insensitive)
    const exactMatch = existingTags.find(
      (t) => t.text.toLowerCase() === newTag.toLowerCase()
    );

    if (exactMatch) {
      result.push(exactMatch.text);
      continue;
    }

    // For now, just use the new tag
    // In production, this would use semantic similarity (cosine similarity, etc.)
    result.push(newTag);
  }

  return result;
}
