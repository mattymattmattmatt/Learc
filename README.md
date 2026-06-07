# 🪄 Critter Catch

A bright, one-finger arcade game for kids, starring **24 hand-designed
creatures**. Critters float up the screen — tap them! Each one shouts its own
**name** and plays its own **sound**, bursts into sparkles, and joins your
**Collection book**. Build combos, grab the golden critters, and try to find
all 24.

**Built mobile-first:** pure touch, no reading required, works in portrait or
landscape, no zoom/scroll surprises. Runs from static files — no backend.

## Play

It's a static site — serve the folder over HTTP and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

(Opening via `file://` won't work because the game `fetch`es the creature data.)

## How to play

- **Tap** the creatures as they float up. Each catch = points, a sparkle burst,
  and the creature shouting its name + sound.
- **Combos** — catch creatures quickly in a row to stack a multiplier
  (up to ×5). Pause too long and it resets.
- **Golden critters** ✨ — worth 5× points **and** add +2 seconds. Grab them!
- Each round is **45 seconds** — beat your best score.
- **Collection book** 📖 — every kind you catch is saved forever. Tap a found
  creature to hear it say hi. Can you find all 24?

Everything is saved on the device (high score + collection), so progress sticks
between visits.

## Project layout

| Path | What |
|------|------|
| `index.html` | **Critter Catch** (the main game) |
| `scripts/critter/game.js` | the whole game (menu, play loop, results, collection) |
| `styles/critter.css` | the bright, bouncy styling |
| `scripts/data/pets.json` | the 24 creatures (name, sprite, sound) |
| `assets/img/characters/` | creature artwork |
| `assets/audio/*_entrance.wav` | each creature's voice/sound |
| `kingsgold.html` | the earlier **King's Gold** puzzle game, still playable |

## Credits

All 24 creatures — names, designs and personalities — were created by the
game's young designer. This little arcade exists to show them off. 💛
