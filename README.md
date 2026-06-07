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

## The seven microgames

| Game | Skill |
|------|-------|
| ⚡ **Quick Draw** | reaction — out-draw your foe (best of 3) |
| 🪢 **Tug of War** | mashing — pull the rope to your side |
| 🎯 **Power Strike** | timing — stop the slider on the bullseye to KO the foe's HP |
| 🧠 **Memory Echo** | memory — repeat the rune pattern (Simon) |
| 🌀 **Dodge!** | dexterity — drag to dodge the barrage and survive |
| 💥 **Target Blitz** | speed — tap the orbs, avoid the bombs |
| 🎵 **Rhythm Duel** | timing — tap the notes on the beat |
| 👑 **The Gilded King** | a 3-phase boss gauntlet at max difficulty |

Every microgame scales with difficulty (faster, smaller targets, longer patterns,
denser attacks) so the journey ramps from gentle to brutal.

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
