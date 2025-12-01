# SMS/MMS Enrichment Documentation

Welcome to the SMS/MMS Enrichment feature documentation for CatchUp.

## Overview

The SMS/MMS Enrichment feature allows you to capture contact information on-the-go by texting CatchUp. Send text messages, voice notes, photos, or videos to your dedicated phone number, and AI automatically extracts relevant information about your contacts.

## Documentation Structure

### For Users

#### 📖 [User Guide](./SMS_MMS_ENRICHMENT_USER_GUIDE.md)
Comprehensive guide covering all aspects of using SMS/MMS enrichment:
- Getting started and phone number verification
- Sending different types of messages (SMS, voice, photos, videos)
- Reviewing and managing enrichments
- Privacy and security information
- Tips and best practices

**Start here if you're new to the feature.**

#### ⚡ [Quick Reference](./SMS_MMS_ENRICHMENT_QUICK_REFERENCE.md)
Quick lookup guide for common tasks:
- Phone number setup steps
- Message format examples
- Limits and restrictions
- Common error messages
- Keyboard shortcuts

**Use this for quick answers to common questions.**

#### 🔧 [Troubleshooting Guide](./SMS_MMS_ENRICHMENT_TROUBLESHOOTING.md)
Detailed solutions for common issues:
- Phone verification problems
- Message sending issues
- Processing errors
- Rate limiting
- Media file problems
- Extraction accuracy issues

**Consult this when you encounter problems.**

### For Developers

#### 🛠️ [Setup Guide](./TWILIO_SMS_MMS_SETUP.md)
Technical setup instructions:
- Twilio account configuration
- Environment variables
- Webhook setup (development and production)
- Testing procedures
- Security best practices

**Essential for developers setting up the feature.**

#### 📚 [API Documentation](./API.md)
API reference for SMS/MMS endpoints:
- Phone number management endpoints
- Webhook handling
- Enrichment review endpoints
- Authentication requirements

**Reference for API integration.**

## Quick Start

### For Users

1. **Link Your Phone Number**
   - Go to Settings > Phone Number
   - Enter your phone number
   - Verify with 6-digit code

2. **Send Your First Message**
   ```
   Had coffee with Sarah. She's into photography and hiking.
   ```

3. **Review in Web App**
   - Check pending enrichments
   - Approve, edit, or reject items

### For Developers

1. **Set Up Twilio**
   - Create Twilio account
   - Get phone number
   - Configure webhook

2. **Configure Environment**
   ```bash
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+15555556789
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

4. **Test Integration**
   - Send test SMS
   - Verify webhook receipt
   - Check enrichment creation

## Feature Capabilities

### Supported Message Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| **SMS** | Plain text messages | Quick updates, notes, contact info |
| **Audio MMS** | Voice notes | Detailed context, hands-free capture |
| **Image MMS** | Photos | Business cards, event photos |
| **Video MMS** | Short videos | Group events, visual context |

### What Gets Extracted

- ✅ Contact names and identification
- ✅ Tags and interests
- ✅ Locations and addresses
- ✅ Notes and context
- ✅ Contact details (email, phone, social)
- ✅ Relationship information
- ✅ Frequency preferences

### AI Processing

- **Text Analysis**: Google Gemini API
- **Audio Transcription**: Google Speech-to-Text API
- **Image Analysis**: Google Gemini Vision API
- **Video Analysis**: Google Gemini Multimodal API

## Limits and Restrictions

| Item | Limit | Reason |
|------|-------|--------|
| Messages per hour | 20 | Cost control, abuse prevention |
| Audio file size | 5 MB | Processing efficiency |
| Image file size | 5 MB | Processing efficiency |
| Video file size | 5 MB | Processing efficiency |
| Verification code expiry | 10 minutes | Security |
| Processing timeout | 2 minutes | Resource management |

## Security and Privacy

### Data Protection

- **Phone numbers**: Encrypted at rest (AES-256)
- **Messages**: Processed in real-time, not stored permanently
- **Media files**: Deleted immediately after processing
- **Enrichments**: Only extracted metadata retained

### Authentication

- **Webhook validation**: Twilio signature verification
- **Phone verification**: 6-digit code via SMS
- **User authorization**: JWT tokens for API access

### Privacy Controls

- Review all enrichments before applying
- Delete enrichments anytime
- Unlink phone number anytime
- Export your data
- Account deletion removes all data

## Common Use Cases

### Business Networking

**Scenario**: Met someone at a conference

**Solution**: Photo their business card + text message with context
```
Photo: [business card]
Text: Met John at TechConf 2024. Discussed AI projects.
```

### Social Gatherings

**Scenario**: Dinner with friends

**Solution**: Voice note after the event
```
Voice: "Had dinner with Sarah, Mike, and Emma. Sarah is 
into photography now, Mike loves hiking, Emma is learning 
to cook. All interested in travel."
```

### Quick Updates

**Scenario**: Ran into someone

**Solution**: Quick text message
```
Text: Saw John at the gym. He's training for a marathon 
and just moved to Austin.
```

### Hands-Free Capture

**Scenario**: Driving home after meeting

**Solution**: Voice note while driving
```
Voice: "Just left coffee with Lisa. She's the new product 
manager at Acme Corp. Really interested in UX design and 
user research. We should catch up monthly."
```

## Integration with Other Features

### Voice Notes Feature

- SMS/MMS enrichments complement voice notes
- Both appear in unified review interface
- Same AI processing pipeline
- Consistent tagging and extraction

### Contact Management

- Enrichments update existing contacts
- Can create new contact suggestions
- Integrates with groups and tags
- Maintains contact history

### Suggestion Engine

- Enrichments improve suggestion quality
- More context = better matching
- Frequency preferences respected
- Group suggestions enhanced

## Roadmap

### Planned Features

- **WhatsApp Integration**: Send enrichments via WhatsApp
- **Multi-language Support**: Process messages in any language
- **Smart Suggestions**: AI suggests which contact you mean
- **Voice Commands**: Structured voice input
- **Batch Operations**: Multiple enrichments in one message
- **Custom Extraction Rules**: Define what to extract
- **Analytics Dashboard**: Track enrichment patterns

### Coming Soon

- Profile photo extraction from business cards
- Calendar event creation from messages
- Automatic follow-up reminders
- Integration with email
- Mobile app with native recording

## Support and Resources

### Getting Help

**Documentation:**
- [User Guide](./SMS_MMS_ENRICHMENT_USER_GUIDE.md) - Complete feature documentation
- [Quick Reference](./SMS_MMS_ENRICHMENT_QUICK_REFERENCE.md) - Quick answers
- [Troubleshooting](./SMS_MMS_ENRICHMENT_TROUBLESHOOTING.md) - Problem solving

**Support:**
- Email: support@catchup.app
- Status Page: status.catchup.app
- Community Forum: community.catchup.app

**Response Times:**
- Critical issues: 4 hours
- High priority: 24 hours
- General inquiries: 48 hours

### Additional Resources

- [API Documentation](./API.md)
- [Security Policy](../SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Google Cloud Setup](../GOOGLE_CLOUD_SETUP_GUIDE.md)

## Feedback and Contributions

We welcome your feedback and suggestions!

**Share Feedback:**
- Email: feedback@catchup.app
- Feature requests: Submit via feedback form
- Bug reports: support@catchup.app

**What to Include:**
- What you like
- What could be better
- Specific use cases
- Feature ideas

## Version History

### Version 1.0 (Current)

**Features:**
- Phone number verification
- SMS enrichment processing
- Audio MMS (voice notes)
- Image MMS (photos, business cards)
- Video MMS (event videos)
- AI-powered extraction
- Web-based review interface
- Rate limiting
- Security and encryption

**Known Limitations:**
- One phone number per account
- 20 messages per hour limit
- 5 MB file size limit
- English language only (multi-language coming soon)

## License

Copyright © 2024 CatchUp. All rights reserved.

See [LICENSE](../LICENSE) for details.

---

## Quick Links

### User Documentation
- [User Guide](./SMS_MMS_ENRICHMENT_USER_GUIDE.md)
- [Quick Reference](./SMS_MMS_ENRICHMENT_QUICK_REFERENCE.md)
- [Troubleshooting](./SMS_MMS_ENRICHMENT_TROUBLESHOOTING.md)

### Developer Documentation
- [Setup Guide](./TWILIO_SMS_MMS_SETUP.md)
- [API Documentation](./API.md)
- [Security Policy](../SECURITY.md)

### Related Features
- [Voice Notes](./VOICE_NOTES_USER_GUIDE.md)
- [Google Contacts](./GOOGLE_CONTACTS_USER_GUIDE.md)
- [Contact Onboarding](./CONTACT_ONBOARDING_USER_GUIDE.md)

---

*Last updated: January 2024*
*Version: 1.0*
