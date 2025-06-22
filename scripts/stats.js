/* stats.js  – central runtime counters
   Keeps gold %, heat, consecutiveBad in memory
   (Optionally call saveProgress() if you want persistence) */

let goldPercent      = 0;   // 0–100
let heatLevel        = 0;   // 0+
let consecutiveBad   = 0;   // 0+

// ───── basic mutators ───────────────────────────────────
export function addGold(p) {          // p = 1 or 3
  goldPercent = Math.min(100, goldPercent + p);
  notify();
}
export function addHeat(val) {
  heatLevel += val;
  notify();
}
export function resetBad() {
  consecutiveBad = 0;
  notify();
}
export function incBad() {
  consecutiveBad += 1;
  notify();
}

// ───── getters (optional) ───────────────────────────────
export function getStats() {
  return { goldPercent, heatLevel, consecutiveBad };
}

/* placeholder – hook into saveProgress() + UI bar later */
function notify() {
  // console.log('[STATS]', goldPercent, heatLevel, consecutiveBad);
}
