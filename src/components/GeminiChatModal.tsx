import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Zap,
  Shield,
  HelpCircle,
  Loader2,
  Bot,
  User,
  Lightbulb,
} from 'lucide-react';
import type { PlayerRole, PuzzleState } from '../types.ts';
import { requestGeminiGuidance } from '../services/geminiService.ts';

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: number;
  myRole: PlayerRole;
  myName: string;
  partnerName: string;
  puzzleState: PuzzleState;
  partnerDistance?: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

const QUICK_PROMPT_CHIPS = [
  { id: 'next_step', label: 'الان دقیقا باید چکار کنیم؟', icon: Sparkles },
  { id: 'puzzle_hint', label: 'معمای این مرحله چطوری حل میشه؟', icon: Lightbulb },
  { id: 'niusha_power', label: 'نقش و صاعقه نیوشا [F]', icon: Zap },
  { id: 'hassan_power', label: 'نقش و سپر حسن [F]', icon: Shield },
];

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  stageId,
  myRole,
  myName,
  partnerName,
  puzzleState,
  partnerDistance = 0,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with initial mentor hint on open
  useEffect(() => {
    if (!isOpen) return;

    if (messages.length === 0) {
      const nowStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      setMessages([
        {
          id: 'welcome',
          sender: 'gemini',
          text: `درود بر ${myName}! من استاد الیاس (هوش مصنوعی بازی) هستم. هر سوال یا کمکی برای حل معماها و پیشروی در مرحله ${stageId} نیاز داری بپرس یا از گزینه‌های سریع زیر استفاده کن.`,
          timestamp: nowStr,
        },
      ]);
    }
  }, [isOpen, stageId, myName]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await requestGeminiGuidance({
        stageId,
        playerRole: myRole,
        playerName: myName,
        partnerName,
        puzzleState,
        customQuestion: query,
        partnerDistance,
      });

      const geminiMsg: ChatMessage = {
        id: `gemini_${Date.now()}`,
        sender: 'gemini',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, geminiMsg]);
    } catch (err) {
      console.warn('Gemini chat request error:', err);
      const fallbackMsg: ChatMessage = {
        id: `gemini_err_${Date.now()}`,
        sender: 'gemini',
        text: 'مکانیزم‌های معما را با همکاری هم‌تیمی فعال کنید: نیوشا کلیدها و ژنراتور صاعقه را فعال می‌کند و حسن با سپر محافظ مسیرها را امن می‌سازد.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg h-[540px] max-h-[88vh] flex flex-col rounded-3xl bg-slate-900/95 border border-amber-500/40 shadow-2xl shadow-amber-950/40 overflow-hidden text-right"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base text-amber-200">
                      پیام‌رسان استاد الیاس (Gemini AI)
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      آنلاین
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    راهنمای هوشمند متنی برای معماها و همکاری تیمی
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="بستن (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-950/40">
              {messages.map((msg) => {
                const isGemini = msg.sender === 'gemini';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isGemini ? 'justify-start' : 'justify-end'}`}
                  >
                    {isGemini && (
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-lg ${
                        isGemini
                          ? 'bg-slate-900 border border-amber-500/30 text-amber-100'
                          : 'bg-cyan-600 text-white font-medium rounded-br-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div
                        className={`text-[10px] mt-1 text-left ${
                          isGemini ? 'text-amber-400/60' : 'text-cyan-200/70'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>

                    {!isGemini && (
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-amber-300 text-xs py-1 px-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>استاد الیاس در حال تحلیل مکانیزم‌ها و پاسخ...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPT_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={chip.id}
                    onClick={() => handleSendMessage(chip.label)}
                    disabled={isLoading}
                    className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-[11px] text-slate-300 hover:text-amber-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Icon className="w-3 h-3 text-amber-400" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="سوال یا راهنمایی دلخواه خود را بنویسید..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold transition-all disabled:opacity-40 shadow-lg shadow-amber-500/20"
                title="ارسال پیام"
              >
                <Send className="w-4 h-4 transform rotate-180" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Export alias for backward compatibility
export const GeminiVoiceCallModal = GeminiChatModal;
