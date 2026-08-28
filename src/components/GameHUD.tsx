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
  Lock,
  Unlock,
  Mic,
  MicOff,
  PhoneCall,
  Volume2,
} from 'lucide-react';
import type { PlayerRole, EmoteType } from '../types.ts';
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

  // Real-time WebRTC Voice Chat
  isInVoice?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
  onToggleVoiceMute?: () => void;
  onJoinVoice?: () => void;
}

export const STAGE_TITLES: Record<number, { name: string; desc: string }> = {
  1: {
    name: 'باغ فراموش‌شده',
    desc: 'با همکاری هم دروازه‌های رونیک را باز کنید و آسانسور قنات باستانی را بالا ببرید.',
  },
  2: {
    name: 'جزایر معلق آسمانی',
    desc: 'سکوی متحرک میان ابرها را هدایت کنید و با سپر محافظ، پرتو لیزر را مهار نمایید.',
  },
  3: {
    name: 'کارخانه مکانیکی و کوره آتش',
    desc: 'پیستون‌های کوبنده غول‌آسا را مهار کرده و شیرهای بخار را همزمان بچرخانید.',
  },
  4: {
    name: 'معبد آینه‌ها و منشورهای نورانی',
    desc: 'منشورهای کهن خورشیدی را به سمت کانون‌های بازتاب بچرخانید تا دروازه اعظم گشوده شود.',
  },
  5: {
    name: 'هزارتوی گرانش و تالار ستارگان',
    desc: 'سوئیچ‌های میدان ضدجاذبه را همگام فعال کنید و از روی پل نوری معلق عبور نمایید.',
  },
  6: {
    name: 'دژ باستانی ابدیت و محاکمه نهایی',
    desc: 'چهار ستون عناصر کهن (آتش، آب، باد، خاک) را شارژ کرده و هسته کیهانی اِیتِر را احیا کنید.',
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
  isInVoice = false,
  isMuted = false,
  isSpeaking = false,
  audioLevel = 0,
  onToggleVoiceMute,
  onJoinVoice,
}) => {
  const [copied, setCopied] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);

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
      className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-3.5 pb-safe select-none font-sans text-slate-100"
    >
      {/* --- TOP BAR --- */}
      <div className="flex items-start justify-between w-full gap-2 sm:gap-3">
        {/* Right (RTL Start): Stage Indicator */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2.5 px-2.5 sm:px-3 shadow-xl max-w-[140px] sm:max-w-xs transition-all">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-cyan-400 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
            <span className="truncate">
              مرحله {stageId}: {stageInfo.name}
            </span>
          </div>
          <p className="hidden sm:block text-[10px] text-slate-300 mt-0.5 leading-relaxed line-clamp-1">
            {stageInfo.desc}
          </p>
        </div>

        {/* Center: Minimalist Room Code & Latency */}
        {roomCode && (
          <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-full shadow-lg text-xs">
            <button
              id="btn_hud_copy_code"
              onClick={handleCopyCode}
              className="flex items-center gap-1 font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              title="کپی کردن کد اتاق"
            >
              <span dir="ltr">{roomCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-slate-400" />
              )}
            </button>
            <div className="w-px h-3 bg-slate-700 mx-0.5" />
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  latencyMs < 100 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span dir="ltr">{latencyMs > 0 ? `${latencyMs}ms` : 'آنلاین'}</span>
            </div>
          </div>
        )}

        {/* Left (RTL End): Partner, Voice & Control Actions */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
          {/* Integrated WebRTC Voice Call Pill */}
          {!soloMode && (
            <div className="flex items-center">
              {isInVoice ? (
                <button
                  id="btn_hud_voice_mute"
                  onClick={onToggleVoiceMute}
                  className={`p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border transition-all shadow-lg flex items-center gap-1 sm:gap-1.5 active:scale-95 ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
                  }`}
                  title={
                    isMuted
                      ? 'میکروفون قطع است. کلیک برای باز کردن [M]'
                      : 'میکروفون وصل است. کلیک برای بستن [M]'
                  }
                >
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
                  )}
                  <span className="hidden md:inline text-[11px] font-bold">
                    {isMuted ? 'میکروفون بسته' : 'ویس فعال [M]'}
                  </span>

                  {/* Real-time wave if speaking */}
                  {!isMuted && (
                    <div className="flex items-end gap-0.5 h-3 px-0.5">
                      <span
                        className={`w-0.5 rounded-full bg-emerald-400 transition-all ${
                          audioLevel > 15 ? 'h-3' : 'h-1'
                        }`}
                      />
                      <span
                        className={`w-0.5 rounded-full bg-cyan-300 transition-all ${
                          audioLevel > 15 ? 'h-3.5' : 'h-1.5'
                        }`}
                      />
                    </div>
                  )}
                </button>
              ) : (
                <button
                  id="btn_hud_join_voice"
                  onClick={onJoinVoice}
                  className="p-1.5 sm:p-2 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition-all shadow-lg flex items-center gap-1 active:scale-95"
                  title="اتصال به ویس‌کال صوتی [M]"
                >
                  <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                  <span className="hidden md:inline text-[11px] font-bold">اتصال ویس‌کال</span>
                </button>
              )}
            </div>
          )}

          {/* Partner Status Card */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2 px-2 sm:px-2.5 shadow-xl flex items-center gap-1.5">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center ${
                partnerRole === 'explorer'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {partnerRole === 'explorer' ? (
                <Zap className="w-3.5 h-3.5" />
              ) : (
                <Shield className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] sm:text-[11px] font-bold flex items-center gap-1 text-white">
                <span className="max-w-[60px] sm:max-w-[90px] truncate">{partnerName}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    partnerConnected ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  title={partnerConnected ? 'متصل' : 'قطع ارتباط'}
                />
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-0.5">
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
                <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
              )}
            </button>
          )}

          {/* Mouse Pointer Lock Toggle (Windows Mode) */}
          {controlMode === 'windows' && onTogglePointerLock && (
            <button
              id="btn_hud_mouse_lock"
              onClick={onTogglePointerLock}
              className={`p-1.5 sm:p-2 rounded-2xl backdrop-blur-md border transition-all shadow-lg flex items-center gap-1 ${
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
                <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              )}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            id="btn_hud_fullscreen"
            onClick={() => toggleFullscreen()}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title={inFullscreen ? 'خروج از تمام صفحه' : 'حالت تمام صفحه'}
          >
            {inFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          {/* Master Elias Gemini AI Messenger Button */}
          <button
            id="btn_gemini_voice_call"
            onClick={onOpenGeminiCall}
            className="group relative p-1.5 sm:p-2 rounded-2xl bg-gradient-to-r from-amber-950/90 to-slate-900/90 backdrop-blur-md border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-1"
            title="راهنمای هوشمند استاد الیاس (کلید V)"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden lg:inline text-xs font-bold text-amber-300">استاد [V]</span>
          </button>

          {/* Settings / Pause Button */}
          <button
            id="btn_pause_settings"
            onClick={onOpenPause}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-lg"
            title="توقف بازی و تنظیمات (کلید Esc)"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* --- CENTER TOAST / PROMPT (Only shown when needed, non-intrusive) --- */}
      <div className="flex flex-col items-center gap-2 my-auto pointer-events-none">
        {/* Checkpoint / Message Toast */}
        <AnimatePresence>
          {checkpointMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="pointer-events-auto px-4 py-1.5 rounded-full bg-cyan-950/95 border border-cyan-400/50 text-cyan-300 font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2 backdrop-blur-md text-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>{checkpointMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interaction Prompt (Press E) */}
        <AnimatePresence>
          {interactionPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-auto px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border border-slate-700 text-white font-medium text-xs sm:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2 text-center"
            >
              <kbd className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-xs font-mono">
                E
              </kbd>
              <span>{interactionPrompt}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partner Disconnected Toast */}
        {!partnerConnected && !soloMode && (
          <div className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-amber-950/95 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>هم‌تیمی قطع شد. در انتظار اتصال مجدد...</span>
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR (Clean & Unobtrusive) --- */}
      {controlMode !== 'mobile' && (
        <div className="flex items-end justify-between w-full gap-2">
          {/* Solo Duo Switcher */}
          {soloMode ? (
            <button
              id="btn_solo_swap_hero"
              onClick={onToggleSoloHero}
              className="pointer-events-auto px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 hover:bg-slate-800 text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-lg"
            >
              <Users className="w-3.5 h-3.5" />
              <span>کنترل: {isExplorer ? '⚡ نیوشا (دختر چوبی)' : '🛡️ حسن (پسر چوبی)'} [Tab]</span>
            </button>
          ) : (
            /* Role Ability Tip */
            <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 px-3 shadow-xl flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center ${
                  isExplorer ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {isExplorer ? <Zap className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              </div>
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <span>{isExplorer ? 'دستکش صاعقه نیوشا' : 'سپر تایتان حسن'}</span>
                <kbd
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-mono"
                  dir="ltr"
                >
                  [F]
                </kbd>
              </div>
            </div>
          )}

          {/* Quick Ping Key */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 px-2 rounded-2xl shadow-xl">
            <button
              id="btn_hud_ping"
              onClick={onSendPing}
              className="px-2 py-1 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-xs font-bold"
              title="علامت‌گذاری ۳بعدی در بازی (کلید T)"
            >
              <MapPin className="w-3 h-3" />
              <span className="text-[10px]">پینگ [T]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
