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
    if (!pState.gate1Open) {
      text = 'نیوشا، حسن! ابتدا به گوشه سمت چپ باغ بروید و اهرم سنگی را بکشید تا دروازه باز شود. حسن، آماده باش مکعب سنگین را جابجا کنی!';
    } else if (!pState.heavyBlockPlaced) {
      text = 'حسن، نوبت قدرت بازوان بلوطیه! آن مکعب مغناطیسی بزرگ را به روی کلید فشاری قنات هل بده تا آب بالا بیاید و آسانسور نیوشا راه بیفتد!';
    } else if (!pState.lightBridgeActive) {
      text = 'نیوشا، حالا با آسانسور بالا برو و با دستکش صاعقه [کلید F] به پدستال آینه‌ای شلیک کن تا پل نوری متصل شود!';
    } else {
      text = 'عالی بود بچه‌ها! هر دو باهم از روی پل نورانی رد شوید و همزمان روی پدهای خروجی انتهای باغ بایستید!';
    }
  } else if (stageId === 2) {
    if (!pState.laserTurretDisabled) {
      text = 'حواستون باشه! برجک نگهبان لیزری شلیک می‌کند! حسن، فورا کلید [F] را بزن و سپر تایتان را بالا بیاور تا پرتو مرگبار به خود برجک بازتاب کند و خاموش شود!';
    } else {
      text = 'برجک خاموش شد! حالا نیوشا، با شلیک صاعقه [F] به توربین باد، جریان بالابرنده ابرها را فعال کن تا به سکوی خروج برسید!';
    }
  } else {
    if (!pState.grandClockworkEngaged) {
      text = 'اینجا قلب ساعت اعظم است! باید حسن و نیوشا همزمان شیرهای بخار ۱ و ۲ را بچرخانید، سپس نیوشا به ژنراتور اصلی صاعقه بزند تا چرخ‌دنده‌ها به کار بیفتند!';
    } else {
      text = 'چرخ‌دنده‌ها به کار افتادند! مسیر آزادی هموار شد، به سمت پورتال مرکزی بشتابید!';
    }
  }

  return {
    success: true,
    text,
    source: 'offline-mentor-oracle',
    stageId,
  };
}
