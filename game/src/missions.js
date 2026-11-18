const jobs = [
  { title: 'A LIGHTER TOUCH', copy: 'Take the marked sedan and get behind the wheel.', objective: 'Steal the marked sedan', sub: 'Enter the amber-marked vehicle', type: 'car', reward: 850 },
  { title: 'HARBOR RUN', copy: 'Drive the marked sedan to Pier 04.', objective: 'Drive to Pier 04', sub: 'Reach the marked pier in the vehicle', type: 'drive', target: [-52, -104], reward: 1200 },
  { title: 'GHOST IN THE WIRES', copy: 'Leave the car and walk to the East Quay meeting point.', objective: 'Walk to the meeting point', sub: 'Reach the marked point on foot', type: 'walk', target: [53, -49], reward: 1650 },
  { title: 'NO CLEAN EXIT', copy: 'Survive the pursuit, lose the wanted level, and reach the safehouse.', objective: 'Reach the safehouse', sub: 'Be chased first, then arrive with no wanted stars', type: 'escape', target: [-104, 53], reward: 2400 },
];

export function createMissions(city, hud) {
  let index = 0;
  let progress = 0;
  let active = false;
  let complete = false;
  let victory = false;
  let activateCooldown = 0;
  let saveTimer = 0;
  let escapeWasWanted = false;
  let bannerTimer = null;

  const banner = () => document.querySelector('#mission-complete');

  function hideBanner() {
    if (bannerTimer !== null) {
      clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    banner()?.classList.add('hidden');
  }

  function vehicleSave() {
    if (!city.inCar) return { actor: 'player', player: { x: city.player.position.x, z: city.player.position.z } };
    return {
      actor: 'vehicle',
      vehicleId: city.activeVehicle === city.car ? 'car' : null,
      vehicle: { x: city.activeVehicle.position.x, z: city.activeVehicle.position.z, rotation: city.activeVehicle.rotation.y },
      player: { x: city.player.position.x, z: city.player.position.z },
    };
  }

  function save() {
    try {
      const actor = vehicleSave();
      localStorage.setItem('neon-harbor-save', JSON.stringify({
        index,
        cash: city.cash,
        health: city.health,
        victory,
        ...actor,
      }));
    } catch {}
  }

  function restoreVehicle(data) {
    if (data.actor !== 'vehicle' || data.vehicleId !== 'car' || !data.vehicle) return false;
    const x = Number(data.vehicle.x);
    const z = Number(data.vehicle.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    city.car.position.set(x, 0, z);
    if (Number.isFinite(Number(data.vehicle.rotation))) city.car.rotation.y = Number(data.vehicle.rotation);
    const playerX = Number(data.player?.x);
    const playerZ = Number(data.player?.z);
    city.player.position.set(Number.isFinite(playerX) ? playerX : x + 2.4, 0, Number.isFinite(playerZ) ? playerZ : z + 2.4);
    if (city.player.position.distanceTo(city.car.position) > 4.2) city.player.position.set(x + 2.4, 0, z);
    return city.stealNearest();
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem('neon-harbor-save'));
      if (!data || !Number.isInteger(data.index)) return false;
      index = Math.min(jobs.length - 1, Math.max(0, data.index));
      city.cash = typeof data.cash === 'number' ? Math.max(0, data.cash) : 2450;
      if (typeof data.health === 'number' && Number.isFinite(data.health)) city.health = Math.max(0, Math.min(100, data.health));
      else city.health = 100;
      victory = data.victory === true;
      if (!restoreVehicle(data)) {
        const x = Number(data.player?.x ?? data.x);
        const z = Number(data.player?.z ?? data.z);
        if (Number.isFinite(x) && Number.isFinite(z)) city.player.position.set(x, 0, z);
      }
      if (victory) {
        active = false;
        complete = true;
        showVictory();
      } else activate();
      return true;
    } catch {
      return false;
    }
  }

  function current() {
    return jobs[index];
  }

  function activate() {
    if (victory) return;
    const job = current();
    active = true;
    complete = false;
    progress = 0;
    activateCooldown = .28;
    escapeWasWanted = false;
    const position = city.activeActor().position;
    const destination = job.type === 'car' ? [city.car.position.x, city.car.position.z] : job.target;
    city.makeRoute([[position.x, position.z], [position.x, destination[1]], destination]);
  }

  function showVictory() {
    const panel = banner();
    if (!panel) return;
    panel.classList.add('victory');
    panel.querySelector('span').textContent = 'SHIFT COMPLETE';
    const reward = panel.querySelector('b');
    const rewardAmount = panel.querySelector('i');
    if (rewardAmount) rewardAmount.textContent = '';
    reward.textContent = 'VICTORY';
    panel.querySelector('small').textContent = 'PORT MERIDIAN IS YOURS';
    panel.classList.remove('hidden');
  }

  function finish() {
    const job = current();
    city.cash += job.reward;
    active = false;
    complete = true;
    document.querySelector('#reward').textContent = job.reward.toLocaleString('en-US');
    const panel = banner();
    panel?.classList.remove('victory', 'hidden');
    hud.toast(`${job.title} COMPLETE · $${job.reward.toLocaleString()}`, 3000);
    if (index === jobs.length - 1) {
      victory = true;
      showVictory();
      save();
      return;
    }
    bannerTimer = setTimeout(() => {
      bannerTimer = null;
      if (!victory) panel?.classList.add('hidden');
    }, 2600);
    index += 1;
    activate();
    save();
  }

  function step(dt) {
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      save();
    }
    if (victory) return;
    if (!active) {
      activate();
      return;
    }
    activateCooldown = Math.max(0, activateCooldown - dt);
    const job = current();
    if (job.type === 'escape' && city.wanted > 0) escapeWasWanted = true;
    if (activateCooldown > 0) return;
    const position = city.activeActor().position;
    if (job.type === 'car') {
      const markedCar = city.inCar && city.activeVehicle === city.car;
      if (markedCar) finish();
    } else if (job.type === 'drive' && city.inCar && Math.hypot(position.x - job.target[0], position.z - job.target[1]) < 13) finish();
    else if (job.type === 'walk' && !city.inCar && Math.hypot(position.x - job.target[0], position.z - job.target[1]) < 9) finish();
    else if (job.type === 'escape' && escapeWasWanted && city.wanted <= 0 && Math.hypot(position.x - job.target[0], position.z - job.target[1]) < 14) finish();
  }

  function reset() {
    hideBanner();
    index = 0;
    active = false;
    complete = false;
    victory = false;
    progress = 0;
    activateCooldown = 0;
    saveTimer = 0;
    escapeWasWanted = false;
    activate();
  }

  return {
    step,
    reset,
    current,
    activate,
    save,
    load,
    get index() { return index; },
    set index(value) { if (Number.isInteger(value)) index = Math.max(0, Math.min(jobs.length - 1, value)); },
    get progress() { return progress; },
    get active() { return active; },
    get complete() { return complete; },
  };
}
