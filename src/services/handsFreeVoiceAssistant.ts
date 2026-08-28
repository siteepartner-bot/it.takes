/**
 * Hands-Free Continuous Gemini Voice Assistant (Gemini Live Mode)
 * Allows seamless, auto-looping two-way voice conversations with Master Elias during gameplay.
 */

import { requestGeminiGuidance } from './geminiService.ts';
import { speakWithVoice, stopVoice, playRadioChirp, playRadioStatic } from '../audio/radioVoiceAudio.ts';
import type { PlayerRole, PuzzleState } from '../types.ts';

export interface HandsFreeVoiceState {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  lastTranscript: string;
  lastResponse: string;
  statusText: string;
  errorText?: string;
}

type VoiceStateListener = (state: HandsFreeVoiceState) => void;

class HandsFreeVoiceAssistant {
  private isActive: boolean = false;
  private isListening: boolean = false;
  private isProcessing: boolean = false;
  private isSpeaking: boolean = false;
  private lastTranscript: string = '';
  private lastResponse: string = 'درود! من استاد الیاس هستم؛ هر وقت صحبت کنی پاسخ میدم.';
  private statusText: string = 'مکالمه زنده غیرفعال است';
  private errorText: string = '';

  private recognition: any = null;
  private listeners: Set<VoiceStateListener> = new Set();

  // Context required for queries
  private currentStageId: number = 1;
  private currentRole: PlayerRole = 'explorer';
  private currentPuzzleState: PuzzleState | null = null;
  private playerName: string = 'ماجراجو';
  private partnerDistance: number = 0;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.errorText = 'مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند.';
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'fa-IR';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.statusText = 'در حال شنیدن صدای شما... (استاد الیاس آماده است)';
        this.notify();
      };

      this.recognition.onresult = async (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          this.lastTranscript = transcript.trim();
          await this.processUserSpeech(this.lastTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Hands-free speech error:', event.error);
        }
        // Auto restart if active and not currently speaking or processing
        if (this.isActive && !this.isSpeaking && !this.isProcessing) {
          setTimeout(() => this.startListening(), 1000);
        } else {
          this.notify();
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto restart loop if active and idle
        if (this.isActive && !this.isSpeaking && !this.isProcessing) {
          setTimeout(() => this.startListening(), 600);
        } else {
          this.notify();
        }
      };
    } catch (err) {
      console.warn('Failed to initialize speech recognition:', err);
    }
  }

  public updateContext(
    stageId: number,
    role: PlayerRole,
    puzzleState: PuzzleState,
    playerName: string,
    partnerDistance: number = 0
  ): void {
    this.currentStageId = stageId;
    this.currentRole = role;
    this.currentPuzzleState = puzzleState;
    this.playerName = playerName;
    this.partnerDistance = partnerDistance;
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state: HandsFreeVoiceState = {
      isActive: this.isActive,
      isListening: this.isListening,
      isProcessing: this.isProcessing,
      isSpeaking: this.isSpeaking,
      lastTranscript: this.lastTranscript,
      lastResponse: this.lastResponse,
      statusText: this.statusText,
      errorText: this.errorText,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  public toggleHandsFreeMode(): boolean {
    if (this.isActive) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start(): void {
    if (!this.recognition) {
      this.statusText = 'سیستم تشخیص گفتار پشتیبانی نمی‌شود.';
      this.notify();
      return;
    }

    this.isActive = true;
    this.statusText = 'مکالمه صوتی زنده با استاد الیاس فعال شد...';
    playRadioChirp();

    // Initial greeting speech
    this.speakResponse('درود! مکالمه زنده فعال شد. بگو ببینم چه کمکی از دست من برمی‌آید؟');
  }

  public stop(): void {
    this.isActive = false;
    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.statusText = 'مکالمه زنده با استاد الیاس غیرفعال شد.';

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    stopVoice();
    playRadioStatic();
    this.notify();
  }

  private startListening(): void {
    if (!this.isActive || this.isSpeaking || this.isProcessing || !this.recognition) return;

    try {
      this.recognition.start();
    } catch (e) {
      // Already running or busy
    }
  }

  private async processUserSpeech(query: string): Promise<void> {
    if (!this.isActive) return;

    // Pause recognition while thinking and speaking
    try {
      this.recognition.stop();
    } catch (e) {
      // ignore
    }

    this.isListening = false;
    this.isProcessing = true;
    this.statusText = `استاد الیاس در حال اندیشیدن... ("${query}")`;
    this.notify();

    try {
      const guidance = await requestGeminiGuidance({
        stageId: this.currentStageId,
        role: this.currentRole,
        puzzleState: this.currentPuzzleState || ({} as any),
        query,
        playerName: this.playerName,
        distance: this.partnerDistance,
      });

      this.isProcessing = false;
      this.lastResponse = guidance.text;
      this.speakResponse(guidance.text);
    } catch (err) {
      this.isProcessing = false;
      this.lastResponse = 'ارتباط بیسیم کمی اختلال دارد، دوباره بگو فرزندم.';
      this.speakResponse(this.lastResponse);
    }
  }

  private speakResponse(text: string): void {
    this.isSpeaking = true;
    this.statusText = 'استاد الیاس در حال صحبت است...';
    this.notify();

    speakWithVoice(
      text,
      () => {
        this.isSpeaking = true;
        this.notify();
      },
      () => {
        this.isSpeaking = false;
        this.statusText = 'آماده شنیدن صحبت بعدی شما...';
        this.notify();

        // Resume continuous listening automatically after Elias finishes speaking!
        if (this.isActive) {
          setTimeout(() => this.startListening(), 400);
        }
      }
    );
  }

  public getState(): HandsFreeVoiceState {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      isProcessing: this.isProcessing,
      isSpeaking: this.isSpeaking,
      lastTranscript: this.lastTranscript,
      lastResponse: this.lastResponse,
      statusText: this.statusText,
      errorText: this.errorText,
    };
  }
}

export const handsFreeVoiceAssistant = new HandsFreeVoiceAssistant();
