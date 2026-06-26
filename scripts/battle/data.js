/* data.js — creatures, the adventure ladder, difficulty & story
   ----------------------------------------------------------------
   Loads the 24 creatures (the captured champions), groups foes into 3
   regions by habitat (Land → Sea → Sky). At the end of each region one
   of Evil King Glob's three henchmen guards the way; clear all three and
   the road to Glob's throne opens. Difficulty ramps the whole journey;
   Glob is hardest of all.
*/

let PETS = null;          // id → pet
export async function loadPets() {
  if (PETS) return PETS;
  const res = await fetch('scripts/data/pets.json');
  if (!res.ok) throw new Error(`Could not load creatures (pets.json: ${res.status})`);
  PETS = await res.json();
  return PETS;
}
export const getPet = id => PETS[id];
export const allPets = () => Object.values(PETS);

/* ── the new villains ──────────────────────────────────────────────
   Evil King Glob and his three henchmen. Each henchman guards one region;
   Glob waits at the end. `img`/`anim` are the painted portraits + clips the
   designer added; `boss` is the tuning the boss-duel engine reads. */
export const GLOB = {
  id: 'glob', name: 'Evil King Glob', kind: 'glob',
  img: 'Evil King Glob.png', anim: 'Evil King Glob_Anim.mp4', sfx: 'glob_entrance.wav',
  epithet: 'the Spoiled Tyrant', color: '#b06bff',
  game: 'bossduel',
  boss: { id: 'glob', hearts: 3, crown: 11, hitDmg: 1, enrage: true }
};

export const BOSSES = {
  minyar: {
    id: 'minyar', name: 'Minyar', kind: 'boss', region: 'land',
    img: 'Minyar.png', anim: 'Minyar_Anim.mp4', sfx: 'minyar_entrance.wav',
    epithet: 'the Tantrum', color: '#7ad17a',
    taunt: 'You woke them up?! That\'s MINE! Race me then — nobody out-pedals MY tantrum trike!',
    defeat: 'Nngh… no fair, no FAIR! You\'re too fast! …fine. Take your stupid forest. I\'m telling Glob!',
    game: 'pedalrace',
    boss: { id: 'minyar', hearts: 3, crown: 7, hitDmg: 1 }
  },
  demonder: {
    id: 'demonder', name: 'Demonder', kind: 'boss', region: 'sea',
    img: 'Demonder.png', anim: 'Demonder_Anim.mp4', sfx: 'demonder_entrance.wav',
    epithet: 'the Bruiser', color: '#ff6b3f',
    taunt: 'Heh. Footwork, little hero — let\'s see you skip my fire-rope. Nobody dances past Demonder.',
    defeat: 'Tch… light on your feet, kid. Real light. The tide\'s yours. I\'m done swinging.',
    game: 'ropejump',
    boss: { id: 'demonder', hearts: 3, crown: 8, hitDmg: 1 }
  },
  clubbo: {
    id: 'clubbo', name: 'Clubbo', kind: 'boss', region: 'sky',
    img: 'Clubbo.png', anim: 'Clubbo_Anim.mp4', sfx: 'clubbo_entrance.wav',
    epithet: 'the Crusher', color: '#5fd47a',
    taunt: 'CLUBBO SMASH! Slabs come down, you get squished! Nobody slip through. NOBODY!',
    defeat: 'Ooogh… you wiggle through every one. Clubbo dizzy. Go on… go get the baby king.',
    game: 'slabgap',
    boss: { id: 'clubbo', hearts: 3, crown: 9, hitDmg: 1 }
  }
};
export const bossOfRegion = key => Object.values(BOSSES).find(b => b.region === key);
export const getBoss = id => (id === 'glob' ? GLOB : BOSSES[id]);
export const isVillain = id => id === 'glob' || !!BOSSES[id];

/* region metadata — each now names the henchman who holds it */
export const REGIONS = [
  { key: 'land', name: 'The Verdant Reach', theme: 'land', blurb: 'Forests and plains where the land-champions sleep under Glob\'s spell — and Minyar throws his tantrums.' },
  { key: 'sea',  name: 'The Sunken Tides',  theme: 'sea',  blurb: 'Reefs and trenches where the tide-champions march in a daze — and Demonder guards the deep.' },
  { key: 'sky',  name: 'The Stormcrown Peaks', theme: 'sky', blurb: 'Cloud-wreathed summits where the sky-champions soar in chains of magic — and Clubbo blocks the climb.' }
];

/* interleaved fallback order (only used if a creature isn't mapped below) */
const MINIGAMES = [
  'quickdraw', 'catch', 'tugofwar', 'slingshot', 'swipe', 'powerstrike',
  'charge', 'memory', 'sharpshooter', 'balance', 'dodge', 'blitz', 'rhythm'
];

/* Each creature gets the microgame + themed attack that matches its power,
   so every battle is tailored to who you're facing. proj = the thing they
   throw at you; act = the attack name shown before the fight. */
export const BATTLES = {
  // ── Land ──
  fertle:      { game: 'dodge',       proj: '🔥', color: '#ff6b3f', act: 'Fireball Barrage' },
  fygar:       { game: 'quickdraw',   proj: '💨', color: '#9fe8ff', act: 'Blur Strike' },
  waterwolf:   { game: 'balance',     proj: '🌊', color: '#4aa8ff', act: 'Tidal Surge' },
  chomper:     { game: 'powerstrike', proj: '🦷', color: '#7ad17a', act: 'Iron Bite' },
  fixie:       { game: 'iceslide',    proj: '❄️', color: '#9fe8ff', act: 'Ice Curling' },
  chunky:      { game: 'tugofwar',    proj: '🌿', color: '#5fd47a', act: 'Vine Yank' },  // owns Tug of War
  skyjumper:   { game: 'charge',      proj: '⬆️', color: '#c08bff', act: 'Sky Leap' },
  cliggy:      { game: 'catch',       proj: '🥚', color: '#ffd23f', act: 'Egg Bombardment', howto: 'Drag left & right to CATCH the falling eggs 🥚. Avoid the bombs 💣!' },
  // ── Sea ──
  peeta_heater:{ game: 'hotfloor',    proj: '♨️', color: '#ff8a4a', act: 'Scalding Floor' },
  snapper:     { game: 'clawdrop',    proj: '🦀', color: '#ff7a5a', act: 'Claw Snap' },
  swack:       { game: 'paddle',      proj: '🏓', color: '#5cc6ff', act: 'Fin Smash' },
  zappo:       { game: 'memory',      proj: '⚡', color: '#ffd23f', act: 'Shock Pattern' },
  yelp:        { game: 'rhythm',      proj: '🔊', color: '#ff5a86', act: 'Sonic Roar' },
  sixter:      { game: 'freezeframe', proj: '☠️', color: '#9be86b', act: 'Venom Trail' },
  chocker:     { game: 'unwind',      proj: '🪢', color: '#c08bff', act: 'Coil Squeeze' },
  gus:         { game: 'snaketrail',  proj: '👁️', color: '#b06bff', act: 'Dread Stare' },
  // ── Sky ──
  bo:          { game: 'swipe',       proj: '🌈', color: '#5cc6ff', act: 'Rainbow Beams' },
  roger_dodger:{ game: 'slingshot',   proj: '🎯', color: '#ffd23f', act: 'Untouchable Dance' },
  yellogen:    { game: 'pitchwail',   proj: '🎶', color: '#ffd23f', act: 'Banshee Wail' },
  whipper:     { game: 'glider',      proj: '🌬️', color: '#9fe8ff', act: 'Gale Push' },
  diver:       { game: 'divedodge',   proj: '☄️', color: '#ff6b3f', act: 'Dive Bomb' },
  stinger:     { game: 'blitz',       proj: '📍', color: '#ffd23f', act: 'Rapid Jabs' },
  flick:       { game: 'sharpshooter',proj: '🥢', color: '#ffae5a', act: 'Stick Toss' },
  creeper:     { game: 'trace',       proj: '🌀', color: '#b06bff', act: 'Hollow Gaze' }
};

/* Build the full adventure for a chosen hero.
   Returns { heroId, regions:[{...meta, foes:[...], boss}], glob } */
export function buildAdventure(heroId) {
  const byHab = { land: [], sea: [], sky: [] };
  for (const p of allPets()) if (p.id !== heroId) byHab[p.habitat].push(p.id);

  // count total foes for a smooth difficulty curve
  const ordered = [...byHab.land, ...byHab.sea, ...byHab.sky];
  const total = ordered.length;            // 23
  const diffOf = gi => Math.max(1, Math.min(9, 1 + Math.round((gi / (total - 1)) * 8)));

  let gi = 0;
  const regions = REGIONS.map((r, ri) => {
    const foes = byHab[r.theme].map((id) => {
      const b = BATTLES[id] || { game: MINIGAMES[gi % MINIGAMES.length] };
      let difficulty = diffOf(gi);
      if (ri === 0) difficulty = Math.min(9, difficulty + 1);   // first region starts a notch harder
      const entry = {
        id, kind: 'champion', difficulty, game: b.game,
        theme: { proj: b.proj || '⭐', color: b.color || '#ffd23f', act: b.act || 'Champion’s Trial', howto: b.howto || null }
      };
      gi++;
      return entry;
    });
    // the henchman who guards this region — a notch harder than its champions
    const bm = bossOfRegion(r.theme);
    const boss = {
      id: bm.id, kind: 'boss', game: bm.game,
      difficulty: Math.min(10, 6 + ri * 2),
      theme: { proj: '💥', color: bm.color, act: bm.epithet }
    };
    return { ...r, foes, boss };
  });

  const glob = {
    id: 'glob', kind: 'glob', game: GLOB.game, difficulty: 11,
    theme: { proj: '👑', color: GLOB.color, act: 'The Obedience Crown' }
  };
  return { heroId, regions, glob };
}

/* ── flavour: epithet + spellbound taunt + freed (warm, themselves again) ──
   Under Glob's Obedience Spell the champions are hollow and glassy-eyed;
   winning snaps them awake. */
export const FLAVOR = {
  fertle:      { epithet: 'the Ember Tongue',   taunt: 'The King… commands… you will burn. (the eyes glow empty)', freed: 'Wha—? My head was full of grey fog! You burned it away. Go free the others!' },
  fygar:       { epithet: 'the Blur',           taunt: 'Catch the hero. Catch. Catch. (a blur, with empty eyes)', freed: 'I was running and running and didn\'t know why… thank you. I\'ll cheer you home!' },
  waterwolf:   { epithet: 'the Tidecaller',     taunt: 'The river… serves the King now. You will not pass.', freed: 'The water feels clean again — and so do I. The spell is broken. Onward!' },
  chomper:     { epithet: 'the Iron Jaw',       taunt: 'Bite the intruder. The crown says bite.', freed: 'Ha! You knocked the fog right out of my skull. The Reach is yours to cross.' },
  fixie:       { epithet: 'the Frostmaker',     taunt: 'Freeze. Obey. Freeze. (frost drips from a blank stare)', freed: 'You thawed me out of that nightmare. Onward — Glob can\'t hold us all!' },
  chunky:      { epithet: 'the Vine King',      taunt: 'Tangle the hero for the King…', freed: 'Phew, my mind\'s my own again! Take a vine for luck and keep climbing.' },
  skyjumper:   { epithet: 'the High Leap',      taunt: 'Crush from above. The crown wills it.', freed: 'I jumped higher than the spell could reach — because of you. I\'m with you!' },
  cliggy:      { epithet: 'the Eggshell Bomber',taunt: 'Bombs for the King. Bombs, bombs. (eyes flicker)', freed: 'No more bangs for that brat. Just a friend at your back now.' },

  peeta_heater:{ epithet: 'the Scald',          taunt: 'These tides boil for the King. Turn back.', freed: 'The heat fades… and the fog with it. Swim on, brave one.' },
  snapper:     { epithet: 'the Great Claw',     taunt: 'Snip the hero. Obey. Snip.', freed: 'A worthy catch slips my claws — and snaps me awake. Go free us all!' },
  swack:       { epithet: 'the Finstorm',       taunt: 'One whack for the crown and you\'re gone.', freed: 'You rolled with every hit and broke the spell. The trench is open to you.' },
  zappo:       { epithet: 'the Live Wire',      taunt: 'Spark the trespasser. The King commands.', freed: 'You weathered my storm and cleared my head. Take this charge of hope!' },
  yelp:        { epithet: 'the Sonic Maw',      taunt: 'Roar for the King. Roar. (a hollow, ringing cry)', freed: 'You stood firm in the noise. The quiet in my mind is back — thank you.' },
  sixter:      { epithet: 'the Venom Bloom',    taunt: 'Poison the hero for the crown…', freed: 'The poison clears, the fog clears. You breathe easy now; so do I.' },
  chocker:     { epithet: 'the Coil',           taunt: 'Wrap them up for the King. Tight.', freed: 'You slipped my grip and Glob\'s — go loosen his hold on everyone!' },
  gus:         { epithet: 'the Dread Stare',    taunt: 'Look into the crown\'s eyes. Freeze.', freed: 'You met my stare without fear — and shattered the spell behind it. Onward!' },

  bo:          { epithet: 'the Prism',          taunt: 'Blind the hero for the King.', freed: 'Such bright spirit cut right through the fog! Let my colors light your path.' },
  roger_dodger:{ epithet: 'the Untouchable',    taunt: 'Dodge. Strike. Obey. (a dead-eyed dance)', freed: 'You finally clipped me — and snapped me awake! Fly true to the summit.' },
  yellogen:    { epithet: 'the Screech',        taunt: 'Screech for the crown. Crumble them.', freed: 'You out-sang the spell itself. The peaks salute you!' },
  whipper:     { epithet: 'the Galewing',       taunt: 'Blow the hero off the mountain. The King wills it.', freed: 'Ride my tailwind now, friend — the fog is gone. Go!' },
  diver:       { epithet: 'the Skyfall',        taunt: 'Strike from the sun for the crown.', freed: 'A clean dive woke a cleaner heart. I\'m free — thank you!' },
  stinger:     { epithet: 'the Quickpoint',     taunt: 'Jab the trespasser. Obey, obey.', freed: 'Sharp reflexes snapped me out of it. Onward, hero!' },
  flick:       { epithet: 'the Deadeye',        taunt: 'Never miss. The crown never misses.', freed: 'You dodged the un-dodgeable and freed me. Glob is near — go!' },
  creeper:     { epithet: 'the Hollow Gaze',    taunt: 'Stare. Paralyse. Serve the King.', freed: 'You broke my trance with warmth. Thank you, brave one.' }
};
export const flavor = id => FLAVOR[id] || { epithet: 'the Champion', taunt: 'The King commands!', freed: 'Well fought.' };

/* ── INTRO: the new tale ─────────────────────────────────────────── */
export const STORY_CAPTURED = 'assets/img/Extra_Images/Captured.png';
export const STORY_WIN = 'assets/img/Extra_Images/Win.png';

export const INTRO = [
  'In the bright realm of Liitokala, twenty-four wondrous creatures were wished into being by the Heartspring — guardians born to keep the Land, the Sea and the Sky full of song.',
  'But one grey dawn a spoiled little tyrant marched into town: Evil King Glob, who decided every creature in the realm should belong to him.',
  'At his heels came three henchmen — Minyar the Tantrum, Demonder the Bruiser, and Clubbo the Crusher — and together they threw one great net over the whole realm.',
  'Glob laid an Obedience Spell on his captives. Their eyes went empty, and one by one the champions bowed to his will.',
  'Yet the spell needs a heart that will kneel — and YOUR chosen champion would never kneel. The magic slid right off. You alone are free.',
  'Win a duel and a creature snaps awake. Free them all, beat Glob\'s three henchmen, climb to his throne — and set the whole realm free. Choose your hero…'
];

/* boss dialogue helpers */
export const bossIntroLines = id => {
  const b = getBoss(id);
  return [b.taunt || 'You shall not pass!'];
};
export const bossDefeatLines = id => {
  const b = getBoss(id);
  return [b.defeat || 'You win this round…'];
};

export const GLOB_INTRO = [
  'So… the little hero who keeps WAKING UP my toys has come all the way to my throne. How RUDE.',
  'I am King Glob, and EVERYTHING is mine. The land, the sea, the sky, all the lovely creatures — mine, mine, MINE!',
  'My crown holds the stolen might of the whole realm. Fire, flood, storm, shadow — it gives me whatever tantrum I please.',
  'You woke a few of them up? Cute. But you cannot wake the crown. Come closer, hero — let me show you a REAL spell.'
];
export const GLOB_DEFEAT = [
  'No… no no NO! My crown — it\'s CRACKING! Stop it! I\'m the KING! You have to do what I—',
  'The fog… it\'s lifting off all of them at once. They\'re looking at me. They\'re… not afraid anymore.',
  'You didn\'t beat me with a bigger tantrum. You beat me with a braver heart. That\'s just… not FAIR.',
  'Take it. Take the realm. I only ever wanted someone to play with anyway… (the crown goes dark)'
];

/* ── GLOB'S CROWN ASPECTS ─────────────────────────────────────────
   Glob's crown cycles through stolen "Aspects" during the final duel, so
   his attacks keep changing. (Kept for the boss-duel engine's variety.) */
export const KING_ASPECTS = [
  { id: 'cinders', name: 'Cinders',     element: '🔥' },
  { id: 'deluge',  name: 'the Deluge',  element: '🌊' },
  { id: 'tempest', name: 'the Tempest', element: '⚡' },
  { id: 'gale',    name: 'the Gale',    element: '🌪️' },
  { id: 'stone',   name: 'Stone',       element: '⛰️' },
  { id: 'gloom',   name: 'the Gloom',   element: '🌑' }
];
export function pickKingAspect() { return KING_ASPECTS[(Math.random() * KING_ASPECTS.length) | 0]; }
