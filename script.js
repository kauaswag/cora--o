// ---- Setup THREE.js ----
const canvas = document.getElementById("canvas");
canvas.style.touchAction = "none";

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000,
);
camera.position.z = 500;

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Textura de Brilho ----
function createGlowTexture() {
  const size = 128;
  const canvasTex = document.createElement("canvas");
  canvasTex.width = size;
  canvasTex.height = size;
  const ctx = canvasTex.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,180,210,0.9)");
  gradient.addColorStop(0.5, "rgba(255,80,140,0.4)");
  gradient.addColorStop(1, "rgba(255,0,80,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvasTex);
}
const glowTexture = createGlowTexture();

// ---- Otimização Mobile: Todos os pontos em um único objeto ----
const path = document.querySelector("#heart-path");
const lengthPath = path.getTotalLength();

const vertices = [];
const targets = [];

for (let i = 0; i < lengthPath; i += 1.5) {
  const point = path.getPointAtLength(i);
  const targetX = point.x - 300;
  const targetY = -point.y + 170;

  // Posição final desejada (com volume Z igual ao da foto)
  const tX = targetX + (Math.random() - 0.5) * 30;
  const tY = targetY + (Math.random() - 0.5) * 30;
  const tZ = (Math.random() - 0.5) * 70;

  targets.push(new THREE.Vector3(tX, tY, tZ));

  // Os pontos começam no centro (0,0,0) para a animação
  vertices.push(new THREE.Vector3(0, 0, 0));
}

const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
const material = new THREE.PointsMaterial({
  size: 14,
  map: glowTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: 0xff3366,
});

const pointsGroup = new THREE.Points(geometry, material);
scene.add(pointsGroup);

// Função vital para atualizar as posições na placa de vídeo
function updateGeometry() {
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i].x;
    positions[i * 3 + 1] = vertices[i].y;
    positions[i * 3 + 2] = vertices[i].z;
  }
  geometry.attributes.position.needsUpdate = true;
}

// ---- GSAP Timeline ----
const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
const HOLD_DURATION = 4;

vertices.forEach((v, i) => {
  tl.to(
    v,
    {
      x: targets[i].x,
      y: targets[i].y,
      z: targets[i].z,
      ease: "power2.inOut",
      duration: "random(2.0, 4.0)",
    },
    "random(0.0, 0.2)",
  );
});

tl.to({}, { duration: HOLD_DURATION });

vertices.forEach((v) => {
  tl.to(
    v,
    {
      x: v.x + (Math.random() - 0.5) * 900,
      y: v.y + (Math.random() - 0.5) * 900,
      z: v.z + (Math.random() - 0.5) * 800,
      ease: "power2.in",
      duration: "random(2.0, 4.0)",
    },
    ">-" + Math.random() * 0.5,
  );
});

// ---- Sistema de Faíscas ----
const MAX_SPARKLES = 2000;
const sparklePositions = new Float32Array(MAX_SPARKLES * 3);
const sparkleAlphas = new Float32Array(MAX_SPARKLES);
const sparkleSizes = new Float32Array(MAX_SPARKLES);

const sparkleGeometry = new THREE.BufferGeometry();
sparkleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(sparklePositions, 3),
);
sparkleGeometry.setAttribute(
  "aAlpha",
  new THREE.BufferAttribute(sparkleAlphas, 1),
);
sparkleGeometry.setAttribute(
  "aSize",
  new THREE.BufferAttribute(sparkleSizes, 1),
);

const sparkleMaterial = new THREE.ShaderMaterial({
  uniforms: { map: { value: glowTexture } },
  vertexShader: `
    attribute float aAlpha;
    attribute float aSize;
    varying float vAlpha;
    void main() {
      vAlpha = aAlpha;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    varying float vAlpha;
    void main() {
      vec4 tex = texture2D(map, gl_PointCoord);
      gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const sparklePoints = new THREE.Points(sparkleGeometry, sparkleMaterial);
scene.add(sparklePoints);

const sparklePool = Array.from({ length: MAX_SPARKLES }, () => ({
  active: false,
  life: 0,
  maxLife: 1,
  velocity: new THREE.Vector3(),
}));
let sparkleCursor = 0;

function spawnSparkle(worldPos) {
  const s = sparklePool[sparkleCursor];
  s.active = true;
  s.life = 0;
  s.maxLife = 0.4 + Math.random() * 0.5;
  s.velocity.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 60,
  );
  sparklePositions[sparkleCursor * 3] = worldPos.x;
  sparklePositions[sparkleCursor * 3 + 1] = worldPos.y;
  sparklePositions[sparkleCursor * 3 + 2] = worldPos.z;
  sparkleAlphas[sparkleCursor] = 1;
  sparkleSizes[sparkleCursor] = 6 + Math.random() * 8;
  sparkleCursor = (sparkleCursor + 1) % MAX_SPARKLES;
}

function updateSparkles(delta) {
  for (let i = 0; i < MAX_SPARKLES; i++) {
    const s = sparklePool[i];
    if (!s.active) continue;
    s.life += delta;
    if (s.life >= s.maxLife) {
      s.active = false;
      sparkleAlphas[i] = 0;
      continue;
    }
    const t = s.life / s.maxLife;
    sparkleAlphas[i] = 1 - t;
    sparklePositions[i * 3] += s.velocity.x * delta;
    sparklePositions[i * 3 + 1] += s.velocity.y * delta;
    sparklePositions[i * 3 + 2] += s.velocity.z * delta;
  }
  sparkleGeometry.attributes.position.needsUpdate = true;
  sparkleGeometry.attributes.aAlpha.needsUpdate = true;
}

// ---- Rotação e Toque ----
let isDragging = false;
let prevX = 0;
let prevY = 0;
let dragSpeed = 0;

canvas.addEventListener("pointerdown", (e) => {
  isDragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - prevX;
  const deltaY = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;
  const sensitivity = 0.005;
  pointsGroup.rotation.y += deltaX * sensitivity;
  pointsGroup.rotation.x += deltaY * sensitivity;
  dragSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
});

canvas.addEventListener("pointerup", () => {
  isDragging = false;
  dragSpeed = 0;
});
canvas.addEventListener("pointerleave", () => {
  isDragging = false;
  dragSpeed = 0;
});

// ---- Loop de Animação ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updateGeometry(); // Atualiza a posição dos pontos na GPU

  if (!isDragging) {
    pointsGroup.rotation.y += 0.0015;
  }

  if (isDragging && dragSpeed > 0.5) {
    const sparkleCount = Math.min(30, Math.floor(dragSpeed / 1.2));
    for (let n = 0; n < sparkleCount; n++) {
      const randomIndex = Math.floor(Math.random() * vertices.length);
      const localPos = vertices[randomIndex];
      const worldPos = localPos.clone().applyMatrix4(pointsGroup.matrixWorld);
      spawnSparkle(worldPos);
    }
  }

  updateSparkles(delta);
  renderer.render(scene, camera);
}
animate();
