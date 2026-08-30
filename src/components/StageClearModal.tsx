import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ArrowLeft, CheckCircle2, Heart, RotateCcw, Home, Sparkles } from 'lucide-react';
import { CAMPAIGN_STAGES_INFO } from '../data/loreStory.ts';

interface StageClearModalProps {
  stageId: number;
  onNextStage: () => void;
  onReturnLobby: () => void;
  onRestartCampaign?: () => void;
}

const STAGE_NAMES: Record<number, string> = CAMPAIGN_STAGES_INFO.reduce((acc, curr) => {
  acc[curr.id] = curr.name.replace(/^مرحله \d+: /, '');
  return acc;
}, {} as Record<number, string>);

const FINALE_STORY_LINES = [
  'ما همه‌ی مسیر رو کنار هم نیومدیم...',
  'بعضی جاها از هم دور شدیم.',
  'بعضی جاها راه رو گم کردیم.',
  'بعضی درها فقط با کمک هم باز شدن.',
  'اما آخرش...',
  'بازم رسیدیم به هم.',
];

export const StageClearModal: React.FC<StageClearModalProps> = ({
  stageId,
  onNextStage,
  onReturnLobby,
  onRestartCampaign,
}) => {
  const isFinalStage = stageId >= 8;
  const currentStageName = STAGE_NAMES[stageId] || `مرحله ${stageId}`;
  const nextStageName = STAGE_NAMES[stageId + 1] || 'پایان بازی';

  const [visibleLinesCount, setVisibleLinesCount] = useState(isFinalStage ? 1 : 0);

  useEffect(() => {
    if (!isFinalStage) return;
    const interval = setInterval(() => {
      setVisibleLinesCount((prev) => {
        if (prev < FINALE_STORY_LINES.length + 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isFinalStage]);

  const showFinalBadge = visibleLinesCount > FINALE_STORY_LINES.length;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-lg select-none font-sans text-slate-100 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full ${
          isFinalStage ? 'max-w-lg' : 'max-w-md'
        } max-h-[94dvh] overflow-y-auto bg-slate-900/95 border-2 ${
          isFinalStage ? 'border-rose-500/60 shadow-rose-950/80' : 'border-cyan-500/50 shadow-cyan-950/80'
        } rounded-3xl p-5 sm:p-7 shadow-2xl text-center relative overflow-hidden`}
      >
        {/* Ambient Glow */}
        <div
          className={`absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 ${
            isFinalStage ? 'bg-rose-500/25' : 'bg-cyan-500/20'
          } rounded-full blur-3xl pointer-events-none`}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Header Icon */}
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl ${
              isFinalStage
                ? 'bg-rose-500/20 border-rose-400/40 shadow-rose-500/30'
                : 'bg-cyan-500/20 border-cyan-400/40 shadow-cyan-500/30'
            } border flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}
          >
            {isFinalStage ? (
              <Heart className="w-8 h-8 text-rose-400 animate-pulse fill-rose-400/30" />
            ) : (
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
            )}
          </div>

          {/* Stage badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full ${
              isFinalStage
                ? 'bg-rose-950/90 border border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400'
            } text-xs font-bold uppercase tracking-wider mb-2`}
          >
            {isFinalStage ? <Sparkles className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isFinalStage ? 'فینال بزرگ فتح شد — پایان داستان' : `مرحله ${stageId} فتح شد!`}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            {isFinalStage ? 'آخرین مسیر ما' : 'دروازه باستانی گشوده شد!'}
          </h2>

          {/* Standard Stage Content */}
          {!isFinalStage && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs mb-5 leading-relaxed">
              هر دو ماجراجو در کنار یکدیگر ایستادند و پورتال نورانی {currentStageName} را فعال کردند.
            </p>
          )}

          {/* Cinematic Emotional Ending for Stage 8 */}
          {isFinalStage && (
            <div className="w-full my-4 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center space-y-2.5">
              {FINALE_STORY_LINES.slice(0, visibleLinesCount).map((line, idx) => (
                <motion.p
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className={`text-sm sm:text-base leading-relaxed ${
                    idx === FINALE_STORY_LINES.length - 1
                      ? 'text-amber-300 font-bold'
                      : 'text-slate-200 font-medium'
                  }`}
                >
                  {line}
                </motion.p>
              ))}

              {/* Heart Signature */}
              <AnimatePresence>
                {showFinalBadge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="pt-4 border-t border-slate-800/80 mt-4 flex flex-col items-center gap-1.5"
                  >
                    <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300">
                      <span>Hasan</span>
                      <Heart className="w-6 h-6 text-rose-500 fill-rose-500 inline-block mx-1 animate-bounce" />
                      <span>Niwsha</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      پایان خاطره‌انگیز ماجراجویی مشترک دو قهرمان چوبی
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 mt-2">
            {!isFinalStage ? (
              <button
                id="btn_next_stage"
                onClick={onNextStage}
                className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <span>سفر به {nextStageName}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  id="btn_play_again_campaign"
                  onClick={() => {
                    if (onRestartCampaign) {
                      onRestartCampaign();
                    } else {
                      onReturnLobby();
                    }
                  }}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>شروع دوباره از مرحله ۱ (Play Again)</span>
                </button>

                <button
                  id="btn_return_to_menu"
                  onClick={onReturnLobby}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  <span>بازگشت به منوی بازی (Return to Menu)</span>
                </button>
              </div>
            )}

            {!isFinalStage && (
              <button
                id="btn_clear_return_lobby"
                onClick={onReturnLobby}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                بازگشت به لابی
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
