/**
 * Proximity Spatial Voice Chat Engine for Aether Duo
 * Attenuates voice call volume and frequency filtering based on 3D spatial distance between players.
 */

export interface ProximityVoiceState {
  isMicActive: boolean;
  isCallConnected: boolean;
  distanceMeters: number;
  effectiveVolume: number; // 0.0 to 1.0
  filterFreq: number; // Hz
  isPartnerSpeaking: boolean;
  isLocalSpeaking: boolean;
  statusText: string;
}

type StateListener = (state: ProximityVoiceState) => void;

class ProximityVoiceManager {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Web Audio Nodes
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;

  // Simulated local testing oscillator (for solo mode/testing)
  private simOsc: OscillatorNode | null = null;

  // State
  private isMicActive: boolean = false;
  private isCallConnected: boolean = false;
  private distanceMeters: number = 0;
  private effectiveVolume: number = 1.0;
  private filterFreq: number = 20000;
  private listeners: Set<StateListener> = new Set();
  private animFrameId: number | null = null;

  private isLocalSpeaking: boolean = false;
  private isPartnerSpeaking: boolean = false;

  constructor() {
    // Lazy init audio context on user interaction
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    let statusText = 'میکروفون غیرفعال است';
    if (this.isMicActive) {
      if (this.distanceMeters <= 4) {
        statusText = 'صدا زلال و نزدیک (کیفیت حداکثر)';
      } else if (this.distanceMeters <= 20) {
        statusText = `افزایش فاصله (${Math.round(this.distanceMeters)} متر) - صدا ملایم‌تر شد`;
      } else if (this.distanceMeters <= 35) {
        statusText = `فاصله زیاد (${Math.round(this.distanceMeters)} متر) - صدای بیسیم خفه و ضعیف`;
      } else {
        statusText = 'خارج از برد بیسیم (فوق‌العاده دور)';
      }
    }

    const state: ProximityVoiceState = {
      isMicActive: this.isMicActive,
      isCallConnected: this.isCallConnected,
      distanceMeters: this.distanceMeters,
      effectiveVolume: this.effectiveVolume,
      filterFreq: this.filterFreq,
      isPartnerSpeaking: this.isPartnerSpeaking,
      isLocalSpeaking: this.isLocalSpeaking,
      statusText,
    };

    this.listeners.forEach((fn) => fn(state));
  }

  /**
   * Toggle local microphone ON / OFF
   */
  public async toggleMicrophone(): Promise<boolean> {
    if (this.isMicActive) {
      this.stopMicrophone();
      return false;
    } else {
      return await this.startMicrophone();
    }
  }

  public async startMicrophone(): Promise<boolean> {
    try {
      const ctx = this.initAudioContext();

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        this.localAnalyser = ctx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(this.localStream);
        source.connect(this.localAnalyser);
      }

      this.isMicActive = true;
      this.startVoiceLoop();
      this.notify();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      // Fallback to active state without stream for demonstration
      this.isMicActive = true;
      this.startVoiceLoop();
      this.notify();
      return true;
    }
  }

  public stopMicrophone(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.isMicActive = false;
    this.isLocalSpeaking = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.notify();
  }

  /**
   * Connect a remote incoming/outgoing WebRTC stream from partner
   */
  public attachRemoteStream(stream: MediaStream): void {
    const ctx = this.initAudioContext();
    this.remoteStream = stream;

    try {
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.gainNode = ctx.createGain();
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      this.remoteAnalyser = ctx.createAnalyser();
      this.remoteAnalyser.fftSize = 256;

      // Pipeline: Source -> Filter (lowpass distance muffling) -> Gain (volume) -> Panner -> Destination & Analyser
      let current: AudioNode = this.sourceNode;
      if (this.filterNode) {
        current.connect(this.filterNode);
        current = this.filterNode;
      }
      if (this.gainNode) {
        current.connect(this.gainNode);
        current = this.gainNode;
      }
      if (this.pannerNode) {
        current.connect(this.pannerNode);
        current = this.pannerNode;
      }

      current.connect(ctx.destination);
      current.connect(this.remoteAnalyser);

      this.isCallConnected = true;
      this.updateDistance(this.distanceMeters);
    } catch (e) {
      console.warn('Error connecting spatial audio pipeline:', e);
    }
  }

  /**
   * Update current 3D spatial distance between players and recalculate volume/muffling
   */
  public updateDistance(meters: number): void {
    this.distanceMeters = Math.max(0, meters);

    // Calculate Spatial Attenuation
    // Max hearing radius = 35m.
    // Full volume <= 3m.
    const maxRadius = 35.0;
    const minRadius = 3.0;

    let volume = 1.0;
    let freq = 20000;

    if (this.distanceMeters <= minRadius) {
      volume = 1.0;
      freq = 20000;
    } else if (this.distanceMeters >= maxRadius) {
      volume = 0.02; // distant whisper / static
      freq = 1200; // lowpass muffled radio
    } else {
      const ratio = (this.distanceMeters - minRadius) / (maxRadius - minRadius);
      // Inverse square curve for realistic volume decay
      volume = Math.max(0.04, Math.pow(1 - ratio, 1.5));
      // Frequency drops from 20kHz down to 1200Hz
      freq = Math.max(1200, Math.round(20000 - ratio * 18800));
    }

    this.effectiveVolume = Math.round(volume * 100) / 100;
    this.filterFreq = freq;

    // Apply to Web Audio nodes if audio context is active
    if (this.audioCtx && this.audioCtx.state === 'running') {
      const now = this.audioCtx.currentTime;
      if (this.gainNode) {
        this.gainNode.gain.setTargetAtTime(this.effectiveVolume, now, 0.1);
      }
      if (this.filterNode) {
        this.filterNode.frequency.setTargetAtTime(this.filterFreq, now, 0.1);
      }
    }

    this.notify();
  }

  private startVoiceLoop(): void {
    let lastLocalSpeaking = this.isLocalSpeaking;
    let lastPartnerSpeaking = this.isPartnerSpeaking;

    const checkAudioLevels = () => {
      if (!this.isMicActive) return;

      // Analyze local speaking volume
      if (this.localAnalyser) {
        const data = new Uint8Array(this.localAnalyser.frequencyBinCount);
        this.localAnalyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        this.isLocalSpeaking = avg > 22;
      }

      // Analyze remote speaking volume
      if (this.remoteAnalyser) {
        const data = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
        this.remoteAnalyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        this.isPartnerSpeaking = avg > 22;
      }

      // Only notify if speaking state actually toggled
      if (this.isLocalSpeaking !== lastLocalSpeaking || this.isPartnerSpeaking !== lastPartnerSpeaking) {
        lastLocalSpeaking = this.isLocalSpeaking;
        lastPartnerSpeaking = this.isPartnerSpeaking;
        this.notify();
      }

      this.animFrameId = requestAnimationFrame(checkAudioLevels);
    };

    checkAudioLevels();
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getIsMicActive(): boolean {
    return this.isMicActive;
  }

  public getState(): ProximityVoiceState {
    return {
      isMicActive: this.isMicActive,
      isCallConnected: this.isCallConnected,
      distanceMeters: this.distanceMeters,
      effectiveVolume: this.effectiveVolume,
      filterFreq: this.filterFreq,
      isPartnerSpeaking: this.isPartnerSpeaking,
      isLocalSpeaking: this.isLocalSpeaking,
      statusText: this.isMicActive ? `فاصله: ${Math.round(this.distanceMeters)}m` : 'میکروفون خاموش',
    };
  }
}

export const proximityVoiceManager = new ProximityVoiceManager();
