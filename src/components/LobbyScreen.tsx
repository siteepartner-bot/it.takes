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
  Wifi,
} from 'lucide-react';
import type { PlayerRole, RoomData } from '../types.ts';
import { networkClient, type NetworkMode } from '../multiplayer/networkClient.ts';

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
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('aether_player_name')) || `قهرمان_${Math.floor(100 + Math.random() * 900)}`
  );
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('explorer');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => networkClient.getNetworkMode());
  const [customWorkerUrl, setCustomWorkerUrl] = useState(() => networkClient.getWorkerConfig().url);
  const [isCustomWorker, setIsCustomWorker] = useState(() => networkClient.getWorkerConfig().isCustom);

  const isCloudflare = networkClient.isCloudflareStaticHost();

  // Save player name
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aether_player_name', name);
    }
  };

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

  const handleSaveNetworkConfig = () => {
    networkClient.setNetworkMode(networkMode);
    if (isCustomWorker && customWorkerUrl.trim()) {
      networkClient.setWorkerConfig(customWorkerUrl.trim());
    } else {
      networkClient.setWorkerConfig(null);
      setCustomWorkerUrl(networkClient.getWorkerConfig().url);
      setIsCustomWorker(false);
    }
    setShowNetworkModal(false);
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
            <span>ماجراجویی دونفره آنلاین ۳بعدی</span>
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

        {/* Network & Cloudflare Status Indicator Bar */}
        <div className="w-full max-w-xl mb-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              {networkMode === 'p2p' || (networkMode === 'auto' && isCloudflare) ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">اتصال مستقیم P2P (ویژه کلودفلر - بدون نیاز به سرور)</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>سرور وب‌سوکت:</span>
                  <span className="text-emerald-400 font-bold">{isCustomWorker ? 'ورکر اختصاصی' : 'متصل و فعال'}</span>
                </>
              )}
            </div>
          </div>

          <button
            id="btn_open_worker_config"
            onClick={() => setShowNetworkModal(true)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors py-1 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800"
            title="تنظیمات نوع اتصال و سرور"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>تنظیمات شبکه</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-3 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{errorMessage}</span>
            </div>
            {isCloudflare && networkMode !== 'p2p' && (
              <button
                onClick={() => {
                  networkClient.setNetworkMode('p2p');
                  setNetworkMode('p2p');
                }}
                className="text-[11px] text-amber-300 underline font-bold px-2 py-0.5 rounded bg-amber-950/60"
              >
                تغییر به حالت P2P
              </button>
            )}
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
                کد اتاق ماجراجویی شما
              </div>
              <div className="flex items-center gap-3 bg-slate-950/90 border-2 border-cyan-500/40 px-5 py-2.5 rounded-2xl my-1.5 shadow-inner">
                <span className="text-3xl sm:text-4xl font-mono font-black text-cyan-400 tracking-widest" dir="ltr">
                  {roomData.code}
                </span>
                <button
                  id="btn_copy_room_code"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="کپی کد اتاق"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {/* Fast Invite Link */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 mb-4">
                <button
                  id="btn_copy_invite_link"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copied ? 'لینک کپی شد!' : 'کپی لینک مستقیم دعوت'}</span>
                </button>

                <button
                  id="btn_open_tab_test"
                  onClick={handleOpenSecondTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  title="باز کردن تب دوم جهت تست دونفره روی یک سیستم"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>تست در تب جدید</span>
                </button>
              </div>

              {/* Player Slots */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                {/* Explorer Slot */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    roomData.players.explorer?.connected
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 border-dashed'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm">کایلِن (Kaelen)</div>
                  <div className="text-[11px] text-cyan-400 font-medium">کاوشگر صاعقه</div>
                  <div className="mt-2 text-xs font-semibold">
                    {roomData.players.explorer?.connected ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {roomData.players.explorer.name}
                        {assignedRole === 'explorer' && ' (شما)'}
                      </span>
                    ) : (
                      <span className="text-slate-500 animate-pulse">در انتظار ورود بازیکن...</span>
                    )}
                  </div>
                </div>

                {/* Guardian Slot */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    roomData.players.guardian?.connected
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 border-dashed'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm">بِرام (Bram)</div>
                  <div className="text-[11px] text-emerald-400 font-medium">نگهبان سنگین</div>
                  <div className="mt-2 text-xs font-semibold">
                    {roomData.players.guardian?.connected ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {roomData.players.guardian.name}
                        {assignedRole === 'guardian' && ' (شما)'}
                      </span>
                    ) : (
                      <span className="text-slate-500 animate-pulse">در انتظار ورود بازیکن...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="w-full mt-3">
                <button
                  id="btn_start_game_session"
                  disabled={!bothPlayersReady}
                  onClick={onStartGame}
                  className={`w-full py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bothPlayersReady
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-98 animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{bothPlayersReady ? 'شروع ماجراجویی دو‌نفره' : 'در انتظار ورود هر دو قهرمان...'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* --- Screen 2: Initial Setup & Matchmaking Form --- */
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            {/* Player Name Input */}
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                نام ماجراجوی شما
              </label>
              <input
                id="input_player_name"
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={20}
                placeholder="نام خود را بنویسید..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Character Selection */}
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                انتخاب قهرمان مورد علاقه
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>در حال ایجاد اتاق و ارتباط...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>ایجاد اتاق جدید</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn_join_game_flow"
                    disabled={isConnecting}
                    onClick={() => setView('join')}
                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
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
                    placeholder="مثال: NOVA42"
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
                    className="py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>در حال ورود...</span>
                      </>
                    ) : (
                      <span>اتصال به اتاق</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Network & Cloudflare Configuration Modal */}
      <AnimatePresence>
        {showNetworkModal && (
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
                <span>تنظیمات شبکه و اتصال دو‌نفره</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                نوع اتصال چندنفره متناسب با بستر هاستینگ خود را انتخاب کنید:
              </p>

              {/* Mode Selection */}
              <div className="space-y-2 mb-4">
                {/* Auto Mode */}
                <div
                  onClick={() => setNetworkMode('auto')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    networkMode === 'auto'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">حالت هوشمند و خودکار (Auto)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-semibold">پیش‌فرض</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    در هاست کلودفلر خودکار اتصال مستقیم P2P و در محیط پیش‌نمایش از سرور استفاده می‌کند.
                  </p>
                </div>

                {/* P2P Mode */}
                <div
                  onClick={() => setNetworkMode('p2p')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    networkMode === 'p2p'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-emerald-300">اتصال مستقیم P2P (WebRTC)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold">مخصوص کلودفلر</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    بدون نیاز به سرور خارجی! اتاق مستقیماً بین مرورگر شما و دوستتان با سرعت بالا و پینگ عالی برقرار می‌شود.
                  </p>
                </div>

                {/* WebSocket Mode */}
                <div
                  onClick={() => setNetworkMode('websocket')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    networkMode === 'websocket'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-cyan-300">سرور وب‌سوکت / Cloudflare Worker</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    در صورتی که سرور Node.js یا Cloudflare Worker با قابلیت وب‌سوکت مجزا دارید.
                  </p>
                </div>
              </div>

              {networkMode === 'websocket' && (
                <div className="mb-4 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={isCustomWorker}
                      onChange={(e) => setIsCustomWorker(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4"
                    />
                    <span>استفاده از آدرس سفارشی Worker یا سرور</span>
                  </label>
                  {isCustomWorker && (
                    <input
                      type="text"
                      dir="ltr"
                      value={customWorkerUrl}
                      onChange={(e) => setCustomWorkerUrl(e.target.value)}
                      placeholder="wss://your-worker.workers.dev/ws"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowNetworkModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSaveNetworkConfig}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
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
