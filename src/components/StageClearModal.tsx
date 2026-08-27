import React from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface StageClearModalProps {
  stageId: number;
  onNextStage: () => void;
  onReturnLobby: () => void;
}

const STAGE_NAMES: Record<number, string> = {
  1: 'The Forgotten Garden',
  2: 'The Floating Islands',
  3: 'The Clockwork Factory',
};

export const StageClearModal: React.FC<StageClearModalProps> = ({
  stageId,
  onNextStage,
  onReturnLobby,
}) => {
  const isFinalStage = stageId >= 3;
  const currentStageName = STAGE_NAMES[stageId] || `Stage ${stageId}`;
  const nextStageName = STAGE_NAMES[stageId + 1] || 'Endgame';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans text-slate-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 md:p-8 shadow-2xl text-center relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
            <Trophy className="w-8 h-8 text-cyan-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Stage {stageId} Conquered
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            {isFinalStage ? 'Co-op Victory!' : 'Gateway Unlocked!'}
          </h2>

          <p className="text-xs md:text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
            {isFinalStage
              ? 'Congratulations! You and your partner harmonized your abilities and completed all realms of Aether Duo!'
              : `Both adventurers stood together and activated the ancient warp beacon of ${currentStageName}.`}
          </p>

          <div className="w-full space-y-3">
            {!isFinalStage ? (
              <button
                id="btn_next_stage"
                onClick={onNextStage}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>Travel to {nextStageName}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn_replay_adventure"
                onClick={onReturnLobby}
                className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
              >
                Return to Adventure Lobby
              </button>
            )}

            {!isFinalStage && (
              <button
                id="btn_clear_return_lobby"
                onClick={onReturnLobby}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-semibold transition-colors"
              >
                Return to Lobby
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
