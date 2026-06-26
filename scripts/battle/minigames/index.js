/* minigame registry */
import quickdraw from './quickdraw.js';
import tugofwar from './tugofwar.js';
import powerstrike from './powerstrike.js';
import memory from './memory.js';
import dodge from './dodge.js';
import blitz from './blitz.js';
import rhythm from './rhythm.js';
import catchgame from './catch.js';
import swipe from './swipe.js';
import charge from './charge.js';
import balance from './balance.js';
import slingshot from './slingshot.js';
import sharpshooter from './sharpshooter.js';
import freezeframe from './freezeframe.js';
import glider from './glider.js';
import iceslide from './iceslide.js';
import paddle from './paddle.js';
import sonicring from './sonicring.js';
import divedodge from './divedodge.js';
import clawdrop from './clawdrop.js';
import hotfloor from './hotfloor.js';
import snaketrail from './snaketrail.js';
import unwind from './unwind.js';
import trace from './trace.js';
import kingfight from './kingfight.js';
import boss from './boss.js';
import bossduel from './bossduel.js';
import pedalrace from './pedalrace.js';
import ropejump from './ropejump.js';
import slabgap from './slabgap.js';
import pitchwail from './pitchwail.js';

export const GAMES = {
  quickdraw, tugofwar, powerstrike, memory, dodge, blitz, rhythm,
  catch: catchgame, swipe, charge, balance, slingshot, sharpshooter,
  freezeframe, glider, iceslide, paddle, sonicring, divedodge,
  clawdrop, hotfloor, snaketrail, unwind, trace, kingfight, boss, bossduel,
  pedalrace, ropejump, slabgap, pitchwail
};
export const getGame = id => GAMES[id] || quickdraw;
