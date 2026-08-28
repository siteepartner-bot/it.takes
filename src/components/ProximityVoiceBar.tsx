import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Volume1, VolumeX, Radio, Signal, HelpCircle } from 'lucide-react';
import { proximityVoiceManager, type ProximityVoiceState } from '../audio/proximityVoice.ts';

interface ProximityVoiceBarProps {
  partnerName: string;
  partnerDistance: number;
  partnerConnected: boolean;
}

export const ProximityVoiceBar: React.FC<ProximityVoiceBarProps> = ({
  partnerName,
  partnerDistance,
  partnerConnected,
}) => {
  const [state, setState] = useState<ProximityVoiceState>(() => proximityVoiceManager.getState());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsubscribe = proximityVoiceManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    proximityVoiceManager.updateDistance(partnerDistance);
  }, [partnerDistance]);

  const handleToggleMic = async () => {
    await proximityVoiceManager.toggleMicrophone();
  };

  const isMic = state.isMicActive;
  const volPct = Math.round(state.effectiveVolume * 100);

  // Determine signal icon and color based on distance and volume
  let SignalColor = 'text-emerald-400';
  let VolumeIcon = Volume2;

  if (volPct < 15) {
    SignalColor = 'text-rose-400';
    VolumeIcon = VolumeX;
  } else if (volPct < 50) {
    SignalColor = 'text-amber-400';
    VolumeIcon = Volume1;
  }

  return (
    <div
      dir="rtl"
      className="pointer-events-auto flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2 px-3 shadow-xl text-slate-100 font-sans select-none relative"
    >
      {/* Mic Toggle Button */}
      <button
        id="btn_proximity_mic_toggle"
        onClick={handleToggleMic}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md ${
          isMic
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
        }`}
        title={isMic ? 'میکروفون فعال است (کلید M)' : 'روشن کردن چت صوتی مکانی (کلید M)'}
      >
        {isMic ? (
          <>
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            <span>ویس‌کال روشن [M]</span>
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5 text-slate-400" />
            <span>روشن کردن ویس‌کال</span>
          </>
        )}
      </button>

      {/* Proximity Spatial Gauge */}
      <div className="flex items-center gap-2 px-2 border-r border-slate-800">
        <VolumeIcon className={`w-4 h-4 ${SignalColor}`} />
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-[11px] font-bold text-white">
            <span>{partnerName || 'هم‌تیمی'}</span>
            <span className="text-[10px] text-cyan-300 font-mono">({Math.round(partnerDistance)}m)</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-400">
            <span>حجم صدا:</span>
            <span className={`font-mono font-bold ${SignalColor}`}>{volPct}%</span>
          </div>
        </div>
      </div>

      {/* Live Equalizer / Waveform animation when speaking */}
      {isMic && (
        <div className="flex items-end gap-0.5 h-4 px-1" title="نمایش امواج صوتی">
          <span
            className={`w-1 rounded-full bg-cyan-400 transition-all ${
              state.isLocalSpeaking ? 'h-4 animate-bounce' : 'h-1.5'
            }`}
          />
          <span
            className={`w-1 rounded-full bg-emerald-400 transition-all ${
              state.isLocalSpeaking ? 'h-3 animate-pulse' : 'h-2'
            }`}
          />
          <span
            className={`w-1 rounded-full bg-cyan-300 transition-all ${
              state.isLocalSpeaking ? 'h-3.5 animate-bounce' : 'h-1'
            }`}
          />
        </div>
      )}

      {/* Info Icon & Tooltip */}
      <button
        onClick={() => setShowTooltip((prev) => !prev)}
        className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 transition-colors"
        title="راهنمای ویس‌کال مکانی"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip Overlay */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 w-64 bg-slate-950 border border-cyan-500/50 rounded-xl p-3 shadow-2xl z-50 text-[11px] leading-relaxed text-slate-200"
          >
            <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              <span>چت صوتی مکانی (Proximity Voice):</span>
            </div>
            <p>
              با حرکت در دنیای سه بعدی بازی، صدای هم‌تیمی شما متناسب با **فاصله مکانی** تغییر می‌کند:
            </p>
            <ul className="list-disc list-inside mt-1 text-[10px] space-y-0.5 text-slate-300">
              <li>**کمتر از ۴ متر:** صدای شفاف و با کیفیت حداکثر</li>
              <li>**بیش از ۱۵ متر:** افت حجم صدا و ایجاد حالت بیسیم رادیویی</li>
              <li>**بیش از ۳۵ متر:** قطعی صدا به دلیل فاصله بسیار زیاد</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
