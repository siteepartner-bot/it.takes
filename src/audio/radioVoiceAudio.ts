/**
 * Radio Sound Effects & Speech Synthesis Engine for Gemini Voice Call
 * Uses Web Audio API for synthetic SFX and SpeechSynthesis for mentor voice narration.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play futuristic radio walkie-talkie chirp beep (connection established)
 */
export function playRadioChirp(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
  osc.frequency.setValueAtTime(2200, now + 0.1);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.23);
}

/**
 * Play brief radio static burst (walkie-talkie transmission squelch)
 */
export function playRadioStatic(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.12; // 120ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 3.0;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.13);
}

/**
 * Play radio call hangup / disconnect sound
 */
export function playRadioHangup(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc2.type = 'triangle';
  osc1.frequency.setValueAtTime(440, now);
  osc2.frequency.setValueAtTime(350, now);
  osc1.frequency.setValueAtTime(330, now + 0.12);
  osc2.frequency.setValueAtTime(260, now + 0.12);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

/**
 * Speech synthesis with Persian/mentor voice
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakWithVoice(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onStart?.();
    setTimeout(() => onEnd?.(), 2500);
    return;
  }

  window.speechSynthesis.cancel();

  // Strip emojis and punctuation marks that could disrupt synthesis
  const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance = utterance;

  // Try to find a Persian or natural voice
  const voices = window.speechSynthesis.getVoices();
  const persianVoice = voices.find(
    (v) =>
      v.lang.startsWith('fa') ||
      v.name.toLowerCase().includes('persian') ||
      v.name.toLowerCase().includes('farsi')
  );

  if (persianVoice) {
    utterance.voice = persianVoice;
    utterance.lang = 'fa-IR';
  } else {
    // Fallback: use default voice with mentor-like pitch
    utterance.lang = 'fa-IR';
  }

  utterance.pitch = 0.92; // Slightly deeper, warm mentor voice
  utterance.rate = 1.0;

  utterance.onstart = () => {
    playRadioChirp();
    onStart?.();
  };

  utterance.onend = () => {
    playRadioStatic();
    onEnd?.();
    currentUtterance = null;
  };

  utterance.onerror = () => {
    onEnd?.();
    currentUtterance = null;
  };

  window.speechSynthesis.speak(utterance);
}

export function stopVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Speech Recognition (Microphone Voice Input)
 */
export function createSpeechRecognizer(
  onResult: (transcript: string) => void,
  onStateChange?: (listening: boolean) => void,
  onError?: (err: string) => void
): { start: () => void; stop: () => void; isSupported: boolean } {
  if (typeof window === 'undefined') {
    return { start: () => {}, stop: () => {}, isSupported: false };
  }

  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    return { start: () => {}, stop: () => {}, isSupported: false };
  }

  let recognition: any = null;
  try {
    recognition = new SpeechRecognitionClass();
    recognition.lang = 'fa-IR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      onStateChange?.(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript && transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      onStateChange?.(false);
      onError?.(event.error || 'خطا در ضبط صدا');
    };

    recognition.onend = () => {
      onStateChange?.(false);
    };
  } catch (e: any) {
    return { start: () => {}, stop: () => {}, isSupported: false };
  }

  return {
    start: () => {
      try {
        recognition.start();
      } catch (e) {
        // already started or busy
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    },
    isSupported: true,
  };
}

/**
 * Ambient Wake Word Listener (Safe manual / non-looping)
 */
export function createWakeWordRecognizer(
  onWakeWordDetected: (fullPhrase: string) => void,
  onListeningChange?: (listening: boolean) => void,
  onError?: (err: string) => void
): { start: () => void; stop: () => void; isSupported: boolean } {
  return {
    start: () => {
      onListeningChange?.(false);
    },
    stop: () => {
      onListeningChange?.(false);
    },
    isSupported: false,
  };
}
