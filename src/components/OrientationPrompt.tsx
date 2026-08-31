import React, { useState, useEffect } from 'react';
import { RotateCw, Smartphone, Check } from 'lucide-react';

export const OrientationPrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth < 1024);

      if (isMobileDevice) {
        // Screen orientation or aspect ratio check
        const isPort = window.innerHeight > window.innerWidth;
        setIsPortrait(isPort);
      } else {
        setIsPortrait(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRotateLock = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (_) {
      // Browser might restrict orientation lock without user permission
    }
  };

  if (!isPortrait || dismissed) return null;

  return (
    <div
      id="mobile_orientation_overlay"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        {/* Animated rotating phone icon */}
        <div className="w-16 h-28 border-4 border-cyan-400 rounded-2xl flex items-center justify-center animate-[spin_3s_ease-in-out_infinite] shadow-lg shadow-cyan-500/20">
          <Smartphone className="w-8 h-8 text-cyan-300" />
        </div>
        <RotateCw className="w-10 h-10 text-amber-400 absolute -top-1 -right-1 animate-spin" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
        گوشی خود را <span className="text-cyan-400">افقی (Landscape)</span> کنید
      </h2>
      <p className="text-slate-300 text-sm max-w-xs leading-relaxed mb-6">
        برای تسلط کامل روی جوی‌استیک، دوربین و لذت بردن از محیط سه‌بعدی تپه‌های اثیر، لطفاً گوشی را بچرخانید.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          id="btn_auto_landscape"
          onClick={handleRotateLock}
          className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform"
        >
          <RotateCw className="w-4 h-4 stroke-[2.5]" />
          <span>چرخش خودکار به حالت افقی</span>
        </button>

        <button
          id="btn_dismiss_orientation"
          onClick={() => setDismissed(true)}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <Check className="w-3.5 h-3.5" />
          <span>ادامه به همین شکل</span>
        </button>
      </div>
    </div>
  );
};
