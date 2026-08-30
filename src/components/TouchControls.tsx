import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowUp, Hand, MapPin, Compass, MessageSquare, Users } from 'lucide-react';
import type { PlayerRole } from '../types.ts';

interface TouchControlsProps {
  myRole?: PlayerRole;
  soloMode?: boolean;
  onToggleSoloHero?: () => void;
  onUpdateInput: (input: {
    moveVector: { x: number; y: number };
    jump: boolean;
    interact: boolean;
    ability: boolean;
    sprint: boolean;
  }) => void;
  onSendEmote?: (emote: any) => void;
  onSendPing: () => void;
  onOpenGeminiCall?: () => void;
  visible?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  myRole = 'explorer',
  soloMode = false,
  onToggleSoloHero,
  onUpdateInput,
  onSendPing,
  onOpenGeminiCall,
  visible = true,
}) => {
  const [sprintActive, setSprintActive] = useState(false);
  const [isStickActive, setIsStickActive] = useState(false);

  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const centerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const inputRef = useRef({
    moveVector: { x: 0, y: 0 },
    jump: false,
    interact: false,
    ability: false,
    sprint: false,
  });

  const dispatchInput = useCallback(() => {
    onUpdateInput({
      moveVector: { ...inputRef.current.moveVector },
      jump: inputRef.current.jump,
      interact: inputRef.current.interact,
      ability: false,
      sprint: inputRef.current.sprint,
    });
  }, [onUpdateInput]);

  useEffect(() => {
    inputRef.current.sprint = sprintActive;
    dispatchInput();
  }, [sprintActive, dispatchInput]);

  if (!visible) return null;

  // -------------------------------------------------------------
  // VIRTUAL JOYSTICK
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsStickActive(true);

    const rect = e.currentTarget.getBoundingClientRect();
    centerPosRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    updateJoystickPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    activePointerIdRef.current = null;
    setIsStickActive(false);

    if (stickRef.current) {
      stickRef.current.style.transform = 'translate(0px, 0px)';
      stickRef.current.style.transition = 'transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)';
    }

    inputRef.current.moveVector = { x: 0, y: 0 };
    dispatchInput();
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    const dx = clientX - centerPosRef.current.x;
    const dy = clientY - centerPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = window.innerWidth < 640 ? 38 : 46;

    let clampedX = dx;
    let clampedY = dy;

    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    if (stickRef.current) {
      stickRef.current.style.transition = 'none';
      stickRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const normX = clampedX / maxRadius;
    const normY = -(clampedY / maxRadius);

    inputRef.current.moveVector = {
      x: Math.abs(normX) > 0.05 ? normX : 0,
      y: Math.abs(normY) > 0.05 ? normY : 0,
    };
    dispatchInput();
  };

  const handleButtonPress = (key: 'jump' | 'interact', pressed: boolean) => {
    inputRef.current[key] = pressed;
    dispatchInput();
  };

  const isExplorer = myRole === 'explorer';

  return (
    <div
      dir="ltr"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-end p-3 sm:p-5 pb-5 sm:pb-6 pb-safe select-none touch-none"
    >
      {/* Container: Left Joystick & Right Actions - Middle is completely clear! */}
      <div className="flex items-end justify-between w-full">
        {/* =========================================
            VIRTUAL JOYSTICK (LEFT ZONE)
            ========================================= */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            id="touch_joystick_container"
            ref={joystickZoneRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full relative flex items-center justify-center cursor-grab active:cursor-grabbing backdrop-blur-md shadow-2xl transition-colors select-none ${
              isStickActive
                ? 'bg-slate-900/85 border-2 border-cyan-400 shadow-cyan-500/30'
                : 'bg-slate-900/65 border-2 border-slate-700/80'
            }`}
            style={{ touchAction: 'none' }}
          >
            {/* Cardinal Direction Ticks */}
            <div className="absolute inset-2 rounded-full border border-dashed border-slate-600/30 pointer-events-none" />
            <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-slate-500/50 pointer-events-none" />
            <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-slate-500/50 pointer-events-none" />
            <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-slate-500/50 pointer-events-none" />
            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-slate-500/50 pointer-events-none" />

            {/* Inner Center Target */}
            <div className="w-8 h-8 rounded-full border border-slate-700/40 flex items-center justify-center pointer-events-none">
              <Compass className="w-3.5 h-3.5 text-slate-500/40" />
            </div>

            {/* Draggable Stick Head */}
            <div
              ref={stickRef}
              className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-xl pointer-events-none flex items-center justify-center select-none ${
                isExplorer
                  ? isStickActive
                    ? 'bg-cyan-500 shadow-cyan-400/60 scale-105'
                    : 'bg-cyan-600/90 shadow-cyan-600/30'
                  : isStickActive
                  ? 'bg-emerald-500 shadow-emerald-400/60 scale-105'
                  : 'bg-emerald-600/90 shadow-emerald-600/30'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-white/80 shadow-sm" />
            </div>
          </div>

          <div className="text-[9px] font-bold text-slate-400 mt-1 tracking-wider uppercase flex items-center gap-1">
            <span>حرکت</span>
          </div>
        </div>

        {/* =========================================
            ACTION BUTTONS (RIGHT ZONE ONLY)
            ========================================= */}
        <div className="pointer-events-auto flex flex-col items-end gap-2" dir="rtl">
          {/* Small Utility Controls (Right Aligned) */}
          <div className="flex items-center gap-1.5">
            {/* Solo Mode Hero Swap Button */}
            {soloMode && onToggleSoloHero && (
              <button
                id="touch_btn_solo_swap"
                onClick={onToggleSoloHero}
                className="px-2.5 h-9 sm:h-10 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 flex items-center gap-1 text-[11px] font-black shadow-lg active:scale-90 transition-transform"
                title="تغییر شخصیت (نیوشا / حسن)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isExplorer ? 'نیوشا' : 'حسن'}</span>
              </button>
            )}

            {/* Master Gemini AI Guidance Messenger Button */}
            {onOpenGeminiCall && (
              <button
                id="touch_btn_gemini_call"
                onClick={onOpenGeminiCall}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-950/90 border border-amber-400/50 text-amber-300 flex items-center justify-center shadow-lg active:scale-90 transition-transform relative"
                title="پیام‌رسان استاد الیاس (Gemini AI)"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              </button>
            )}

            {/* Ping Beacon Button */}
            <button
              id="touch_btn_ping"
              onClick={onSendPing}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              title="علامت‌گذاری پینگ"
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* Sprint Toggle */}
            <button
              id="touch_btn_sprint"
              onClick={() => setSprintActive(!sprintActive)}
              className={`px-3 h-9 sm:h-10 rounded-2xl border text-[11px] font-black flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                sprintActive
                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-amber-500/30'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
            >
              {sprintActive ? '⚡ دویدن' : 'دویدن'}
            </button>
          </div>

          {/* Primary Action Buttons: Interact [E] & Jump [Space] */}
          <div className="flex items-center gap-2 mt-0.5">
            {/* Interact Button [E] */}
            <button
              id="touch_btn_interact"
              onPointerDown={(e) => {
                e.preventDefault();
                handleButtonPress('interact', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleButtonPress('interact', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleButtonPress('interact', false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-amber-200 text-slate-950 flex flex-col items-center justify-center shadow-xl active:scale-90 transition-transform shadow-amber-500/25"
            >
              <Hand className="w-5 h-5 fill-slate-950" />
              <span className="text-[11px] font-black mt-0.5">عمل (E)</span>
            </button>

            {/* Jump Button [Space] */}
            <button
              id="touch_btn_jump"
              onPointerDown={(e) => {
                e.preventDefault();
                handleButtonPress('jump', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleButtonPress('jump', false);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                handleButtonPress('jump', false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-cyan-300 border-2 border-white text-slate-950 flex flex-col items-center justify-center shadow-xl active:scale-90 transition-transform shadow-cyan-500/25"
            >
              <ArrowUp className="w-5 h-5 stroke-[3]" />
              <span className="text-[11px] font-black mt-0.5">پرش</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
