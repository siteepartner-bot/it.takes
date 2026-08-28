import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Volume2,
  VolumeX,
  Monitor,
  LogOut,
  Users,
  Copy,
  Check,
  RotateCcw,
  Radio,
  Settings2,
  Share2,
  BookOpen,
  Cloud,
  Sparkles,
  Maximize,
  Minimize,
  Smartphone,
  Laptop,
  RefreshCw,
  Gamepad2,
} from 'lucide-react';
import type { GraphicsSettings, AudioSettings } from '../types.ts';
import { networkClient } from '../multiplayer/networkClient.ts';

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
  onOpenCloudflareGuide?: () => void;
  controlMode?: 'auto' | 'desktop' | 'touch';
  onChangeControlMode?: (mode: 'auto' | 'desktop' | 'touch') => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
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
  onOpenCloudflareGuide,
  controlMode,
  onChangeControlMode,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [copied, setCopied] = useState(false);
  const [workerConfig, setWorkerConfig] = useState(() => networkClient.getWorkerConfig());
  const [editingWorker, setEditingWorker] = useState(false);
  const [workerInput, setWorkerInput] = useState(workerConfig.url);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWorker = () => {
    if (workerInput.trim()) {
      networkClient.setWorkerConfig(workerInput.trim());
    } else {
      networkClient.setWorkerConfig(null);
    }
    const updated = networkClient.getWorkerConfig();
    setWorkerConfig(updated);
    setWorkerInput(updated.url);
    setEditingWorker(false);
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
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative text-right"
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
        <p className="text-xs text-slate-400 mb-4 sm:mb-5">
          تنظیمات صدا، گرافیک، ورکر شبکه و مدیریت سشن ماجراجویی.
        </p>

        {/* Room Code Card */}
        {roomCode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 mb-4">
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

        {/* Cloudflare Worker Card */}
        <div className="mb-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>شبکه ورکر کلودفلر (Cloudflare Worker)</span>
            </div>
            <button
              onClick={() => setEditingWorker(!editingWorker)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              <span>{editingWorker ? 'انصراف' : 'تغییر آدرس'}</span>
            </button>
          </div>

          {editingWorker ? (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                dir="ltr"
                value={workerInput}
                onChange={(e) => setWorkerInput(e.target.value)}
                placeholder="wss://your-worker.workers.dev/ws"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    networkClient.setWorkerConfig(null);
                    const updated = networkClient.getWorkerConfig();
                    setWorkerConfig(updated);
                    setWorkerInput(updated.url);
                    setEditingWorker(false);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                >
                  بازنشانی به خودکار
                </button>
                <button
                  onClick={handleSaveWorker}
                  className="px-3 py-1 rounded bg-cyan-600 text-slate-950 font-bold text-[11px]"
                >
                  ذخیره
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>وضعیت اتصال:</span>
              <span className="text-emerald-400 font-medium">فعال و متصل ({workerConfig.isCustom ? 'ورکر اختصاصی' : 'سرور خودکار'})</span>
            </div>
          )}

          {onOpenCloudflareGuide && (
            <button
              id="btn_pause_cf_guide"
              onClick={() => {
                onClose();
                onOpenCloudflareGuide();
              }}
              className="w-full mt-2 py-1.5 px-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span>راهنمای فعال‌سازی جمینای روی Cloudflare</span>
              </div>
              <span className="text-[10px] text-amber-400/80">مشاهده کد ورکر</span>
            </button>
          )}
        </div>

        {/* Control Mode & Fullscreen Settings */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>حالت کنترل و نمایش</span>
            </label>
            {onToggleFullscreen && (
              <button
                id="btn_pause_toggle_fullscreen"
                onClick={onToggleFullscreen}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center gap-1 hover:bg-cyan-900 transition-colors"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'خروج از تمام‌صفحه' : 'بازی تمام‌صفحه'}</span>
              </button>
            )}
          </div>

          {onChangeControlMode && (
            <div className="grid grid-cols-3 gap-2">
              <button
                id="btn_pause_control_desktop"
                onClick={() => onChangeControlMode('desktop')}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  controlMode === 'desktop'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                <span>ویندوز / کیبورد</span>
              </button>

              <button
                id="btn_pause_control_touch"
                onClick={() => onChangeControlMode('touch')}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  controlMode === 'touch'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>گوشی / لمسی</span>
              </button>

              <button
                id="btn_pause_control_auto"
                onClick={() => onChangeControlMode('auto')}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  controlMode === 'auto'
                    ? 'bg-slate-800 border-slate-600 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>خودکار</span>
              </button>
            </div>
          )}
        </div>

        {/* Graphics Settings */}
        <div className="mb-4 sm:mb-5">
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
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center justify-between mb-2.5">
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

          <div className="space-y-2.5">
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
          <div className="mb-4 p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
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
              تعویض قهرمان (Tab)
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
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
            className="w-full mt-3 py-2.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/10"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>کتابچه داستان و تاریخچه آدمک‌های چوبی</span>
          </button>
        )}

        {/* Gemini Voice Guidance Button */}
        {onOpenGeminiCall && (
          <button
            id="btn_pause_gemini_call"
            onClick={() => {
              onClose();
              onOpenGeminiCall();
            }}
            className="w-full mt-2.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-cyan-500/20"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>بیسیم صوتی با جمینای • استاد الیاس (کلید V)</span>
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
