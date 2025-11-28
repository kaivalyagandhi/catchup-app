/**
 * Google Gemini API Configuration
 * 
 * This module provides configuration and client initialization for Google Gemini API.
 * Used for entity extraction from voice note transcripts with structured JSON output.
 */

import { GoogleGenerativeAI, GenerativeModel, SchemaType } from '@google/generative-ai';

/**
 * JSON schema for entity extraction from voice notes
 * 
 * Defines the structure of extracted contact metadata including:
 * - Contact fields (phone, email, social media handles, location, notes)
 * - Tags (1-3 word descriptors of interests/characteristics)
 * - Groups (relationship categories like "College Friends")
 * - Last contact date (when they last connected)
 * 
 * Used with Gemini API's structured output feature to ensure consistent JSON responses.
 * 
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */
export const ENTITY_EXTRACTION_SCHEMA = {
  type: SchemaType.OBJECT as const,
  properties: {
    contactNames: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'Person names mentioned in the transcript (e.g., "John", "Sarah Smith")',
    },
    fields: {
      type: SchemaType.OBJECT as const,
      properties: {
        phone: { type: SchemaType.STRING as const, nullable: true },
        email: { type: SchemaType.STRING as const, nullable: true },
        linkedIn: { type: SchemaType.STRING as const, nullable: true },
        instagram: { type: SchemaType.STRING as const, nullable: true },
        xHandle: { type: SchemaType.STRING as const, nullable: true },
        location: { type: SchemaType.STRING as const, nullable: true },
        customNotes: { type: SchemaType.STRING as const, nullable: true },
      },
      description: 'Contact field updates extracted from the transcript',
    },
    tags: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: '1-3 word tags describing interests, hobbies, or characteristics mentioned',
    },
    groups: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'Group names like "College Friends", "Work Friends", or "Hiking Buddies"',
    },
    lastContactDate: {
      type: SchemaType.STRING as const,
      nullable: true,
      description: 'ISO 8601 date string if a specific interaction date is mentioned',
    },
  },
  required: ['contactNames', 'fields', 'tags', 'groups'],
};

/**
 * JSON schema for contact name identification
 * 
 * Used for contact disambiguation to extract person names mentioned in voice note transcripts.
 * Returns an array of names that can be matched against the user's contact list.
 * 
 * @see https://ai.google.dev/gemini-api/docs/structured-output
 */
export const CONTACT_NAME_SCHEMA = {
  type: SchemaType.OBJECT as const,
  properties: {
    names: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'List of person names mentioned in the transcript',
    },
  },
  required: ['names'],
};

/**
 * Configuration for Gemini API
 */
export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

/**
 * Default Gemini configuration
 * 
 * Uses gemini-2.5-flash for production stability (gemini-2.0-flash-exp is experimental).
 * Lower temperature (0.2) ensures more consistent entity extraction.
 */
export const DEFAULT_GEMINI_CONFIG: Omit<GeminiConfig, 'apiKey'> = {
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  temperature: 0.2, // Lower temperature for more consistent extraction
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2048,
};

/**
 * Initialize Google Gemini API client
 * 
 * @returns Initialized GoogleGenerativeAI instance
 * @throws Error if GOOGLE_GEMINI_API_KEY is not set
 */
export function initializeGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GOOGLE_GEMINI_API_KEY environment variable is required. ' +
      'Please set it in your .env file.'
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Get Gemini model configured for entity extraction
 * 
 * @param customConfig Optional custom configuration
 * @returns Configured GenerativeModel instance
 */
export function getEntityExtractionModel(
  customConfig?: Partial<GeminiConfig>
): GenerativeModel {
  const config = { ...DEFAULT_GEMINI_CONFIG, ...customConfig };
  const genAI = initializeGeminiClient();

  return genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: ENTITY_EXTRACTION_SCHEMA,
    },
  });
}

/**
 * Get Gemini model configured for contact name identification
 * 
 * @param customConfig Optional custom configuration
 * @returns Configured GenerativeModel instance
 */
export function getContactNameModel(
  customConfig?: Partial<GeminiConfig>
): GenerativeModel {
  const config = { ...DEFAULT_GEMINI_CONFIG, ...customConfig };
  const genAI = initializeGeminiClient();

  return genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: CONTACT_NAME_SCHEMA,
    },
  });
}

/**
 * Singleton Gemini client instance
 */
let geminiClientInstance: GoogleGenerativeAI | null = null;

/**
 * Get or create Gemini client instance
 * 
 * @returns Singleton GoogleGenerativeAI instance
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClientInstance) {
    geminiClientInstance = initializeGeminiClient();
  }
  return geminiClientInstance;
}

/**
 * Validate Gemini API configuration
 * 
 * @throws Error if configuration is invalid
 */
export function validateGeminiConfig(): void {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_CONFIG.model;
  if (!model.startsWith('gemini-')) {
    throw new Error(`Invalid Gemini model: ${model}. Must start with "gemini-"`);
  }
}
