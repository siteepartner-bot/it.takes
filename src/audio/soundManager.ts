/**
 * Procedural Web Audio API Sound Engine for Aether Duo
 * Zero external audio assets required; immediate zero-latency feedback
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private ambientTimer: number | null = null;
  private isMuted: boolean = false;
  private currentStage: number = 1;
  private footstepDebounce: number = 0;

  constructor() {
    // AudioContext will be lazily initialized upon first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startAmbientMusic(this.currentStage);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public userInteracted() {
    this.initContext();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public setVolume(master: number, sfx: number, music: number) {
    if (!this.ctx) return;
    if (this.masterGain) this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
  }

  // --- Sound Effects ---

  public playFootstep() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const now = performance.now();
    if (now - this.footstepDebounce < 240) return;
    this.footstepDebounce = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playJump() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playLand() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playInteract() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    [440, 660].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.25, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.2);
    });
  }

  public playPressurePlate(activate = true) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startF = activate ? 150 : 280;
    const endF = activate ? 280 : 140;

    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(endF, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playGateMove() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.6);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  public playAbility(role: 'explorer' | 'guardian') {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (role === 'explorer') {
      // Spark Tether / High frequency electric zip
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } else {
      // Aegis Shield / Resonant heavy energy pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.4);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    }
  }

  public playPing() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playEmote() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);

      gain.gain.setValueAtTime(0.2, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.18);
    });
  }

  public playCheckpoint() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Harmonic arpeggio
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);

      gain.gain.setValueAtTime(0.25, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.6);
    });
  }

  public playStageClear() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const chords = [
      [349.23, 440, 523.25], // F major
      [392, 493.88, 587.33], // G major
      [523.25, 659.25, 783.99, 1046.5], // C major
    ];

    chords.forEach((chord, step) => {
      const stepTime = t + step * 0.35;
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, stepTime);

        gain.gain.setValueAtTime(0.2, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(stepTime);
        osc.stop(stepTime + 0.8);
      });
    });
  }

  public playSymbolChime(stepIndex = 0) {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const baseFreq = freqs[Math.min(stepIndex, freqs.length - 1)] || 523.25;

    [baseFreq, baseFreq * 1.5].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);

      gain.gain.setValueAtTime(0.28, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.35);
    });
  }

  public playPuzzleErrorBuzz() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playPuzzleSuccessChime() {
    this.initContext();
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.25, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.55);
    });
  }

  // --- Ambient Music Loop ---
  public startAmbientMusic(stageId: number) {
    this.currentStage = stageId;
    if (this.ambientTimer) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (!this.ctx || !this.musicGain) return;

    // Pentatonic scale presets per stage
    const scales: Record<number, number[]> = {
      1: [220, 261.63, 293.66, 329.63, 392, 440, 523.25], // Forgotten Garden: Lydian/Dorian lush
      2: [261.63, 329.63, 392, 493.88, 587.33, 659.25],   // Floating Islands: Celestial airy
      3: [196, 233.08, 261.63, 293.66, 349.23, 392],       // Clockwork Factory: Minor mechanical
    };

    const playChordPad = () => {
      if (this.isMuted || !this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const notes = scales[this.currentStage] || scales[1];

      // Pick 3 soft notes
      const idx1 = Math.floor(Math.random() * 3);
      const idx2 = idx1 + 2;
      const idx3 = (idx2 + 2) % notes.length;
      const chord = [notes[idx1], notes[idx2], notes[idx3]];

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        // Gentle swell
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.06, t + 1.5);
        gain.gain.linearRampToValueAtTime(0.001, t + 4.5);

        osc.connect(gain);
        gain.connect(this.musicGain!);
        osc.start(t);
        osc.stop(t + 4.6);
      });
    };

    // Trigger pad every 4 seconds
    playChordPad();
    this.ambientTimer = window.setInterval(playChordPad, 4200);
  }
}

export const soundManager = new SoundManager();
