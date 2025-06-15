/*  scale.js  – auto-scale .title-card so it always fits  */

function applyScale() {
  const card = document.querySelector('.title-card');
  if (!card) return;

  /* Design reference size (same numbers used in CSS) */
  const DESIGN_W = 500;   // px
  const DESIGN_H = 350;   // px

  /* Use 95 % of viewport so we keep a little breathing room */
  const scaleW = (window.innerWidth  * 0.95) / DESIGN_W;
  const scaleH = (window.innerHeight * 0.95) / DESIGN_H;

  /* Choose the smaller scale so both width & height fit */
  const scale = Math.min(scaleW, scaleH, 1);   // never upscale beyond 1

  card.style.transform = `scale(${scale})`;
}

/* Re-run on first load, resize, and orientation change */
window.addEventListener('load',             applyScale);
window.addEventListener('resize',           applyScale);
window.addEventListener('orientationchange',applyScale);
export { applyScale };      // no one imports it, but keeps linter happy
