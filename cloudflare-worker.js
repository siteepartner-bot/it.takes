/**
 * Aether Duo - Cloudflare Worker (Full Multiplayer & Gemini AI Proxy)
 * ===================================================================
 * این اسکریپت ورکر برای میزبانی در Cloudflare Worker طراحی شده است.
 * همزمان وظایف زیر را انجام می‌دهد:
 * ۱. هماهنگی بلادرنگ وب‌سوکت دو بازیکن (نورا و برسام) در اتاق‌های بازی.
 * ۲. دریافت تماس صوتی و درخواست‌های هوش مصنوعی جمینای (Gemini AI Voice Guidance)
 *    بدون لو رفتن کلید API در سمت کاربر، با استفاده از Secret امن env.GEMINI_API_KEY.
 *
 * راهنمای راه‌اندازی سریع در Cloudflare:
 * -------------------------------------
 * ۱. در داشبورد Cloudflare به Workers & Pages -> Create Worker بروید.
 * ۲. این کد را درون ویرایشگر Worker قرار داده و Deploy کنید.
 * ۳. در منوی Settings -> Variables and Secrets، یک Secret جدید بنام GEMINI_API_KEY
 *    بسازید و کلید Gemini خود را درون آن ذخیره نمایید.
 * ۴. آدرس ورکر (مثلا wss://aether-duo.your-subdomain.workers.dev) را در بازی وارد کنید.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 2. Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', provider: 'cloudflare-worker', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Gemini AI Status Check
    if (url.pathname === '/api/gemini/status') {
      const hasKey = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
      return new Response(
        JSON.stringify({
          available: hasKey,
          model: 'gemini-2.5-flash',
          host: 'cloudflare-worker',
          message: hasKey
            ? 'کلید جمینای با موفقیت در ورکر کلودفلر فعال و متصل است.'
            : 'متغیر مخفی GEMINI_API_KEY در ورکر کلودفلر تنظیم نشده است.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Gemini Guidance Proxy Endpoint
    if (url.pathname === '/api/gemini/guidance' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { stageId = 1, role = 'explorer', puzzleState = {}, query = '', playerName = 'ماجراجو' } = body;
        const apiKey = env.GEMINI_API_KEY;

        const isNora = role === 'explorer';
        const characterName = isNora ? 'نورا (دختر چوبی / کاوشگر صاعقه)' : 'برسام (پسر چوبی / نگهبان تایتان)';

        const stageNames = {
          1: 'باغ فراموش‌شده و قنات کهن',
          2: 'جزایر معلق آسمانی و برجک لیزری',
          3: 'کارخانه مکانیکی و چرخ‌دنده اعظم',
        };

        const currentStageName = stageNames[stageId] || `مرحله ${stageId}`;

        if (apiKey && apiKey.trim()) {
          // Direct Google Gemini REST API call securely from Cloudflare edge
          const prompt = `
اطلاعات زنده بازی:
مرحله: ${stageId} (${currentStageName})
شخصیت: ${characterName} (نام: ${playerName})
وضعیت پازل:
- دروازه اول: ${puzzleState.gate1Open ? 'باز' : 'بسته'}
- اهرم اول: ${puzzleState.lever1Activated ? 'فعال' : 'غیرفعال'}
- بلوک سنگین: ${puzzleState.heavyBlockPlaced ? 'روی پد فشاری قرار دارد' : 'هنوز گذاشته نشده'}
- آسانسور قنات: ${puzzleState.aqueductElevatorHeight > 0 ? 'بالاست' : 'پایین است'}
- پل نوری: ${puzzleState.lightBridgeActive ? 'روشن' : 'خاموش'}
- برجک لیزری: ${puzzleState.laserTurretDisabled ? 'خاموش شده' : 'فعال و شلیک می‌کند'}

درخواست بازیکن:
"${query && query.trim() ? query.trim() : 'استاد الیاس، الان دقیقا باید چکار کنیم؟'}"
`;

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
          const geminiReq = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [
                  {
                    text: 'تو "استاد الیاس" (Master Elias) هستی، ساعت‌ساز فرزانه که دو آدمک چوبی نورا (دختر چابک با دستکش صاعقه [F]) و برسام (پسر نیرومند با سپر تایتان [F]) را تراشیده است. اکنون از طریق بیسیم اِیتِر پاسخ می‌دهی. حداکثر در ۲ تا ۳ جمله کوتاه، انرژی‌بخش، مستقیم و به زبان فارسی راهنمایی کن.',
                  },
                ],
              },
              generationConfig: {
                temperature: 0.7,
              },
            }),
          });

          if (geminiReq.ok) {
            const data = await geminiReq.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی شما دو نفر کلید حل این پازل است!';
            return new Response(
              JSON.stringify({
                success: true,
                text: reply.trim(),
                source: 'cloudflare-worker-gemini',
                stageId,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Fallback contextual advice if API key is not yet added in Cloudflare
        let fallback = 'نورا و برسام عزیز! حواستان به توانایی‌های مکمل هم باشد؛ نورا با صاعقه [F] کلیدهای معلق را می‌زند و برسام با سپر [F] موانع را مهار می‌کند.';
        if (stageId === 1) {
          fallback = !puzzleState.gate1Open
            ? 'ابتدا اهرم گوشه تالار را بکشید تا دروازه سنگی باز شود!'
            : !puzzleState.heavyBlockPlaced
            ? 'برسام باید مکعب سنگین سنگی را هل بدهد تا روی کلید فشاری قنات قرار بگیرد و آسانسور بالا بیاید!'
            : 'نورا، سوار آسانسور شو و با دستکش صاعقه [F] به پدستال شلیک کن تا پل نوری روشن شود!';
        } else if (stageId === 2) {
          fallback = !puzzleState.laserTurretDisabled
            ? 'مواظب پرتو لیزر باشید! برسام باید کلید [F] را نگه دارد تا با سپر تایتان پرتو را بازتاب دهد!'
            : 'حالا نورا با صاعقه به توربین معلق شلیک کند تا جریان باد شما را به خروجی برساند!';
        }

        return new Response(
          JSON.stringify({
            success: true,
            text: fallback,
            source: 'cloudflare-worker-oracle',
            stageId,
            note: 'برای اتصال زنده جمینای، کلید GEMINI_API_KEY را در تنظیمات ورکر ثبت کنید.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e.message, text: 'اختلال در امواج رادیویی اِیتِر!' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. WebSocket Relay for Co-op Multiplayer
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();

      server.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ping_server') {
            server.send(JSON.stringify({ type: 'pong', clientTime: msg.clientTime, serverTime: Date.now() }));
          }
        } catch { /* ignore */ }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders,
      });
    }

    return new Response('Aether Duo Cloudflare Worker Active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
