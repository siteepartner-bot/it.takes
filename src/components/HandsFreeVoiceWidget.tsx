import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Radio, Volume2, Sparkles, Square, Loader2 } from 'lucide-react';
import { handsFreeVoiceAssistant, type HandsFreeVoiceState } from '../services/handsFreeVoiceAssistant.ts';
import type { PlayerRole, PuzzleState } from '../types.ts';

interface HandsFreeVoiceWidgetProps {
  stageId: number;
  myRole: PlayerRole;
  puzzleState: PuzzleState;
  myName: string;
  partnerDistance: number;
}

export const HandsFreeVoiceWidget: React.FC<HandsFreeVoiceWidgetProps> = ({
  stageId,
  myRole,
  puzzleState,
  myName,
  partnerDistance,
}) => {
  const [state, setState] = useState<HandsFreeVoiceState>(() => handsFreeVoiceAssistant.getState());

  useEffect(() => {
    const unsubscribe = handsFreeVoiceAssistant.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    handsFreeVoiceAssistant.updateContext(stageId, myRole, puzzleState, myName, partnerDistance);
  }, [stageId, myRole, puzzleState, myName, partnerDistance]);

  const handleToggleMode = () => {
    handsFreeVoiceAssistant.toggleHandsFreeMode();
  };

  return (
    <div dir="rtl" className="pointer-events-auto font-sans select-none">
      <button
        id="btn_handsfree_gemini_toggle"
        onClick={handleToggleMode}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-xl border ${
          state.isActive
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/50 ring-2 ring-purple-500/40 shadow-purple-500/30'
            : 'bg-slate-900/90 hover:bg-slate-800 text-purple-300 border-purple-900/50 hover:border-purple-500/50'
        }`}
        title={state.isActive ? 'خاموش کردن مکالمه صوتی زنده پیوسته' : 'روشن کردن مکالمه صوتی پیوسته با استاد الیاس (Gemini Live)'}
      >
        <Sparkles className={`w-4 h-4 text-amber-300 ${state.isActive ? 'animate-spin' : ''}`} />
        <span>{state.isActive ? 'مکالمه زنده فعال است' : 'مکالمه صوتی زنده جمینای'}</span>
        {state.isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
      </button>

      {/* Floating Active Voice Assistant Bar when Live Mode is ON */}
      <AnimatePresence>
        {state.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-1/2 translate-x-1/2 z-40 bg-slate-950/95 border border-purple-500/60 rounded-2xl p-3 px-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-md w-full"
          >
            {/* Pulsing Voice Avatar */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold shadow-lg shrink-0">
              {state.isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              ) : state.isSpeaking ? (
                <Volume2 className="w-5 h-5 text-emerald-300 animate-bounce" />
              ) : (
                <Mic className="w-5 h-5 text-cyan-300 animate-pulse" />
              )}
            </div>

            {/* Live Conversation Text & Status */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                <span className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>استاد الیاس (جمینای ۳.۷):</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">{state.statusText}</span>
              </div>

              <div className="text-xs text-slate-100 font-medium truncate mt-0.5">
                {state.isSpeaking ? (
                  <span className="text-emerald-300">« {state.lastResponse} »</span>
                ) : state.lastTranscript ? (
                  <span className="text-cyan-200">شما: « {state.lastTranscript} »</span>
                ) : (
                  <span className="text-slate-400">صحبت کنید... من بدون نیاز به فشردن دکمه بشنوم و پاسخ بدم!</span>
                )}
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={handleToggleMode}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
              title="توقف مکالمه زنده"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
