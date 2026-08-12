#!/usr/bin/env bash
# ============================================================
# Battle of the Realm — trim generated SFX down to their first take.
#
# The ElevenLabs sound-generation endpoint fills the whole requested duration
# with several variations of the effect separated by silence, and several files
# open with lead-in silence before the first take. Shipped as-is, every hit
# spawns a multi-second element, overlapping hits stack their tails, and each
# cue encodes to many times the size it needs.
#
# This keeps take one, fades it out, normalises the level and drops the rest.
# Idempotent: a file already under its cap is left alone, so re-running after
# generating a single new cue is safe.
#
# tools/generate-sfx.js runs this automatically when ffmpeg is on PATH.
#
# USAGE:  tools/trim-sfx.sh [name ...]     (default: every cue in the catalogue)
# ============================================================
set -eu
# NOTE: deliberately no `pipefail`. The duration probe below ends in `head -1`,
# which closes the pipe early and leaves ffmpeg with a SIGPIPE status; under
# pipefail that propagates through the assignment and `set -e` kills the run
# before the first file is touched.
cd "$(dirname "$0")/.."

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found — install it and re-run."; exit 1; }
command -v node   >/dev/null 2>&1 || { echo "node not found — needed to read tools/sfx-cues.json."; exit 1; }

SFX=assets/audio/sfx

# Per-cue ceiling in seconds, straight from the catalogue the generator uses.
cap_for() {
  node -e '
    const c = require("./tools/sfx-cues.json");
    const e = c[process.argv[1]];
    process.stdout.write(String(e && e.cap ? e.cap : 1.0));
  ' "$1"
}

NAMES=("$@")
if [ ${#NAMES[@]} -eq 0 ]; then
  # every cue in the catalogue, in catalogue order
  while IFS= read -r n; do NAMES+=("$n"); done < <(
    node -e '
      const c = require("./tools/sfx-cues.json");
      delete c._comment;
      console.log(Object.keys(c).join("\n"));
    '
  )
fi
[ ${#NAMES[@]} -gt 0 ] || { echo "No cues to trim."; exit 0; }
SILENT=""

for name in "${NAMES[@]}"; do
  f="$SFX/$name.mp3"
  [ -f "$f" ] || { printf '  %-12s (missing, skipped)\n' "$name"; continue; }

  dur=$(ffmpeg -hide_banner -i "$f" 2>&1 | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | head -1 \
        | awk -F: '{print ($1*3600)+($2*60)+$3}')
  cap=$(cap_for "$name")

  # Find where sound actually starts and ends. This runs for every cue, not just
  # the over-long ones: a short file can still be silent, and reporting that is
  # the whole point — an unheard cue is a wasted generation.
  ev=$(ffmpeg -hide_banner -i "$f" -af silencedetect=noise=-45dB:d=0.12 -f null - 2>&1 \
       | sed -n 's/.*silence_\(start\|end\): \([0-9.]*\).*/\1 \2/p') || true

  if printf '%s\n' "$ev" | awk -v dur="$dur" '
       $1 == "start" { n++; s[n] = $2 } $1 == "end" { e[n] = $2 }
       END { exit !(n > 0 && s[1] <= 0.05 && e[1] != "" && e[1] >= dur - 0.1) }'; then
    printf '  %-12s %ss \033[31mSILENT — nothing above -45dB\033[0m\n' "$name" "$dur"
    SILENT="$SILENT $name"
    continue
  fi

  # already short enough — nothing to cut
  if awk "BEGIN{exit !($dur <= $cap + 0.05)}"; then
    printf '  %-12s %ss (already trimmed)\n' "$name" "$dur"
    continue
  fi

  read -r start len <<EOF
$(printf '%s\n' "$ev" | awk -v cap="$cap" -v dur="$dur" '
    $1 == "start" { n++; s[n] = $2 }
    $1 == "end"   { e[n] = $2 }
    END {
      # a silence starting at (or within a frame of) zero is lead-in
      begin = (n > 0 && s[1] <= 0.05 && e[1] != "") ? e[1] : 0
      # If that lead-in runs to the end of the file, the whole thing is below the
      # threshold: the generator returned silence. Cutting from there would ask
      # ffmpeg for a window past the end and write a file with nothing in it, so
      # report it instead and leave the original alone.
      if (begin >= dur - 0.1) { print "-1 0"; exit }
      # the take ends at the first silence that begins after the sound does
      stop = dur
      for (i = 1; i <= n; i++) if (s[i] > begin + 0.02) { stop = s[i]; break }
      L = stop - begin
      if (L > cap) L = cap
      if (L < 0.15) L = 0.15
      if (L > dur - begin) L = dur - begin      # never run past the end
      printf "%.3f %.3f", begin, L
    }')
EOF

  fade=$(awk "BEGIN{f=0.06; s=$len-f; if(s<0)s=0; printf \"%.3f\", s}")
  tmp="$SFX/.$name.trim.mp3"
  ffmpeg -hide_banner -loglevel error -y -ss "$start" -t "$len" -i "$f" \
         -af "afade=t=out:st=$fade:d=0.06,loudnorm=I=-16:TP=-1.5:LRA=11" \
         -c:a libmp3lame -q:a 4 "$tmp"
  mv "$tmp" "$f"
  printf '  %-12s %ss -> %ss (from %ss)\n' "$name" "$dur" "$len" "$start"
done

if [ -n "$SILENT" ]; then
  echo
  echo "These came back silent and need a new take with a more assertive prompt:"
  echo "   node tools/generate-sfx.js --force$SILENT"
  echo "(Words like tiny, small, soft and quiet in a prompt are taken literally.)"
fi
