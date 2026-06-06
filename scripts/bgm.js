/* bgm.js — background-music + SFX manager
   Every track is optional: if an audio file is missing or autoplay is
   blocked, playback fails silently and the game continues. */

let current = null;
let currentId = null;

export async function playBGM(id) {
  if (currentId === id && current) return;     // already playing this track
  stopBGM();
  currentId = id;
  const audio = new Audio(`assets/audio/bgm_${id}.mp3`);
  audio.loop = true;
  audio.volume = 0.6;
  audio.addEventListener('error', () => { /* missing track — ignore */ });
  current = audio;
  try { await audio.play(); } catch { /* needs user gesture — ignore */ }
}

export function stopBGM() {
  try { current?.pause(); } catch {}
  current = null;
  currentId = null;
}

/* One-shot sound effect (e.g. pet entrance). Fire-and-forget. */
export function playSfx(src, volume = 0.8) {
  try {
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}
