#!/usr/bin/env bash
# ============================================================
# Battle of the Realm — generate every sound effect and music track.
#
# Written to be run from Git Bash on Windows (or any bash) at the repo root:
#
#     bash tools/generate-all.sh
#
# It reads your ElevenLabs key from a gitignored .env, shows your credit
# balance before and after each stage, and pauses for confirmation before the
# expensive music stage. Nothing already on disk is ever re-bought.
# ============================================================
set -u
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ── prerequisites ──────────────────────────────────────────────
command -v node >/dev/null 2>&1 || die "Node.js is not installed. Get it from https://nodejs.org (LTS), reopen Git Bash, and re-run."

if [ ! -f .env ] && [ ! -f elevenlabs.env ] && [ -z "${ELEVENLABS_API_KEY:-}" ]; then
  say "No API key found."
  echo "Paste your ElevenLabs API key (it will be written to .env, which is gitignored)."
  echo "Note: the key committed to the Balitopia repo is public — use a freshly rotated one."
  printf 'Key: '
  read -r KEY
  [ -n "$KEY" ] || die "No key entered."
  printf 'ELEVENLABS_API_KEY=%s\n' "$KEY" > .env
  echo "Wrote .env"
fi

# ── preflight ──────────────────────────────────────────────────
# One request that proves the key is readable, header-legal and accepted, so a
# bad key costs one clear error instead of 29 identical ones.
say "Checking your API key"
node tools/eleven-key.js || die "
Nothing was generated and no credits were spent.
Fix the problem above, then re-run: bash tools/generate-all.sh"

# ── credit balance ─────────────────────────────────────────────
# Printed before and after each stage so a run can never quietly drain the
# account. Failures here are informational only and never stop the run.
balance() {
  node -e '
    const { requireKey, check } = require("./tools/eleven-key");
    (async () => {
      try {
        const r = await check(requireKey().key);
        if (r.ok && typeof r.remaining === "number") process.stdout.write(String(r.remaining));
      } catch {}
    })();
  ' 2>/dev/null
}

show_balance() {
  local b; b=$(balance)
  if [ -n "$b" ]; then printf '   credits remaining: %s\n' "$b"; BAL="$b"
  else warn "   (could not read your credit balance — continuing anyway)"; BAL=""; fi
}

spent_since() {
  local before="$1" after; after=$(balance)
  if [ -n "$before" ] && [ -n "$after" ]; then
    printf '   spent this stage: %s credits (%s remaining)\n' "$((before - after))" "$after"
  fi
}

# ── stage 1: sound effects ─────────────────────────────────────
say "1/2  Sound effects"
show_balance
BEFORE="$BAL"
node tools/generate-sfx.js "$@" || warn "Some cues failed — see above. You can re-run to retry just those."
spent_since "$BEFORE"

if ! command -v ffmpeg >/dev/null 2>&1; then
  warn ""
  warn "ffmpeg isn't installed, so the cues were NOT trimmed or level-matched."
  warn "They will still play. To fix them later, install ffmpeg and run:"
  warn "    bash tools/trim-sfx.sh"
  warn "On Windows:  winget install Gyan.FFmpeg   (then reopen Git Bash)"
fi

# ── stage 2: music ─────────────────────────────────────────────
say "2/2  Music"
echo "Music generation costs considerably more per track than a sound effect."
echo "This buys up to 4 tracks: ending (75s), mysterybox (45s), gauntlet (60s), gallery (45s)."
show_balance
printf 'Generate the music now? [Y/n] '
read -r ANSWER
case "${ANSWER:-Y}" in
  [Nn]*) echo "Skipped. Run 'node tools/generate-music.js' whenever you're ready." ;;
  *)
    BEFORE="$BAL"
    node tools/generate-music.js || warn "Some tracks failed — see above."
    spent_since "$BEFORE"
    ;;
esac

# ── what came out ──────────────────────────────────────────────
say "Done. Here's what's on disk:"
ls -1 assets/audio/sfx/*.mp3 2>/dev/null | sed 's|.*/|   sfx  |' || echo "   (no sfx)"
for t in ending mysterybox gauntlet gallery; do
  [ -f "assets/Music/$t.mp3" ] && printf '   music %s.mp3\n' "$t"
done

say "Next: listen to them, then send them to me."
cat <<'EOF'
   git add assets/audio/sfx assets/Music
   git commit -m "Generated SFX and music from ElevenLabs"
   git push -u origin claude/elevenlabs-game-audio-n7ujmr

Anything you dislike: delete that one file, tweak its prompt in
tools/sfx-cues.json (or tools/generate-music.js), and re-run this script —
it only buys what's missing, so a retake costs one cue, not the set.
EOF
