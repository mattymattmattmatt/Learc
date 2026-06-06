/* engine.js — data-driven content engine for King's Gold
   ----------------------------------------------------------------
   Generates a themed puzzle for any (country, slot) pair from a set
   of reusable archetype templates, and matches the 24 pets into
   GOOD / NORMAL / BAD tiers using their ability tags.

   This is what lets 30 countries x 5 slots = 150 encounters exist
   without 150 hand-written files, while still feeling authored:
   each slot has a fixed *role* (per the GDD puzzle matrix) and each
   country rotates through themed hazards.
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

/* ── pet asset helper ───────────────────────────────────────────── */
export function petSfx(pet) {
  // entrance sfx filenames are hyphenated (peeta-heater_entrance.wav)
  const base = pet.sprite.replace(/^char_/, '').replace(/\.webp$/, '');
  return `assets/audio/${base}_entrance.wav`;
}

/* ── archetype templates ────────────────────────────────────────────
   Each slot (0-4) maps to the GDD role and offers a pool of hazards.
   goodTags  → pets matching these solve it brilliantly (GOOD)
   badTags   → pets matching these make things worse (BAD)
   everyone else is a NORMAL (acceptable) outcome.
*/
const SLOT_ROLES = ['Arrival Hazard', 'Ally Test', 'Cryptic Artifact', 'Chase / Stealth', 'Lockbox'];

const ARCHETYPES = {
  // ── Slot 0: Arrival Hazard ──────────────────────────────────────
  fire:  { role: 0, label: 'Wildfire',
           prompt: c => `Wildfire roars across the only path to ${c.landmark}! Which companion clears a safe way through?`,
           good: ['water','ice','cold'], bad: ['fire','heat'] },
  flood: { role: 0, label: 'Flash Flood',
           prompt: c => `A flash flood has swallowed the road to ${c.landmark}. Who can carry you across the torrent?`,
           good: ['water','flight','jump','swim'], bad: ['fire','heat'] },
  ice:   { role: 0, label: 'Blizzard',
           prompt: c => `A freezing blizzard buries the trail near ${c.landmark}. Which companion melts a path?`,
           good: ['fire','heat'], bad: ['ice','cold','water'] },
  sand:  { role: 0, label: 'Sandstorm',
           prompt: c => `A blinding sandstorm whips across the dunes before ${c.landmark}. Who can push the sand aside?`,
           good: ['wind','water','flight'], bad: ['fire','heat'] },
  storm: { role: 0, label: 'Lightning Storm',
           prompt: c => `A violent thunderstorm hammers the approach to ${c.landmark}. Which companion shrugs off the gale?`,
           good: ['wind','flight'], bad: ['electric','water'] },
  chasm: { role: 0, label: 'Yawning Chasm',
           prompt: c => `A bottomless chasm splits the road to ${c.landmark}. Who gets you to the far side?`,
           good: ['jump','flight','agility','swing'], bad: ['strength','fire'] },
  quake: { role: 0, label: 'Rockslide',
           prompt: c => `An earthquake sends boulders crashing down toward ${c.landmark}! Who can clear the rubble?`,
           good: ['strength','jump','bite'], bad: ['fire','explosive'] },

  // ── Slot 1: Ally Test ───────────────────────────────────────────
  befriend: { role: 1, label: 'Wary Local',
              prompt: c => `A wary local guards the route through ${c.landmark}. Win their trust — gently!`,
              good: ['calm','light','sonic'], bad: ['fear','fire','explosive'] },
  rescue:   { role: 1, label: 'Stranded Traveller',
              prompt: c => `A traveller is stranded near ${c.landmark} and needs rescuing fast. Who can help?`,
              good: ['strength','water','flight','swing'], bad: ['fear','poison'] },

  // ── Slot 2: Cryptic Artifact ────────────────────────────────────
  cipher:  { role: 2, label: 'Cryptic Cipher',
             prompt: c => `An ancient cipher seals a clue hidden at ${c.landmark}. Precision is everything — who decodes it?`,
             good: ['precision','light','throw'], bad: ['strength','explosive','fire'] },
  relic:   { role: 2, label: 'Fragile Relic',
             prompt: c => `A fragile relic at ${c.landmark} must be lifted without a scratch. Whose touch is delicate enough?`,
             good: ['precision','calm','light'], bad: ['loud','explosive','strength'] },

  // ── Slot 3: Chase / Stealth ─────────────────────────────────────
  chase:   { role: 3, label: 'Hot Pursuit',
             prompt: c => `A thief bolts with a gold chest across ${c.landmark}! Who is fast enough to catch them?`,
             good: ['speed','agility','flight','dive'], bad: ['strength','constrict'] },
  stealth: { role: 3, label: 'Silent Approach',
             prompt: c => `Guards patrol the vault yard at ${c.landmark}. Slip past unseen — who moves in silence?`,
             good: ['stealth','agility','flight'], bad: ['loud','sonic','explosive'] },

  // ── Slot 4: Lockbox / Boss ──────────────────────────────────────
  lockbox: { role: 4, label: 'Iron Lockbox',
             prompt: c => `The gold lies inside a massive iron lockbox beneath ${c.landmark}. Who can crack it open?`,
             good: ['strength','explosive','bite','electric'], bad: ['calm','light'] },
  boss:    { role: 4, label: 'Vault Guardian',
             prompt: c => `A monstrous Vault Guardian protects the final chest at ${c.landmark}! Who lands the decisive blow?`,
             good: ['attack','fire','electric','strength','dive'], bad: ['calm','stealth'] }
};

/* Pools per slot — countries rotate through these for variety. */
const SLOT_POOLS = [
  ['fire', 'flood', 'ice', 'sand', 'storm', 'chasm', 'quake'], // 0 arrival
  ['befriend', 'rescue'],                                       // 1 ally
  ['cipher', 'relic'],                                          // 2 artifact
  ['chase', 'stealth'],                                         // 3 chase
  ['lockbox', 'boss']                                           // 4 lockbox
];

/* Pick an archetype key for a given country+slot deterministically. */
function archetypeFor(countryIndex, slotIndex) {
  const country = _countries[countryIndex];
  if (slotIndex === 0 && country.biome && ARCHETYPES[country.biome]) {
    return country.biome;                 // honour country's signature hazard
  }
  const pool = SLOT_POOLS[slotIndex];
  // offset by slot so adjacent countries don't all share the same combo
  return pool[(countryIndex + slotIndex) % pool.length];
}

function hasTag(pet, tags) { return pet.tags.some(t => tags.includes(t)); }

/* Build the full puzzle config for a country+slot. */
export function buildPuzzle(countryIndex, slotIndex) {
  const country = _countries[countryIndex];
  const key     = archetypeFor(countryIndex, slotIndex);
  const arch    = ARCHETYPES[key];
  const pets    = getPetArray();

  const good = [], bad = [], normal = [];
  for (const p of pets) {
    if (hasTag(p, arch.good))      good.push(p.id);
    else if (hasTag(p, arch.bad))  bad.push(p.id);
    else                           normal.push(p.id);
  }

  return {
    id: `${country.code}-S${slotIndex + 1}`,
    country, slotIndex,
    role: SLOT_ROLES[slotIndex],
    label: arch.label,
    archetype: key,
    prompt: arch.prompt(country),
    good, normal, bad
  };
}

/* Classify a chosen pet for a given puzzle config. */
export function classify(petId, puzzle) {
  if (puzzle.good.includes(petId)) return 'good';
  if (puzzle.bad.includes(petId))  return 'bad';
  return 'normal';
}

/* Flavour result lines per tier. */
const RESULT_TEXT = {
  good:   p => `${p.label} solved! Your companion was the perfect choice — the way is clear and the gold is yours.`,
  normal: p => `You scrape through ${p.label.toLowerCase()}. Not elegant, but you recover a little gold and press on.`,
  bad:    p => `Disaster at ${p.label.toLowerCase()}! The wrong companion makes a scene — the local watch grows suspicious.`
};
export function resultText(tier, puzzle) { return RESULT_TEXT[tier](puzzle); }
