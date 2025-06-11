// core Firebase SDKs  ─────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';   // ← you'll need this soon

// Your project’s config (copy verbatim from console settings)
const firebaseConfig = {
  apiKey: 'AIzaSyDrpVCxtvo2E8Ck59vQ5IbVxk77LCLuolo',
  authDomain: 'learc-82951.firebaseapp.com',
  projectId: 'learc-82951',
  storageBucket: 'learc-82951.appspot.com',   // <- corrected suffix
  messagingSenderId: '134288189486',
  appId: '1:134288189486:web:0594ffc1310646e7c697bf'
};

// boot Firebase once ─────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);   // will use later for saves

// sign the player in anonymously, then run the game loader
signInAnonymously(auth)
  .catch(err => console.error('Anon sign-in failed:', err));

onAuthStateChanged(auth, user => {
  if (user) {
    console.log('Signed in as UID', user.uid);
    // TODO: load or create /saves/{username}
  }
});
