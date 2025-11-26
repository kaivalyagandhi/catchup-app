/**
 * Voice Notes Recording Interface
 * Implements MediaRecorder API for audio capture and WebSocket for real-time transcription
 */

class VoiceNoteRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.websocket = null;
    this.sessionId = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    this.durationInterval = null;
    this.audioChunks = [];
    
    // UI Elements
    this.recordButton = null;
    this.stopButton = null;
    this.statusIndicator = null;
    this.durationDisplay = null;
    this.transcriptDisplay = null;
    this.interimTranscriptDisplay = null;
    this.finalTranscriptDisplay = null;
    this.errorDisplay = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    
    this.init();
  }
  
  init() {
    this.checkBrowserCompatibility();
    this.setupUI();
    this.attachEventListeners();
  }
  
  checkBrowserCompatibility() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.');
      return false;
    }
    
    if (!window.MediaRecorder) {
      this.showError('MediaRecorder API is not supported in your browser.');
      return false;
    }
    
    if (!window.WebSocket) {
      this.showError('WebSocket is not supported in your browser.');
      return false;
    }
    
    return true;
  }
  
  setupUI() {
    const container = document.getElementById('voice-content');
    if (!container) return;
    
    container.innerHTML = `
      <div class="voice-recorder-container">
        <!-- Error Display -->
        <div id="voice-error" class="error hidden"></div>
        
        <!-- Recording Controls -->
        <div class="recording-controls">
          <button id="record-btn" class="record-button">
            <span class="record-icon">🎤</span>
            <span class="record-text">Start Recording</span>
          </button>
          
          <button id="stop-btn" class="stop-button hidden">
            <span class="stop-icon">⏹️</span>
            <span class="stop-text">Stop Recording</span>
          </button>
          
          <div id="recording-status" class="status-indicator hidden">
            <span class="status-dot"></span>
            <span class="status-text">Recording</span>
          </div>
          
          <div id="duration-display" class="duration-display hidden">
            <span class="duration-text">00:00</span>
          </div>
        </div>
        
        <!-- Waveform Visualization -->
        <div class="waveform-container hidden" id="waveform-container">
          <canvas id="waveform-canvas" width="600" height="100"></canvas>
        </div>
        
        <!-- Transcript Display -->
        <div class="transcript-container">
          <h3>Transcript</h3>
          <div class="transcript-display" id="transcript-display">
            <div id="final-transcript" class="final-transcript"></div>
            <div id="interim-transcript" class="interim-transcript"></div>
          </div>
        </div>
        
        <!-- Processing Status -->
        <div id="processing-status" class="processing-status hidden">
          <div class="spinner"></div>
          <span class="processing-text">Processing...</span>
        </div>
      </div>
    `;
    
    // Get UI element references
    this.recordButton = document.getElementById('record-btn');
    this.stopButton = document.getElementById('stop-btn');
    this.statusIndicator = document.getElementById('recording-status');
    this.durationDisplay = document.getElementById('duration-display');
    this.transcriptDisplay = document.getElementById('transcript-display');
    this.interimTranscriptDisplay = document.getElementById('interim-transcript');
    this.finalTranscriptDisplay = document.getElementById('final-transcript');
    this.errorDisplay = document.getElementById('voice-error');
    this.waveformCanvas = document.getElementById('waveform-canvas');
    this.waveformContext = this.waveformCanvas?.getContext('2d');
    
    this.addStyles();
  }
  
  addStyles() {
    if (document.getElementById('voice-notes-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'voice-notes-styles';
    style.textContent = `
      .voice-recorder-container {
        max-width: 800px;
        margin: 0 auto;
      }
      
      .recording-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 30px;
        flex-wrap: wrap;
      }
      
      .record-button, .stop-button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px 30px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        transition: all 0.3s;
      }
      
      .record-button {
        background: #2563eb;
        color: white;
      }
      
      .record-button:hover {
        background: #1d4ed8;
        transform: scale(1.05);
      }
      
      .stop-button {
        background: #ef4444;
        color: white;
      }
      
      .stop-button:hover {
        background: #dc2626;
      }
      
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #fee2e2;
        border-radius: 20px;
        color: #991b1b;
        font-weight: 500;
      }
      
      .status-dot {
        width: 12px;
        height: 12px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.1);
        }
      }
      
      .duration-display {
        padding: 8px 16px;
        background: #f3f4f6;
        border-radius: 20px;
        font-weight: 600;
        color: #374151;
        font-family: 'Courier New', monospace;
        font-size: 16px;
      }
      
      .waveform-container {
        margin-bottom: 30px;
        padding: 20px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      
      #waveform-canvas {
        width: 100%;
        height: 100px;
        display: block;
      }
      
      .transcript-container {
        margin-top: 30px;
      }
      
      .transcript-container h3 {
        margin-bottom: 15px;
        color: #1f2937;
      }
      
      .transcript-display {
        min-height: 200px;
        max-height: 400px;
        overflow-y: auto;
        padding: 20px;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 16px;
        line-height: 1.6;
      }
      
      .final-transcript {
        color: #1f2937;
        margin-bottom: 10px;
      }
      
      .interim-transcript {
        color: #9ca3af;
        font-style: italic;
      }
      
      .processing-status {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px 20px;
        background: #e0f2fe;
        border-radius: 8px;
        margin-top: 20px;
        color: #0369a1;
        font-weight: 500;
      }
      
      .spinner {
        width: 20px;
        height: 20px;
        border: 3px solid #bfdbfe;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @media (max-width: 768px) {
        .recording-controls {
          flex-direction: column;
          align-items: stretch;
        }
        
        .record-button, .stop-button {
          width: 100%;
          justify-content: center;
        }
        
        .status-indicator, .duration-display {
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  attachEventListeners() {
    if (this.recordButton) {
      this.recordButton.addEventListener('click', () => this.startRecording());
    }
    
    if (this.stopButton) {
      this.stopButton.addEventListener('click', () => this.stopRecording());
    }
  }
  
  async startRecording() {
    try {
      this.clearError();
      this.showProcessingStatus('Requesting microphone access...');
      
      // Request microphone access
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      };
      
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.hideProcessingStatus();
      
      // Setup MediaRecorder
      this.setupMediaRecorder();
      
      // Setup audio visualization
      this.setupAudioVisualization();
      
      // WebSocket disabled for now - transcription happens on finalize
      // TODO: Re-enable for real-time transcription
      // this.connectWebSocket();
      
      // Start recording
      this.mediaRecorder.start(100); // Capture in 100ms chunks
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // Update UI
      this.updateUIForRecording();
      
      // Start duration timer
      this.startDurationTimer();
      
      // Start waveform animation
      this.animateWaveform();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.showError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        this.showError('No microphone found. Please connect a microphone and try again.');
      } else {
        this.showError(`Failed to start recording: ${error.message}`);
      }
      
      this.cleanup();
    }
  }
  
  async createSession() {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('User not logged in');
      }
      
      const response = await fetch('/api/voice-notes/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create recording session');
      }
      
      const data = await response.json();
      this.sessionId = data.sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create recording session. Please try again.');
    }
  }
  
  setupMediaRecorder() {
    // Determine the best MIME type
    const mimeType = this.getSupportedMimeType();
    
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: mimeType,
      audioBitsPerSecond: 16000
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        // WebSocket disabled - audio will be sent on finalize
      }
    };
    
    this.mediaRecorder.onstop = () => {
      this.finalizeRecording();
    };
    
    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      this.showError('Recording error occurred. Please try again.');
      this.cleanup();
    };
  }
  
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return ''; // Use default
  }
  
  setupAudioVisualization() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      // Non-critical, continue without visualization
    }
  }
  
  animateWaveform() {
    if (!this.isRecording || !this.analyser || !this.waveformContext) return;
    
    requestAnimationFrame(() => this.animateWaveform());
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    const canvas = this.waveformCanvas;
    const ctx = this.waveformContext;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.beginPath();
    
    const sliceWidth = width / this.dataArray.length;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }
  
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const userId = localStorage.getItem('userId');
    const wsUrl = `${protocol}//${window.location.host}/ws/voice-notes?userId=${userId}&sessionId=${this.sessionId}`;
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      // Associate this WebSocket connection with the session
      this.websocket.send(JSON.stringify({
        type: 'associate_session',
        sessionId: this.sessionId
      }));
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.error('WebSocket readyState:', this.websocket.readyState);
      this.showError('Connection error. Transcription may be unavailable.');
    };
    
    this.websocket.onclose = (event) => {
      console.log('WebSocket closed', { code: event.code, reason: event.reason, wasClean: event.wasClean });
    };
  }
  
  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'interim_transcript':
        this.updateInterimTranscript(data.text);
        break;
      case 'final_transcript':
        this.updateFinalTranscript(data.text);
        break;
      case 'status':
        this.updateStatus(data.status);
        break;
      case 'error':
        this.showError(data.message);
        break;
    }
  }
  
  updateInterimTranscript(text) {
    if (this.interimTranscriptDisplay) {
      this.interimTranscriptDisplay.textContent = text;
    }
  }
  
  updateFinalTranscript(text) {
    if (this.finalTranscriptDisplay) {
      const currentText = this.finalTranscriptDisplay.textContent;
      this.finalTranscriptDisplay.textContent = currentText + ' ' + text;
    }
    
    // Clear interim transcript
    if (this.interimTranscriptDisplay) {
      this.interimTranscriptDisplay.textContent = '';
    }
    
    // Scroll to bottom
    if (this.transcriptDisplay) {
      this.transcriptDisplay.scrollTop = this.transcriptDisplay.scrollHeight;
    }
  }
  
  updateStatus(status) {
    console.log('Status update:', status);
  }
  
  sendAudioChunk(audioBlob) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Convert blob to array buffer and send
      audioBlob.arrayBuffer().then(buffer => {
        this.websocket.send(buffer);
      });
    }
  }
  
  async stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop duration timer
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    
    // Update UI
    this.updateUIForStopped();
    
    this.showProcessingStatus('Processing voice note...');
  }
  
  async finalizeRecording() {
    try {
      // Close WebSocket if exists
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      // Create audio blob from recorded chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      console.log(`Audio blob created: ${audioBlob.size} bytes`);
      
      // Upload audio file for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('userId', userId);
      
      const uploadResponse = await fetch('/api/voice-notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload audio');
      }
      
      const voiceNote = await uploadResponse.json();
      console.log('Audio uploaded, voice note created:', voiceNote);
      
      // Use the voice note ID from upload response
      const voiceNoteId = voiceNote.id;
      
      this.hideProcessingStatus();
      
      // Display transcript
      if (voiceNote.transcript) {
        this.updateFinalTranscript(voiceNote.transcript);
      }
      
      showToast('Voice note processed successfully!', 'success');
      
      // Clean up recording resources
      this.cleanup();
      
      // Check if we have enrichment data
      if (voiceNote.enrichmentData) {
        // Show enrichment review
        if (window.enrichmentReview) {
          window.enrichmentReview.display(voiceNote.enrichmentData, async (proposal) => {
            await this.applyEnrichment(voiceNoteId, proposal);
          });
        }
      } else {
        // No enrichment, just show success and reset
        setTimeout(() => {
          this.resetUI();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error finalizing recording:', error);
      this.showError('Failed to save voice note. Please try again.');
      this.cleanup();
    }
  }
  
  async showContactSelector(voiceNoteId) {
    try {
      // Load contacts, groups, and tags
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      // Fetch contacts
      const contactsResponse = await fetch(`${API_BASE || '/api'}/contacts?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!contactsResponse.ok) {
        throw new Error('Failed to load contacts');
      }
      
      const contacts = await contactsResponse.json();
      
      // Fetch groups
      const groupsResponse = await fetch(`${API_BASE || '/api'}/contacts/groups?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const groups = groupsResponse.ok ? await groupsResponse.json() : [];
      
      // Fetch tags
      const tagsResponse = await fetch(`${API_BASE || '/api'}/groups-tags/tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const tags = tagsResponse.ok ? await tagsResponse.json() : [];
      
      // Display contact selector
      window.contactSelector.display(contacts, groups, tags, async (selectedContacts) => {
        if (selectedContacts.length === 0) {
          // User cancelled
          showToast('Contact selection cancelled', 'info');
          this.resetUI();
          return;
        }
        
        // Update voice note with selected contacts
        await this.updateVoiceNoteContacts(voiceNoteId, selectedContacts);
      });
      
    } catch (error) {
      console.error('Error showing contact selector:', error);
      showToast('Failed to load contact selector', 'error');
      this.resetUI();
    }
  }
  
  async updateVoiceNoteContacts(voiceNoteId, selectedContacts) {
    try {
      const token = localStorage.getItem('authToken');
      
      // Update voice note with selected contacts
      const response = await fetch(`/api/voice-notes/${voiceNoteId}/contacts`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactIds: selectedContacts.map(c => c.id)
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update voice note contacts');
      }
      
      const data = await response.json();
      
      showToast(`Associated voice note with ${selectedContacts.length} contact(s)`, 'success');
      
      // Show enrichment review if proposal is available
      if (data.enrichmentProposal && window.enrichmentReview) {
        window.enrichmentReview.display(data.enrichmentProposal, async (proposal) => {
          await this.applyEnrichment(proposal);
        });
      } else {
        // Reset UI
        setTimeout(() => {
          this.resetUI();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error updating voice note contacts:', error);
      showToast('Failed to update voice note contacts', 'error');
      this.resetUI();
    }
  }
  
  async applyEnrichment(voiceNoteId, proposal) {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/voice-notes/${voiceNoteId}/enrichment/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, enrichmentProposal: proposal })
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply enrichment');
      }
      
      const result = await response.json();
      
      // Show success message
      showToast(`Applied ${result.totalApplied} enrichment items successfully!`, 'success');
      
      // Dispatch event to refresh contacts list (with small delay to ensure backend is done)
      setTimeout(() => {
        console.log('Dispatching contacts-updated event');
        window.dispatchEvent(new CustomEvent('contacts-updated'));
        
        // Also trigger a direct refresh if loadContacts is available
        if (typeof loadContacts === 'function') {
          console.log('Calling loadContacts directly');
          loadContacts();
        }
      }, 500);
      
      // Reset UI after successful application
      setTimeout(() => {
        this.resetUI();
      }, 2000);
      
    } catch (error) {
      console.error('Error applying enrichment:', error);
      throw error;
    }
  }
  
  startDurationTimer() {
    this.durationInterval = setInterval(() => {
      if (!this.recordingStartTime) return;
      
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      const timeString = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
      
      if (this.durationDisplay) {
        this.durationDisplay.querySelector('.duration-text').textContent = timeString;
      }
    }, 1000);
  }
  
  updateUIForRecording() {
    if (this.recordButton) {
      this.recordButton.classList.add('hidden');
    }
    
    if (this.stopButton) {
      this.stopButton.classList.remove('hidden');
    }
    
    if (this.statusIndicator) {
      this.statusIndicator.classList.remove('hidden');
    }
    
    if (this.durationDisplay) {
      this.durationDisplay.classList.remove('hidden');
    }
    
    const waveformContainer = document.getElementById('waveform-container');
    if (waveformContainer) {
      waveformContainer.classList.remove('hidden');
    }
  }
  
  updateUIForStopped() {
    if (this.recordButton) {
      this.recordButton.classList.remove('hidden');
    }
    
    if (this.stopButton) {
      this.stopButton.classList.add('hidden');
    }
    
    if (this.statusIndicator) {
      this.statusIndicator.classList.add('hidden');
    }
    
    const waveformContainer = document.getElementById('waveform-container');
    if (waveformContainer) {
      waveformContainer.classList.add('hidden');
    }
  }
  
  resetUI() {
    if (this.finalTranscriptDisplay) {
      this.finalTranscriptDisplay.textContent = '';
    }
    
    if (this.interimTranscriptDisplay) {
      this.interimTranscriptDisplay.textContent = '';
    }
    
    if (this.durationDisplay) {
      this.durationDisplay.querySelector('.duration-text').textContent = '00:00';
      this.durationDisplay.classList.add('hidden');
    }
    
    this.audioChunks = [];
    this.sessionId = null;
    this.recordingStartTime = null;
  }
  
  cleanup() {
    // Stop all tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    
    // Clear intervals
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    
    this.isRecording = false;
  }
  
  showError(message) {
    if (this.errorDisplay) {
      this.errorDisplay.textContent = message;
      this.errorDisplay.classList.remove('hidden');
    }
    showToast(message, 'error');
  }
  
  clearError() {
    if (this.errorDisplay) {
      this.errorDisplay.textContent = '';
      this.errorDisplay.classList.add('hidden');
    }
  }
  
  showProcessingStatus(message) {
    const statusElement = document.getElementById('processing-status');
    if (statusElement) {
      statusElement.querySelector('.processing-text').textContent = message;
      statusElement.classList.remove('hidden');
    }
  }
  
  hideProcessingStatus() {
    const statusElement = document.getElementById('processing-status');
    if (statusElement) {
      statusElement.classList.add('hidden');
    }
  }
}

// Initialize voice note recorder when voice page is loaded
let voiceNoteRecorder = null;

function initVoiceNotesPage() {
  if (!voiceNoteRecorder) {
    voiceNoteRecorder = new VoiceNoteRecorder();
  }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.initVoiceNotesPage = initVoiceNotesPage;
}
