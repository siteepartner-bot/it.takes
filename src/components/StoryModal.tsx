import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  X,
  Sparkles,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  Heart,
  TreeDeciduous,
  Flame,
} from 'lucide-react';
import { LORE_CHARACTERS, LORE_CHAPTERS } from '../data/loreStory.ts';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'chronicle' | 'nora' | 'barsam' | 'synergy'>('chronicle');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  if (!isOpen) return null;

  const currentChapter = LORE_CHAPTERS[currentChapterIndex];
  const { nora, barsam } = LORE_CHARACTERS;

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md select-none font-sans text-slate-100"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl max-h-[90dvh] bg-slate-900/95 border-2 border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header Banner */}
          <div className="relative px-5 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-200 flex items-center gap-2">
                  <span>افسانه و پیشینه آدمک‌های چوبی</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h2>
                <p className="text-xs text-amber-300/70">
                  روایت بیداری نورا و برسام در کارگاه ساعت‌ساز پیر
                </p>
              </div>
            </div>

            <button
              id="btn_close_story_modal"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-2 px-4 bg-slate-950/70 border-b border-slate-800 overflow-x-auto text-xs font-bold scrollbar-none">
            <button
              id="tab_story_chronicle"
              onClick={() => setActiveTab('chronicle')}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'chronicle'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>فصل‌های تاریخچه</span>
            </button>

            <button
              id="tab_story_nora"
              onClick={() => setActiveTab('nora')}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'nora'
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>نورا (دختر چوبی)</span>
            </button>

            <button
              id="tab_story_barsam"
              onClick={() => setActiveTab('barsam')}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'barsam'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>برسام (پسر چوبی)</span>
            </button>

            <button
              id="tab_story_synergy"
              onClick={() => setActiveTab('synergy')}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'synergy'
                  ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-purple-400" />
              <span>راز همکاری دو‌نفره</span>
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
            {/* TAB 1: CHRONICLE CHAPTERS */}
            {activeTab === 'chronicle' && (
              <div className="space-y-4">
                {/* Chapter Selector Pill Bar */}
                <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-2xl p-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {LORE_CHAPTERS.map((ch, idx) => (
                      <button
                        key={ch.id}
                        onClick={() => setCurrentChapterIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          currentChapterIndex === idx
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        فصل {ch.id}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentChapterIndex === 0}
                      onClick={() => setCurrentChapterIndex((prev) => Math.max(0, prev - 1))}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      disabled={currentChapterIndex === LORE_CHAPTERS.length - 1}
                      onClick={() => setCurrentChapterIndex((prev) => Math.min(LORE_CHAPTERS.length - 1, prev + 1))}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chapter Content Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/20 shadow-inner space-y-3.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                      روایت باستانی • بخش {currentChapter.id} از {LORE_CHAPTERS.length}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-amber-200 mt-0.5">
                      {currentChapter.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{currentChapter.subtitle}</p>
                  </div>

                  <div className="space-y-2.5 text-slate-200 text-xs sm:text-sm leading-relaxed border-t border-slate-800/80 pt-3">
                    {currentChapter.content.map((p, i) => (
                      <p key={i} className="text-justify indent-3">
                        {p}
                      </p>
                    ))}
                  </div>

                  {currentChapter.highlights && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-950/25 border border-amber-500/20">
                      <div className="text-[11px] font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>نکات کلیدی این بخش:</span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-slate-300">
                        {currentChapter.highlights.map((h, i) => (
                          <li key={i} className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: NORA (GIRL MANNEQUIN) */}
            {activeTab === 'nora' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-lg">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-cyan-400">آدمک چوبی دختر • کاوشگر صاعقه</div>
                        <h3 className="text-lg font-black text-white">{nora.persianName}</h3>
                        <div className="text-xs text-slate-300">{nora.woodType}</div>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-400/30 text-cyan-300 text-xs font-semibold self-start sm:self-center">
                      مجهز به دستکش اِیتِر
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed indent-2">
                    نورا شاهکار تراشیده شده از سپیدار نقره‌ای است؛ چوبی فوق‌العاده سبک، خوش‌تراش و منعطف که به او امکان انجام مانورهای هوایی و پرش‌های بلند را می‌دهد. مفاصل کروی او با پین‌های صیقلی برنجی به هم متصل گشته و موهای چوبی‌اش به صورت بافته از چوب سدر طلایی به عقب شانه شده است.
                  </p>

                  {/* Character Attributes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                        <TreeDeciduous className="w-3.5 h-3.5" />
                        <span>جنس چوب و ساختار:</span>
                      </div>
                      <p className="text-slate-300">{nora.material}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>خلق‌وخو و روان‌شناسی:</span>
                      </div>
                      <p className="text-slate-300">{nora.personality}</p>
                    </div>
                  </div>

                  {/* Unique Ability Showcase */}
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-400/40 space-y-2">
                    <div className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>قابلیت انحصاری: {nora.uniqueAbility.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {nora.uniqueAbility.description}
                    </p>
                    <ul className="space-y-1 text-xs text-slate-300 pr-2">
                      {nora.uniqueAbility.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 font-bold">✦</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quote */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border-r-4 border-cyan-400 text-xs italic text-cyan-200">
                    {nora.quote}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BARSAM (BOY MANNEQUIN) */}
            {activeTab === 'barsam' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-lg">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-emerald-400">آدمک چوبی پسر • نگهبان تایتان</div>
                        <h3 className="text-lg font-black text-white">{barsam.persianName}</h3>
                        <div className="text-xs text-slate-300">{barsam.woodType}</div>
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-400/30 text-emerald-300 text-xs font-semibold self-start sm:self-center">
                      مجهز به هسته زمردین
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed indent-2">
                    برسام تجسم جاودانگی و پایداری است؛ پیکرتراشی شده از چوب متراکم بلوط کوهستان با رگه‌های تیره گردو. وزن بالا و چرخ‌دنده‌های درونی‌اش به او استحکامی پولادین می‌بخشد. در میان قفسه سینه چوبی مشبک او، تکه بلور زمردین اِیتِر همانند قلبی تپنده می‌درخشد و به او نیروی فراطبیعی جابجایی سنگ‌های کهن را می‌دهد.
                  </p>

                  {/* Character Attributes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                        <TreeDeciduous className="w-3.5 h-3.5" />
                        <span>جنس چوب و ساختار:</span>
                      </div>
                      <p className="text-slate-300">{barsam.material}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        <span>خلق‌وخو و روان‌شناسی:</span>
                      </div>
                      <p className="text-slate-300">{barsam.personality}</p>
                    </div>
                  </div>

                  {/* Unique Ability Showcase */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-400/40 space-y-2">
                    <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>قابلیت انحصاری: {barsam.uniqueAbility.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {barsam.uniqueAbility.description}
                    </p>
                    <ul className="space-y-1 text-xs text-slate-300 pr-2">
                      {barsam.uniqueAbility.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">✦</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quote */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border-r-4 border-emerald-400 text-xs italic text-emerald-200">
                    {barsam.quote}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CO-OP SYNERGY */}
            {activeTab === 'synergy' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-purple-950/30 to-slate-900 border border-purple-500/30 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-purple-200 flex items-center gap-2">
                      <span>راز پیروزی: هم‌افزایی بی‌نقص دو چوب</span>
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </h3>
                    <p className="text-xs text-slate-400">
                      هیچ پازلی در بازی با تکروی حل نمی‌شود. در ادامه نمونه‌هایی از هماهنگی نورا و برسام را می‌بینید:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-1.5">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>پازل آسانسور قنات (باغ فراموش‌شده)</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        برسام باید مکعب سنگین سنگی را بلند کند و روی سکوی فشاری قرار دهد تا دروازه باز شود؛ سپس نورا به بلندی می‌رود و با پرتو صاعقه [F] آسانسور آبی را به سمت بالا شارژ می‌کند.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-1.5">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>پازل پرتگاه مه و لیزر (جزایر معلق)</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        برسام سپر چوبی-زمردین خود [F] را فعال می‌کند تا پرتو مرگبار لیزر دفاعی را منحرف کند و پلی از نور روی پرتگاه بگستراند؛ همزمان نورا از روی پل عبور کرده و دکمه قطع دائم لیزر را می‌زند.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-1.5 sm:col-span-2">
                      <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>تنظیم همزمان دیگ‌های بخار (کارخانه ساعت)</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        فشار بخار پیستون‌ها به گونه‌ای تنظیم شده که تنها با کشیدن همزمان هر دو شیر توسط نورا و برسام خنثی می‌شود. بازیکنان با استفاده از شمارش معکوس یا پینگ درون بازی، همزمان عمل را انجام می‌دهند.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>طراحی شده با الهام از ماجراجویی‌های دونفره</span>
              <span className="text-amber-400">★</span>
            </div>

            <button
              id="btn_story_continue"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
            >
              بستن و ادامه ماجراجویی
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
