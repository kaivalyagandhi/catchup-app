# SMS/MMS Enrichment - User Guide

## Overview

The SMS/MMS Enrichment feature lets you capture contact information on-the-go by simply texting CatchUp. Send text messages, voice notes, photos, or videos to your dedicated CatchUp phone number, and the system automatically extracts relevant information about your contacts.

**Key Benefits:**
- **Always Available**: Capture context anytime, anywhere via text
- **Hands-Free**: Send voice notes while driving or walking
- **Visual Context**: Share photos of business cards or event videos
- **Automatic Processing**: AI extracts names, tags, locations, and notes
- **Review Before Applying**: All enrichments are pending until you approve them

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Supported Message Types](#supported-message-types)
3. [Sending Text Messages (SMS)](#sending-text-messages-sms)
4. [Sending Voice Notes (Audio MMS)](#sending-voice-notes-audio-mms)
5. [Sending Photos (Image MMS)](#sending-photos-image-mms)
6. [Sending Videos (Video MMS)](#sending-videos-video-mms)
7. [Reviewing Enrichments](#reviewing-enrichments)
8. [Rate Limits and Restrictions](#rate-limits-and-restrictions)
9. [Privacy and Security](#privacy-and-security)
10. [Troubleshooting](#troubleshooting)
11. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Step 1: Link Your Phone Number

Before you can send enrichments via SMS/MMS, you need to link your phone number to your CatchUp account.

1. **Navigate to Settings**
   - Log into CatchUp web app
   - Go to **Settings** > **Phone Number**

2. **Enter Your Phone Number**
   - Enter your mobile phone number (include country code)
   - Format: +1-555-123-4567 or +15551234567
   - Click **"Send Verification Code"**

3. **Verify Your Number**
   - You'll receive a 6-digit code via SMS
   - Enter the code in the verification field
   - Click **"Verify"**
   - Code expires after 10 minutes

4. **Confirmation**
   - Once verified, you'll see: "Phone number linked successfully"
   - You'll also see the CatchUp phone number to text

### Step 2: Save CatchUp's Number

Add CatchUp's phone number to your contacts:
- **Name**: CatchUp
- **Number**: [Your dedicated CatchUp number]
- This makes it easy to send enrichments anytime

### Step 3: Send Your First Message

Try sending a simple text:
```
Had coffee with John today. He's into rock climbing and photography.
```

You'll receive a confirmation text within seconds, and the enrichment will appear in your web app for review.

---

## Supported Message Types

CatchUp supports four types of messages:

| Type | Description | Max Size | Processing Time |
|------|-------------|----------|-----------------|
| **SMS** | Plain text messages | 160 characters per segment | < 5 seconds |
| **Audio MMS** | Voice notes, voice memos | 5 MB | 10-30 seconds |
| **Image MMS** | Photos, screenshots, business cards | 5 MB | 10-20 seconds |
| **Video MMS** | Short videos from events | 5 MB | 20-60 seconds |

### What Gets Extracted

From any message type, CatchUp can extract:
- **Contact names**: People mentioned in your message
- **Tags/Interests**: Hobbies, skills, topics (e.g., "photography", "AI")
- **Locations**: Cities, addresses, places
- **Notes**: General context about the interaction
- **Relationship info**: How you know them, connection strength
- **Contact details**: Email, phone, social media (from business cards)

---

## Sending Text Messages (SMS)

### Basic Format

Simply text CatchUp with information about your contacts. Use natural language—no special formatting required.

### Examples

**Single Contact:**
```
Met Sarah at the conference. She works in AI and loves hiking. 
Lives in Seattle. Let's catch up monthly.
```

**Multiple Contacts:**
```
Dinner with Mike and Emma last night. Mike is into photography, 
Emma loves cooking. Both are interested in travel.
```

**Quick Update:**
```
John moved to Austin. New job at tech startup.
```

**Business Card Info:**
```
Met Lisa Chen at networking event. Email: lisa@example.com, 
works at Acme Corp as Product Manager. Interested in UX design.
```

### What Happens

1. **Instant Confirmation**: You receive a text reply within 5 seconds
2. **AI Processing**: Gemini AI extracts structured information
3. **Pending Review**: Enrichments appear in web app with "SMS" source tag
4. **Your Review**: You approve, edit, or reject each item

### Tips for Text Messages

✅ **Do:**
- Use full names when possible
- Include specific details (locations, interests, companies)
- Mention how you know them
- Include contact info if you have it

❌ **Avoid:**
- Vague references ("met someone today")
- Abbreviations that might be unclear
- Too many contacts in one message (limit to 3-4)

---

## Sending Voice Notes (Audio MMS)

### How to Send

1. **Open your messaging app**
2. **Start a new message** to CatchUp
3. **Tap the microphone icon** to record
4. **Speak naturally** about your contacts
5. **Send the voice note**

### What to Say

Speak as you would in a conversation. The system transcribes your audio and extracts information.

**Example voice notes:**

**After a Meeting:**
> "Just finished coffee with Sarah Johnson. She's the new VP of Engineering at TechCorp. Really passionate about AI and machine learning. She mentioned she's looking for hiking buddies in the Bay Area. We should definitely catch up quarterly."

**After an Event:**
> "Met three interesting people at the conference today. First, Mike Chen, he's a product designer at Startup Inc, loves photography. Then Emma Wilson, software engineer, into rock climbing. And David Lee, data scientist, interested in cooking. All three are in the tech industry."

**Quick Update:**
> "Ran into John at the gym. He's training for a marathon now and just got a new job at Google. Still living in Mountain View."

### Processing Time

- **Transcription**: 5-15 seconds
- **Entity Extraction**: 5-10 seconds
- **Total**: Usually under 30 seconds

You'll receive a confirmation text once processing is complete.

### Voice Note Tips

✅ **Do:**
- Speak clearly at a normal pace
- Mention full names
- Include context (where you met, what you discussed)
- Speak in a quiet environment for best transcription

❌ **Avoid:**
- Speaking too fast or too slow
- Recording in very noisy environments
- Using nicknames without context
- Recording very long messages (keep under 2 minutes)

### Audio Quality

For best results:
- **Quiet environment**: Reduces background noise
- **Clear speech**: Normal conversational pace
- **Good connection**: Ensure strong cellular signal
- **Phone position**: Hold phone normally, don't cover microphone

---

## Sending Photos (Image MMS)

### Use Cases

Perfect for:
- **Business cards**: Automatically extract contact details
- **Event photos**: Capture context from gatherings
- **Screenshots**: Share LinkedIn profiles or contact info
- **Whiteboard notes**: Capture brainstorming sessions with contacts

### How to Send

1. **Take a photo** or select from gallery
2. **Open messaging app**
3. **Attach the photo** to a message to CatchUp
4. **Add caption** (optional but recommended)
5. **Send**

### Examples

**Business Card:**
```
Photo: [Business card image]
Caption: "Met at tech conference today"
```

**Event Photo:**
```
Photo: [Group photo]
Caption: "Hiking trip with outdoor crew - Emma, David, Lisa"
```

**LinkedIn Screenshot:**
```
Photo: [LinkedIn profile screenshot]
Caption: "New connection from networking event"
```

### What Gets Extracted

From images, CatchUp can identify:
- **Text (OCR)**: Names, emails, phones, addresses, job titles
- **Visual context**: Event type, location, activities
- **People**: Faces (if you provide names in caption)
- **Objects**: Relevant items that indicate interests

### Image Tips

✅ **Do:**
- Take clear, well-lit photos
- Ensure text is readable (for business cards)
- Add captions with names and context
- Use landscape orientation for business cards

❌ **Avoid:**
- Blurry or dark photos
- Photos larger than 5MB (compress if needed)
- Multiple business cards in one photo (send separately)
- Photos without any context

### File Size Limit

- **Maximum**: 5 MB per image
- **Recommended**: 1-2 MB for faster processing
- **Compression**: Most phones automatically compress MMS images

---

## Sending Videos (Video MMS)

### Use Cases

Great for:
- **Event highlights**: Capture group gatherings
- **Conference talks**: Record speakers you met
- **Activity videos**: Share adventures with friends
- **Introduction videos**: When someone introduces themselves

### How to Send

1. **Record a video** or select from gallery
2. **Keep it short** (under 30 seconds recommended)
3. **Open messaging app**
4. **Attach the video** to a message to CatchUp
5. **Add caption** with names
6. **Send**

### Examples

**Group Event:**
```
Video: [10-second clip of group at restaurant]
Caption: "Birthday dinner with college friends - Sarah, Mike, Emma"
```

**Activity Video:**
```
Video: [15-second hiking clip]
Caption: "Weekend hike with outdoor crew"
```

**Conference Clip:**
```
Video: [20-second speaker clip]
Caption: "Great talk by Dr. Jane Smith on AI ethics"
```

### What Gets Extracted

From videos, CatchUp analyzes:
- **Visual content**: Activities, locations, events
- **Audio**: Spoken words and conversations
- **Context**: Event type, group dynamics
- **People**: Individuals mentioned in caption

### Video Tips

✅ **Do:**
- Keep videos short (10-30 seconds)
- Include audio if relevant
- Add detailed captions with names
- Ensure good lighting

❌ **Avoid:**
- Long videos (over 1 minute)
- Videos larger than 5MB
- Shaky or unclear footage
- Videos without captions

### File Size Limit

- **Maximum**: 5 MB per video
- **Recommended**: 2-3 MB
- **Duration**: 10-30 seconds typically fits within limit
- **Compression**: Use your phone's video compression if needed

---

## Reviewing Enrichments

All enrichments from SMS/MMS are marked as "pending" until you review them in the web app.

### Accessing the Review Interface

1. **Log into CatchUp** web app
2. **Navigate to** "Enrichments" or "Review"
3. **Filter by source**: Select "SMS" or "MMS" to see text/media enrichments

### Understanding the Interface

```
┌─────────────────────────────────────────────────┐
│ Enrichment Review                               │
├─────────────────────────────────────────────────┤
│ Source: SMS | From: +1-555-123-4567            │
│ Received: Jan 15, 2024 at 2:30 PM              │
│                                                  │
│ Original Message:                               │
│ "Had coffee with Sarah. She's into photography  │
│ and hiking. Lives in Seattle."                  │
├─────────────────────────────────────────────────┤
│ ▼ Sarah Johnson                                 │
│   ☑ Add Tag: "photography"              [Edit] │
│   ☑ Add Tag: "hiking"                   [Edit] │
│   ☑ Update Location: "Seattle, WA"      [Edit] │
│   ☑ Add Note: "Had coffee on Jan 15"    [Edit] │
├─────────────────────────────────────────────────┤
│ [Approve All] [Reject All] [Apply Selected]    │
└─────────────────────────────────────────────────┘
```

### Source Indicators

Each enrichment shows its source:
- **SMS**: Text message icon
- **MMS - Audio**: Microphone icon
- **MMS - Image**: Camera icon
- **MMS - Video**: Video camera icon

### Reviewing Items

For each enrichment:

1. **Check the contact**: Verify the AI identified the right person
2. **Review extracted data**: Check tags, locations, notes
3. **Edit if needed**: Click "Edit" to modify any value
4. **Accept or reject**: Check/uncheck items

### Actions

**Approve All:**
- Accepts all extracted items
- Applies changes to contacts immediately
- Marks enrichment as "approved"

**Reject All:**
- Discards all extracted items
- No changes made to contacts
- Marks enrichment as "rejected"

**Apply Selected:**
- Applies only checked items
- Gives you granular control
- Marks enrichment as "partially approved"

### Editing Values

1. Click **"Edit"** next to any item
2. Modify the value
3. Press Enter or click outside to save
4. The edited value will be applied when you approve

**Example edits:**
- Change "photography" to "landscape photography"
- Update "Seattle" to "Seattle, Washington"
- Modify note text for clarity

---

## Rate Limits and Restrictions

To prevent abuse and control costs, CatchUp implements the following limits:

### Message Rate Limit

- **Limit**: 20 messages per hour per phone number
- **Applies to**: All message types (SMS and MMS)
- **Reset**: Every hour on the hour
- **Notification**: You'll receive a text when limit is reached

**Example:**
```
You've reached the limit of 20 messages per hour. 
You can send more messages after 3:00 PM.
```

### File Size Limits

| Type | Maximum Size |
|------|--------------|
| Audio | 5 MB |
| Image | 5 MB |
| Video | 5 MB |

**If you exceed the limit:**
```
File size exceeds 5MB limit. Please send a smaller file.
```

### Message Length

- **SMS**: No hard limit, but longer messages cost more
- **Recommended**: Keep under 500 characters for best results
- **Multiple segments**: Messages over 160 characters are split

### Processing Limits

- **Concurrent processing**: 3 messages at a time per user
- **Queue**: Additional messages are queued
- **Timeout**: Processing times out after 2 minutes

### Why These Limits?

- **Cost control**: AI processing and Twilio have per-message costs
- **Quality**: Prevents spam and ensures thoughtful enrichments
- **Performance**: Maintains system responsiveness

### Need Higher Limits?

Contact support if you regularly hit these limits. We can discuss:
- Custom rate limits for power users
- Bulk import options
- Alternative enrichment methods

---

## Privacy and Security

### Your Data is Protected

**Phone Number Security:**
- Stored encrypted (AES-256) in database
- Never shared with third parties
- Can be unlinked anytime

**Message Content:**
- Processed in real-time
- Original messages not stored permanently
- Only extracted metadata is retained

**Media Files:**
- Downloaded temporarily for processing
- Deleted immediately after extraction
- Not stored in CatchUp servers

### What Gets Stored

**Stored:**
- ✅ Extracted enrichments (tags, notes, locations)
- ✅ Source metadata (SMS/MMS, timestamp)
- ✅ Your phone number (encrypted)
- ✅ Processing status

**Not Stored:**
- ❌ Original message text (after processing)
- ❌ Audio recordings
- ❌ Photos or videos
- ❌ Twilio message IDs (after 30 days)

### Webhook Security

All messages from Twilio are verified:
- **Signature validation**: Every webhook is authenticated
- **HTTPS only**: All communication is encrypted
- **Audit logging**: Security events are logged
- **Rate limiting**: Prevents abuse

### Account Deletion

When you delete your CatchUp account:
1. Phone number is unlinked and deleted
2. All enrichments from SMS/MMS are deleted
3. Processing history is removed
4. Temporary files are purged

### Third-Party Services

**Twilio:**
- Handles SMS/MMS delivery
- Messages are encrypted in transit
- Twilio's privacy policy applies
- Messages deleted after delivery

**Google Cloud AI:**
- Processes audio, images, and video
- No data retention by Google
- Processed in real-time
- Google's privacy policy applies

### Your Control

**You can:**
- View all enrichments before applying
- Delete any enrichment anytime
- Unlink your phone number
- Export your data
- Delete your account

**You cannot:**
- Recover deleted enrichments
- Retrieve original messages after processing
- Access other users' data

---

## Troubleshooting

### Common Issues

#### "Phone number not verified"

**Problem**: You try to send a message but get an error.

**Solution:**
1. Check if your phone number is linked in Settings
2. Verify you completed the verification process
3. Try unlinking and re-linking your number
4. Ensure you're texting from the verified number

#### "Verification code not received"

**Problem**: You don't receive the 6-digit code.

**Solutions:**
1. Wait 1-2 minutes (SMS can be delayed)
2. Check your phone number is correct
3. Ensure you have cellular signal
4. Try requesting a new code
5. Check spam/blocked messages

#### "Rate limit exceeded"

**Problem**: You receive a message saying you've hit the limit.

**Solution:**
- Wait until the next hour
- Current limit: 20 messages per hour
- Check the reset time in the error message
- Plan your enrichments accordingly

#### "File too large"

**Problem**: Your media file is rejected.

**Solutions:**
1. Compress the file before sending
2. Use your phone's built-in compression
3. Trim videos to be shorter
4. Reduce image resolution
5. Maximum size: 5 MB

#### "No enrichments extracted"

**Problem**: Message processed but no enrichments created.

**Possible causes:**
- Message didn't mention any contacts
- Names weren't recognized
- Content was too vague

**Solutions:**
1. Use full names of contacts
2. Be more specific about details
3. Add context about who you're talking about
4. Check the original message in review interface

#### "Wrong contact identified"

**Problem**: AI matched the wrong person.

**Solutions:**
1. Use full names instead of first names only
2. Add context: "my friend John" or "John from work"
3. Manually edit the enrichment in review interface
4. Update contact names to be more distinctive

#### "Processing taking too long"

**Problem**: Haven't received confirmation after several minutes.

**Solutions:**
1. Check your internet connection
2. Wait up to 2 minutes for complex media
3. Check the web app for pending enrichments
4. Try sending a simple text to test
5. Contact support if issue persists

#### "Invalid signature error"

**Problem**: Technical error about webhook signature.

**This is a system issue:**
- Contact support immediately
- Include the error message
- Note the time it occurred
- This indicates a configuration problem

---

## Tips and Best Practices

### Maximizing Accuracy

**Be Specific:**
```
✅ Good: "Met Sarah Johnson at tech conference. She's a product 
manager at Acme Corp, interested in AI and hiking."

❌ Vague: "Met someone today. They like stuff."
```

**Use Full Names:**
```
✅ Good: "Coffee with John Smith and Emma Wilson"
❌ Unclear: "Coffee with John and Emma"
```

**Add Context:**
```
✅ Good: "My college friend Mike is moving to Austin"
❌ Unclear: "Mike is moving"
```

### Organizing Your Enrichments

**Regular Review:**
- Check pending enrichments daily
- Don't let them pile up
- Review while context is fresh

**Consistent Tagging:**
- Use standard tag names
- "photography" not "photos" or "taking pictures"
- Keep tags short (1-3 words)

**Meaningful Notes:**
- Capture specific details
- Include dates and locations
- Note follow-up actions

### Efficient Workflows

**After Events:**
1. Send quick text with names and highlights
2. Follow up with voice note for details
3. Share photos if relevant
4. Review enrichments within 24 hours

**Business Cards:**
1. Photo the card immediately
2. Add caption with context
3. Review and approve same day
4. Follow up with the contact

**Voice Notes:**
1. Record right after interactions
2. Speak naturally, don't rush
3. Include all relevant details
4. Review transcription for accuracy

### Combining with Other Features

**Voice Notes + SMS:**
- Use SMS for quick updates
- Use voice notes for detailed context
- Both appear in same review interface

**Photos + Text:**
- Send photo of business card
- Follow with text adding context
- AI combines both sources

**Multiple Messages:**
- Break complex updates into multiple messages
- One contact per message for clarity
- Use voice notes for longer updates

### Cost Awareness

**Message Costs:**
- SMS: ~$0.01 per message
- MMS: ~$0.02 per message
- Stay within rate limits to control costs

**Optimization:**
- Combine updates when possible
- Use text for simple updates
- Reserve media for when it adds value
- Review before sending to avoid corrections

---

## Keyboard Shortcuts

When reviewing enrichments in the web app:

| Action | Shortcut |
|--------|----------|
| Approve All | `Ctrl/Cmd + A` |
| Apply Selected | `Ctrl/Cmd + Enter` |
| Reject All | `Ctrl/Cmd + R` |
| Next Enrichment | `→` or `J` |
| Previous Enrichment | `←` or `K` |
| Edit Item | `E` |
| Toggle Selection | `Space` |

---

## Frequently Asked Questions

### Can I use this feature internationally?

Yes, but:
- You need a phone number in a supported country
- International SMS rates apply
- Some countries have restrictions on MMS

### What if I don't have the contact in CatchUp yet?

The AI will create a new contact suggestion. You can:
- Approve to create the contact
- Edit details before creating
- Reject if it's not someone you want to track

### Can I send messages from multiple phones?

No, only one phone number can be linked per CatchUp account. To change:
1. Unlink current number
2. Link new number
3. Verify new number

### What happens if I send a message with no contact names?

You'll receive a reply asking you to specify who the message is about. You can:
- Reply with the contact name
- Manually assign in the web app
- Reject the enrichment

### Can I edit enrichments after applying them?

Yes! Applied enrichments can be edited:
- Go to the contact's profile
- Edit tags, notes, or other fields
- Changes are saved immediately

### How long are enrichments kept as "pending"?

- Indefinitely until you review them
- No automatic expiration
- You can review anytime

### Can I bulk approve enrichments?

Yes:
- Use "Approve All" for all items
- Use filters to select specific sources
- Use keyboard shortcuts for efficiency

### What if the AI makes a mistake?

- Edit the enrichment before applying
- Reject incorrect items
- Provide feedback to improve accuracy

### Can I disable this feature?

Yes:
1. Go to Settings > Phone Number
2. Click "Unlink Phone Number"
3. Confirm the action
4. You can re-enable anytime

---

## Getting Help

### Support Resources

- **User Guide**: This document
- **Setup Guide**: [Twilio SMS/MMS Setup](./TWILIO_SMS_MMS_SETUP.md)
- **API Documentation**: [API Reference](./API.md)
- **Security**: [Security Policy](../SECURITY.md)

### Contact Support

If you need help:

**Email**: support@catchup.app

**Include:**
- Description of the issue
- Error messages (if any)
- Phone number (last 4 digits only)
- Time the issue occurred
- Steps to reproduce

**Response Time:**
- Critical issues: Within 4 hours
- General inquiries: Within 24 hours

---

## What's Next?

### Planned Features

- **WhatsApp integration**: Send enrichments via WhatsApp
- **Multi-language support**: Process messages in any language
- **Smart suggestions**: AI suggests which contact you mean
- **Voice commands**: "Add tag photography to Sarah"
- **Batch operations**: Multiple enrichments in one message
- **Custom extraction rules**: Define what to extract
- **Analytics**: Track your enrichment patterns

### Feedback

We'd love to hear from you:
- What features would you like?
- How can we improve accuracy?
- What documentation is missing?
- Share your use cases

**Send feedback**: feedback@catchup.app

---

## Summary

SMS/MMS Enrichment provides:
- ✅ **Convenient capture** via text, voice, photos, and videos
- ✅ **AI-powered extraction** of contacts, tags, and context
- ✅ **Review before applying** for full control
- ✅ **Secure processing** with encryption and privacy protection
- ✅ **Flexible workflows** for any situation

**Remember:** Text CatchUp anytime to capture relationship context. Review and approve enrichments in the web app. Keep your contacts rich with information!

---

*Last updated: January 2024*
*Version: 1.0*
