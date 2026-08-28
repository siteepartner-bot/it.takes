import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  Cpu,
  Key,
  Copy,
  Check,
  ExternalLink,
  X,
  Server,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { checkGeminiStatus, getSavedTestApiKey, saveTestApiKey } from '../services/geminiService.ts';

interface CloudflareGuideModalProps {
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
      const { stageId, query, puzzleState, role } = await request.json();
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ text: 'کلید GEMINI_API_KEY در ورکر کلودفلر یافت نشد!' }), { headers: corsHeaders });

      const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=\${apiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: \`مرحله: \${stageId} | درخواست: \${query}\` }] }],
          systemInstruction: { parts: [{ text: 'تو استاد الیاس، ساعت‌ساز دانای نورا و برسام هستی. در ۲ جمله کوتاه و صوتی راهنمایی کن.' }] }
        })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی شما کلید پیروزی است!';
      return new Response(JSON.stringify({ success: true, text, source: 'cloudflare-worker-gemini' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // هماهنگی وب‌سوکت دونفره
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      const pair = new WebSocketPair();
      pair[1].accept();
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response('Aether Duo Worker is Active', { headers: corsHeaders });
  }
};`;

export const CloudflareGuideModal: React.FC<CloudflareGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testKeyInput, setTestKeyInput] = useState(() => getSavedTestApiKey());
  const [testResult, setTestResult] = useState<{
    available: boolean;
    model: string;
    host: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CLOUDFLARE_WORKER_CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveTestKey = () => {
    saveTestApiKey(testKeyInput);
    handleRunDiagnostic();
  };

  const handleRunDiagnostic = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await checkGeminiStatus(testKeyInput);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        available: false,
        model: 'error',
        host: 'unknown',
        message: e.message || 'خطا در ارتباط با سرور',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/50 text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>راهنمای فعال‌سازی جمینای در Cloudflare</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    Workers & Pages
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  اجرای ارتباط صوتی بیسیم جمینای روی کلودفلر بدون نیاز به سرور فیزیکی
                </p>
              </div>
            </div>

            <button
              id="btn_close_cf_guide"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Diagnostic & Quick Test Key Box */}
          <div className="mb-5 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>بررسی وضعیت کنونی اتصال جمینای:</span>
                </div>
                {testResult ? (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        testResult.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className={testResult.available ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
                      {testResult.message} ({testResult.model})
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    کلید در سرور یا به صورت مستقیم در کادر زیر وارد کنید تا زنده تست شود.
                  </div>
                )}
              </div>

              <button
                id="btn_test_gemini_cf"
                onClick={handleRunDiagnostic}
                disabled={testing}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'در حال تست...' : 'تست اتصال به جمینای'}</span>
              </button>
            </div>

            {/* Quick API Key Input for Preview Testing */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold shrink-0">
                <Key className="w-3.5 h-3.5" />
                <span>کلید مستقیم تست (اختیاری):</span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={testKeyInput}
                onChange={(e) => setTestKeyInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                dir="ltr"
              />
              <button
                onClick={handleSaveTestKey}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
              >
                ذخیره و تست جمینای
              </button>
            </div>
          </div>

          {/* 3 Step Deployment Guide */}
          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed mb-6">
            {/* Step 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                ۱
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>دریافت کلید API از Google AI Studio</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  یک کلید API رایگان از داشبورد گوگل دریافت کنید. این کلید برای پردازش پیام‌های هوش مصنوعی و راهنمای صوتی بیسیم استفاده می‌شود.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                ۲
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ثبت متغیر مخفی در داشبورد Cloudflare (Workers & Pages)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  در داشبورد Cloudflare به Worker خود بروید: <br />
                  <code className="text-cyan-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                    Settings → Variables and Secrets → Add Secret → GEMINI_API_KEY
                  </code>
                  <br />
                  کلید را به صورت Encrypted ذخیره کنید تا هرگز در مرورگر کلاینت لو نرود.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                ۳
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>استقرار کد Cloudflare Worker و اتصال در بازی</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  کد ورکر زیر را در Worker خود ذخیره و Deploy کنید. سپس آدرس آن (مثلاً{' '}
                  <code className="text-cyan-300 font-mono text-[10px]" dir="ltr">
                    wss://my-game.workers.dev
                  </code>
                  ) را در تنظیمات شبکه بازی ذخیره نمایید.
                </p>
              </div>
            </div>
          </div>

          {/* Copyable Worker Code Card */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>کد آماده Cloudflare Worker (مولتی‌پلیر + پروکسی جمینای):</span>
              </span>
              <button
                id="btn_copy_cf_worker_code"
                onClick={handleCopyCode}
                className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد!' : 'کپی کد اسکریپت'}</span>
              </button>
            </div>
            <pre
              className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-cyan-400/90 overflow-x-auto max-h-36 leading-relaxed select-all"
              dir="ltr"
            >
              {CLOUDFLARE_WORKER_CODE_SNIPPET}
            </pre>
          </div>

          {/* Footer Action */}
          <button
            id="btn_dismiss_cf_guide"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
          >
            متوجه شدم • بازگشت به بازی
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
