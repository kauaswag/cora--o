// ---- Setup básico do Three.js ----
const canvas = document.getElementById("canvas");
canvas.style.touchAction = "none"; // impede o navegador de "rolar a página" ao arrastar no celular

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

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

// ---- Gera uma textura de brilho (glow) via canvas ----
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

// ---- Pega o path do SVG e extrai pontos do coração ----
const path = document.querySelector("#heart-path");
const length = path.getTotalLength();
const vertices = [];
const targets = [];

for (let i = 0; i < length; i += 1.5) {
  const point = path.getPointAtLength(i);

  const targetX = point.x - 300;
  const targetY = -point.y + 170;
  const targetZ = 0;

  targets.push(new THREE.Vector3(targetX, targetY, targetZ));

  const scatter = new THREE.Vector3(
    targetX + (Math.random() - 0.5) * 900,
    targetY + (Math.random() - 0.5) * 900,
    (Math.random() - 0.5) * 800,
  );

  vertices.push(scatter.clone());
}

// ---- Geometria e material do coração (com brilho) ----
const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
const material = new THREE.PointsMaterial({
  size: 14,
  map: glowTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: 0xff3366,
});

// "points" é o grupo que giramos com o mouse/dedo
const points = new THREE.Points(geometry, material);
scene.add(points);

function updateGeometry() {
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i].x;
    positions[i * 3 + 1] = vertices[i].y;
    positions[i * 3 + 2] = vertices[i].z;
  }
  geometry.attributes.position.needsUpdate = true;
}

// ---- Timeline: formar -> pausar -> desfazer ----
const HOLD_DURATION = 4;
const FORM_STAGGER = 0.002;
const DISSOLVE_STAGGER = 0.002;

const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

vertices.forEach((v, i) => {
  tl.to(
    v,
    {
      x: targets[i].x,
      y: targets[i].y,
      z: targets[i].z,
      ease: "power2.out",
      duration: "random(1.5,3.5)",
    },
    i * FORM_STAGGER,
  );
});

tl.to({}, { duration: HOLD_DURATION });

vertices.forEach((v, i) => {
  const newScatter = new THREE.Vector3(
    v.x + (Math.random() - 0.5) * 900,
    v.y + (Math.random() - 0.5) * 900,
    (Math.random() - 0.5) * 800,
  );
  tl.to(
    v,
    {
      x: newScatter.x,
      y: newScatter.y,
      z: newScatter.z,
      ease: "power2.in",
      duration: "random(1.5,3.5)",
    },
    ">-" + Math.max(0, vertices.length - i) * DISSOLVE_STAGGER,
  );
});

// =========================================================
// ---- SISTEMA DE FAÍSCAS (brilhos soltos durante o giro) ----
// =========================================================
const MAX_SPARKLES = 500;

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
scene.add(sparklePoints); // fica em espaço "mundo", não gira junto com o coração

// pool de faíscas reutilizáveis
const sparklePool = [];
for (let i = 0; i < MAX_SPARKLES; i++) {
  sparklePool.push({
    active: false,
    life: 0,
    maxLife: 1,
    velocity: new THREE.Vector3(),
  });
}
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

// =========================================================
// ---- ROTAÇÃO POR MOUSE / TOQUE (Pointer Events unifica os dois) ----
// =========================================================
let isDragging = false;
let prevX = 0;
let prevY = 0;
let dragSpeed = 0; // usado para saber a intensidade do giro e soltar mais/menos faíscas

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
  points.rotation.y += deltaX * sensitivity;
  points.rotation.x += deltaY * sensitivity;

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

// ---- Loop de animação ----
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  updateGeometry();

  // rotação suave automática quando não está arrastando
  if (!isDragging) {
    points.rotation.y += 0.0015;
  }

  // solta faíscas proporcional à velocidade do arraste
  if (isDragging && dragSpeed > 1) {
    const sparkleCount = Math.min(6, Math.floor(dragSpeed / 4));
    for (let n = 0; n < sparkleCount; n++) {
      const randomIndex = Math.floor(Math.random() * vertices.length);
      const localPos = vertices[randomIndex];
      const worldPos = localPos.clone().applyMatrix4(points.matrixWorld);
      spawnSparkle(worldPos);
    }
  }

  updateSparkles(delta);

  renderer.render(scene, camera);
}
animate();
