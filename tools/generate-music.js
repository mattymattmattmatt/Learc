#!/usr/bin/env node
// ============================================================
// Battle of the Realm — music via the ElevenLabs Music API.
// SFX live in generate-sfx.js; this script never touches them.
//
//   node tools/generate-music.js               # only missing tracks
//   node tools/generate-music.js --force       # regenerate everything
//   node tools/generate-music.js ending        # named tracks only
//
// Output lands in assets/Music/<name>.mp3, alongside the existing per-champion
// themes. The game calls each of these with a fallback to a track that already
// ships, so a track you haven't generated yet is never a silent screen.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets/Music');

// ── the key ────────────────────────────────────────────────────
function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  for (const f of ['.env', 'elevenlabs.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return null;
}

const API_KEY = readKey();
if (!API_KEY) {
  console.error('❌ No ELEVENLABS_API_KEY found.');
  console.error('   Put it in a gitignored .env at the repo root:');
  console.error('     ELEVENLABS_API_KEY=sk_...');
  process.exit(1);
}

// ── the tracks ─────────────────────────────────────────────────
// The 24 champion themes, the three region themes and title/captured/victory
// already ship. These are the screens that had no music of their own.
//
// Anything that plays under a screen for minutes is written as a *loop*: a
// track with a big intro or a hard ending draws attention to the seam every
// time it wraps. The one-shot cues say so explicitly instead.
const STYLE = 'warm storybook adventure game music, live-sounding orchestral-lite instrumentation with playful woodwinds, plucked strings, marimba and light hand percussion, no vocals';

const TRACKS = {
  ending: {
    ms: 75000,
    fallback: 'victory.mp3',
    prompt: `Finale and end-credits theme for a heartfelt creature adventure — an evil king's spell has just shattered and every creature in the realm wakes at once. ${STYLE}. Begins tender and awed, swells into a soaring triumphant major-key hymn with full strings and horns, then settles into a warm contented outro. Emotional, hopeful, tears-of-joy. Seamless loop — it plays under a credits screen.`,
  },
  mysterybox: {
    ms: 45000,
    fallback: 'title.mp3',
    prompt: `Treasure-collection screen loop for a children's adventure game. ${STYLE}. Light, curious and twinkly, mid-tempo around 100 BPM, pizzicato strings and glockenspiel over a gently bouncing bassline, the feeling of unwrapping a present. Cosy and unhurried, never urgent. Seamless loop.`,
  },
  gauntlet: {
    ms: 60000,
    fallback: 'title.mp3',
    prompt: `Endless-mode arena loop — friendly duels against an unbroken line of champions. ${STYLE}. Driving 138 BPM, relentless propulsive groove with tribal drums and a confident brass-and-marimba riff, exciting and sporting rather than menacing, keeps its energy up across many repeats. Seamless loop.`,
  },
};

// The API has moved around; try the documented shape first and fall back
// through the older ones so a rename doesn't cost another round trip.
const ATTEMPTS = [
  { path: '/v1/music', body: (t) => ({ prompt: t.prompt, music_length_ms: t.ms }) },
  { path: '/v1/music/compose', body: (t) => ({ prompt: t.prompt, music_length_ms: t.ms }) },
  { path: '/v1/music-generation', body: (t) => ({ prompt: t.prompt, music_length_ms: t.ms }) },
];

function post(apiPath, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload));
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: apiPath,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
      timeout: 300000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Remembered across tracks: once one endpoint answers, stop probing.
let liveEndpoint = null;

async function generate(name, track) {
  const candidates = liveEndpoint ? [liveEndpoint] : ATTEMPTS;
  let lastErr = '';
  for (const attempt of candidates) {
    const res = await post(attempt.path, attempt.body(track));
    if (res.status === 200) {
      liveEndpoint = attempt;
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `${name}.mp3`), res.body);
      console.log(`✓ ${name}.mp3  (${(res.body.length / 1024).toFixed(0)} KB, ${(track.ms / 1000).toFixed(0)}s)`);
      return;
    }
    lastErr = `${res.status} ${res.body.toString().slice(0, 300)}`;
    // 404 means wrong URL — keep probing. Anything else is a real answer from
    // the right endpoint, so stop and report it.
    if (res.status !== 404) { liveEndpoint = attempt; break; }
  }
  throw new Error(lastErr);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter((a) => !a.startsWith('--'));

  const unknown = only.filter((n) => !TRACKS[n]);
  if (unknown.length) {
    console.error(`❌ Unknown track(s): ${unknown.join(', ')}`);
    console.error(`   Known: ${Object.keys(TRACKS).join(', ')}`);
    process.exit(1);
  }

  let names = only.length ? only : Object.keys(TRACKS);
  if (!force) {
    names = names.filter((n) => !fs.existsSync(path.join(OUT, `${n}.mp3`)));
    if (!names.length) {
      console.log('All music already present. Use --force to regenerate.');
      return;
    }
  }

  console.log(`🎵 Generating ${names.length} music track(s)…\n`);
  const failed = [];
  for (const name of names) {
    try {
      await generate(name, TRACKS[name]);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
      failed.push(name);
    }
  }

  console.log(`\n✅ ${names.length - failed.length}/${names.length} generated`);
  if (failed.length) {
    console.log(`❌ failed: ${failed.join(', ')}`);
    console.log('   (a 422 on music_length_ms means the account caps track length —');
    console.log('    lower `ms` for that track in this file and re-run.)');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
