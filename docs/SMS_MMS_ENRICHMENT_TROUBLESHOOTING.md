# SMS/MMS Enrichment - Troubleshooting Guide

Comprehensive troubleshooting guide for common issues with SMS/MMS enrichment.

---

## Table of Contents

1. [Phone Number Verification Issues](#phone-number-verification-issues)
2. [Message Sending Issues](#message-sending-issues)
3. [Processing Issues](#processing-issues)
4. [Rate Limiting Issues](#rate-limiting-issues)
5. [Media File Issues](#media-file-issues)
6. [Extraction Accuracy Issues](#extraction-accuracy-issues)
7. [Review Interface Issues](#review-interface-issues)
8. [System Errors](#system-errors)

---

## Phone Number Verification Issues

### Issue: Verification Code Not Received

**Symptoms:**
- Requested verification code but didn't receive SMS
- Waiting more than 5 minutes

**Possible Causes:**
- Phone number entered incorrectly
- SMS delivery delay
- Phone carrier blocking automated messages
- Twilio service issue

**Solutions:**

1. **Check Phone Number Format**
   - Must include country code: `+15551234567`
   - No spaces, dashes, or parentheses
   - Verify number is correct

2. **Wait Longer**
   - SMS can take 1-5 minutes
   - Check spam/blocked messages folder
   - Restart your phone

3. **Request New Code**
   - Click "Resend Code"
   - Previous code becomes invalid
   - New code expires in 10 minutes

4. **Check Carrier Settings**
   - Ensure SMS is enabled
   - Check if short codes are blocked
   - Contact carrier if needed

5. **Try Different Number**
   - Use alternative phone number
   - Some carriers have restrictions

**Still Not Working?**
- Contact support with phone number (last 4 digits only)
- Include carrier name and country

---

### Issue: "Invalid Verification Code"

**Symptoms:**
- Entered code but got error message
- Code appears correct

**Possible Causes:**
- Code expired (10-minute limit)
- Typo in code entry
- Using old code after requesting new one
- System timing issue

**Solutions:**

1. **Check Code Carefully**
   - Verify all 6 digits
   - No spaces or dashes
   - Case doesn't matter (all numeric)

2. **Request Fresh Code**
   - Click "Resend Code"
   - Use the newest code only
   - Enter within 10 minutes

3. **Clear Browser Cache**
   - Clear cookies and cache
   - Refresh page
   - Try again

4. **Try Different Browser**
   - Use Chrome, Firefox, or Safari
   - Ensure JavaScript is enabled

---

### Issue: "Phone Number Already Linked"

**Symptoms:**
- Error when trying to link number
- Number is linked to different account

**Possible Causes:**
- Number previously linked to another account
- Number linked to your account already
- Database inconsistency

**Solutions:**

1. **Check Current Account**
   - Go to Settings > Phone Number
   - See if number is already linked
   - Unlink if you want to re-link

2. **Unlink from Other Account**
   - Log into other account
   - Unlink the phone number
   - Return to current account and link

3. **Contact Support**
   - If you don't have access to other account
   - Provide proof of phone ownership
   - Support can manually unlink

---

## Message Sending Issues

### Issue: "Phone Number Not Verified"

**Symptoms:**
- Sent message but got error reply
- Message not processed

**Possible Causes:**
- Phone number not linked to account
- Verification incomplete
- Sending from different number

**Solutions:**

1. **Verify Number is Linked**
   - Log into web app
   - Check Settings > Phone Number
   - Complete verification if needed

2. **Check Sending Number**
   - Ensure sending from verified number
   - Can't send from different phone
   - Only one number per account

3. **Re-verify if Needed**
   - Unlink and re-link number
   - Complete verification process
   - Try sending again

---

### Issue: Messages Not Being Received

**Symptoms:**
- Sent message but no confirmation
- No enrichments appearing in web app

**Possible Causes:**
- Wrong CatchUp number
- Twilio service issue
- Webhook configuration problem
- Network connectivity issue

**Solutions:**

1. **Verify CatchUp Number**
   - Check Settings for correct number
   - Ensure no typos in saved contact
   - Include country code

2. **Check Message Status**
   - Wait 1-2 minutes
   - Check web app for pending enrichments
   - Look for error messages

3. **Test with Simple Message**
   ```
   Test message
   ```
   - Should receive confirmation
   - If not, system issue

4. **Check Twilio Status**
   - Visit status.twilio.com
   - Check for service disruptions
   - Wait and retry if issues

5. **Contact Support**
   - Include message timestamp
   - Provide phone number (last 4 digits)
   - Describe what happened

---

### Issue: Confirmation Received But No Enrichments

**Symptoms:**
- Got "Processing your enrichment" confirmation
- No enrichments in web app

**Possible Causes:**
- Processing still in progress
- No contacts identified
- Extraction failed
- Content too vague

**Solutions:**

1. **Wait for Processing**
   - Text: 5-10 seconds
   - Voice: 30-60 seconds
   - Image: 20-40 seconds
   - Video: 60-120 seconds

2. **Check Pending Enrichments**
   - Refresh web app
   - Look in "Pending" section
   - Filter by date

3. **Review Message Content**
   - Did you mention contact names?
   - Was content specific enough?
   - Try more detailed message

4. **Check Error Logs**
   - Look for error notifications
   - Check email for failure notices
   - Review system status

---

## Processing Issues

### Issue: "Processing Failed"

**Symptoms:**
- Received error message via SMS
- Enrichment marked as failed in web app

**Possible Causes:**
- AI service temporarily unavailable
- Media file corrupted
- Unsupported format
- Processing timeout

**Solutions:**

1. **Retry the Message**
   - Wait 5 minutes
   - Send message again
   - Use simpler format if possible

2. **Check File Format**
   - Audio: MP3, M4A, OGG, WAV
   - Image: JPG, PNG, GIF
   - Video: MP4, MOV, 3GP
   - Convert if unsupported

3. **Simplify Content**
   - Break into smaller messages
   - Use text instead of media
   - Reduce file size

4. **Check System Status**
   - Visit status page
   - Wait if services are down
   - Retry when resolved

---

### Issue: Poor Transcription Quality

**Symptoms:**
- Voice note transcribed incorrectly
- Many words wrong or missing

**Possible Causes:**
- Background noise
- Speaking too fast/slow
- Poor audio quality
- Accent or dialect issues

**Solutions:**

1. **Improve Recording Environment**
   - Find quiet location
   - Reduce background noise
   - Close windows, turn off fans

2. **Improve Speaking**
   - Speak clearly and naturally
   - Normal conversational pace
   - Enunciate important names

3. **Better Microphone Position**
   - Hold phone normally
   - Don't cover microphone
   - Maintain consistent distance

4. **Check Audio Quality**
   - Test with phone's voice recorder
   - Ensure microphone works properly
   - Consider external microphone

5. **Edit Transcription**
   - Review in web app
   - Edit incorrect words
   - Correct before applying

---

### Issue: Wrong Contact Identified

**Symptoms:**
- AI matched wrong person
- Enrichment assigned to incorrect contact

**Possible Causes:**
- Multiple contacts with similar names
- Ambiguous reference
- Insufficient context
- AI confusion

**Solutions:**

1. **Use Full Names**
   ```
   ✅ Good: "Met Sarah Johnson today"
   ❌ Unclear: "Met Sarah today"
   ```

2. **Add Context**
   ```
   ✅ Good: "My college friend John Smith"
   ❌ Unclear: "John"
   ```

3. **Manually Correct**
   - Edit enrichment in web app
   - Reassign to correct contact
   - Apply changes

4. **Update Contact Names**
   - Make names more distinctive
   - Add middle names or initials
   - Use nicknames in notes

---

### Issue: No Contacts Extracted

**Symptoms:**
- Message processed successfully
- No contacts identified
- Enrichment has no contact assignment

**Possible Causes:**
- No names mentioned
- Names not in contact list
- Vague references
- Pronouns instead of names

**Solutions:**

1. **Mention Names Explicitly**
   ```
   ✅ Good: "Had coffee with John Smith"
   ❌ Vague: "Had coffee with him"
   ```

2. **Add Contacts First**
   - Create contact in CatchUp
   - Then send enrichment message
   - AI can match existing contacts

3. **Manually Assign**
   - Review enrichment in web app
   - Use contact selector
   - Assign to correct person

4. **Provide More Context**
   - Include full names
   - Mention relationships
   - Add identifying details

---

## Rate Limiting Issues

### Issue: "Rate Limit Exceeded"

**Symptoms:**
- Received error message
- Message rejected
- Can't send more messages

**Cause:**
- Sent more than 20 messages in one hour

**Solutions:**

1. **Wait for Reset**
   - Limit resets every hour
   - Check error message for reset time
   - Plan messages accordingly

2. **Batch Your Updates**
   - Combine multiple updates in one message
   - Use voice notes for longer content
   - Be more efficient

3. **Request Limit Increase**
   - Contact support
   - Explain your use case
   - May qualify for higher limit

**Example Error:**
```
You've reached the limit of 20 messages per hour. 
You can send more messages after 3:00 PM.
```

---

### Issue: Rate Limit Seems Wrong

**Symptoms:**
- Hit limit with fewer than 20 messages
- Counter seems incorrect

**Possible Causes:**
- Messages from previous hour counted
- Failed messages still count
- System clock issue

**Solutions:**

1. **Check Message Count**
   - Review sent messages
   - Include failed attempts
   - Count from last hour

2. **Wait for Full Reset**
   - Wait until top of next hour
   - Counter resets completely
   - Try again

3. **Contact Support**
   - If consistently wrong
   - Provide message timestamps
   - Request investigation

---

## Media File Issues

### Issue: "File Too Large"

**Symptoms:**
- Media rejected
- Error about file size
- 5MB limit exceeded

**Solutions:**

1. **Compress the File**
   
   **For Images:**
   - Use phone's built-in compression
   - Reduce resolution
   - Convert to JPG (smaller than PNG)
   - Use online compression tools

   **For Audio:**
   - Trim unnecessary parts
   - Reduce bitrate
   - Convert to MP3
   - Keep under 2 minutes

   **For Video:**
   - Trim to 10-30 seconds
   - Reduce resolution (720p instead of 1080p)
   - Use phone's video compression
   - Convert to MP4

2. **Check File Size Before Sending**
   - View file properties
   - Aim for 2-3 MB
   - Leave buffer below 5 MB limit

3. **Alternative Methods**
   - Use text description instead
   - Send multiple shorter clips
   - Use voice note instead of video

---

### Issue: Media Not Processing

**Symptoms:**
- Media sent successfully
- No enrichments extracted
- Processing seems stuck

**Possible Causes:**
- Unsupported format
- Corrupted file
- Processing timeout
- AI service issue

**Solutions:**

1. **Check Format Support**
   
   **Supported:**
   - Audio: MP3, M4A, OGG, WAV
   - Image: JPG, PNG, GIF
   - Video: MP4, MOV, 3GP

   **Not Supported:**
   - Audio: FLAC, WMA
   - Image: BMP, TIFF, RAW
   - Video: AVI, WMV, MKV

2. **Convert Format**
   - Use online converter
   - Convert to supported format
   - Resend

3. **Test File**
   - Open file on your device
   - Ensure it's not corrupted
   - Try different file

4. **Wait and Retry**
   - Processing can take up to 2 minutes
   - Wait before retrying
   - Check web app for results

---

### Issue: Poor Image Quality/OCR Errors

**Symptoms:**
- Business card text not extracted correctly
- Image analysis inaccurate
- Missing information

**Possible Causes:**
- Blurry photo
- Poor lighting
- Text too small
- Angle too extreme

**Solutions:**

1. **Improve Photo Quality**
   - Use good lighting
   - Hold phone steady
   - Focus on text
   - Take multiple shots

2. **Optimal Business Card Photos**
   - Lay card flat
   - Use landscape orientation
   - Fill frame with card
   - Avoid shadows and glare

3. **Retake Photo**
   - Better lighting conditions
   - Clearer focus
   - Straight-on angle
   - Higher resolution

4. **Manual Entry**
   - Type information as text message
   - More reliable than poor photo
   - Faster processing

---

## Extraction Accuracy Issues

### Issue: Incorrect Tags Extracted

**Symptoms:**
- Tags don't match what you said
- Irrelevant tags added
- Missing important tags

**Possible Causes:**
- AI misinterpretation
- Ambiguous language
- Context missing
- Homonyms or similar words

**Solutions:**

1. **Be More Specific**
   ```
   ✅ Good: "She's interested in landscape photography"
   ❌ Vague: "She likes photos"
   ```

2. **Review Before Applying**
   - Check all extracted tags
   - Edit incorrect ones
   - Remove irrelevant tags

3. **Use Consistent Language**
   - "rock climbing" not "climbing rocks"
   - "machine learning" not "ML"
   - Standard terminology

4. **Provide Feedback**
   - Report consistent errors
   - Helps improve AI
   - Include examples

---

### Issue: Location Not Extracted

**Symptoms:**
- Mentioned location but not extracted
- Wrong location identified

**Possible Causes:**
- Ambiguous location name
- Uncommon place
- Typo or misspelling
- Context unclear

**Solutions:**

1. **Use Full Location Names**
   ```
   ✅ Good: "Seattle, Washington"
   ❌ Unclear: "Seattle" (could be Seattle, WA or Seattle, TX)
   ```

2. **Include Context**
   ```
   ✅ Good: "Moved to Austin, Texas"
   ❌ Unclear: "Moved to Austin"
   ```

3. **Manually Add Location**
   - Edit enrichment in web app
   - Add location field
   - Use standard format

4. **Check Spelling**
   - Verify location name
   - Use common spellings
   - Include state/country

---

### Issue: Notes Too Generic

**Symptoms:**
- Extracted notes lack detail
- Important context missing
- Notes don't capture essence

**Possible Causes:**
- Vague message content
- Too much information
- Unclear structure
- AI summarization

**Solutions:**

1. **Be More Specific**
   ```
   ✅ Good: "Discussed his new AI project at Google. 
   He's working on natural language processing for 
   search. Very excited about the team."
   
   ❌ Vague: "Talked about work stuff"
   ```

2. **Structure Your Message**
   - One topic per sentence
   - Clear subject-verb-object
   - Logical flow

3. **Edit Notes**
   - Review extracted notes
   - Add missing details
   - Clarify vague points

4. **Use Voice Notes for Detail**
   - Speak naturally
   - Include all context
   - More detail than text

---

## Review Interface Issues

### Issue: Enrichments Not Appearing

**Symptoms:**
- Sent message successfully
- No enrichments in review interface

**Possible Causes:**
- Wrong filter applied
- Processing still in progress
- Browser cache issue
- Extraction failed

**Solutions:**

1. **Check Filters**
   - Remove all filters
   - Check "All Sources"
   - Look in "Pending" status
   - Expand date range

2. **Refresh Page**
   - Hard refresh (Ctrl+F5)
   - Clear browser cache
   - Try different browser

3. **Wait for Processing**
   - Check timestamp of message
   - Allow full processing time
   - Refresh after waiting

4. **Check Other Sections**
   - Look in "Processed"
   - Check "Failed"
   - Review all statuses

---

### Issue: Can't Edit Enrichment

**Symptoms:**
- Edit button not working
- Changes not saving
- Error when editing

**Possible Causes:**
- Browser compatibility
- JavaScript error
- Network issue
- Permission problem

**Solutions:**

1. **Try Different Browser**
   - Use Chrome, Firefox, or Safari
   - Ensure JavaScript enabled
   - Update browser to latest version

2. **Check Console for Errors**
   - Open browser developer tools (F12)
   - Look for JavaScript errors
   - Report errors to support

3. **Refresh and Retry**
   - Reload page
   - Try editing again
   - Save frequently

4. **Check Network**
   - Ensure stable internet
   - Check for connection drops
   - Retry when stable

---

### Issue: Changes Not Applying

**Symptoms:**
- Clicked "Apply" but nothing happened
- Enrichments still pending
- No confirmation message

**Possible Causes:**
- Network error
- Server issue
- Validation error
- Browser problem

**Solutions:**

1. **Check for Error Messages**
   - Look for red error text
   - Check browser console
   - Note any warnings

2. **Verify Selection**
   - Ensure items are checked
   - At least one item must be selected
   - Try "Apply Selected" instead of "Approve All"

3. **Retry Application**
   - Refresh page
   - Re-select items
   - Try again

4. **Apply One at a Time**
   - Select single item
   - Apply individually
   - Identify problematic item

---

## System Errors

### Issue: "Invalid Signature" Error

**Symptoms:**
- Technical error message
- Messages not processing
- System-level error

**This is a Configuration Issue:**
- Not a user error
- Requires system administrator
- Contact support immediately

**Information to Provide:**
- Exact error message
- Timestamp
- Your phone number (last 4 digits)
- Recent messages sent

---

### Issue: "Service Unavailable"

**Symptoms:**
- Can't access web app
- API errors
- Features not working

**Possible Causes:**
- Server maintenance
- Service outage
- Network issue
- High load

**Solutions:**

1. **Check Status Page**
   - Visit status.catchup.app
   - Look for known issues
   - Check estimated resolution time

2. **Wait and Retry**
   - Wait 5-10 minutes
   - Try again
   - May be temporary

3. **Check Your Network**
   - Test other websites
   - Restart router
   - Try different network

4. **Contact Support**
   - If persists > 30 minutes
   - Provide error details
   - Include timestamp

---

### Issue: Database Errors

**Symptoms:**
- "Database connection error"
- "Query failed"
- Data not saving

**This is a System Issue:**
- Contact support immediately
- Don't retry repeatedly
- Wait for resolution

**Information to Provide:**
- Exact error message
- What you were trying to do
- Timestamp
- Your user ID

---

## Getting Additional Help

### Before Contacting Support

1. **Check This Guide**
   - Review relevant section
   - Try all suggested solutions
   - Note what you've tried

2. **Gather Information**
   - Error messages (exact text)
   - Timestamps
   - Phone number (last 4 digits)
   - Steps to reproduce
   - Browser and OS version

3. **Check Status Page**
   - Visit status.catchup.app
   - Look for known issues
   - Check if already being addressed

### Contacting Support

**Email**: support@catchup.app

**Include:**
- Clear description of issue
- What you expected to happen
- What actually happened
- Error messages (screenshots helpful)
- Steps to reproduce
- What you've already tried
- Your contact information

**Response Times:**
- Critical issues: 4 hours
- High priority: 24 hours
- General inquiries: 48 hours

### Emergency Issues

**Critical issues requiring immediate attention:**
- Security concerns
- Data loss
- System-wide failures
- Privacy breaches

**For emergencies:**
- Email: emergency@catchup.app
- Subject line: "URGENT: [brief description]"
- Include all relevant details

---

## Preventive Measures

### Avoid Common Issues

1. **Verify Setup Properly**
   - Complete phone verification
   - Test with simple message
   - Save CatchUp number correctly

2. **Follow Best Practices**
   - Use full names
   - Be specific
   - Add context
   - Review before sending

3. **Stay Within Limits**
   - Track message count
   - Compress large files
   - Batch updates efficiently

4. **Regular Maintenance**
   - Review enrichments promptly
   - Keep contact list updated
   - Clear old enrichments

5. **Monitor System Status**
   - Check status page occasionally
   - Subscribe to status updates
   - Plan around maintenance windows

---

## Additional Resources

- [User Guide](./SMS_MMS_ENRICHMENT_USER_GUIDE.md)
- [Quick Reference](./SMS_MMS_ENRICHMENT_QUICK_REFERENCE.md)
- [Setup Guide](./TWILIO_SMS_MMS_SETUP.md)
- [API Documentation](./API.md)
- [Security Policy](../SECURITY.md)

---

*Last updated: January 2024*
*Version: 1.0*
