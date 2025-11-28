/**
 * Voice Notes Recording Interface
 * Implements MediaRecorder API for audio capture and WebSocket for real-time transcription
 */

class VoiceNoteRecorder {
  constructor() {
    // New component instances
    this.audioManager = null;
    this.transcriptManager = null;
    this.recordingIndicator = null;
    
    // WebSocket state
    this.websocket = null;
    this.sessionId = null;
    this.connectionState = 'disconnected';
    this.reconnectAttempt = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectTimeout = null;
    this.audioBuffer = [];
    this.maxBufferSize = 100 * 1024 * 1024; // 100MB
    
    // UI Elements
    this.recordButton = null;
    this.stopButton = null;
    this.pauseButton = null;
    this.resumeButton = null;
    this.transcriptContainer = null;
    this.errorDisplay = null;
    this.waveformCanvas = null;
    this.waveformContext = null;
    this.visualizationWarnings = null;
    
    // Enrichment panel
    this.enrichmentPanel = null;
    
    // Audio level warnings state
    this.lastSilenceWarning = 0;
    this.lastLowLevelWarning = 0;
    this.lastClippingWarning = 0;
    this.warningThrottleMs = 5000; // Show warnings at most every 5 seconds
    
    this.init();
  }
  
  init() {
    this.checkBrowserCompatibility();
    this.setupUI();
    this.attachEventListeners();
    this.initializeComponents();
  }
  
  initializeComponents() {
    // Initialize TranscriptManager
    this.transcriptManager = new window.TranscriptManager();
    
    // Initialize RecordingIndicator
    this.recordingIndicator = new window.RecordingIndicator();
    
    // Attach pause/stop handlers to recording indicator
    this.recordingIndicator.onPauseClick = () => this.handleIndicatorPauseClick();
    this.recordingIndicator.onStopClick = () => this.handleIndicatorStopClick();
    
    // Initialize enrichment panel if available
    if (window.enrichmentPanel) {
      this.enrichmentPanel = window.enrichmentPanel;
    } else if (window.initEnrichmentPanel) {
      this.enrichmentPanel = window.initEnrichmentPanel();
    }
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
        </div>
        
        <!-- Waveform Visualization -->
        <div class="waveform-container hidden" id="waveform-container">
          <canvas id="waveform-canvas" width="600" height="100"></canvas>
          <div id="visualization-warnings" class="visualization-warnings"></div>
        </div>
        
        <!-- Transcript Display -->
        <div class="transcript-container">
          <h3>Transcript</h3>
          <div class="transcript-display" id="transcript-display"></div>
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
    this.transcriptContainer = document.getElementById('transcript-display');
    this.errorDisplay = document.getElementById('voice-error');
    this.waveformCanvas = document.getElementById('waveform-canvas');
    this.waveformContext = this.waveformCanvas?.getContext('2d');
    this.visualizationWarnings = document.getElementById('visualization-warnings');
    
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
      
      .record-button, .pause-button, .resume-button, .stop-button {
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
      
      .pause-button {
        background: #f59e0b;
        color: white;
      }
      
      .pause-button:hover {
        background: #d97706;
      }
      
      .resume-button {
        background: #10b981;
        color: white;
      }
      
      .resume-button:hover {
        background: #059669;
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
      
      .visualization-warnings {
        margin-top: 10px;
        min-height: 24px;
      }
      
      .visualization-warning {
        display: inline-block;
        padding: 6px 12px;
        margin: 4px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
      }
      
      .warning-silence {
        background: #fef3c7;
        color: #92400e;
      }
      
      .warning-low-level {
        background: #fed7aa;
        color: #9a3412;
      }
      
      .warning-clipping {
        background: #fecaca;
        color: #991b1b;
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
      
      .transcript-segment {
        display: inline;
      }
      
      .transcript-final {
        color: #1f2937;
      }
      
      .transcript-interim {
        color: #9ca3af;
        font-style: italic;
      }
      
      .transcript-pause-marker {
        color: #f59e0b;
        font-weight: bold;
        margin: 0 4px;
      }
      
      .confidence-high {
        font-weight: 600;
      }
      
      .confidence-medium {
        font-weight: normal;
      }
      
      .confidence-low {
        color: #9ca3af;
        font-weight: 300;
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
      
      // Initialize AudioManager
      console.log('Initializing AudioManager...');
      this.audioManager = new window.AudioManager({
        sampleRate: 16000,
        chunkIntervalMs: 100,
        maxBufferSizeBytes: 100 * 1024 * 1024,
        silenceThresholdDb: -50,
        silenceTimeoutMs: 3000,
        lowLevelThresholdDb: -40,
        clippingThresholdDb: 0
      });
      console.log('AudioManager created:', this.audioManager);
      
      // Setup audio manager callbacks
      console.log('Setting up AudioManager callbacks...');
      this.setupAudioManagerCallbacks();
      console.log('Callbacks set, onAudioChunk:', typeof this.audioManager.onAudioChunk);
      
      // Start audio manager
      console.log('Starting AudioManager...');
      await this.audioManager.start();
      console.log('AudioManager started, state:', this.audioManager.state);
      
      this.hideProcessingStatus();
      
      // Clear transcript manager
      this.transcriptManager.clear();
      
      // Setup audio visualization
      this.setupAudioVisualization();
      
      // Connect WebSocket for real-time transcription
      await this.connectWebSocket();
      
      // Show enrichment review panel in recording mode
      if (window.enrichmentReview) {
        window.enrichmentReview.showRecordingMode();
      }
      
      // Update UI
      this.updateUIForRecording();
      
      // Show recording indicator
      this.updateRecordingIndicator();
      
      // Start waveform animation
      this.animateWaveform();
      
      // Start updating indicator time
      this.startIndicatorTimer();
      
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
  
  setupAudioManagerCallbacks() {
    // Audio chunk callback - send to WebSocket
    this.audioManager.onAudioChunk = (chunk) => {
      this.sendAudioChunk(chunk);
    };
    
    // Level change callback
    this.audioManager.onLevelChange = (level) => {
      // Used for visualization - no action needed here
    };
    
    // Silence detected callback
    this.audioManager.onSilenceDetected = () => {
      this.showVisualizationWarning('silence', 'No audio detected. Please speak into the microphone.');
    };
    
    // Low level detected callback
    this.audioManager.onLowLevelDetected = () => {
      this.showVisualizationWarning('low-level', 'Audio level is low. Please speak louder or move closer to the microphone.');
    };
    
    // Clipping detected callback
    this.audioManager.onClippingDetected = () => {
      this.showVisualizationWarning('clipping', 'Audio is clipping. Please speak softer or move away from the microphone.');
    };
  }
  
  showVisualizationWarning(type, message) {
    if (!this.visualizationWarnings) return;
    
    // Throttle warnings
    const now = Date.now();
    if (type === 'silence' && now - this.lastSilenceWarning < this.warningThrottleMs) return;
    if (type === 'low-level' && now - this.lastLowLevelWarning < this.warningThrottleMs) return;
    if (type === 'clipping' && now - this.lastClippingWarning < this.warningThrottleMs) return;
    
    // Update last warning time
    if (type === 'silence') this.lastSilenceWarning = now;
    if (type === 'low-level') this.lastLowLevelWarning = now;
    if (type === 'clipping') this.lastClippingWarning = now;
    
    // Clear existing warnings of this type
    const existingWarning = this.visualizationWarnings.querySelector(`.warning-${type}`);
    if (existingWarning) {
      existingWarning.remove();
    }
    
    // Add new warning
    const warning = document.createElement('div');
    warning.className = `visualization-warning warning-${type}`;
    warning.textContent = message;
    this.visualizationWarnings.appendChild(warning);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      warning.remove();
    }, 5000);
  }
  
  pauseRecording() {
    if (!this.audioManager || !this.audioManager.isRecording()) {
      return;
    }
    
    try {
      // Pause audio manager
      this.audioManager.pause();
      
      // Send pause message to WebSocket
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'pause_session',
          data: {}
        }));
      }
      
      // Insert pause marker in transcript
      this.transcriptManager.insertPauseMarker();
      
      // Update UI
      this.updateUIForPaused();
      
      // Update recording indicator
      this.updateRecordingIndicator();
      
      // Render updated transcript
      this.renderTranscript();
      
    } catch (error) {
      console.error('Error pausing recording:', error);
      this.showError('Failed to pause recording.');
    }
  }
  
  resumeRecording() {
    if (!this.audioManager || !this.audioManager.isPaused()) {
      return;
    }
    
    try {
      // Resume audio manager
      this.audioManager.resume();
      
      // Send resume message to WebSocket
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'resume_session',
          data: {}
        }));
      }
      
      // Update UI
      this.updateUIForRecording();
      
      // Update recording indicator
      this.updateRecordingIndicator();
      
    } catch (error) {
      console.error('Error resuming recording:', error);
      this.showError('Failed to resume recording.');
    }
  }
  
  /**
   * Handle pause/resume button click from recording indicator
   */
  handleIndicatorPauseClick() {
    if (this.audioManager && this.audioManager.isPaused()) {
      this.resumeRecording();
    } else if (this.audioManager && this.audioManager.isRecording()) {
      this.pauseRecording();
    }
  }
  
  /**
   * Handle stop button click from recording indicator
   */
  handleIndicatorStopClick() {
    this.stopRecording();
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
  
  setupAudioVisualization() {
    // AudioManager handles audio analysis internally
    // We just need to access its analyser for visualization
    if (!this.audioManager || !this.audioManager.analyser) {
      console.warn('Audio visualization not available');
      return;
    }
  }
  
  animateWaveform() {
    if (!this.audioManager || !this.audioManager.isRecording() || !this.waveformContext) {
      return;
    }
    
    requestAnimationFrame(() => this.animateWaveform());
    
    const analyser = this.audioManager.analyser;
    const dataArray = this.audioManager.dataArray;
    
    if (!analyser || !dataArray) return;
    
    analyser.getByteTimeDomainData(dataArray);
    
    const canvas = this.waveformCanvas;
    const ctx = this.waveformContext;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.beginPath();
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
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
  
  async connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const userId = localStorage.getItem('userId');
    const wsUrl = `${protocol}//${window.location.host}/ws/voice-notes?userId=${userId}`;
    
    this.websocket = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      // Store resolve function to call after session_started
      let sessionStartedResolver = null;
      
      // Set a timeout in case server doesn't respond
      const timeout = setTimeout(() => {
        if (sessionStartedResolver) {
          console.error('Timeout waiting for session_started message');
          reject(new Error('Timeout waiting for session to start'));
        }
      }, 10000); // 10 second timeout
      
      this.websocket.onopen = async () => {
        console.log('WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempt = 0;
        
        // Fetch user contacts for incremental enrichment context
        let userContacts = [];
        try {
          const token = localStorage.getItem('authToken');
          const fetchUserId = localStorage.getItem('userId');
          console.log('Fetching contacts with token:', token ? 'present' : 'missing', 'userId:', fetchUserId);
          const contactsResponse = await fetch(`/api/contacts?userId=${fetchUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('Contacts response status:', contactsResponse.status);
          if (contactsResponse.ok) {
            userContacts = await contactsResponse.json();
            console.log(`Fetched ${userContacts.length} contacts for enrichment context`);
          } else {
            console.warn('Contacts fetch failed with status:', contactsResponse.status);
          }
        } catch (err) {
          console.warn('Failed to fetch contacts for enrichment:', err);
        }
        console.log('userContacts to send:', userContacts.length);
        
        // Send start_session message with contacts for context
        console.log('Sending start_session message with contacts');
        this.websocket.send(JSON.stringify({
          type: 'start_session',
          data: {
            languageCode: 'en-US',
            userContacts: userContacts
          }
        }));
        
        // Update connection status in UI
        this.updateConnectionStatus('connected');
        
        // Don't resolve yet - wait for session_started message
        sessionStartedResolver = (value) => {
          clearTimeout(timeout);
          resolve(value);
        };
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type, message.data);
          
          // Special handling for session_started to resolve the promise
          if (message.type === 'session_started') {
            this.sessionId = message.data.sessionId;
            console.log('Session started with ID:', this.sessionId);
            
            // Flush any buffered audio chunks now that session is ready
            if (this.audioBuffer.length > 0) {
              console.log(`Flushing ${this.audioBuffer.length} buffered audio chunks`);
              this.flushAudioBuffer();
            }
            
            // Resolve the connectWebSocket promise now that we have a session
            if (sessionStartedResolver) {
              console.log('Resolving connectWebSocket promise');
              sessionStartedResolver();
              sessionStartedResolver = null;
            }
          }
          
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', this.websocket.readyState);
        reject(error);
      };
      
      this.websocket.onclose = (event) => {
        console.log('WebSocket closed', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        
        // Only attempt reconnection if we're still recording
        if (this.audioManager && (this.audioManager.isRecording() || this.audioManager.isPaused()) && 
            this.reconnectAttempt < this.maxReconnectAttempts) {
          this.attemptReconnection();
        } else if (this.reconnectAttempt >= this.maxReconnectAttempts) {
          this.connectionState = 'disconnected';
          this.updateConnectionStatus('disconnected');
          this.showError('Connection lost. Audio is being saved locally for later transcription.');
        }
      };
    });
  }
  
  /**
   * Attempt to reconnect with exponential backoff
   * Delays: 1s, 2s, 4s (max 10s)
   */
  attemptReconnection() {
    this.connectionState = 'reconnecting';
    this.reconnectAttempt++;
    
    // Calculate backoff delay: min(initialDelay * 2^attempt, maxDelay)
    const initialDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(initialDelay * Math.pow(2, this.reconnectAttempt - 1), maxDelay);
    
    console.log(`Attempting reconnection ${this.reconnectAttempt}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    // Update UI
    this.updateConnectionStatus('reconnecting', this.reconnectAttempt);
    
    // Schedule reconnection
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempt})...`);
      this.connectWebSocket();
    }, delay);
  }
  
  /**
   * Flush buffered audio to server after reconnection
   */
  flushAudioBuffer() {
    if (this.audioBuffer.length === 0) {
      return;
    }
    
    console.log(`Flushing ${this.audioBuffer.length} buffered audio chunks`);
    
    // Send all buffered chunks in order
    for (const chunk of this.audioBuffer) {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(chunk);
      }
    }
    
    // Clear buffer
    this.audioBuffer = [];
  }
  
  /**
   * Update connection status in UI
   */
  updateConnectionStatus(status, attempt = 0) {
    this.connectionState = status;
    this.reconnectAttempt = attempt;
    
    console.log(`Connection status: ${status}${attempt ? ` (attempt ${attempt})` : ''}`);
    
    // Update recording indicator
    this.updateRecordingIndicator();
    
    // Show status message
    if (status === 'reconnecting') {
      this.showProcessingStatus(`Reconnecting... (attempt ${attempt}/${this.maxReconnectAttempts})`);
    } else if (status === 'connected') {
      this.hideProcessingStatus();
    } else if (status === 'disconnected') {
      this.showError('Connection lost. Recording continues locally.');
    }
  }
  
  handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'session_started':
        // Session ID already set in onmessage handler
        break;
      case 'interim_transcript':
        this.updateInterimTranscript(data.transcript, data.confidence || 0.8);
        break;
      case 'final_transcript':
        this.updateFinalTranscript(data.transcript, data.confidence || 1.0);
        break;
      case 'enrichment_update':
        this.handleEnrichmentUpdate(data.suggestions);
        break;
      case 'connection_status':
        this.updateConnectionStatus(data.status, data.attempt);
        break;
      case 'status_change':
        this.updateStatus(data.status);
        break;
      case 'error':
        console.error('Server error:', data.error);
        this.showError(data.error);
        break;
      case 'session_finalized':
        this.handleSessionFinalized(data.voiceNote, data.proposal);
        break;
    }
  }
  
  handleEnrichmentUpdate(suggestions) {
    // Convert suggestions to proposal format and update enrichment-review panel
    const proposal = this.suggestionsToProposal(suggestions);
    
    if (window.enrichmentReview) {
      // Keep recording mode flag set
      window.enrichmentReview.isRecording = true;
      
      // Display the proposal in the review panel (live update)
      window.enrichmentReview.display(proposal, async (approvedProposal) => {
        // This callback will be called when user clicks "Apply Selected"
        // For now, just log - actual apply happens after recording stops
        console.log('Enrichment apply requested during recording');
      });
    }
    
    console.log('Enrichment update received:', suggestions);
  }
  
  /**
   * Convert enrichment suggestions to proposal format for the review panel
   */
  suggestionsToProposal(suggestions) {
    // Group suggestions by contact hint
    const contactMap = new Map();
    
    suggestions.forEach(suggestion => {
      const contactName = suggestion.contactHint || 'Unknown Contact';
      
      if (!contactMap.has(contactName)) {
        contactMap.set(contactName, {
          contactId: `temp-${contactName.toLowerCase().replace(/\s+/g, '-')}`,
          contactName: contactName,
          items: []
        });
      }
      
      const contactProposal = contactMap.get(contactName);
      
      // Convert suggestion to proposal item
      const item = this.suggestionToProposalItem(suggestion);
      if (item) {
        // Check if item already exists (by type and value)
        const existingIndex = contactProposal.items.findIndex(
          i => i.type === item.type && i.field === item.field && i.value === item.value
        );
        
        if (existingIndex === -1) {
          contactProposal.items.push(item);
        }
      }
    });
    
    return {
      voiceNoteId: this.sessionId || 'recording',
      contactProposals: Array.from(contactMap.values()),
      requiresContactSelection: false
    };
  }
  
  /**
   * Convert a single suggestion to a proposal item
   */
  suggestionToProposalItem(suggestion) {
    const baseItem = {
      id: suggestion.id,
      accepted: true, // Default to accepted
      value: suggestion.value
    };
    
    switch (suggestion.type) {
      case 'location':
        return {
          ...baseItem,
          type: 'field',
          action: 'update',
          field: 'location'
        };
      case 'phone':
        return {
          ...baseItem,
          type: 'field',
          action: 'update',
          field: 'phone'
        };
      case 'email':
        return {
          ...baseItem,
          type: 'field',
          action: 'update',
          field: 'email'
        };
      case 'note':
        return {
          ...baseItem,
          type: 'field',
          action: 'update',
          field: 'customNotes'
        };
      case 'tag':
        // Skip contact name tags (they're used for grouping)
        if (suggestion.id.startsWith('tag:contact:')) {
          return null;
        }
        return {
          ...baseItem,
          type: 'tag',
          action: 'add'
        };
      case 'interest':
        return {
          ...baseItem,
          type: 'group',
          action: 'add'
        };
      default:
        return {
          ...baseItem,
          type: 'tag',
          action: 'add'
        };
    }
  }
  
  updateInterimTranscript(text, confidence = 0.8) {
    console.log('updateInterimTranscript called with:', { text, confidence, length: text?.length });
    this.transcriptManager.addInterimText(text, confidence);
    this.renderTranscript();
  }
  
  updateFinalTranscript(text, confidence = 1.0) {
    console.log('updateFinalTranscript called with:', { text, confidence, length: text?.length });
    this.transcriptManager.finalizeText(text, confidence);
    this.renderTranscript();
  }
  
  renderTranscript() {
    if (!this.transcriptContainer) {
      console.warn('renderTranscript: transcriptContainer is null');
      return;
    }
    
    // Clear container
    this.transcriptContainer.innerHTML = '';
    
    // Render transcript using TranscriptManager
    const transcriptElement = this.transcriptManager.render();
    this.transcriptContainer.appendChild(transcriptElement);
    
    // Debug: log what we're rendering
    const fullText = this.transcriptManager.getFullTranscript();
    console.log('renderTranscript: rendered', fullText.length, 'chars');
    
    // Scroll to bottom
    this.transcriptContainer.scrollTop = this.transcriptContainer.scrollHeight;
  }
  
  updateRecordingIndicator() {
    if (!this.recordingIndicator || !this.audioManager) return;
    
    const elapsedSeconds = Math.floor(this.audioManager.getElapsedTime() / 1000);
    
    this.recordingIndicator.show({
      isRecording: this.audioManager.isRecording() || this.audioManager.isPaused(),
      isPaused: this.audioManager.isPaused(),
      elapsedTime: elapsedSeconds,
      connectionStatus: this.connectionState,
      reconnectAttempt: this.reconnectAttempt
    });
  }
  
  startIndicatorTimer() {
    this.indicatorTimerInterval = setInterval(() => {
      this.updateRecordingIndicator();
    }, 1000);
  }
  
  stopIndicatorTimer() {
    if (this.indicatorTimerInterval) {
      clearInterval(this.indicatorTimerInterval);
      this.indicatorTimerInterval = null;
    }
  }
  
  updateStatus(status) {
    console.log('Status update:', status);
  }
  
  handleSessionFinalized(voiceNote, proposal) {
    console.log('Session finalized:', voiceNote, proposal);
    
    this.hideProcessingStatus();
    
    // Mark recording as finished
    if (window.enrichmentReview) {
      window.enrichmentReview.isRecording = false;
    }
    
    // Display final transcript if not already shown
    if (voiceNote.transcript && this.transcriptManager.getWordCount() === 0) {
      this.transcriptManager.finalizeText(voiceNote.transcript, 1.0);
      this.renderTranscript();
    }
    
    showToast('Voice note processed successfully!', 'success');
    
    // Check if we have enrichment proposal with items
    const hasProposalItems = proposal && 
      proposal.contactProposals && 
      proposal.contactProposals.some(cp => cp.items && cp.items.length > 0);
    
    if (hasProposalItems && window.enrichmentReview) {
      // Use the server's final proposal (more accurate)
      window.enrichmentReview.display(proposal, async (approvedProposal) => {
        await this.applyEnrichment(voiceNote.id, approvedProposal);
      });
    } else if (window.enrichmentReview && window.enrichmentReview.proposal) {
      // Keep the live proposal if server didn't return items
      // Just update the callback for applying
      window.enrichmentReview.onApplyCallback = async (approvedProposal) => {
        await this.applyEnrichment(voiceNote.id, approvedProposal);
      };
    } else {
      // No enrichment, just show success and reset
      setTimeout(() => {
        this.resetUI();
      }, 2000);
    }
  }
  
  sendAudioChunk(audioBlob) {
    audioBlob.arrayBuffer().then(buffer => {
      const wsOpen = this.websocket && this.websocket.readyState === WebSocket.OPEN;
      const hasSession = !!this.sessionId;
      
      if (wsOpen && hasSession) {
        // Send immediately if connected and session is ready
        console.log('Sending audio chunk:', buffer.byteLength, 'bytes');
        this.websocket.send(buffer);
      } else if (this.audioManager && (this.audioManager.isRecording() || this.audioManager.isPaused())) {
        // Buffer audio if session not ready yet or disconnected but still recording
        console.log('Buffering audio chunk:', buffer.byteLength, 'bytes (wsOpen:', wsOpen, 'hasSession:', hasSession, ')');
        this.bufferAudioChunk(buffer);
      }
    });
  }
  
  /**
   * Buffer audio chunk during disconnection
   * Implements memory limit of 100MB
   */
  bufferAudioChunk(buffer) {
    // If a single chunk exceeds the max buffer size, we can't buffer it
    // In this case, clear the buffer and don't add the chunk
    if (buffer.byteLength > this.maxBufferSize) {
      console.warn('Single audio chunk exceeds buffer limit, clearing buffer');
      this.audioBuffer = [];
      return;
    }
    
    // Calculate current buffer size
    let currentSize = this.audioBuffer.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    
    // Remove oldest chunks if we would exceed the limit
    while (this.audioBuffer.length > 0 && 
           currentSize + buffer.byteLength > this.maxBufferSize) {
      const removed = this.audioBuffer.shift();
      currentSize -= removed.byteLength;
      console.warn('Audio buffer limit reached, dropping oldest chunk');
    }
    
    // Add new chunk to buffer
    this.audioBuffer.push(buffer);
    console.log(`Buffered audio chunk (${this.audioBuffer.length} chunks, ${currentSize + buffer.byteLength} bytes)`);
  }
  
  async stopRecording() {
    if (!this.audioManager || (!this.audioManager.isRecording() && !this.audioManager.isPaused())) {
      return;
    }
    
    try {
      // Stop indicator timer
      this.stopIndicatorTimer();
      
      // Hide recording indicator
      this.recordingIndicator.hide();
      
      // Stop audio manager and get audio blob
      const audioBlob = await this.audioManager.stop();
      
      // Update UI
      this.updateUIForStopped();
      
      this.showProcessingStatus('Processing voice note...');
      
      // Send end_session message to WebSocket with user contacts
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // Get user contacts for enrichment
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        try {
          const contactsResponse = await fetch(`/api/contacts?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const userContacts = contactsResponse.ok ? await contactsResponse.json() : [];
          
          this.websocket.send(JSON.stringify({
            type: 'end_session',
            data: {
              userContacts: userContacts
            }
          }));
          
          // Wait for session_finalized message
          // The handleSessionFinalized method will handle the response
          
        } catch (error) {
          console.error('Error fetching contacts:', error);
          // Fallback to old method if WebSocket fails
          await this.finalizeRecording(audioBlob);
        }
      } else {
        // Fallback to old method if WebSocket not available
        await this.finalizeRecording(audioBlob);
      }
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.showError('Failed to stop recording.');
      this.cleanup();
    }
  }
  
  async finalizeRecording(audioBlob) {
    try {
      // Close WebSocket if exists
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
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
      
      // Display transcript using TranscriptManager
      if (voiceNote.transcript) {
        this.transcriptManager.finalizeText(voiceNote.transcript, 1.0);
        this.renderTranscript();
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
  
  updateUIForRecording() {
    if (this.recordButton) {
      this.recordButton.classList.add('hidden');
    }
    
    if (this.stopButton) {
      this.stopButton.classList.remove('hidden');
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
    
    const waveformContainer = document.getElementById('waveform-container');
    if (waveformContainer) {
      waveformContainer.classList.add('hidden');
    }
  }
  
  resetUI() {
    // Clear transcript manager
    if (this.transcriptManager) {
      this.transcriptManager.clear();
    }
    
    // Clear transcript display
    if (this.transcriptContainer) {
      this.transcriptContainer.innerHTML = '';
    }
    
    // Clear visualization warnings
    if (this.visualizationWarnings) {
      this.visualizationWarnings.innerHTML = '';
    }
    
    // Clear enrichment panel
    if (this.enrichmentPanel) {
      this.enrichmentPanel.clear();
      this.enrichmentPanel.hide();
    }
    
    this.sessionId = null;
  }
  
  cleanup() {
    // Stop indicator timer
    this.stopIndicatorTimer();
    
    // Hide recording indicator
    if (this.recordingIndicator) {
      this.recordingIndicator.hide();
    }
    
    // Cleanup audio manager
    if (this.audioManager) {
      // AudioManager handles its own cleanup in stop()
      this.audioManager = null;
    }
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Reset connection state
    this.connectionState = 'disconnected';
    this.reconnectAttempt = 0;
    this.audioBuffer = [];
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
