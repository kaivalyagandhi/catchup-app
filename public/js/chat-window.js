/**
 * Chat Window Component
 *
 * Overlay interface for conversational interaction with the system.
 * Displays messages, handles voice input, and shows disambiguation options.
 *
 * Requirements: 2.2, 2.3, 3.1-3.9, 4.3, 6.1-6.5
 */

class ChatWindow {
  constructor(options = {}) {
    this.isOpen = false;
    this.sessionId = null;
    this.messages = [];
    this.pendingEditCount = 0;
    this.isRecording = false;
    this.onClose = options.onClose || (() => {});
    this.onCancelSession = options.onCancelSession || (() => {});
    this.onStartRecording = options.onStartRecording || (() => {});
    this.onStopRecording = options.onStopRecording || (() => {});
    this.onSendMessage = options.onSendMessage || (() => {});
    this.onEditClick = options.onEditClick || (() => {});
    this.onDisambiguationSelect = options.onDisambiguationSelect || (() => {});
    this.onCounterClick = options.onCounterClick || (() => {});
    
    this.element = null;
    this.messagesContainer = null;
    this.inputElement = null;
    this.counterElement = null;
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
            <button class="chat-window__counter" aria-label="View pending edits">
              <span class="chat-window__counter-value">0</span>
              <span class="chat-window__counter-label">pending</span>
            </button>
            <button class="chat-window__cancel-btn" aria-label="Clear this chat and pending edits">
              Clear
            </button>
            <button class="chat-window__close-btn" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="chat-window__messages" role="log" aria-live="polite"></div>
        <div class="chat-window__audio-indicator hidden" aria-label="Audio level indicator">
          <div class="chat-window__audio-bar"></div>
          <div class="chat-window__audio-bar"></div>
          <div class="chat-window__audio-bar"></div>
          <div class="chat-window__audio-bar"></div>
          <div class="chat-window__audio-bar"></div>
        </div>
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
    this.counterElement = this.element.querySelector('.chat-window__counter-value');

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

    // Clear button
    const clearBtn = this.element.querySelector('.chat-window__cancel-btn');
    clearBtn.addEventListener('click', () => this.handleClear());

    // Counter click
    const counterBtn = this.element.querySelector('.chat-window__counter');
    counterBtn.addEventListener('click', () => this.onCounterClick());

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
    }
  }

  /**
   * Close the chat window (preserve edits)
   */
  close() {
    this.isOpen = false;
    
    if (this.element) {
      this.element.classList.remove('chat-window--open');
    }
    
    this.onClose();
  }

  /**
   * Handle clear button click
   */
  handleClear() {
    // Clear messages and show notification
    this.clearMessages();
    this.onCancelSession();
    this.showClearNotification();
  }

  /**
   * Toggle voice recording
   */
  async toggleRecording() {
    const micBtn = this.element.querySelector('.chat-window__mic-btn');
    const audioIndicator = this.element.querySelector('.chat-window__audio-indicator');
    
    if (this.isRecording) {
      // Stop recording
      this.isRecording = false;
      micBtn.classList.remove('chat-window__mic-btn--recording');
      micBtn.setAttribute('aria-label', 'Start voice recording');
      if (audioIndicator) audioIndicator.classList.add('hidden');
      
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
      if (audioIndicator) audioIndicator.classList.remove('hidden');
      
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
          if (audioIndicator) audioIndicator.classList.add('hidden');
        }
      } else {
        console.warn('[ChatWindow] voiceNoteRecorder not available');
      }
      
      this.onStartRecording();
    }
  }

  /**
   * Set recording state externally
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
    const micBtn = this.element?.querySelector('.chat-window__mic-btn');
    const audioIndicator = this.element?.querySelector('.chat-window__audio-indicator');
    
    if (micBtn) {
      if (isRecording) {
        micBtn.classList.add('chat-window__mic-btn--recording');
        micBtn.setAttribute('aria-label', 'Stop voice recording');
        if (audioIndicator) audioIndicator.classList.remove('hidden');
      } else {
        micBtn.classList.remove('chat-window__mic-btn--recording');
        micBtn.setAttribute('aria-label', 'Start voice recording');
        if (audioIndicator) audioIndicator.classList.add('hidden');
      }
    }
  }

  /**
   * Update audio level visualization
   * @param {number} level - Audio level from 0 to 1
   */
  setAudioLevel(level) {
    const bars = this.element?.querySelectorAll('.chat-window__audio-bar');
    if (!bars || bars.length === 0) return;
    
    // Map level (0-1) to number of active bars (0-5)
    const activeBars = Math.ceil(level * 5);
    
    bars.forEach((bar, index) => {
      if (index < activeBars) {
        bar.classList.add('active');
        // Vary height based on level
        const height = 8 + (level * 16) + (Math.random() * 4);
        bar.style.height = `${height}px`;
      } else {
        bar.classList.remove('active');
        bar.style.height = '4px';
      }
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

    // Timestamp
    const time = document.createElement('span');
    time.className = 'chat-message__time';
    time.textContent = this.formatTime(message.timestamp);

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
    } else {
      content.textContent = message.content;
    }

    el.appendChild(content);
    el.appendChild(time);

    // Add disambiguation options if present
    if (message.disambiguationOptions && message.disambiguationOptions.length > 0) {
      const optionsEl = this.createDisambiguationOptions(message.disambiguationOptions);
      el.appendChild(optionsEl);
    }

    return el;
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
   * Update pending edits counter
   * Requirements: 6.1, 6.2, 6.3
   */
  setPendingEditCount(count) {
    const previousCount = this.pendingEditCount;
    this.pendingEditCount = count;

    if (this.counterElement) {
      this.counterElement.textContent = count.toString();
      
      // Animate if count changed
      if (count !== previousCount) {
        this.counterElement.classList.add('chat-window__counter-value--animate');
        setTimeout(() => {
          this.counterElement?.classList.remove('chat-window__counter-value--animate');
        }, 300);
      }

      // Muted state when zero
      const counterBtn = this.element?.querySelector('.chat-window__counter');
      if (counterBtn) {
        counterBtn.classList.toggle('chat-window__counter--muted', count === 0);
      }
    }
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
   * Show clear notification
   */
  showClearNotification() {
    const notification = document.createElement('div');
    notification.className = 'chat-window__notification chat-window__notification--clear';
    notification.textContent = '✓ Chat and edits cleared';
    
    if (this.messagesContainer) {
      this.messagesContainer.appendChild(notification);
      this.scrollToBottom();
      
      setTimeout(() => {
        notification.classList.add('chat-window__notification--fade');
        setTimeout(() => notification.remove(), 300);
      }, 2500);
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
    this.counterElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatWindow };
}
