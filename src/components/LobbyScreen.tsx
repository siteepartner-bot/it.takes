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
  BookOpen,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { PlayerRole, RoomData } from '../types.ts';
import { networkClient, type NetworkMode } from '../multiplayer/networkClient.ts';
import { StoryModal } from './StoryModal.tsx';
import { isFullscreen, toggleFullscreen } from '../utils/fullscreen.ts';

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
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [inFullscreen, setInFullscreen] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => networkClient.getNetworkMode());

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
    setShowNetworkModal(false);
  };

  const bothPlayersReady =
    roomData &&
    roomData.players.explorer?.connected &&
    roomData.players.guardian?.connected;

  return (
    <div
      dir="rtl"
      className="relative w-full h-full min-h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-2.5 sm:p-5 md:p-6 pb-16 sm:pb-12 overflow-y-auto overflow-x-hidden select-none font-sans"
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="fixed top-1/4 -right-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top action bar: Fullscreen & Story */}
      <div className="w-full max-w-2xl flex items-center justify-between z-20 mb-2 sm:mb-4 px-1">
        <button
          onClick={() => setShowStoryModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">داستان بازی</span>
          <span>نیوشا و حسن</span>
        </button>

        <button
          onClick={() => toggleFullscreen()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all active:scale-95"
          title="حالت تمام صفحه"
        >
          {inFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">خروج از تمام‌صفحه</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">تمام‌صفحه</span>
            </>
          )}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center my-auto">
        {/* Main Header */}
        <div className="text-center mb-2.5 sm:mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>ماجراجویی دونفره آنلاین ۳بعدی</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm flex items-center justify-center gap-2">
            <span>اِیتِـر</span>
            <span className="text-cyan-400">دوئـو</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-normal self-center">
              Aether Duo
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-lg mx-auto leading-relaxed">
            سفر مشارکتی و فیزیکی نیوشا و حسن برای احیای ساعت باستانی با راهنمایی‌های استاد الیاس.
          </p>
        </div>

        {/* Clean Multiplayer Status Indicator Bar (No Cloudflare/Gemini technical buzzwords) */}
        <div className="w-full max-w-xl mb-2.5 flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px] sm:text-xs font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>شبکه آنلاین چندنفره:</span>
              <span className="text-emerald-400 font-bold">متصل و آماده بازی</span>
            </div>
          </div>

          <button
            id="btn_open_worker_config"
            onClick={() => setShowNetworkModal(true)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors py-0.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800"
            title="تنظیمات اتصال سرور"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>تنظیمات سرور</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-2.5 px-3.5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* --- Screen 1: Active In-Lobby Waiting Room --- */}
        {roomData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                کد اتاق ماجراجویی شما
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/90 border-2 border-cyan-500/40 px-4 sm:px-5 py-2 rounded-2xl my-1 shadow-inner">
                <span
                  className="text-2xl sm:text-4xl font-mono font-black text-cyan-400 tracking-widest"
                  dir="ltr"
                >
                  {roomData.code}
                </span>
                <button
                  id="btn_copy_room_code"
                  onClick={handleCopyCode}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="کپی کد اتاق"
                >
                  {copied ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>

              {/* Fast Invite Link */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 mb-3">
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
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                {/* Explorer Slot: Niusha */}
                <div
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    roomData.players.explorer?.connected
                      ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 border-dashed'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-1">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm">نیوشا (Niusha)</div>
                  <div className="text-[10px] sm:text-[11px] text-cyan-400 font-medium">
                    دختر چوبی • کاوشگر صاعقه
                  </div>
                  <div className="mt-1.5 text-xs font-semibold">
                    {roomData.players.explorer?.connected ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {roomData.players.explorer.name}
                        {assignedRole === 'explorer' && ' (شما)'}
                      </span>
                    ) : (
                      <span className="text-slate-500 animate-pulse">در انتظار ورود...</span>
                    )}
                  </div>
                </div>

                {/* Guardian Slot: Hassan */}
                <div
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    roomData.players.guardian?.connected
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 border-dashed'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm">حسن (Hassan)</div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">
                    پسر چوبی • نگهبان تایتان
                  </div>
                  <div className="mt-1.5 text-xs font-semibold">
                    {roomData.players.guardian?.connected ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {roomData.players.guardian.name}
                        {assignedRole === 'guardian' && ' (شما)'}
                      </span>
                    ) : (
                      <span className="text-slate-500 animate-pulse">در انتظار ورود...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="w-full mt-2.5">
                <button
                  id="btn_start_game_session"
                  disabled={!bothPlayersReady}
                  onClick={onStartGame}
                  className={`w-full py-3 rounded-xl font-black text-sm sm:text-base tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bothPlayersReady
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-98 animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span>{bothPlayersReady ? 'شروع ماجراجویی دو‌نفره' : 'در انتظار ورود هر دو قهرمان...'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* --- Screen 2: Initial Setup & Matchmaking Form --- */
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 backdrop-blur-xl shadow-2xl">
            {/* Player Name Input */}
            <div className="mb-3">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                نام ماجراجوی شما
              </label>
              <input
                id="input_player_name"
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={20}
                placeholder="نام خود را بنویسید..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Character Selection (Niusha & Hassan) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  انتخاب شخصیت چوبی شما
                </label>
                <button
                  type="button"
                  onClick={() => setShowStoryModal(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>داستان کامل</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Niusha (Girl) */}
                <div
                  onClick={() => setSelectedRole('explorer')}
                  className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all ${
                    selectedRole === 'explorer'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">نیوشا (Niusha)</div>
                        <div className="text-[10px] sm:text-[11px] text-cyan-400 font-medium">
                          دختر چوبی • سپیدار نقره‌ای
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 font-semibold">
                      دستکش صاعقه [F]
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                    چابک، سبک‌وزن و سریع. مجهز به دستکش اِیتِر برای شلیک صاعقه و شارژ مدارهای شناور معماها.
                  </p>
                </div>

                {/* Hassan (Boy) */}
                <div
                  onClick={() => setSelectedRole('guardian')}
                  className={`cursor-pointer p-2.5 sm:p-3 rounded-xl border transition-all ${
                    selectedRole === 'guardian'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">حسن (Hassan)</div>
                        <div className="text-[10px] sm:text-[11px] text-emerald-400 font-medium">
                          پسر چوبی • بلوط کهنسال
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/30 text-emerald-300 font-semibold">
                      سپر تایتان [F]
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                    استوار، سنگین‌پیکر با قلبی از گوهر کهن. توانمند در جابجایی مکعب‌های سنگین و مهار لیزر با سپر محافظ.
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            {view === 'home' && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    id="btn_create_game_flow"
                    disabled={isConnecting}
                    onClick={() => onCreateRoom(playerName, selectedRole)}
                    className="py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
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
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Users className="w-4 h-4" />
                    <span>ورود با کد اتاق</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-3 text-[10px] text-slate-500 tracking-wider">
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
                  <span>حالت تمرینی تک‌نفره (سوییچ نیوشا و حسن با کلید Tab)</span>
                </button>
              </div>
            )}

            {/* Join Room Code Input View */}
            {view === 'join' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2"
              >
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    کد اتاق دوستتان را وارد کنید
                  </label>
                  <input
                    id="input_join_code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())}
                    maxLength={10}
                    placeholder="مثال: NOVA42"
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/50 text-cyan-400 font-mono text-center text-lg sm:text-xl font-bold tracking-widest focus:outline-none focus:border-cyan-400 transition-colors"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
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

      {/* Network Configuration Modal */}
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
                <span>تنظیمات سرور چندنفره بازی</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                روش ارتباط برای بازی هم‌زمان را انتخاب کنید:
              </p>

              <div className="space-y-2 mb-4">
                <div
                  onClick={() => setNetworkMode('auto')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    networkMode === 'auto'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">اتصال هوشمند و خودکار (پیشنهادی)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-semibold">پیش‌فرض</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    بهترین پروتکل متناسب با اتصال شما را انتخاب و با کمترین پینگ متصل می‌شود.
                  </p>
                </div>

                <div
                  onClick={() => setNetworkMode('p2p')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    networkMode === 'p2p'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-emerald-300">اتصال مستقیم P2P</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold">مستقیم</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    ارتباط مستقیم بین دو بازیکن با پینگ حداقلی.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
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

      {/* Narrative Lore & History Modal */}
      <StoryModal isOpen={showStoryModal} onClose={() => setShowStoryModal(false)} />
    </div>
  );
};
