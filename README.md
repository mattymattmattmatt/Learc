# ⚔️ Battle of the Realm

A heart-and-courage battle adventure starring **24 hand-designed creatures**.
**Evil King Glob** has marched into Liitokala, netted every creature, and put an
**Obedience Spell** on them — but the spell slid right off the one hero *you*
choose. Duel your way across three regions — **Land → Sea → Sky** — snapping each
spellbound champion awake, beat Glob's three henchmen (**Minyar**, **Demonder**,
**Clubbo**), then face **Evil King Glob** himself.

Inspired by the bite-sized minigames of *Pokémon mini* / WarioWare. **Mobile-first**
(pure touch, portrait or landscape), no backend — runs from static files.
Every creature and boss also has its own **animated clip** that plays on the
select screen and before each battle.

## Play

Serve the folder over HTTP and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(`file://` won't work — the game `fetch`es its creature data.)

## The adventure

1. **Choose your hero** from all 24 creatures — the one creature Glob's spell
   can't touch. (Watch their animation play when you tap them.)
2. Battle the other (spellbound) champions across **3 regions** (Land / Sea / Sky).
   Each champion is a different microgame; **winning breaks their spell** and frees
   them. Difficulty climbs the whole way.
3. At the end of each region, fight the henchman who guards it — **Minyar** (Land),
   **Demonder** (Sea), **Clubbo** (Sky) — each a bespoke **boss duel** with its own
   signature attacks.
4. Clear all three to **challenge Evil King Glob** — whose crown cycles the realm's
   stolen powers, the hardest fight in the game.
5. A heartfelt ending: the spell shatters, every creature wakes, and your hero is
   raised up as the realm's new guardian.

**No lives, no going back:** you play your chosen hero until you win. Lose a
battle and you simply **try that very same battle again** — your progress is never
lost. Win battles cleanly to earn up to ★★★, and finish without losing a single
duel for a clean-run bonus.

## A unique game for every creature

All **24 creatures have their own distinct microgame** (one each — no two share a
mechanic), plus the bespoke King boss. Below are the game *types*; each is themed
to the creature that uses it.

## The microgames

| Game | Skill |
|------|-------|
| ⚡ **Quick Draw** | reaction — out-draw your foe (best of 3) |
| 🧺 **Star Catch** | drag to catch falling stars, dodge the bombs |
| 🪢 **Tug of War** | mashing — pull the rope to your side |
| 🪃 **Slingshot** | physics — pull back, aim the arc, fling stones at the foe |
| 🌟 **Swipe Strike** | gesture — swipe the way each arrow points |
| 🎯 **Power Strike** | timing — stop the slider on the bullseye to KO the foe's HP |
| 🔋 **Charge Shot** | hold & release inside the golden band |
| 🧠 **Memory Echo** | memory — repeat the rune pattern (Simon) |
| 🔫 **Sharpshooter** | aim — shoot flying targets, manage ammo & reloads |
| ⚖️ **Balance Beam** | reflex — tap left/right to stay on the log over the crocs |
| 🌀 **Dodge!** | dexterity — drag the bubble to dodge the barrage |
| 💥 **Target Blitz** | speed — tap the orbs, avoid the bombs |
| 🎵 **Rhythm Duel** | timing — tap gems on the beat for combos |
| 🛑 **Freeze!** | red-light/green-light — hold to creep, freeze when the eye opens |
| 🪁 **Windrider** | flap through the gaps in the clouds (flappy-style) |
| 🥌 **Ice Curling** | flick-and-slide momentum — stop on the bullseye |
| 🏓 **Fin Smash** | brick-breaker — keep the ball alive, shatter every brick |
| 🔊 **Sonic Shatter** | timing — tap when a shrinking ring meets the target |
| ☄️ **Dive Dodge** | drag out of the telegraphed slam zones before impact |
| 🦀 **Claw Drop** | time the sweeping crane to snatch fish |
| 🔥 **Hot Floor** | hop across a grid to safe tiles before they ignite |
| 🐍 **Venom Trail** | a Snake game — eat orbs, don't cross your poison trail |
| 🌀 **Unwind** | drag in circles to spin free of the coils |
| ✍️ **Break the Trance** | trace the glowing sigil through its dots in order |
| 💥 **Boss Duel** | the four bespoke boss fights — **DRAG** to survive each wave, then **TAP** the boss when it reels (ONE strike per opening) until its guard is fully broken. Each boss has a signature mechanic: Minyar's expanding **shockwave rings**, Demonder's boxing **glove jabs & haymakers**, Clubbo's full-width **club sweeps & ground slams**, and Glob's crown, which **cycles every stolen Aspect** (fire/flood/storm/wind/stone/shadow) and enrages at half guard |

## Score, stars & leaderboard

Every battle earns **1–3 stars** (the boss duels included). Your run total is shown on the map (`★ X / 81`)
and becomes your **final score** — collect three stars in all 24 battles for a
perfect run, plus a **+6 clean-run bonus** if you never lose a single battle. At the end
you enter a name and submit to a **🏆 leaderboard** (viewable from the title), so
players can compete for the most stars. The board uses the project's Firebase
(anonymous auth + a `scores` collection) and falls back to an on-device board when
offline, so it never blocks play. There's also a **📣 Share** button to send your
score to friends.

> Cloud scores need the Firestore rules in `firebase/firestore.rules` deployed
> (public read, validated create for signed-in users). If writes are denied,
> the local board still works.

## 🤝 Friendly rematches

Freed champions stay friendly! On the map, **tap any freed champion** (the 🤝
badge) to replay their microgame and improve your stars — rematches never cost
hearts. The **journey strip is navigation**: tap a cleared region (Land/Sea/Sky)
to revisit its champions, perfect your ★ total, then return to the live quest —
even right before facing Glob.

## 🔥 Endless Gauntlet

A second mode from the title screen: champions arrive in **random order with
ever-climbing difficulty**, you keep your hearts across rounds, and every win
banks its stars. Fall (or retire to bank your score) and submit to the
**separate Gauntlet leaderboard**. How deep can you go?

## 📖 Critterdex & 🏅 badges

The **Critterdex** (from the title) is a gallery of all 24 creatures — art,
epithet, power, signature attack, their microgame, and your **best-ever stars**
against them, kept *across runs*. Tap a creature to hear its roar — and use the
**🎯 Practice** chips (Easy / Medium / Hard) on its card to rehearse that
creature's minigame freely: no hearts, stars or records at stake, with a
"level up" shortcut when you clear a round. Below it
live **10 badges** (First Victory, Flawless, the three region liberations,
Crown Breaker, Unbroken, Star Master, and two Gauntlet feats) — earned badges
pop in with a golden toast mid-game and are remembered forever.

Every microgame scales with difficulty (faster, smaller targets, longer patterns,
denser attacks) so the journey ramps from gentle to brutal.

**Each creature fights as themselves.** Every one of the 23 champions is matched to
the microgame and themed attack that fits *their* power — Fertle hurls a 🔥 Fireball
Barrage (Dodge), Fixie a ❄️ Ice Shard Volley, Roger Dodger is an Untouchable flying
target you must lead with the Slingshot, Cliggy bombards you with explosive eggs
(Star Catch), Zappo makes you echo a ⚡ Shock Pattern (Memory), and so on. The
attack each creature uses is named on the pre-battle screen, so your niece's
designs drive the whole game.

**Evil King Glob** and his three henchmen are bespoke 1-on-1 boss duels (see below), not microgames.

## Polish

- **Procedural sound** — all SFX (taps, hits, stars, fanfares, countdown) are
  synthesized live with the WebAudio API, so there are no audio downloads and it
  works fully offline. Creatures still use their own recorded entrance roars.
- **Juice** — confetti on wins, stars that pop in one-by-one with a ding, screen
  shakes, sparkles and floating damage text, haptic buzz on mobile.
- **🔊 Mute toggle** (top-right, remembered between sessions).
- **Difficulty modes** — **Story** (5 hearts, gentler) or **Normal** (3 hearts,
  full challenge), chosen on the title screen and remembered.
- **Journey & story beats** — a Land → Sea → Sky → Glob progress strip on the map,
  and a freed-champions montage with a cheer line each time a region is liberated.
- **Installable & offline (PWA)** — a service worker precaches the game shell and
  caches art/audio as you play, so after the first visit it runs with no network
  and can be added to the home screen.
- **Little secrets** — tap the creatures drifting up the title screen to hear
  their roars; story scenes have a **Skip** for replayers; battle intros have a
  back button so you're never locked in.

## Code layout

| Path | What |
|------|------|
| `index.html` | **Battle of the Realm** (the main game) |
| `scripts/battle/main.js` | screen flow (title → story → select → map → battles → henchman bosses → Glob → ending), Gauntlet, Critterdex, rematches |
| `scripts/battle/data.js` | creatures, the bosses (Glob + Minyar/Demonder/Clubbo), region ladder, difficulty curve, story |
| `scripts/battle/state.js` | progress, boss/region progression, save (no lives) |
| `scripts/battle/meta.js` | cross-run progress: best stars per champion, badges, gauntlet record |
| `scripts/battle/minigames/` | the 24 microgames + `bossduel.js` (the four boss fights) |
| `scripts/battle/util.js` | audio, RNG, countdown, FX, animation/sprite helpers |
| `styles/battle.css` | all styling |
| `scripts/data/pets.json` | the 24 creatures (name, sprite, sound, power, tags) |
| `assets/Char_Anim/` | per-character & per-boss animation clips (play on select / pre-battle) |
| `assets/img/Extra_Images/` | story art — `Captured.png` (intro) and `Win.png` (finale) |
| `service-worker.js` | offline cache (precached shell + cache-as-you-play assets) |
| `firebase/firestore.rules` | leaderboard security rules (deploy to enable cloud scores) |
| `crittercatch.html`, `kingsgold.html` | earlier games, still playable |

## Credits

All 24 creatures — names, designs, powers and personalities — were dreamed up by
**Leila & Archie** (with trusty sidekick **Uncle Matty**) on a family adventure
in Bali, mid 2025. This game was built to celebrate them. 💛
There's a sparkly ✨ credits page on the title screen, too — tap the creatures
floating past it to hear their roars.
