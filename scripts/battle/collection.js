/* collection.js — the Mystery Box roster: every collectable 3D model
   (all 24 champions + Glob's three henchmen + Evil King Glob himself),
   with the display info the spinner, gallery and 3D viewer need. */

import { allPets, getPet, flavor, BOSSES, GLOB } from './data.js';

/* spins earned for freeing the realm, by difficulty mode */
export const SPINS_BY_MODE = { story: 1, normal: 3, hard: 10 };

/* model files follow assets/3dModels/3d_<id>.glb — except these three */
const SPECIAL_FILE = {
  peeta_heater: '3d_peetaheater.glb',
  roger_dodger: '3d_rodgerdodger.glb',
  glob:         '3d_kingglob.glb'
};
export const modelUrl = id => 'assets/3dModels/' + (SPECIAL_FILE[id] || `3d_${id}.glb`);

/* the full roster, champions first, villains (the rare thrill) last */
export function modelRoster() {
  return [...allPets().map(p => p.id), 'minyar', 'demonder', 'clubbo', 'glob'];
}

/* everything a screen needs to show one collectable */
export function modelInfo(id) {
  if (id === 'glob') {
    return { id, name: GLOB.name, epithet: GLOB.epithet, img: GLOB.img, sfx: GLOB.sfx, villain: true };
  }
  if (BOSSES[id]) {
    const b = BOSSES[id];
    return { id, name: b.name, epithet: b.epithet, img: b.img, sfx: b.sfx, villain: true };
  }
  const p = getPet(id);
  return { id, name: p.name, epithet: flavor(id).epithet, img: p.sprite, sfx: p.sfx, villain: false };
}
