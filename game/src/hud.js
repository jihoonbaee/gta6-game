export function createHud(city) {
  const $ = id => document.getElementById(id);
  const map = $('map');
  const ctx = map.getContext('2d');
  let toastTimer = 0;
  let shiftStartCash = city.cash;
  let shiftSeconds = 0;

  function toast(message, duration = 2200) {
    $('toast-text').textContent = message;
    $('toast').classList.add('show');
    toastTimer = duration / 1000;
  }

  function resetShift() {
    shiftStartCash = city.cash;
    shiftSeconds = 0;
    toastTimer = 0;
    $('toast').classList.remove('show');
  }

  function areaName(position) {
    if (position.z < -80) return 'EAST QUAY';
    if (position.x > 115) return 'TIDELINE AVENUE';
    if (position.z > 80) return 'SOUTH MERIDIAN';
    return 'PORT MERIDIAN';
  }

  function targetPosition(mission, world) {
    if (!mission) return null;
    if (mission.type === 'car') return world.car.position;
    return { x: mission.target[0], z: mission.target[1] };
  }

  function drawMap(mission, world) {
    ctx.clearRect(0, 0, 208, 208);
    ctx.fillStyle = '#203b3d';
    ctx.fillRect(0, 0, 208, 208);
    const s = 208 / 500;
    const mapPoint = (x, z) => ({ x: (x + 250) * s, y: (z + 250) * s });
    for (let i = -4; i <= 4; i++) {
      const p = (i * 52 + 250) * s;
      ctx.fillStyle = '#667573';
      ctx.fillRect(p - 2.5, 0, 5, 208);
      ctx.fillRect(0, p - 2.5, 208, 5);
      ctx.fillStyle = '#d3c7a2';
      ctx.fillRect(p - 4, 0, 1, 208);
      ctx.fillRect(0, p - 4, 208, 1);
    }
    world.buildings.forEach(building => {
      ctx.fillStyle = '#6b8a7b';
      ctx.fillRect((building.x - building.w / 2 + 250) * s, (building.z - building.d / 2 + 250) * s, building.w * s, building.d * s);
    });
    world.traffic.slice(0, 12).forEach(traffic => {
      const point = mapPoint(traffic.mesh.position.x, traffic.mesh.position.z);
      ctx.fillStyle = '#e0ac72';
      ctx.fillRect(point.x - 1, point.y - 1, 3, 3);
    });
    world.cops.forEach(cop => {
      if (!cop.active) return;
      const point = mapPoint(cop.mesh.position.x, cop.mesh.position.z);
      ctx.fillStyle = '#fa5f55';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    const target = targetPosition(mission, world);
    if (target) {
      const point = mapPoint(target.x, target.z);
      ctx.fillStyle = '#f5c967';
      ctx.strokeStyle = '#fff1bc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const actor = world.activeActor();
    const player = mapPoint(actor.position.x, actor.position.z);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(world.inCar ? world.activeVehicle.rotation.y : world.player.rotation.y);
    ctx.fillStyle = '#f3dc99';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#d5b970';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  function showProfileNote() {
    try {
      if (localStorage.getItem('neon-harbor-save')) $('profile-note').hidden = false;
    } catch {}
  }

  function step(dt, world, missions) {
    const mission = missions.current();
    shiftSeconds += Math.max(0, dt);
    const totalMinutes = 17 * 60 + 42 + Math.floor(shiftSeconds / 2);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    $('clock').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    $('cash').textContent = Math.max(0, world.cash).toLocaleString('en-US');
    $('shift-earnings').textContent = `+$${Math.max(0, world.cash - shiftStartCash).toLocaleString('en-US')} THIS SHIFT`;
    $('health-text').textContent = `${Math.round(world.health)}%`;
    $('health-bar').style.width = `${world.health}%`;
    $('focus-text').textContent = `${Math.round(world.focus)}%`;
    $('focus-bar').style.width = `${world.focus / 80 * 100}%`;
    $('ammo').textContent = `${world.ammo} / ∞`;
    $('speed').textContent = String(Math.round(world.speed * 3.6)).padStart(3, '0');
    const signedSpeed = world.inCar ? (world.activeVehicle.userData.speed || 0) : 0;
    $('gear').textContent = world.inCar ? (Math.abs(signedSpeed) < .15 ? 'P' : signedSpeed < 0 ? 'R' : 'D') : 'P';
    $('vehicle-name').textContent = world.inCar ? 'SOLARIS VELA' : 'ON FOOT';
    $('vehicle-hud').hidden = !world.inCar;
    document.querySelectorAll('.stars b').forEach((star, i) => star.classList.toggle('on', i < Math.ceil(world.wanted)));
    $('heat-copy').textContent = world.wanted ? 'POLICE SEARCH ACTIVE' : 'QUIET STREETS';
    $('prompt').hidden = !world.nearCar;
    if (world.nearCar) $('prompt-text').textContent = 'STEAL VEHICLE';
    $('location').textContent = areaName(world.activeActor().position);
    document.querySelector('.combat-hint').hidden = world.inCar;
    if (mission) {
      $('mission-title').textContent = mission.title;
      $('mission-copy').textContent = mission.copy;
      $('objective-title').textContent = mission.objective;
      $('objective-sub').textContent = mission.sub;
      $('mission-code').textContent = `${String(missions.index + 1).padStart(2, '0')} / 04`;
      $('objective').textContent = `${String(missions.index + 1).padStart(2, '0')}`;
    }
    const position = world.activeActor().position;
    $('coords').textContent = `E ${String(Math.round((position.x + 250) / 52)).padStart(2, '0')} · N ${String(Math.round((250 - position.z) / 52)).padStart(2, '0')}`;
    drawMap(mission, world);
    showProfileNote();
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('toast').classList.remove('show');
    }
  }

  showProfileNote();
  return { step, toast, resetShift };
}
