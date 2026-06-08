/* data.js — creatures, the adventure ladder, difficulty & story
   ----------------------------------------------------------------
   Loads the 24 creatures, groups foes into 3 regions by habitat
   (Land → Sea → Sky), then the King. Difficulty ramps across the
   whole journey; the King is hardest.
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

export const KING = {
  id: 'king', name: 'The Gilded King', sprite: null,
  epithet: 'Bearer of the Tarnished Crown'
};

/* region metadata */
export const REGIONS = [
  { key: 'land', name: 'The Verdant Reach', theme: 'land', blurb: 'Forests and plains where the land-champions stand bound.' },
  { key: 'sea',  name: 'The Sunken Tides',  theme: 'sea',  blurb: 'Reefs and trenches ruled by the tide-champions.' },
  { key: 'sky',  name: 'The Stormcrown Peaks', theme: 'sky', blurb: 'Cloud-wreathed summits where the sky-champions soar.' }
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
  fixie:       { game: 'dodge',       proj: '❄️', color: '#9fe8ff', act: 'Ice Shard Volley' },
  chunky:      { game: 'tugofwar',    proj: '🌿', color: '#5fd47a', act: 'Vine Yank' },
  skyjumper:   { game: 'charge',      proj: '⬆️', color: '#c08bff', act: 'Sky Leap' },
  cliggy:      { game: 'catch',       proj: '🥚', color: '#ffd23f', act: 'Egg Bombardment' },
  // ── Sea ──
  peeta_heater:{ game: 'dodge',       proj: '♨️', color: '#ff8a4a', act: 'Scalding Waves' },
  snapper:     { game: 'quickdraw',   proj: '🦀', color: '#ff7a5a', act: 'Claw Snap' },
  swack:       { game: 'powerstrike', proj: '💥', color: '#5cc6ff', act: 'Fin Whack' },
  zappo:       { game: 'memory',      proj: '⚡', color: '#ffd23f', act: 'Shock Pattern' },
  yelp:        { game: 'rhythm',      proj: '🔊', color: '#ff5a86', act: 'Sonic Roar' },
  sixter:      { game: 'dodge',       proj: '☠️', color: '#9be86b', act: 'Venom Cloud' },
  chocker:     { game: 'tugofwar',    proj: '🪢', color: '#c08bff', act: 'Coil Squeeze' },
  gus:         { game: 'swipe',       proj: '👁️', color: '#b06bff', act: 'Dread Stare' },
  // ── Sky ──
  bo:          { game: 'swipe',       proj: '🌈', color: '#5cc6ff', act: 'Rainbow Beams' },
  roger_dodger:{ game: 'slingshot',   proj: '🎯', color: '#ffd23f', act: 'Untouchable Dance' },
  yellogen:    { game: 'memory',      proj: '🗯️', color: '#ffd23f', act: 'Squawk Echo' },
  whipper:     { game: 'balance',     proj: '🌬️', color: '#9fe8ff', act: 'Gale Push' },
  diver:       { game: 'dodge',       proj: '☄️', color: '#ff6b3f', act: 'Dive Bomb' },
  stinger:     { game: 'blitz',       proj: '📍', color: '#ffd23f', act: 'Rapid Jabs' },
  flick:       { game: 'sharpshooter',proj: '🥢', color: '#ffae5a', act: 'Stick Toss' },
  creeper:     { game: 'powerstrike', proj: '🌀', color: '#b06bff', act: 'Hollow Gaze' }
};

/* Build the full adventure for a chosen hero.
   Returns { regions:[{...meta, foes:[{id,difficulty,game}]}], king } */
export function buildAdventure(heroId) {
  const byHab = { land: [], sea: [], sky: [] };
  for (const p of allPets()) if (p.id !== heroId) byHab[p.habitat].push(p.id);

  // count total foes for a smooth difficulty curve
  const ordered = [...byHab.land, ...byHab.sea, ...byHab.sky];
  const total = ordered.length;            // 23 (or 24 if hero were excluded oddly)
  const diffOf = gi => Math.max(1, Math.min(9, 1 + Math.round((gi / (total - 1)) * 8)));

  let gi = 0;
  const regions = REGIONS.map(r => {
    const foes = byHab[r.theme].map((id, i) => {
      const b = BATTLES[id] || { game: MINIGAMES[gi % MINIGAMES.length] };
      const entry = {
        id, difficulty: diffOf(gi), game: b.game,
        theme: { proj: b.proj || '⭐', color: b.color || '#ffd23f', act: b.act || 'Champion’s Trial' }
      };
      gi++;
      return entry;
    });
    return { ...r, foes };
  });

  return { heroId, regions, king: { id: 'king', difficulty: 10, game: 'kingfight', theme: { proj: '👑', color: '#ffd23f', act: 'The Tarnished Crown' } } };
}

/* ── flavour: epithet + taunt (under the Tarnish) + freed (warm) ── */
export const FLAVOR = {
  fertle:      { epithet: 'the Ember Tongue',   taunt: 'Step closer and taste my fire, little spark!', freed: 'Heh… my flame burns warmer now. Go free the others!' },
  fygar:       { epithet: 'the Blur',           taunt: 'Catch me? You can barely see me move!', freed: 'You kept up with me! Run on, friend — I\'ll cheer you home.' },
  waterwolf:   { epithet: 'the Tidecaller',     taunt: 'The river bends to me. You will not pass.', freed: 'The water feels clean again. Thank you for the calm.' },
  chomper:     { epithet: 'the Iron Jaw',       taunt: 'One bite is all it takes. Come here!', freed: 'Ha! Tougher than you look. The Reach is yours to cross.' },
  fixie:       { epithet: 'the Frostmaker',     taunt: 'I\'ll freeze that brave little grin right off you.', freed: 'You thawed something in me. Onward — the King awaits.' },
  chunky:      { epithet: 'the Vine King',      taunt: 'Swing into my jungle and you swing into trouble.', freed: 'Nicely done! Take a vine for luck and keep climbing.' },
  skyjumper:   { epithet: 'the High Leap',      taunt: 'I touch the clouds. You\'ll never reach me.', freed: 'You jumped higher than your fear. I\'m with you.' },
  cliggy:      { epithet: 'the Eggshell Bomber',taunt: 'Mind the eggs — they don\'t hatch, they BANG!', freed: 'No more bangs. Just a friend at your back now.' },

  peeta_heater:{ epithet: 'the Scald',          taunt: 'These tides boil at my command. Turn back!', freed: 'The heat fades… and so does my anger. Swim on.' },
  snapper:     { epithet: 'the Great Claw',     taunt: 'Snip-snap! I\'ll pinch that courage in two.', freed: 'A worthy catch slips my claws. Good — go free us all.' },
  swack:       { epithet: 'the Finstorm',       taunt: 'One whack of my fin and you\'re tomorrow\'s tide.', freed: 'You rolled with every hit. The trench is open to you.' },
  zappo:       { epithet: 'the Live Wire',      taunt: 'Touch the water and feel the spark, hero.', freed: 'You weathered my storm. Take this charge of hope.' },
  yelp:        { epithet: 'the Sonic Maw',      taunt: 'My roar shakes the reef. Cover your ears!', freed: 'You stood firm in the noise. Quiet, gentle friend.' },
  sixter:      { epithet: 'the Venom Bloom',    taunt: 'Breathe deep — my clouds are oh so sweet.', freed: 'The poison clears. You breathe easy now; so do I.' },
  chocker:     { epithet: 'the Coil',           taunt: 'Let me wrap you up nice and tight…', freed: 'You slipped my grip. Go — loosen the King\'s, too.' },
  gus:         { epithet: 'the Dread Stare',    taunt: 'Look into my eyes. I dare you not to freeze.', freed: 'You met my stare without fear. That… moved me.' },

  bo:          { epithet: 'the Prism',          taunt: 'My rainbow blinds the bold. Shield your eyes!', freed: 'Such bright spirit! Let my colors light your path.' },
  roger_dodger:{ epithet: 'the Untouchable',    taunt: 'Hit me? Ha! I dodge before you even swing.', freed: 'You finally clipped me! Fly true to the summit.' },
  yellogen:    { epithet: 'the Screech',        taunt: 'My squawk splits stone. You\'ll crumble too!', freed: 'You out-sang the storm. The peaks salute you.' },
  whipper:     { epithet: 'the Galewing',       taunt: 'I am the headwind you cannot climb.', freed: 'Ride my tailwind now, brave one. Go!' },
  diver:       { epithet: 'the Skyfall',        taunt: 'I strike from the sun. You won\'t see me coming.', freed: 'A clean dive — and a cleaner heart. I\'m freed!' },
  stinger:     { epithet: 'the Quickpoint',     taunt: 'One jab, faster than blinking. Ready? No?', freed: 'Sharp reflexes, sharper kindness. Onward!' },
  flick:       { epithet: 'the Deadeye',        taunt: 'I never miss. You\'re already done for.', freed: 'You dodged the un-dodgeable. The King is near.' },
  creeper:     { epithet: 'the Hollow Gaze',    taunt: 'My gaze paralyses the brave. Don\'t look away…', freed: 'You broke my trance with warmth. Thank you, hero.' }
};
export const flavor = id => FLAVOR[id] || { epithet: 'the Champion', taunt: 'Prove yourself!', freed: 'Well fought.' };

/* King dialogue (the heartfelt twist) */
export const KING_INTRO = [
  'So… the little hero who freed my champions stands before me at last.',
  'I am the Gilded King. Long ago I guarded this realm — until the Tarnish crept into my crown.',
  'It whispered that only strength could keep the realm safe. So I bound them all. For their own good.',
  'Defeat me, if you can. But know this: my crown does not yield easily.'
];
export const KING_DEFEAT = [
  'The crown… it cracks. The whispering stops.',
  'I see them now — every champion, free and smiling. I had forgotten what that looked like.',
  'You did not beat me with fury. You beat me with heart. That, the Tarnish could never understand.',
  'Rise, young guardian. The realm is free — and it chose well.'
];
