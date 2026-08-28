/**
 * Cross-browser Fullscreen Utilities
 */

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
  );
}

export async function enterFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = element || document.documentElement;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
      return true;
    } else if ((target as any).mozRequestFullScreen) {
      await (target as any).mozRequestFullScreen();
      return true;
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request failed or was denied:', err);
  }
  return false;
}

export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
      return true;
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
      return true;
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
  }
  return false;
}

export async function toggleFullscreen(element?: HTMLElement): Promise<boolean> {
  if (isFullscreen()) {
    return exitFullscreen();
  } else {
    return enterFullscreen(element);
  }
}
