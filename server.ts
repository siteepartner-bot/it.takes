import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import type { ClientMessage, ServerMessage, RoomData, PlayerRole, PuzzleState, PlayerNetState } from './src/types.js';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Initialize Gemini SDK dynamically
function getGeminiClient(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) return null;
  const cleanKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!cleanKey || cleanKey === 'MY_GEMINI_API_KEY' || cleanKey.length < 5) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: cleanKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Trust Cloudflare proxy headers (CF-Connecting-IP, X-Forwarded-For, X-Forwarded-Proto)
app.set('trust proxy', true);
app.use(express.json());

// In-memory room store
interface ConnectedClient {
  ws: WebSocket;
  id: string;
  name: string;
  role: PlayerRole;
  roomCode: string;
  lastSeen: number;
}

interface RoomRecord {
  data: RoomData;
  clients: Map<PlayerRole, ConnectedClient>;
  voiceMembers: Set<string>;
  lastActive: number;
}

const rooms = new Map<string, RoomRecord>();

// Helper to create fresh default puzzle state
function createDefaultPuzzleState(stageId = 1): PuzzleState {
  return {
    stageId,
    checkpointId: 0,
    gate1Open: false,
    lever1Activated: false,
    heavyBlockPos: [12, 1, 4],
    heavyBlockPlaced: false,
    aqueductElevatorHeight: 0,
    lightBridgeActive: false,
    bridgePedestalRotated: false,
    stage1ExitP1Ready: false,
    stage1ExitP2Ready: false,

    floatingIslandBridgeActive: false,
    turretShieldDeflected: false,
    laserTurretDisabled: false,
    vortexActivated: false,
    stage2ExitP1Ready: false,
    stage2ExitP2Ready: false,

    crusherJammed: false,
    boilerValve1: false,
    boilerValve2: false,
    boilerSequenceSuccess: false,
    grandClockworkEngaged: false,
    stage3ExitP1Ready: false,
    stage3ExitP2Ready: false,

    prism1Aligned: false,
    solarConduitActive: false,
    prism2Aligned: false,
    sunCoreAwakened: false,
    solarResonator1: false,
    solarResonator2: false,
    stage4ExitP1Ready: false,
    stage4ExitP2Ready: false,

    gravityBridgeActive: false,
    stage5ExitP1Ready: false,
    stage5ExitP2Ready: false,

    monolithFireActive: false,
    monolithWaterActive: false,
    monolithAirActive: false,
    monolithEarthActive: false,
    stage6ExitP1Ready: false,
    stage6ExitP2Ready: false,

    customData: {},
  };
}

// Generate human-friendly 5-character room code (e.g. SKY42, ECHO7)
const WORDS = ['AURA', 'NOVA', 'LUNA', 'SOL', 'ECHO', 'ZEST', 'PEAK', 'IRIS', 'VALE', 'FLUX'];
function generateRoomCode(): string {
  for (let i = 0; i < 20; i++) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const num = Math.floor(10 + Math.random() * 90);
    const code = `${word}${num}`;
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roomsActive: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    code: room.data.code,
    stageId: room.data.stageId,
    status: room.data.status,
    explorerJoined: !!room.data.players.explorer?.connected,
    guardianJoined: !!room.data.players.guardian?.connected,
  });
});

// Gemini AI Status Check
app.get('/api/gemini/status', (req, res) => {
  const isAvailable = !!getGeminiClient();
  res.json({
    available: isAvailable,
    model: 'gemini-3.1-flash-lite',
    host: 'node-express',
    message: isAvailable
      ? 'جمینای به صورت بلادرنگ و فعال روی سرور متصل است.'
      : 'کلید GEMINI_API_KEY تنظیم نشده است یا در حالت آفلاین/لوکال اجرا می‌شود.',
  });
});

// Gemini In-Game Voice Guidance Endpoint
const STAGE_CONTEXT_DATA: Record<number, { name: string; keyObjectives: string }> = {
  1: {
    name: 'مرحله ۱: اولین همکاری (باغ چوبی و دروازه باستانی)',
    keyObjectives:
      '۱. حرکت در مسیر مستقیم تا رسیدن به دروازه بسته چوبی. ۲. ایستادن یکی از بازیکنان (حسن یا نیوشا) روی دکمه فشاری بزرگ زمینی برای باز نگه داشتن دروازه. ۳. عبور نفر دوم از دروازه به بخش دوم باغ در حالی که نفر اول همچنان روی دکمه ایستاده است. ۴. کشیدن اهرم سمت دیگر توسط نفر دوم برای باز شدن دائمی دروازه (Permanent Unlock). ۵. عبور نفر اول از دروازه و حرکت هر دو به سمت خروجی. ۶. ایستادن هم‌زمان هر دو بازیکن روی سکوهای خروجی پورتال.'
  },
  2: {
    name: 'مرحله ۲: پل متحرک (دره عمیق چوبی و همکاری رفت و برگشتی)',
    keyObjectives:
      '۱. کشیدن اهرم ۱ کنار شکاف اول دره برای حرکت دادن سکوی معلق متحرک ۱. ۲. سوار شدن هر دو بازیکن و رسیدن به سکوی میانی (ثبت چک‌پوینت ۲). ۳. تقسیم مسیر: یکی از بازیکنان وارد مسیر A (سمت چپ) و دیگری وارد مسیر B (پایین سمت راست) می‌شود. ۴. بازیکن مسیر A به انتهای مسیر رفته و اهرم مسیر A را می‌کشد تا بالابر عمودی سکوی دوم به پایین رفته و به مسیر B برسد. ۵. بازیکن مسیر B سوار بالابر شده و بالا می‌رود، سپس اهرم بالای برج B را می‌کشد تا پل چوبی مسیر A پایین بیاید و راه بازیکن مسیر A باز شود. ۶. هر دو بازیکن از مسیرهای باز شده عبور کرده، در انتهای پل چوبی به هم می‌رسند و هم‌زمان روی پدهای خروجی پورتال می‌ایستند.'
  },
  3: {
    name: 'مرحله ۳: دو کلید (کارخانه مکانیکی، پیستون‌های غول‌آسا و کوره آتش)',
    keyObjectives:
      '۱. عبور از پیستون کوبنده فلزی: حسن با قدرت تایتان خود می‌تواند پیستون را متوقف کند یا مکعب سنگین فلزی را زیر آن هل دهد تا مسیر امن شود. ۲. فعال‌سازی شیر فلکه‌های بخار: نیوشا و حسن باید هم‌زمان هر دو شیر فلکه بخار شماره ۱ و ۲ را بچرخانند (با کلید E، فاصله بین دو فعال‌سازی باید کمتر از ۳ ثانیه باشد). ۳. بیدارباش ژنراتور ساعت: نیوشا باید به هسته درخشان ژنراتور صاعقه بزنه تا چرخ‌دنده اعظم شروع به گردش کنه و در پورتال مرکزی باز بشه. ۴. ایستادن هم‌زمان روی سکوهای خروج.'
  },
  4: {
    name: 'مرحله ۴: مسیرهای متفاوت (معبد کانون خورشید و منشورهای لیزری)',
    keyObjectives:
      '۱. عبور از خط دفاعی پرتوهای چرخان کف معبد و تنظیم منشور نوری ۱ با کلید [E] توسط نیوشا برای باز شدن پل نوری خورشید. ۲. جابجایی مکعب بلورین خورشید روی هادی انرژی (صفحه زرد) با کلید [E] برای شارژ برج دوم. ۳. چرخاندن منشور نوری ۲ با کلید [E] به سمت هسته اعظم خورشید تا هسته بیدار شود و سکوهای معلق پرنده به حرکت درآیند. ۴. پرش روی سکوهای متحرک خورشید بر فراز ورطه تا رسیدن به محراب نهایی. ۵. فعال‌سازی هم‌زمان قفل دوگانه رزوناتورهای ۱ و ۲ توسط نیوشا و حسن تا دروازه بزرگ خورشید گشوده شود. ۶. قرار گرفتن هم‌زمان روی پدهای خروجی.'
  },
  5: {
    name: 'مرحله ۵: سکوی متحرک (هزارتوی گرانش و تالار ستارگان)',
    keyObjectives:
      '۱. جابجایی مکعب گرانش روی سوئیچ‌ها برای باز کردن معابر اولیه. ۲. ایستادن هم‌زمان نیوشا و حسن روی دکمه‌های گرانش کوانتومی (شامل gravity_switch_1 برای کاوشگر و gravity_switch_2 برای نگهبان) برای فعال‌سازی مدار ضدجاذبه. ۳. با این کار پل نوری معلق ستارگان آشکار می‌شود. ۴. عبور از روی پل نوری و مستقر شدن هم‌زمان هر دو بازیکن روی پورتال‌های خروجی تالار.'
  },
  6: {
    name: 'مرحله ۶: نور و سایه (دژ باستانی ابدیت و محاکمه نهایی)',
    keyObjectives:
      '۱. فعال‌سازی ۴ ستون و عنصر باستانی (ستون‌های آتش، آب، باد، خاک) با زدن کلید تعامل [E] بر روی هر چهار کتیبه و سنگ یادبود دور میدان. ۲. با فعال شدن هر چهار عنصر، بلور مرکزی اِیتِر در مرکز آسمان بیدار و درخشان می‌شود. ۳. قرار گرفتن هم‌زمان هر دو بازیکن روی پدهای خروجی زیر هسته برای تثبیت انرژی ابدیت و به پایان رساندن موفقیت‌آمیز کل بازی.'
  },
  7: {
    name: 'مرحله ۷: فرار از سیل (سد باستانی)',
    keyObjectives:
      'این یک تالار همکاری ویژه (سد باستانی) است. ابتدا کتیبه باستانی ورودی را با کلید [E] بخوانید. یک بازیکن باید روی دکمه فشاری کف زمین بایستد تا دروازه بزرگ آهنی باز شود. بازیکن دوم از در عبور کرده و در سمت دیگر، اهرم سنگی را می‌کشد تا در برای همیشه باز و قفل شود. سپس هر دو با هم روی سکوهای پورتال خروجی انتهای اتاق مستقر شوید.'
  },
  8: {
    name: 'مرحله ۸: باغ معلق (جزایر شناور ایتر)',
    keyObjectives:
      'این یک تالار همکاری هوشمند (جزایر آسمانی) است. کتیبه ورودی را بخوانید. یک بازیکن باید روی دکمه فشاری قرار بگیرد تا در بزرگ برای پارتنرش باز شود. بازیکن دوم از میان در عبور کرده و اهرم سمت دیگر را می‌کشد تا در تا ابد باز بماند. سپس هر دو بازیکن به سمت انتهای مسیر رفته و هم‌زمان روی پدهای خروجی پورتال مستقر می‌شوند تا پیروز شوند.'
  },
  9: {
    name: 'مرحله ۹: اتاق آینه‌ها (معبد شیشه‌ای و تصاویر کاذب)',
    keyObjectives:
      'این یک اتاق همکاری تیمی با تله‌های تصویری است. با خواندن کتیبه شروع کنید. یکی از بازیکنان باید روی دکمه فشاری بایستد تا دروازه آهنی گشوده شود. بازیکن دوم از در رد شده و با کشیدن اهرم سمت دیگر، در را قفل باز می‌کند. سپس هر دو به پورتال‌های خروجی انتهای تالار رفته و هم‌زمان روی آن‌ها می‌ایستند.'
  },
  10: {
    name: 'مرحله ۱۰: قطار متروکه (ایستگاه راه آهن باستانی)',
    keyObjectives:
      'این تالار بزرگ و باستانی ایستگاه راه آهن اِیتِر است. پس از خواندن داستان کتیبه، یکی از شما باید روی دکمه بزرگ کف ایستگاه بایستد تا در آهنی باز شود. هم‌تیمی شما از در عبور کرده و اهرم مقابل را فعال می‌کند تا در برای همیشه قفل باز بماند. در نهایت هر دو با هم روی پدهای خروجی قطار معلق قرار بگیرید.'
  },
  11: {
    name: 'مرحله ۱۱: معبد زمان (تالار چکش‌های کوبنده)',
    keyObjectives:
      'این تالار نگهبانان زمان است. ابتدا کتیبه را با کلید [E] بخوانید. یکی از زوج‌ها باید روی دکمه فشاری قرار گیرد تا دروازه باز شود، بازیکن دیگر از دروازه عبور کرده و در طرف مقابل اهرم طلایی زمان را فعال می‌کند تا قفل در برداشته شود. هر دو عبور کرده و هم‌زمان روی درگاه‌های خروجی پورتال می‌ایستند.'
  },
  12: {
    name: 'مرحله ۱۲: کتابخانه گمشده (آرشیو بزرگ الیاس)',
    keyObjectives:
      'این تالار گنجینه کتب ساعت‌ساز است. با خواندن کتیبه راز آغاز کنید. یک بازیکن روی دکمه فشاری کف ایستاده تا مسیر هم‌تیمی باز شود. هم‌تیمی با عبور از در، اهرم سمت راست را می‌کشد تا در قفل باز بماند. سپس هر دو با هم روی دستگاه پورتال خروج هم‌زمان مستقر می‌شوید.'
  },
  13: {
    name: 'مرحله ۱۳: تونل‌های زیرزمینی (معدن کهن)',
    keyObjectives:
      'این مرحله تونل‌های موازی و ایزوله معدن است. ابتدا کتیبه ورودی را بخوانید. برای عبور، یک بازیکن باید روی دکمه فشاری مستقر شود تا دروازه سنگی باز شود. نفر دوم عبور کرده و اهرم سمت دیگر را فعال می‌کند تا در قفل باز شود. سپس هر دو به سمت پدهای خروجی رفته و هم‌زمان روی آن‌ها می‌ایستند.'
  },
  14: {
    name: 'مرحله ۱۴: شهر خاموش (متروپلیس ایتر)',
    keyObjectives:
      'این تالار متروپل بزرگ اِیتِر است. کتیبه را مطالعه کنید. هماهنگی صمیمانه لازم است: یک بازیکن روی کلید زمینی ایستاده تا در برای دیگری باز شود. دیگری رد شده و اهرم قفل‌کننده را می‌کشد. سپس هر دو با هم روی پورتال‌های نهایی ایستاده تا برق شهر متصل شده و مرحله تمام شود.'
  },
  15: {
    name: 'مرحله ۱۵: برج معکوس (برج هندسه معکوس)',
    keyObjectives:
      'در این برج هندسه معکوس گرانش، ابتدا کتیبه را بخوانید. یک بازیکن روی دکمه فشاری گرانش ایستاده تا در باز شود. بازیکن دوم عبور کرده و اهرم دیوار مقابل را می‌کشد تا در دائم باز بماند. سپس هر دو از دروازه عبور کرده و هم‌زمان روی دایره‌های خروجی مستقر می‌شوید.'
  },
  16: {
    name: 'مرحله ۱۶: طوفان بزرگ (قله طوفانی)',
    keyObjectives:
      'این مرحله ستیغ قله طوفانی است. ابتدا کتیبه باد را با کلید [E] بخوانید. برای پناه گرفتن از باد شدید، یک نفر روی دکمه فشاری می‌ایستد تا در بزرگ معبد باز شود. پارتنر او عبور کرده و اهرم پایداری را فعال می‌کند تا در قفل باز شود. هر دو عبور کرده و هم‌زمان روی درگاه‌های خروج می‌ایستند.'
  },
  17: {
    name: 'مرحله ۱۷: تالار انتخاب‌ها (محراب خورشید و ماه)',
    keyObjectives:
      'این تالار محراب خورشید و ماه است. کتیبه دوراهی را بخوانید. یکی روی دکمه فشاری کف ایستاده تا دروازه غول‌آسا باز شود. دیگری عبور کرده و اهرم را می‌کشد تا دروازه باز بماند. سپس هر دو با تکیه بر عشق و هماهنگی روی پورتال‌های خروجی انتهای محراب هم‌زمان می‌ایستید.'
  },
  18: {
    name: 'مرحله ۱۸: نگهبانان دروازه (نبرد تایتان‌ها)',
    keyObjectives:
      'این تالار تایتان‌های نگهبان است. کتیبه را بخوانید. با هماهنگی کامل، یکی روی دکمه فشاری کف می‌ایستد تا دروازه عبور باز شود. بازیکن دیگر عبور کرده و اهرم خلع سلاح نگهبانان را فعال می‌کند تا دروازه باز بماند. در نهایت هر دو با هم روی پدهای خروج انتهای مرحله مستقر می‌شوید.'
  },
  19: {
    name: 'مرحله ۱۹: آخرین آزمون (گانتلت کیهانی)',
    keyObjectives:
      'این گانتلت کیهانی نهایی قبل از دروازه اصلی است. ابتدا کتیبه را بخوانید. یک نفر روی دکمه فشاری معما می‌ایستد تا مسیر عبور پارتنرش باز شود. نفر دوم عبور کرده و اهرم انتهایی را می‌کشد تا راه دائم باز بماند. سپس هر دو هم‌زمان روی پدهای خروجی مستقر می‌شوید.'
  },
  20: {
    name: 'مرحله ۲۰: دروازه خروج (دروازه ابدیت و بازگشت)',
    keyObjectives:
      'این دروازه طلایی خروج نهایی و پایان کل داستان عاشقانه بازی است! ابتدا آخرین کتیبه را بخوانید. یک بازیکن روی دکمه کنترل سمت چپ ایستاده تا درگاه اصلی ابدیت نیمه‌فعال شود. بازیکن دیگر عبور کرده و اهرم اصلی ابدیت را می‌کشد تا درگاه کاملاً باز بماند. در نهایت هر دو با هم روی پدهای خروجی مرکزی قرار گرفته تا پایان شکوهمند بازی نمایان شود.'
  }
};

app.post('/api/gemini/guidance', async (req, res) => {
  try {
    const { stageId = 1, role = 'explorer', puzzleState, query, playerName } = req.body || {};
    const stageInfo = STAGE_CONTEXT_DATA[stageId] || STAGE_CONTEXT_DATA[1];
    const isNiusha = role === 'explorer';
    const characterName = isNiusha ? 'نیوشا (دختر چوبی / کاوشگر صاعقه)' : 'حسن (پسر چوبی / نگهبان تایتان)';

    const pState = puzzleState || {};
    const stateSummary = [
      `مرحله فعلی: ${stageId} (${stageInfo.name})`,
      `شخصیت در حال صحبت: ${characterName} (نام بازیکن: ${playerName || 'ماجراجو'})`,
      `وضعیت اهرم اول: ${pState.lever1Activated ? 'کشیده شده و فعال' : 'هنوز فعال نشده'}`,
      `مکعب سنگین: ${pState.heavyBlockPlaced ? 'روی پد قرار گرفته' : 'هنوز سر جای خود نیست'}`,
      `پل نوری: ${pState.lightBridgeActive ? 'روشن و فعال' : 'خاموش'}`,
      `برجک لیزری: ${pState.laserTurretDisabled ? 'خاموش و غیرفعال شده' : 'فعال و شلیک می‌کند'}`,
      `جریان باد صعودی (Vortex): ${pState.laserTurretDisabled ? 'فعال و وزنده برای پرواز بازیکنان به سکوی خروجی' : 'غیرفعال'}`,
      `منشور نوری ۱: ${pState.customData?.prism1Aligned ? 'تنظیم شده' : 'غیرتنظیم'}`,
      `منشور نوری ۲: ${pState.customData?.prism2Aligned ? 'تنظیم شده' : 'غیرتنظیم'}`,
      `چرخ‌دنده ساعت: ${pState.grandClockworkEngaged ? 'به کار افتاده و فعال' : 'متوقف'}`,
    ].join('\n');

    const promptText = `
اطلاعات زنده بازی و وضعیت دکمه‌ها/اهرم‌ها در مرحله:
${stateSummary}

اهداف، معماها و نحوه حل این مرحله از بازی:
${stageInfo.keyObjectives}

پرسش یا نیاز ماجراجویان:
"${query && query.trim() ? query.trim() : 'استاد الیاس، لطفاً یک راهنمایی سریع و مستقیم بده، الان دقیقاً چکار کنیم و قدم بعدی‌مان برای جلو رفتن چیست؟'}"
`;

    const ai = getGeminiClient();
    let geminiErrorMsg = '';

    if (ai) {
      const systemInstruction = `تو "استاد الیاس" (Master Elias) هستی؛ ساعت‌ساز دانا، فوق‌العاده باهوش، دلسوز، پرانرژی و دوست‌داشتنی در بازی دو‌نفره ایتر دوئو (Aether Duo).
تو باید راهنمای عاقل و همه‌چیزدان بازی باشی. در هر مرحله‌ای (از مرحله ۱ تا ۲۰) هر سوالی بازیکنان کردند یا هرکجا گیر کردند، تو دقیقاً راه حل ریاضی/فیزیکی و پازل آن مرحله را می‌دانی و به آنها می‌گویی.
اطلاعات کلیدی و مهم تو:
۱. حسن و نیوشا زوج قهرمان، پارتنرهای عاشق و هماهنگ یکدیگر هستند. همیشه با لحن گرم، صمیمانه و باانرژی آنها را تشویق کن و ارزش فوق‌العاده رفاقت و عشقشان را یادآور شو.
۲. کنترل‌های بازی:
   - حرکت: کلیدهای WASD یا جهت‌نماها (یا جویستیک لمسی)
   - پرش: کلید Space (یا دکمه لمسی بالا)
   - قدرت ویژه [F]: صاعقه نوری نیوشا (برای زدن به ژنراتورها و شارژ قطعات) / سپر تایتان حسن (برای بازتاب پرتو مرگبار لیزر به سمت خودش)
   - تعامل [E / Shift]: خواندن کتیبه‌ها، کشیدن اهرم‌ها، هل دادن مکعب سنگین، چرخاندن شیر فلکه‌های بخار و منشورها.
   - تعویض شخصیت: [Q] یا [Tab] (در حالت تک‌نفره برای جابجایی بین حسن و نیوشا).
۳. برای مراحل ۷ تا ۲۰: برای گذشتن از درگاه، باید یکی از بازیکنان روی پد فشاری زمین (Pressure Plate) بایستد تا در باز شود و نفر دوم عبور کند. سپس نفر دوم اهرم سنگی (Lever) سمت دیگر را بکشد تا در برای همیشه باز بماند. در نهایت هر دو روی پورتال‌های خروجی هم‌زمان مستقر شوند.
۴. پاسخت باید کوتاه، روان، دلگرم‌کننده و دقیقاً به زبان فارسی باشد (حداکثر ۱ تا ۳ جمله کوتاه) و مستقیماً بگوید هم‌اکنون چه حرکتی بزنند تا معما حل شود.`;

      // Models to try in sequence - using compliant Gemini 3.7 & 3.1 models
      const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.65,
            },
          });

          if (response?.text && response.text.trim()) {
            return res.json({
              success: true,
              text: response.text.trim(),
              source: 'gemini-live',
              model: modelName,
              stageId,
            });
          }
        } catch (mErr: any) {
          geminiErrorMsg = mErr?.message || String(mErr);
          console.warn(`Gemini model ${modelName} call failed:`, geminiErrorMsg);
        }
      }
    }

    // Dynamic contextual fallback mentor oracle if API key is missing or quota/limits reached
    let fallbackText = '';
    if (stageId === 1) {
      if (!pState.lever1Activated) {
        if (!pState.gate1Open) {
          fallbackText = 'حسن و نیوشا عزیزم! یکی از شما باید روی دکمه فشاری بزرگ بایستد تا دروازه باز بماند و نفر دوم بتواند از آن عبور کند!';
        } else {
          fallbackText = 'دروازه باز شد! بازیکنی که عبور کرده باید سریعاً اهرم سمت دیگر را با کلید [E] بکشد تا در برای همیشه باز بماند و پارتنرش هم بتواند بیاید!';
        }
      } else {
        fallbackText = 'آفرین به این همکاری عالی! دروازه برای همیشه باز شد؛ حالا هر دو به سمت سکوهای خروجی پورتال در انتهای مسیر بروید و هم‌زمان روی آن‌ها بایستید!';
      }
    } else if (stageId === 2) {
      const isP1Active = !!pState.floatingIslandBridgeActive || !!pState.customData?.stage2Platform1Active;
      const isLeverA = !!pState.laserTurretDisabled || !!pState.customData?.stage2LeverA;
      const isLeverB = !!pState.vortexActivated || !!pState.customData?.stage2LeverB;

      if (!isP1Active) {
        fallbackText = 'حسن و نیوشا عزیزم! برای عبور از شکاف اول دره، اهرم کنار لبه را با [E] بکشید تا سکوی متحرک اول فراخوانده شود و هر دو سوار آن شوید!';
      } else if (!isLeverA) {
        fallbackText = 'به سکوی میانی رسیدید! حالا یکی از شما وارد مسیر A و دیگری مسیر B شود. بازیکنی که به انتهای مسیر A می‌رسد باید اهرم [E] را بکشد تا بالابر به سمت هم‌تیمی‌اش در مسیر B حرکت کند!';
      } else if (!isLeverB) {
        fallbackText = 'بالابر در مسیر B فعال شد! بازیکن مسیر B سوار بالابر شده و بالا برود، سپس اهرم بالای برج را با [E] بکشد تا پل چوبی مسیر A برای هم‌تیمی‌اش باز شود!';
      } else {
        fallbackText = 'عالی بود! پل مسیر A باز شد و هر دو می‌توانید عبور کنید؛ در انتهای پل چوبی به سمت پورتال بروید و هم‌زمان روی سکوهای خروج بایستید!';
      }
    } else if (stageId === 3) {
      if (!pState.grandClockworkEngaged) {
        fallbackText = 'اینجا قلب ساعت بزرگه! حسن و نیوشا باید همزمان هر دو شیر فلکه بخار رو بچرخونید (با فاصله کمتر از ۳ ثانیه)، بعد نیوشا به ژنراتور اصلی صاعقه [F] بزنه تا چرخ‌دنده راه بیفته!';
      } else {
        fallbackText = 'عالیه بچه‌ها! چرخ‌دنده‌ها به گردش دراومدن و مسیر باز شد؛ با همیاری هم به سمت پورتال نهایی خروج قدم بردارید!';
      }
    } else if (stageId === 4) {
      fallbackText = 'در معبد آینه‌ها (مرحله ۴)، نیوشا منشور نوری ۱ و حسن منشور نوری ۲ را با کلید [E] می‌چرخانند تا پرتو به چشم بزرگ هوروس متمرکز شود و دروازه خورشیدی باز شود!';
    } else if (stageId === 5) {
      fallbackText = 'در تالار گرانش ستارگان (مرحله ۵)، نیوشا و حسن باید همزمان روی سوئیچ‌های گرانش چپ و راست قرار بگیرند تا پل نوری اثیری میان ستارگان نمایان شود!';
    } else if (stageId === 6) {
      fallbackText = 'در دژ ابدیت (مرحله ۶)، کتیبه‌ی ۴ عنصر باستانی (آتش، آب، باد، خاک) دور میدان را با کلید [E] فعال کنید تا بلور مرکزی اِیتِر بیدار شود و پورتال خروجی فعال گردد!';
    } else {
      fallbackText = `در مرحله ${stageId} از ماجراجویی زیبایتان: ابتدا کتیبه ورودی را مطالعه کنید. یکی از شما دو نفر باید روی دکمه فشاری کف زمین (Pressure Plate) بایستد تا دروازه عبور هم‌تیمی‌اش باز شود. پارتنر شما عبور کرده و اهرم (Lever) سمت دیگر را فعال می‌کند تا در برای همیشه باز بماند. سپس هر دو هم‌زمان روی پدهای خروجی بایستید!`;
    }

    return res.json({
      success: true,
      text: fallbackText,
      source: 'offline-oracle',
      stageId,
      geminiError: geminiErrorMsg || undefined,
    });
  } catch (err: any) {
    console.error('Error generating Gemini guidance:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'خطا در ارتباط با بلور جمینای',
      text: 'حسن و نیوشای دوست‌داشتنی و باانرژی! حواستون به هماهنگی و مکمل بودن قدرت‌هاتون باشه: نیوشا صاعقه و حسن سپر!',
    });
  }
});

// WebSocket Server (supports /ws, /api/ws, and root / for Cloudflare Worker reverse proxies)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  const pathname = url.split('?')[0];

  if (pathname === '/ws' || pathname === '/api/ws' || pathname === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(room: RoomRecord, msg: ServerMessage, excludeRole?: PlayerRole) {
  room.clients.forEach((client, role) => {
    if (role !== excludeRole && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let currentClient: ConnectedClient | null = null;

  ws.on('message', (rawData) => {
    try {
      const msg: ClientMessage = JSON.parse(rawData.toString());

      if (msg.type === 'ping_server') {
        send(ws, {
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        return;
      }

      if (msg.type === 'create_room') {
        const code = generateRoomCode();
        const role: PlayerRole = msg.preferredRole || 'explorer';
        const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;

        const roomData: RoomData = {
          code,
          stageId: 1,
          checkpointId: 0,
          players: {
            [role]: {
              id: clientId,
              name: msg.playerName || (role === 'explorer' ? 'Explorer' : 'Guardian'),
              ready: true,
              connected: true,
              pingMs: 0,
            },
          },
          puzzleState: createDefaultPuzzleState(1),
          status: 'waiting',
        };

        const roomRecord: RoomRecord = {
          data: roomData,
          clients: new Map(),
          voiceMembers: new Set(),
          lastActive: Date.now(),
        };

        currentClient = {
          ws,
          id: clientId,
          name: roomData.players[role]!.name,
          role,
          roomCode: code,
          lastSeen: Date.now(),
        };

        roomRecord.clients.set(role, currentClient);
        rooms.set(code, roomRecord);

        send(ws, {
          type: 'room_joined',
          room: roomData,
          assignedRole: role,
          yourId: clientId,
        });
        return;
      }

      if (msg.type === 'join_room') {
        const code = msg.code.toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          send(ws, { type: 'error', message: `Room ${code} not found. Check code or create a new room.` });
          return;
        }

        // Determine available role
        const preferred = msg.preferredRole;
        let assignedRole: PlayerRole;

        const explorerConnected = room.data.players.explorer?.connected;
        const guardianConnected = room.data.players.guardian?.connected;

        if (preferred && !room.data.players[preferred]?.connected) {
          assignedRole = preferred;
        } else if (!explorerConnected) {
          assignedRole = 'explorer';
        } else if (!guardianConnected) {
          assignedRole = 'guardian';
        } else {
          send(ws, { type: 'error', message: `Room ${code} is full (2/2 players connected).` });
          return;
        }

        const clientId = `p_${Math.random().toString(36).substring(2, 9)}`;
        const playerName = msg.playerName || (assignedRole === 'explorer' ? 'Explorer' : 'Guardian');

        room.data.players[assignedRole] = {
          id: clientId,
          name: playerName,
          ready: true,
          connected: true,
          pingMs: 0,
        };

        const bothConnected = !!(room.data.players.explorer?.connected && room.data.players.guardian?.connected);
        room.data.status = bothConnected ? 'ready' : 'waiting';
        room.lastActive = Date.now();

        currentClient = {
          ws,
          id: clientId,
          name: playerName,
          role: assignedRole,
          roomCode: code,
          lastSeen: Date.now(),
        };

        room.clients.set(assignedRole, currentClient);

        // Send room state to joining player
        send(ws, {
          type: 'room_joined',
          room: room.data,
          assignedRole,
          yourId: clientId,
        });

        // Notify other player
        broadcastToRoom(room, {
          type: 'player_joined',
          role: assignedRole,
          name: playerName,
        }, assignedRole);
        return;
      }

      // Beyond join/create, client must be in a room
      if (!currentClient) return;
      const room = rooms.get(currentClient.roomCode);
      if (!room) return;
      room.lastActive = Date.now();

      if (msg.type === 'player_update') {
        const fullState: PlayerNetState = {
          id: currentClient.id,
          name: currentClient.name,
          role: currentClient.role,
          x: msg.state.x,
          y: msg.state.y,
          z: msg.state.z,
          rotY: msg.state.rotY,
          anim: msg.state.anim,
          abilityActive: msg.state.abilityActive,
          isGrounded: msg.state.isGrounded,
          timestamp: Date.now(),
        };

        // Forward to partner immediately for 60Hz real-time sync
        broadcastToRoom(room, {
          type: 'partner_update',
          state: fullState,
        }, currentClient.role);
        return;
      }

      if (msg.type === 'puzzle_trigger') {
        // Authoritative update of puzzle state
        const { key, value } = msg;
        if (!room.data.puzzleState) {
          room.data.puzzleState = createDefaultPuzzleState(room.data.stageId || 1);
        }
        if (!room.data.puzzleState.customData) {
          room.data.puzzleState.customData = {};
        }

        if (key === 'customData') {
          room.data.puzzleState.customData = {
            ...room.data.puzzleState.customData,
            ...value,
          };
        } else if (key in room.data.puzzleState && key !== 'customData') {
          (room.data.puzzleState as any)[key] = value;
        } else {
          room.data.puzzleState.customData[key] = value;
        }

        // Broadcast to all clients in the room
        broadcastToRoom(room, {
          type: 'puzzle_synced',
          puzzleState: room.data.puzzleState,
        });
        return;
      }

      if (msg.type === 'emote') {
        broadcastToRoom(room, {
          type: 'emote_triggered',
          data: {
            role: currentClient.role,
            emote: msg.emote,
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (msg.type === 'ping') {
        broadcastToRoom(room, {
          type: 'ping_triggered',
          data: {
            id: `ping_${Date.now()}`,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            senderRole: currentClient.role,
            senderName: currentClient.name,
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (msg.type === 'checkpoint_reach') {
        if (msg.checkpointId > room.data.checkpointId) {
          room.data.checkpointId = msg.checkpointId;
          room.data.puzzleState.checkpointId = msg.checkpointId;
          broadcastToRoom(room, {
            type: 'checkpoint_updated',
            checkpointId: msg.checkpointId,
            respawnPos: [0, 1, 0],
          });
        }
        return;
      }

      if (msg.type === 'stage_advance') {
        room.data.stageId = msg.nextStageId;
        room.data.checkpointId = 0;
        room.data.puzzleState = createDefaultPuzzleState(msg.nextStageId);
        room.data.status = 'playing';
        broadcastToRoom(room, {
          type: 'stage_changed',
          stageId: msg.nextStageId,
        });
        return;
      }

      if (msg.type === 'voice_join' || (msg as any).type === 'voice:join') {
        room.voiceMembers.add(currentClient.id);

        // Build list of active voice participants
        const activeMembers: Array<{ id: string; name: string; role?: PlayerRole }> = [];
        room.voiceMembers.forEach((memberId) => {
          for (const [r, c] of room.clients.entries()) {
            if (c.id === memberId) {
              activeMembers.push({ id: memberId, name: c.name, role: r });
            }
          }
        });

        // Send existing members to the joining client
        send(ws, {
          type: 'voice_existing_members',
          members: activeMembers,
        });

        // Notify other clients that user joined voice
        broadcastToRoom(
          room,
          {
            type: 'voice_user_joined',
            userId: currentClient.id,
            name: currentClient.name,
            role: currentClient.role,
          },
          currentClient.role
        );
        return;
      }

      if (msg.type === 'voice_signal' || (msg as any).type === 'voice:signal') {
        const toId = (msg as any).to;
        const signal = (msg as any).signal;
        const signalType = (msg as any).signalType || (msg as any).type;

        if (toId) {
          // Send to specific recipient
          for (const c of room.clients.values()) {
            if (c.id === toId && c.ws.readyState === WebSocket.OPEN) {
              send(c.ws, {
                type: 'voice_signal',
                from: currentClient.id,
                signal,
                signalType,
              });
              break;
            }
          }
        } else {
          // Broadcast to everyone else in room
          broadcastToRoom(
            room,
            {
              type: 'voice_signal',
              from: currentClient.id,
              signal,
              signalType,
            },
            currentClient.role
          );
        }
        return;
      }

      if (msg.type === 'voice_speaking' || (msg as any).type === 'voice:speaking') {
        broadcastToRoom(
          room,
          {
            type: 'voice_speaking',
            userId: currentClient.id,
            isSpeaking: !!(msg as any).isSpeaking,
          },
          currentClient.role
        );
        return;
      }

      if (msg.type === 'voice_leave' || (msg as any).type === 'voice:leave') {
        room.voiceMembers.delete(currentClient.id);
        broadcastToRoom(
          room,
          {
            type: 'voice_user_left',
            userId: currentClient.id,
          },
          currentClient.role
        );
        return;
      }

      if (msg.type === 'leave_room') {
        handleClientDisconnect(currentClient);
        currentClient = null;
        return;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  function handleClientDisconnect(client: ConnectedClient) {
    const room = rooms.get(client.roomCode);
    if (!room) return;

    if (room.voiceMembers.has(client.id)) {
      room.voiceMembers.delete(client.id);
      broadcastToRoom(room, {
        type: 'voice_user_left',
        userId: client.id,
      }, client.role);
    }

    room.clients.delete(client.role);
    if (room.data.players[client.role]) {
      room.data.players[client.role]!.connected = false;
    }
    room.data.status = 'waiting';

    broadcastToRoom(room, {
      type: 'player_disconnected',
      role: client.role,
    });

    // If both disconnected, clean up room after 10 minutes
    const anyConnected = Array.from(room.clients.values()).length > 0;
    if (!anyConnected) {
      setTimeout(() => {
        const checkRoom = rooms.get(client.roomCode);
        if (checkRoom && checkRoom.clients.size === 0) {
          rooms.delete(client.roomCode);
        }
      }, 10 * 60 * 1000);
    }
  }

  ws.on('close', () => {
    if (currentClient) {
      handleClientDisconnect(currentClient);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
  });
});

// Periodic room cleanup (empty rooms older than 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.clients.size === 0 && now - room.lastActive > 30 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);

// Setup Vite middleware for development or serve dist static in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether Duo Game Server running on port ${PORT}`);
  });
}

start();
