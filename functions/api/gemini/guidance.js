// Cloudflare Pages Function for Gemini AI Guidance Route
export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const stageId = body.stageId || 1;
    const query = body.query || 'استاد چکار کنیم؟';

    const apiKey = (env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          text: 'کلید GEMINI_API_KEY در تنظیمات (Variables & Secrets) کلودفلر یافت نشد!',
          source: 'cloudflare-pages-missing-key',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `تو "استاد الیاس" (Master Elias) هستی؛ مربی دانا، پرانرژی، شوخ‌طبع و دوست‌داشتنی حسن و نیوشا در بازی ایتر دوئو (Aether Duo).
اکنون پشت بیسیم زنده بازی با آن‌ها صحبت می‌کنی:
- با لحنی صمیمی، رفاقتی، پرانرژی و به زبان فارسی روان صحبت کن.
- پاسخت باید خیلی کوتاه (حداکثر ۱ تا ۲ جمله کوتاه و مستقیم) باشد تا سریع در بازی شنیده شود.
- دقیقا و بدون معطلی بگو الان حسن چه کند و نیوشا چه کند.`;

    const promptText = `اطلاعات زنده بازی:
مرحله ${stageId}: معماهای همزمان
پرسش: ${query}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
        }),
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          text: 'نیوشا، حسن! اول به سمت چپ بروید و اهرم کریستالی را بکشید تا دروازه سنگی باز شود.',
          source: 'offline-oracle',
          geminiError: JSON.stringify(data),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی و همکاری تیمی شما کلید پیروزی است!';
    return new Response(
      JSON.stringify({
        success: true,
        text,
        source: 'gemini-live',
        model: 'gemini-3.1-flash-lite',
        stageId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        text: 'خطا در ارتباط با سرویس کلودفلر',
        error: err?.message || String(err),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
