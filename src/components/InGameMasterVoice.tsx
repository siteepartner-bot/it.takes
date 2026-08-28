import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, X, Volume2, Mic, Sparkles, ExternalLink, MessageSquare } from 'lucide-react';
import type { PlayerRole, PuzzleState } from '../types.ts';
import { requestGeminiGuidance } from '../services/geminiService.ts';
import {
  playRadioChirp,
  playRadioStatic,
  playRadioHangup,
  speakWithVoice,
  stopVoice,
  createWakeWordRecognizer,
} from '../audio/radioVoiceAudio.ts';

interface InGameMasterVoiceProps {
  enabled: boolean;
  stageId: number;
  myRole: PlayerRole;
  myName: string;
  partnerName: string;
  puzzleState: PuzzleState;
  partnerDistance?: number;
  onOpenClassicModal: () => void;
  triggerGuidanceKey?: number; // increments when user taps HUD button or presses V
}

export const InGameMasterVoice: React.FC<InGameMasterVoiceProps> = ({
  enabled,
  stageId,
  myRole,
  myName,
  partnerName,
  puzzleState,
  partnerDistance = 0,
  onOpenClassicModal,
  triggerGuidanceKey = 0,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [activeMessage, setActiveMessage] = useState<{
    query?: string;
    text: string;
    isGenerating: boolean;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognizerRef = useRef<ReturnType<typeof createWakeWordRecognizer> | null>(null);
  const hideTimerRef = useRef<any>(null);
  const isRequestingRef = useRef(false);

  // Trigger guidance request
  const fetchMentorGuidance = useCallback(
    async (spokenQuery?: string) => {
      if (isRequestingRef.current) return;
      isRequestingRef.current = true;

      // Stop current voice
      stopVoice();
      setIsSpeaking(false);
      clearTimeout(hideTimerRef.current);

      playRadioChirp();

      setActiveMessage({
        query: spokenQuery || 'استاد، راهنمایی می‌خوایم!',
        text: 'در حال برقراری ارتباط فرکانسی با استاد الیاس...',
        isGenerating: true,
      });

      try {
        const guidance = await requestGeminiGuidance({
          stageId,
          playerRole: myRole,
          playerName: myName,
          partnerName,
          puzzleState,
          customQuestion: spokenQuery || 'الان دقیقا چه کاری باید انجام بدیم؟ راهنمایی کن.',
          partnerDistance,
        });

        setActiveMessage({
          query: spokenQuery,
          text: guidance.text,
          isGenerating: false,
        });

        playRadioStatic();

        // Speak the response
        speakWithVoice(
          guidance.text,
          () => setIsSpeaking(true),
          () => {
            setIsSpeaking(false);
            // Schedule auto-hide 6 seconds after speaking completes
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = setTimeout(() => {
              setActiveMessage(null);
            }, 6000);
          }
        );
      } catch (err) {
        console.warn('Guidance request error:', err);
        const fallbackText = 'فرزندانم، مکانیزم‌های باستانی را با هم‌آهنگی فعال کنید. نیوشا با صاعقه و حسن با سپر محافظ.';
        setActiveMessage({
          query: spokenQuery,
          text: fallbackText,
          isGenerating: false,
        });
        speakWithVoice(fallbackText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      } finally {
        isRequestingRef.current = false;
      }
    },
    [stageId, myRole, myName, partnerName, puzzleState, partnerDistance]
  );

  // Manual trigger via prop (e.g. HUD button click or V hotkey)
  const prevKeyRef = useRef(triggerGuidanceKey);
  useEffect(() => {
    if (triggerGuidanceKey > 0 && triggerGuidanceKey !== prevKeyRef.current) {
      prevKeyRef.current = triggerGuidanceKey;
      fetchMentorGuidance();
    }
  }, [triggerGuidanceKey, fetchMentorGuidance]);

  // Ambient Wake-word detection: "استاد"
  useEffect(() => {
    if (!enabled) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const recognizer = createWakeWordRecognizer(
      (transcript) => {
        // Player said "استاد..."
        fetchMentorGuidance(transcript);
      },
      (listening) => {
        setIsListening(listening);
      },
      (err) => {
        console.warn('Wake word recognizer error:', err);
      }
    );

    recognizer.start();
    recognizerRef.current = recognizer;

    return () => {
      recognizer.stop();
      recognizerRef.current = null;
      stopVoice();
      clearTimeout(hideTimerRef.current);
    };
  }, [enabled, fetchMentorGuidance]);

  const handleDismiss = () => {
    stopVoice();
    setIsSpeaking(false);
    setActiveMessage(null);
    clearTimeout(hideTimerRef.current);
    playRadioHangup();
  };

  return (
    <>
      {/* Active Transmission Floating HUD Banner */}
      <AnimatePresence>
        {activeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-14 sm:top-16 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 w-auto max-w-xl mx-auto pointer-events-auto"
            dir="rtl"
          >
            <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-2 relative text-right">
              {/* Header: Master Avatar & Status */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg relative">
                    ⏳
                    {isSpeaking && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <span>استاد الیاس (ساعت‌ساز کهن)</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-[10px] text-amber-400 border border-amber-500/30">
                        بیسیم مستقیم
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      {activeMessage.isGenerating ? (
                        <span className="text-cyan-400 animate-pulse">در حال پاسخ‌گویی به شما...</span>
                      ) : isSpeaking ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Volume2 className="w-3 h-3 animate-pulse" />
                          در حال صحبت صوتی
                        </span>
                      ) : (
                        <span>پیام دریافت شد</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={onOpenClassicModal}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    title="مشاهده در صفحه بیسیم کلاسیک"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">صفحه بیسیم</span>
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="بستن پیام"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Spoken Query Banner */}
              {activeMessage.query && (
                <div className="text-[11px] text-cyan-300/80 flex items-center gap-1.5 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  <MessageSquare className="w-3 h-3 text-cyan-400" />
                  <span>پرسش شما: «{activeMessage.query}»</span>
                </div>
              )}

              {/* Message Body */}
              <div className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed max-h-36 overflow-y-auto">
                {activeMessage.text}
              </div>

              {/* Quick Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" />
                  برای راهنمایی بعدی کافیست بگویید: <strong className="text-amber-300">«استاد...»</strong>
                </span>
                <button
                  onClick={() => fetchMentorGuidance()}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline"
                >
                  راهنمایی بعدی
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
