import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  Users,
  Shield,
  Compass,
  AlertCircle,
  Minimize2,
  Maximize2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { RoomParticipant } from '../types.ts';
import { isFullscreen, toggleFullscreen } from '../utils/fullscreen.ts';

interface VoiceCallPanelProps {
  myId: string;
  myName: string;
  myRole?: 'explorer' | 'guardian';
  participants: RoomParticipant[];
  isInVoice: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  voiceMembers: string[];
  permissionError: string | null;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  compact?: boolean;
}

export const VoiceCallPanel: React.FC<VoiceCallPanelProps> = ({
  myId,
  myName,
  myRole,
  participants,
  isInVoice,
  isMuted,
  isSpeaking,
  audioLevel,
  voiceMembers,
  permissionError,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  compact = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(compact);
  const [inFullscreen, setInFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => setInFullscreen(isFullscreen());
    checkFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
    };
  }, []);

  // Filter participants in room
  const allMembers: RoomParticipant[] = [
    { id: myId, name: `${myName} (شما)`, role: myRole, isSpeaking, isMuted },
    ...participants.filter((p) => p.id !== myId),
  ];

  return (
    <div dir="rtl" className="font-sans select-none pointer-events-auto">
      {/* Minimized Quick Bar */}
      {isMinimized ? (
        <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2 px-3 shadow-2xl text-slate-100 text-xs">
          {isInVoice ? (
            <>
              <button
                id="btn_voice_quick_mute"
                onClick={onToggleMute}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95 shadow-md ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                }`}
                title={isMuted ? 'میکروفون قطع است' : 'میکروفون وصل است (کلید M)'}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>میکروفون بسته</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 animate-pulse text-slate-950" />
                    <span>ویس‌کال فعال [M]</span>
                  </>
                )}
              </button>

              {/* Audio Waveform */}
              {!isMuted && (
                <div className="flex items-end gap-0.5 h-4 px-1" title="نمایش شدت صدا">
                  <span
                    className={`w-1 rounded-full bg-cyan-400 transition-all ${
                      audioLevel > 15 ? 'h-4 animate-bounce' : 'h-1.5'
                    }`}
                  />
                  <span
                    className={`w-1 rounded-full bg-emerald-400 transition-all ${
                      audioLevel > 15 ? 'h-3 animate-pulse' : 'h-2'
                    }`}
                  />
                  <span
                    className={`w-1 rounded-full bg-cyan-300 transition-all ${
                      audioLevel > 15 ? 'h-3.5 animate-bounce' : 'h-1'
                    }`}
                  />
                </div>
              )}

              <button
                id="btn_voice_quick_leave"
                onClick={onLeaveVoice}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                title="قطع تماس صوتی"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </>
          ) : (
            <button
              id="btn_voice_quick_join"
              onClick={onJoinVoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all active:scale-95 shadow-md shadow-cyan-500/20"
              title="اتصال به ویس‌کال بازیکنان"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>ورود به ویس‌کال صوتی</span>
            </button>
          )}

          <button
            onClick={() => toggleFullscreen()}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
            title={inFullscreen ? 'خروج از تمام صفحه' : 'حالت تمام صفحه'}
          >
            {inFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="بزرگنمایی پنل ویس‌کال"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Expanded Voice Panel */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 relative overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white tracking-wide">ویس‌کال زنده دو نفره</h3>
                <p className="text-[10px] text-slate-400">ارتباط صوتی بلادرنگ (WebRTC P2P)</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Fullscreen Toggle */}
              <button
                onClick={() => toggleFullscreen()}
                className="p-1 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title={inFullscreen ? 'خروج از تمام صفحه' : 'حالت تمام صفحه'}
              >
                {inFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                )}
              </button>

              {/* Minimize Panel */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="کوچک‌سازی پنل"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Permission Error Message */}
          {permissionError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <p>{permissionError}</p>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between px-1">
              <span>اعضای اتاق</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {voiceMembers.length > 0 ? `${voiceMembers.length} آنلاین در ویس` : 'غیرفعال'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {allMembers.map((member) => {
                const isSelf = member.id === myId;
                const isMemberInVoice = isSelf ? isInVoice : voiceMembers.includes(member.id);
                const isMemberSpeaking = isSelf ? isSpeaking : member.isSpeaking;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isMemberInVoice
                        ? isMemberSpeaking
                          ? 'bg-cyan-950/40 border-cyan-400/60 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                          : 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-900/20 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold relative ${
                          member.role === 'explorer'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {member.role === 'explorer' ? (
                          <Compass className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        {isMemberSpeaking && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{member.name}</span>
                        <span className="text-[9px] text-slate-400">
                          {member.role === 'explorer' ? 'کاوشگر (Explorer)' : 'نگهبان (Guardian)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMemberInVoice ? (
                        isSelf && isMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        ) : isMemberSpeaking ? (
                          <div className="flex items-end gap-0.5 h-3 px-1">
                            <span className="w-0.5 h-3 rounded-full bg-cyan-400 animate-bounce" />
                            <span className="w-0.5 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="w-0.5 h-2.5 rounded-full bg-cyan-300 animate-bounce" />
                          </div>
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500">آفلاین</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume visualizer for self */}
          {isInVoice && !isMuted && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>شدت صدای شما:</span>
                <span className="font-mono text-cyan-300">{audioLevel}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-cyan-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            {isInVoice ? (
              <>
                <button
                  id="btn_voice_panel_mute"
                  onClick={onToggleMute}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>قطع صدا</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>میکروفون باز</span>
                    </>
                  )}
                </button>

                <button
                  id="btn_voice_panel_leave"
                  onClick={onLeaveVoice}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 shadow-md shadow-rose-600/30"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>قطع تماس</span>
                </button>
              </>
            ) : (
              <button
                id="btn_voice_panel_join"
                onClick={onJoinVoice}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
              >
                <PhoneCall className="w-4 h-4" />
                <span>اتصال به ویس‌کال صوتی دو نفره</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
