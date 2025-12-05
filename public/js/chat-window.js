/**
 * Chat Window Component
 *
 * Overlay interface for conversational interaction with the system.
 * Displays messages, handles voice input, and shows disambiguation options.
 *
 * Requirements: 2.2, 2.3, 3.1-3.9, 4.3
 */

class ChatWindow {
  constructor(options = {}) {
    this.isOpen = false;
    this.sessionId = null;
    this.messages = [];
    this.isRecording = false;
    this.onClose = options.onClose || (() => {});
    this.onStartRecording = options.onStartRecording || (() => {});
    this.onStopRecording = options.onStopRecording || (() => {});
    this.onSendMessage = options.onSendMessage || (() => {});
    this.onEditClick = options.onEditClick || (() => {});
    this.onDisambiguationSelect = options.onDisambiguationSelect || (() => {});
    
    this.element = null;
    this.messagesContainer = null;
    this.inputElement = null;
  }

  /**
   * Render the chat window
   */
  render() {
    this.element = document.createElement('div');
    this.element.className = 'chat-window';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-label', 'Chat interface for contact edits');

    this.element.innerHTML = `
      <div class="chat-window__container">
        <div class="chat-window__header">
          <h2 class="chat-window__title">CatchUp</h2>
          <div class="chat-window__header-actions">
            <button class="chat-window__close-btn" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="chat-window__messages" role="log" aria-live="polite"></div>
        <div class="chat-window__input-area">
          <input type="text" class="chat-window__text-input" placeholder="Type a message..." aria-label="Message input">
          <button class="chat-window__mic-btn" aria-label="Start voice recording">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <button class="chat-window__send-btn" aria-label="Send message">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Get references to elements
    this.messagesContainer = this.element.querySelector('.chat-window__messages');
    this.inputElement = this.element.querySelector('.chat-window__text-input');

    // Set up event listeners
    this.setupEventListeners();

    return this.element;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = this.element.querySelector('.chat-window__close-btn');
    closeBtn.addEventListener('click', () => this.close());

    // Mic button
    const micBtn = this.element.querySelector('.chat-window__mic-btn');
    micBtn.addEventListener('click', () => this.toggleRecording());

    // Send button
    const sendBtn = this.element.querySelector('.chat-window__send-btn');
    sendBtn.addEventListener('click', () => this.sendTextMessage());

    // Enter key to send
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTextMessage();
      }
    });

    // Escape key to close
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  /**
   * Open the chat window
   */
  open(sessionId) {
    this.isOpen = true;
    this.sessionId = sessionId;
    this.messages = [];
    
    if (this.element) {
      this.element.classList.add('chat-window--open');
      this.clearMessages();
      this.inputElement.focus();
      
      // Hide the floating chat button
      const floatingButton = document.querySelector('.floating-chat-icon');
      if (floatingButton) {
        floatingButton.classList.add('floating-chat-icon--hidden');
      }
    }
  }

  /**
   * Close the chat window (preserve edits)
   */
  close() {
    this.isOpen = false;
    
    if (this.element) {
      this.element.classList.remove('chat-window--open');
      
      // Show the floating chat button again
      const floatingButton = document.querySelector('.floating-chat-icon');
      if (floatingButton) {
        floatingButton.classList.remove('floating-chat-icon--hidden');
      }
    }
    
    this.onClose();
  }

  /**
   * Toggle voice recording
   */
  async toggleRecording() {
    const micBtn = this.element.querySelector('.chat-window__mic-btn');
    
    if (this.isRecording) {
      // Stop recording
      this.isRecording = false;
      micBtn.classList.remove('chat-window__mic-btn--recording');
      micBtn.setAttribute('aria-label', 'Start voice recording');
      this.updateMicIcon(false);
      
      // Stop the voice recording and process
      if (window.voiceNoteRecorder) {
        console.log('[ChatWindow] Stopping voice recording');
        await window.voiceNoteRecorder.stopRecording();
      }
      
      this.onStopRecording();
    } else {
      // Start recording
      this.isRecording = true;
      micBtn.classList.add('chat-window__mic-btn--recording');
      micBtn.setAttribute('aria-label', 'Stop voice recording');
      this.updateMicIcon(true);
      
      // Start the voice recording
      if (window.voiceNoteRecorder) {
        console.log('[ChatWindow] Starting voice recording');
        try {
          await window.voiceNoteRecorder.startRecording();
        } catch (error) {
          console.error('[ChatWindow] Failed to start recording:', error);
          this.isRecording = false;
          micBtn.classList.remove('chat-window__mic-btn--recording');
          micBtn.setAttribute('aria-label', 'Start voice recording');
          this.updateMicIcon(false);
        }
      } else {
        console.warn('[ChatWindow] voiceNoteRecorder not available');
      }
      
      this.onStartRecording();
    }
  }

  /**
   * Update mic button icon based on recording state
   */
  updateMicIcon(isRecording) {
    const micBtn = this.element?.querySelector('.chat-window__mic-btn');
    if (!micBtn) return;
    
    if (isRecording) {
      // Sound waveform icon when recording
      micBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="waveform-icon">
          <line x1="4" y1="8" x2="4" y2="16"></line>
          <line x1="8" y1="5" x2="8" y2="19"></line>
          <line x1="12" y1="3" x2="12" y2="21"></line>
          <line x1="16" y1="5" x2="16" y2="19"></line>
          <line x1="20" y1="8" x2="20" y2="16"></line>
        </svg>
      `;
    } else {
      // Microphone icon when not recording
      micBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      `;
    }
  }

  /**
   * Set recording state externally
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
    const micBtn = this.element?.querySelector('.chat-window__mic-btn');
    
    if (micBtn) {
      if (isRecording) {
        micBtn.classList.add('chat-window__mic-btn--recording');
        micBtn.setAttribute('aria-label', 'Stop voice recording');
      } else {
        micBtn.classList.remove('chat-window__mic-btn--recording');
        micBtn.setAttribute('aria-label', 'Start voice recording');
      }
    }
    
    this.updateMicIcon(isRecording);
  }

  /**
   * Update audio level - updates waveform and triggers glow on floating chat icon
   * @param {number} level - Audio level from 0 to 1
   */
  setAudioLevel(level) {
    // Update waveform in chat window mic button
    this.updateWaveform(level);
    
    // Trigger speaking glow and waveform on floating chat icon when audio level is significant
    const floatingIcon = window.floatingChatIcon;
    if (floatingIcon && this.isRecording) {
      // Threshold for "speaking" - level above 0.1 indicates voice activity
      const isSpeaking = level > 0.1;
      floatingIcon.setSpeakingState(isSpeaking);
      floatingIcon.setAudioLevel(level);
    }
  }

  /**
   * Update waveform visualization based on audio level
   * @param {number} level - Audio level from 0 to 1
   */
  updateWaveform(level) {
    if (!this.isRecording || !this.element) return;
    
    const micBtn = this.element.querySelector('.chat-window__mic-btn');
    if (!micBtn) return;
    
    const waveformIcon = micBtn.querySelector('.waveform-icon');
    if (!waveformIcon) return;
    
    const lines = waveformIcon.querySelectorAll('line');
    if (lines.length !== 5) return;
    
    // Minimum heights when silent (small bars visible)
    const minHeights = [2, 3, 4, 3, 2];
    // Maximum heights at full volume (dramatic range)
    const maxHeights = [6, 9, 11, 9, 6];
    
    // Add randomness for organic feel
    lines.forEach((line, index) => {
      const minH = minHeights[index];
      const maxH = maxHeights[index];
      // Random variation per bar
      const randomFactor = 0.8 + Math.random() * 0.4;
      // Interpolate between min and max based on level
      const height = minH + (maxH - minH) * level * randomFactor;
      
      // Calculate y1 and y2 centered at 12 (middle of 24px viewBox)
      const y1 = 12 - height;
      const y2 = 12 + height;
      
      line.setAttribute('y1', y1.toFixed(1));
      line.setAttribute('y2', y2.toFixed(1));
    });
  }

  /**
   * Send text message
   */
  sendTextMessage() {
    const text = this.inputElement.value.trim();
    if (!text) return;

    this.inputElement.value = '';
    this.onSendMessage(text);
  }

  /**
   * Add a message to the chat
   * Requirements: 3.1, 3.2, 3.9
   */
  addMessage(message) {
    this.messages.push(message);
    this.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    this.renderMessages();
    this.scrollToBottom();
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  /**
   * Render all messages
   */
  renderMessages() {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = '';

    for (const message of this.messages) {
      const messageEl = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageEl);
    }
  }

  /**
   * Create a message element
   * Requirements: 3.4, 3.6
   */
  createMessageElement(message) {
    const el = document.createElement('div');
    el.className = `chat-message chat-message--${message.type}`;
    el.setAttribute('data-message-id', message.id);

    // Content
    const content = document.createElement('div');
    content.className = 'chat-message__content';

    // Parse content for edit references
    if (message.editReferences && message.editReferences.length > 0) {
      content.innerHTML = this.parseContentWithEditRefs(message.content, message.editReferences);
      
      // Add click handlers for edit references
      content.querySelectorAll('.chat-message__edit-ref').forEach((ref) => {
        ref.addEventListener('click', () => {
          const editId = ref.getAttribute('data-edit-id');
          this.onEditClick(editId);
        });
      });
    } else if (message.action) {
      // Support for messages with clickable action links
      const parts = message.content.split(message.action.placeholder);
      content.appendChild(document.createTextNode(parts[0] || ''));
      
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'chat-message__action-link';
      link.textContent = message.action.text;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (message.action.navigate) {
          window.dispatchEvent(new CustomEvent('navigate-to', { detail: message.action.navigate }));
        }
      });
      content.appendChild(link);
      
      if (parts[1]) {
        content.appendChild(document.createTextNode(parts[1]));
      }
    } else {
      content.textContent = message.content;
    }

    el.appendChild(content);

    // Footer with timestamp and read receipt (for user messages)
    const footer = document.createElement('div');
    footer.className = 'chat-message__footer';

    // Timestamp
    const time = document.createElement('span');
    time.className = 'chat-message__time';
    time.textContent = this.formatTime(message.timestamp);
    footer.appendChild(time);

    // Add read receipt for user messages
    if (message.type === 'user') {
      const receipt = document.createElement('span');
      receipt.className = 'chat-message__receipt';
      receipt.setAttribute('data-status', message.status || 'sent');
      
      // Set receipt icon based on status
      receipt.innerHTML = this.getReceiptIcon(message.status || 'sent');
      footer.appendChild(receipt);
    }

    el.appendChild(footer);

    // Add disambiguation options if present
    if (message.disambiguationOptions && message.disambiguationOptions.length > 0) {
      const optionsEl = this.createDisambiguationOptions(message.disambiguationOptions);
      el.appendChild(optionsEl);
    }

    return el;
  }

  /**
   * Get the receipt icon SVG based on status
   */
  getReceiptIcon(status) {
    switch (status) {
      case 'sent':
        // Single check - message sent
        return `<svg class="receipt-icon receipt-icon--sent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
      case 'delivered':
        // Double check - message delivered
        return `<svg class="receipt-icon receipt-icon--delivered" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 6 7 17 2 12"></polyline>
          <polyline points="22 6 11 17 8 14"></polyline>
        </svg>`;
      case 'read':
        // Double check filled - message read
        return `<svg class="receipt-icon receipt-icon--read" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 6 7 17 2 12"></polyline>
          <polyline points="22 6 11 17 8 14"></polyline>
        </svg>`;
      case 'processing':
        // Animated dots - processing
        return `<span class="receipt-dots">
          <span class="receipt-dot"></span>
          <span class="receipt-dot"></span>
          <span class="receipt-dot"></span>
        </span>`;
      default:
        return '';
    }
  }

  /**
   * Update message status (for read receipts)
   */
  updateMessageStatus(messageId, status) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      
      // Update the DOM element
      const el = this.messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
      if (el) {
        const receipt = el.querySelector('.chat-message__receipt');
        if (receipt) {
          receipt.setAttribute('data-status', status);
          receipt.innerHTML = this.getReceiptIcon(status);
        }
      }
    }
  }

  /**
   * Parse content and replace edit references with clickable elements
   */
  parseContentWithEditRefs(content, editReferences) {
    let html = content;
    
    for (const ref of editReferences) {
      const placeholder = `[${ref.displayText}]`;
      const replacement = `<button class="chat-message__edit-ref" data-edit-id="${ref.editId}" data-edit-type="${ref.editType}">${ref.displayText}</button>`;
      html = html.replace(placeholder, replacement);
    }
    
    return html;
  }

  /**
   * Create disambiguation options UI
   * Requirements: 8.2
   */
  createDisambiguationOptions(options) {
    const container = document.createElement('div');
    container.className = 'chat-message__disambiguation';

    for (const option of options) {
      const btn = document.createElement('button');
      btn.className = 'chat-message__disambiguation-option';
      btn.innerHTML = `
        <span class="disambiguation-option__name">${option.contactName}</span>
        <span class="disambiguation-option__score">${Math.round(option.similarityScore * 100)}% match</span>
      `;
      btn.addEventListener('click', () => {
        this.onDisambiguationSelect(option.contactId);
      });
      container.appendChild(btn);
    }

    return container;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Show edit detection notification
   * Requirements: 12.4
   */
  showEditNotification(editType) {
    const notification = document.createElement('div');
    notification.className = 'chat-window__notification';
    notification.textContent = `Detected: ${this.formatEditType(editType)}`;
    
    if (this.messagesContainer) {
      this.messagesContainer.appendChild(notification);
      this.scrollToBottom();
      
      setTimeout(() => {
        notification.classList.add('chat-window__notification--fade');
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }
  }

  /**
   * Format edit type for display
   */
  formatEditType(editType) {
    const typeMap = {
      'create_contact': 'New contact',
      'update_contact_field': 'Contact update',
      'add_tag': 'New tag',
      'remove_tag': 'Tag removal',
      'add_to_group': 'Group assignment',
      'remove_from_group': 'Group removal',
      'create_group': 'New group',
    };
    return typeMap[editType] || editType;
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.messagesContainer = null;
    this.inputElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatWindow };
}
