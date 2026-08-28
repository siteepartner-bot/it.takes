import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Cloud,
  Key,
  Copy,
  Check,
  ExternalLink,
  X,
  Server,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Cpu,
  Layers,
  Globe,
} from 'lucide-react';
import { checkGeminiStatus, requestGeminiGuidance } from '../services/geminiService.ts';
import { createDefaultPuzzleState } from '../types.ts';

interface GeminiActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLOUDFLARE_WORKER_CODE_SNIPPET = `// Aether Duo - Cloudflare Worker Script (worker.js)
// در بخش Settings -> Variables یک Secret بنام GEMINI_API_KEY ایجاد کنید.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if ((url.pathname.endsWith('/api/gemini/guidance') || url.pathname === '/api/gemini/guidance') && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const stageId = body.stageId || 1;
        const query = body.query || 'استاد چه کنیم؟';
        const apiKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : '';

        if (!apiKey) {
          return new Response(
            JSON.stringify({
              success: false,
              text: 'کلید GEMINI_API_KEY در قسمت Variables & Secrets ورکر کلودفلر تعریف نشده است!',
              source: 'worker-missing-key'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const promptText = \`اطلاعات مرحله \${stageId} بازی ایتر دوئو (Aether Duo):
درخواست: \${query}\`;

        const systemInstruction = 'تو "استاد الیاس" ساعت‌ساز دانای بازی ایتر دوئو هستی. اطلاعات کلیدی: ۱. حسن و نیوشا پارتنرهای عاشق و هماهنگ یکدیگر هستند. با لحن گرم این زوج را راهنمایی کن. ۲. کنترل‌ها: حرکت WASD/جهت‌نماها، پرش Space، قدرت F (صاعقه نیوشا/سپر حسن)، تعامل E/Shift، تعویض Q/Tab، بیسیم: گفتن "استاد" یا کلید R. ۳. پاسخ حداکثر ۱ تا ۲ جمله کوتاه به فارسی.';

        const geminiRes = await fetch(
          \`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=\${apiKey}\`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
            })
          }
        );

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی و همکاری تیمی شما کلید پیروزی است!';

        return new Response(
          JSON.stringify({
            success: true,
            text,
            source: 'gemini-live',
            model: 'gemini-3.1-flash-lite'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, text: 'خطا در ورکر کلودفلر', error: err.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (url.pathname.endsWith('/api/gemini/status') || url.pathname === '/api/gemini/status') {
      const isAvailable = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
      return new Response(
        JSON.stringify({
          available: isAvailable,
          model: 'gemini-3.1-flash-lite',
          host: 'cloudflare-worker',
          message: isAvailable ? 'ورکر کلودفلر با موفقیت فعال است.' : 'کلید GEMINI_API_KEY تعریف نشده است.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Aether Duo Cloudflare Worker Active!', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};`;

export const GeminiActivationModal: React.FC<GeminiActivationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'apikey' | 'cloudflare'>('diagnostic');
  const [copied, setCopied] = useState(false);
  const [testingStatus, setTestingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    available: boolean;
    model: string;
    host: string;
    message: string;
  } | null>(null);

  // Live Chat Test State
  const [testQuery, setTestQuery] = useState('سلام استاد الیاس، وضعیت ارتباط چطوره؟');
  const [isLiveTesting, setIsLiveTesting] = useState(false);
  const [liveTestResponse, setLiveTestResponse] = useState<string | null>(null);
  const [liveTestSource, setLiveTestSource] = useState<string | null>(null);

  // Cloudflare worker custom URL test & active persistence
  const [cfUrl, setCfUrl] = useState(() => {
    return localStorage.getItem('gemini_custom_worker_url') || 'https://gemini.sitee-partner.workers.dev';
  });
  const [activeWorkerUrl, setActiveWorkerUrl] = useState(() => {
    return localStorage.getItem('gemini_custom_worker_url') || '';
  });
  const [cfTestResult, setCfTestResult] = useState<string | null>(null);
  const [cfTesting, setCfTesting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    // If user hasn't saved a custom worker URL yet, default to gemini.sitee-partner.workers.dev
    if (!localStorage.getItem('gemini_custom_worker_url')) {
      localStorage.setItem('gemini_custom_worker_url', 'https://gemini.sitee-partner.workers.dev');
      setActiveWorkerUrl('https://gemini.sitee-partner.workers.dev');
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CLOUDFLARE_WORKER_CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveWorkerUrl = (urlToSave: string) => {
    const cleanUrl = urlToSave.trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem('gemini_custom_worker_url', cleanUrl);
      setActiveWorkerUrl(cleanUrl);
      setSaveSuccessMsg('آدرس ورکر با موفقیت ذخیره شد و فعال است!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleResetWorkerUrl = () => {
    localStorage.removeItem('gemini_custom_worker_url');
    setActiveWorkerUrl('');
    setCfUrl('https://gemini.sitee-partner.workers.dev');
    setSaveSuccessMsg('تنظیمات به سرور پیش‌فرض بازی بازگشت.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleRunDiagnostic = async () => {
    setTestingStatus(true);
    setStatusResult(null);
    try {
      const result = await checkGeminiStatus();
      setStatusResult(result);
    } catch (e: any) {
      setStatusResult({
        available: false,
        model: 'نامشخص',
        host: 'محیط محلی/سرور',
        message: e.message || 'خطا در ارزیابی وضعیت سرور',
      });
    } finally {
      setTestingStatus(false);
    }
  };

  const handleLivePromptTest = async () => {
    if (!testQuery.trim() || isLiveTesting) return;
    setIsLiveTesting(true);
    setLiveTestResponse(null);
    setLiveTestSource(null);

    try {
      const startTime = Date.now();
      const res = await requestGeminiGuidance({
        stageId: 1,
        query: testQuery,
        role: 'explorer',
        playerName: 'قهرمان',
        partnerName: 'هم‌تیمی',
        puzzleState: createDefaultPuzzleState(1),
      });

      const duration = Date.now() - startTime;
      if (res && res.text) {
        setLiveTestResponse(res.text);
        setLiveTestSource(`${res.source === 'gemini-live' ? 'هوش مصنوعی زنده (Gemini)' : 'راهنمای هوشمند آفلاین'} • زمان پاسخ: ${duration}ms`);
      } else {
        setLiveTestResponse('پاسخی دریافت نشد.');
      }
    } catch (err: any) {
      setLiveTestResponse(`خطا: ${err?.message || 'برقراری ارتباط با شکست مواجه شد.'}`);
    } finally {
      setIsLiveTesting(false);
    }
  };

  const handleTestCfWorker = async () => {
    if (!cfUrl.trim() || cfTesting) return;
    setCfTesting(true);
    setCfTestResult(null);
    try {
      const cleanUrl = cfUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/gemini/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: 1, query: 'سلام استاد الیاس' }),
      });

      if (res.ok) {
        const data = await res.json();
        setCfTestResult(`✅ پاسخ ورکر دریافت شد: "${data.text || 'بدون متن'}" (منبع: ${data.source || 'نامشخص'})`);
        // Save automatically as active worker since test succeeded
        handleSaveWorkerUrl(cleanUrl);
      } else {
        setCfTestResult(`⚠️ خطا کد ${res.status}: ورکر پاسخ نامعتبر داد.`);
      }
    } catch (e: any) {
      setCfTestResult(`❌ خطا در اتصال به ورکر: ${e?.message || 'ورکر در دسترس نیست.'}`);
    } finally {
      setCfTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-lg overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-amber-950/40 text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-900/40 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>مرکز فعال‌سازی و راه‌اندازی استاد الیاس (Gemini AI)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 font-bold">
                    نسخه ۳.۱
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تست اتصال زنده، فعال‌سازی کلید API و تنظیمات پروکسی Cloudflare
                </p>
              </div>
            </div>

            <button
              id="btn_close_gemini_activation"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 mb-5 text-xs font-bold">
            <button
              id="tab_gemini_diagnostic"
              onClick={() => setActiveTab('diagnostic')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'diagnostic'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تست زنده اتصال</span>
            </button>

            <button
              id="tab_gemini_apikey"
              onClick={() => setActiveTab('apikey')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'apikey'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>دریافت کلید API</span>
            </button>

            <button
              id="tab_gemini_cloudflare"
              onClick={() => setActiveTab('cloudflare')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'cloudflare'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>پروکسی Cloudflare</span>
            </button>
          </div>

          {/* TAB 1: DIAGNOSTIC & LIVE TEST */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4 text-xs">
              {/* Active Worker Status Badge */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400 text-[11px]">آدرس فعال API هوش مصنوعی: </span>
                    <span className="text-cyan-300 font-mono font-bold text-[11px]">
                      {activeWorkerUrl || 'سرور داخلی / پیش‌فرض بازی'}
                    </span>
                  </div>
                </div>
                {activeWorkerUrl && (
                  <button
                    onClick={handleResetWorkerUrl}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                  >
                    ریست به پیش‌فرض
                  </button>
                )}
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-center animate-fade-in text-[11px]">
                  {saveSuccessMsg}
                </div>
              )}

              {/* Server Status Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <span>بررسی سلامت سرور و مدل فعال:</span>
                  </div>
                  {statusResult ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          statusResult.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      <span className={statusResult.available ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
                        {statusResult.message} (مدل: {statusResult.model})
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px]">
                      برای بررسی اینکه کلید GEMINI_API_KEY فعال است دکمه تست را بزنید.
                    </p>
                  )}
                </div>

                <button
                  id="btn_run_gemini_diag"
                  onClick={handleRunDiagnostic}
                  disabled={testingStatus}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingStatus ? 'animate-spin' : ''}`} />
                  <span>{testingStatus ? 'در حال بررسی...' : 'تست وضعیت سرور'}</span>
                </button>
              </div>

              {/* Interactive Live Prompt Tester */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>تست پاسخ‌دهی زنده استاد الیاس:</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="پیام خود را بنویسید..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    id="btn_send_live_prompt_test"
                    onClick={handleLivePromptTest}
                    disabled={isLiveTesting}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                  >
                    {isLiveTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>ارسال تست</span>
                  </button>
                </div>

                {liveTestResponse && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-1">
                    <div className="text-[10px] text-amber-400 font-mono flex items-center justify-between">
                      <span>استاد الیاس می‌گوید:</span>
                      {liveTestSource && <span className="text-slate-400">{liveTestSource}</span>}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{liveTestResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GET API KEY & SETUP STEPS */}
          {activeTab === 'apikey' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="font-bold text-white flex items-center gap-2 text-sm">
                  <Key className="w-4.5 h-4.5 text-amber-400" />
                  <span>راهنمای قدم به قدم فعال‌سازی (از ۰ تا ۱۰۰):</span>
                </div>

                <div className="space-y-2.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ۱
                    </span>
                    <div>
                      <span className="font-bold text-white">ورود به پنل گوگل:</span> روی دکمه طلایی زیر کلیک کنید تا وارد سایت رسمی Google AI Studio شوید (نیاز به اکانت جی‌میل دارد).
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ۲
                    </span>
                    <div>
                      <span className="font-bold text-white">دریافت کلید API Key:</span> روی دکمه <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">Create API key</code> کلیک کرده و کلید تولیدشده (که با <code className="text-amber-300 font-mono">AIzaSy...</code> شروع می‌شود) را کپی کنید.
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ۳
                    </span>
                    <div>
                      <span className="font-bold text-white">تنظیم در سرور / Cloudflare:</span> کلید کپی‌شده را در بخش تنظیمات متغیرهای محیطی بنام <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">GEMINI_API_KEY</code> جای‌گذاری کنید.
                    </div>
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black transition-all shadow-md shadow-amber-500/20 text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ورود به Google AI Studio و دریافت API Key اختصاصی</span>
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>تضمین رایگان بودن و امنیت:</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  سرویس Gemini شرکت گوگل روزانه هزاران درخواست رایگان در اختیار شما می‌گذارد. متغیر <code className="text-amber-300 font-mono">GEMINI_API_KEY</code> مستقیماً روی سرور نگهداری شده و کاملاً ایمن است.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUDFLARE WORKER GUIDE */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-4 text-xs">
              {/* Explanation of issue */}
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-2 text-[12px]">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>علت خطای ۴۰۵ یا عدم پاسخ‌دهی در دامنه کلودفلر:</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  سایت‌های کلودفلر به‌طور پیش‌فرض فقط فایل استاتیک سرو می‌کنند. برای پشتیبانی از درخواست‌های <code className="text-amber-300 font-mono">POST /api/gemini/guidance</code> باید کلید API در متغیرهای کلودفلر ست شده و تابع بک‌اند یا ورکر فعال باشد.
                </p>
              </div>

              {/* Step by step fix */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="font-bold text-white flex items-center gap-2 text-[12px]">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>راهنمای دقیق رفع مشکل روی Cloudflare Pages / Workers (قدم به قدم):</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center">۱</span>
                      <span>تعریف کلید در پنل کلودفلر (الزامی):</span>
                    </div>
                    <p className="text-slate-400 pr-5">
                      وارد پنل Cloudflare شوید ➔ پروژه خود را انتخاب کنید ➔ به مسیر <code className="text-amber-300 font-mono">Settings ➔ Environment Variables</code> بروید ➔ یک متغیر جدید بنام <code className="text-amber-300 font-mono">GEMINI_API_KEY</code> بسازید و کلید گوگل خود را در آن وارد نمایید.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center">۲</span>
                      <span>استفاده از توابع آماده Pages Functions (پیش‌فرض پروژه):</span>
                    </div>
                    <p className="text-slate-400 pr-5">
                      ما فایل‌های بک‌اند را در پوشه <code className="text-cyan-300 font-mono">/functions/api/gemini/</code> داخل سورس کد بازی قرار داده‌ایم. با آپلود سورس، این توابع به‌صورت خودکار روی دامنه شما فعال می‌شوند.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center">۳</span>
                      <span>یا ساخت Cloudflare Worker مجزا (اختیاری):</span>
                    </div>
                    <p className="text-slate-400 pr-5">
                      اگر از Cloudflare Worker مجزا استفاده می‌کنید، یک Worker بسازید، کد زیر را در آن قرار دهید، سپس در بخش Triggers مسیر <code className="text-amber-300 font-mono">/api/gemini/*</code> را به آن متصل کنید.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>کد کامل ورکر کلودفلر (Cloudflare Worker Code):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="/worker.js"
                      download="worker.js"
                      className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span>دانلود فایل worker.js</span>
                    </a>
                    <button
                      id="btn_copy_gemini_worker_code"
                      onClick={handleCopyCode}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'کپی شد!' : 'کپی کد اسکریپت'}</span>
                    </button>
                  </div>
                </div>
                <pre
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[10px] font-mono text-cyan-400/90 overflow-x-auto max-h-36 leading-relaxed select-all"
                  dir="ltr"
                >
                  {CLOUDFLARE_WORKER_CODE_SNIPPET}
                </pre>
              </div>

              {/* Test custom worker URL */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 text-[11px] flex items-center justify-between">
                  <span>تست آنلاین آدرس دامنه کلودفلر یا ورکر:</span>
                  <span className="text-[10px] text-amber-400 font-mono">POST /api/gemini/guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cfUrl}
                    onChange={(e) => setCfUrl(e.target.value)}
                    placeholder="https://gemini.sitee-partner.workers.dev"
                    dir="ltr"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    id="btn_test_cf_url"
                    onClick={handleTestCfWorker}
                    disabled={cfTesting}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    {cfTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'تست آدرس'}
                  </button>
                  <button
                    id="btn_save_cf_url"
                    onClick={() => handleSaveWorkerUrl(cfUrl)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <span>ذخیره و فعال‌سازی</span>
                  </button>
                </div>
                {cfTestResult && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200 font-mono">
                    {cfTestResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <button
            id="btn_dismiss_gemini_activation"
            onClick={onClose}
            className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
          >
            تایید و بازگشت به بازی
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
