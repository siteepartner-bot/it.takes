// Cloudflare Worker Script - Aether Duo Gemini AI Proxy
// این فایل را کپی کنید و در ویرایشگر Edit Code کلودفلر ورکر بگذارید.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // پاسخ به درخواست‌های OPTIONS برای جلوگیری از خطای CORS مرورگر
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // مسیر راهنمای هوش مصنوعی
    if (url.pathname.endsWith('/api/gemini/guidance') && request.method === 'POST') {
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

        const promptText = `اطلاعات مرحله ${stageId} بازی ایتر دوئو (Aether Duo):
درخواست: ${query}`;

        const systemInstruction = 'تو "استاد الیاس" ساعت‌ساز دانای بازی ایتر دوئو هستی. با لحنی صمیمی، پرانرژی و به زبان فارسی در ۲ جمله کوتاه راهنمایی کن که نیوشا و حسن چکار کنند.';

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
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
          JSON.stringify({ success: false, text: 'خطا در پردازش ورکر کلودفلر', error: err.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // مسیر بررسی وضعیت سلامت ورکر
    if (url.pathname.endsWith('/api/gemini/status')) {
      const isAvailable = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
      return new Response(
        JSON.stringify({
          available: isAvailable,
          model: 'gemini-3.1-flash-lite',
          host: 'cloudflare-worker',
          message: isAvailable ? 'ورکر کلودفلر با موفقیت متصل است.' : 'کلید GEMINI_API_KEY ست نشده است.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // صفحه پیش‌فرض ورکر
    return new Response('Aether Duo Cloudflare Worker Active!', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};
