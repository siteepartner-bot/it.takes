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
    name: 'باغ فراموش‌شده',
    desc: 'با همکاری هم دروازه‌های رونیک را باز کنید و آسانسور قنات باستانی را بالا ببرید.',
  },
  2: {
    name: 'جزایر معلق آسمانی',
    desc: 'سکوی متحرک میان ابرها را هدایت کنید و با سپر محافظ، پرتو لیزر را مهار نمایید.',
  },
  3: {
    name: 'کارخانه مکانیکی',
    desc: 'پیستون‌های کوبنده غول‌آسا را مهار کرده و شیرهای بخار را همزمان بچرخانید.',
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
    <div
      dir="rtl"
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 md:p-5 pb-5 sm:pb-8 pb-safe select-none font-sans text-slate-100"
    >
      {/* --- TOP BAR --- */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Stage & Objective Header */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xl max-w-xs sm:max-w-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>مرحله {stageId}: {stageInfo.name}</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
            {stageInfo.desc}
          </p>
        </div>

        {/* Center: Room Code & Connection Latency */}
        {roomCode && (
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full shadow-lg">
            <button
              id="btn_hud_copy_code"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              title="کپی کردن کد اتاق"
            >
              <span dir="ltr">{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${latencyMs < 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span dir="ltr">{latencyMs > 0 ? `${latencyMs}ms` : 'آنلاین'}</span>
            </div>
          </div>
        )}

        {/* Left: Partner Status Card & Settings */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-2.5 px-3 shadow-xl flex items-center gap-2.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                partnerRole === 'explorer' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {partnerRole === 'explorer' ? <Zap className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                <span>{partnerName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    partnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={partnerConnected ? 'متصل' : 'قطع ارتباط'}
                />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                <span>فاصله: {partnerDistance} متر</span>
              </div>
            </div>
          </div>

          <button
            id="btn_pause_settings"
            onClick={onOpenPause}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title="توقف بازی و تنظیمات (کلید Esc)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- CENTER NOTIFICATIONS --- */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 my-auto pointer-events-none">
        {/* Checkpoint / Achievement Message Banner */}
        <AnimatePresence>
          {checkpointMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="pointer-events-auto px-4 sm:px-5 py-2 rounded-full bg-cyan-950/95 border border-cyan-400/50 text-cyan-300 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 backdrop-blur-md text-center"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{checkpointMessage}</span>
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
              className="pointer-events-auto px-4 sm:px-5 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 text-white font-medium text-xs sm:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-center"
            >
              <kbd className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-xs font-mono">
                E
              </kbd>
              <span>{interactionPrompt}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partner Disconnected Warning */}
        {!partnerConnected && !soloMode && (
          <div className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-amber-950/95 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse">
            <Wifi className="w-3.5 h-3.5" />
            <span>هم‌تیمی قطع شد. در انتظار اتصال مجدد...</span>
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR (Elevated with safe margin) --- */}
      <div className="flex items-end justify-between w-full gap-2">
        {/* Solo Duo Quick Switcher */}
        {soloMode ? (
          <button
            id="btn_solo_swap_hero"
            onClick={onToggleSoloHero}
            className="pointer-events-auto px-3 sm:px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 hover:bg-slate-800 text-xs font-bold text-cyan-300 flex items-center gap-2 shadow-lg"
          >
            <Users className="w-3.5 h-3.5" />
            <span>کنترل: {isExplorer ? '⚡ نورا (دختر چوبی)' : '🛡️ برسام (پسر چوبی)'} (کلید Tab)</span>
          </button>
        ) : (
          /* Role Ability Indicator */
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-2.5 px-3 sm:px-3.5 shadow-xl flex items-center gap-2.5 sm:gap-3">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                isExplorer ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isExplorer ? <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> : <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{isExplorer ? 'دستکش صاعقه نورا' : 'سپر تایتان برسام'}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-mono" dir="ltr">
                  [F]
                </kbd>
              </div>
              <div className="text-[10px] text-slate-400">
                {isExplorer ? 'شارژ پیستون‌ها، مدارهای معلق و شلیک صاعقه' : 'مهار و بازتاب پرتوهای لیزر دفاعی'}
              </div>
            </div>
          </div>
        )}

        {/* Quick Communication: Emotes & Ping */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 sm:p-2 rounded-2xl shadow-xl">
          <button
            id="btn_hud_ping"
            onClick={onSendPing}
            className="p-1.5 sm:p-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-xs font-bold"
            title="علامت‌گذاری ۳بعدی در بازی (کلید T)"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[10px]">پینگ [T]</span>
          </button>

          <div className="w-px h-4 bg-slate-700" />

          {/* Quick Emotes */}
          <div className="flex items-center gap-1">
            <button
              id="btn_emote_wave"
              onClick={() => onSendEmote('wave')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-sm sm:text-base transition-transform active:scale-90"
              title="سلام [1]"
            >
              👋
            </button>
            <button
              id="btn_emote_cheer"
              onClick={() => onSendEmote('cheer')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-sm sm:text-base transition-transform active:scale-90"
              title="هورا [2]"
            >
              🎉
            </button>
            <button
              id="btn_emote_point"
              onClick={() => onSendEmote('point')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-sm sm:text-base transition-transform active:scale-90"
              title="اشاره [3]"
            >
              👉
            </button>
            <button
              id="btn_emote_heart"
              onClick={() => onSendEmote('heart')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-sm sm:text-base transition-transform active:scale-90"
              title="قلب [4]"
            >
              💖
            </button>
            <button
              id="btn_emote_think"
              onClick={() => onSendEmote('think')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-sm sm:text-base transition-transform active:scale-90"
              title="فکر کردن [5]"
            >
              🤔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
