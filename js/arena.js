import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLATFORM_MARGIN } from './math.js';

const PINK = 0xff3b7a;
const TEAL = 0x2ef2dc;

function platformTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c121c';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.fillStyle = '#2a1a28';
  for (let y = 8; y < 1024; y += 32) {
    for (let x = 8; x < 1024; x += 32) {
      ctx.fillRect(x, y, 18, 18);
    }
  }

  const center = 512;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, 470, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ff3b7a';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(center, center, 340, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#2ef2dc';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(center, center, 188, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#102e2c';
  ctx.beginPath();
  ctx.arc(center, center, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2ef2dc';
  ctx.stroke();
  ctx.fillStyle = '#e9fff9';
  ctx.font = '700 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2/3', center, center + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createArena(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x140810, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140810);
  scene.fog = new THREE.Fog(0x140810, 52, 128);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.85;
  controls.minDistance = 8;
  controls.maxDistance = 120;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 1.1, 0);

  let userMoved = false;
  controls.addEventListener('start', () => {
    userMoved = true;
  });

  scene.add(new THREE.HemisphereLight(0xffc4d8, 0x143430, 0.9));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xfff4ee, 1.2);
  key.position.set(22, 38, 18);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbffaf2, 0.38);
  fill.position.set(-20, 12, 26);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(78, 72),
    new THREE.MeshLambertMaterial({ color: 0x12090f }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  const apron = new THREE.Mesh(
    new THREE.RingGeometry(44.2, 44.7, 80),
    new THREE.MeshBasicMaterial({ color: PINK, side: THREE.DoubleSide }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.012;
  scene.add(apron);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  const platform = new THREE.Group();
  platform.position.y = 0.25;
  scene.add(platform);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 64), [
    new THREE.MeshLambertMaterial({ color: 0x3a182c }),
    new THREE.MeshBasicMaterial({ map: platformTexture() }),
    new THREE.MeshLambertMaterial({ color: 0x140810 }),
  ]);
  platform.add(disc);

  const lip = new THREE.Mesh(
    new THREE.RingGeometry(0.978, 1, 80),
    new THREE.MeshBasicMaterial({ color: PINK, side: THREE.DoubleSide }),
  );
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.26;
  platform.add(lip);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.618, 64),
    new THREE.MeshBasicMaterial({ color: TEAL, side: THREE.DoubleSide }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.27;
  platform.add(innerRing);

  const lampGeo = new THREE.BoxGeometry(0.28, 0.62, 0.28);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lampCount = 28;
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampCount);
  lamps.frustumCulled = false;
  lamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(lamps);
  const lampDummy = new THREE.Object3D();
  const lampColor = new THREE.Color();
  const pinkColor = new THREE.Color(PINK);
  const tealColor = new THREE.Color(TEAL);

  function layoutLamps(platformRadius, pulse) {
    for (let i = 0; i < lampCount; i += 1) {
      const angle = (Math.PI * 2 * i) / lampCount;
      lampDummy.position.set(Math.cos(angle) * platformRadius, 0.72, Math.sin(angle) * platformRadius);
      lampDummy.rotation.set(0, -angle, 0);
      lampDummy.scale.set(1, 1, 1);
      lampDummy.updateMatrix();
      lamps.setMatrixAt(i, lampDummy.matrix);
      const base = i % 2 === 0 ? pinkColor : tealColor;
      const hot = pulse == null ? 1 : 0.55 + 0.45 * pulse;
      lampColor.copy(base).multiplyScalar(hot);
      lamps.setColorAt(i, lampColor);
    }
    lamps.instanceMatrix.needsUpdate = true;
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  }

  const wallGeo = new THREE.BoxGeometry(8.2, 3.1, 0.55);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a1222 });
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, 14);
  walls.frustumCulled = false;
  const capGeo = new THREE.BoxGeometry(8.2, 0.18, 0.7);
  const capMat = new THREE.MeshBasicMaterial({ color: TEAL });
  const caps = new THREE.InstancedMesh(capGeo, capMat, 14);
  caps.frustumCulled = false;
  const wallDummy = new THREE.Object3D();
  for (let i = 0; i < 14; i += 1) {
    const angle = (Math.PI * 2 * i) / 14 + 0.12;
    const radius = 54;
    wallDummy.position.set(Math.cos(angle) * radius, 1.55, Math.sin(angle) * radius);
    wallDummy.lookAt(0, 1.55, 0);
    wallDummy.updateMatrix();
    walls.setMatrixAt(i, wallDummy.matrix);
    wallDummy.position.y = 3.2;
    wallDummy.updateMatrix();
    caps.setMatrixAt(i, wallDummy.matrix);
  }
  walls.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  scene.add(walls);
  scene.add(caps);

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.16, 8, 28),
    new THREE.MeshBasicMaterial({ color: PINK }),
  );
  torus.position.set(-36, 6.2, -28);
  torus.rotation.y = 0.4;
  scene.add(torus);

  const pyramid = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 6.4, 3),
    new THREE.MeshBasicMaterial({ color: TEAL }),
  );
  pyramid.position.set(38, 3.2, -24);
  pyramid.rotation.y = 0.5;
  scene.add(pyramid);

  const cube = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(4.6, 4.6, 4.6)),
    new THREE.LineBasicMaterial({ color: 0xfff4f8 }),
  );
  cube.position.set(8, 3.4, -42);
  scene.add(cube);

  let lastRadius = 18;

  function applyRadius(ringR) {
    const platformRadius = ringR + PLATFORM_MARGIN;
    platform.scale.set(platformRadius, 1, platformRadius);
    shadow.scale.set(platformRadius * 3.3, platformRadius * 3.3, 1);
    lastRadius = ringR;
    return platformRadius;
  }

  function frameCamera(ringR, force) {
    if (userMoved && !force) return;
    const aspect = camera.aspect || 1;
    const distance = ringR * (aspect < 0.9 ? 2.15 : 1.78) + 7;
    const height = ringR * 0.78 + 7;
    camera.position.set(ringR * 0.28, height, distance);
    controls.target.set(0, 1.15, ringR * 0.05);
    controls.update();
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.fov = camera.aspect < 0.9 ? 50 : 40;
    camera.updateProjectionMatrix();
    if (!userMoved) frameCamera(lastRadius, false);
  }

  function update(state, time) {
    const platformRadius = applyRadius(state.radius);
    const locking = state.phase === 'lock';
    const pulse = locking ? 0.5 + 0.5 * Math.sin(time * 16) : 1;
    layoutLamps(platformRadius, locking ? pulse : 1);
    lip.material.color.set(locking ? (pulse > 0.5 ? 0xfff1f6 : PINK) : PINK);
  }

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  resize();
  applyRadius(18);
  layoutLamps(18 + PLATFORM_MARGIN, 1);

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    update,
    render,
    frameCamera,
    get userMoved() {
      return userMoved;
    },
    get pixelRatio() {
      return renderer.getPixelRatio();
    },
  };
}
