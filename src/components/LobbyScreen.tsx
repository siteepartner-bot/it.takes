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
} from 'lucide-react';
import type { PlayerRole, RoomData } from '../types.ts';

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
    () => localStorage.getItem('aether_player_name') || `Player_${Math.floor(100 + Math.random() * 900)}`
  );
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('explorer');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

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

  const bothPlayersReady =
    roomData &&
    roomData.players.explorer?.connected &&
    roomData.players.guardian?.connected;

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden select-none font-sans">
      {/* Dynamic Stylized Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Main Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            3D Online Co-op Adventure
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-sm">
            AETHER <span className="text-cyan-400">DUO</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-2 max-w-md mx-auto">
            A real-time cooperative 3D journey where two original heroes unite to overcome physical puzzles and ancient mysteries.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-sm font-medium flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            {errorMessage}
          </motion.div>
        )}

        {/* --- Screen 1: Active In-Lobby Waiting Room --- */}
        {roomData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
                Adventure Room Code
              </div>
              <div className="flex items-center gap-3 bg-slate-950/80 border-2 border-cyan-500/40 px-6 py-3 rounded-2xl my-2">
                <span className="text-3xl md:text-4xl font-mono font-black text-cyan-400 tracking-widest">
                  {roomData.code}
                </span>
                <button
                  id="btn_copy_room_code"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors"
                  title="Copy Room Code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-slate-400">
                <button
                  id="btn_copy_invite_link"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  Copy Share Link
                </button>
                <button
                  id="btn_open_second_tab"
                  onClick={handleOpenSecondTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 transition-colors"
                  title="Test in 2nd browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test 2nd Player in New Tab
                </button>
              </div>

              {/* Player Slots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-6">
                {/* Explorer Slot */}
                <div
                  className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                    roomData.players.explorer?.connected
                      ? 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-70'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-2">
                    <Zap className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-sm font-bold text-white">Kaelen (Explorer)</div>
                  <div className="text-xs text-slate-400 mt-0.5">Agile & Spark Conduit</div>
                  <div className="mt-3">
                    {roomData.players.explorer?.connected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {roomData.players.explorer.name}
                        {assignedRole === 'explorer' && ' (You)'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Waiting for Explorer...</span>
                    )}
                  </div>
                </div>

                {/* Guardian Slot */}
                <div
                  className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                    roomData.players.guardian?.connected
                      ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-950/40 border-slate-800/80 border-dashed opacity-70'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-2">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="text-sm font-bold text-white">Bram (Guardian)</div>
                  <div className="text-xs text-slate-400 mt-0.5">Mighty & Kinetic Aegis</div>
                  <div className="mt-3">
                    {roomData.players.guardian?.connected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {roomData.players.guardian.name}
                        {assignedRole === 'guardian' && ' (You)'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Waiting for Guardian...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-6 flex flex-col items-center gap-3 w-full">
                {bothPlayersReady ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="w-full flex flex-col items-center"
                  >
                    <div className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Both Players Connected! Adventure Ready.
                    </div>
                    <button
                      id="btn_start_adventure"
                      onClick={onStartGame}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-lg tracking-wide uppercase shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      Enter Forgotten Garden
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Send Room Code <strong className="text-cyan-300">{roomData.code}</strong> to your partner to join...
                    </div>
                    <button
                      id="btn_start_solo_anyway"
                      onClick={onStartSoloPractice}
                      className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-4 py-2"
                    >
                      Or enter solo practice mode (switch roles with Tab)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* --- Screen 2: Main Menu & Role Selection --- */
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            {/* Player Name Input */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Your Adventurer Name
              </label>
              <input
                id="input_player_name"
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  localStorage.setItem('aether_player_name', e.target.value);
                }}
                maxLength={18}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Character Class Showcase */}
            <div className="mb-6">
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Select Your Character
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kaelen */}
                <div
                  onClick={() => setSelectedRole('explorer')}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    selectedRole === 'explorer'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Kaelen</div>
                      <div className="text-xs text-cyan-400 font-medium">The Spark Explorer</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Swift sprinter equipped with a tether gauntlet that triggers distant light switches and energizes conduits.
                  </p>
                </div>

                {/* Bram */}
                <div
                  onClick={() => setSelectedRole('guardian')}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    selectedRole === 'guardian'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Bram</div>
                      <div className="text-xs text-emerald-400 font-medium">The Stone Guardian</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Armored golem capable of lifting heavy magnetic blocks and projecting a kinetic shield bridge.
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            {view === 'home' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="btn_create_game_flow"
                    disabled={isConnecting}
                    onClick={() => onCreateRoom(playerName, selectedRole)}
                    className="py-3.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-sm tracking-wide uppercase transition-all shadow-lg shadow-cyan-600/20 active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    Create New Room
                  </button>

                  <button
                    id="btn_join_game_flow"
                    disabled={isConnecting}
                    onClick={() => setView('join')}
                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm tracking-wide uppercase transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Join With Code
                  </button>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase tracking-wider">
                    Or Practice Locally
                  </span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                <button
                  id="btn_start_solo_practice_main"
                  onClick={onStartSoloPractice}
                  className="py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4 text-cyan-400" />
                  Solo Duo Sandbox (Switch heroes with Tab key)
                </button>
              </div>
            )}

            {/* Join Room Code Input View */}
            {view === 'join' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    Enter Friend's Room Code
                  </label>
                  <input
                    id="input_join_code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())}
                    maxLength={10}
                    placeholder="e.g. SKY42"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-cyan-500/50 text-cyan-400 font-mono text-center text-xl font-bold tracking-widest focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    id="btn_cancel_join"
                    onClick={() => setView('home')}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                  >
                    Back
                  </button>
                  <button
                    id="btn_submit_join"
                    disabled={!joinCode || isConnecting}
                    onClick={() => onJoinRoom(joinCode, playerName, selectedRole)}
                    className="py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/20"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect to Game'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
