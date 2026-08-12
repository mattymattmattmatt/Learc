#!/usr/bin/env node
// ============================================================
// Battle of the Realm — spoken story via the ElevenLabs text-to-speech API.
//
//   node tools/generate-voice.js --list        # voices available in your account
//   node tools/generate-voice.js --lines       # every line that would be spoken
//   node tools/generate-voice.js               # generate anything missing
//   node tools/generate-voice.js --force       # re-record everything
//   node tools/generate-voice.js intro         # just this block (or one line id)
//   node tools/generate-voice.js --design      # try to build the voices from
//                                              # the descriptions in voice-cast.json
//
// The lines are read out of scripts/battle/data.js, so the narration can never
// drift from the text on screen. Output goes to assets/audio/voice/<id>.mp3 and
// the id is added to that folder's manifest; the game plays a line's audio the
// moment it appears and stays silent for lines that don't have any.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const { requireKey } = require('./eleven-key');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets/audio/voice');
const MANIFEST = path.join(OUT, 'manifest.json');
const CAST = require('./voice-cast.json');

// Loaded on first request, not at startup: --lines just prints the script and
// has no business demanding an API key.
let API_KEY = null;
function key() {
  if (API_KEY) return API_KEY;
  try { API_KEY = requireKey().key; }
  catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
  return API_KEY;
}

// ── the script ─────────────────────────────────────────────────
// Read the story from the game itself rather than keeping a second copy here.
// data.js is a browser module with no imports and no top-level side effects, so
// stripping `export` and evaluating it gives us the same constants the game uses.
function storyLines() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/battle/data.js'), 'utf8')
    .replace(/^export /gm, '');
  const d = new Function(src + '\nreturn { INTRO, GLOB_INTRO, GLOB_DEFEAT, BOSSES, REGIONS };')();

  const lines = [];
  const add = (id, block, text) => lines.push({ id, block, text });

  d.INTRO.forEach((t, i) => add(`intro_${i}`, 'intro', t));
  d.GLOB_INTRO.forEach((t, i) => add(`glob_intro_${i}`, 'glob_intro', t));
  d.GLOB_DEFEAT.forEach((t, i) => add(`glob_defeat_${i}`, 'glob_defeat', t));
  // dialogue() asks for `<block>_<line index>`, and a one-line block is still
  // index 0 — so these carry the suffix too rather than being a special case.
  for (const [id, b] of Object.entries(d.BOSSES)) {
    if (b.taunt) add(`${id}_taunt_0`, id, b.taunt);
    if (b.defeat) add(`${id}_defeat_0`, id, b.defeat);
  }
  d.REGIONS.forEach(r => add(`region_${r.key}`, 'region', r.blurb));
  return lines;
}

const speakerFor = (block) => {
  const name = CAST.casting[block];
  const sp = name && CAST.speakers[name];
  if (!sp) throw new Error(`no speaker cast for block "${block}"`);
  return { name, ...sp };
};

// ── HTTP ───────────────────────────────────────────────────────
function api(method, apiPath, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? Buffer.from(JSON.stringify(payload)) : null;
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: apiPath,
      method,
      headers: Object.assign(
        { 'xi-api-key': key() },
        body ? { 'Content-Type': 'application/json', 'Content-Length': body.length } : {}),
      timeout: 180000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error('timed out')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const explain = (res) => {
  try {
    const d = JSON.parse(res.body.toString()).detail;
    if (typeof d === 'string') return d;
    if (d && d.message) return `${d.status || ''} ${d.message}`.trim();
  } catch {}
  return res.body.toString().slice(0, 200);
};

// ── voices ─────────────────────────────────────────────────────
let voiceCache = null;
async function allVoices() {
  if (voiceCache) return voiceCache;
  const res = await api('GET', '/v1/voices');
  if (res.status !== 200) throw new Error(`could not list voices: ${res.status} ${explain(res)}`);
  voiceCache = JSON.parse(res.body.toString()).voices || [];
  return voiceCache;
}

/* Pick a voice by ID or name. ElevenLabs ships the premade voices with a
   description welded onto the name — "George - Warm, Captivating Storyteller" —
   so an exact-match-only lookup rejects the very name the dashboard shows you.
   Match the leading name too, and only complain if that is ambiguous.
   Exported for testing; resolveVoice does the network part. */
const norm = s => String(s || '').toLowerCase().trim();
const leadName = v => norm(String(v.name || '').split(/\s+[-–—]\s+/)[0]);

function pickVoice(voices, spec) {
  const want = norm(spec);
  const byId = voices.find(v => v.voice_id === spec);
  if (byId) return { voice: byId };
  const exact = voices.find(v => norm(v.name) === want);
  if (exact) return { voice: exact };
  const lead = voices.filter(v => leadName(v) === want);
  if (lead.length === 1) return { voice: lead[0] };
  if (lead.length > 1) return { ambiguous: lead };
  const starts = voices.filter(v => norm(v.name).startsWith(want));
  if (starts.length === 1) return { voice: starts[0] };
  if (starts.length > 1) return { ambiguous: starts };
  return {};
}

async function resolveVoice(spec, speakerName) {
  if (!spec) {
    throw new Error(
      `no voice set for "${speakerName}" in tools/voice-cast.json.\n` +
      '   Run `node tools/generate-voice.js --list` and put an ID or name in its "voice" field.\n' +
      '   Or run with --design to build one from its description.');
  }
  const voices = await allVoices();
  const hit = pickVoice(voices, spec);
  if (hit.voice) return hit.voice.voice_id;
  if (hit.ambiguous) {
    throw new Error(
      `voice "${spec}" (cast as ${speakerName}) matches more than one voice:\n` +
      hit.ambiguous.map(v => `     ${v.name}`).join('\n') +
      '\n   Use the full name or the voice ID in tools/voice-cast.json.');
  }
  const names = voices.map(v => v.name).filter(Boolean).sort();
  throw new Error(
    `voice "${spec}" (cast as ${speakerName}) is not in your account.\n` +
    `   Available: ${names.join(', ') || '(none)'}\n` +
    '   Put one of those names, or a voice ID, in tools/voice-cast.json.');
}

// ── generate ───────────────────────────────────────────────────
async function speak(line, voiceId, speaker) {
  const res = await api('POST', `/v1/text-to-speech/${voiceId}`, {
    text: line.text,
    model_id: CAST.model_id,
    voice_settings: speaker.settings,
  });
  if (res.status !== 200) {
    const err = new Error(`${res.status} ${explain(res)}`);
    err.status = res.status;
    throw err;
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${line.id}.mp3`), res.body);
  return res.body.length;
}

function writeManifest(lines) {
  const present = lines.map(l => l.id).filter(id => fs.existsSync(path.join(OUT, `${id}.mp3`)));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(present, null, 2) + '\n');
  return present;
}

// Voice Design has moved around between API versions, so probe the documented
// shapes rather than assume one. If none answer, say so plainly — the same
// descriptions can be pasted into the Voice Design UI by hand.
async function design() {
  const attempts = [
    { preview: '/v1/text-to-voice/design', create: '/v1/text-to-voice' },
    { preview: '/v1/text-to-voice/create-previews', create: '/v1/text-to-voice/create-voice-from-preview' },
  ];
  const sample = 'Once upon a time, in the bright realm of Liitokala, the creatures sang the land awake.';
  let changed = false;

  for (const [name, sp] of Object.entries(CAST.speakers)) {
    if (sp.voice) { console.log(`· ${name}: already has a voice, skipped`); continue; }
    let made = null, lastErr = '';
    for (const a of attempts) {
      const res = await api('POST', a.preview, {
        voice_description: sp.description,
        text: sample,
        model_id: 'eleven_ttv_v3',
      });
      if (res.status === 404) { lastErr = '404'; continue; }
      if (res.status !== 200) { lastErr = `${res.status} ${explain(res)}`; break; }
      const previews = JSON.parse(res.body.toString()).previews || [];
      if (!previews.length) { lastErr = 'no previews returned'; break; }
      const create = await api('POST', a.create, {
        voice_name: `BotR ${name}`,
        voice_description: sp.description,
        generated_voice_id: previews[0].generated_voice_id,
      });
      if (create.status !== 200 && create.status !== 201) { lastErr = `${create.status} ${explain(create)}`; break; }
      made = JSON.parse(create.body.toString()).voice_id;
      break;
    }
    if (made) {
      sp.voice = made;
      changed = true;
      console.log(`✓ ${name}: designed voice ${made}`);
    } else {
      console.error(`✗ ${name}: ${lastErr || 'voice design unavailable'}`);
    }
  }

  if (changed) {
    fs.writeFileSync(path.join(__dirname, 'voice-cast.json'), JSON.stringify(CAST, null, 2) + '\n');
    console.log('\nSaved the new voice IDs into tools/voice-cast.json.');
  } else {
    console.log('\nNo voices were designed. Two options:');
    console.log('  · pick existing ones: node tools/generate-voice.js --list');
    console.log('  · or build them at https://elevenlabs.io/app/voice-lab using the');
    console.log('    descriptions in tools/voice-cast.json, then paste the IDs in.');
  }
}

// ── main ───────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter(a => !a.startsWith('--'));
  const lines = storyLines();

  if (args.includes('--lines')) {
    for (const l of lines) {
      console.log(`\n${l.id}  [${speakerFor(l.block).name}]`);
      console.log(`  ${l.text}`);
    }
    const chars = lines.reduce((n, l) => n + l.text.length, 0);
    console.log(`\n${lines.length} lines, ${chars} characters (text-to-speech is billed per character).`);
    return;
  }

  if (args.includes('--list')) {
    const voices = await allVoices();
    console.log(`${voices.length} voice(s) in your account:\n`);
    for (const v of voices) {
      const labels = Object.values(v.labels || {}).join(', ');
      console.log(`  ${(v.name || '(unnamed)').padEnd(24)} ${v.voice_id}${labels ? '   ' + labels : ''}`);
    }
    console.log('\nPut a name or ID into the "voice" field of each speaker in tools/voice-cast.json.');
    return;
  }

  if (args.includes('--design')) return design();

  let todo = only.length
    ? lines.filter(l => only.includes(l.id) || only.includes(l.block))
    : lines;
  if (only.length && !todo.length) {
    console.error(`❌ Nothing matches ${only.join(', ')}.`);
    console.error(`   Blocks: ${[...new Set(lines.map(l => l.block))].join(', ')}`);
    console.error('   Or use --lines to see every id.');
    process.exit(1);
  }
  if (!force) {
    const before = todo.length;
    todo = todo.filter(l => !fs.existsSync(path.join(OUT, `${l.id}.mp3`)));
    if (before - todo.length) console.log(`· ${before - todo.length} line(s) already recorded, skipped`);
  }
  if (!todo.length) { console.log('Nothing to record.'); writeManifest(lines); return; }

  // resolve every voice before spending anything
  const voiceIds = {};
  for (const block of new Set(todo.map(l => l.block))) {
    const sp = speakerFor(block);
    try { voiceIds[block] = await resolveVoice(sp.voice, sp.name); }
    catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
  }

  const chars = todo.reduce((n, l) => n + l.text.length, 0);
  console.log(`🎙  Recording ${todo.length} line(s), ${chars} characters…\n`);

  const failed = [];
  for (const l of todo) {
    const sp = speakerFor(l.block);
    try {
      const bytes = await speak(l, voiceIds[l.block], sp);
      console.log(`✓ ${l.id.padEnd(18)} ${sp.name.padEnd(9)} ${(bytes / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.error(`✗ ${l.id}: ${e.message}`);
      failed.push(l.id);
      if (e.status === 401 || e.status === 403) {
        console.error('\n⛔ The key was rejected for text-to-speech. Check that it has the');
        console.error('   Text to Speech permission at https://elevenlabs.io/app/settings/api-keys');
        console.error(`   Stopping — the other ${todo.length - failed.length} line(s) would fail the same way.`);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 120));
  }

  const present = writeManifest(lines);
  console.log(`\n✅ ${todo.length - failed.length}/${todo.length} recorded · manifest lists ${present.length} line(s)`);
  if (failed.length) { console.log(`❌ failed: ${failed.join(', ')}`); process.exitCode = 1; }
}

// Only run when invoked directly, so the matcher can be unit-tested.
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });

module.exports = { pickVoice };
