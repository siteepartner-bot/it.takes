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
          model: 'gemini-3.5-flash-lite',
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
        const { stageId = 1, role = 'explorer', puzzleState = {}, query = '', playerName = 'ماجراجو', distance = 0 } = body;
        const apiKey = env.GEMINI_API_KEY;

        const isNora = role === 'explorer';
        const characterName = isNora ? 'نورا (دختر چوبی / کاوشگر صاعقه)' : 'برسام (پسر چوبی / نگهبان تایتان)';

        const stageDetails = {
          1: {
            name: 'باغ فراموش‌شده و قنات کهن',
            mechanics: '۱. اهرم ورودی دروازه رونیک را بکشید. ۲. برسام مکعب سنگی سنگین را هل دهد روی پد فشاری تا قنات پر شود و آسانسور بالا برود. ۳. نورا سوار آسانسور شده، پدستال آینه‌ای را تنظیم کرده و با کلید [F] صاعقه بزند تا پل نوری روشن شود. ۴. عبور همزمان هر دو از روی پل نوری.',
          },
          2: {
            name: 'جزایر معلق آسمانی و برجک لیزری',
            mechanics: '۱. عبور از پل ابرها. ۲. برجک لیزری شلیک می‌کند: برسام کلید [F] را نگه دارد تا با سپر تایتان پرتو مرگبار را بازتاب دهد و برجک خاموش شود. ۳. نورا به توربین باد صاعقه [F] بزند تا جریان بالابرنده هوا فعال شود و به پورتال ابری برسند.',
          },
          3: {
            name: 'کارخانه مکانیکی و چرخ‌دنده اعظم',
            mechanics: '۱. برسام پیستون کوبنده غول‌آسا را با استقامت یا بلوک متوقف کند. ۲. نورا و برسام همزمان شیر فلکه‌های بخار ۱ و ۲ را با فاصله کمتر از ۳ ثانیه بچرخانند. ۳. نورا با صاعقه [F] به هسته ژنراتور بزند تا چرخ‌دنده اعظم ساعت به کار بیفتد و خروجی باز شود.',
          },
        };

        const currentStage = stageDetails[stageId] || stageDetails[1];

        if (apiKey && apiKey.trim()) {
          const prompt = `
اطلاعات زنده از محیط سه بعدی بازی Aether Duo:
- مرحله: ${stageId} (${currentStage.name})
- مکانیزم کلیدی مرحله: ${currentStage.mechanics}
- مخاطب فعال: ${characterName} (نام: ${playerName})
- فاصله مکانی از هم‌تیمی: ${Math.round(distance)} متر
- وضعیت دقیق پازل و پرچم‌های مرحله:
  * دروازه اول رونیک: ${puzzleState.gate1Open ? 'باز است' : 'بسته است'}
  * اهرم ورودی: ${puzzleState.lever1Activated ? 'کشیده شده' : 'هنوز غیرفعال'}
  * مکعب سنگین سنگی: ${puzzleState.heavyBlockPlaced ? 'روی پد فشاری قنات است' : 'هنوز جا به جا نشده'}
  * آسانسور قنات: ${puzzleState.aqueductElevatorHeight > 0 ? 'در بالا قرار دارد' : 'در پایین است'}
  * پل نوری اِیتِر: ${puzzleState.lightBridgeActive ? 'روشن و فعال' : 'خاموش'}
  * برجک لیزری دفاعی (مرحله ۲): ${puzzleState.laserTurretDisabled ? 'از کار افتاده و خاموش' : 'در حال شلیک پرتو مرگبار'}
  * شیرهای بخار (مرحله ۳): ۱=${puzzleState.boilerValve1 ? 'باز' : 'بسته'} | ۲=${puzzleState.boilerValve2 ? 'باز' : 'بسته'}
  * چرخ‌دنده اعظم ساعت: ${puzzleState.grandClockworkEngaged ? 'به کار افتاده' : 'متوقف'}

سوال / پیام صوتی بازیکن:
"${query && query.trim() ? query.trim() : 'استاد الیاس، الان دقیقا باید چکار کنیم و قدم بعدیمون چیه؟'}"
`;

          // Try gemini-3.5-flash-lite first for maximum speed and intelligence
          let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey.trim()}`;
          let geminiReq = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: {
                parts: [
                  {
                    text: 'تو "استاد الیاس" (Master Elias) هستی؛ ساعت‌ساز فرزانه و دانای کهن که نورا (دختر چابک با صاعقه [F]) و برسام (پسر تایتان با سپر [F]) را تراشیده‌ای. از طریق بیسیم اِیتِر پاسخ می‌دهی. بر اساس وضعیت زنده پازل، بسیار دقیق، عاقلانه، راهبردی، پرانرژی و کوتاه (حداکثر ۲ تا ۳ جمله صریح فارسی) راهنمایی کن.',
                  },
                ],
              },
              generationConfig: {
                temperature: 0.6,
              },
            }),
          });

          if (!geminiReq.ok) {
            // Fallback to gemini-3.6-flash if needed
            geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`;
            geminiReq = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: {
                  parts: [
                    {
                      text: 'تو استاد الیاس هستی. با لحنی خردمندانه، گرم و کوتاه به زبان فارسی راهنمایی کن.',
                    },
                  ],
                },
              }),
            });
          }

          if (geminiReq.ok) {
            const data = await geminiReq.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هماهنگی و ترکیب توانایی‌های صاعقه نورا و سپر برسام کلید راه شماست!';
            return new Response(
              JSON.stringify({
                success: true,
                text: reply.trim(),
                source: 'cloudflare-worker-gemini-3.5-flash-lite',
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

      let clientInfo = {
        ws: server,
        roomCode: null,
        role: null,
        id: null,
      };

      server.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ping_server') {
            server.send(JSON.stringify({ type: 'pong', clientTime: msg.clientTime, serverTime: Date.now() }));
            return;
          }

          if (msg.type === 'create_room') {
            const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
            const aDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            let customCode = msg.code ? String(msg.code).trim().toUpperCase() : '';
            for (let i = 0; i < 10; i++) {
              customCode = customCode.split(pDigits[i]).join(String(i)).split(aDigits[i]).join(String(i));
            }
            customCode = customCode.replace(/[^A-Z0-9]/g, '');

            const WORDS = ['AURA', 'NOVA', 'LUNA', 'SOL', 'ECHO', 'ZEST', 'PEAK', 'IRIS', 'VALE', 'FLUX'];
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            const num = Math.floor(10 + Math.random() * 90);
            const code = customCode || `${word}${num}`;
            const role = msg.preferredRole || 'explorer';
            const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;

            clientInfo.roomCode = code;
            clientInfo.role = role;
            clientInfo.id = clientId;

            const roomData = {
              code,
              stageId: 1,
              checkpointId: 0,
              players: {
                [role]: {
                  id: clientId,
                  name: msg.playerName || (role === 'explorer' ? 'Explorer' : 'Guardian'),
                  ready: true,
                  connected: true,
                  pingMs: 1,
                },
              },
              puzzleState: {
                stageId: 1,
                checkpointId: 0,
                gate1Open: false,
                lever1Activated: false,
                heavyBlockPlaced: false,
                aqueductElevatorHeight: 0,
                lightBridgeActive: false,
                crystalPillarCharged: false,
                laserTurretDisabled: false,
                cloudPlatformPos: { x: 0, y: 0, z: 0 },
                cloudWindActive: false,
                boilerValve1: false,
                boilerValve2: false,
                steamPistonHalted: false,
                grandClockworkEngaged: false,
                finalGateOpen: false,
                customData: {},
              },
              status: 'waiting',
            };

            const roomRecord = {
              data: roomData,
              clients: new Map([[role, clientInfo]]),
            };

            activeRooms.set(code, roomRecord);

            server.send(JSON.stringify({
              type: 'room_joined',
              room: roomData,
              assignedRole: role,
              yourId: clientId,
            }));
            return;
          }

          if (msg.type === 'join_room') {
            const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
            const aDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            let cleanCode = String(msg.code || '').trim().toUpperCase();
            for (let i = 0; i < 10; i++) {
              cleanCode = cleanCode.split(pDigits[i]).join(String(i)).split(aDigits[i]).join(String(i));
            }
            cleanCode = cleanCode.replace(/[^A-Z0-9]/g, '');

            const room = activeRooms.get(cleanCode);

            if (!room) {
              server.send(JSON.stringify({
                type: 'error',
                message: `اتاقی با کد ${cleanCode} یافت نشد. لطفاً کد را بررسی کرده یا مطمئن شوید سازنده اتاق آنلاین است.`,
              }));
              return;
            }

            const preferred = msg.preferredRole;
            let assignedRole;
            const expConn = room.data.players.explorer?.connected;
            const grdConn = room.data.players.guardian?.connected;

            if (preferred && !room.data.players[preferred]?.connected) {
              assignedRole = preferred;
            } else if (!expConn) {
              assignedRole = 'explorer';
            } else if (!grdConn) {
              assignedRole = 'guardian';
            } else {
              server.send(JSON.stringify({
                type: 'error',
                message: `ظرفیت اتاق ${cleanCode} تکمیل است.`,
              }));
              return;
            }

            const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;
            clientInfo.roomCode = cleanCode;
            clientInfo.role = assignedRole;
            clientInfo.id = clientId;

            room.data.players[assignedRole] = {
              id: clientId,
              name: msg.playerName || (assignedRole === 'explorer' ? 'Explorer' : 'Guardian'),
              ready: true,
              connected: true,
              pingMs: 15,
            };
            room.data.status = 'ready';
            room.clients.set(assignedRole, clientInfo);

            server.send(JSON.stringify({
              type: 'room_joined',
              room: room.data,
              assignedRole,
              yourId: clientId,
            }));

            // Notify partner
            const partnerRole = assignedRole === 'explorer' ? 'guardian' : 'explorer';
            const partner = room.clients.get(partnerRole);
            if (partner && partner.ws) {
              try {
                partner.ws.send(JSON.stringify({
                  type: 'player_joined',
                  role: assignedRole,
                  name: room.data.players[assignedRole].name,
                }));
              } catch (e) {}
            }
            return;
          }

          // Relay messages to partner socket
          if (clientInfo.roomCode) {
            const room = activeRooms.get(clientInfo.roomCode);
            if (room) {
              const partnerRole = clientInfo.role === 'explorer' ? 'guardian' : 'explorer';
              const partner = room.clients.get(partnerRole);

              if (msg.type === 'player_update' && partner?.ws) {
                partner.ws.send(JSON.stringify({ type: 'partner_update', state: msg.state }));
              } else if (msg.type === 'puzzle_trigger') {
                const ps = room.data.puzzleState;
                if (msg.key in ps) {
                  ps[msg.key] = msg.value;
                } else {
                  ps.customData[msg.key] = msg.value;
                }
                const syncMsg = JSON.stringify({ type: 'puzzle_synced', puzzleState: ps });
                try { server.send(syncMsg); } catch (e) {}
                try { partner?.ws?.send(syncMsg); } catch (e) {}
              } else if (msg.type === 'emote' && partner?.ws) {
                partner.ws.send(JSON.stringify({ type: 'emote_triggered', data: { role: clientInfo.role, emote: msg.emote } }));
              } else if (msg.type === 'ping' && partner?.ws) {
                partner.ws.send(JSON.stringify({ type: 'ping_triggered', data: { id: `ping_${Date.now()}`, x: msg.x, y: msg.y, z: msg.z, senderRole: clientInfo.role, senderName: msg.senderName, timestamp: Date.now() } }));
              } else if (msg.type === 'checkpoint_update') {
                room.data.checkpointId = msg.checkpointId;
                const cpMsg = JSON.stringify({ type: 'checkpoint_updated', checkpointId: msg.checkpointId });
                try { server.send(cpMsg); } catch (e) {}
                try { partner?.ws?.send(cpMsg); } catch (e) {}
              } else if (msg.type === 'stage_change') {
                room.data.stageId = msg.stageId;
                const scMsg = JSON.stringify({ type: 'stage_changed', stageId: msg.stageId });
                try { server.send(scMsg); } catch (e) {}
                try { partner?.ws?.send(scMsg); } catch (e) {}
              }
            }
          }
        } catch { /* ignore */ }
      });

      server.addEventListener('close', () => {
        if (clientInfo.roomCode && clientInfo.role) {
          const room = activeRooms.get(clientInfo.roomCode);
          if (room) {
            room.clients.delete(clientInfo.role);
            if (room.data.players[clientInfo.role]) {
              room.data.players[clientInfo.role].connected = false;
            }
            const partnerRole = clientInfo.role === 'explorer' ? 'guardian' : 'explorer';
            const partner = room.clients.get(partnerRole);
            if (partner?.ws) {
              try {
                partner.ws.send(JSON.stringify({ type: 'player_disconnected', role: clientInfo.role }));
              } catch (e) {}
            }
            if (room.clients.size === 0) {
              activeRooms.delete(clientInfo.roomCode);
            }
          }
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders,
      });
    }

    // Module scoped activeRooms map
    if (typeof activeRooms === 'undefined') {
      globalThis.activeRooms = globalThis.activeRooms || new Map();
    }

    return new Response('Aether Duo Cloudflare Worker Active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
