# 🔊 Battle of the Realm — sound design

The game ships with a **built-in WebAudio synth** for every one-shot cue, so it is
never silent. On top of that it can play **generated samples** from ElevenLabs: drop
a file in and the cue upgrades itself, leave it out and the synth keeps playing.
Nothing is ever a hard dependency.

Music works the same way: the screens below ask for a generated track and name an
existing one to fall back on, so an ungenerated track is never a silent screen.

---

## Generating the audio

**The easy way** — from Git Bash (or any shell) at the repo root:

```bash
bash tools/generate-all.sh
```

It checks for Node, asks for your API key if there isn't one yet, **verifies the key
before spending anything**, generates all 25 sound effects, trims them if `ffmpeg` is
available, then **pauses for confirmation** before the more expensive music stage. It
prints your ElevenLabs credit balance before and after each stage, so a run can't
quietly drain the account.

If anything about the key looks wrong, check it on its own:

```bash
node tools/eleven-key.js
```

That says where the key was found, what invisible characters it stripped, and whether
ElevenLabs accepts it. Keys picked up from a clipboard or Notepad routinely carry a
UTF-8 BOM, a trailing CR from a CRLF file, wrapping quotes, or a non-breaking space —
none of which are legal in an HTTP header, and Node reports them only as
`Invalid character in header content ["xi-api-key"]` without naming the byte.
`tools/eleven-key.js` strips all of those, and names any character it can't.

**The manual way** — the generators need an ElevenLabs API key in a **gitignored**
`.env` at the repo root (`.gitignore` already covers `.env`, `elevenlabs.env` and
`*.env`):

```
ELEVENLABS_API_KEY=sk_...
```

…or export `ELEVENLABS_API_KEY` in your shell. Then:

```bash
node tools/generate-sfx.js            # the 25 one-shot cues → assets/audio/sfx/
node tools/generate-music.js          # the 4 new tracks     → assets/Music/
```

All three scripts are dependency-free (plain Node + bash, no `npm install`) and both
generators **skip anything already on disk**, so a re-run costs no credits — and a
retake of one cue you didn't like costs exactly one cue. They also stop immediately
on a rejected key or an exhausted quota rather than repeating the same error 25
times. Useful flags:

```bash
node tools/generate-sfx.js --force        # re-buy everything
node tools/generate-sfx.js hit win go     # just these cues
node tools/generate-sfx.js --no-trim      # keep the raw multi-take files
node tools/generate-music.js ending       # just this track
```

`generate-sfx.js` rewrites `assets/audio/sfx/manifest.json` from what is actually on
disk. **The game only fetches cues named in that manifest**, which is what keeps the
console free of 404s for cues you haven't made yet — so don't hand-edit it.

### The trim pass is not optional

The sound-generation endpoint fills the whole requested duration with several takes
of the effect separated by silence, and several files open with up to a second of
lead-in silence. Untrimmed, every hit spawns a multi-second buffer, overlapping hits
stack their tails, and each cue is many times the size it needs to be.

`tools/trim-sfx.sh` keeps take one, finds where the sound actually *starts*, fades
it out and normalises to −16 LUFS. It's idempotent, so re-running after generating a
single new cue is safe. `generate-sfx.js` runs it automatically **when `ffmpeg` is on
your PATH** and tells you if it isn't:

```bash
tools/trim-sfx.sh          # all cues
tools/trim-sfx.sh hit win  # just these
```

The music endpoint returns one continuous track and needs no trimming.

---

## The one-shot cues

Every name below is a cue the game **already triggers** — they map to the `S` table in
`scripts/battle/util.js`, so generating one upgrades every call site at once. Prompts
and length caps live in `tools/sfx-cues.json`; edit a prompt there and re-run with
`--force` to buy a new take.

### Combat & minigames

| Cue | Fires when | Cap |
|-----|-----------|-----|
| `hit` | any strike lands — attacks, collisions, Glob's crown cracking | 0.45s |
| `splash` | a creature hits the water (Balance, sea games) | 0.9s |
| `shoot` | Sharpshooter fires, Slingshot releases — **the shot, not the impact** (Sharpshooter was playing `hit` for its own gun) | 0.35s |
| `reload` | Sharpshooter refills its clip (**was silent**) | 0.6s |
| `good` | a small success — a gap cleared, a correct input | 0.5s |
| `bad` | a small mistake — a miss, a slip, a dropped combo | 0.6s |
| `star` | a star or prize collected mid-game | 0.6s |
| `pickup` | a catch lands (Reel It In, catch games) | 0.35s |
| `combo` | a combo grab in Claw Drop (was borrowing `star`) | 0.5s |
| `heart` | hearts restored in a boss duel (was borrowing `star`) | 1.0s |
| `tick` | the 3-2-1 countdown, and each face flying past on the Mystery Box reel | 0.3s |
| `go` | **FIGHT!** — the countdown releasing | 1.0s |
| `swipe` | a dash, a boss sweep starting | 0.5s |

### Boss duels

| Cue | Fires when | Cap |
|-----|-----------|-----|
| `boss_warn` | an attack zone arms, just before it lands (**was silent** — the telegraph was visual only) | 0.6s |
| `boss_slam` | a boss slams the ground (was the generic `hit`, giving a giant king the same weight as a tap) | 0.9s |

### Menus & screens

| Cue | Fires when | Cap |
|-----|-----------|-----|
| `ui` | a confirm / forward button | 0.25s |
| `ui_back` | a back or cancel link — softer and rounder (was identical to confirm) | 0.25s |
| `whoosh` | any screen change, via the single `show()` funnel in `main.js`. Played very quietly; delete `S.whoosh()` from that one line if you'd rather have silent transitions. **Currently on the synth** — the first take came back silent | 0.5s |

### Results & rewards

| Cue | Fires when | Cap |
|-----|-----------|-----|
| `win` | a duel won | 1.8s |
| `lose` | a duel lost | 1.8s |
| `star_pop` | each star stamping onto the result card, one at a time (was the generic `star`) | 0.7s |
| `region_clear` | a whole region freed — bigger than a single duel win, which it was reusing | 3.0s |
| `fanfare` | Evil King Glob announced, and a **new** Mystery Box unlock | 2.5s |
| `badge` | a badge earned (was borrowing `star`) | 1.2s |
| `box_open` | the Mystery Box bursting open (was the generic `win`). **Currently on the synth** — the first take came back silent | 1.8s |

**Deliberately left on the synth:** `pad` (Memory's four coloured pads), `charge`
(Charge Shot's rising meter) and `note` (Pitch Wail) are *pitch-continuous* — the game
plays them at a frequency it computes at runtime, which a fixed sample can't do.

**Already sampled, not touched by these scripts:** the 24 creature entrance roars, the
henchman/Glob defeat and laugh clips, `spell_break`, `crown_crack`, `shatter` and
`catch` all live in `assets/audio/` as hand-picked `.wav`s and play via `sfx()`.

They get the same level treatment, through the `ROAR` table in `util.js` — measure them
with the **Measure roars** button on `tools/measure-sfx.html`. As generated they were
**21 dB apart**, so Clubbo's defeat bellowed while Flick's chirp was inaudible, and
several opened with lead-in silence that delayed the roar past the tap that asked for
it. `flick_entrance.wav` is the extreme case: **1.24s of silence in front of 0.2s of
sound**. Playback now starts past the silence, using a `#t=` media fragment.

One caveat: an element's volume can't exceed 1, so a file quieter than the target can
only be brought up so far. `flick_entrance.wav` is still about 5 dB under everything
else and is the one roar genuinely worth regenerating.

---

## The music

The 24 champion themes, the three region themes and `title` / `captured` / `victory`
already ship in `assets/Music/`. These four screens had no music of their own:

| Track | Screen | Length | Falls back to |
|-------|--------|--------|---------------|
| `ending.mp3` | the finale + credits (was reusing the short `victory` cue) | 75s | `victory.mp3` |
| `mysterybox.mp3` | the Collection screen (and the Mystery Box opened from it) | 45s | `title.mp3` |
| `gauntlet.mp3` | The Gauntlet — champion select and rounds | 60s | `title.mp3` |
| `gallery.mp3` | the Critterdex — browsing all 24 champions | 45s | `title.mp3` |

Their playback volumes at the call sites in `main.js` are also measured, against the
average of the existing Suno tracks (−26 dB effective), so a crossfade between an old
and a new track doesn't jump. `gallery` needed the most correction: it came back 9 dB
quieter than everything else.

Prompts are in `tools/generate-music.js`. Each is written as a **loop**: these play
under a screen for minutes at a time, so a track with a big intro or a hard ending
draws attention to the seam every time it wraps.

**Caveat:** "seamless loop" is a hint to the model, not a guarantee. Listen to each
track wrap at least once before shipping it. If the API rejects a length, lower that
track's `ms` and re-run — the script says so in its failure message.

Opening the Mystery Box **from the ending screen** deliberately keeps the ending theme
playing rather than switching tracks mid-celebration.

---

## Levels: measure, don't guess

The generated files come back at wildly different loudness — anything from −27 dB to
−3 dB depending on what the model felt like on the day. Left alone that made a boss
slam roughly **20 dB louder than a star pickup**. Each cue therefore plays at a
measured gain, which is the volume argument of its `cue(...)` in
`scripts/battle/util.js`.

To re-derive those numbers after regenerating anything, serve the repo and open the
measurement page:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/tools/measure-sfx.html and press Measure
```

It decodes every cue in the manifest, reports level, peak, lead-in silence and
whether the file contains more than one take, and prints a copy-pasteable list of
gains. Gains above 1 are normal and safe: each is capped so peak × gain stays under 1.
The page also flags:

- **duds** — a cue that came back silent, with the command to re-buy just that one.
- **lead-in silence** — playback then starts at an offset, via the `{ at }` clip
  window, so the cue lands the instant it fires instead of a tenth of a second later.
- **two takes in one file** — playback stops after the first, via `{ dur }`. This is
  what `tools/trim-sfx.sh` would have removed if ffmpeg had been available.

**Prompt wording matters more than you'd expect.** Asking for a *quiet*, *soft* or
*unobtrusive* sound is taken literally and returns a file with a peak around 0.03 —
inaudible. That's how the first `whoosh` and `box_open` takes were lost. Ask for a
clear, present sound and set how loud it actually plays in the `S` table.

## How the fallback works

`scripts/battle/util.js`:

- On the first tap, the game fetches `assets/audio/sfx/manifest.json`, then fetches and
  decodes each cue it names into an `AudioBuffer`.
- `S.<cue>()` plays that buffer if it is decoded, and calls the synth if it isn't —
  so a cue mid-download, a cue that failed to decode, and a cue you never generated all
  behave identically: you hear the synth.
- A decode failure drops the cue from the set, so it silently stops being retried.
- Mute silences samples and synth alike.
- `playMusic(name, vol, fallback)` switches to `fallback` if `name` isn't in the build,
  and remembers the miss so it doesn't retry on every screen change.

Bump `CACHE` in `service-worker.js` after adding audio, or installed copies of the game
will keep serving the old set.
