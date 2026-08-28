import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  Settings,
  MapPin,
  Sparkles,
  Zap,
  Shield,
  MessageSquare,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  MousePointer,
  Lock,
  Unlock,
  Volume2,
} from 'lucide-react';
import type { PlayerRole, EmoteType } from '../types.ts';
import { ProximityVoiceBar } from './ProximityVoiceBar.tsx';
import { isFullscreen, toggleFullscreen } from '../utils/fullscreen.ts';

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
  onOpenGeminiCall: () => void;
  soloMode: boolean;
  onToggleSoloHero: () => void;
  controlMode?: 'windows' | 'mobile';
  onToggleControlMode?: () => void;
  isPointerLocked?: boolean;
  onTogglePointerLock?: () => void;
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
  onOpenGeminiCall,
  soloMode,
  onToggleSoloHero,
  controlMode = 'windows',
  onToggleControlMode,
  isPointerLocked = false,
  onTogglePointerLock,
}) => {
  const [copied, setCopied] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setInFullscreen(isFullscreen());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2 sm:p-4 pb-4 sm:pb-6 pb-safe select-none font-sans text-slate-100"
    >
      {/* --- TOP BAR --- */}
      <div className="flex items-start justify-between w-full gap-1.5 sm:gap-3">
        {/* Stage & Objective Header (Compact on mobile) */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-3 shadow-xl max-w-[150px] sm:max-w-xs md:max-w-sm">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-cyan-400 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
            <span className="truncate">مرحله {stageId}: {stageInfo.name}</span>
          </div>
          <p className="hidden sm:block text-[10px] sm:text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
            {stageInfo.desc}
          </p>
        </div>

        {/* Center: Room Code, Latency & Proximity Voice Bar */}
        <div className="flex flex-col items-center gap-1.5">
          {roomCode && (
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
              <button
                id="btn_hud_copy_code"
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                title="کپی کردن کد اتاق"
              >
                <span dir="ltr">{roomCode}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    latencyMs < 100 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span dir="ltr">{latencyMs > 0 ? `${latencyMs}ms` : 'آنلاین'}</span>
              </div>
            </div>
          )}

          {/* Proximity Voice Call HUD Bar */}
          <ProximityVoiceBar
            partnerName={partnerName}
            partnerDistance={partnerDistance}
            partnerConnected={partnerConnected}
          />
        </div>

        {/* Left: Controls & Status */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2">
          {/* Partner Status Card */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2 px-2 sm:px-3 shadow-xl flex items-center gap-1.5 sm:gap-2.5">
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                partnerRole === 'explorer'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {partnerRole === 'explorer' ? (
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold flex items-center gap-1.5 text-white">
                <span className="max-w-[70px] sm:max-w-[120px] truncate">{partnerName}</span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    partnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={partnerConnected ? 'متصل' : 'قطع ارتباط'}
                />
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                <span>{partnerDistance}m</span>
              </div>
            </div>
          </div>

          {/* Control Mode Switcher: Windows vs Mobile */}
          {onToggleControlMode && (
            <button
              id="btn_hud_toggle_control_mode"
              onClick={onToggleControlMode}
              className={`p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border transition-all shadow-lg flex items-center gap-1 ${
                controlMode === 'windows'
                  ? 'bg-slate-900/90 border-slate-700 text-cyan-300 hover:text-white'
                  : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
              }`}
              title={
                controlMode === 'windows'
                  ? 'حالت کنترل: ویندوز (ماوس و کیبورد). کلیک برای تغییر به لمسی گوشی'
                  : 'حالت کنترل: لمسی گوشی. کلیک برای تغییر به ویندوز'
              }
            >
              {controlMode === 'windows' ? (
                <>
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline text-[11px] font-bold">ویندوز</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-cyan-300" />
                  <span className="hidden md:inline text-[11px] font-bold">موبایل</span>
                </>
              )}
            </button>
          )}

          {/* Mouse Pointer Lock Toggle (Windows Mode) */}
          {controlMode === 'windows' && onTogglePointerLock && (
            <button
              id="btn_hud_mouse_lock"
              onClick={onTogglePointerLock}
              className={`p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border transition-all shadow-lg flex items-center gap-1.5 ${
                isPointerLocked
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={
                isPointerLocked
                  ? 'ماوس قفل است. کلیک برای آزادسازی ماوس (یا فشردن Alt / Esc)'
                  : 'ماوس آزاد است. کلیک برای قفل ماوس و چرخش ۳۶۰ درجه دوربین'
              }
            >
              {isPointerLocked ? (
                <>
                  <Unlock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="hidden md:inline text-[11px] font-bold text-amber-200">آزادسازی ماوس [Alt]</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline text-[11px] font-bold text-cyan-300">قفل ماوس ۳۶۰°</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            id="btn_hud_fullscreen"
            onClick={() => toggleFullscreen()}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title={inFullscreen ? 'خروج از تمام صفحه (Esc)' : 'حالت تمام صفحه (Fullscreen)'}
          >
            {inFullscreen ? (
              <Minimize2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Master Elias Gemini AI Messenger Button */}
          <button
            id="btn_gemini_voice_call"
            onClick={onOpenGeminiCall}
            className="group relative p-1.5 sm:p-2 rounded-2xl bg-gradient-to-r from-amber-950/90 to-slate-900/90 backdrop-blur-md border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
            title="پیام‌رسان راهنمای استاد الیاس (Gemini AI) - کلید V"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-xs font-black text-amber-300">پیام به استاد [V]</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
          </button>

          {/* Settings / Pause Button */}
          <button
            id="btn_pause_settings"
            onClick={onOpenPause}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title="توقف بازی و تنظیمات (کلید Esc)"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* --- CENTER NOTIFICATIONS --- */}
      <div className="flex flex-col items-center gap-2 my-auto pointer-events-none">
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
              className="pointer-events-auto px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl bg-slate-900/95 border border-slate-700 text-white font-medium text-xs sm:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2 text-center"
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
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>هم‌تیمی قطع شد. در انتظار اتصال مجدد...</span>
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR (Hidden on Mobile to ensure zero screen clutter) --- */}
      {controlMode !== 'mobile' && (
        <div className="flex items-end justify-between w-full gap-2">
          {/* Solo Duo Quick Switcher */}
          {soloMode ? (
            <button
              id="btn_solo_swap_hero"
              onClick={onToggleSoloHero}
              className="pointer-events-auto px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 hover:bg-slate-800 text-[11px] sm:text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-lg"
            >
              <Users className="w-3.5 h-3.5" />
              <span>کنترل: {isExplorer ? '⚡ نیوشا (دختر چوبی)' : '🛡️ حسن (پسر چوبی)'} [Tab]</span>
            </button>
          ) : (
            /* Role Ability Indicator */
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2.5 px-2.5 sm:px-3.5 shadow-xl flex items-center gap-2 sm:gap-3">
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                  isExplorer ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {isExplorer ? (
                  <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                ) : (
                  <Shield className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                )}
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{isExplorer ? 'دستکش صاعقه نیوشا' : 'سپر تایتان حسن'}</span>
                  <kbd
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-mono"
                    dir="ltr"
                  >
                    [F]
                  </kbd>
                </div>
                <div className="hidden sm:block text-[10px] text-slate-400">
                  {isExplorer
                    ? 'شارژ پیستون‌ها، مدارهای معلق و شلیک صاعقه'
                    : 'مهار و بازتاب پرتوهای لیزر دفاعی'}
                </div>
              </div>
            </div>
          )}

          {/* Quick Communication: Ping */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-1 sm:gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 sm:p-2 rounded-2xl shadow-xl">
            <button
              id="btn_hud_ping"
              onClick={onSendPing}
              className="p-1.5 sm:p-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-xs font-bold"
              title="علامت‌گذاری ۳بعدی در بازی (کلید T)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px]">پینگ [T]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
