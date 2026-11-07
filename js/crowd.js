import * as THREE from 'three';
import { fillLayout } from './math.js';

const MAX = 100;
const PLATFORM_TOP = 0.5;
const TILE_H = 0.2;
const FEET_Y = PLATFORM_TOP + TILE_H;

const PALETTE = [
  [0.98, 0.32, 0.52],
  [0.16, 0.86, 0.78],
  [0.96, 0.95, 0.98],
  [0.16, 0.14, 0.18],
  [1, 0.62, 0.76],
  [0.24, 0.48, 0.58],
  [0.95, 0.78, 0.42],
  [0.62, 0.18, 0.36],
  [0.55, 0.84, 0.78],
  [0.9, 0.45, 0.36],
];

function colorsFor(index) {
  if (index === 0) {
    return {
      head: [0.98, 0.28, 0.48],
      torso: [0.97, 0.97, 0.99],
      limb: [0.15, 0.9, 0.82],
      tile: [0.1, 0.34, 0.32],
    };
  }
  return {
    head: PALETTE[index % PALETTE.length],
    torso: PALETTE[(index * 3 + 1) % PALETTE.length],
    limb: PALETTE[(index * 5 + 2) % PALETTE.length],
    tile: [0.24, 0.12, 0.18],
  };
}

function makeNumberAtlas() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cell = size / 10;
  for (let n = 0; n < MAX; n += 1) {
    const col = n % 10;
    const row = Math.floor(n / 10);
    const x = col * cell;
    const y = row * cell;
    ctx.fillStyle = '#161318';
    ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
    ctx.lineWidth = 10;
    ctx.strokeStyle = n === 0 ? '#2ef2dc' : '#ff3b7a';
    ctx.strokeRect(x + 16, y + 16, cell - 32, cell - 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n + 1).padStart(3, '0'), x + cell / 2, y + cell / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function makeFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#1a1218';
  ctx.fillRect(28, 36, 18, 22);
  ctx.fillRect(82, 36, 18, 22);
  ctx.fillStyle = '#ff8eb3';
  ctx.fillRect(18, 70, 16, 10);
  ctx.fillRect(94, 70, 16, 10);
  ctx.fillStyle = '#1a1218';
  ctx.fillRect(46, 84, 36, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeYouTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff3b7a';
  ctx.fillRect(0, 8, 256, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOU', 128, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function numberMaterial(map) {
  const material = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  material.customProgramCacheKey = () => 'number-atlas-1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nattribute vec2 uvOffset;')
      .replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = uv * vec2(0.1) + uvOffset;\n#endif',
      );
  };
  return material;
}

function uvOffsets() {
  const data = new Float32Array(MAX * 2);
  for (let i = 0; i < MAX; i += 1) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    data[i * 2] = col * 0.1;
    data[i * 2 + 1] = 1 - (row + 1) * 0.1;
  }
  return new THREE.InstancedBufferAttribute(data, 2);
}

function makeInstanced(geometry, material) {
  const mesh = new THREE.InstancedMesh(geometry, material, MAX);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  return mesh;
}

export function createCrowd(scene) {
  const atlas = makeNumberAtlas();
  const plateMaterial = numberMaterial(atlas);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const tileMaterial = bodyMaterial.clone();
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: makeFaceTexture(),
    transparent: true,
    toneMapped: false,
  });

  const plateGeo = new THREE.PlaneGeometry(1, 1);
  const bibGeo = plateGeo.clone();
  bibGeo.setAttribute('uvOffset', uvOffsets());
  const tileLabelGeo = plateGeo.clone();
  tileLabelGeo.setAttribute('uvOffset', uvOffsets());

  const head = makeInstanced(new THREE.BoxGeometry(0.84, 0.84, 0.84), bodyMaterial);
  const torso = makeInstanced(new THREE.BoxGeometry(1.02, 1.12, 0.56), bodyMaterial);
  const armL = makeInstanced(new THREE.BoxGeometry(0.34, 1.12, 0.34), bodyMaterial);
  const armR = makeInstanced(new THREE.BoxGeometry(0.34, 1.12, 0.34), bodyMaterial);
  const legL = makeInstanced(new THREE.BoxGeometry(0.38, 1, 0.44), bodyMaterial);
  const legR = makeInstanced(new THREE.BoxGeometry(0.38, 1, 0.44), bodyMaterial);
  const faces = makeInstanced(new THREE.PlaneGeometry(0.58, 0.58), faceMaterial);
  const bibs = makeInstanced(bibGeo, plateMaterial);
  const tiles = makeInstanced(new THREE.BoxGeometry(1.48, TILE_H, 1.48), tileMaterial);
  const tileLabels = makeInstanced(tileLabelGeo, plateMaterial);
  tileLabels.renderOrder = 2;
  plateMaterial.polygonOffset = true;
  plateMaterial.polygonOffsetFactor = -2;
  plateMaterial.polygonOffsetUnits = -2;

  const parts = [head, torso, armL, armR, legL, legR, faces, bibs, tiles, tileLabels];
  for (let i = 0; i < parts.length; i += 1) scene.add(parts[i]);

  const youSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeYouTexture(), toneMapped: false, depthTest: true }),
  );
  youSprite.center.set(0.5, 0);
  youSprite.scale.set(1.8, 0.68, 1);
  youSprite.visible = false;
  scene.add(youSprite);

  const people = [];
  for (let i = 0; i < MAX; i += 1) {
    people.push({
      state: 'gone',
      x: 0,
      y: 0,
      z: 0,
      gx: 0,
      gz: 0,
      spin: 0,
      tilt: 0,
      fallT: 0,
      dirX: 0,
      dirZ: 1,
      fallR: 1,
      colors: colorsFor(i),
    });
  }

  const slots = [];
  const dummy = new THREE.Object3D();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const bodyQ = new THREE.Quaternion();
  const faceQ = new THREE.Quaternion();
  const tileQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();
  const faceFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const flatQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const offset = new THREE.Vector3();
  const color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);

  function setCount(count) {
    for (let i = 0; i < parts.length; i += 1) parts[i].count = count;
  }

  function updateGoals(match) {
    const living = match.living;
    fillLayout(living.length, match.radius, slots);
    for (let i = 0; i < living.length; i += 1) {
      const person = people[living[i]];
      person.gx = slots[i].x;
      person.gz = slots[i].z;
    }
  }

  function applySnap(match) {
    const alive = new Set(match.living);
    for (let i = 0; i < MAX; i += 1) {
      const person = people[i];
      person.spin = 0;
      person.tilt = 0;
      person.y = 0;
      person.fallT = 0;
      person.state = i < match.roster && alive.has(i) ? 'alive' : 'gone';
    }
    updateGoals(match);
    for (let i = 0; i < match.living.length; i += 1) {
      const person = people[match.living[i]];
      person.x = person.gx;
      person.z = person.gz;
      person.state = 'alive';
    }
  }

  function beginFall(id) {
    const person = people[id];
    person.state = 'fall';
    person.fallT = 0;
    const len = Math.hypot(person.x, person.z) || 1;
    person.dirX = person.x / len;
    person.dirZ = person.z / len;
    person.fallR = len;
  }

  function place(mesh, index, ox, oy, oz, sx, sy, sz, orientQ, bob, posQ) {
    offset.set(ox, oy, oz).applyQuaternion(posQ || orientQ);
    dummy.position.set(personX + offset.x, FEET_Y + personY + bob + offset.y, personZ + offset.z);
    dummy.quaternion.copy(orientQ);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  let personX = 0;
  let personY = 0;
  let personZ = 0;

  function paint(mesh, index, rgb, glowAmt, falling) {
    if (falling) {
      color.setRGB(rgb[0] * 0.55 + 0.25, rgb[1] * 0.4, rgb[2] * 0.45);
    } else if (glowAmt > 0) {
      color.setRGB(1, 0.84, 0.28);
    } else {
      color.setRGB(rgb[0], rgb[1], rgb[2]);
    }
    mesh.setColorAt(index, color);
  }

  function sync(match, time, dt) {
    if (match.snap) {
      applySnap(match);
      match.snap = false;
    } else if (!match.holdLayout) {
      updateGoals(match);
    }

    for (let i = 0; i < match.fallingIds.length; i += 1) {
      const id = match.fallingIds[i];
      if (people[id].state === 'alive') beginFall(id);
    }

    const ease = 1 - Math.exp(-8 * Math.max(0, dt));
    const count = match.roster;
    setCount(count);

    for (let i = 0; i < count; i += 1) {
      const person = people[i];
      if (person.state === 'alive') {
        person.x += (person.gx - person.x) * ease;
        person.z += (person.gz - person.z) * ease;
        person.y = 0;
        person.spin = 0;
        person.tilt = 0;
      } else if (person.state === 'fall') {
        person.fallT += dt;
        const k = person.fallT;
        const radius = person.fallR + k * 3.4;
        person.x = person.dirX * radius;
        person.z = person.dirZ * radius;
        person.y = -k * k * 9;
        person.spin = k * 3.1;
        person.tilt = k * 1.25;
        if (k > 1.75) person.state = 'gone';
      }

      const gone = person.state === 'gone';
      const glow = !gone && match.glowSet.has(i);
      const glowAmt = glow ? 1 : 0;
      const falling = person.state === 'fall';
      const scale = gone ? 0 : glow ? 1.14 + 0.05 * Math.sin(time * 8 + i) : 1;
      const bob = person.state === 'alive' ? Math.sin(time * 2.1 + i * 0.7) * 0.03 : 0;
      const angle = Math.atan2(person.z, person.x);
      const yaw = Math.PI / 2 - angle + (person.state === 'fall' ? person.spin : 0);

      personX = person.x;
      personY = person.y;
      personZ = person.z;

      euler.set(person.state === 'fall' ? person.tilt : 0, yaw, person.state === 'fall' ? person.spin * 0.35 : 0);
      bodyQ.setFromEuler(euler);
      faceQ.copy(bodyQ).multiply(faceFlip);
      yawQ.setFromAxisAngle(up, yaw);
      if (person.state === 'fall') tileQ.copy(bodyQ);
      else tileQ.copy(yawQ).multiply(flatQ);

      const s = scale;
      place(head, i, 0, 2.18, 0, s, s, s, bodyQ, bob);
      place(torso, i, 0, 1.38, 0, s, s, s, bodyQ, bob);
      place(armL, i, -0.72, 1.38, 0, s, s, s, bodyQ, bob);
      place(armR, i, 0.72, 1.38, 0, s, s, s, bodyQ, bob);
      place(legL, i, -0.24, 0.5, 0, s, s, s, bodyQ, bob);
      place(legR, i, 0.24, 0.5, 0, s, s, s, bodyQ, bob);
      place(faces, i, 0, 2.18, -0.45, s, s, 1, faceQ, bob, bodyQ);
      place(bibs, i, 0, 1.42, 0.36, 1.02 * s, 0.78 * s, 1, bodyQ, bob);

      if (gone) {
        place(tiles, i, 0, 0, 0, 0, 0, 0, tileQ, 0);
        place(tileLabels, i, 0, 0, 0, 0, 0, 0, tileQ, 0);
      } else if (person.state === 'fall') {
        place(tiles, i, 0, 0.15, 0, 1, 1, 1, bodyQ, 0);
        place(tileLabels, i, 0, 0.32, 0.2, 1.15, 1.15, 1, tileQ, 0);
      } else {
        dummy.position.set(person.x, PLATFORM_TOP + TILE_H / 2, person.z);
        dummy.quaternion.identity();
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        tiles.setMatrixAt(i, dummy.matrix);

        const reach = Math.hypot(person.x, person.z) || 1;
        dummy.position.set(person.x + (person.x / reach) * 0.42, FEET_Y + 0.03, person.z + (person.z / reach) * 0.42);
        dummy.quaternion.copy(tileQ);
        dummy.scale.set(0.78, 0.78, 1);
        dummy.updateMatrix();
        tileLabels.setMatrixAt(i, dummy.matrix);
      }

      paint(head, i, person.colors.head, glowAmt, falling);
      paint(torso, i, person.colors.torso, glowAmt, falling);
      paint(armL, i, person.colors.limb, glowAmt, falling);
      paint(armR, i, person.colors.limb, glowAmt, falling);
      paint(legL, i, person.colors.limb, glowAmt, falling);
      paint(legR, i, person.colors.limb, glowAmt, falling);
      const tileRgb = glow ? [1, 0.84, 0.28] : person.colors.tile;
      paint(tiles, i, tileRgb, 0, falling);
    }

    for (let i = 0; i < parts.length; i += 1) {
      parts[i].instanceMatrix.needsUpdate = true;
      if (parts[i].instanceColor) parts[i].instanceColor.needsUpdate = true;
    }

    const you = people[0];
    youSprite.visible = count > 0 && you.state === 'alive';
    if (youSprite.visible) {
      youSprite.position.set(you.x, FEET_Y + you.y + 2.75, you.z);
    }
  }

  return { sync };
}
