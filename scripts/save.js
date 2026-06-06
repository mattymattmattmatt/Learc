// save.js — optional Firebase cloud save (best-effort)
// ----------------------------------------------------------------
// The game's source of truth is localStorage (see state.js). This
// module mirrors saves to Firestore when available, but every export
// fails soft: if Firebase is misconfigured, offline, or the user is
// not yet authenticated, these resolve quietly instead of throwing.

let _db = null;
let _fs = null;

async function ready() {
  if (_db && _fs) return true;
  try {
    const main = await import('./main.js');
    _db = main.db;
    _fs = await import('firebase/firestore');
    return !!_db;
  } catch {
    return false;
  }
}

/**
 * Mirror a save snapshot to Firestore. Never throws.
 * @param {string} username
 * @param {Object} data full save snapshot
 */
export async function saveProgress(username, data = {}) {
  if (!username) return;
  if (!(await ready())) return;
  try {
    const ref = _fs.doc(_db, 'saves', username.toLowerCase());
    await _fs.setDoc(ref, { ...data, updatedAt: _fs.serverTimestamp() }, { merge: true });
  } catch { /* ignore cloud failures */ }
}

/**
 * Load a save snapshot from Firestore, or null. Never throws.
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
export async function loadSave(username) {
  if (!username) return null;
  if (!(await ready())) return null;
  try {
    const ref  = _fs.doc(_db, 'saves', username.toLowerCase());
    const snap = await _fs.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
