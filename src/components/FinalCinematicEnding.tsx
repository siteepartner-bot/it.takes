import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, RotateCcw, Home, BookOpen, Star } from 'lucide-react';
import { soundManager } from '../audio/soundManager.ts';

interface FinalCinematicEndingProps {
  onReplay: () => void;
  onReturnHome: () => void;
  onOpenStory: () => void;
}

const POETIC_LINES = [
  'ما همه‌ی مسیر رو کنار هم نیومدیم...',
  'بعضی جاها از هم دور شدیم.',
  'بعضی جاها راه رو گم کردیم.',
  'بعضی درها فقط با کمک هم باز شدن.',
  'اما آخرش...',
  'بازم رسیدیم به هم.',
];

export const FinalCinematicEnding: React.FC<FinalCinematicEndingProps> = ({
  onReplay,
  onReturnHome,
  onOpenStory,
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showFinalTitle, setShowFinalTitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    soundManager.playStageClear();
  }, []);

  useEffect(() => {
    if (currentLineIndex < POETIC_LINES.length) {
      const timer = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
      }, 3400);
      return () => clearTimeout(timer);
    } else if (!showFinalTitle) {
      const titleTimer = setTimeout(() => {
        setShowFinalTitle(true);
        soundManager.playPuzzleSuccessChime();
      }, 1200);
      return () => clearTimeout(titleTimer);
    } else if (!showButtons) {
      const btnTimer = setTimeout(() => {
        setShowButtons(true);
      }, 1600);
      return () => clearTimeout(btnTimer);
    }
  }, [currentLineIndex, showFinalTitle, showButtons]);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl select-none font-sans text-slate-100 overflow-hidden"
    >
      {/* Ambient background particles & glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-rose-500/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-[26rem] h-[26rem] bg-cyan-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[28rem] h-[28rem] bg-emerald-500/15 rounded-full blur-[110px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center">
        {/* Floating Heart Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-500/30 via-pink-500/20 to-amber-400/20 border-2 border-rose-400/50 flex items-center justify-center mb-8 shadow-2xl shadow-rose-500/30 relative"
        >
          <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 fill-rose-500 animate-pulse" />
          <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-spin" />
        </motion.div>

        {/* Narrative Poetic Sequence */}
        <div className="min-h-[160px] flex flex-col items-center justify-center w-full px-4 mb-6">
          <AnimatePresence mode="wait">
            {currentLineIndex < POETIC_LINES.length && (
              <motion.div
                key={currentLineIndex}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
                className="space-y-3"
              >
                <p className="text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-slate-200 leading-relaxed drop-shadow-md">
                  {POETIC_LINES[currentLineIndex]}
                </p>
              </motion.div>
            )}

            {showFinalTitle && (
              <motion.div
                key="final_title"
                initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="flex flex-col items-center gap-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold tracking-wider shadow-inner">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>پایان ماجراجویی • The Journey Completed</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 drop-shadow-lg flex items-center justify-center gap-3">
                  <span>Hasan</span>
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 fill-rose-500 inline-block animate-bounce" />
                  <span>Niwsha</span>
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mt-2">
                  حسن و نیوشا در آخرین مسیر با همراهی، اعتماد و فداکاری تمام دروازه‌ها را گشودند و به یکدیگر رسیدند.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Controls */}
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full max-w-sm flex flex-col gap-3 mt-4"
            >
              <button
                id="btn_replay_final_stage"
                onClick={onReplay}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-black text-sm tracking-wide shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بازی مجدد مرحله ۸ (آخرین مسیر ما)</span>
              </button>

              <button
                id="btn_view_full_story_final"
                onClick={onOpenStory}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>داستان کامل و شرح قهرمانان</span>
              </button>

              <button
                id="btn_return_lobby_final"
                onClick={onReturnHome}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-slate-900/60 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>بازگشت به منوی اصلی</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
