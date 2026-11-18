import { createCity } from './world.js';
import { createHud } from './hud.js';
import { createMissions } from './missions.js';

const THREE = window.THREE;
const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9acbd3');
scene.fog = new THREE.Fog('#9acbd3', 120, 520);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .1, 900);
const hemi = new THREE.HemisphereLight('#d9f6f0', '#5d6855', 2.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0cf', 3.4);
sun.position.set(-92, 148, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -110; sun.shadow.camera.right = 110; sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
sun.shadow.bias = -.00015;
scene.add(sun);

const city = createCity(THREE, scene);
const hud = createHud(city);
const missions = createMissions(city, hud);
const clock = new THREE.Clock();
const keys = new Set();
let running = false;
let paused = false;
let lastInteract = false;
let lastFire = false;
let yaw = Math.PI;
let cameraDistance = 13;
let pointerLocked = false;
let shotMode = new URLSearchParams(location.search).get('shot');
let firstFrameRendered = false;
let shotFrozen = false;

function setScreen(screen) {
  running = screen === 'play';
  paused = screen === 'pause';
  document.querySelector('#overlay').classList.toggle('hidden', screen !== 'title');
  document.querySelector('#pause').classList.toggle('hidden', screen !== 'pause');
  if (paused && document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  if (running && !shotMode && canvas.requestPointerLock && navigator.userActivation.isActive) canvas.requestPointerLock()?.catch(() => {});
}

document.querySelector('#start-button').addEventListener('click', () => { city.reset(); missions.reset(); missions.load(); hud.resetShift(); setScreen('play'); hud.toast('PORT MERIDIAN IS YOURS. MAKE IT COUNT.', 2600); });
document.querySelector('#resume-button').addEventListener('click', () => setScreen('play'));
document.querySelector('#pause-button').addEventListener('click', () => { if (running || paused) setScreen(paused ? 'play' : 'pause'); });
document.querySelector('#restart-button').addEventListener('click', () => { city.reset(); missions.reset(); missions.load(); hud.resetShift(); setScreen('play'); });
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === canvas; });
document.addEventListener('mousemove', event => { if (running && !paused && pointerLocked) yaw -= event.movementX * .0024; });
document.addEventListener('wheel', event => { if (running && !paused) cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(event.deltaY) * .7, 4, 14); }, { passive: true });
document.addEventListener('keydown', event => {
  if (event.code === 'Escape') {
    if (event.repeat || shotMode || document.querySelector('#overlay').classList.contains('hidden') === false) return;
    event.preventDefault();
    if (running || paused) setScreen(paused ? 'play' : 'pause');
    return;
  }
  if (running && !paused) keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
}, { passive: false });
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('mousedown', event => { if (event.button === 2 && running && !paused) city.aiming = !city.aiming; });
document.addEventListener('mousedown', event => { if (event.button === 0 && running && !paused) keys.add('Mouse0'); });
document.addEventListener('mouseup', () => keys.delete('Mouse0'));

function cameraUpdate(dt) {
  const actor = city.activeActor();
  const heading = city.inCar ? city.activeVehicle.rotation.y + Math.PI : yaw;
  const aimYaw = city.aiming ? yaw : heading;
  const focus = actor.position.clone(); focus.y += city.inCar ? 1.35 : 1.45;
  const distance = city.inCar ? cameraDistance * 1.12 : cameraDistance * .65;
  const target = new THREE.Vector3(focus.x + Math.sin(aimYaw) * distance, focus.y + (city.inCar ? 5.5 : 3.6), focus.z + Math.cos(aimYaw) * distance);
  const smooth = 1 - Math.pow(.001, dt);
  camera.position.lerp(target, smooth);
  const look = focus.clone().add(new THREE.Vector3(-Math.sin(aimYaw) * 3.2, .45, -Math.cos(aimYaw) * 3.2));
  camera.lookAt(look);
}

function frame() {
  requestAnimationFrame(frame);
  if (shotFrozen) return;
  const dt = Math.min(clock.getDelta(), .05);
  const move = { x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0), z: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0), sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') };
  const interact = keys.has('KeyE');
  const fire = keys.has('Space') || keys.has('KeyF') || keys.has('Mouse0');
  if (running) {
    city.step(dt, move, yaw, interact && !lastInteract, fire && !lastFire, keys.has('KeyR'));
    if (!shotMode) missions.step(dt);
    hud.step(dt, city, missions);
  } else if (!paused) city.step(dt * .18, { x: 0, z: 0, sprint: false }, yaw, false, false, false);
  lastInteract = interact; lastFire = fire;
  cameraUpdate(dt);
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    if (shotMode) { shotFrozen = true; window.__shotReady = true; }
  }
}

function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);

function advance(seconds, input = { x: 0, z: 0, sprint: false }, interact = false, fire = false) {
  let remaining = Math.max(0, Number(seconds) || 0);
  let first = true;
  while (remaining > 0) {
    const dt = Math.min(1 / 60, remaining);
    city.step(dt, input, yaw, interact && first, fire && first, false);
    if (!shotMode && running) missions.step(dt);
    remaining -= dt;
    first = false;
  }
  if (running) hud.step(Math.max(0, Number(seconds) || 0), city, missions);
  cameraUpdate(Math.max(0, Number(seconds) || 0));
  renderer.render(scene, camera);
}

window.neonHarbor = {
  city, missions, renderer, scene, camera, keys,
  start() { city.reset(); missions.reset(); missions.load(); hud.resetShift(); setScreen('play'); },
  advance,
  get running() { return running; },
  get paused() { return paused; },
  save: () => shotMode ? false : missions.save(),
  setYaw(v) { yaw = v; }
};

if (shotMode) {
  setScreen('play'); city.reset(); missions.reset(); hud.resetShift();
  if (shotMode === 'car') { city.player.position.copy(city.car.position); city.stealNearest(); city.car.position.set(3, 0, 22); city.car.rotation.y = Math.PI + .08; }
  if (shotMode === 'police') { city.player.position.set(4, 0, 4); city.wanted = 3; city.spawnPolice(); }
  if (shotMode === 'mission') { city.player.position.set(0, 0, 20); missions.index = 2; missions.activate(); }
  if (shotMode === 'play') { city.player.position.copy(city.car.position); city.stealNearest(); city.car.position.set(3, 0, 22); city.car.rotation.y = Math.PI + .04; city.wanted = 2; city.spawnPolice(); city.cops[0].mesh.position.set(-3, 0, 1); city.cops[1].mesh.position.set(-3, 0, -18); }
  if (shotMode === 'menu') setScreen('title');
} else setScreen('title');
requestAnimationFrame(frame);
