/* minigame registry */
import quickdraw from './quickdraw.js';
import tugofwar from './tugofwar.js';
import powerstrike from './powerstrike.js';
import memory from './memory.js';
import dodge from './dodge.js';
import blitz from './blitz.js';
import rhythm from './rhythm.js';
import boss from './boss.js';

export const GAMES = { quickdraw, tugofwar, powerstrike, memory, dodge, blitz, rhythm, boss };
export const getGame = id => GAMES[id] || quickdraw;
