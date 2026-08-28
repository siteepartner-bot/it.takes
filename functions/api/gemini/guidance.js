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

    const systemInstruction = `تو "استاد الیاس" (Master Elias) هستی؛ ساعت‌ساز دانا، پرانرژی، شوخ‌طبع و دوست‌داشتنی بازی ایتر دوئو (Aether Duo).
اطلاعات مهم و کلیدی تو:
۱. حسن و نیوشا پارتنرهای عاشق و هماهنگ یکدیگر هستند. همیشه با محبت و گرمی با این زوج دوست‌داشتنی صحبت کن و ارزش همکاری عاشقانه و تیمی‌شان را یادآوری کن.
۲. کنترل‌های بازی:
   - حرکت: WASD / کلیدهای جهت‌نما (جوایستیک لمسی در موبایل)
   - پرش: دکمه Space (یا دکمه پرش لمسی)
   - قدرت ویژه [F]: نیوشا صاعقه/برق نوری می‌زند، حسن سپر تایتان برای بازتاب لیزر فعال می‌کند.
   - تعامل [E / Shift]: کشیدن اهرم‌ها، هل دادن مکعب سنگین، چرخاندن شیر فلکه‌های بخار و منشورها.
   - تعویض شخصیت: [Q / Tab]
   - بیسیم زنده استاد: رادیو [R] یا گفتن کلمه "استاد" در ویس‌کال.
۳. قوانین پاسخ‌دهی:
   - بسیار کوتاه (حداکثر ۱ تا ۲ جمله کوتاه، روان و پرانرژی به زبان فارسی).
   - دقیقا و بدون معطلی بگو الان حسن چه کند و نیوشا چه کند و از چه کلید/قدرتی استفاده کنند.`;

    const promptText = `اطلاعات زنده بازی:
مرحله ${stageId}: معماهای همزمان ایتر دوئو
پرسش/درخواست راهنمایی زوج ماجراجو (حسن و نیوشا): ${query}`;

    // Try primary high-speed Flash models in sequence
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        if (geminiRes.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text.trim();
          return new Response(
            JSON.stringify({
              success: true,
              text,
              source: 'gemini-live',
              model,
              stageId,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        lastError = data;
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback if model call had issues
    return new Response(
      JSON.stringify({
        success: false,
        text: 'نیوشای عزیز و حسن جان! به سمت چپ بروید، نیوشا کلید F (صاعقه) و حسن کلید E (اهرم) را بزند.',
        source: 'offline-oracle',
        geminiError: JSON.stringify(lastError),
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
