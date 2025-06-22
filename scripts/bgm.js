/* bgm.js  – simple background-music manager
   Call playBGM('intro') etc. from any scene. */

let current = null;

export async function playBGM(id) {
  const src = `assets/audio/bgm_${id}.mp3`;
  if (current?.src.endsWith(src)) return; // already playing

  // stop previous
  current?.pause();
  current = new Audio(src);
  current.loop   = true;
  current.volume = 0.7;   // global volume
  try { await current.play(); } catch { /* user gesture missing */ }
}

export function stopBGM() {
  current?.pause();
  current = null;
}
