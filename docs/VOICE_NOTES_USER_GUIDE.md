# Voice Notes Feature - User Guide

## Overview

The Voice Notes feature allows you to quickly capture context about your contacts by speaking naturally. The system automatically transcribes your voice, identifies which contacts you're talking about, and suggests updates to their profiles—all in real-time.

**Key Benefits:**
- **Fast**: Speak naturally instead of typing
- **Smart**: Automatically identifies contacts and extracts relevant information
- **Flexible**: Support for multiple contacts in a single voice note
- **Organized**: View history of all your voice notes and what was captured

---

## Table of Contents

1. [Recording Voice Notes](#recording-voice-notes)
2. [Reviewing Enrichment Proposals](#reviewing-enrichment-proposals)
3. [Manual Contact Selection](#manual-contact-selection)
4. [Voice Notes History](#voice-notes-history)
5. [Group Suggestions](#group-suggestions)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Privacy and Data](#privacy-and-data)
8. [Troubleshooting](#troubleshooting)

---

## Recording Voice Notes

### Getting Started

1. **Navigate to Voice Notes**
   - Click on "Voice Notes" in the main navigation
   - Or use the quick action button (microphone icon) from any page

2. **Grant Microphone Permission**
   - On first use, your browser will ask for microphone access
   - Click "Allow" to enable voice recording
   - This permission is required for the feature to work
   - **Note**: The browser uses `getUserMedia()` API which requires HTTPS in production
   - Your audio is streamed in real-time and not stored permanently

### Recording Process

#### Step 1: Start Recording

1. Click the **Record** button (red microphone icon)
2. You'll see a visual indicator showing recording is active:
   - Pulsing red dot
   - Recording timer
   - Audio waveform visualization

#### Step 2: Speak Naturally

Speak as you would normally. The system understands natural language, so you don't need to use special commands or formats.

**Example voice notes:**

*Single Contact:*
> "I just had coffee with John. He mentioned he's really into rock climbing now and just moved to Boulder, Colorado. We should catch up monthly."

*Multiple Contacts:*
> "Had dinner with Sarah and Mike last night. They're both working on AI projects and are really excited about machine learning. Sarah just got promoted to senior engineer."

*Group Context:*
> "Went hiking with the outdoor crew—Emma, David, and Lisa. We're planning to do this monthly. Everyone loves photography too."

#### Step 3: Watch Real-Time Transcription

As you speak, you'll see:
- **Gray text**: Interim transcription (still processing)
- **Black text**: Finalized transcription (confirmed)

This lets you verify the system is hearing you correctly.

#### Step 4: Stop Recording

1. Click the **Stop** button when you're done
2. The system will process your voice note:
   - Finalizes the transcript
   - Identifies mentioned contacts
   - Extracts relevant information
   - Generates enrichment proposals

### What Happens Next

After you stop recording, the system automatically:

1. **Identifies Contacts**: Matches names in your transcript to your contact list
2. **Extracts Information**: Pulls out relevant details like:
   - Tags/interests (e.g., "rock climbing", "AI", "photography")
   - Location updates (e.g., "Boulder, Colorado")
   - Groups (e.g., "outdoor crew")
   - Last contact date
   - Frequency preferences (e.g., "monthly")
   - Contact details (phone, email, social media)

3. **Creates Proposals**: Generates suggested updates for each contact

---

## Reviewing Enrichment Proposals

After recording, you'll see the **Enrichment Review** interface where you can review and edit all proposed changes before applying them.

### Understanding the Interface

The enrichment review is organized by contact:

```
┌─────────────────────────────────────────────────┐
│ Enrichment Proposal                             │
├─────────────────────────────────────────────────┤
│ ▼ John Doe                                      │
│   ☑ Add Tag: "rock climbing"             [Edit] │
│   ☑ Update Location: "Boulder, CO"       [Edit] │
│   ☑ Update Frequency: "monthly"          [Edit] │
│   ☐ Add Group: "Outdoor Friends"         [Edit] │
├─────────────────────────────────────────────────┤
│ ▼ Sarah Chen                                    │
│   ☑ Add Tag: "AI"                        [Edit] │
│   ☑ Add Tag: "machine learning"          [Edit] │
│   ☑ Update Field: "Senior Engineer"      [Edit] │
├─────────────────────────────────────────────────┤
│ [Accept All] [Reject All] [Apply Selected]     │
└─────────────────────────────────────────────────┘
```

### Reviewing Items

Each enrichment item shows:
- **Checkbox**: Accept or reject this change
- **Type**: Tag, Group, Field Update, or Last Contact Date
- **Action**: Add or Update
- **Value**: The proposed change
- **Edit button**: Modify the value

### Actions You Can Take

#### 1. Accept/Reject Individual Items

- **Check** the box to accept an item
- **Uncheck** the box to reject an item
- By default, all items are checked (accepted)

#### 2. Edit Values

1. Click the **Edit** button next to any item
2. Modify the value in the inline editor
3. The system validates your input based on the field type
4. Press Enter or click outside to save

**Example edits:**
- Change "rock climbing" to "bouldering"
- Update location from "Boulder, CO" to "Boulder, Colorado"
- Modify frequency from "monthly" to "bi-weekly"

#### 3. Bulk Actions

- **Accept All**: Check all items for all contacts
- **Reject All**: Uncheck all items for all contacts
- **Apply Selected**: Apply only the checked items

### Applying Changes

1. Review all proposed changes
2. Accept/reject items as needed
3. Edit any values that need adjustment
4. Click **Apply Selected**
5. You'll see a confirmation with a summary:
   ```
   Successfully applied changes:
   - 5 tags added
   - 2 fields updated
   - 1 group created
   ```

### What Gets Updated

When you apply enrichment:

**Tags:**
- New tags are created and associated with the contact
- Tags are marked as coming from "voice_memo" source
- Duplicate tags are automatically prevented

**Groups:**
- New groups are created if they don't exist
- Contacts are added to the specified groups
- Existing group memberships are preserved

**Fields:**
- Contact fields are updated with new values
- Location changes trigger automatic timezone updates
- Previous values are overwritten

**Last Contact Date:**
- Updates when you last connected with this contact
- Affects suggestion timing and priority

---

## Manual Contact Selection

Sometimes the system can't automatically identify which contact you're talking about. This happens when:
- The name isn't in your contact list
- Multiple contacts have similar names
- The name is ambiguous or unclear

### When Contact Selection Appears

You'll see the contact selection interface if:
- No contacts were automatically identified
- The system needs clarification on which contact you meant

### Using the Contact Selector

```
┌─────────────────────────────────────────────────┐
│ Select Contacts for Voice Note                  │
├─────────────────────────────────────────────────┤
│ Search: [_____________________] 🔍              │
├─────────────────────────────────────────────────┤
│ ☐ John Doe                                      │
│   Groups: Work Friends, Tech Enthusiasts        │
│   Tags: AI, hiking                              │
├─────────────────────────────────────────────────┤
│ ☐ Jane Smith                                    │
│   Groups: College Friends                       │
│   Tags: photography, travel                     │
├─────────────────────────────────────────────────┤
│ ☐ Mike Johnson                                  │
│   Groups: Outdoor Friends                       │
│   Tags: hiking, camping                         │
├─────────────────────────────────────────────────┤
│ Selected: 0 contacts                            │
│ [Cancel] [Confirm Selection]                    │
└─────────────────────────────────────────────────┘
```

### Steps to Select Contacts

1. **Search** (optional):
   - Type in the search box to filter contacts
   - Search works on name, groups, and tags

2. **Select Contacts**:
   - Check the box next to each relevant contact
   - You can select multiple contacts
   - Selected count updates at the bottom

3. **Filter** (optional):
   - Use group or tag filters to narrow down the list
   - Helpful when you have many contacts

4. **Confirm**:
   - Click **Confirm Selection** when done
   - The system will proceed with entity extraction for selected contacts

### Tips for Contact Selection

- **Be specific in your voice note**: Mention full names or unique identifiers
- **Add contacts first**: Make sure contacts are in your system before recording
- **Use nicknames**: The system learns from your patterns over time
- **Multiple contacts**: Select all relevant people mentioned in the voice note

---

## Voice Notes History

View all your past voice notes, see what was captured, and track changes over time.

### Accessing History

1. Navigate to **Voice Notes** > **History**
2. Or click **View History** from the recording page

### History View

```
┌─────────────────────────────────────────────────┐
│ Voice Notes History                             │
├─────────────────────────────────────────────────┤
│ Filters: [All Contacts ▼] [All Status ▼]       │
│ Date Range: [Last 30 days ▼]                   │
│ Search: [_____________________] 🔍              │
├─────────────────────────────────────────────────┤
│ ▼ Jan 15, 2024 - 2:30 PM                       │
│   "I just had coffee with John. He mentioned..." │
│   👤 John Doe                                   │
│   ✓ Applied: 3 tags, 2 fields                  │
│   [View Details] [Delete]                       │
├─────────────────────────────────────────────────┤
│ ▼ Jan 14, 2024 - 6:45 PM                       │
│   "Had dinner with Sarah and Mike last night..." │
│   👤 Sarah Chen, Mike Johnson                   │
│   ✓ Applied: 5 tags, 1 group                   │
│   [View Details] [Delete]                       │
├─────────────────────────────────────────────────┤
│ ▶ Jan 12, 2024 - 11:20 AM                      │
│   "Went hiking with the outdoor crew—Emma..."   │
│   👤 Emma Wilson, David Lee, Lisa Park          │
│   ⏳ Ready for review                           │
│   [Review] [Delete]                             │
└─────────────────────────────────────────────────┘
```

### Understanding Status Badges

- **✓ Applied**: Enrichment has been applied to contacts
- **⏳ Ready**: Waiting for your review
- **🔄 Processing**: Still transcribing or extracting
- **❌ Error**: Something went wrong (click for details)

### Filtering and Search

**Filter by Contact:**
- Select a contact to see only voice notes mentioning them
- Useful for tracking all context about a specific person

**Filter by Status:**
- **All**: Show all voice notes
- **Applied**: Only show completed voice notes
- **Ready**: Only show voice notes awaiting review
- **Processing**: Only show voice notes being processed

**Filter by Date:**
- Last 7 days
- Last 30 days
- Last 3 months
- Custom date range

**Search:**
- Search across all transcripts
- Finds voice notes containing specific words or phrases
- Useful for finding specific conversations or topics

### Viewing Details

Click **View Details** or the expand arrow (▼) to see:

1. **Full Transcript**: Complete text of what you said
2. **Associated Contacts**: All contacts mentioned
3. **Enrichment Items**: What was extracted and applied
4. **Breakdown by Contact**: Which items went to which contact
5. **Timestamps**: When recorded and when applied

**Example Detail View:**

```
┌─────────────────────────────────────────────────┐
│ Voice Note Details                              │
├─────────────────────────────────────────────────┤
│ Recorded: Jan 15, 2024 at 2:30 PM              │
│ Status: Applied                                 │
│                                                  │
│ Full Transcript:                                │
│ "I just had coffee with John. He mentioned he's │
│ really into rock climbing now and just moved to │
│ Boulder, Colorado. We should catch up monthly." │
│                                                  │
│ Contacts: John Doe                              │
│                                                  │
│ Enrichment Applied:                             │
│ ✓ Added tag "rock climbing" to John Doe        │
│ ✓ Added tag "coffee" to John Doe               │
│ ✓ Updated location to "Boulder, CO"            │
│ ✓ Updated frequency to "monthly"               │
│ ✓ Updated last contact date to Jan 15, 2024    │
│                                                  │
│ [Close] [Delete Voice Note]                     │
└─────────────────────────────────────────────────┘
```

### Deleting Voice Notes

1. Click **Delete** next to a voice note
2. Confirm the deletion
3. **Note**: This only deletes the voice note record, not the applied changes to contacts

---

## Group Suggestions

The voice notes feature enhances group suggestions by identifying when you mention multiple people together.

### How It Works

When you mention multiple contacts in a voice note:
1. The system tracks these co-mentions
2. Calculates shared context between contacts
3. Generates group catchup suggestions when appropriate

**Example:**
> "Went hiking with Emma, David, and Lisa. We're planning to do this monthly."

This creates:
- Shared tag "hiking" for all three contacts
- Group "Outdoor Friends" (if mentioned)
- Increased likelihood of group suggestions for these three

### Group Suggestion Display

Group suggestions appear in your suggestions feed:

```
┌─────────────────────────────────────────────────┐
│ 🏔️ Hiking Friends                               │
│ ┌─┐┌─┐┌─┐                                       │
│ │E││D││L│  Emma, David, and Lisa                │
│ └─┘└─┘└─┘                                       │
│                                                  │
│ Saturday, 2:00 PM - 4:00 PM                     │
│                                                  │
│ These friends share hiking interests and were   │
│ mentioned together in your recent voice note.   │
│ It's been 3 weeks since you all hung out.       │
│                                                  │
│ [Accept] [Dismiss] [Modify Group ▼]             │
└─────────────────────────────────────────────────┘
```

### Managing Group Suggestions

**Accept Group Suggestion:**
- Creates interaction logs for all contacts
- Generates a draft message addressing everyone

**Remove Individual from Group:**
1. Click **Modify Group** dropdown
2. Select "Remove [Name]"
3. Suggestion updates to show remaining contacts
4. If only one person remains, converts to individual suggestion

**Dismiss Group Suggestion:**
- Option to dismiss for all contacts
- Or remove specific contacts and keep suggestion for others

### Benefits of Group Suggestions

- **Efficiency**: Catch up with multiple friends at once
- **Natural**: Reflects how you actually socialize
- **Context-Aware**: Based on shared interests and past interactions
- **Flexible**: Easy to modify or convert to individual suggestions

---

## Tips and Best Practices

### Recording Tips

**Be Clear and Specific:**
- Use full names when possible: "John Smith" instead of just "John"
- Mention context: "my friend John" or "John from work"
- Speak at a normal pace—not too fast or too slow

**Include Relevant Details:**
- Interests and hobbies: "She's really into photography"
- Location: "He just moved to Seattle"
- Frequency: "We should catch up monthly"
- Contact info: "His new email is john@example.com"
- Groups: "Part of my college friends group"

**Multiple Contacts:**
- Clearly distinguish between people: "Sarah is into AI, while Mike focuses on data science"
- Mention shared activities: "We all went hiking together"
- Use "and" to connect names: "Had dinner with Sarah and Mike"

### What to Include in Voice Notes

**Good Examples:**

✓ "Met John at the tech conference. He's working on AI projects and loves hiking. Lives in Boulder now. Let's catch up monthly."

✓ "Coffee with Sarah. She got promoted to senior engineer. Really excited about machine learning. Her new email is sarah@newcompany.com."

✓ "Dinner with the college crew—Emma, David, and Lisa. We're all into photography now. Planning monthly meetups."

**Less Effective:**

✗ "Saw him today. Was good." (Too vague, no names or details)

✗ "John likes stuff." (Not specific enough)

✗ "Met with someone from work." (No name provided)

### Enrichment Review Tips

**Review Before Applying:**
- Always check proposed changes before clicking Apply
- The AI is smart but not perfect—verify accuracy
- Edit values that need adjustment

**Use Tags Consistently:**
- Keep tags short (1-3 words)
- Use consistent naming: "rock climbing" not "rockclimbing"
- Avoid overly specific tags: "hiking" not "hiking on Saturdays"

**Group Organization:**
- Create meaningful group names: "College Friends", "Work Colleagues"
- Don't create too many groups—keep it manageable
- Use groups for people you often see together

**Field Updates:**
- Verify location updates are correct
- Check that frequency preferences match your intent
- Confirm contact details before applying

### Maximizing Value

**Regular Use:**
- Record voice notes after social interactions
- Capture context while it's fresh in your mind
- Build a rich history of your relationships

**Review History:**
- Periodically review past voice notes
- See patterns in your relationships
- Track how contacts' interests evolve

**Combine with Other Features:**
- Voice notes enhance suggestion quality
- More context = better matching
- Group suggestions become more accurate

---

## Privacy and Data

### What Gets Stored

**Voice Notes:**
- Transcript text (what you said)
- Recording timestamp
- Associated contacts
- Extracted entities
- Processing status

**Audio Files:**
- Audio is NOT stored by default
- Only the transcript is saved
- Audio is processed in real-time and discarded

### Data Usage

**Your voice notes are used to:**
- Generate enrichment proposals for your contacts
- Improve suggestion matching
- Identify group catchup opportunities
- Track relationship context

**Your voice notes are NOT:**
- Shared with other users
- Used to train AI models (unless you opt in)
- Sold to third parties
- Accessible to anyone but you

### Privacy Controls

**Delete Voice Notes:**
- You can delete any voice note at any time
- Deleting a voice note doesn't remove applied changes to contacts
- Deleted voice notes cannot be recovered

**Export Your Data:**
- Export all voice notes and transcripts
- Available in JSON or CSV format
- Includes all metadata and enrichment history

**Account Deletion:**
- Deleting your account removes all voice notes
- All associated data is permanently deleted
- Cannot be undone

### Security

**Data Encryption:**
- All data encrypted in transit (HTTPS/WSS)
- Database encryption at rest
- Secure API authentication

**Access Control:**
- Only you can access your voice notes
- Authentication required for all operations
- Session management with secure tokens

---

## Troubleshooting

### Common Issues

#### "Microphone access denied"

**Problem**: Browser doesn't have permission to access your microphone.

**Solutions:**
1. Click the lock icon in your browser's address bar
2. Find "Microphone" in the permissions list
3. Change to "Allow"
4. Refresh the page and try again

**Browser-specific:**
- **Chrome**: Settings > Privacy and Security > Site Settings > Microphone
- **Firefox**: Preferences > Privacy & Security > Permissions > Microphone
- **Safari**: Preferences > Websites > Microphone
- **Edge**: Settings > Cookies and site permissions > Microphone

**Technical Details:**
- The app uses the `MediaRecorder` API with `getUserMedia()`
- Audio is captured with these constraints:
  - Sample rate: 16000 Hz
  - Channel count: 1 (mono)
  - Echo cancellation: Enabled
  - Noise suppression: Enabled
- Audio chunks are sent every 100ms for real-time transcription

#### "No transcript appearing"

**Problem**: Recording but no text shows up.

**Solutions:**
1. Check your microphone is working (test in another app)
2. Speak louder or closer to the microphone
3. Check internet connection (transcription requires connectivity)
4. Try refreshing the page
5. Check browser console for errors

#### "Wrong contact identified"

**Problem**: System identified the wrong person.

**Solutions:**
1. Use the manual contact selector to choose the correct person
2. Be more specific in future voice notes (use full names)
3. Add more context: "my friend John" or "John from work"
4. Update contact names to be more distinctive

#### "Enrichment not applying"

**Problem**: Clicked Apply but changes didn't save.

**Solutions:**
1. Check for error messages
2. Verify you have permission to edit contacts
3. Check internet connection
4. Try applying items one at a time
5. Refresh and try again

#### "Poor transcription quality"

**Problem**: Transcript has many errors.

**Solutions:**
1. Speak more clearly and at a moderate pace
2. Reduce background noise
3. Use a better microphone if available
4. Check language setting matches your speech
5. Try recording in a quieter environment

#### "WebSocket connection failed"

**Problem**: Real-time transcription not working.

**Solutions:**
1. Check internet connection
2. Disable VPN temporarily
3. Check firewall settings
4. Try a different browser
5. Contact support if issue persists

### Getting Help

If you continue to experience issues:

1. **Check Status Page**: See if there are any known issues
2. **Review Logs**: Check browser console for error messages
3. **Contact Support**: 
   - Email: support@catchup.app
   - Include: Error message, browser, steps to reproduce
4. **Community Forum**: Ask questions and see solutions from other users

### Browser Compatibility

**Fully Supported:**
- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14.1+
- Edge 90+

**MediaRecorder API Support:**
- Chrome: Full support since version 47
- Firefox: Full support since version 25
- Safari: Full support since version 14.1
- Edge: Full support since version 79

**getUserMedia API Support:**
- All modern browsers support `getUserMedia()`
- Requires HTTPS in production (except localhost)
- Mobile browsers have full support on iOS 11+ and Android 5+

**Limited Support:**
- Older browser versions may have issues
- Some mobile browsers may have codec limitations
- iOS Safari requires user interaction to start recording

**Recommended:**
- Use the latest version of Chrome or Firefox for best experience
- Desktop browsers generally have better microphone quality
- Ensure JavaScript is enabled
- Use HTTPS for production deployments

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Action | Shortcut |
|--------|----------|
| Start/Stop Recording | `Space` (when focused) |
| Accept All | `Ctrl/Cmd + A` |
| Apply Selected | `Ctrl/Cmd + Enter` |
| Search History | `Ctrl/Cmd + F` |
| Close Modal | `Esc` |

---

## Feedback and Suggestions

We're constantly improving the voice notes feature. Your feedback helps!

**Share Feedback:**
- In-app feedback button
- Email: feedback@catchup.app
- Feature requests: Submit via the feedback form

**What to Include:**
- What you like
- What could be better
- Specific use cases
- Feature ideas

---

## Additional Resources

### Video Tutorials

- [Getting Started with Voice Notes](https://catchup.app/tutorials/voice-notes-intro)
- [Advanced Tips and Tricks](https://catchup.app/tutorials/voice-notes-advanced)
- [Managing Group Suggestions](https://catchup.app/tutorials/group-suggestions)

### Documentation

- [API Documentation](./API.md)
- [Environment Setup Guide](./VOICE_NOTES_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Support

- Help Center: https://help.catchup.app
- Community Forum: https://community.catchup.app
- Email Support: support@catchup.app
- Status Page: https://status.catchup.app

---

## Changelog

### Version 1.0 (Current)

**Features:**
- Real-time audio transcription
- Multi-contact support
- Automatic entity extraction
- Enrichment review interface
- Voice notes history
- Group suggestion enhancement
- Manual contact selection

**Coming Soon:**
- Voice commands for hands-free operation
- Multi-language support
- Audio file upload (for pre-recorded notes)
- Voice note sharing
- Advanced search and filtering
- Custom extraction rules

---

*Last updated: January 2024*
