# Friend Circle Onboarding - Research & Design Foundation

## Executive Summary

This document provides the theoretical foundation and feature design for CatchUp's onboarding flow that organizes contacts into friend circles based on Dunbar's number and Aristotle's theory of friendship. This research-backed approach creates a sophisticated yet intuitive system for relationship management.

---

## Theoretical Foundation

### Dunbar's Number - Cognitive Limits of Social Relationships

**Core Concept:**
Dunbar's number suggests humans can maintain approximately 150 stable social relationships—relationships where you know who each person is and how they relate to others. This limit is based on the correlation between primate brain size (specifically neocortex volume) and average social group size.

**The Layered Structure:**

Dunbar's research reveals relationships exist in hierarchical layers, each roughly 3x the previous:

- **5 people**: Intimate support clique (closest friends/family)
  - People you'd call in a crisis
  - Highest emotional investment
  - Most frequent contact

- **15 people**: Sympathy group (good friends)
  - People you'd seek support from
  - Regular life updates
  - Strong emotional bonds

- **50 people**: Close friends
  - People you'd invite to a group dinner
  - Regular social contact
  - Meaningful relationships

- **150 people**: Casual friends
  - People you wouldn't feel embarrassed joining uninvited for a drink
  - Occasional contact
  - Recognizable relationships

- **500 people**: Acquaintances
  - People you recognize and can name
  - Minimal active maintenance
  - Peripheral network

**Key Research Insights:**

1. **Cognitive Constraint**: The 150-person limit is a cognitive boundary, not arbitrary
2. **Time Investment**: Dunbar estimated maintaining a 150-person group requires ~42% of available time for "social grooming"
3. **Language as Efficiency**: Language evolved as "cheap" social grooming, allowing larger groups without constant physical presence
4. **Proximity Matters**: Dispersed societies have smaller effective group sizes due to less frequent interaction
5. **Survival Pressure**: Only groups under intense pressure (subsistence villages, military units) consistently reach the 150-member mark

**Alternative Research:**
- Bernard-Killworth studies suggest ~290 mean ties (median 231)
- Bayesian methods yield 69-109 average group size
- Wide confidence intervals (4-520) suggest high individual variation
- **Implication**: Dunbar's layers are guidelines, not rigid rules

---

### Aristotle's Theory of Friendship

**Source**: Nicomachean Ethics, Books VIII-IX

Aristotle identified three distinct types of friendship (*philia*), each based on different motivations and characteristics:

#### 1. Friendships of Utility

**Characteristics:**
- Based on mutual benefit and usefulness
- Common in business, professional contexts
- Transactional in nature
- Dissolve when utility ends

**Examples:**
- Work colleagues
- Professional network contacts
- Mentors/mentees (when primarily career-focused)
- Service providers you're friendly with

**Modern Application:**
- These are valid, important relationships
- Not "lesser" friendships, just different purpose
- Require different maintenance strategies
- Often overlap with other friendship types

#### 2. Friendships of Pleasure

**Characteristics:**
- Based on shared enjoyment and activities
- Common among people with shared interests
- Focus on doing things together
- May fade when interests diverge

**Examples:**
- Activity buddies (gym, hiking, gaming partners)
- Hobby groups
- Social friends you enjoy spending time with
- People you have fun with

**Modern Application:**
- Most common type in modern life
- Easiest to form and maintain
- Can evolve into virtue friendships
- Activity-based suggestions work well

#### 3. Friendships of Virtue (Character Friendships)

**Characteristics:**
- Based on mutual respect for character and values
- Deepest, most enduring form
- Each friend wishes good for the other's sake
- Requires time to develop
- Rare and precious

**Examples:**
- Long-term friends who know you deeply
- People you admire and respect
- Friends who share your core values
- Relationships that transcend circumstances

**Modern Application:**
- These are the "inner circle" relationships
- Require most investment but provide most value
- Survive life changes and distance
- Quality over quantity

**Aristotle's Key Insights:**

1. **All Three Are Valid**: Utility and pleasure friendships aren't deficient—they serve different purposes
2. **Virtue Friendships Are Rare**: Most people have few true virtue friendships
3. **Concern for the Other**: True friendship involves caring for the friend's sake, not just your own benefit
4. **Equality Matters**: Friendship requires some level of equality and reciprocity
5. **Character Development**: Friends shape who we become through mutual influence

**The Apparent Tension:**
How can utility/pleasure friendships involve caring "for the friend's sake" if motivated by personal benefit? Aristotle's answer: these are legitimate but less complete forms of friendship. Modern interpretation: most friendships are hybrid, containing elements of all three types.

---

## Integration: Dunbar + Aristotle

### Why Both Frameworks?

**Dunbar provides QUANTITY structure:**
- How many relationships at each level
- Cognitive limits and time constraints
- Frequency of interaction patterns

**Aristotle provides QUALITY structure:**
- Why we maintain relationships
- What we get from different friendship types
- How to nurture different relationships

**Together they create:**
- A nuanced, multi-dimensional relationship model
- Practical guidance for prioritization
- Context-appropriate suggestion strategies
- Realistic expectations about relationship capacity

### The Combined Model

```
Inner Circle (5) → Mostly Virtue + some Pleasure
Close Friends (15) → Mix of Virtue and Pleasure
Active Friends (50) → Pleasure + Utility + some Virtue
Casual Network (150) → Utility + Pleasure
Acquaintances (500) → Primarily Utility
```

---

## Feature Design: Friend Circle Onboarding

### Design Principles

1. **Progressive Disclosure**: Don't overwhelm users with all contacts at once
2. **Smart Defaults**: Use AI to suggest initial categorization
3. **User Control**: Easy to override AI suggestions
4. **Flexibility**: Relationships change; system should adapt
5. **Privacy**: Make clear this is private categorization
6. **Education**: Teach users about the framework without being academic

### Phase 1: Contact Import & Initial Categorization

**Objectives:**
- Import contacts from multiple sources
- Analyze existing interaction patterns
- Generate initial AI suggestions

**Data Sources:**
- Phone contacts
- Email contacts
- Calendar events (meeting frequency)
- Social media connections (if integrated)
- Message history (if available)

**AI Analysis:**
- Communication frequency (emails, texts, calls)
- Calendar co-attendance
- Recency of last interaction
- Consistency of interaction over time
- Shared group memberships

**Output:**
- Contacts ranked by likely importance
- Suggested circle assignments
- Confidence scores for suggestions

### Phase 2: Dunbar Layer Assignment

**UI Approach:**
Present contacts in batches with visual circle interface (concentric rings)

#### Circle 1: Inner Circle (Target: 5 people)

**Prompt:**
"Who are your closest confidants? People you'd call in a crisis."

**Characteristics:**
- Highest priority for suggestions
- Most frequent check-ins
- Deepest relationship tracking

**Default Frequency:**
- Weekly or more frequent contact
- Immediate alerts for long gaps

**AI Signals:**
- Very high communication frequency
- Consistent over long time periods
- Multiple communication channels
- Calendar events marked "personal"

#### Circle 2: Close Friends (Target: 10-15 people)

**Prompt:**
"Who are your good friends? People you regularly share life updates with."

**Characteristics:**
- High priority for suggestions
- Regular check-ins
- Important life event tracking

**Default Frequency:**
- Bi-weekly to monthly contact
- Alerts after 6-8 weeks

**AI Signals:**
- High communication frequency
- Regular but not constant
- Mix of one-on-one and group interactions
- Social calendar events

#### Circle 3: Active Friends (Target: 30-50 people)

**Prompt:**
"Who do you want to stay connected with regularly?"

**Characteristics:**
- Medium priority
- Periodic check-ins
- Activity-based suggestions

**Default Frequency:**
- Monthly to quarterly contact
- Alerts after 3-4 months

**AI Signals:**
- Moderate communication frequency
- Often activity-based interactions
- May be seasonal patterns
- Group event attendance

#### Circle 4: Casual Network (Target: 50-150 people)

**Prompt:**
"Who do you want to keep in touch with occasionally?"

**Characteristics:**
- Lower priority
- Time-decay triggered suggestions
- Opportunistic connection prompts

**Default Frequency:**
- Quarterly to annually
- Alerts after 6-12 months

**AI Signals:**
- Infrequent but present communication
- Professional contexts
- Shared group memberships
- Historical connection

#### Circle 5: Acquaintances (Remaining contacts)

**Prompt:**
"People you know but don't actively maintain relationships with"

**Characteristics:**
- Lowest priority
- Passive tracking only
- Suggestions only for special occasions

**Default Frequency:**
- Annual or less
- No automatic alerts

**AI Signals:**
- Minimal communication
- Very old contacts
- Single-context connections
- Low engagement history

### Phase 3: Aristotle's Friendship Classification

**For Circles 1-3 only** (to avoid overwhelming users)

**UI Approach:**
Tag-based system with visual icons, allow multiple tags per contact

#### Utility-Based Connections 🤝

**Prompt:**
"Is this primarily a professional or mutually beneficial relationship?"

**Indicators:**
- Work colleagues
- Professional network
- Mentors/mentees
- Business contacts
- Service providers you're friendly with

**Suggestion Strategy:**
- Professional check-ins
- Career milestone congratulations
- Industry news sharing
- Networking event invitations
- LinkedIn-style updates

#### Pleasure-Based Connections 🎉

**Prompt:**
"Do you primarily enjoy activities or shared interests together?"

**Indicators:**
- Activity buddies (gym, hiking, gaming, etc.)
- Hobby groups
- Social friends
- Entertainment companions
- Travel buddies

**Suggestion Strategy:**
- Activity-based meetups
- Event invitations
- Shared interest content
- Group hangouts
- "Want to do [activity] again?" prompts

#### Virtue-Based Connections ❤️

**Prompt:**
"Is this a deep friendship based on mutual respect and shared values?"

**Indicators:**
- Long-term friends who know you well
- People you admire and respect
- Friends who share core values
- Confidants and advisors
- Life-stage companions

**Suggestion Strategy:**
- Meaningful conversation prompts
- Life milestone check-ins
- Value-aligned activity suggestions
- Deep catch-up sessions
- Support during challenges

#### Hybrid Connections 🌟

**Reality:**
Most friendships span multiple categories

**Approach:**
- Allow multi-tagging
- Ask for primary category
- Weight suggestions based on tag combination
- Example: "Gym buddy who became a close friend" = Pleasure + Virtue

### Phase 4: Shared Context Mapping

**Objective:**
Capture the "glue" that holds relationships together

#### Shared Interests

**Categories:**
- Sports & Fitness (specific activities)
- Hobbies & Crafts
- Entertainment (music, movies, gaming)
- Professional interests
- Intellectual pursuits
- Food & Dining preferences

**Collection Method:**
- Multi-select from common categories
- Free-text for unique interests
- AI extraction from past communications
- Social media interest matching

**Usage:**
- Match people with similar interests
- Suggest group activities
- Content sharing recommendations
- Event invitations

#### Shared Values

**Categories:**
- Life priorities (family, career, adventure, health, etc.)
- Causes & activism
- Lifestyle choices (minimalism, sustainability, etc.)
- Philosophical outlook
- Parenting philosophy (if applicable)
- Work-life balance approach

**Collection Method:**
- Gentle, optional questions
- Inferred from conversations
- Evolves over time
- Never required

**Usage:**
- Deeper connection suggestions
- Value-aligned activity recommendations
- Support during value-relevant life events
- Meaningful conversation starters

#### Shared Location/Context

**Categories:**
- Geographic proximity (same city, neighborhood)
- Shared history (school, workplace, previous city)
- Life stage (new parents, empty nesters, career transition)
- Family situation (single, married, kids' ages)
- Timezone (for remote friends)

**Collection Method:**
- Import from contact data
- Calendar location analysis
- User confirmation
- Automatic updates

**Usage:**
- Practical meetup suggestions
- Local event recommendations
- Life-stage appropriate activities
- Timezone-aware communication timing

---

## Implementation Considerations

### UI/UX Flow

#### 1. Visual Circle Interface

**Design:**
- Concentric circles visualization
- Drag-and-drop contacts between circles
- Visual density shows relationship capacity
- Color coding for friendship types
- Hover for contact details

**Interactions:**
- Drag contact to move circles
- Click to edit details
- Batch select for group operations
- Filter/search functionality
- Undo/redo support

#### 2. Batch Processing

**Approach:**
- Show 10-15 contacts at a time
- Group by AI-suggested circle
- Progress indicator
- "Skip for now" option
- "I'll do this later" escape hatch

**Ordering:**
- Start with highest-confidence suggestions
- Mix circles to avoid monotony
- Prioritize recent contacts
- Include some "easy" decisions

#### 3. Smart Defaults

**Pre-population:**
- AI suggests initial circle
- Visual confidence indicator
- One-click accept
- Easy to override
- Explanation available ("Why?")

**Learning:**
- Track user overrides
- Improve future suggestions
- Adapt to user's circle sizes
- Personalize to user's patterns

#### 4. Skip Option

**Philosophy:**
- Don't force completion
- Allow partial onboarding
- Save progress automatically
- Resume anytime
- Suggest completion later

**Triggers:**
- After 20 minutes
- After 50 contacts
- User frustration signals
- "Finish later" button always visible

#### 5. Editing & Evolution

**Post-Onboarding:**
- Easy circle reassignment
- Bulk operations
- Archive/hide contacts
- Reactivate archived contacts
- Relationship history tracking

**Prompts:**
- "Has this relationship changed?"
- Suggest moves based on interaction patterns
- Annual relationship review
- Life event triggers (job change, move, etc.)

### AI Assistance

#### Communication Analysis

**Signals:**
- Email frequency and recency
- Text message patterns
- Call duration and frequency
- Calendar event co-attendance
- Response time patterns

**Algorithms:**
- Time-weighted frequency scoring
- Consistency over time
- Multi-channel aggregation
- Decay functions for old contacts
- Seasonal pattern detection

#### Interest Detection

**Sources:**
- Social media activity
- Calendar event types
- Email content analysis (privacy-respecting)
- Shared group memberships
- Location patterns

**Methods:**
- NLP for interest extraction
- Activity clustering
- Co-occurrence analysis
- User confirmation required
- Privacy-first approach

#### Group Identification

**Patterns:**
- Frequent group email threads
- Calendar events with same attendees
- Shared organizational affiliations
- Geographic clustering
- Life stage similarities

**Output:**
- Suggested group names
- Automatic group creation
- Shared context identification
- Group-level suggestions
- Network visualization

#### Relationship Type Prediction

**Features:**
- Communication formality
- Time of day patterns
- Weekend vs. weekday
- Location context
- Interaction consistency

**Classification:**
- Utility vs. Pleasure vs. Virtue
- Confidence scores
- Multiple type support
- User override learning
- Continuous refinement

### Privacy & Control

#### Transparency

**Principles:**
- Clear explanation of categorization purpose
- Private by default
- No sharing without explicit consent
- User owns all data
- Export capability

**Communication:**
- "This is just for you" messaging
- Explain how it improves suggestions
- Show what AI can/cannot see
- Privacy policy link
- Data deletion options

#### User Control

**Features:**
- Hide contacts without deleting
- Archive inactive relationships
- Custom frequency per contact
- Override all AI suggestions
- Disable features selectively

**Flexibility:**
- No required fields (except name)
- Skip any question
- Change answers anytime
- Bulk edit operations
- Import/export data

#### Relationship Evolution

**Recognition:**
- Relationships change over time
- Circles aren't permanent
- Friendship types evolve
- Context shifts happen
- Life stages transition

**Support:**
- Easy reassignment
- Relationship history
- "What changed?" prompts
- Seasonal adjustments
- Life event triggers

### Gamification Elements

#### Progress & Achievement

**Onboarding:**
- Progress bar through setup
- Circle completion celebrations
- "You're building your network!" encouragement
- Milestone markers (25%, 50%, 75%, 100%)
- Time estimate remaining

**Ongoing:**
- Relationship maintenance streaks
- Connection goals achieved
- Network health score
- Balanced circle indicators
- Engagement metrics

#### Educational Moments

**Dunbar Context:**
- "Research shows most people have 5 close friends"
- "You're at 12 close friends—that's above average!"
- "Your network of 147 is right at Dunbar's number"
- Gentle nudges if circles are imbalanced
- Celebrate healthy relationship distribution

**Aristotle Context:**
- "You have a good mix of friendship types"
- "Virtue friendships take time to develop"
- "Activity-based friendships keep life fun"
- Normalize different relationship purposes
- Encourage depth and breadth

#### Gentle Nudges

**Balance Prompts:**
- "Your inner circle is empty—who are your closest friends?"
- "You have 200 people in your active circle—consider moving some to casual"
- "Most people maintain 10-15 close friendships"
- Never judgmental
- Always optional

**Engagement Prompts:**
- "You haven't categorized 50 contacts yet"
- "Want to finish setting up your circles?"
- "Your network is 80% complete!"
- Respectful of user time
- Easy to dismiss

### Integration with Core Features

#### Suggestion Priority

**Algorithm:**
```
Priority Score = 
  (Circle Weight × Time Since Contact) + 
  (Friendship Type Match × Current Context) +
  (Shared Interest Relevance × Opportunity Score)
```

**Circle Weights:**
- Inner Circle (5): 10x
- Close Friends (15): 5x
- Active Friends (50): 2x
- Casual Network (150): 1x
- Acquaintances (500): 0.2x

#### Suggestion Content

**Utility Friendships:**
- Professional updates
- Career milestones
- Industry news
- Networking opportunities
- Skill sharing

**Pleasure Friendships:**
- Activity invitations
- Event suggestions
- Shared interest content
- Group hangouts
- "Remember when we..." prompts

**Virtue Friendships:**
- Deep conversation starters
- Life milestone check-ins
- Value-aligned activities
- Support prompts
- Meaningful questions

#### Group Formation

**Automatic Groups:**
- Same circle + shared interests
- Same friendship type + proximity
- Historical group interactions
- Life stage + values alignment
- Activity + availability overlap

**Suggestions:**
- "Invite your hiking friends"
- "Your college friends haven't met your work friends"
- "These 3 people all love board games"
- Group activity recommendations
- Dinner party guest lists

#### Time-Based Triggers

**Inner Circle (5):**
- Alert after 1 week
- Urgent after 2 weeks
- High-priority suggestions

**Close Friends (15):**
- Alert after 1 month
- Urgent after 6 weeks
- Regular suggestions

**Active Friends (50):**
- Alert after 3 months
- Urgent after 6 months
- Periodic suggestions

**Casual Network (150):**
- Alert after 6 months
- Urgent after 1 year
- Opportunistic suggestions

---

## Key Research Insights

### From Dunbar's Work

1. **Cognitive Limits Are Real**
   - 150 is an average, not a rule
   - Individual variation exists
   - Brain structure predicts capacity
   - Can't be "trained" to exceed significantly

2. **Time Is The Constraint**
   - Maintaining relationships requires time investment
   - 42% of time for 150-person group
   - Quality vs. quantity tradeoff
   - Efficiency tools help but don't eliminate constraint

3. **Layers Are Hierarchical**
   - Each layer ~3x previous
   - Different maintenance requirements
   - Different emotional investment
   - Natural clustering occurs

4. **Proximity Matters**
   - Physical distance reduces effective group size
   - Dispersed groups are smaller
   - Regular contact maintains bonds
   - Technology helps but doesn't replace presence

5. **Language As Social Technology**
   - Evolved to enable larger groups
   - "Cheap" social grooming
   - Allows maintenance without constant presence
   - **CatchUp's voice notes align with this theory!**

### From Aristotle's Work

1. **Three Types Are Distinct**
   - Different motivations
   - Different maintenance needs
   - Different longevity patterns
   - All are valid and valuable

2. **Virtue Friendships Are Rare**
   - Take time to develop
   - Require character alignment
   - Most enduring form
   - Quality over quantity

3. **Utility/Pleasure Aren't Lesser**
   - Serve important purposes
   - Most common in modern life
   - Can evolve into virtue friendships
   - Appropriate for different contexts

4. **Reciprocity Is Essential**
   - Friendship requires mutual care
   - One-sided isn't true friendship
   - Equality matters
   - Both must invest

5. **Friends Shape Character**
   - Mutual influence is natural
   - Choose friends wisely
   - Values alignment matters
   - Growth happens together

### Modern Applications

1. **Technology Enables Maintenance**
   - Reduces time cost per relationship
   - Enables larger effective networks
   - Doesn't replace deep connection
   - Complements, doesn't substitute

2. **Life Stages Affect Capacity**
   - Young adults: larger networks
   - Parents: smaller, more focused
   - Empty nesters: network expansion
   - Retirement: quality focus

3. **Professional Networks Differ**
   - Mostly utility-based
   - Larger than personal networks
   - Different maintenance patterns
   - Can become personal over time

4. **Digital Natives Adapt**
   - Comfortable with online relationships
   - Different intimacy patterns
   - Multi-channel communication
   - Blurred online/offline boundaries

5. **Intentionality Matters**
   - Passive networks decay
   - Active maintenance required
   - Tools help but don't replace effort
   - Awareness improves outcomes

---

## Success Metrics

### Onboarding Completion

**Metrics:**
- % users who complete onboarding
- Time to complete
- Contacts categorized per user
- Circle distribution patterns
- Drop-off points

**Targets:**
- 70%+ completion rate
- <15 minutes median time
- 50+ contacts categorized
- Balanced circle distribution
- <20% drop-off after start

### Engagement Quality

**Metrics:**
- Suggestion acceptance rate by circle
- Relationship maintenance consistency
- Circle reassignment frequency
- User-initiated contact updates
- Feature usage patterns

**Targets:**
- 40%+ suggestion acceptance (inner circle)
- 80%+ users maintain inner circle weekly
- <10% circle reassignments per month
- 30%+ users update contacts monthly
- High feature engagement

### User Satisfaction

**Metrics:**
- NPS score
- Feature satisfaction ratings
- Qualitative feedback
- Support ticket volume
- Retention rates

**Targets:**
- NPS >50
- 4.5+ star feature rating
- Positive qualitative themes
- <5% support tickets related to circles
- 90%+ retention after onboarding

### Relationship Outcomes

**Metrics:**
- Actual contact frequency vs. goals
- Relationship satisfaction (surveys)
- Network health scores
- Lapsed relationship reactivation
- New connection formation

**Targets:**
- 70%+ meet contact frequency goals
- 4+ relationship satisfaction score
- Improving network health over time
- 20%+ reactivate lapsed relationships
- Facilitate new connections

---

## Next Steps

### 1. Create Wireframes

**Screens Needed:**
- Contact import flow
- Circle assignment interface
- Friendship type tagging
- Shared context capture
- Progress/completion screens
- Post-onboarding dashboard

**Focus:**
- Visual clarity
- Intuitive interactions
- Mobile-first design
- Accessibility compliance
- Progressive disclosure

### 2. Design Question Flow

**Decisions:**
- Exact wording for each prompt
- Question order and grouping
- Skip logic and branching
- Required vs. optional fields
- Help text and examples

**Testing:**
- User comprehension
- Completion rates
- Time per question
- Emotional response
- Confusion points

### 3. Build Data Model

**Schema Design:**
```
contacts:
  - id
  - name
  - dunbar_circle (1-5)
  - friendship_types[] (utility, pleasure, virtue)
  - shared_interests[]
  - shared_values[]
  - location_context
  - life_stage
  - contact_frequency_preference
  - last_contact_date
  - relationship_history[]

circles:
  - user_id
  - circle_level (1-5)
  - target_size
  - actual_size
  - health_score

friendship_classifications:
  - contact_id
  - type (utility/pleasure/virtue)
  - confidence_score
  - user_confirmed
  - created_at
```

**Relationships:**
- User → Contacts (one-to-many)
- Contact → Friendship Types (many-to-many)
- Contact → Interests (many-to-many)
- Contact → Groups (many-to-many)

### 4. Develop AI Classification Logic

**Models Needed:**
- Circle assignment predictor
- Friendship type classifier
- Interest extractor
- Group identifier
- Relationship health scorer

**Training Data:**
- Communication patterns
- Calendar data
- User corrections
- Engagement metrics
- Demographic patterns

### 5. Plan Migration Path

**Existing Users:**
- Opt-in vs. required
- Gradual rollout
- Pre-populate from existing data
- Simplified flow for established users
- Preserve existing preferences

**Communication:**
- Feature announcement
- Benefits explanation
- Time estimate
- Optional nature
- Support resources

### 6. User Testing

**Validation:**
- Categorization feels natural
- Time to complete acceptable
- AI suggestions helpful
- Terminology clear
- Emotional response positive

**Iterations:**
- Refine based on feedback
- A/B test variations
- Optimize question flow
- Improve AI accuracy
- Enhance UX

---

## Conclusion

This onboarding feature combines rigorous academic research with practical UX design to create a relationship management system that is:

- **Theoretically Sound**: Based on Dunbar's cognitive science and Aristotle's philosophy
- **Practically Useful**: Translates theory into actionable categorization
- **User-Friendly**: Progressive disclosure, smart defaults, easy editing
- **Privacy-Respecting**: User control, transparent, secure
- **Scalable**: Works for small and large networks
- **Adaptive**: Evolves with changing relationships

By giving users a structured framework for understanding their relationships, CatchUp can provide more intelligent, context-appropriate suggestions that truly help people maintain meaningful connections across all relationship tiers.

The combination of Dunbar's quantitative layers with Aristotle's qualitative types creates a nuanced, multi-dimensional system that respects both the cognitive limits of human social capacity and the rich variety of human relationships.

---

## References

### Academic Sources

**Dunbar's Number:**
- Dunbar, R. I. M. (1992). "Neocortex size as a constraint on group size in primates"
- Dunbar, R. I. M. (1996). "Grooming, Gossip, and the Evolution of Language"
- Wikipedia: Dunbar's Number (comprehensive overview with citations)

**Aristotle's Ethics:**
- Aristotle. "Nicomachean Ethics" (Books VIII-IX on friendship)
- Stanford Encyclopedia of Philosophy: "Aristotle's Ethics"
- Internet Encyclopedia of Philosophy: "Aristotle's Ethics"
- Stanford Encyclopedia of Philosophy: "Friendship"

**Additional Research:**
- Bernard, H. R. & Killworth, P. (alternative network size estimates)
- Carstensen's Socioemotional Selectivity Theory (aging and friendships)
- Contemporary virtue ethics revival (MacIntyre, Nussbaum, et al.)

### Related CatchUp Documents

- `product.md` - Core product vision and goals
- `tech.md` - Technical stack and AI/ML approach
- `structure.md` - Project organization and module boundaries
- `database-setup.md` - Database schema and setup
- Contact management implementation files
- Voice notes feature (aligns with Dunbar's language theory)

---

*Document created: 2025-11-27*
*For: CatchUp Onboarding Feature Specification*
*Status: Research Foundation - Ready for Spec Development*
