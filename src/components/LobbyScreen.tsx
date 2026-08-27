import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  Play,
  ExternalLink,
  Shield,
  Zap,
  Sparkles,
  Gamepad2,
  Share2,
  Radio,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import type { PlayerRole, RoomData } from '../types.ts';
import { networkClient } from '../multiplayer/networkClient.ts';

interface LobbyScreenProps {
  onCreateRoom: (name: string, role: PlayerRole) => void;
  onJoinRoom: (code: string, name: string, role: PlayerRole) => void;
  roomData: RoomData | null;
  assignedRole: PlayerRole | null;
  onStartGame: () => void;
  onStartSoloPractice: () => void;
  errorMessage: string | null;
  isConnecting: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  roomData,
  assignedRole,
  onStartGame,
  onStartSoloPractice,
  errorMessage,
  isConnecting,
}) => {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('aether_player_name') || `قهرمان_${Math.floor(100 + Math.random() * 900)}`
  );
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('explorer');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [customWorkerUrl, setCustomWorkerUrl] = useState(() => networkClient.getWorkerConfig().url);
  const [isCustomWorker, setIsCustomWorker] = useState(() => networkClient.getWorkerConfig().isCustom);

  // Auto-detect ?room=CODE in URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !roomData) {
      setJoinCode(roomParam.toUpperCase());
      setSelectedRole('guardian');
      setView('join');
    }
  }, [roomData]);

  const handleCopyCode = () => {
    if (!roomData) return;
    navigator.clipboard.writeText(roomData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomData) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomData.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSecondTab = () => {
    if (!roomData) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomData.code}`;
    window.open(url, '_blank');
  };

  const handleSaveWorkerConfig = () => {
    if (isCustomWorker && customWorkerUrl.trim()) {
      networkClient.setWorkerConfig(customWorkerUrl.trim());
    } else {
      networkClient.setWorkerConfig(null);
      setCustomWorkerUrl(networkClient.getWorkerConfig().url);
      setIsCustomWorker(false);
    }
    setShowWorkerModal(false);
  };

  const bothPlayersReady =
    roomData &&
    roomData.players.explorer?.connected &&
    roomData.players.guardian?.connected;

  return (
    <div
      dir="rtl"
      className="relative w-full h-full min-h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-5 md:p-6 pb-20 sm:pb-14 overflow-y-auto overflow-x-hidden select-none font-sans"
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="fixed top-1/4 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center my-auto">
        {/* Main Header */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ماجراجویی آنلاین دونفره ۳بعدی</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm flex items-center justify-center gap-2">
            <span>اِیتِـر</span>
            <span className="text-cyan-400">دوئـو</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-normal self-center">Aether Duo</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-lg mx-auto leading-relaxed">
            سفری هم‌زمان و مشارکتی که دو قهرمان با توانایی‌های مکمل، معماهای باستانی و فیزیکی را حل می‌کنند.
          </p>
        </div>

        {/* Cloudflare Worker Status Indicator Bar */}
        <div className="w-full max-w-xl mb-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>سرور / ورکر کلودفلر (Cloudflare Worker):</span>
            </span>
            <span className="text-emerald-400 font-bold">
              {isCustomWorker ? 'ورکر اختصاصی' : 'متصل و فعال'}
            </span>
          </div>

          <button
            id="btn_open_worker_config"
            onClick={() => setShowWorkerModal(true)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors py-0.5 px-2 rounded-lg hover:bg-slate-800"
            title="تنظیمات آدرس ورکر کلودفلر"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>تنظیم ورکر</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-3 px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {errorMessage}
          </motion.div>
        )}

        {/* --- Screen 1: Active In-Lobby Waiting Room --- */}
        {roomData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                کد اتاق ماجراجویی
              </div>
              <div className="flex items-center gap-3 bg-slate-950/90 border-2 border-cyan-500/40 px-5 py-2.5 rounded-2xl my-1.5">
                <span className="text-3xl sm:text-4xl font-mono font-black text-cyan-400 tracking-widest" dir="ltr">
                  {roomData.code}
                </span>
                <button
                  id="btn_copy_room_code"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors"
                  title="کپی کردن کد اتاق"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs text-slate-400">
                <button
                  id="btn_copy_invite_link"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-medium"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>کپی لینک دعوت</span>
                </button>
                <button
                  id="btn_open_second_tab"
                  onClick={handleOpenSecondTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 transition-colors text-xs font-medium"
                  title="تست بازیکن دوم در تب دیگر"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>تست بازیکن ۲ در تب جدید</span>
                </button>
              </div>

              {/* Player Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
                {/* Explorer Slot */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    roomData.players.explorer?.connected
                      ? 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-70'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-1.5">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-sm font-bold text-white">کایلِن (کاوشگر صاعقه)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">چابک و رسانای انرژی</div>
                  <div className="mt-2">
                    {roomData.players.explorer?.connected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>{roomData.players.explorer.name}</span>
                        {assignedRole === 'explorer' && <span className="text-emerald-400 font-bold">(شما)</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">در انتظار اتصال کاوشگر...</span>
                    )}
                  </div>
                </div>

                {/* Guardian Slot */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                    roomData.players.guardian?.connected
                      ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-70'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-1.5">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-white">بِرام (نگهبان سنگین)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">پهلوان پرقدرت با سپر نور</div>
                  <div className="mt-2">
                    {roomData.players.guardian?.connected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{roomData.players.guardian.name}</span>
                        {assignedRole === 'guardian' && <span className="text-emerald-400 font-bold">(شما)</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">در انتظار اتصال نگهبان...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-4 flex flex-col items-center gap-2.5 w-full">
                {bothPlayersReady ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="w-full flex flex-col items-center"
                  >
                    <div className="text-emerald-400 font-bold text-xs sm:text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>هر دو بازیکن متصل شدند! آماده آغاز ماجراجویی.</span>
                    </div>
                    <button
                      id="btn_start_adventure"
                      onClick={onStartGame}
                      className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>ورود به باغ فراموش‌شده</span>
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="text-slate-400 text-xs sm:text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>کد اتاق <strong className="text-cyan-300 font-mono text-base px-1" dir="ltr">{roomData.code}</strong> را برای هم‌تیمی خود بفرستید...</span>
                    </div>
                    <button
                      id="btn_start_solo_anyway"
                      onClick={onStartSoloPractice}
                      className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-4 py-1 transition-colors"
                    >
                      یا ورود به حالت تمرینی تک‌نفره (سوییچ قهرمان با کلید Tab)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* --- Screen 2: Main Menu & Role Selection --- */
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            {/* Player Name Input */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                نام ماجراجوی شما
              </label>
              <input
                id="input_player_name"
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  localStorage.setItem('aether_player_name', e.target.value);
                }}
                maxLength={20}
                placeholder="نام خود را بنویسید..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-cyan-500 transition-colors text-right"
              />
            </div>

            {/* Character Class Showcase */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                انتخاب شخصیت و توانایی
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Kaelen */}
                <div
                  onClick={() => setSelectedRole('explorer')}
                  className={`cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all ${
                    selectedRole === 'explorer'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">کایلِن (Kaelen)</div>
                      <div className="text-[11px] text-cyan-400 font-medium">کاوشگر صاعقه</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    دونده چابک مجهز به دستکش تِتِر الکتریکی برای فعال‌سازی کلیدهای دوردست و شارژ پدستال‌ها [کلید F].
                  </p>
                </div>

                {/* Bram */}
                <div
                  onClick={() => setSelectedRole('guardian')}
                  className={`cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all ${
                    selectedRole === 'guardian'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">بِرام (Bram)</div>
                      <div className="text-[11px] text-emerald-400 font-medium">نگهبان سنگین</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    پهلوان مجهز به زره کهن، توانمند در جابجایی مکعب‌های مغناطیسی سنگین و ایجاد پل نوری/سپر [کلید F].
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            {view === 'home' && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    id="btn_create_game_flow"
                    disabled={isConnecting}
                    onClick={() => onCreateRoom(playerName, selectedRole)}
                    className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-cyan-600/20 active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>ایجاد اتاق جدید</span>
                  </button>

                  <button
                    id="btn_join_game_flow"
                    disabled={isConnecting}
                    onClick={() => setView('join')}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>ورود با کد اتاق</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-3 text-[11px] text-slate-500 tracking-wider">
                    یا تمرین مستقل
                  </span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                <button
                  id="btn_start_solo_practice_main"
                  onClick={onStartSoloPractice}
                  className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  <span>حالت تمرینی تک‌نفره (سوییچ قهرمان با کلید Tab)</span>
                </button>
              </div>
            )}

            {/* Join Room Code Input View */}
            {view === 'join' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2.5"
              >
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                    کد اتاق دوستتان را وارد کنید
                  </label>
                  <input
                    id="input_join_code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())}
                    maxLength={10}
                    placeholder="مثال: SKY42"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-cyan-400 font-mono text-center text-xl font-bold tracking-widest focus:outline-none focus:border-cyan-400 transition-colors"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    id="btn_cancel_join"
                    onClick={() => setView('home')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    id="btn_submit_join"
                    disabled={!joinCode || isConnecting}
                    onClick={() => onJoinRoom(joinCode, playerName, selectedRole)}
                    className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-cyan-600/20"
                  >
                    {isConnecting ? 'در حال اتصال...' : 'اتصال به اتاق'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Cloudflare Worker Configuration Modal */}
      <AnimatePresence>
        {showWorkerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-right"
              dir="rtl"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>تنظیمات ورکر کلودفلر (Cloudflare Worker)</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                شما می‌توانید بازی را از طریق ورکر کلودفلر اجرا کنید. اگر ورکر اختصاصی دارید آدرس آن را وارد کنید، در غیر این صورت به طور خودکار به آدرس جاری متصل می‌شود.
              </p>

              <div className="space-y-3 mb-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isCustomWorker}
                    onChange={(e) => setIsCustomWorker(e.target.checked)}
                    className="rounded accent-cyan-500 w-4 h-4"
                  />
                  <span>استفاده از آدرس اختصاصی Cloudflare Worker</span>
                </label>

                {isCustomWorker && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      آدرس WebSocket ورکر کلودفلر (مانند wss://my-game.workers.dev/ws):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={customWorkerUrl}
                      onChange={(e) => setCustomWorkerUrl(e.target.value)}
                      placeholder="wss://your-worker.workers.dev/ws"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>آدرس فعال اتصال:</span>
                  <span className="font-mono text-cyan-300 text-[10px]" dir="ltr">
                    {networkClient.getEffectiveWsUrl()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowWorkerModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSaveWorkerConfig}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold"
                >
                  ذخیره تنظیمات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
