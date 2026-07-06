/* viewer.js — a full-screen 3D model inspector for the Mystery Box
   collection. Lazy-loads the vendored three.js stack only when opened,
   frames the GLB automatically, and lets the player orbit / pinch-zoom.
   The champion's entrance roar plays as the model appears. */

import { el, sfx, S, buzz } from './util.js';

let opening = false;   // guard against double-taps while three.js loads

export async function openModelViewer(info, url) {
  if (opening) return; opening = true;
  const overlay = el('div', 'mv-overlay', `
    <div class="mv-top">
      <div class="mv-title"><b>${info.name}</b><span class="mv-epithet">${info.epithet || ''}</span></div>
      <button class="mv-close" aria-label="Close">✕</button>
    </div>
    <div class="mv-stage">
      <div class="mv-loading" id="mvload">
        <img class="mv-poster" src="assets/img/characters/${encodeURIComponent(info.img)}" alt="">
        <div class="mv-bar"><div class="mv-fill"></div></div>
        <div class="mv-pct">Summoning… 0%</div>
      </div>
    </div>
    <div class="mv-foot">
      <button class="btn btn-2 mv-roar">🔊 Roar</button>
      <span class="mv-hint">drag to spin · pinch or scroll to zoom</span>
    </div>`);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  sfx(info.sfx, 0.85); buzz(15);
  overlay.querySelector('.mv-roar').addEventListener('pointerdown', e => { e.preventDefault(); sfx(info.sfx, 0.85); });

  let alive = true, raf = 0, renderer = null, scene = null, cleanupSize = null;
  const close = () => {
    if (!alive) return; alive = false;
    cancelAnimationFrame(raf);
    if (cleanupSize) cleanupSize();
    if (scene) scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
        m.dispose();
      });
    });
    if (renderer) renderer.dispose();
    overlay.classList.remove('in');
    setTimeout(() => overlay.remove(), 220);
  };
  overlay.querySelector('.mv-close').addEventListener('pointerdown', e => { e.preventDefault(); S.ui(); close(); });

  const loadEl = overlay.querySelector('#mvload');
  const fillEl = overlay.querySelector('.mv-fill');
  const pctEl = overlay.querySelector('.mv-pct');
  const stage = overlay.querySelector('.mv-stage');

  try {
    const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
      import('three'),
      import('../vendor/loaders/GLTFLoader.js'),
      import('../vendor/controls/OrbitControls.js'),
      import('../vendor/environments/RoomEnvironment.js'),
      import('../vendor/libs/meshopt_decoder.module.js')   // the models ship meshopt-compressed
    ]);
    if (!alive) { opening = false; return; }

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.className = 'mv-canvas';
    stage.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(2, 4, 3); scene.add(key);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = true; controls.autoRotateSpeed = 2.4;
    controls.enablePan = false;

    const size = () => {
      const r = stage.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    };
    size(); window.addEventListener('resize', size);
    cleanupSize = () => window.removeEventListener('resize', size);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await new Promise((res, rej) => {
      loader.load(url, res, xhr => {
        if (!xhr.total) return;
        const p = Math.min(100, Math.round(xhr.loaded / xhr.total * 100));
        fillEl.style.width = p + '%'; pctEl.textContent = `Summoning… ${p}%`;
      }, rej);
    });
    if (!alive) { opening = false; return; }

    const model = gltf.scene;
    // frame it: centre on origin, then back the camera off by its size
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    model.position.sub(c);
    scene.add(model);
    const dist = Math.max(s.x, s.y, s.z) * 1.45;
    camera.position.set(dist * 0.75, dist * 0.45, dist);
    controls.minDistance = dist * 0.45; controls.maxDistance = dist * 2.6;
    controls.update();

    loadEl.remove();
    overlay.classList.add('ready');
    S.good(); buzz(20);

    const tick = () => {
      if (!alive) return;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch (err) {
    console.warn('[viewer] could not load model', err);
    if (alive) {
      pctEl.textContent = 'Hmm — this model refused to appear. Try again!';
      fillEl.style.width = '0%';
    }
  }
  opening = false;
}
