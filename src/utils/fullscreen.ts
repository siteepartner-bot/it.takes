import { useState, useEffect } from 'react';

export function toggleFullscreen() {
  if (typeof document === 'undefined') return;

  const doc = document as any;
  const docEl = document.documentElement as any;

  if (
    !doc.fullscreenElement &&
    !doc.mozFullScreenElement &&
    !doc.webkitFullscreenElement &&
    !doc.msFullscreenElement
  ) {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen().catch(() => {});
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen().catch(() => {});
    }
  } else {
    if (doc.exitFullscreen) {
      doc.exitFullscreen().catch(() => {});
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen().catch(() => {});
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen().catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen().catch(() => {});
    }
  }
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleFC = () => {
      const doc = document as any;
      setIsFullscreen(
        !!(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFC);
    document.addEventListener('webkitfullscreenchange', handleFC);
    document.addEventListener('mozfullscreenchange', handleFC);
    document.addEventListener('MSFullscreenChange', handleFC);

    return () => {
      document.removeEventListener('fullscreenchange', handleFC);
      document.removeEventListener('webkitfullscreenchange', handleFC);
      document.removeEventListener('mozfullscreenchange', handleFC);
      document.removeEventListener('MSFullscreenChange', handleFC);
    };
  }, []);

  return { isFullscreen, toggleFullscreen };
}
