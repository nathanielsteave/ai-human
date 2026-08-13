/**
 * Audio Service
 * Handles Speech Recognition, Voice Note Recording & Analyzer, Audio Playback,
 * TTS Spoken Voice, Ambient Procedural Audio, Notification Chimes, and VC Ringtone
 */
class AudioService {
  constructor() {
    this.speechRecognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.animationFrameId = null;
    this.recordStartTime = null;
    this.recordTimerId = null;
    this.currentPlayingAudio = null;
    this.currentPlayingId = null;
    this.isSpeakingTTS = false;
    
    // Ambient Sound Nodes
    this.ambientContext = null;
    this.ambientGain = null;
    this.ambientSourceNodes = [];
    this.currentAmbientMode = null; // 'rain' | 'cafe' | 'night' | null

    // Ringtone Timer
    this.ringtoneTimer = null;

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        this.speechRecognition = new SpeechRec();
        this.speechRecognition.lang = 'id-ID';
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
      }
    }
  }

  // --------------------------------------------------------------------------
  // PROCEDURAL AMBIENT SOUND GENERATOR (Web Audio API)
  // --------------------------------------------------------------------------
  initAmbientContext() {
    if (!this.ambientContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ambientContext = new AudioCtx();
      this.ambientGain = this.ambientContext.createGain();
      this.ambientGain.gain.setValueAtTime(0.3, this.ambientContext.currentTime);
      this.ambientGain.connect(this.ambientContext.destination);
    }
    if (this.ambientContext.state === 'suspended') {
      this.ambientContext.resume();
    }
  }

  toggleAmbient(mode) {
    if (this.currentAmbientMode === mode) {
      this.stopAmbient();
      return null;
    }
    this.startAmbient(mode);
    return mode;
  }

  getAmbientMode() {
    return this.currentAmbientMode;
  }

  startAmbient(mode = 'rain') {
    this.stopAmbient();
    this.initAmbientContext();
    this.currentAmbientMode = mode;

    const ctx = this.ambientContext;

    if (mode === 'rain') {
      // Gentle Bedroom Rain
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.ambientGain);
      whiteNoise.start();

      this.ambientSourceNodes.push(whiteNoise);
    } else if (mode === 'cafe') {
      // Lo-fi Cafe Texture
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(329.63, ctx.currentTime); // E4

      gain1.gain.setValueAtTime(0.08, ctx.currentTime);

      osc1.connect(gain1);
      osc2.connect(gain1);
      gain1.connect(this.ambientGain);

      osc1.start();
      osc2.start();

      this.ambientSourceNodes.push(osc1, osc2);
    } else if (mode === 'night') {
      // Cozy Bedroom Night Drone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, ctx.currentTime); // A2 deep warm hum

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start();
      this.ambientSourceNodes.push(osc);
    }
  }

  stopAmbient() {
    this.ambientSourceNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    this.ambientSourceNodes = [];
    this.currentAmbientMode = null;
  }

  // --------------------------------------------------------------------------
  // NOTIFICATION CHIME & RINGTONE (Web Audio API)
  // --------------------------------------------------------------------------
  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  startRingtone() {
    this.stopRingtone();
    const playTone = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch {}
    };

    playTone();
    this.ringtoneTimer = setInterval(playTone, 2200);
  }

  stopRingtone() {
    if (this.ringtoneTimer) {
      clearInterval(this.ringtoneTimer);
      this.ringtoneTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // TTS: Abby Voice Character Synthesis
  // --------------------------------------------------------------------------
  speakAsAbby(text, onStart, onEnd) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;

    this.stopSpeaking();
    this.stopPlayingAudio();

    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.pitch = 1.25; // Sweet high-pitch feminine tone
    utterance.rate = 1.05;  // Slightly lively pacing

    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(v => v.lang.startsWith('id') || v.name.toLowerCase().includes('indonesia'));
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.onstart = () => {
      this.isSpeakingTTS = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeakingTTS = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('TTS error:', e);
      this.isSpeakingTTS = false;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeakingTTS = false;
    }
  }

  // --------------------------------------------------------------------------
  // Voice Note Recording
  // --------------------------------------------------------------------------
  async startRecording({ onWaveform, onTimer, onError }) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices not supported in this browser');
      }

      this.audioChunks = [];
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          const bars = [];
          const step = Math.floor(dataArray.length / 8) || 1;
          for (let i = 0; i < 8; i++) {
            const val = dataArray[i * step] || 0;
            bars.push(Math.max(0.15, val / 255));
          }
          if (onWaveform) onWaveform(bars);
          this.animationFrameId = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      } catch (audioCtxErr) {
        console.warn('AudioContext analyser failed, using simulated waveform:', audioCtxErr);
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      this.mediaRecorder = mimeType ? new MediaRecorder(this.microphoneStream, { mimeType }) : new MediaRecorder(this.microphoneStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.recordStartTime = Date.now();
      this.recordTimerId = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        if (onTimer) onTimer(`${mins}:${secs}`, elapsedSec);
      }, 250);

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.warn('Recording start error:', err);
      this.cleanupRecording();
      if (onError) onError(err);
      return false;
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanupRecording();
        resolve(null);
        return;
      }

      const durationSec = Math.max(1, Math.round((Date.now() - (this.recordStartTime || Date.now())) / 1000));

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const waveform = Array.from({ length: 16 }, () => 0.2 + Math.random() * 0.8);

        this.cleanupRecording();
        resolve({
          blob: audioBlob,
          audioUrl: audioUrl,
          duration: durationSec,
          durationStr: `0:${String(durationSec).padStart(2, '0')}`,
          waveform: waveform
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        this.cleanupRecording();
        resolve(null);
      }
    });
  }

  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('Cancel recording error:', e);
      }
    }
    this.cleanupRecording();
  }

  cleanupRecording() {
    if (this.recordTimerId) {
      clearInterval(this.recordTimerId);
      this.recordTimerId = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  // --------------------------------------------------------------------------
  // Audio File Playback (Voice Notes / Music)
  // --------------------------------------------------------------------------
  playVoiceNote(msgId, audioUrl, onProgress, onEnd) {
    if (this.currentPlayingId === msgId && this.currentPlayingAudio) {
      if (!this.currentPlayingAudio.paused) {
        this.currentPlayingAudio.pause();
        return false;
      } else {
        this.currentPlayingAudio.play();
        return true;
      }
    }

    this.stopPlayingAudio();
    this.stopSpeaking();

    const audio = new Audio(audioUrl);
    this.currentPlayingAudio = audio;
    this.currentPlayingId = msgId;

    audio.ontimeupdate = () => {
      const progress = audio.duration ? (audio.currentTime / audio.duration) : 0;
      if (onProgress) onProgress(progress, audio.currentTime, audio.duration || 0);
    };

    audio.onended = () => {
      this.currentPlayingAudio = null;
      this.currentPlayingId = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error:', e);
      this.currentPlayingAudio = null;
      this.currentPlayingId = null;
      if (onEnd) onEnd();
    };

    audio.play();
    return true;
  }

  stopPlayingAudio() {
    if (this.currentPlayingAudio) {
      try {
        this.currentPlayingAudio.pause();
        this.currentPlayingAudio.currentTime = 0;
      } catch {}
      this.currentPlayingAudio = null;
      this.currentPlayingId = null;
    }
  }

  // --------------------------------------------------------------------------
  // Speech Recognition
  // --------------------------------------------------------------------------
  startListening(onResult, onError) {
    if (!this.speechRecognition) {
      if (onError) onError(new Error('Speech recognition not supported in this browser'));
      return;
    }

    this.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    this.speechRecognition.onerror = (event) => {
      if (onError) onError(event.error);
    };

    try {
      this.speechRecognition.start();
    } catch (e) {
      if (onError) onError(e);
    }
  }

  stopListening() {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {
        console.warn('Stop listening error:', e);
      }
    }
  }
}

export const audioService = new AudioService();
