/* engine.js — data-driven content + tactics engine for King's Gold
   ----------------------------------------------------------------
   Every puzzle is a *deducible match*, not a coin-flip:

   • Each companion wears its ability TRAITS as badges (🔥 💧 💪 …).
   • Each hazard has traits that COUNTER it (→ GOOD) and traits that
     BACKFIRE (→ BAD); everything else is a NORMAL, half-measure.
   • Skill = reading the hazard, knowing your roster, and managing the
     cooldowns + Heat clock. Later acts HIDE more of the hint so you
     must deduce the counter yourself.
*/

let _pets = null, _countries = null, _baddies = null;

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export async function loadData() {
  if (_pets && _countries && _baddies) return;
  [_pets, _countries, _baddies] = await Promise.all([
    loadJSON('scripts/data/pets.json'),
    loadJSON('scripts/data/countries.json'),
    loadJSON('scripts/data/baddies.json')
  ]);
}

export function getPets()      { return _pets; }
export function getPetArray()  { return _pets ? Object.values(_pets) : []; }
export function getCountries() { return _countries; }
export function getCountry(i)  { return _countries ? _countries[i] : undefined; }
export function getBaddies()   { return _baddies; }
export const TOTAL_COUNTRIES = () => (_countries ? _countries.length : 0);

export function petSfx(pet) {
  const base = pet.sprite.replace(/^char_/, '').replace(/\.webp$/, '');
  return `assets/audio/${base}_entrance.wav`;
}

/* ── trait → icon (badges shown on every companion & hazard hint) ── */
export const TRAIT_ICONS = {
  fire: '🔥', heat: '🌡️', water: '💧', ice: '❄️', cold: '🧊',
  wind: '🌪️', flight: '🕊️', jump: '🦘', swing: '🌿', agility: '🤸',
  speed: '💨', strength: '💪', bite: '🦷', pinch: '🦀', constrict: '🐍',
  electric: '⚡', sonic: '📢', loud: '🔊', poison: '☠️', light: '🌈',
  calm: '😌', precision: '🎯', throw: '🪃', dive: '🪂', stab: '🗡️',
  stealth: '🥷', fear: '😱', stun: '💫', explosive: '💥', attack: '👊'
};
export function traitIcon(t) { return TRAIT_ICONS[t] || '•'; }
export function petBadges(pet, max = 3) {
  return pet.tags.slice(0, max).map(traitIcon).join('');
}

/* ── act / difficulty by country index ──────────────────────────── */
export function actOf(countryIndex) {
  if (countryIndex <= 4)  return 1;
  if (countryIndex <= 13) return 2;
  if (countryIndex <= 21) return 3;
  return 4;
}
/* how much of the hint is revealed:
   0 = counter icons + backfire icons (teaching, Act 1)
   1 = counter icons only            (Act 2)
   2 = cryptic clue only             (Acts 3–4, pure deduction) */
function disclosure(act) { return Math.min(act - 1, 2); }
/* Heat added by a misstep escalates each act. */
export function heatScale(act) { return 6 + act * 2; } // 8,10,12,14

const SLOT_ROLES = ['Arrival Hazard', 'Ally Test', 'Cryptic Artifact', 'Chase / Stealth', 'Lockbox'];

/* ── hazard library ─────────────────────────────────────────────────
   need     : traits that COUNTER the hazard  → GOOD
   backfire : traits that make it WORSE       → BAD
   clue     : deduction hint shown when icons are hidden          */
const HAZARDS = {
  /* slot 0 — Arrival Hazard */
  wildfire:  { role:0, label:'Wildfire',        prompt:c=>`Wildfire roars across the only path to ${c.landmark}!`,
               need:['water','ice','cold'], backfire:['fire','heat'],
               clue:'Only water or ice can smother these flames — fire only feeds them.' },
  flood:     { role:0, label:'Flash Flood',     prompt:c=>`A flash flood has swallowed the road to ${c.landmark}.`,
               need:['flight','jump','swing'], backfire:['fire','heat'],
               clue:'Take to the air or leap the torrent; flames just fizzle out.' },
  blizzard:  { role:0, label:'Blizzard',        prompt:c=>`A freezing blizzard buries the trail near ${c.landmark}.`,
               need:['fire','heat','electric'], backfire:['ice','cold','water'],
               clue:'Bring fire or a spark to thaw the way; cold deepens the freeze.' },
  sandstorm: { role:0, label:'Sandstorm',       prompt:c=>`A blinding sandstorm whips across the dunes before ${c.landmark}.`,
               need:['wind','flight','water'], backfire:['fire','heat'],
               clue:'Ride the wind above the sand, or douse it; heat makes it choke.' },
  storm:     { role:0, label:'Lightning Storm', prompt:c=>`A violent thunderstorm hammers the approach to ${c.landmark}.`,
               need:['agility','flight','jump'], backfire:['electric','water'],
               clue:'Stay nimble and airborne; anything that draws current is doomed.' },
  chasm:     { role:0, label:'Yawning Chasm',   prompt:c=>`A bottomless chasm splits the road to ${c.landmark}.`,
               need:['jump','flight','swing','agility'], backfire:['strength'],
               clue:'Leap, swing, or fly across — brute weight will plummet.' },
  quake:     { role:0, label:'Rockslide',       prompt:c=>`An earthquake sends boulders crashing toward ${c.landmark}!`,
               need:['strength','bite','jump'], backfire:['fire','explosive'],
               clue:'Raw strength clears the rubble; blasts only bring more down.' },

  /* slot 1 — Ally Test */
  befriend:  { role:1, label:'Wary Local',      prompt:c=>`A wary local guards the route through ${c.landmark}.`,
               need:['calm','light','sonic'], backfire:['fear','fire','explosive','poison'],
               clue:'Approach gently — a calm or radiant friend; never one that frightens.' },
  rescue:    { role:1, label:'Stranded Traveller', prompt:c=>`A traveller is stranded near ${c.landmark} and needs rescuing.`,
               need:['strength','water','flight'], backfire:['fear','poison'],
               clue:'Pull them to safety with strength, water, or wings.' },
  calmbeast: { role:1, label:'Panicked Beast',  prompt:c=>`A panicked beast blocks the way at ${c.landmark}, thrashing in fear.`,
               need:['calm','light','sonic','stun'], backfire:['fire','attack','explosive'],
               clue:'Soothe or stun it; aggression gets someone hurt.' },

  /* slot 2 — Cryptic Artifact */
  cipher:    { role:2, label:'Cryptic Cipher',  prompt:c=>`An ancient cipher seals a clue hidden at ${c.landmark}.`,
               need:['precision','light','throw'], backfire:['strength','explosive','loud'],
               clue:'Only a precise, delicate touch will do; force or noise shatters it.' },
  relic:     { role:2, label:'Fragile Relic',   prompt:c=>`A fragile relic at ${c.landmark} must be lifted without a scratch.`,
               need:['precision','calm','light'], backfire:['strength','explosive','fire','loud'],
               clue:'Lift it with a steady, quiet, careful hand.' },

  /* slot 3 — Chase / Stealth */
  chase:     { role:3, label:'Hot Pursuit',     prompt:c=>`A thief bolts with a gold chest across ${c.landmark}!`,
               need:['speed','agility','flight','dive'], backfire:['strength','constrict','poison'],
               clue:'Outrun them — speed, agility, or wings; the slow lose the trail.' },
  stealth:   { role:3, label:'Silent Approach', prompt:c=>`Guards patrol the vault yard at ${c.landmark}.`,
               need:['stealth','agility','flight'], backfire:['loud','sonic','explosive'],
               clue:'Move in silence; any loud companion gives you away.' },
  ambush:    { role:3, label:'Sprung Ambush',   prompt:c=>`Bandits spring an ambush on the road from ${c.landmark}!`,
               need:['agility','speed','flight','stun'], backfire:['strength','constrict'],
               clue:'React fast or stun them first; the heavy-footed get cornered.' },

  /* slot 4 — Lockbox / Boss */
  lockbox:   { role:4, label:'Iron Lockbox',    prompt:c=>`The gold lies inside a massive iron lockbox beneath ${c.landmark}.`,
               need:['strength','explosive','bite','electric'], backfire:['calm','light','stealth'],
               clue:'Smash, blast, or shock it open; gentle touches won\'t budge iron.' },
  boss:      { role:4, label:'Vault Guardian',  prompt:c=>`A monstrous Vault Guardian protects the final chest at ${c.landmark}!`,
               need:['attack','strength','electric','fire','dive'], backfire:['calm','light','stealth'],
               clue:'Hit it with everything — power, claws, lightning, fire.' }
};

const SLOT_POOLS = [
  ['wildfire','flood','blizzard','sandstorm','storm','chasm','quake'],
  ['befriend','rescue','calmbeast'],
  ['cipher','relic'],
  ['chase','stealth','ambush'],
  ['lockbox','boss']
];
const BIOME_HAZARD = { fire:'wildfire', ice:'blizzard', sand:'sandstorm',
                       flood:'flood', storm:'storm', chasm:'chasm', quake:'quake' };

function hazardKeyFor(countryIndex, slotIndex) {
  const c = _countries[countryIndex];
  if (slotIndex === 0 && BIOME_HAZARD[c.biome]) return BIOME_HAZARD[c.biome];
  const pool = SLOT_POOLS[slotIndex];
  return pool[(countryIndex + slotIndex) % pool.length];
}

function hasAny(pet, traits) { return pet.tags.some(t => traits.includes(t)); }

/* Build the full puzzle config for a country + slot. */
export function buildPuzzle(countryIndex, slotIndex) {
  const country = _countries[countryIndex];
  const key  = hazardKeyFor(countryIndex, slotIndex);
  const hz   = HAZARDS[key];
  const act  = actOf(countryIndex);
  const disc = disclosure(act);

  const good = [], bad = [], normal = [];
  for (const p of getPetArray()) {
    if (hasAny(p, hz.need))          good.push(p.id);
    else if (hasAny(p, hz.backfire)) bad.push(p.id);
    else                             normal.push(p.id);
  }

  return {
    id: `${country.code}-S${slotIndex + 1}`,
    country, slotIndex, act,
    role: SLOT_ROLES[slotIndex],
    label: hz.label,
    hazard: key,
    prompt: hz.prompt(country),
    clue: hz.clue,
    need: hz.need,
    backfire: hz.backfire,
    disclosure: disc,            // 0 show need+backfire, 1 show need, 2 clue only
    isBoss: slotIndex === 4,
    good, normal, bad
  };
}

export function classify(petId, puzzle) {
  if (puzzle.good.includes(petId)) return 'good';
  if (puzzle.bad.includes(petId))  return 'bad';
  return 'normal';
}

const RESULT_TEXT = {
  good:   p => `Perfect counter! Your companion dispatches ${p.label.toLowerCase()} cleanly and slips away unseen.`,
  normal: p => `A clumsy half-measure. You scrape past ${p.label.toLowerCase()}, but you've drawn eyes.`,
  bad:    p => `The worst possible choice! ${p.label} turns disastrous — alarms ring out across the land.`
};
export function resultText(tier, puzzle) { return RESULT_TEXT[tier](puzzle); }
