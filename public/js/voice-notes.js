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
    this.chatSessionId = null;
    this.connectionState = 'disconnected';
    this.reconnectAttempt = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectTimeout = null;
    this.audioBuffer = [];
    this.maxBufferSize = 100 * 1024 * 1024; // 100MB
    
    // UI Elements
    this.errorDisplay = null;
    
    // Enrichment panel
    this.enrichmentPanel = null;
    
    // Enrichment state
    this.currentEnrichmentProposal = null;
    this.userApprovedEnrichment = null;
    

    
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
    // Find chat window messages container (where voice recorder UI should go)
    let chatMessages = document.querySelector('.chat-window__messages');
    
    if (!chatMessages) {
      console.log('[VoiceNotes] Chat window not found, creating standalone container');
      chatMessages = document.createElement('div');
      chatMessages.id = 'voice-content';
      document.body.appendChild(chatMessages);
    }
    
    // Create a minimal wrapper for error display only
    const wrapper = document.createElement('div');
    wrapper.className = 'voice-recorder-wrapper';
    wrapper.innerHTML = `
      <div class="voice-recorder-container">
        <!-- Error Display -->
        <div id="voice-error" class="error hidden"></div>
      </div>
    `;
    
    // Append wrapper to chat messages
    chatMessages.appendChild(wrapper);
    
    // Create enrichment review container as a floating panel (visible during recording)
    const enrichmentContainer = document.createElement('div');
    enrichmentContainer.id = 'enrichment-review-container';
    enrichmentContainer.className = 'enrichment-review-floating';
    document.body.appendChild(enrichmentContainer);
    
    // Get UI element references
    this.errorDisplay = document.getElementById('voice-error');
    
    this.addStyles();
  }
  
  addStyles() {
    if (document.getElementById('voice-notes-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'voice-notes-styles';
    style.textContent = `
      /* Floating enrichment panel during recording */
      .enrichment-review-floating {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        overflow-y: auto;
        display: none;
      }
      
      .enrichment-review-floating:not(:empty) {
        display: block;
      }
      
      @media (max-width: 1024px) {
        .enrichment-review-floating {
          width: 350px;
          top: 10px;
          right: 10px;
        }
      }
      
      @media (max-width: 768px) {
        .enrichment-review-floating {
          width: calc(100% - 20px);
          top: 10px;
          right: 10px;
          left: 10px;
          max-height: 400px;
        }
      }
      
      .voice-recorder-wrapper {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  attachEventListeners() {
    // Event listeners removed - recording is now triggered via enrichment panel
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
      
      // Create chat session for pending edits
      console.log('Creating chat session...');
      await this.createSession();
      console.log('Chat session created:', this.chatSessionId);
      
      // Connect WebSocket for real-time transcription
      await this.connectWebSocket();
      
      // Show recording indicator
      this.updateRecordingIndicator();
      
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
    
    // Level change callback - triggers waveform and glow on floating chat icon
    this.audioManager.onLevelChange = (levelDb) => {
      // Convert dB level to 0-1 range with more sensitivity
      // Typical speech is around -30 to -10 dB, silence is below -50 dB
      // Amplify the range for more dramatic effect
      const normalizedLevel = Math.max(0, Math.min(1, (levelDb + 45) / 35));
      // Apply exponential curve for more dramatic response
      const amplifiedLevel = Math.pow(normalizedLevel, 0.7);
      
      // Update floating chat icon with speaking state and waveform
      if (window.floatingChatIcon && this.audioManager.isRecording()) {
        const isSpeaking = amplifiedLevel > 0.15; // Lower threshold for more sensitivity
        window.floatingChatIcon.setSpeakingState(isSpeaking);
        window.floatingChatIcon.setAudioLevel(amplifiedLevel);
      }
      
      // Also update chat window if open
      if (window.chatWindow) {
        window.chatWindow.setAudioLevel(amplifiedLevel);
      }
    };
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
      
      // Update recording indicator
      this.updateRecordingIndicator();
      
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
      
      // Create a chat session for this recording (needed for pending edits)
      // This is critical - without it, enrichment suggestions won't create pending edits
      const sessionResponse = await fetch('/api/edits/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        console.error('[VoiceNotes] Failed to create chat session:', sessionResponse.status, errorData);
        throw new Error(`Failed to create chat session: ${errorData.error || sessionResponse.statusText}`);
      }
      
      const sessionData = await sessionResponse.json();
      this.chatSessionId = sessionData.session?.id || sessionData.id;
      
      if (!this.chatSessionId) {
        console.error('[VoiceNotes] Chat session created but no ID returned:', sessionData);
        throw new Error('Chat session created but no ID returned');
      }
      
      console.log('[VoiceNotes] ✓ Created chat session:', this.chatSessionId);
      
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
        this.handleEnrichmentUpdate(data);
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
  
  handleEnrichmentUpdate(data) {
    // Handle both old format (suggestions array) and new format (grouped by contact)
    let contactId, contactName, suggestions, sessionId;
    
    if (Array.isArray(data)) {
      // Old format: array of suggestions
      console.log('[VoiceNotes] Received suggestions in old format:', data.length, 'suggestions');
      suggestions = data;
      contactName = 'Unknown Contact';
      contactId = 'unknown';
      sessionId = null;
    } else {
      // New format: grouped by contact
      contactId = data.contactId;
      contactName = data.contactName;
      suggestions = data.suggestions;
      sessionId = data.sessionId;
      console.log('[VoiceNotes] Received grouped suggestions for contact:', contactName, 'count:', suggestions?.length || 0, 'sessionId:', sessionId);
    }
    
    console.log('[VoiceNotes] handleEnrichmentUpdate called with', suggestions?.length || 0, 'suggestions for contact:', contactName);
    
    // Display live suggestions in enrichment review panel during recording
    if (suggestions && suggestions.length > 0) {
      // Show enrichment review panel if not already visible
      if (window.enrichmentReview && !window.enrichmentReview.isRecording) {
        console.log('[VoiceNotes] Showing enrichment review in recording mode');
        window.enrichmentReview.showRecordingMode();
      }
      
      // Store sessionId in enrichmentReview for later use when applying suggestions
      if (window.enrichmentReview && sessionId) {
        window.enrichmentReview.currentSessionId = sessionId;
        console.log('[VoiceNotes] Set enrichmentReview sessionId:', sessionId);
      }
      
      // Add each suggestion to the contact modal
      for (const suggestion of suggestions) {
        if (window.enrichmentReview) {
          // Ensure suggestion has contact hint for grouping
          if (!suggestion.contactHint) {
            suggestion.contactHint = contactName;
          }
          console.log('[VoiceNotes] Adding live suggestion:', suggestion);
          window.enrichmentReview.addLiveSuggestion(suggestion);
        }
      }
      
      // Also create pending edits in background for persistence
      console.log('[VoiceNotes] Creating pending edits from suggestions');
      this.createPendingEditsFromSuggestions(suggestions);
    } else {
      console.log('[VoiceNotes] No suggestions to process');
    }
  }
  
  /**
   * Create pending edits from enrichment suggestions
   * This is called during recording to show edits in real-time
   */
  async createPendingEditsFromSuggestions(suggestions) {
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      
      console.log('[VoiceNotes] createPendingEditsFromSuggestions called with', suggestions.length, 'suggestions');
      console.log('[VoiceNotes] sessionId:', this.sessionId);
      
      if (!token || !userId) {
        console.error('[VoiceNotes] Missing auth token or userId');
        return;
      }
      
      // Fetch contacts once
      let contacts = [];
      try {
        const contactsResponse = await fetch(`/api/contacts?userId=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (contactsResponse.ok) {
          contacts = await contactsResponse.json();
          console.log('[VoiceNotes] Fetched', contacts.length, 'contacts');
        } else {
          console.warn('[VoiceNotes] Failed to fetch contacts:', contactsResponse.status);
        }
      } catch (err) {
        console.error('[VoiceNotes] Error fetching contacts:', err);
      }
      
      // Group suggestions by contact
      const contactMap = new Map();
      suggestions.forEach(suggestion => {
        const contactName = suggestion.contactHint || 'Unknown Contact';
        if (!contactMap.has(contactName)) {
          contactMap.set(contactName, []);
        }
        contactMap.get(contactName).push(suggestion);
      });
      
      console.log('[VoiceNotes] Grouped suggestions into', contactMap.size, 'contacts');
      
      // Create edits for each contact's suggestions
      for (const [contactName, contactSuggestions] of contactMap) {
        console.log('[VoiceNotes] Processing', contactSuggestions.length, 'suggestions for contact:', contactName);
        
        // Try to find the contact by name (exact match first, then fuzzy)
        let contact = contacts.find(c => c.name.toLowerCase() === contactName.toLowerCase());
        
        if (!contact) {
          // Try fuzzy matching
          const nameLower = contactName.toLowerCase();
          const nameParts = nameLower.split(/\s+/);
          contact = contacts.find(c => {
            const contactNameLower = c.name.toLowerCase();
            const contactParts = contactNameLower.split(/\s+/);
            return nameParts.some(part => 
              contactParts.some(cPart => 
                cPart.includes(part) || part.includes(cPart)
              )
            );
          });
        }
        
        if (!contact) {
          console.warn('[VoiceNotes] Could not find contact for:', contactName);
          continue;
        }
        
        console.log('[VoiceNotes] Found contact:', contact.name, 'ID:', contact.id);
        
        // Create an edit for each suggestion
        for (const suggestion of contactSuggestions) {
          try {
            // Skip if we don't have a valid chat session ID
            if (!this.chatSessionId) {
              console.warn('[VoiceNotes] Skipping edit creation - no chat session ID');
              continue;
            }
            
            // Map suggestion type to edit type and field
            let editType = 'add_tag';
            let field = undefined;
            
            if (suggestion.type === 'field') {
              // For field updates, use the field property directly
              editType = 'update_contact_field';
              field = suggestion.field;
            } else if (suggestion.type === 'tag') {
              editType = 'add_tag';
            } else if (suggestion.type === 'group') {
              editType = 'add_to_group';
            } else if (suggestion.type === 'lastContactDate') {
              editType = 'update_contact_field';
              field = 'lastContactDate';
            }
            
            console.log('[VoiceNotes] Creating edit:', editType, field ? `(${field})` : '', '=', suggestion.value, 'sessionId:', this.chatSessionId);
            
            // Create pending edit via API
            const editPayload = {
              sessionId: this.chatSessionId,
              editType,
              field,
              proposedValue: suggestion.value,
              targetContactId: contact.id,
              targetContactName: contact.name,
              confidenceScore: suggestion.confidence || 0.85,
              source: {
                type: 'voice_transcript',
                transcriptExcerpt: suggestion.sourceText?.substring(0, 200),
                timestamp: new Date().toISOString()
              }
            };
            
            console.log('[VoiceNotes] Edit payload:', JSON.stringify(editPayload));
            
            const editResponse = await fetch('/api/edits/pending', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-user-id': userId,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(editPayload)
            });
            
            if (editResponse.ok) {
              const editData = await editResponse.json();
              const editId = editData.edit.id;
              console.log('[VoiceNotes] ✓ Created pending edit:', editId);
              
              // Store the edit ID in the suggestion for later reference
              suggestion.editId = editId;
              
              // Dispatch event to refresh edits list
              window.dispatchEvent(new CustomEvent('edits-updated'));
            } else {
              const errorData = await editResponse.json();
              console.error('[VoiceNotes] ✗ Failed to create edit:', editResponse.status, errorData);
            }
          } catch (err) {
            console.error('[VoiceNotes] ✗ Exception creating edit:', err);
          }
        }
      }
    } catch (error) {
      console.error('[VoiceNotes] Error creating pending edits:', error);
    }
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
  }
  
  updateFinalTranscript(text, confidence = 1.0) {
    console.log('updateFinalTranscript called with:', { text, confidence, length: text?.length });
    this.transcriptManager.finalizeText(text, confidence);
  }
  
  renderTranscript() {
    // Transcript rendering removed - transcripts are now stored internally only
    const fullText = this.transcriptManager.getFullTranscript();
    console.log('Transcript updated:', fullText.length, 'chars');
  }
  
  updateRecordingIndicator() {
    // Recording indicator (top bar) removed per UX update
    // Recording state is now shown via floating chat icon
    if (!this.audioManager) return;
    
    // Update floating chat icon recording state
    if (window.floatingChatIcon) {
      const isRecording = this.audioManager.isRecording() || this.audioManager.isPaused();
      window.floatingChatIcon.setRecordingState(isRecording);
    }
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
    }
    
    showToast('Voice note processed successfully!', 'success');
    
    // Enrichment is now creating pending edits automatically
    // No need to show enrichment review or apply manually
    // Just show success and reset UI
    showToast('Voice note saved! Check pending edits for enrichment.', 'success');
    
    setTimeout(() => {
      this.resetUI();
      // Dispatch event to refresh edits list
      window.dispatchEvent(new CustomEvent('edits-updated'));
    }, 2000);
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
      
      // Update floating chat icon to not recording
      if (window.floatingChatIcon) {
        window.floatingChatIcon.setRecordingState(false);
        window.floatingChatIcon.setSpeakingState(false);
      }
      
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
      
      // Resolve contact names to actual contact IDs
      const resolvedProposal = await this.resolveContactIds(proposal, token, userId);
      
      const response = await fetch(`/api/voice-notes/${voiceNoteId}/enrichment/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, enrichmentProposal: resolvedProposal })
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
  
  /**
   * Resolve contact names in proposal to actual contact IDs
   */
  async resolveContactIds(proposal, token, userId) {
    try {
      // Fetch user's contacts
      const contactsResponse = await fetch(`/api/contacts?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!contactsResponse.ok) {
        console.warn('Failed to fetch contacts for ID resolution');
        return proposal;
      }
      
      const contacts = await contactsResponse.json();
      
      // Create a map of contact names to IDs
      const nameToIdMap = new Map();
      contacts.forEach(contact => {
        nameToIdMap.set(contact.name.toLowerCase(), contact.id);
      });
      
      // Resolve contact IDs in proposal
      const resolvedProposal = {
        ...proposal,
        contactProposals: proposal.contactProposals.map(cp => {
          // Try to find the real contact ID by name
          const realContactId = nameToIdMap.get(cp.contactName.toLowerCase());
          
          if (realContactId) {
            console.log(`[VoiceNotes] Resolved contact "${cp.contactName}" to ID: ${realContactId}`);
            return {
              ...cp,
              contactId: realContactId
            };
          } else {
            console.warn(`[VoiceNotes] Could not resolve contact ID for "${cp.contactName}"`);
            return cp;
          }
        })
      };
      
      return resolvedProposal;
    } catch (error) {
      console.error('Error resolving contact IDs:', error);
      return proposal;
    }
  }
  
  updateUIForRecording() {
    // UI updates removed - recording is now background-only
  }
  
  updateUIForStopped() {
    // UI updates removed - recording is now background-only
  }
  
  resetUI() {
    // Clear transcript manager
    if (this.transcriptManager) {
      this.transcriptManager.clear();
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
    
    // Update floating chat icon to not recording
    if (window.floatingChatIcon) {
      window.floatingChatIcon.setRecordingState(false);
      window.floatingChatIcon.setSpeakingState(false);
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
    // Processing status UI removed - logging only
    console.log('[VoiceNotes] Status:', message);
  }
  
  hideProcessingStatus() {
    // Processing status UI removed
  }
}

// Initialize voice note recorder when voice page is loaded
let voiceNoteRecorder = null;

function initVoiceNotesPage() {
  if (!voiceNoteRecorder) {
    voiceNoteRecorder = new VoiceNoteRecorder();
    // Expose globally for use in other components (e.g., chat window)
    if (typeof window !== 'undefined') {
      window.voiceNoteRecorder = voiceNoteRecorder;
    }
  }
}

// Initialize voice recorder globally on page load (for chat window and other components)
function initGlobalVoiceRecorder() {
  if (!window.voiceNoteRecorder) {
    voiceNoteRecorder = new VoiceNoteRecorder();
    window.voiceNoteRecorder = voiceNoteRecorder;
    console.log('[VoiceNotes] Global voice recorder initialized');
  }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.initVoiceNotesPage = initVoiceNotesPage;
  window.initGlobalVoiceRecorder = initGlobalVoiceRecorder;
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalVoiceRecorder);
  } else {
    initGlobalVoiceRecorder();
  }
}
