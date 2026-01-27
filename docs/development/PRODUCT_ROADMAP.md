# CatchUp Product Roadmap

**Vision**: Transform CatchUp from a suggestion engine into a comprehensive relationship operating system—the Rolodex reimagined for the AI age, where maintaining friendships is effortless but intentional.

**Last Updated**: January 2026

---

## Executive Summary

This roadmap consolidates improvements from three sources:
1. **Hackathon Submission** - Product insights and future vision
2. **Unimplemented Features** - Technical TODOs in codebase
3. **New Requirements** - Group scheduling, landing page, and UX improvements

The roadmap is organized into 4 tiers based on impact and effort.

---

## 🔴 Tier 1: Critical Path (Next 4-6 Weeks)

These items are essential for core product functionality and user acquisition.

### 1.1 Landing Page & Marketing Site

**Priority**: P0 - Blocking user acquisition  
**Effort**: Medium (1-2 weeks)  
**Impact**: High - First impression for all users

**Requirements**:
- Compelling hero section explaining the value proposition
- Clear explanation of Dunbar's circles and relationship management
- Feature highlights with visual demonstrations
- Social proof / testimonials section
- Clear CTA to sign up / log in
- Mobile-responsive design
- SEO optimization

**Key Messages**:
- "Your AI-powered Rolodex that actually remembers to call"
- Reduce coordination friction for maintaining friendships
- Voice-first context capture
- Smart scheduling suggestions

**Technical Notes**:
- Can be static HTML/CSS initially
- Consider Next.js for SSR/SEO benefits later
- Integrate with existing auth flow

---

### 1.2 Simplified "Manage Circles" Flow

**Priority**: P0 - Core onboarding friction  
**Effort**: Medium (1-2 weeks)  
**Impact**: High - Reduces time-to-value significantly

> 📄 **Detailed Design**: See [MANAGE_CIRCLES_REDESIGN.md](./MANAGE_CIRCLES_REDESIGN.md) for comprehensive analysis, UI mockups, implementation phases, and research-backed UX guidelines.

**Current Problem**: 
- Users must assign contacts one-by-one
- No bulk operations for large contact lists
- AI suggestions require individual review

**Target Metrics**:
- Time to first circle assignment: <30 seconds (currently ~3 min)
- Time to 50% categorization: <2 minutes (currently ~15 min)
- Onboarding completion rate: >70% (currently ~40%)

**Desired Behavior**:
- **AI Quick Start**: Show top 10 Inner Circle suggestions with "Accept All" button
- **Smart Batching**: Group contacts by communication frequency for bulk assignment
- **Quick Refine**: Swipe-style interface for remaining uncategorized contacts
- **Undo Capability**: 10-second undo window for all bulk actions
- **Skip Option**: Allow users to skip circle assignment and refine later

**Implementation Notes**:
- New endpoints: `GET /api/ai/quick-start-suggestions`, `GET /api/ai/batch-suggestions`, `POST /api/contacts/circles/batch-accept`
- New components: `QuickStartFlow.js`, `BatchSuggestionCard.js`, `QuickRefineCard.js`
- Leverage existing `batchAssign()` backend method
- Track time-to-complete for onboarding analytics

---

### 1.3 Timezone Preferences (Technical Debt)

**Priority**: P0 - Affects all calendar features  
**Effort**: Small (3-5 days)  
**Impact**: High - Users see wrong times without this

**Files Affected**:
- `src/calendar/availability-service.ts` (line 197)
- `src/calendar/calendar-service.ts` (line 426)
- `src/calendar/calendar-event-generator.ts` (line 169)

**Implementation**:
- Add `timezone` field to user preferences table
- Implement timezone selection UI in settings
- Auto-detect timezone from browser on signup
- Use `date-fns-tz` for timezone conversions
- Update all calendar displays to use user timezone

---

### 1.4 Contact Preview & Archival

**Priority**: P1 - Core contact management  
**Effort**: Small (3-5 days)  
**Impact**: Medium - Enables contact cleanup

**Current State**: Preview and archival methods are stubbed out

**Implementation**:
- Implement `previewContactArchival()` to show affected contacts
- Implement `applyContactArchival()` with soft delete
- Add `archived_at` timestamp field to contacts table
- Create "Archived Contacts" view with restore option
- Update queries to filter archived contacts by default

---

## 🟠 Tier 2: Core Experience (6-12 Weeks)

These features significantly enhance the core product experience.

### 2.1 Group Availability Sharing

**Priority**: P1 - Key differentiator  
**Effort**: Large (3-4 weeks)  
**Impact**: Very High - Solves coordination friction

**User Story**: 
> "As a user, I want to share my availability with a group so we can find a time that works for everyone without endless back-and-forth."

**Flow**:
1. User creates a "Catchup Plan" and selects friends
2. System auto-texts selected people with availability request
3. If friend has CatchUp app → availability auto-shared (with confirmation)
4. If friend doesn't have app → shown CTA to provide availability via web form
5. System aggregates availabilities and suggests optimal times
6. User confirms time → calendar invites sent to all

**Technical Components**:
- `GroupAvailabilityService` - Aggregates availability across users
- `AvailabilityRequestService` - Sends SMS/push notifications
- `AvailabilityCollectionUI` - Web form for non-app users
- `ConflictResolutionEngine` - Suggests times that work for most/all

**Privacy Considerations**:
- Availability shared anonymously (just free/busy, not event details)
- Users can opt-out of auto-sharing
- Clear consent flow for sharing with non-app users

---

### 2.2 Friend Invitation System

**Priority**: P1 - Growth mechanism  
**Effort**: Medium (2 weeks)  
**Impact**: High - Network effects

**User Story**:
> "As a user, I want to easily invite friends to join CatchUp so we can coordinate schedules together."

**Features**:
- One-click invite via SMS/email/WhatsApp
- Personalized invite message: "Hey [Name], I'm using CatchUp to stay in touch. Join me!"
- Referral tracking for gamification
- Deep link to signup with pre-filled friend connection
- Invite status tracking (sent, opened, signed up)

**Growth Mechanics**:
- "Invite 3 friends, unlock premium features"
- Show which friends are already on CatchUp
- Suggest friends to invite based on communication frequency

---

### 2.3 AI Conflict Resolution for Group Plans

**Priority**: P1 - Reduces coordination friction  
**Effort**: Medium (2 weeks)  
**Impact**: High - Core value proposition

**User Story**:
> "As a plan initiator, I want AI to suggest how to resolve scheduling conflicts so the plan works for most people."

**Conflict Resolution Strategies**:
1. **Time Shift**: "Move to 3pm instead of 2pm—works for 4/5 people"
2. **Day Change**: "Saturday works for everyone, Friday only works for 3/5"
3. **Split Events**: "Have coffee with Alex Tuesday, dinner with group Saturday"
4. **Priority Weighting**: "Sarah is marked as 'must attend'—prioritize her availability"
5. **Partial Attendance**: "Jordan can join for the first hour only"

**Implementation**:
- Use Gemini to analyze availability patterns
- Generate ranked suggestions with explanations
- Allow plan initiator to set preferences (everyone must attend vs. majority)
- Send confirmation messages when conflicts resolved

---

### 2.4 Improved Suggestions Service

**Priority**: P1 - Core feature enhancement  
**Effort**: Medium (2 weeks)  
**Impact**: High - Better suggestions = more engagement

**Current Gaps**:
- Suggestions not added to calendar feed
- No frequency preference prompts
- Limited context awareness

**Improvements**:
1. **Add Suggestions to Calendar Feed** (from UNIMPLEMENTED_FEATURES.md)
   - Display as tentative events
   - Accept/decline from calendar app
   
2. **Frequency Preference Prompts**
   - Detect missing preferences
   - Smart defaults based on circle
   - Bulk preference setting
   
3. **Shared Activity Suggestions**
   - "You have 'hiking' on your calendar. Invite Sarah (she's into rock climbing)?"
   - Match calendar events with contact interests
   
4. **Group Hangout Suggestions**
   - "You, Alex, and Jordan are all free Friday and share interest in board games"
   - Suggest group activities based on shared interests

---

### 2.5 Smart Notification Throttling

**Priority**: P2 - Prevents notification fatigue  
**Effort**: Small (1 week)  
**Impact**: Medium - Improves retention

**Logic**:
- If user dismisses 5 suggestions in a row → back off for a week
- Learn individual tolerance for notifications
- Allow users to set "quiet hours"
- Batch low-priority suggestions into weekly digest

---

## 🟡 Tier 3: Growth & Engagement (3-6 Months)

These features drive growth and deeper engagement.

### 3.1 Mobile App (React Native)

**Priority**: P2 - Expands reach  
**Effort**: Very Large (8-12 weeks)  
**Impact**: Very High - Voice notes more natural on mobile

**Core Features**:
- Voice note recording with real-time transcription
- Push notifications for suggestions
- Offline-first architecture
- Calendar integration (iOS/Android native)
- Contact sync from phone

**Technical Approach**:
- React Native for cross-platform
- Expo for faster development
- Share backend API with web app
- Native modules for audio recording

---

### 3.2 WhatsApp Integration

**Priority**: P2 - Where coordination happens  
**Effort**: Large (3-4 weeks)  
**Impact**: High - Auto-track last contact date

**Features**:
- Connect WhatsApp Business API
- Track last message date per contact (with consent)
- Send suggestions via WhatsApp
- Receive availability responses via WhatsApp

**Privacy**:
- Only timestamps, not message content
- Explicit user consent required
- Clear data retention policy

---

### 3.3 Relationship Health Dashboard

**Priority**: P2 - Engagement driver  
**Effort**: Medium (2-3 weeks)  
**Impact**: Medium - Gamification element

**Visualizations**:
- "You've caught up with 80% of Close Friends this month"
- "You haven't talked to College Friends group in 3 months"
- Relationship trends over time
- Circle health scores

**Gamification**:
- Streaks for consistent catchups
- Badges for relationship milestones
- Weekly/monthly summaries

---

### 3.4 Calendar Feed Improvements

**Priority**: P2 - Better integration  
**Effort**: Medium (2 weeks)  
**Impact**: Medium - Seamless experience

**From UNIMPLEMENTED_FEATURES.md**:
- Implement cache invalidation
- Add webhook notifications for real-time updates
- Two-way sync (accept in Google Calendar → marks accepted in CatchUp)

---

### 3.5 ML-Powered Circle Suggestions

**Priority**: P3 - Long-term improvement  
**Effort**: Large (4-6 weeks)  
**Impact**: Medium - Better AI over time

**Approach**:
- Train model on user corrections to AI suggestions
- Learn which signals predict relationship depth:
  - Communication frequency
  - Calendar co-attendance
  - Response time patterns
  - Social media interactions (if connected)
- Personalized models per user

---

## 🟢 Tier 4: Future Vision (6-12 Months)

These features represent the long-term product vision.

### 4.1 Messaging App Integrations

**Priority**: P3  
**Effort**: Very Large  
**Impact**: High

- iMessage, Signal, Telegram integration
- Auto-track last contact across platforms
- Privacy-preserving (timestamps only)

---

### 4.2 Social Network Analysis

**Priority**: P3  
**Effort**: Large  
**Impact**: Medium

- "Alex and Jordan both know you but don't know each other"
- Suggest introductions based on shared interests
- Visualize social graph

---

### 4.3 Life Event Detection

**Priority**: P3  
**Effort**: Large  
**Impact**: Medium

- LinkedIn integration for job changes
- "Sarah just got a new job—send congrats?"
- Birthday reminders from social profiles

---

### 4.4 Collaborative Scheduling (Calendly-style)

**Priority**: P3  
**Effort**: Large  
**Impact**: High

- "You want to catch up with Sarah. She's free Tue/Thu evenings. Pick a time?"
- Booking links for contacts
- Automatic calendar event creation

---

### 4.5 Relationship Journaling

**Priority**: P4  
**Effort**: Large  
**Impact**: Medium

- "What did you talk about last time you saw Alex?"
- Voice-searchable relationship history
- Automatic tagging of conversation topics

---

## 📊 Technical Debt & Infrastructure

### High Priority (Address with Tier 1-2 work)

| Item | Location | Effort |
|------|----------|--------|
| Timezone preferences | Calendar services | Small |
| Contact preview/archival | Setup flow service | Small |
| Frequency preference prompts | Suggestion service | Small |

### Medium Priority (Address with Tier 3 work)

| Item | Location | Effort |
|------|----------|--------|
| Calendar feed caching | Feed service | Medium |
| Webhook notifications | Feed service | Medium |
| Suggestions in calendar feed | Suggestion service | Medium |

### Low Priority (Address opportunistically)

| Item | Location | Effort |
|------|----------|--------|
| Calendar integration tests | Test files | Medium |
| Additional test coverage | Various | Ongoing |

---

## 📅 Suggested Timeline

### Phase 1: Foundation (Weeks 1-6)
- [ ] Landing page
- [ ] Simplified manage circles flow
- [ ] Timezone preferences fix
- [ ] Contact preview & archival

### Phase 2: Group Scheduling (Weeks 7-14)
- [ ] Group availability sharing
- [ ] Friend invitation system
- [ ] AI conflict resolution
- [ ] Improved suggestions service

### Phase 3: Growth (Weeks 15-26)
- [ ] Smart notification throttling
- [ ] Mobile app (MVP)
- [ ] WhatsApp integration
- [ ] Relationship health dashboard

### Phase 4: Scale (Weeks 27-52)
- [ ] Calendar feed improvements
- [ ] ML-powered suggestions
- [ ] Additional messaging integrations
- [ ] Advanced features

---

## 🎯 Success Metrics

### Tier 1 Success
- Landing page conversion rate > 10%
- Onboarding completion rate > 60%
- Time to first circle assignment < 5 minutes

### Tier 2 Success
- Group plans created per user per month > 2
- Friend invitations sent per user > 3
- Suggestion acceptance rate > 30%

### Tier 3 Success
- Mobile app DAU/MAU > 40%
- WhatsApp-connected users > 50%
- Dashboard engagement > 2x per week

---

## 🔗 Related Documentation

- [Unimplemented Features](./UNIMPLEMENTED_FEATURES.md)
- [API Documentation](../API.md)
- [Testing Guide](../testing/TESTING_GUIDE.md)
- [Feature Specifications](../../.kiro/specs/)

---

## 📝 Changelog

| Date | Change |
|------|--------|
| Jan 2026 | Initial roadmap created from hackathon submission, unimplemented features, and new requirements |
