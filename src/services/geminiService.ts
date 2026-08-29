/**
 * Gemini Voice Guidance Service for Aether Duo
 * Supports local container Express API and remote Cloudflare Worker proxy
 */

import { networkClient } from '../multiplayer/networkClient.ts';
import type { PlayerRole, PuzzleState } from '../types.ts';

export interface GeminiGuidanceRequest {
  stageId: number;
  role?: PlayerRole;
  playerRole?: PlayerRole;
  puzzleState: PuzzleState;
  query?: string;
  customQuestion?: string;
  playerName?: string;
  partnerName?: string;
  distance?: number;
  partnerDistance?: number;
}

export interface GeminiGuidanceResponse {
  success: boolean;
  text: string;
  source: string;
  stageId?: number;
  note?: string;
  error?: string;
}

export interface GeminiStatusResponse {
  available: boolean;
  model: string;
  host: string;
  message: string;
}

/**
 * Returns the effective HTTP API base URL for REST calls:
 * - If a custom worker (like wss://my-worker.workers.dev/ws) is set, converts it to https://my-worker.workers.dev
 * - Otherwise returns the current origin or relative path
 */
export function getEffectiveApiBaseUrl(): string {
  // Check if a dedicated custom Gemini Worker URL is stored
  const customGeminiUrl = localStorage.getItem('gemini_custom_worker_url');
  if (customGeminiUrl && customGeminiUrl.trim()) {
    let url = customGeminiUrl.trim();
    if (url.startsWith('wss://')) {
      url = 'https://' + url.substring(6);
    } else if (url.startsWith('ws://')) {
      url = 'http://' + url.substring(5);
    }
    return url.replace(/\/+$/, '');
  }

  const workerConfig = networkClient.getWorkerConfig();
  if (workerConfig.isCustom && workerConfig.url) {
    let url = workerConfig.url.trim();
    if (url.startsWith('wss://')) {
      url = 'https://' + url.substring(6);
    } else if (url.startsWith('ws://')) {
      url = 'http://' + url.substring(5);
    }
    url = url.replace(/\/ws\/?$/, '').replace(/\/api\/ws\/?$/, '').replace(/\/+$/, '');
    return url;
  }
  return '';
}

/**
 * Check Gemini API connectivity and configuration status
 */
export async function checkGeminiStatus(): Promise<GeminiStatusResponse> {
  const baseUrl = getEffectiveApiBaseUrl();
  const endpoint = `${baseUrl}/api/gemini/status`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }

    if (res.ok && !contentType.includes('application/json')) {
      return {
        available: false,
        model: 'offline',
        host: baseUrl ? 'cloudflare-worker' : 'local',
        message: 'آدرس واردشده صفحه HTML بازگرداند. لطفاً مطمئن شوید آدرس API درست است.',
      };
    }

    return {
      available: false,
      model: 'unknown',
      host: baseUrl ? 'cloudflare-worker' : 'local',
      message: `سرور وضعیت ${res.status} را بازگرداند.`,
    };
  } catch (err: any) {
    return {
      available: false,
      model: 'offline',
      host: 'local',
      message: err.message?.includes('JSON')
        ? 'پاسخ سرور فرمت JSON نداشت (صفحه HTML دریافت شد).'
        : (err.message || 'خطا در برقراری ارتباط با سرور'),
    };
  }
}

/**
 * Fetch stage guidance or answers from Gemini AI (Master Elias)
 */
export async function requestGeminiGuidance(
  params: GeminiGuidanceRequest
): Promise<GeminiGuidanceResponse> {
  const baseUrl = getEffectiveApiBaseUrl();
  const endpoint = `${baseUrl}/api/gemini/guidance`;

  try {
    const payload = {
      stageId: params.stageId,
      role: params.role || params.playerRole || 'explorer',
      puzzleState: params.puzzleState,
      query: params.query || params.customQuestion || '',
      playerName: params.playerName,
      partnerName: params.partnerName,
      distance: params.distance ?? params.partnerDistance ?? 0,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }

    // Fallback if HTTP call fails
    return getOfflineFallbackGuidance(params.stageId, params.puzzleState);
  } catch (err: any) {
    console.warn('Gemini request failed, activating offline mentor oracle:', err);
    return getOfflineFallbackGuidance(params.stageId, params.puzzleState);
  }
}

/**
 * Instant offline mentor advice in case of offline play or network disruption
 */
function getOfflineFallbackGuidance(stageId: number, pState: PuzzleState): GeminiGuidanceResponse {
  let text = '';
  if (stageId === 1) {
    if (!pState.lever1Activated) {
      if (!pState.gate1Open) {
        text = 'حسن و نیوشا عزیزم! یکی از شما باید روی دکمه فشاری بزرگ بایستد تا دروازه باز بماند و نفر دوم بتواند از آن عبور کند!';
      } else {
        text = 'دروازه باز شد! بازیکنی که عبور کرده باید سریعاً اهرم سمت دیگر را با کلید [E] بکشد تا در برای همیشه باز بماند و پارتنرش هم بتواند بیاید!';
      }
    } else {
      text = 'آفرین به این همکاری عالی! دروازه برای همیشه باز شد؛ حالا هر دو به سمت سکوهای خروجی پورتال در انتهای مسیر بروید و هم‌زمان روی آن‌ها بایستید!';
    }
  } else if (stageId === 2) {
    const isP1Active = !!pState.floatingIslandBridgeActive || !!pState.customData?.stage2Platform1Active;
    const isLeverA = !!pState.laserTurretDisabled || !!pState.customData?.stage2LeverA;
    const isLeverB = !!pState.vortexActivated || !!pState.customData?.stage2LeverB;

    if (!isP1Active) {
      text = 'حسن و نیوشا عزیزم! برای عبور از شکاف اول دره، اهرم کنار لبه را با [E] بکشید تا سکوی متحرک اول فراخوانده شود و هر دو سوار آن شوید!';
    } else if (!isLeverA) {
      text = 'به سکوی میانی رسیدید! حالا یکی از شما وارد مسیر A و دیگری مسیر B شود. بازیکنی که به انتهای مسیر A می‌رسد باید اهرم [E] را بکشد تا بالابر به سمت هم‌تیمی‌اش در مسیر B حرکت کند!';
    } else if (!isLeverB) {
      text = 'بالابر در مسیر B فعال شد! بازیکن مسیر B سوار بالابر شود و بالا برود، سپس اهرم بالای برج را با [E] بکشد تا پل چوبی مسیر A برای هم‌تیمی‌اش باز شود!';
    } else {
      text = 'عالی بود! پل مسیر A باز شد و هر دو می‌توانید عبور کنید؛ در انتهای پل چوبی به سمت پورتال بروید و هم‌زمان روی سکوهای خروج بایستید!';
    }
  } else if (stageId === 3) {
    if (!pState.boilerValve1 || !pState.boilerValve2) {
      text = 'اینجا قلب ساعت اعظم و کوره بخار است! ابتدا جعبه برنجی را زیر پیستون کوبنده مهار کنید، سپس با پله‌ها بالا بروید و هر دو شیر بخار را با کلید [E] بچرخانید تا پورتال باز شود!';
    } else {
      text = 'فشار کوره تنظیم شد و پورتال باز شد! هر دو به سمت پورتال مرکزی بشتابید!';
    }
  } else if (stageId === 4) {
    if (!pState.prism1Aligned) {
      text = 'مراقب پرتوهای چرخان کف معبد باشید! نیوشا، ابتدا به سمت چپ برو و منشور نوری ۱ را با [E] تنظیم کن تا پل نوری خورشید روی ورطه گسترش یابد!';
    } else if (!pState.solarConduitActive) {
      text = 'پل نوری فعال شد! حسن، مکعب بلورین خورشید را با [E] به روی هادی انرژی (صفحه دایره‌ای زرد) منتقل کن تا برج منشور ۲ شارژ شود!';
    } else if (!pState.prism2Aligned) {
      text = 'برج شارژ شد! حالا منشور نوری ۲ را با [E] به سمت هسته اعظم خورشید بچرخانید تا سکوهای معلق پرنده بیدار شوند!';
    } else if (!pState.solarResonator1 || !pState.solarResonator2) {
      text = 'سکوهای خورشید به حرکت درآمدند! با پرش روی سکوهای پرنده از ورطه عبور کنید و هر دو هم‌زمان رزوناتورهای ۱ و ۲ را با [E] لمس کنید تا در بزرگ معبد باز شود!';
    } else {
      text = 'دروازه معبد خورشید گشوده شد! هر دو هم‌زمان روی درگاه‌های خروجی انتهای محراب قرار بگیرید!';
    }
  } else {
    text = 'تمرکز و هماهنگی داشته باشید! با پارتنر خود صحبت کنید، کتیبه‌های مسیر را بخوانید و موانع را با همکاری یکدیگر پشت سر بگذارید!';
  }

  return {
    success: true,
    text,
    source: 'offline-mentor-oracle',
    stageId,
  };
}
