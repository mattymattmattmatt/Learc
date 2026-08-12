#!/usr/bin/env node
// ============================================================
// Battle of the Realm — one-shot SFX via the ElevenLabs
// sound-generation endpoint.
//
//   node tools/generate-sfx.js              # only cues missing from disk
//   node tools/generate-sfx.js --force      # regenerate everything
//   node tools/generate-sfx.js hit win go   # named cues only
//   node tools/generate-sfx.js --no-trim    # keep the raw takes
//
// Output lands in assets/audio/sfx/<name>.mp3 and the name is added to
// assets/audio/sfx/manifest.json. The game reads that manifest and plays a
// cue's sample the moment it appears, falling back to the built-in WebAudio
// synth until then — so cues can be generated in any order, and a cue you
// never generate simply keeps its synth voice.
//
// No dependencies: the key is read from the environment or from a gitignored
// .env / elevenlabs.env in the repo root.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets/audio/sfx');
const MANIFEST = path.join(OUT, 'manifest.json');

// The catalogue is shared with tools/trim-sfx.sh so the per-cue length
// ceilings can't drift apart. Each entry is { cap (seconds), prompt }.
const SOUNDS = require('./sfx-cues.json');
delete SOUNDS._comment;

// ── the key ────────────────────────────────────────────────────
// env first, then the gitignored dotenv files (same key name Balitopia uses)
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
  console.error('   (or export it in your shell).');
  process.exit(1);
}

// ── HTTP ───────────────────────────────────────────────────────
function generate(name, cue) {
  const payload = JSON.stringify({
    text: cue.prompt,
    // Ask for about the length we intend to keep: request a long clip and the
    // endpoint packs it with several takes of the effect separated by silence.
    duration_seconds: Math.max(0.5, Math.min(22, Number(cue.cap.toFixed(1)))),
    prompt_influence: 0.4,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/sound-generation',
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 120000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode !== 200) {
          return reject(new Error(`${res.statusCode} ${body.toString().slice(0, 300)}`));
        }
        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(path.join(OUT, `${name}.mp3`), body);
        resolve(body.length);
      });
    });
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── manifest ───────────────────────────────────────────────────
// The game only asks for cues named here, so a cue you haven't generated never
// 404s in the console. Rebuilt from whatever is actually on disk.
function writeManifest() {
  const present = Object.keys(SOUNDS)
    .filter((n) => fs.existsSync(path.join(OUT, `${n}.mp3`)))
    .sort();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(present, null, 2) + '\n');
  return present;
}

// The endpoint pads a request out with several takes separated by silence, and
// often opens with lead-in silence, so a raw cue is both far too long and slow
// to start. tools/trim-sfx.sh keeps take one and normalises it; without ffmpeg
// we ship the raw take and say so.
function trim(names) {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    console.log('\n⚠️  ffmpeg not found — skipping the trim pass.');
    console.log('   The raw takes play, but each is padded with extra takes and silence.');
    console.log('   Install ffmpeg, then run: tools/trim-sfx.sh');
    return;
  }
  console.log('\n✂️  Trimming to the first take…');
  spawnSync('bash', [path.join(__dirname, 'trim-sfx.sh'), ...names], { stdio: 'inherit' });
}

// ── main ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const noTrim = args.includes('--no-trim');
  const only = args.filter((a) => !a.startsWith('--'));

  const unknown = only.filter((n) => !SOUNDS[n]);
  if (unknown.length) {
    console.error(`❌ Unknown cue(s): ${unknown.join(', ')}`);
    console.error(`   Known: ${Object.keys(SOUNDS).join(', ')}`);
    process.exit(1);
  }

  let names = only.length ? only : Object.keys(SOUNDS);
  if (!force) {
    // credits are finite — never re-buy a cue that is already on disk
    const before = names.length;
    names = names.filter((n) => !fs.existsSync(path.join(OUT, `${n}.mp3`)));
    const skipped = before - names.length;
    if (skipped) console.log(`· ${skipped} cue(s) already on disk, skipped (--force to regenerate)`);
  }

  if (!names.length) {
    console.log('Nothing to generate.');
    writeManifest();
    return;
  }

  console.log(`🔊 Generating ${names.length} sound effect(s)…\n`);
  const made = [];
  const failed = [];
  for (const name of names) {
    try {
      const bytes = await generate(name, SOUNDS[name]);
      console.log(`✓ ${name}.mp3  (${(bytes / 1024).toFixed(0)} KB)`);
      made.push(name);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
      failed.push(name);
    }
    await new Promise((r) => setTimeout(r, 150));   // be gentle on the endpoint
  }

  if (made.length && !noTrim) trim(made);

  const present = writeManifest();
  console.log(`\n✅ ${made.length}/${names.length} generated · manifest lists ${present.length} cue(s)`);
  if (failed.length) {
    console.log(`❌ failed: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
