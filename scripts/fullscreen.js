/* Fullscreen helper for Learc
   Call initFullscreen() once at startup.
   -------------------------------------- */

let fsUnlocked = false;      // becomes true after first user gesture

export function initFullscreen() {
  /* 1) attach to your existing first-button */
  document.addEventListener('click', firstGesture, { once: true });

  /* 2) auto-enter when device rotates to landscape after unlock  */
  window.addEventListener('orientationchange', () => {
    if (fsUnlocked &&
        screen.orientation?.type.startsWith('landscape') &&
        !document.fullscreenElement &&
        document.fullscreenEnabled) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });
}

/* Called the first time the user taps anything */
async function firstGesture() {
  if (document.fullscreenEnabled) {
    try { await document.documentElement.requestFullscreen(); }
    catch { /* user blocked it – keep going */ }
  }
  fsUnlocked = true;
}
