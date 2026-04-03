/**
 * Property-based and unit tests for context-aware conversation starters.
 *
 * Feature: 036-ui-suggestion-starters
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  contactIdHash,
  selectFromPool,
  interpolateName,
  getTimeGapBucket,
  isReasoningSignal,
  FALLBACK_POOL,
  CIRCLE_STARTERS,
  TIME_GAP_STARTERS,
  COMBINED_STARTERS,
  GOAL_STARTERS,
  generateConversationStarter,
  EnrichmentSignal,
} from './suggestion-service';
import { Contact, Suggestion, TriggerType, SuggestionStatus, ConnectionGoal } from '../types';

// ============================================
// Test Helpers
// ============================================

const CIRCLES = ['inner', 'close', 'active', 'casual'] as const;
const BUCKETS = ['recent', 'moderate', 'long', 'significant'] as const;

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'test-contact-1',
    userId: 'user-1',
    name: 'Alice',
    groups: [],
    tags: [],
    archived: false,
    sources: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'sug-1',
    userId: 'user-1',
    contactId: 'test-contact-1',
    contacts: [],
    type: 'individual',
    triggerType: TriggerType.TIMEBOUND,
    proposedTimeslot: { start: new Date(), end: new Date(), timezone: 'UTC' },
    reasoning: '',
    status: SuggestionStatus.PENDING,
    priority: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeGoal(overrides: Partial<ConnectionGoal> = {}): ConnectionGoal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    text: 'Network with professionals',
    keywords: ['network', 'professional'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Check if result matches any template from a pool after interpolation */
function matchesPool(result: string, pool: string[], name: string): boolean {
  return pool.some((tpl) => interpolateName(tpl, name) === result);
}

/** Collect all templates from all GOAL_STARTERS categories */
function allGoalTemplates(): string[] {
  return [...GOAL_STARTERS.network, ...GOAL_STARTERS.reconnect, ...GOAL_STARTERS.generic];
}

// ============================================
// Task 6: Property-Based Tests
// ============================================

describe('Feature: 036-ui-suggestion-starters', () => {
  // ------------------------------------------
  // Property 1: Template pool size invariants
  // ------------------------------------------
  describe('Property 1: Template pool size invariants', () => {
    /**
     * Validates: Requirements 1.1, 2.6, 3.6
     */
    it('should have FALLBACK_POOL with 15-20 unique entries', () => {
      expect(FALLBACK_POOL.length).toBeGreaterThanOrEqual(15);
      expect(FALLBACK_POOL.length).toBeLessThanOrEqual(20);
      expect(new Set(FALLBACK_POOL).size).toBe(FALLBACK_POOL.length);
    });

    it('should have CIRCLE_STARTERS with >= 3 entries per tier', () => {
      for (const tier of CIRCLES) {
        expect(CIRCLE_STARTERS[tier]).toBeDefined();
        expect(CIRCLE_STARTERS[tier].length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should have TIME_GAP_STARTERS with >= 2 entries per bucket', () => {
      for (const bucket of BUCKETS) {
        expect(TIME_GAP_STARTERS[bucket]).toBeDefined();
        expect(TIME_GAP_STARTERS[bucket].length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ------------------------------------------
  // Property 2: Hash determinism
  // ------------------------------------------
  describe('Property 2: Hash determinism', () => {
    /**
     * Validates: Requirements 1.3, 2.7, 3.7
     */
    it('should return the same hash for the same string on repeated calls', () => {
      fc.assert(
        fc.property(fc.string(), (id) => {
          const h1 = contactIdHash(id);
          const h2 = contactIdHash(id);
          expect(h1).toBe(h2);
          expect(h1).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should return the same pool element for the same pool and ID', () => {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      fc.assert(
        fc.property(fc.string(), (id) => {
          const r1 = selectFromPool(pool, id);
          const r2 = selectFromPool(pool, id);
          expect(r1).toBe(r2);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ------------------------------------------
  // Property 3: Hash distribution across fallback pool
  // ------------------------------------------
  describe('Property 3: Hash distribution across fallback pool', () => {
    /**
     * Validates: Requirements 1.4, 1.5
     */
    it('should distribute 50 random IDs with collision rate below 15%', () => {
      fc.assert(
        fc.property(fc.array(fc.uuid(), { minLength: 50, maxLength: 50 }), (ids) => {
          const indices = ids.map((id) => contactIdHash(id) % FALLBACK_POOL.length);
          // Count colliding pairs: pairs of different IDs mapping to same index
          let collisions = 0;
          const totalPairs = (ids.length * (ids.length - 1)) / 2;
          for (let i = 0; i < indices.length; i++) {
            for (let j = i + 1; j < indices.length; j++) {
              if (indices[i] === indices[j]) collisions++;
            }
          }
          expect(collisions / totalPairs).toBeLessThan(0.15);
        }),
        { numRuns: 20 },
      );
    });
  });

  // ------------------------------------------
  // Property 4: Fallback pool membership
  // ------------------------------------------
  describe('Property 4: Fallback pool membership', () => {
    /**
     * Validates: Requirements 1.2
     */
    it('should return a FALLBACK_POOL entry for contacts with no context', () => {
      fc.assert(
        fc.property(fc.uuid(), fc.string({ minLength: 1, maxLength: 20 }), (id, name) => {
          const contact = makeContact({ id, name, tags: [], dunbarCircle: undefined, lastContactDate: undefined });
          const suggestion = makeSuggestion({ reasoning: '' });
          const result = generateConversationStarter(contact, suggestion, null);
          expect(matchesPool(result, FALLBACK_POOL, name)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ------------------------------------------
  // Property 5: Circle-tier starter correctness
  // ------------------------------------------
  describe('Property 5: Circle-tier starter correctness', () => {
    /**
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
     */
    it('should return a CIRCLE_STARTERS entry for contacts with only dunbarCircle', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...CIRCLES),
          (id, name, circle) => {
            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: circle,
              lastContactDate: undefined,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);
            expect(matchesPool(result, CIRCLE_STARTERS[circle], name)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ------------------------------------------
  // Property 6: Time-gap bucket starter correctness
  // ------------------------------------------
  describe('Property 6: Time-gap bucket starter correctness', () => {
    /**
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
     */
    it('should return a TIME_GAP_STARTERS entry for contacts with only lastContactDate', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 1, max: 365 }),
          (id, name, daysAgo) => {
            const now = new Date();
            const lastContactDate = new Date(now.getTime() - daysAgo * 86400000);
            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: undefined,
              lastContactDate,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null, undefined);
            const bucket = getTimeGapBucket(lastContactDate, now);
            if (bucket) {
              expect(matchesPool(result, TIME_GAP_STARTERS[bucket], name)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ------------------------------------------
  // Property 7: Goal-aware starter correctness
  // ------------------------------------------
  describe('Property 7: Goal-aware starter correctness', () => {
    /**
     * Validates: Requirements 4.1, 4.2, 4.3, 4.5
     */
    it('should return a GOAL_STARTERS entry for contacts with matching goals and no higher-priority context', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom('network', 'professional', 'reconnect', 'friends'),
          (id, name, keyword) => {
            // Give the contact a tag that matches the goal keyword for relevance > 0
            const contact = makeContact({
              id,
              name,
              tags: [{ id: '1', text: keyword, source: 'manual' as any, createdAt: new Date() }],
              groups: [keyword],
              dunbarCircle: keyword === 'reconnect' ? 'inner' : undefined,
              lastContactDate: undefined,
            });
            // Use reasoning that won't trigger shared activity guard but also won't block tags
            // Actually, tags will trigger priority 1. We need contacts WITHOUT tags for goal to fire.
            const contactNoTags = makeContact({
              id,
              name,
              tags: [],
              groups: [keyword], // groups still contribute to goal relevance
              dunbarCircle: keyword === 'reconnect' ? 'inner' : undefined,
              lastContactDate: undefined,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const goals = [makeGoal({ keywords: [keyword] })];
            const result = generateConversationStarter(contactNoTags, suggestion, null, goals);
            const allGoals = allGoalTemplates();
            expect(matchesPool(result, allGoals, name)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should select from network templates when goal has "network" keyword', () => {
      const contact = makeContact({ tags: [], groups: ['network'], dunbarCircle: undefined });
      const goals = [makeGoal({ keywords: ['network'] })];
      const result = generateConversationStarter(contact, makeSuggestion(), null, goals);
      expect(matchesPool(result, GOAL_STARTERS.network, 'Alice')).toBe(true);
    });

    it('should select from reconnect templates when goal has "reconnect" and contact is inner/close', () => {
      const contact = makeContact({ tags: [], groups: ['reconnect'], dunbarCircle: 'inner', lastContactDate: undefined });
      const goals = [makeGoal({ keywords: ['reconnect'] })];
      const result = generateConversationStarter(contact, makeSuggestion(), null, goals);
      expect(matchesPool(result, GOAL_STARTERS.reconnect, 'Alice')).toBe(true);
    });
  });

  // ------------------------------------------
  // Property 8: Reasoning-aware deduplication
  // ------------------------------------------
  describe('Property 8: Reasoning-aware deduplication', () => {
    /**
     * Validates: Requirements 5.1, 5.2, 5.3, 6.3
     */
    it('should not produce a starter containing "frequency" or "declining" when reasoning mentions them', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.constantFrom('frequency decay detected', 'declining message rate'),
          (id, reasoning) => {
            const contact = makeContact({ id, tags: [], dunbarCircle: undefined, lastContactDate: undefined });
            const suggestion = makeSuggestion({ reasoning });
            const enrichment: EnrichmentSignal = {
              contactId: id,
              avgMessagesPerMonth: 5,
              lastMessageDate: new Date(),
              sentimentTrend: 'neutral',
              frequencyTrend: 'declining',
              topPlatform: 'SMS',
              totalMessageCount: 10,
            };
            const result = generateConversationStarter(contact, suggestion, enrichment);
            const lower = result.toLowerCase();
            expect(lower).not.toContain('frequency');
            expect(lower).not.toContain('declining');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should not produce a goal-aware starter when reasoning references a goal', () => {
      fc.assert(
        fc.property(fc.uuid(), (id) => {
          const contact = makeContact({ id, tags: [], groups: ['network'], dunbarCircle: undefined, lastContactDate: undefined });
          const suggestion = makeSuggestion({ reasoning: 'Based on your connection goal to network more' });
          const goals = [makeGoal({ keywords: ['network'] })];
          const result = generateConversationStarter(contact, suggestion, null, goals);
          const allGoals = allGoalTemplates();
          expect(matchesPool(result, allGoals, 'Alice')).toBe(false);
        }),
        { numRuns: 50 },
      );
    });

    it('should not produce a calendar-based starter when reasoning mentions shared activity', () => {
      const contact = makeContact({ tags: [] });
      const suggestion = makeSuggestion({
        reasoning: 'shared activity: Team Lunch',
        triggerType: TriggerType.SHARED_ACTIVITY,
        calendarEventId: 'cal-1',
      });
      const result = generateConversationStarter(contact, suggestion, null);
      expect(result).not.toContain('attending');
    });
  });

  // ------------------------------------------
  // Property 9: Priority chain ordering
  // ------------------------------------------
  describe('Property 9: Priority chain ordering', () => {
    /**
     * Validates: Requirements 6.1, 6.2, 4.4
     */
    it('should prefer tag-based starter over goal-aware when both qualify', () => {
      fc.assert(
        fc.property(fc.uuid(), (id) => {
          const contact = makeContact({
            id,
            tags: [{ id: '1', text: 'hiking', source: 'manual' as any, createdAt: new Date() }],
            groups: ['network'],
            dunbarCircle: 'inner',
            lastContactDate: new Date(Date.now() - 100 * 86400000),
          });
          const suggestion = makeSuggestion({ reasoning: '' });
          const goals = [makeGoal({ keywords: ['network'] })];
          const result = generateConversationStarter(contact, suggestion, null, goals);
          // Tag-based starters contain "You both follow"
          expect(result).toContain('You both follow');
        }),
        { numRuns: 50 },
      );
    });

    it('should prefer enrichment over goal-aware when both qualify', () => {
      const contact = makeContact({ tags: [], groups: ['network'] });
      const enrichment: EnrichmentSignal = {
        contactId: contact.id,
        avgMessagesPerMonth: 5,
        lastMessageDate: new Date(),
        sentimentTrend: 'neutral',
        frequencyTrend: 'declining',
        topPlatform: 'WhatsApp',
        totalMessageCount: 10,
      };
      const goals = [makeGoal({ keywords: ['network'] })];
      const result = generateConversationStarter(contact, makeSuggestion(), enrichment, goals);
      expect(result).toContain('WhatsApp');
    });
  });

  // ------------------------------------------
  // Property 10: Non-empty output invariant
  // ------------------------------------------
  describe('Property 10: Non-empty output invariant', () => {
    /**
     * Validates: Requirements 6.4
     */
    it('should always return a non-empty string for any contact', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.option(fc.constantFrom(...CIRCLES), { nil: undefined }),
          fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
          (id, name, circle, lastDate) => {
            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: circle,
              lastContactDate: lastDate,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);
            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ------------------------------------------
  // Property 11: Name interpolation completeness
  // ------------------------------------------
  describe('Property 11: Name interpolation completeness', () => {
    /**
     * Validates: Requirements 7.1, 7.2, 7.3
     */
    it('should never contain literal [name] in output', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.option(fc.constantFrom(...CIRCLES), { nil: undefined }),
          fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
          (id, name, circle, lastDate) => {
            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: circle,
              lastContactDate: lastDate,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);
            expect(result).not.toContain('[name]');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should contain contact name when name is non-empty', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          (id, name) => {
            const contact = makeContact({ id, name, tags: [], dunbarCircle: undefined, lastContactDate: undefined });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);
            expect(result).toContain(name.trim());
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should contain "them" when name is empty', () => {
      fc.assert(
        fc.property(fc.uuid(), (id) => {
          const contact = makeContact({ id, name: '', tags: [], dunbarCircle: undefined, lastContactDate: undefined });
          const suggestion = makeSuggestion({ reasoning: '' });
          const result = generateConversationStarter(contact, suggestion, null);
          expect(result).toContain('them');
        }),
        { numRuns: 50 },
      );
    });
  });

  // ------------------------------------------
  // Property 12: Combined dimension starters
  // ------------------------------------------
  describe('Property 12: Combined dimension starters', () => {
    /**
     * Validates: Requirements 8.1, 8.4
     */
    it('should use combined templates when both circle and time-gap are present', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...CIRCLES),
          fc.integer({ min: 1, max: 365 }),
          (id, name, circle, daysAgo) => {
            const now = new Date();
            const lastContactDate = new Date(now.getTime() - daysAgo * 86400000);
            const bucket = getTimeGapBucket(lastContactDate, now);
            if (!bucket) return; // skip invalid dates

            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: circle,
              lastContactDate,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);

            // Should come from combined, circle, or time-gap templates
            const combinedPool = COMBINED_STARTERS[circle]?.[bucket] || [];
            const circlePool = CIRCLE_STARTERS[circle] || [];
            const timePool = TIME_GAP_STARTERS[bucket] || [];
            const allValid = [...combinedPool, ...circlePool, ...timePool];
            expect(matchesPool(result, allValid, name)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use single-dimension circle templates when only circle is present', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...CIRCLES),
          (id, name, circle) => {
            const contact = makeContact({
              id,
              name,
              tags: [],
              dunbarCircle: circle,
              lastContactDate: undefined,
            });
            const suggestion = makeSuggestion({ reasoning: '' });
            const result = generateConversationStarter(contact, suggestion, null);
            expect(matchesPool(result, CIRCLE_STARTERS[circle], name)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ============================================
// Task 7: Unit Tests for Edge Cases
// ============================================

describe('Unit tests: suggestion starters edge cases', () => {
  // ------------------------------------------
  // 7.1 getTimeGapBucket boundary values
  // ------------------------------------------
  describe('getTimeGapBucket boundary values', () => {
    const now = new Date('2025-01-15T00:00:00Z');

    it('should return "recent" for exactly 13 days ago', () => {
      const date = new Date(now.getTime() - 13 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('recent');
    });

    it('should return "moderate" for exactly 14 days ago', () => {
      const date = new Date(now.getTime() - 14 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('moderate');
    });

    it('should return "moderate" for exactly 28 days ago', () => {
      const date = new Date(now.getTime() - 28 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('moderate');
    });

    it('should return "long" for exactly 29 days ago', () => {
      const date = new Date(now.getTime() - 29 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('long');
    });

    it('should return "long" for exactly 90 days ago', () => {
      const date = new Date(now.getTime() - 90 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('long');
    });

    it('should return "significant" for exactly 91 days ago', () => {
      const date = new Date(now.getTime() - 91 * 86400000);
      expect(getTimeGapBucket(date, now)).toBe('significant');
    });

    it('should return undefined for invalid date', () => {
      expect(getTimeGapBucket(new Date('invalid'), now)).toBeUndefined();
    });
  });

  // ------------------------------------------
  // 7.2 interpolateName edge cases
  // ------------------------------------------
  describe('interpolateName edge cases', () => {
    it('should replace multiple [name] placeholders', () => {
      const result = interpolateName('[name] and [name] are friends', 'Bob');
      expect(result).toBe('Bob and Bob are friends');
    });

    it('should use "them" when name is empty', () => {
      const result = interpolateName('Say hi to [name]', '');
      expect(result).toBe('Say hi to them');
    });

    it('should use "them" when name is whitespace only', () => {
      const result = interpolateName('Say hi to [name]', '   ');
      expect(result).toBe('Say hi to them');
    });

    it('should return template unchanged if no [name] placeholder', () => {
      const result = interpolateName('Hello world', 'Alice');
      expect(result).toBe('Hello world');
    });
  });

  // ------------------------------------------
  // 7.3 isReasoningSignal edge cases
  // ------------------------------------------
  describe('isReasoningSignal edge cases', () => {
    it('should be case insensitive', () => {
      expect(isReasoningSignal('FREQUENCY DECAY detected', ['frequency decay'])).toBe(true);
      expect(isReasoningSignal('Frequency Decay detected', ['frequency decay'])).toBe(true);
    });

    it('should return false for undefined reasoning', () => {
      expect(isReasoningSignal(undefined, ['frequency decay'])).toBe(false);
    });

    it('should return false for empty signals array', () => {
      expect(isReasoningSignal('some reasoning', [])).toBe(false);
    });

    it('should match partial signals', () => {
      expect(isReasoningSignal('the declining trend is clear', ['declining'])).toBe(true);
    });
  });

  // ------------------------------------------
  // 7.4 Combined starter: inner + >90 days (urgent-warm tone, Req 8.2)
  // ------------------------------------------
  describe('combined starter: inner + >90 days', () => {
    it('should produce an urgent-warm tone starter', () => {
      const contact = makeContact({
        tags: [],
        dunbarCircle: 'inner',
        lastContactDate: new Date(Date.now() - 120 * 86400000),
      });
      const result = generateConversationStarter(contact, makeSuggestion(), null);
      // Should come from COMBINED_STARTERS.inner.significant
      expect(matchesPool(result, COMBINED_STARTERS.inner.significant, 'Alice')).toBe(true);
    });
  });

  // ------------------------------------------
  // 7.5 Combined starter: casual + <14 days (light-recent tone, Req 8.3)
  // ------------------------------------------
  describe('combined starter: casual + <14 days', () => {
    it('should produce a light-recent tone starter', () => {
      const contact = makeContact({
        tags: [],
        dunbarCircle: 'casual',
        lastContactDate: new Date(Date.now() - 5 * 86400000),
      });
      const result = generateConversationStarter(contact, makeSuggestion(), null);
      expect(matchesPool(result, COMBINED_STARTERS.casual.recent, 'Alice')).toBe(true);
    });
  });

  // ------------------------------------------
  // 7.6 Goal starter with "network" keyword
  // ------------------------------------------
  describe('goal starter with "network" keyword', () => {
    it('should select from network templates', () => {
      const contact = makeContact({ tags: [], groups: ['network'] });
      const goals = [makeGoal({ keywords: ['network'] })];
      const result = generateConversationStarter(contact, makeSuggestion(), null, goals);
      expect(matchesPool(result, GOAL_STARTERS.network, 'Alice')).toBe(true);
    });
  });

  // ------------------------------------------
  // 7.7 Goal starter with "reconnect" keyword and inner circle
  // ------------------------------------------
  describe('goal starter with "reconnect" keyword and inner circle', () => {
    it('should select from reconnect templates', () => {
      const contact = makeContact({
        tags: [],
        groups: ['reconnect'],
        dunbarCircle: 'inner',
        lastContactDate: undefined,
      });
      const goals = [makeGoal({ keywords: ['reconnect'] })];
      const result = generateConversationStarter(contact, makeSuggestion(), null, goals);
      expect(matchesPool(result, GOAL_STARTERS.reconnect, 'Alice')).toBe(true);
    });
  });

  // ------------------------------------------
  // 7.8 Regression: existing tag-based and calendar-based starters
  // ------------------------------------------
  describe('regression: existing starters still work', () => {
    it('should return tag-based starter when contact has tags', () => {
      const contact = makeContact({
        tags: [{ id: '1', text: 'hiking', source: 'manual' as any, createdAt: new Date() }],
      });
      const result = generateConversationStarter(contact, makeSuggestion(), null);
      expect(result).toContain('You both follow hiking');
    });

    it('should return calendar-based starter for shared activity with calendar event', () => {
      const contact = makeContact({ tags: [] });
      const suggestion = makeSuggestion({
        triggerType: TriggerType.SHARED_ACTIVITY,
        calendarEventId: 'cal-123',
        reasoning: 'Team Lunch: shared interest',
      });
      const result = generateConversationStarter(contact, suggestion, null);
      expect(result).toContain('attending Team Lunch');
    });

    it('should return enrichment-based starter when enrichment has declining trend', () => {
      const contact = makeContact({ tags: [] });
      const enrichment: EnrichmentSignal = {
        contactId: contact.id,
        avgMessagesPerMonth: 5,
        lastMessageDate: new Date(),
        sentimentTrend: 'neutral',
        frequencyTrend: 'declining',
        topPlatform: 'WhatsApp',
        totalMessageCount: 10,
      };
      const result = generateConversationStarter(contact, makeSuggestion(), enrichment);
      expect(result).toContain('WhatsApp');
    });
  });
});
