# SMS/MMS Enrichment - Quick Reference

Quick lookup guide for common tasks and information.

---

## Phone Number Setup

### Link Your Number
1. Settings > Phone Number
2. Enter phone number with country code
3. Click "Send Verification Code"
4. Enter 6-digit code
5. Click "Verify"

### Unlink Your Number
1. Settings > Phone Number
2. Click "Unlink Phone Number"
3. Confirm action

---

## Message Formats

### Text Message (SMS)
```
Had coffee with Sarah Johnson. She's into photography 
and hiking. Lives in Seattle.
```

### Voice Note (Audio MMS)
Record and send audio message with natural speech about contacts.

### Photo (Image MMS)
Attach photo + optional caption with names and context.

### Video (Video MMS)
Attach short video + caption with names.

---

## Limits & Restrictions

| Item | Limit |
|------|-------|
| Messages per hour | 20 |
| Audio file size | 5 MB |
| Image file size | 5 MB |
| Video file size | 5 MB |
| Verification code expiry | 10 minutes |
| Processing timeout | 2 minutes |

---

## What Gets Extracted

- ✅ Contact names
- ✅ Tags/interests
- ✅ Locations
- ✅ Notes/context
- ✅ Contact details (from business cards)
- ✅ Relationship info

---

## Review Actions

### In Web App
1. Navigate to "Enrichments"
2. Filter by "SMS" or "MMS"
3. Review each item
4. Edit if needed
5. Approve, reject, or apply selected

### Keyboard Shortcuts
- `Ctrl/Cmd + A` - Approve All
- `Ctrl/Cmd + Enter` - Apply Selected
- `Ctrl/Cmd + R` - Reject All
- `→` or `J` - Next
- `←` or `K` - Previous
- `E` - Edit
- `Space` - Toggle

---

## Common Error Messages

### "Phone number not verified"
→ Link your phone number in Settings

### "Rate limit exceeded"
→ Wait until next hour (20 messages/hour limit)

### "File too large"
→ Compress file to under 5 MB

### "Verification code expired"
→ Request new code (expires after 10 minutes)

---

## Best Practices

### For Accuracy
- Use full names
- Be specific with details
- Add context about relationships
- Speak clearly in voice notes

### For Efficiency
- Review enrichments daily
- Use consistent tag names
- Combine related updates
- Add captions to media

### For Privacy
- Only send from verified number
- Review before approving
- Delete unwanted enrichments
- Unlink number when not in use

---

## Message Examples

### Single Contact
```
Met John Smith at tech conference. Product manager at 
Acme Corp. Interested in AI and rock climbing. Lives 
in Boulder. Let's catch up monthly.
```

### Multiple Contacts
```
Dinner with Sarah Chen and Mike Johnson. Sarah is into 
photography, Mike loves hiking. Both work in tech.
```

### Business Card
```
Photo: [business card]
Caption: Met Lisa at networking event
```

### Quick Update
```
John moved to Austin. New job at Google.
```

---

## Support

**Email**: support@catchup.app

**Include in support requests:**
- Description of issue
- Error messages
- Phone number (last 4 digits)
- Time of occurrence

---

## Quick Links

- [Full User Guide](./SMS_MMS_ENRICHMENT_USER_GUIDE.md)
- [Setup Guide](./TWILIO_SMS_MMS_SETUP.md)
- [Troubleshooting Guide](./SMS_MMS_ENRICHMENT_TROUBLESHOOTING.md)
- [API Documentation](./API.md)

---

*Version 1.0 - January 2024*
