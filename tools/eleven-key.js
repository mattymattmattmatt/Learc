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

// The placeholders that appear in this repo's docs and prompts. Pasting one of
// these verbatim is an easy mistake and otherwise surfaces as a puzzling 401.
const PLACEHOLDERS = new Set([
  'sk_your_key_here', 'your_key_here', 'sk_test_fake', 'sk_xxx', 'sk_...', 'sk_', 'paste_your_key_here',
]);
// A real key looks like sk_ + 48 hex characters. Not enforced — only used to
// warn, so a format change on ElevenLabs' side can't lock the tools up.
const SHAPE = /^sk_[0-9a-f]{48}$/i;

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
      "     printf 'ELEVENLABS_API_KEY=%s\\n' 'PASTE-YOUR-KEY' > .env\n" +
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
      "     printf 'ELEVENLABS_API_KEY=%s\\n' 'PASTE-YOUR-KEY' > .env"), { clean: true });
  }
  if (PLACEHOLDERS.has(found.key.toLowerCase())) {
    throw Object.assign(new Error(
      `${found.source} still holds the placeholder "${found.key}", not a real key.\n` +
      '   Create a key at https://elevenlabs.io/app/settings/api-keys, then:\n' +
      "     printf 'ELEVENLABS_API_KEY=%s\\n' 'PASTE-YOUR-KEY' > .env\n" +
      '   In Git Bash, paste with right-click or Shift+Insert — Ctrl+V types a\n' +
      '   control character (U+0016) instead of pasting.'), { clean: true });
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
          // ElevenLabs explains itself in `detail`, as either a string or
          // { status, message }. Surfacing it is the whole point of this check —
          // "invalid key" and "this key lacks a permission" are different problems.
          let code = '', message = body.slice(0, 300);
          try {
            const d = JSON.parse(body).detail;
            if (typeof d === 'string') message = d;
            else if (d && typeof d === 'object') { code = d.status || ''; message = d.message || message; }
          } catch {}
          return resolve({ ok: false, status: res.statusCode, code, message });
        }
        try {
          const j = JSON.parse(body);
          resolve({ ok: true, remaining: j.character_limit - j.character_count, limit: j.character_limit, tier: j.tier });
        } catch { resolve({ ok: true }); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, message: 'timed out' }); });
    req.on('error', (e) => resolve({ ok: false, status: 0, message: e.message }));
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
      if (found.junk.some((j) => j.includes('U+0016'))) {
        console.log('  U+0016 is what Git Bash types when you press Ctrl+V. Paste with');
        console.log('  right-click or Shift+Insert instead, and it will not come back.');
      }
    }
    if (!SHAPE.test(found.key)) {
      console.log('  note: this does not look like the usual sk_ + 48 hex characters —');
      console.log('  it may be truncated. Checking with ElevenLabs anyway.');
    }

    process.stdout.write('· asking ElevenLabs… ');
    const res = await check(found.key);

    if (res.ok) {
      console.log('accepted.');
      if (typeof res.remaining === 'number') {
        console.log(`  credits remaining: ${res.remaining.toLocaleString()} of ${res.limit.toLocaleString()}${res.tier ? ` (${res.tier})` : ''}`);
      }
      return;
    }

    console.log('rejected.');
    console.error(`   ElevenLabs said: ${res.code ? res.code + ' — ' : ''}${res.message}`);

    // A scoped key that can generate audio but can't read the account is fine
    // for our purposes: this endpoint only fetches the credit balance.
    const permissionsOnly = res.status === 401 &&
      (/missing_permission/i.test(res.code) || /permission/i.test(res.message));
    if (permissionsOnly) {
      console.log('');
      console.log('⚠️  This key just lacks the "user" read permission, which is only used to');
      console.log('   show your credit balance. Generating audio may still work.');
      console.log('   To see the balance too, edit the key at');
      console.log('   https://elevenlabs.io/app/settings/api-keys and enable User → Read.');
      console.log('');
      console.log('   Continuing — run: bash tools/generate-all.sh');
      return;                                    // exit 0: do not block generation
    }

    if (/quota|credit/i.test(res.code) || /quota|credit/i.test(res.message)) {
      console.error('');
      console.error('❌ The key works, but the account is out of credits. Top up or wait for the');
      console.error('   monthly reset at https://elevenlabs.io/app/subscription — nothing to fix here.');
      process.exit(1);
    }

    if (res.status === 401) {
      console.error('');
      console.error('❌ The key itself was rejected. Check at https://elevenlabs.io/app/settings/api-keys that:');
      console.error('   · the key still exists and has not been revoked');
      console.error('   · you copied the whole thing (it should be sk_ + 48 hex characters)');
      console.error('   · it belongs to the workspace whose credits you want to spend');
    }
    process.exit(1);
  })();
}
