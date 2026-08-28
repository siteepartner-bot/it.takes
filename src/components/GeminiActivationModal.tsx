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

const CLOUDFLARE_WORKER_CODE_SNIPPET = `// Aether Duo - Cloudflare Worker + Gemini AI Proxy
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

    if (url.pathname === '/api/gemini/guidance' && request.method === 'POST') {
      const { stageId, query } = await request.json();
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, text: 'کلید GEMINI_API_KEY در ورکر کلودفلر یافت نشد!' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: \`مرحله: \${stageId || 1} | درخواست: \${query || 'راهنمایی کن'}\` }] }],
          systemInstruction: { parts: [{ text: 'تو "استاد الیاس" ساعت‌ساز دانای بازی هستی. در ۲ جمله کوتاه و صوتی راهنمایی کن.' }] }
        })
      });

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی شما کلید پیروزی است!';
      return new Response(JSON.stringify({ success: true, text, source: 'cloudflare-worker-gemini' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/gemini/status') {
      return new Response(JSON.stringify({ available: true, model: 'gemini-3.1-flash-lite', host: 'cloudflare-worker' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Aether Duo Cloudflare Worker Active', { headers: corsHeaders });
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

  // Cloudflare worker custom URL test
  const [cfUrl, setCfUrl] = useState('https://it-takes.sitee-partner.workers.dev');
  const [cfTestResult, setCfTestResult] = useState<string | null>(null);
  const [cfTesting, setCfTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CLOUDFLARE_WORKER_CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        setLiveTestResponse('پاسخی دریاقت نشد.');
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
      const cleanUrl = cfUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/api/gemini/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: 1, query: 'سلام استاد الیاس' }),
      });

      if (res.ok) {
        const data = await res.json();
        setCfTestResult(`✅ پاسخ ورکر دریافت شد: "${data.text || 'بدون متن'}" (منبع: ${data.source || 'نامشخص'})`);
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

          {/* TAB 2: GET API KEY */}
          {activeTab === 'apikey' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>دریافت کلید رایگان Google Gemini API</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  گوگل کلیدهای API سرویس Gemini را به صورت ۱۰۰٪ رایگان ارائه می‌دهد. شما با داشتن یک اکانت گوگل می‌توانید کلید اختصاصی خود را در کمتر از ۳۰ ثانیه دریافت کنید.
                </p>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black transition-all shadow-md shadow-amber-500/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ورود به Google AI Studio و دریافت API Key</span>
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>امنیت کلیدها در بازی:</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  متغیر <code className="text-amber-300 font-mono">GEMINI_API_KEY</code> در سمت سرور ذخیره می‌شود و هرگز در مرورگر بازیکنان دیگر افشا نخواهد شد. تمامی درخواست‌ها از طریق پروکسی ایمن سرور هدایت می‌شوند.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUDFLARE WORKER GUIDE */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-4 text-xs">
              {/* Cloudflare Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>پروکسی Cloudflare Workers جهت اجرای بدون سرور</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  اگر قصد دارید بازی را روی دامنه یا سرور اختصاصی خود در Cloudflare هاست کنید، می‌توانید اسکریپت ورکر زیر را کپی کرده و در Worker پروژه خود مستقر نمایید.
                </p>
              </div>

              {/* Code Snippet Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>کد کامل ورکر کلودفلر (Gemini API Proxy):</span>
                  </span>
                  <button
                    id="btn_copy_gemini_worker_code"
                    onClick={handleCopyCode}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کپی شد!' : 'کپی کد اسکریپت'}</span>
                  </button>
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
                <div className="font-bold text-slate-300 text-[11px]">تست آدرس ورکر شخصی:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cfUrl}
                    onChange={(e) => setCfUrl(e.target.value)}
                    placeholder="https://my-worker.subdomain.workers.dev"
                    dir="ltr"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    id="btn_test_cf_url"
                    onClick={handleTestCfWorker}
                    disabled={cfTesting}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    {cfTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'تست ورکر'}
                  </button>
                </div>
                {cfTestResult && (
                  <p className="text-[11px] text-slate-300 pt-1 font-mono">{cfTestResult}</p>
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
