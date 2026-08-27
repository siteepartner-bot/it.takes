import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi,
  Users,
  Copy,
  Check,
  Settings,
  MapPin,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';
import type { PlayerRole, EmoteType } from '../types.ts';

interface GameHUDProps {
  roomCode: string | null;
  stageId: number;
  myRole: PlayerRole;
  myName: string;
  partnerName: string;
  partnerRole: PlayerRole;
  partnerConnected: boolean;
  partnerDistance: number;
  latencyMs: number;
  interactionPrompt: string | null;
  checkpointMessage: string | null;
  onSendEmote: (emote: EmoteType) => void;
  onSendPing: () => void;
  onOpenPause: () => void;
  soloMode: boolean;
  onToggleSoloHero: () => void;
}

const STAGE_TITLES: Record<number, { name: string; desc: string }> = {
  1: {
    name: 'The Forgotten Garden',
    desc: 'Collaborate to open the ancient runic gates and power the aqueduct elevator.',
  },
  2: {
    name: 'The Floating Islands',
    desc: 'Navigate moving sky bridges and deflect the sentinel beam to reach the summit.',
  },
  3: {
    name: 'The Clockwork Factory',
    desc: 'Jam crushing pistons and synchronize steam valves to engage the grand gateway.',
  },
};

export const GameHUD: React.FC<GameHUDProps> = ({
  roomCode,
  stageId,
  myRole,
  partnerName,
  partnerRole,
  partnerConnected,
  partnerDistance,
  latencyMs,
  interactionPrompt,
  checkpointMessage,
  onSendEmote,
  onSendPing,
  onOpenPause,
  soloMode,
  onToggleSoloHero,
}) => {
  const [copied, setCopied] = React.useState(false);

  const stageInfo = STAGE_TITLES[stageId] || STAGE_TITLES[1];

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExplorer = myRole === 'explorer';

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 md:p-6 select-none font-sans text-slate-100">
      {/* --- TOP BAR --- */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Stage & Objective Header */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 md:p-4 shadow-xl max-w-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Stage {stageId}: {stageInfo.name}
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-snug">
            {stageInfo.desc}
          </p>
        </div>

        {/* Center: Room Code & Connection Latency */}
        {roomCode && (
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full shadow-lg">
            <button
              id="btn_hud_copy_code"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              title="Click to copy Room Code"
            >
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${latencyMs < 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {latencyMs > 0 ? `${latencyMs}ms` : 'Local'}
            </div>
          </div>
        )}

        {/* Right: Partner Status Card & Settings */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 px-3 shadow-xl flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                partnerRole === 'explorer' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {partnerRole === 'explorer' ? <Zap className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                {partnerName}
                <span
                  className={`w-2 h-2 rounded-full ${
                    partnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={partnerConnected ? 'Connected' : 'Disconnected'}
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {partnerDistance}m away
              </div>
            </div>
          </div>

          <button
            id="btn_pause_settings"
            onClick={onOpenPause}
            className="p-2.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title="Pause & Settings (Esc)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- CENTER NOTIFICATIONS --- */}
      <div className="flex flex-col items-center gap-3">
        {/* Checkpoint / Achievement Message Banner */}
        <AnimatePresence>
          {checkpointMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="pointer-events-auto px-5 py-2.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-bold text-xs md:text-sm shadow-xl flex items-center gap-2 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {checkpointMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Prompt (e.g. Press E to pull lever) */}
        <AnimatePresence>
          {interactionPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-auto px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-white font-medium text-xs md:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2.5"
            >
              <kbd className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-xs">
                E
              </kbd>
              <span>{interactionPrompt}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partner Disconnected Warning */}
        {!partnerConnected && !soloMode && (
          <div className="pointer-events-auto px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse">
            <Wifi className="w-3.5 h-3.5" />
            Partner disconnected. Waiting for reconnection...
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR --- */}
      <div className="flex items-end justify-between w-full">
        {/* Solo Duo Quick Switcher */}
        {soloMode ? (
          <button
            id="btn_solo_swap_hero"
            onClick={onToggleSoloHero}
            className="pointer-events-auto px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 hover:bg-slate-800 text-xs font-bold text-cyan-300 flex items-center gap-2 shadow-lg"
          >
            <Users className="w-3.5 h-3.5" />
            Control: {isExplorer ? '⚡ Kaelen (Explorer)' : '🛡️ Bram (Guardian)'} (Tab to Swap)
          </button>
        ) : (
          /* Role Ability Indicator */
          <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 px-3.5 shadow-xl flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isExplorer ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isExplorer ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {isExplorer ? 'Spark Dash / Tether' : 'Aegis Barrier / Bridge'}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-mono">
                  [F]
                </kbd>
              </div>
              <div className="text-[10px] text-slate-400">
                {isExplorer ? 'Energize conduits & dash' : 'Shield ally & create light platform'}
              </div>
            </div>
          </div>
        )}

        {/* Quick Communication: Emotes & Ping */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-2 rounded-2xl shadow-xl">
          <button
            id="btn_hud_ping"
            onClick={onSendPing}
            className="p-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Drop 3D World Ping Beacon (T)"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[10px]">Ping [T]</span>
          </button>

          <div className="w-px h-5 bg-slate-700" />

          {/* Quick Emotes */}
          <div className="flex items-center gap-1">
            <button
              id="btn_emote_wave"
              onClick={() => onSendEmote('wave')}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90"
              title="Wave (1)"
            >
              👋
            </button>
            <button
              id="btn_emote_cheer"
              onClick={() => onSendEmote('cheer')}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90"
              title="Cheer (2)"
            >
              🎉
            </button>
            <button
              id="btn_emote_point"
              onClick={() => onSendEmote('point')}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90"
              title="Point (3)"
            >
              👉
            </button>
            <button
              id="btn_emote_heart"
              onClick={() => onSendEmote('heart')}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90"
              title="Heart (4)"
            >
              💖
            </button>
            <button
              id="btn_emote_think"
              onClick={() => onSendEmote('think')}
              className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-base transition-transform active:scale-90"
              title="Think (5)"
            >
              🤔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
