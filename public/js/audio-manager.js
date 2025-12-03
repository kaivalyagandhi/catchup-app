/**
 * AudioManager - Manages audio capture with pause/resume and level detection
 * 
 * Implements MediaRecorder wrapper with state management, elapsed time tracking,
 * audio chunk buffering, and audio level detection.
 */

class AudioManager {
  constructor(config = {}) {
    // Configuration
    this.config = {
      sampleRate: config.sampleRate || 16000,
      chunkIntervalMs: config.chunkIntervalMs || 100,
      maxBufferSizeBytes: config.maxBufferSizeBytes || 100 * 1024 * 1024, // 100MB
      silenceThresholdDb: config.silenceThresholdDb || -50,
      silenceTimeoutMs: config.silenceTimeoutMs || 3000,
      lowLevelThresholdDb: config.lowLevelThresholdDb || -40,
      clippingThresholdDb: config.clippingThresholdDb || 0,
    };
    
    // State
    this.state = 'inactive'; // 'inactive', 'recording', 'paused'
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    
    // Timing
    this.startTime = null;
    this.pauseTime = null;
    this.totalPausedDuration = 0;
    this.elapsedTime = 0;
    
    // Buffering
    this.audioChunks = [];
    this.bufferSizeBytes = 0;
    
    // Audio level detection
    this.currentLevel = -Infinity;
    this.silenceStartTime = null;
    this.levelCheckInterval = null;
    
    // Event callbacks
    this.onAudioChunk = null;
    this.onLevelChange = null;
    this.onSilenceDetected = null;
    this.onClippingDetected = null;
    this.onLowLevelDetected = null;
  }
  
  /**
   * Start audio recording
   * @returns {Promise<void>}
   */
  async start() {
    if (this.state !== 'inactive') {
      throw new Error('AudioManager is already active');
    }
    
    try {
      // Request microphone access
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate
        }
      };
      
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Setup audio analysis (creates audioContext)
      this._setupAudioAnalysis();
      
      // Setup MediaRecorder and PCM processor
      this._setupMediaRecorder();
      
      // Start recording
      console.log('Starting MediaRecorder with timeslice:', this.config.chunkIntervalMs);
      this.mediaRecorder.start(this.config.chunkIntervalMs);
      console.log('MediaRecorder state after start:', this.mediaRecorder.state);
      
      // Update state
      this.state = 'recording';
      this.startTime = Date.now();
      this.totalPausedDuration = 0;
      
      // Start level monitoring
      this._startLevelMonitoring();
      
    } catch (error) {
      this._cleanup();
      throw error;
    }
  }
  
  /**
   * Pause audio recording
   */
  pause() {
    if (this.state !== 'recording') {
      throw new Error('AudioManager is not recording');
    }
    
    // Pause MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
    
    // Update state
    this.state = 'paused';
    this.pauseTime = Date.now();
    
    // Stop level monitoring
    this._stopLevelMonitoring();
  }
  
  /**
   * Resume audio recording
   */
  resume() {
    if (this.state !== 'paused') {
      throw new Error('AudioManager is not paused');
    }
    
    // Calculate paused duration
    if (this.pauseTime) {
      this.totalPausedDuration += Date.now() - this.pauseTime;
      this.pauseTime = null;
    }
    
    // Resume MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
    
    // Update state
    this.state = 'recording';
    
    // Restart level monitoring
    this._startLevelMonitoring();
  }
  
  /**
   * Stop audio recording and return audio blob
   * @returns {Promise<Blob>}
   */
  async stop() {
    if (this.state === 'inactive') {
      throw new Error('AudioManager is not active');
    }
    
    return new Promise((resolve, reject) => {
      // Setup stop handler
      const handleStop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this._getSupportedMimeType() 
        });
        
        this._cleanup();
        resolve(audioBlob);
      };
      
      // Stop MediaRecorder
      if (this.mediaRecorder) {
        this.mediaRecorder.onstop = handleStop;
        
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          handleStop();
        }
      } else {
        reject(new Error('MediaRecorder not initialized'));
      }
    });
  }
  
  /**
   * Check if currently recording
   * @returns {boolean}
   */
  isRecording() {
    return this.state === 'recording';
  }
  
  /**
   * Check if currently paused
   * @returns {boolean}
   */
  isPaused() {
    return this.state === 'paused';
  }
  
  /**
   * Get elapsed recording time (excluding paused duration)
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    if (this.state === 'inactive') {
      return 0;
    }
    
    const now = Date.now();
    const totalTime = now - this.startTime;
    
    // If currently paused, add current pause duration
    const currentPauseDuration = this.state === 'paused' && this.pauseTime
      ? now - this.pauseTime
      : 0;
    
    return totalTime - this.totalPausedDuration - currentPauseDuration;
  }
  
  /**
   * Get current audio level in dB
   * @returns {number}
   */
  getCurrentLevel() {
    return this.currentLevel;
  }
  
  /**
   * Get current buffer size in bytes
   * @returns {number}
   */
  getBufferSize() {
    return this.bufferSizeBytes;
  }
  
  /**
   * Setup MediaRecorder and PCM processor
   * @private
   */
  _setupMediaRecorder() {
    // Setup audio processing for LINEAR16 PCM
    this._setupPCMProcessor();
    
    // Also setup MediaRecorder for fallback/recording
    const mimeType = this._getSupportedMimeType();
    
    console.log('Setting up MediaRecorder with mimeType:', mimeType, 'chunkInterval:', this.config.chunkIntervalMs);
    
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: mimeType,
      audioBitsPerSecond: this.config.sampleRate
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        this.bufferSizeBytes += event.data.size;
        
        // Check buffer size and flush if needed
        this._checkBufferSize();
      }
    };
    
    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      this._cleanup();
    };
  }
  
  /**
   * Setup PCM audio processor using ScriptProcessorNode
   * Resamples from browser's native sample rate to 16kHz for Google Speech-to-Text
   * @private
   */
  _setupPCMProcessor() {
    if (!this.audioContext) return;
    
    const source = this.audioContext.createMediaStreamSource(this.audioStream);
    
    // Get the actual sample rate of the AudioContext
    const nativeSampleRate = this.audioContext.sampleRate;
    const targetSampleRate = this.config.sampleRate; // 16000
    
    console.log(`Audio sample rates - Native: ${nativeSampleRate}Hz, Target: ${targetSampleRate}Hz`);
    
    // Create script processor for PCM extraction
    // Buffer size of 4096 samples
    const bufferSize = 4096;
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.state !== 'recording') return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Resample if needed (browser typically uses 44100Hz or 48000Hz)
      let resampledData;
      if (nativeSampleRate !== targetSampleRate) {
        resampledData = this._resampleAudio(inputData, nativeSampleRate, targetSampleRate);
      } else {
        resampledData = inputData;
      }
      
      // Convert Float32 to Int16 (LINEAR16)
      const pcmData = new Int16Array(resampledData.length);
      for (let i = 0; i < resampledData.length; i++) {
        // Clamp to [-1, 1] and convert to 16-bit integer
        const s = Math.max(-1, Math.min(1, resampledData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Convert to blob and trigger callback
      const blob = new Blob([pcmData.buffer], { type: 'audio/l16' });
      
      console.log(`[AudioManager] PCM chunk generated: ${blob.size} bytes`);
      
      if (this.onAudioChunk) {
        this.onAudioChunk(blob);
      }
    };
    
    // Connect the audio graph
    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
    
    console.log('PCM processor setup complete with resampling');
  }
  
  /**
   * Resample audio from source sample rate to target sample rate
   * Uses linear interpolation for simplicity
   * @private
   * @param {Float32Array} inputData - Input audio samples
   * @param {number} sourceSampleRate - Source sample rate (e.g., 44100)
   * @param {number} targetSampleRate - Target sample rate (e.g., 16000)
   * @returns {Float32Array} Resampled audio data
   */
  _resampleAudio(inputData, sourceSampleRate, targetSampleRate) {
    const ratio = sourceSampleRate / targetSampleRate;
    const outputLength = Math.floor(inputData.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
      const fraction = srcIndex - srcIndexFloor;
      
      // Linear interpolation
      output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
    }
    
    return output;
  }
  
  /**
   * Setup audio analysis for level detection
   * @private
   */
  _setupAudioAnalysis() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
      // Non-critical, continue without analysis
    }
  }
  
  /**
   * Start level monitoring
   * @private
   */
  _startLevelMonitoring() {
    if (!this.analyser) return;
    
    this.levelCheckInterval = setInterval(() => {
      this._checkAudioLevel();
    }, 100); // Check every 100ms
  }
  
  /**
   * Stop level monitoring
   * @private
   */
  _stopLevelMonitoring() {
    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }
  }
  
  /**
   * Check audio level and trigger warnings
   * @private
   */
  _checkAudioLevel() {
    if (!this.analyser || !this.dataArray) return;
    
    // Get time domain data
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    // Calculate RMS (Root Mean Square) level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    
    // Convert to dB
    const db = 20 * Math.log10(rms);
    this.currentLevel = db;
    
    // Trigger level change callback
    if (this.onLevelChange) {
      this.onLevelChange(db);
    }
    
    // Check for silence
    if (db < this.config.silenceThresholdDb) {
      if (!this.silenceStartTime) {
        this.silenceStartTime = Date.now();
      } else if (Date.now() - this.silenceStartTime >= this.config.silenceTimeoutMs) {
        if (this.onSilenceDetected) {
          this.onSilenceDetected();
        }
        // Reset to avoid repeated triggers
        this.silenceStartTime = Date.now();
      }
    } else {
      this.silenceStartTime = null;
    }
    
    // Check for low level
    if (db < this.config.lowLevelThresholdDb && db > this.config.silenceThresholdDb) {
      if (this.onLowLevelDetected) {
        this.onLowLevelDetected();
      }
    }
    
    // Check for clipping
    if (db >= this.config.clippingThresholdDb) {
      if (this.onClippingDetected) {
        this.onClippingDetected();
      }
    }
  }
  
  /**
   * Check buffer size and flush oldest segments if needed
   * @private
   */
  _checkBufferSize() {
    // If approaching limit (90% of max), flush oldest segments
    if (this.bufferSizeBytes >= this.config.maxBufferSizeBytes * 0.9) {
      const targetSize = this.config.maxBufferSizeBytes * 0.5; // Flush to 50%
      let removedSize = 0;
      
      while (this.bufferSizeBytes - removedSize > targetSize && this.audioChunks.length > 0) {
        const chunk = this.audioChunks.shift();
        removedSize += chunk.size;
      }
      
      this.bufferSizeBytes -= removedSize;
      console.warn(`Buffer limit reached. Flushed ${removedSize} bytes (${this.audioChunks.length} chunks remaining)`);
    }
  }
  
  /**
   * Get supported MIME type for MediaRecorder
   * @private
   * @returns {string}
   */
  _getSupportedMimeType() {
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
  
  /**
   * Cleanup resources
   * @private
   */
  _cleanup() {
    // Stop level monitoring
    this._stopLevelMonitoring();
    
    // Disconnect script processor
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
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
    
    // Clear state
    this.state = 'inactive';
    this.mediaRecorder = null;
    this.analyser = null;
    this.dataArray = null;
    this.audioChunks = [];
    this.bufferSizeBytes = 0;
    this.startTime = null;
    this.pauseTime = null;
    this.totalPausedDuration = 0;
    this.currentLevel = -Infinity;
    this.silenceStartTime = null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
}
