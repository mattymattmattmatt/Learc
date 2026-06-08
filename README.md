# ⚔️ Battle of the Realm

A heart-and-courage battle adventure starring **24 hand-designed creatures**.
Pick your hero, then duel your way across three regions — **Land → Sea → Sky** —
defeating every champion in a different **microgame** before facing the final
boss: the **Gilded King** and his Tarnished Crown.

Inspired by the bite-sized minigames of *Pokémon mini* / WarioWare. **Mobile-first**
(pure touch, portrait or landscape), no backend — runs from static files.

## Play

Serve the folder over HTTP and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(`file://` won't work — the game `fetch`es its creature data.)

## The adventure

1. **Choose your hero** from all 24 creatures.
2. Battle the other champions across **3 regions** (grouped by Land / Sea / Sky).
   Each champion is a different microgame, and difficulty climbs the whole way.
3. Beat all three regions to **challenge the Gilded King** — a 3-phase gauntlet,
   the hardest fight in the game.
4. A heartfelt ending: the realm is freed and your hero is crowned its guardian.

**Lives & checkpoints:** you start each region with 3 ❤. Lose a battle and you
lose a heart and retry it. Run out and the **current region restarts** with full
hearts (earlier regions stay cleared). Win battles cleanly to earn up to ★★★.

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
| 👑 **The Gilded King** | bespoke boss duel — dodge the crown's attack waves, then strike it while exposed |

## Score, stars & leaderboard

Every battle earns **1–3 stars**. Your run total is shown on the map (`★ X / 72`)
and becomes your **final score** — collect three stars in all 24 battles for a
perfect 72, plus a **+6 clean-run bonus** if you never use a continue. At the end
you enter a name and submit to a **🏆 leaderboard** (viewable from the title), so
players can compete for the most stars. The board uses the project's Firebase
(anonymous auth + a `scores` collection) and falls back to an on-device board when
offline, so it never blocks play.

> Note: cloud scores need the Firestore rules to allow the `scores` collection
> (read + create for signed-in users). If writes are denied, the local board
> still works.

Every microgame scales with difficulty (faster, smaller targets, longer patterns,
denser attacks) so the journey ramps from gentle to brutal.

**Each creature fights as themselves.** Every one of the 23 champions is matched to
the microgame and themed attack that fits *their* power — Fertle hurls a 🔥 Fireball
Barrage (Dodge), Fixie a ❄️ Ice Shard Volley, Roger Dodger is an Untouchable flying
target you must lead with the Slingshot, Cliggy bombards you with explosive eggs
(Star Catch), Zappo makes you echo a ⚡ Shock Pattern (Memory), and so on. The
attack each creature uses is named on the pre-battle screen, so your niece's
designs drive the whole game.

The **Gilded King** is a bespoke 1-on-1 boss duel (see below), not a microgame.

## Polish

- **Procedural sound** — all SFX (taps, hits, stars, fanfares, countdown) are
  synthesized live with the WebAudio API, so there are no audio downloads and it
  works fully offline. Creatures still use their own recorded entrance roars.
- **Juice** — confetti on wins, stars that pop in one-by-one with a ding, screen
  shakes, sparkles and floating damage text, haptic buzz on mobile.
- **🔊 Mute toggle** (top-right, remembered between sessions).
- **Difficulty modes** — **Story** (5 hearts, gentler) or **Normal** (3 hearts,
  full challenge), chosen on the title screen and remembered.
- **Journey & story beats** — a Land → Sea → Sky → King progress strip on the map,
  and a freed-champions montage with a cheer line each time a region is liberated.

## Code layout

| Path | What |
|------|------|
| `index.html` | **Battle of the Realm** (the main game) |
| `scripts/battle/main.js` | screen flow (title → story → select → map → battles → King → ending) |
| `scripts/battle/data.js` | creatures, region ladder, difficulty curve, story flavor |
| `scripts/battle/state.js` | progress, lives, region checkpoints, save |
| `scripts/battle/minigames/` | the seven microgames + the boss gauntlet |
| `scripts/battle/util.js` | audio, RNG, countdown, FX helpers |
| `styles/battle.css` | all styling |
| `scripts/data/pets.json` | the 24 creatures (name, sprite, sound, power) |
| `crittercatch.html`, `kingsgold.html` | earlier games, still playable |

## Credits

All 24 creatures — names, designs, powers and personalities — were created by the
game's young designer. This adventure was built to celebrate them. 💛
