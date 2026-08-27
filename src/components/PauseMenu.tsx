import React from 'react';
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
} from 'lucide-react';
import type { GraphicsSettings, AudioSettings } from '../types.ts';

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
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none font-sans text-slate-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          id="btn_pause_close"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">
          Paused
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Adventure settings and session controls.
        </p>

        {/* Room Code Card */}
        {roomCode && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Invite Code
              </div>
              <div className="text-lg font-mono font-black text-cyan-400">
                {roomCode}
              </div>
            </div>
            <button
              id="btn_pause_copy_code"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        )}

        {/* Graphics Settings */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-cyan-400" />
            Graphics Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((q) => (
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
                className={`py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
                  graphics.quality === q
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Settings */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              {audio.muted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              Audio Volume
            </label>
            <button
              id="btn_audio_mute"
              onClick={() => onChangeAudio({ ...audio, muted: !audio.muted })}
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                audio.muted ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {audio.muted ? 'Unmute' : 'Mute All'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Sound FX</span>
                <span>{Math.round(audio.sfxVolume * 100)}%</span>
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
                <span>Ambient Music</span>
                <span>{Math.round(audio.musicVolume * 100)}%</span>
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
          <div className="mb-6 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300 font-semibold">
                Solo Duo Testing Mode
              </span>
            </div>
            <button
              id="btn_pause_switch_hero"
              onClick={onToggleSoloHero}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black"
            >
              Switch Hero (Tab)
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="btn_respawn_checkpoint"
            onClick={() => {
              onRespawnCheckpoint();
              onClose();
            }}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Checkpoint
          </button>

          <button
            id="btn_leave_game"
            onClick={onLeaveGame}
            className="py-3 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave Adventure
          </button>
        </div>

        <button
          id="btn_resume_game"
          onClick={onClose}
          className="w-full mt-3 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
        >
          Resume Adventure
        </button>
      </motion.div>
    </div>
  );
};
