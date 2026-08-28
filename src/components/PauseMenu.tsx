import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  LogOut,
  Users,
  Copy,
  Check,
  RotateCcw,
  Radio,
  Settings2,
  Share2,
  BookOpen,
  Maximize2,
  Minimize2,
  Sparkles,
  Mic,
  MessageSquare,
} from 'lucide-react';
import type { GraphicsSettings, AudioSettings } from '../types.ts';
import { networkClient } from '../multiplayer/networkClient.ts';
import { isFullscreen, toggleFullscreen } from '../utils/fullscreen.ts';

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame: () => void;
  onRespawnCheckpoint: () => void;
  roomCode: string | null;
  graphics: GraphicsSettings;
  onChangeGraphics: (newSettings: GraphicsSettings) => void;
  audio: AudioSettings;
  onChangeAudio: (newAudio: AudioSettings) => void;
  soloMode: boolean;
  onToggleSoloHero: () => void;
  onOpenStory?: () => void;
  onOpenGeminiCall?: () => void;
  controlMode?: 'windows' | 'mobile';
  onChangeControlMode?: (mode: 'windows' | 'mobile') => void;
  ambientWakeWordEnabled?: boolean;
  onToggleAmbientWakeWord?: (enabled: boolean) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onClose,
  onLeaveGame,
  onRespawnCheckpoint,
  roomCode,
  graphics,
  onChangeGraphics,
  audio,
  onChangeAudio,
  soloMode,
  onToggleSoloHero,
  onOpenStory,
  onOpenGeminiCall,
  controlMode = 'windows',
  onChangeControlMode,
  ambientWakeWordEnabled = true,
  onToggleAmbientWakeWord,
}) => {
  const [copied, setCopied] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => networkClient.getWorkerConfig().url);
  const [editingServer, setEditingServer] = useState(false);

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

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveServer = () => {
    if (serverUrl.trim()) {
      networkClient.setWorkerConfig(serverUrl.trim());
    } else {
      networkClient.setWorkerConfig(null);
    }
    setEditingServer(false);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md select-none font-sans text-slate-100 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative text-right"
      >
        {/* Close Button */}
        <button
          id="btn_pause_close"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="بستن منو (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
          توقف بازی
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          تنظیمات نوع کنترل، تمام صفحه، صدا و کیفیت بازی.
        </p>

        {/* Room Code Card */}
        {roomCode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 mb-3.5">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                کد دعوت به اتاق
              </div>
              <div className="text-lg font-mono font-black text-cyan-400" dir="ltr">
                {roomCode}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn_pause_copy_link"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="کپی لینک مستقیم دعوت"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>لینک دعوت</span>
              </button>
              <button
                id="btn_pause_copy_code"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Control Mode Selection (Windows vs Mobile) */}
        <div className="mb-3.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
          <label className="text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>نوع کنترل بازی (مخصوص گوشی و ویندوز)</span>
            </span>
            <span className="text-[11px] text-cyan-400 font-medium">
              {controlMode === 'windows' ? 'ویندوز (ماوس و کیبورد)' : 'موبایل (لمسی)'}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn_control_mode_windows"
              onClick={() => onChangeControlMode?.('windows')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                controlMode === 'windows'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-black">
                <Monitor className="w-4 h-4" />
                <span>ویندوز / کامپیوتر</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                قفل ماوس + چرخش ۳۶۰ درجه دوربین
              </span>
            </button>

            <button
              id="btn_control_mode_mobile"
              onClick={() => onChangeControlMode?.('mobile')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                controlMode === 'mobile'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 font-black">
                <Smartphone className="w-4 h-4" />
                <span>گوشی و تبلت</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                جوی‌استیک و دکمه‌های لمسی بهینه
              </span>
            </button>
          </div>
        </div>

        {/* Ambient "استاد" Voice Recognition Toggle (Test mode with instant reversibility!) */}
        {onToggleAmbientWakeWord && (
          <div className="mb-3.5 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300">
                  تشخیص هوشمند با گفتن «استاد» (آزمایشی)
                </div>
                <div className="text-[10px] text-slate-400">
                  بدون نیاز به باز کردن صفحه، فقط بگو: استاد...
                </div>
              </div>
            </div>
            <button
              id="btn_toggle_ambient_voice"
              onClick={() => onToggleAmbientWakeWord(!ambientWakeWordEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                ambientWakeWordEnabled
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {ambientWakeWordEnabled ? 'فعال (بگو استاد)' : 'حالت سنتی (صفحه)'}
            </button>
          </div>
        )}

        {/* Fullscreen Quick Action */}
        <div className="mb-3.5">
          <button
            id="btn_pause_fullscreen"
            onClick={() => toggleFullscreen()}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              {inFullscreen ? (
                <Minimize2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-cyan-400" />
              )}
              <span>{inFullscreen ? 'خروج از حالت تمام صفحه' : 'رفتن به حالت تمام صفحه (Fullscreen)'}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">[F11]</span>
          </button>
        </div>

        {/* Graphics Settings */}
        <div className="mb-3.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>کیفیت گرافیک ۳بعدی</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'low', label: 'پایین' },
              { id: 'medium', label: 'متوسط' },
              { id: 'high', label: 'بالا' },
            ] as const).map(({ id: q, label }) => (
              <button
                key={q}
                id={`btn_gfx_${q}`}
                onClick={() => {
                  const shadowMap = { low: false, medium: true, high: true };
                  const pixelMap = { low: 1.0, medium: 1.25, high: 1.6 };
                  onChangeGraphics({
                    ...graphics,
                    quality: q,
                    shadows: shadowMap[q],
                    pixelRatio: pixelMap[q],
                  });
                }}
                className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                  graphics.quality === q
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Settings */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              {audio.muted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              <span>صدای بازی</span>
            </label>
            <button
              id="btn_audio_mute"
              onClick={() => onChangeAudio({ ...audio, muted: !audio.muted })}
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                audio.muted ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {audio.muted ? 'وصل صدا' : 'بی‌صدا کردن همه'}
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>افکت‌های صوتی (SFX)</span>
                <span dir="ltr">{Math.round(audio.sfxVolume * 100)}%</span>
              </div>
              <input
                id="slider_sfx_volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audio.sfxVolume}
                onChange={(e) =>
                  onChangeAudio({ ...audio, sfxVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>موسیقی پس‌زمینه</span>
                <span dir="ltr">{Math.round(audio.musicVolume * 100)}%</span>
              </div>
              <input
                id="slider_music_volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audio.musicVolume}
                onChange={(e) =>
                  onChangeAudio({ ...audio, musicVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Solo Duo Mode Switcher */}
        {soloMode && (
          <div className="mb-3.5 p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300 font-semibold">
                حالت آزمایشی تک‌نفره
              </span>
            </div>
            <button
              id="btn_pause_switch_hero"
              onClick={onToggleSoloHero}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black"
            >
              تعویض قهرمان: نیوشا / حسن (Tab)
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            id="btn_respawn_checkpoint"
            onClick={() => {
              onRespawnCheckpoint();
              onClose();
            }}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگشت به چک‌پوینت</span>
          </button>

          <button
            id="btn_leave_game"
            onClick={onLeaveGame}
            className="py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج از بازی</span>
          </button>
        </div>

        {/* Story Booklet Button */}
        {onOpenStory && (
          <button
            id="btn_pause_open_story"
            onClick={() => {
              onClose();
              onOpenStory();
            }}
            className="w-full mt-2.5 py-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/10"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>کتابچه داستان و تاریخچه آدمک‌های چوبی</span>
          </button>
        )}

        {/* Master Gemini AI Guidance Messenger Modal Trigger */}
        {onOpenGeminiCall && (
          <button
            id="btn_pause_gemini_call"
            onClick={() => {
              onClose();
              onOpenGeminiCall();
            }}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-950 to-slate-900 hover:from-amber-900 hover:to-slate-800 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/20"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span>پیام‌رسان راهنمای استاد الیاس (Gemini AI)</span>
          </button>
        )}

        <button
          id="btn_resume_game"
          onClick={onClose}
          className="w-full mt-2.5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
        >
          ادامه ماجراجویی
        </button>
      </motion.div>
    </div>
  );
};
