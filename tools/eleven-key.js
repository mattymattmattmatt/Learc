#!/usr/bin/env node
// ============================================================
// Battle of the Realm — one place that finds, cleans and checks the
// ElevenLabs API key, shared by both generators.
//
//   node tools/eleven-key.js     # diagnose: where the key came from, whether
//                                # it's clean, and whether ElevenLabs accepts it
//
// Keys travel through clipboards, Notepad and Git Bash, so they pick up
// passengers: a UTF-8 BOM, a trailing CR from a CRLF file, wrapping quotes, a
// non-breaking space from a web page. None of those are legal in an HTTP header
// value, and Node rejects the whole request with
//
//     Invalid character in header content ["xi-api-key"]
//
// without saying which byte is at fault. So we strip them, and if anything
// unexpected survives we name it by codepoint instead of guessing.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const FILES = ['.env', 'elevenlabs.env'];

// Whitespace, C0/C1 controls, NBSP, zero-width spaces/joiners, word joiner, BOM.
// (`\s` already covers most of these; listing them keeps the intent readable.)
const JUNK_CLASS = '[\\s\\u0000-\\u001F\\u007F-\\u009F\\u00A0\\u200B-\\u200D\\u2060\\uFEFF]';
const JUNK_G = new RegExp(JUNK_CLASS, 'g');
const JUNK_1 = new RegExp(JUNK_CLASS);
// What an ElevenLabs key is actually made of.
const VALID = /^[A-Za-z0-9_.\-]+$/;

const clean = (raw) => String(raw)
  .replace(/^﻿/, '')            // BOM, if the file was saved as UTF-8-with-BOM
  .trim()
  .replace(/^["']|["']$/g, '')       // KEY="sk_..." from a quoted .env
  .replace(JUNK_G, '');              // anything else invisible

/* Human-readable list of what was stripped, so a bad paste is obvious. */
function junkFound(raw) {
  const names = {
    9: 'TAB', 10: 'LF (newline)', 13: 'CR (Windows line ending)', 32: 'space',
    160: 'NBSP (non-breaking space)', 8203: 'zero-width space', 65279: 'BOM',
  };
  const seen = new Map();
  for (const ch of String(raw)) {
    if (!JUNK_1.test(ch)) continue;
    const cp = ch.codePointAt(0);
    seen.set(cp, (seen.get(cp) || 0) + 1);
  }
  return [...seen].map(([cp, n]) =>
    `${names[cp] || 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')}${n > 1 ? ` ×${n}` : ''}`);
}

const mask = (k) => (k.length <= 12 ? k : `${k.slice(0, 7)}…${k.slice(-4)} (${k.length} chars)`);

/* Find the key. Returns { key, source, junk } or null. */
function findKey() {
  if (process.env.ELEVENLABS_API_KEY) {
    const raw = process.env.ELEVENLABS_API_KEY;
    return { key: clean(raw), source: 'the ELEVENLABS_API_KEY environment variable', junk: junkFound(raw) };
  }
  for (const f of FILES) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    // Tolerate a BOM, `export KEY=`, spaces around `=`, and CRLF endings.
    const m = text.match(/^[﻿\s]*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.*)$/m);
    if (m) return { key: clean(m[1]), source: f, junk: junkFound(m[1]) };
  }
  return null;
}

/* The generators call this. Throws with an actionable message. */
function requireKey() {
  const found = findKey();
  if (!found) {
    throw Object.assign(new Error(
      'No ELEVENLABS_API_KEY found.\n' +
      '   Put it in a gitignored .env at the repo root:\n' +
      "     printf 'ELEVENLABS_API_KEY=%s\\n' 'sk_your_key_here' > .env\n" +
      '   (or export it in your shell), then re-run.'), { clean: true });
  }
  if (!found.key) {
    throw Object.assign(new Error(`ELEVENLABS_API_KEY in ${found.source} is empty.`), { clean: true });
  }
  if (!VALID.test(found.key)) {
    const odd = [...new Set([...found.key].filter((c) => !/[A-Za-z0-9_.\-]/.test(c)))]
      .map((c) => `${JSON.stringify(c)} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    throw Object.assign(new Error(
      `The key in ${found.source} contains characters that can't go in an HTTP header: ${odd.join(', ')}\n` +
      '   Re-copy it from the ElevenLabs dashboard and rewrite the file with:\n' +
      "     printf 'ELEVENLABS_API_KEY=%s\\n' 'sk_your_key_here' > .env"), { clean: true });
  }
  return found;
}

/* Ask ElevenLabs whether the key works, and how many credits are left. */
function check(key) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: '/v1/user/subscription',
      headers: { 'xi-api-key': key },
      timeout: 30000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200) {
          return resolve({ ok: false, status: res.statusCode, body: body.slice(0, 200) });
        }
        try {
          const j = JSON.parse(body);
          resolve({ ok: true, remaining: j.character_limit - j.character_count, limit: j.character_limit, tier: j.tier });
        } catch { resolve({ ok: true }); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, body: 'timed out' }); });
    req.on('error', (e) => resolve({ ok: false, status: 0, body: e.message }));
    req.end();
  });
}

module.exports = { requireKey, findKey, check, mask };

// ── run directly: diagnose ─────────────────────────────────────
if (require.main === module) {
  (async () => {
    let found;
    try { found = requireKey(); }
    catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }

    console.log(`✓ key found in ${found.source}: ${mask(found.key)}`);
    if (found.junk.length) {
      console.log(`  cleaned off: ${found.junk.join(', ')} — harmless now, but that is what broke the header.`);
    }

    process.stdout.write('· asking ElevenLabs… ');
    const res = await check(found.key);
    if (res.ok) {
      console.log('accepted.');
      if (typeof res.remaining === 'number') {
        console.log(`  credits remaining: ${res.remaining.toLocaleString()} of ${res.limit.toLocaleString()}${res.tier ? ` (${res.tier})` : ''}`);
      }
    } else if (res.status === 401) {
      console.log('rejected.');
      console.error('❌ ElevenLabs says this key is invalid. If you rotated it, paste the new one.');
      process.exit(1);
    } else {
      console.log('failed.');
      console.error(`❌ ${res.status || ''} ${res.body}`);
      process.exit(1);
    }
  })();
}
