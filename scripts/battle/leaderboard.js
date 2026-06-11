/* leaderboard.js — optional Firebase high-score board (best-effort).
   The game runs fully offline; every export fails soft so a blocked
   network, bad config or locked Firestore rules never breaks play.
   Scores are also mirrored to localStorage so there's always a board. */

let db = null, authReady = Promise.resolve(), started = false;
const LOCAL = 'realm:scores';

async function init() {
  if (started) return; started = true;
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInAnonymously } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: 'AIzaSyDrpVCxtvo2E8Ck59vQ5IbVxk77LCLuolo',
      authDomain: 'learc-82951.firebaseapp.com',
      projectId: 'learc-82951',
      storageBucket: 'learc-82951.appspot.com',
      messagingSenderId: '134288189486',
      appId: '1:134288189486:web:0594ffc1310646e7c697bf'
    });
    db = getFirestore(app);
    authReady = signInAnonymously(getAuth(app)).catch(() => {});
  } catch (err) {
    console.warn('[leaderboard] cloud unavailable — local board only:', err?.message || err);
  }
}
init();   // fire-and-forget; not awaited at module top level

export const cloudEnabled = () => !!db;

function localBoard() { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]'); } catch { return []; } }
function saveLocal(list) { try { localStorage.setItem(LOCAL, JSON.stringify(list.slice(0, 50))); } catch {} }
function mergeLocal(entry) {
  const list = localBoard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score || (a.ms || 0) - (b.ms || 0));
  saveLocal(list);
}

/* Submit a completed run. Returns true if it reached the cloud. */
export async function submitScore(entry) {
  const e = { name: (entry.name || 'Hero').slice(0, 14), score: entry.score | 0, mode: entry.mode || 'normal', ms: Date.now() };
  mergeLocal(e);
  await init();
  if (!db) return false;
  try {
    await authReady;
    const fs = await import('firebase/firestore');
    await fs.addDoc(fs.collection(db, 'scores'), { ...e, ts: fs.serverTimestamp() });
    return true;
  } catch (err) { console.warn('[leaderboard] submit failed:', err?.message || err); return false; }
}

/* Top N scores for one board: 'adventure' (default) or 'gauntlet'.
   Both live in the same `scores` collection, told apart by `mode`;
   entries from before gauntlet existed have no mode → adventure.
   Falls back to the local board if the cloud is unreachable. */
export async function topScores(n = 10, board = 'adventure') {
  const isGauntlet = r => (r && r.mode) === 'gauntlet';
  const want = r => (board === 'gauntlet') ? isGauntlet(r) : !isGauntlet(r);
  await init();
  if (db) {
    try {
      await authReady;
      const fs = await import('firebase/firestore');
      const q = fs.query(fs.collection(db, 'scores'), fs.orderBy('score', 'desc'), fs.limit(60));
      const snap = await fs.getDocs(q);
      const rows = snap.docs.map(d => d.data()).filter(want).slice(0, n);
      return { rows, source: 'cloud' };
    } catch (err) { console.warn('[leaderboard] read failed:', err?.message || err); }
  }
  return { rows: localBoard().filter(want).slice(0, n), source: 'local' };
}
