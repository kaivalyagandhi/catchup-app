/**
 * TranscriptManager - Manages transcript state with interim/final text handling
 * 
 * Implements segment-based transcript management with support for interim and final
 * text, pause markers, confidence tracking, and word counting.
 */

class TranscriptManager {
  constructor() {
    // State
    this.segments = [];
    this.currentInterim = null;
    this.wordCount = 0;
    this.lastFinalizedAt = Date.now();
    this.nextSegmentId = 0;
  }
  
  /**
   * Add interim (temporary) transcript text
   * @param {string} text - The interim text
   * @param {number} confidence - Confidence score (0-1)
   */
  addInterimText(text, confidence) {
    if (!text || text.trim().length === 0) {
      return;
    }
    
    // Store or update current interim segment
    this.currentInterim = {
      id: `interim-${this.nextSegmentId}`,
      text: text.trim(),
      isFinal: false,
      confidence: confidence,
      timestamp: Date.now(),
      isPauseMarker: false
    };
  }
  
  /**
   * Finalize transcript text (convert interim to final)
   * @param {string} text - The final text
   * @param {number} confidence - Confidence score (0-1)
   */
  finalizeText(text, confidence) {
    if (!text || text.trim().length === 0) {
      return;
    }
    
    const finalText = text.trim();
    
    // Create final segment
    const segment = {
      id: `final-${this.nextSegmentId++}`,
      text: finalText,
      isFinal: true,
      confidence: confidence,
      timestamp: Date.now(),
      isPauseMarker: false
    };
    
    // Add to segments
    this.segments.push(segment);
    
    // Update word count
    this.wordCount += this._countWords(finalText);
    
    // Clear current interim
    this.currentInterim = null;
    
    // Update last finalized timestamp
    this.lastFinalizedAt = Date.now();
  }
  
  /**
   * Insert a pause marker in the transcript
   */
  insertPauseMarker() {
    const marker = {
      id: `pause-${this.nextSegmentId++}`,
      text: '⏸',
      isFinal: true,
      confidence: 1.0,
      timestamp: Date.now(),
      isPauseMarker: true
    };
    
    this.segments.push(marker);
  }
  
  /**
   * Get the final transcript (only finalized text)
   * @returns {string}
   */
  getFinalTranscript() {
    return this.segments
      .filter(seg => !seg.isPauseMarker)
      .map(seg => seg.text)
      .join(' ');
  }
  
  /**
   * Get the full transcript (final + current interim)
   * @returns {string}
   */
  getFullTranscript() {
    const finalText = this.getFinalTranscript();
    
    if (this.currentInterim) {
      return finalText + (finalText ? ' ' : '') + this.currentInterim.text;
    }
    
    return finalText;
  }
  
  /**
   * Get word count (only finalized text)
   * @returns {number}
   */
  getWordCount() {
    return this.wordCount;
  }
  
  /**
   * Get all segments (for debugging/inspection)
   * @returns {Array}
   */
  getSegments() {
    return [...this.segments];
  }
  
  /**
   * Get current interim segment
   * @returns {Object|null}
   */
  getCurrentInterim() {
    return this.currentInterim;
  }
  
  /**
   * Clear all transcript data
   */
  clear() {
    this.segments = [];
    this.currentInterim = null;
    this.wordCount = 0;
    this.lastFinalizedAt = Date.now();
    this.nextSegmentId = 0;
  }
  
  /**
   * Render transcript as HTML element
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'transcript-container';
    
    // Render final segments
    this.segments.forEach(segment => {
      const element = this._renderSegment(segment);
      container.appendChild(element);
    });
    
    // Render current interim
    if (this.currentInterim) {
      const element = this._renderSegment(this.currentInterim);
      container.appendChild(element);
    }
    
    return container;
  }
  
  /**
   * Render a single segment
   * @private
   * @param {Object} segment - The segment to render
   * @returns {HTMLElement}
   */
  _renderSegment(segment) {
    if (segment.isPauseMarker) {
      const marker = document.createElement('span');
      marker.className = 'transcript-pause-marker';
      marker.textContent = ' ⏸ ';
      marker.title = 'Recording paused';
      return marker;
    }
    
    const span = document.createElement('span');
    span.className = 'transcript-segment';
    span.dataset.segmentId = segment.id;
    span.dataset.confidence = segment.confidence;
    
    // Apply confidence-based styling
    if (segment.isFinal) {
      span.classList.add('transcript-final');
      
      // Add confidence class
      if (segment.confidence >= 0.9) {
        span.classList.add('confidence-high');
      } else if (segment.confidence >= 0.7) {
        span.classList.add('confidence-medium');
      } else {
        span.classList.add('confidence-low');
      }
    } else {
      span.classList.add('transcript-interim');
      
      // Interim text always gets confidence styling
      if (segment.confidence >= 0.9) {
        span.classList.add('confidence-high');
      } else if (segment.confidence >= 0.7) {
        span.classList.add('confidence-medium');
      } else {
        span.classList.add('confidence-low');
      }
    }
    
    span.textContent = segment.text + ' ';
    
    return span;
  }
  
  /**
   * Count words in text
   * @private
   * @param {string} text - The text to count words in
   * @returns {number}
   */
  _countWords(text) {
    if (!text || text.trim().length === 0) {
      return 0;
    }
    
    // Split by whitespace and filter empty strings
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.TranscriptManager = TranscriptManager;
}
