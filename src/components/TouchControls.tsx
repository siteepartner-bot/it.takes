import React, { useRef, useState, useEffect } from 'react';
import { ArrowUp, Hand, Zap, MapPin, Smile } from 'lucide-react';
import type { EmoteType } from '../types.ts';

interface TouchControlsProps {
  onUpdateInput: (input: {
    moveVector: { x: number; y: number };
    jump: boolean;
    interact: boolean;
    ability: boolean;
    sprint: boolean;
  }) => void;
  onSendEmote: (emote: EmoteType) => void;
  onSendPing: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onUpdateInput,
  onSendEmote,
  onSendPing,
}) => {
  const [moveVec, setMoveVec] = useState({ x: 0, y: 0 });
  const [jumpPressed, setJumpPressed] = useState(false);
  const [interactPressed, setInteractPressed] = useState(false);
  const [abilityPressed, setAbilityPressed] = useState(false);
  const [sprintActive, setSprintActive] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);

  const joystickRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    onUpdateInput({
      moveVector: moveVec,
      jump: jumpPressed,
      interact: interactPressed,
      ability: abilityPressed,
      sprint: sprintActive,
    });
  }, [moveVec, jumpPressed, interactPressed, abilityPressed, sprintActive, onUpdateInput]);

  // Joystick touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      updateThumb(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateThumb(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setMoveVec({ x: 0, y: 0 });
        if (stickRef.current) {
          stickRef.current.style.transform = 'translate(0px, 0px)';
        }
        break;
      }
    }
  };

  const updateThumb = (clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    let clampedX = dx;
    let clampedY = dy;

    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    if (stickRef.current) {
      stickRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    // Normalized vector -1 to 1
    setMoveVec({
      x: clampedX / maxRadius,
      y: -(clampedY / maxRadius),
    });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-end p-3 sm:p-5 pb-6 pb-safe select-none touch-none">
      {/* Joystick Zone (Left) & Actions (Right) */}
      <div className="flex items-end justify-between w-full">
        <div
          id="touch_joystick_container"
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="pointer-events-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-900/60 border-2 border-slate-700/80 backdrop-blur-md relative flex items-center justify-center shadow-xl active:border-cyan-400/80 transition-colors"
        >
          <div
            ref={stickRef}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-500/80 border-2 border-white shadow-lg pointer-events-none flex items-center justify-center transition-transform"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/70" />
          </div>
        </div>

        {/* Action Buttons Zone (Right) */}
        <div className="pointer-events-auto flex flex-col items-end gap-2.5">
          {/* Emote Picker Drawer */}
          {showEmotes && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 p-1.5 rounded-2xl shadow-xl backdrop-blur-md mb-1">
              {(['wave', 'cheer', 'point', 'heart', 'think'] as EmoteType[]).map((em) => {
                const emojis = { wave: '👋', cheer: '🎉', point: '👉', heart: '💖', think: '🤔' };
                return (
                  <button
                    key={em}
                    onClick={() => {
                      onSendEmote(em);
                      setShowEmotes(false);
                    }}
                    className="w-8 h-8 rounded-xl hover:bg-slate-800 text-base flex items-center justify-center active:scale-90"
                  >
                    {emojis[em]}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Ping button */}
            <button
              id="touch_btn_ping"
              onClick={onSendPing}
              className="w-10 h-10 rounded-2xl bg-slate-900/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg active:scale-90"
              title="پینگ"
            >
              <MapPin className="w-4 h-4" />
            </button>

            {/* Emotes toggle */}
            <button
              id="touch_btn_emotes"
              onClick={() => setShowEmotes(!showEmotes)}
              className="w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700 text-amber-400 flex items-center justify-center shadow-lg active:scale-90"
              title="ایموت‌ها"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Sprint Toggle */}
            <button
              id="touch_btn_sprint"
              onClick={() => setSprintActive(!sprintActive)}
              className={`px-3 h-10 rounded-2xl border text-xs font-bold flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                sprintActive
                  ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-cyan-500/30'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300'
              }`}
            >
              دویدن
            </button>
          </div>

          {/* Primary Action Hex-cluster */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Ability [F] */}
            <button
              id="touch_btn_ability"
              onTouchStart={() => setAbilityPressed(true)}
              onTouchEnd={() => setAbilityPressed(false)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/90 border-2 border-amber-300 text-slate-950 flex flex-col items-center justify-center shadow-lg active:scale-90"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span className="text-[9px] font-black">مهارت [F]</span>
            </button>

            {/* Interact [E] */}
            <button
              id="touch_btn_interact"
              onTouchStart={() => setInteractPressed(true)}
              onTouchEnd={() => setInteractPressed(false)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/90 border-2 border-emerald-300 text-slate-950 flex flex-col items-center justify-center shadow-lg active:scale-90"
            >
              <Hand className="w-5 h-5" />
              <span className="text-[9px] font-black">عمل [E]</span>
            </button>

            {/* Jump [Space] */}
            <button
              id="touch_btn_jump"
              onTouchStart={() => setJumpPressed(true)}
              onTouchEnd={() => setJumpPressed(false)}
              className="col-span-2 h-12 sm:h-14 rounded-2xl bg-cyan-500 border-2 border-cyan-200 text-slate-950 font-black text-sm uppercase flex items-center justify-center gap-1.5 shadow-xl shadow-cyan-500/20 active:scale-95"
            >
              <ArrowUp className="w-4 h-4 stroke-[3]" />
              <span>پرش</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
