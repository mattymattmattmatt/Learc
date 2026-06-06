// main.js — optional Firebase bootstrap
// ----------------------------------------------------------------
// Firebase is OPTIONAL. The game runs fully on localStorage even if
// any of this fails (bad config, blocked network, etc.), so every
// step here is defensive and exports a possibly-null `db`/`auth`.

import { initializeApp }   from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore }    from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDrpVCxtvo2E8Ck59vQ5IbVxk77LCLuolo',
  authDomain: 'learc-82951.firebaseapp.com',
  projectId: 'learc-82951',
  storageBucket: 'learc-82951.appspot.com',
  messagingSenderId: '134288189486',
  appId: '1:134288189486:web:0594ffc1310646e7c697bf'
};

export let auth = null;
export let db   = null;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  // anonymous sign-in is fire-and-forget; cloud saves just won't
  // happen until/unless it succeeds.
  signInAnonymously(auth).catch(err =>
    console.warn('[firebase] anon sign-in unavailable:', err?.code || err));
} catch (err) {
  console.warn('[firebase] init skipped — running offline:', err?.message || err);
}
