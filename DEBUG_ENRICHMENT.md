# Enrichment Debug Guide

## Step 1: Capture Server Logs

Run your dev server and redirect output to a file:

```bash
npm run dev > server-logs.txt 2>&1
```

Then in another terminal, test the voice recording.

## Step 2: Check What Logs Appear

After recording, stop the server (Ctrl+C) and check the logs:

```bash
cat server-logs.txt | grep -E "\[VoiceNoteService\]|\[EnrichmentAnalysis\]|\[EnrichmentAnalyzer\]|\[WebSocketHandler\]|Emitting"
```

## Step 3: Share the Output

Look for these patterns and tell me what you see:

### Pattern 1: Transcription
```
[VoiceNoteService] Final result received for session
```
**If missing**: Transcription isn't producing final results

### Pattern 2: Enrichment Trigger
```
[EnrichmentAnalysis] Session: analyzing
[EnrichmentAnalyzer] shouldTrigger=
```
**If missing**: Enrichment analysis isn't being called

### Pattern 3: Suggestions Generated
```
[EnrichmentAnalyzer] Disambiguated N contacts
[EnrichmentAnalyzer] Generated N suggestions
```
**If missing**: No suggestions are being created

### Pattern 4: Event Emission
```
Emitting N enrichment suggestions
[WebSocketHandler] Received enrichment_update
```
**If missing**: Suggestions aren't being sent to client

## Quick Test

1. Start server: `npm run dev`
2. Open browser to http://localhost:3000
3. Start recording
4. Say: "I had coffee with John today"
5. Stop recording
6. Check server logs for the patterns above

## What to Share

Run this and share the output:
```bash
npm run dev 2>&1 | tee server-logs.txt &
# [record voice note]
# [stop recording]
# [Ctrl+C to stop server]
cat server-logs.txt | grep -E "\[Voice\]|\[Enrichment\]|\[WebSocket\]|Emitting|Final result"
```
