import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  HelpCircle,
  Clock,
  Cloud,
  Zap,
  Shield,
  Loader2,
} from 'lucide-react';
import type { PlayerRole, PuzzleState } from '../types.ts';
import { requestGeminiGuidance } from '../services/geminiService.ts';
import {
  playRadioChirp,
  playRadioStatic,
  playRadioHangup,
  speakWithVoice,
  stopVoice,
  createSpeechRecognizer,
} from '../audio/radioVoiceAudio.ts';
import { CloudflareGuideModal } from './CloudflareGuideModal.tsx';

interface GeminiVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: number;
  myRole: PlayerRole;
  myName: string;
  partnerName: string;
  puzzleState: PuzzleState;
  partnerDistance?: number;
}

const QUICK_PROMPT_CHIPS = [
  { id: 'next_step', label: 'الان دقیقا باید چکار کنیم؟', icon: Sparkles },
  { id: 'nora_power', label: 'نورا چطور از صاعقه [F] استفاده کنه؟', icon: Zap },
  { id: 'barsam_power', label: 'برسام چطور از سپر [F] استفاده کنه؟', icon: Shield },
  { id: 'riddle', label: 'راز عبور از تله‌های این مرحله چیه؟', icon: HelpCircle },
];

export const GeminiVoiceCallModal: React.FC<GeminiVoiceCallModalProps> = ({
  isOpen,
  onClose,
  stageId,
  myRole,
  myName,
  partnerName,
  puzzleState,
  partnerDistance = 0,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [lastAdvice, setLastAdvice] = useState<string>(
    'درود بر فرزندان چوبی من! نورا و برسام، چه کمکی از دست ساعت‌ساز کهن برایتان ساخته است؟'
  );
  const [adviceSource, setAdviceSource] = useState<string>('gemini-3.5-flash-lite');
  const [autoListen, setAutoListen] = useState(true);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCfGuide, setShowCfGuide] = useState(false);

  const recognizerRef = useRef<any>(null);
  const isExplorer = myRole === 'explorer';

  // Timer for active call
  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      stopVoice();
      return;
    }

    playRadioChirp();
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Initial greeting voice narration
    speakWithVoice(
      lastAdvice,
      () => setIsSpeaking(true),
      () => {
        setIsSpeaking(false);
        if (autoListen && recognizerRef.current?.isSupported) {
          setTimeout(() => {
            recognizerRef.current?.start();
          }, 300);
        }
      }
    );

    return () => {
      clearInterval(interval);
      stopVoice();
    };
  }, [isOpen]);

  // Setup Speech Recognition
  useEffect(() => {
    if (!isOpen) return;

    const recognizer = createSpeechRecognizer(
      (transcript) => {
        handleSendQuestion(transcript);
      },
      (listening) => {
        setIsListening(listening);
      },
      (err) => {
        console.warn('Speech recognition error:', err);
      }
    );

    recognizerRef.current = recognizer;

    return () => {
      recognizer.stop();
    };
  }, [isOpen, stageId, myRole, puzzleState]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendQuestion = async (queryText: string) => {
    if (!queryText.trim() || isLoadingAdvice) return;

    setIsLoadingAdvice(true);
    stopVoice();
    setIsSpeaking(false);
    playRadioStatic();

    try {
      const response = await requestGeminiGuidance({
        stageId,
        role: myRole,
        puzzleState,
        query: queryText.trim(),
        playerName: myName,
        distance: partnerDistance,
      });

      setLastAdvice(response.text);
      setAdviceSource(response.source || 'gemini-3.5-flash-lite');
      setCustomQuestion('');

      if (!isMuted) {
        speakWithVoice(
          response.text,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            // Auto restart speech recognition loop after Elias finishes speaking!
            if (autoListen && recognizerRef.current?.isSupported) {
              setTimeout(() => {
                recognizerRef.current?.start();
              }, 400);
            }
          }
        );
      }
    } catch (e: any) {
      setLastAdvice('امواج رادیویی دچار اختلال شدند! حواستان به همکاری دونفره باشد.');
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handleToggleMic = () => {
    if (!recognizerRef.current?.isSupported) {
      alert('مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند یا دسترسی میکروفون داده نشده است.');
      return;
    }

    if (isListening) {
      recognizerRef.current.stop();
      setIsListening(false);
    } else {
      recognizerRef.current.start();
      setIsListening(true);
    }
  };

  const handleHangup = () => {
    playRadioHangup();
    stopVoice();
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md font-sans text-slate-100 select-none overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/50 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-cyan-950/60 overflow-hidden my-auto"
        >
          {/* Radio Transmission Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar: Call Status & Cloudflare Shortcut */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-300 font-mono tracking-wider">
                فرکانس بیسیم اِیتِر • {formatTime(callDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn_open_cf_from_call"
                onClick={() => setShowCfGuide(true)}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                title="مشاهده راهنمای کلودفلر و تنظیمات GEMINI_API_KEY"
              >
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span>کلودفلر</span>
              </button>

              <button
                id="btn_toggle_voice_mute"
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (!isMuted) stopVoice();
                }}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isMuted
                    ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'بلندگو قطع است' : 'بلندگو فعال است'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Caller Identity Hologram */}
          <div className="flex flex-col items-center text-center my-2">
            <div className="relative mb-3">
              {/* Pulsating Aether Sound Rings */}
              {isSpeaking && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1.6], opacity: [0.6, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
                    className="absolute -inset-3 rounded-full border border-cyan-400/60 pointer-events-none"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.25, 1.4], opacity: [0.8, 0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: 0.3, ease: 'easeOut' }}
                    className="absolute -inset-1.5 rounded-full border border-amber-400/50 pointer-events-none"
                  />
                </>
              )}

              {/* Master Elias Avatar */}
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500/30 via-slate-800 to-cyan-500/30 border-2 border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-500/20 text-3xl sm:text-4xl">
                🧙‍♂️
              </div>

              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-900 border border-cyan-400 text-cyan-400 shadow">
                <Radio className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
              <span>استاد الیاس • ساعت‌ساز کهن</span>
            </h3>
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" />
              <span>هوش مصنوعی جمینای ({adviceSource})</span>
            </div>

            {/* Audio Waveform Visualizer */}
            <div className="flex items-center justify-center gap-1 h-8 my-2">
              {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7, 0.3, 0.85, 0.55].map((factor, idx) => (
                <motion.div
                  key={idx}
                  animate={{
                    height: isSpeaking ? [6, 24 * factor, 6] : 4,
                    backgroundColor: isSpeaking ? '#22d3ee' : '#475569',
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.45 + idx * 0.05,
                    ease: 'easeInOut',
                  }}
                  className="w-1 rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Advice Transcript Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-inner mb-4 relative min-h-[90px] flex items-center">
            {isLoadingAdvice ? (
              <div className="w-full flex flex-col items-center justify-center py-2 text-cyan-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold animate-pulse">در حال تحلیل اَسرار مرحله و پاسخ استاد...</span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                «{lastAdvice}»
              </p>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="mb-4">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>پرسش‌های پرکاربرد برای این مرحله:</span>
              <span className="text-cyan-400 text-[10px]">مرحله {stageId}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {QUICK_PROMPT_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={chip.id}
                    onClick={() => handleSendQuestion(chip.label)}
                    disabled={isLoadingAdvice}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-bold text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-all text-right disabled:opacity-50"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Question Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion(customQuestion);
            }}
            className="flex items-center gap-2 mb-4"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="هر سوالی از معمای مرحله داری بنویس..."
              disabled={isLoadingAdvice}
              className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoadingAdvice || !customQuestion.trim()}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
          </form>

          {/* Action Bottom Bar: Microphone & Hang Up Call */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            {/* Mic voice input button */}
            <button
              id="btn_mic_voice_input"
              type="button"
              onClick={handleToggleMic}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all shadow-lg ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white animate-pulse shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300'
              }`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-400" />}
              <span>{isListening ? 'در حال شنیدن صدای شما...' : 'صحبت صوتی با میکروفون'}</span>
            </button>

            {/* End Call Button */}
            <button
              id="btn_hangup_voice_call"
              type="button"
              onClick={handleHangup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-600/30 active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              <span>قطع تماس بیسیم</span>
            </button>
          </div>
        </motion.div>

        {/* Sub-modal: Cloudflare Guide */}
        <CloudflareGuideModal isOpen={showCfGuide} onClose={() => setShowCfGuide(false)} />
      </div>
    </AnimatePresence>
  );
};
