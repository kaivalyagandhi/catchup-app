/**
 * Test script to simulate voice note recording and enrichment flow
 */

const WebSocket = require('ws');

async function testEnrichmentFlow() {
  const testContacts = [
    { id: 'contact-1', name: 'John Doe', tags: [], groups: [] },
    { id: 'contact-2', name: 'Sarah Smith', tags: [], groups: [] },
  ];

  const ws = new WebSocket('ws://localhost:3000/ws/voice-notes?userId=test-user-123');

  ws.on('open', async () => {
    console.log('✓ WebSocket connected');

    console.log('→ Sending start_session with', testContacts.length, 'contacts');
    ws.send(JSON.stringify({
      type: 'start_session',
      data: {
        languageCode: 'en-US',
        userContacts: testContacts
      }
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('← Received:', message.type, message.data);

    // After session starts, send some final transcript chunks
    if (message.type === 'session_started') {
      const sessionId = message.data.sessionId;
      console.log('✓ Session started:', sessionId);

      // Simulate final transcript chunks
      setTimeout(() => {
        console.log('→ Sending final transcript: "I had coffee"');
        ws.send(JSON.stringify({
          type: 'final_transcript',
          data: { transcript: 'I had coffee' }
        }));
      }, 500);

      setTimeout(() => {
        console.log('→ Sending final transcript: "with John today"');
        ws.send(JSON.stringify({
          type: 'final_transcript',
          data: { transcript: 'with John today' }
        }));
      }, 1000);

      setTimeout(() => {
        console.log('→ Sending final transcript: "He is into rock climbing"');
        ws.send(JSON.stringify({
          type: 'final_transcript',
          data: { transcript: 'He is into rock climbing' }
        }));
      }, 1500);

      // Wait for enrichment updates
      setTimeout(() => {
        console.log('→ Ending session');
        ws.send(JSON.stringify({
          type: 'end_session',
          data: { userContacts: testContacts }
        }));
      }, 3000);

      setTimeout(() => {
        console.log('✓ Test complete');
        ws.close();
        process.exit(0);
      }, 5000);
    }
  });

  ws.on('error', (error) => {
    console.error('✗ WebSocket error:', error);
    process.exit(1);
  });

  ws.on('close', () => {
    console.log('✓ WebSocket closed');
  });
}

testEnrichmentFlow();
