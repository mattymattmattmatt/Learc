// save.js ─────────────────────────────────────────────────────
import { db } from './main.js';          // path may vary
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Default structure for a brand-new save file.
 * Extend as your game grows (add xp, items, etc.).
 */
function getDefaultSave(username) {
  return {
    username,
    level: 1,
    hero: null,          // chosen character (null until selected)
    hp: 3,
    inventory: [],
    branchFlags: {},     // choice flags for story branches
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

/**
 * Load a save or auto-create it if it doesn’t exist.
 * @param {string} username – plain text ID the player typed
 * @returns {Promise<Object>} save data
 */
export async function loadSave(username) {
  if (!username) throw new Error('Username required');

  const ref  = doc(db, 'saves', username.toLowerCase());
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  const fresh = getDefaultSave(username);
  await setDoc(ref, fresh);
  return fresh;
}

/**
 * Patch the player’s document with partial progress.
 * Example: saveProgress(name, { level: 4, hp: 2 });
 * @param {string} username
 * @param {Object} partialData – only the fields you’re changing
 */
export async function saveProgress(username, partialData = {}) {
  const ref = doc(db, 'saves', username.toLowerCase());
  await updateDoc(ref, {
    ...partialData,
    updatedAt: serverTimestamp()
  });
}

/**
 * Wipe and re-initialise a save slot (used for “Start Over”).
 * @param {string} username
 */
export async function resetSave(username) {
  const ref = doc(db, 'saves', username.toLowerCase());
  const fresh = getDefaultSave(username);
  await setDoc(ref, fresh, { merge: false });
  return fresh;
}
