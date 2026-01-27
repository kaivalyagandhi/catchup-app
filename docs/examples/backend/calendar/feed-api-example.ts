/**
 * Calendar Feed API Example
 *
 * Example implementation of API endpoints for serving calendar feeds.
 * This demonstrates how to integrate the feed service with an HTTP server.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { Request, Response } from 'express';
import * as feedService from './feed-service';
import * as suggestionRepository from './suggestion-repository';
import * as contactRepository from '../contacts/repository';
import { SuggestionStatus } from '../types';

/**
 * GET /api/calendar/feed/publish
 * 
 * Generate feed URLs for the authenticated user.
 * Returns both iCal and Google Calendar subscription URLs.
 * 
 * Requirements: 8.1, 8.2
 */
export async function publishFeedHandler(req: Request, res: Response): Promise<void> {
  try {
    // In a real implementation, get userId from authenticated session
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Generate signed feed URLs
    const feedUrls = feedService.publishSuggestionFeed(userId);
    
    res.json({
      success: true,
      data: feedUrls,
    });
  } catch (error) {
    console.error('Error publishing feed:', error);
    res.status(500).json({ error: 'Failed to publish feed' });
  }
}

/**
 * GET /api/calendar/feed/:token.ics
 * 
 * Serve the iCal feed content for a user.
 * Token must be valid and not expired.
 * 
 * Requirements: 8.1, 8.4
 */
export async function serveFeedHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.params.token;
    
    // Verify the signed token
    const verified = feedService.verifySignedToken(token);
    
    if (!verified) {
      res.status(401).send('Invalid or expired feed token');
      return;
    }
    
    const { userId } = verified;
    
    // Fetch suggestions for the user (only pending and accepted)
    const suggestions = await suggestionRepository.getUserSuggestions(userId, [
      SuggestionStatus.PENDING,
      SuggestionStatus.ACCEPTED,
    ]);
    
    // Fetch contacts for the suggestions
    const contactIds = [...new Set(suggestions.map((s) => s.contactId))];
    const contacts = await contactRepository.getContactsByIds(userId, contactIds);
    
    // Create a map for quick lookup
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    
    // Generate iCal content
    const iCalContent = feedService.generateFeedContent(suggestions, contactMap);
    
    // Set appropriate headers for iCal format
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="catchup-suggestions.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(iCalContent);
  } catch (error) {
    console.error('Error serving feed:', error);
    res.status(500).send('Failed to generate feed');
  }
}

/**
 * POST /api/suggestions/:id/accept
 * POST /api/suggestions/:id/dismiss
 * 
 * Example of how to trigger feed updates when suggestion status changes.
 * 
 * Requirements: 8.3
 */
export async function updateSuggestionStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const suggestionId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Verify suggestion belongs to user
    const suggestion = await suggestionRepository.getSuggestionById(suggestionId);
    
    if (!suggestion || suggestion.userId !== userId) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }
    
    // Update suggestion status (implementation depends on the action)
    // ... update logic here ...
    
    // Trigger feed update
    await feedService.updateFeedEvent(suggestionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
}

/**
 * Example Express router setup
 */
export function setupFeedRoutes(app: any): void {
  app.get('/api/calendar/feed/publish', publishFeedHandler);
  app.get('/api/calendar/feed/:token.ics', serveFeedHandler);
  app.post('/api/suggestions/:id/accept', updateSuggestionStatusHandler);
  app.post('/api/suggestions/:id/dismiss', updateSuggestionStatusHandler);
}
