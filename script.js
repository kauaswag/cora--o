// ============================================================
// CORAÇÃO DE PARTÍCULAS - VERSÃO CORRIGIDA
// ============================================================

const canvas = document.getElementById("canvas");

canvas.style.touchAction = "none";

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const MOBILE = window.innerWidth < 700;

const PARTICLE_COUNT = MOBILE ? 12000 : 22000;

const HEART_SIZE = MOBILE
  ? Math.min(window.innerWidth, window.innerHeight) * 0.36
  : Math.min(window.innerWidth, window.innerHeight) * 0.38;

const PARTICLE_MIN_SIZE = MOBILE ? 1.1 : 1.3;
const PARTICLE_MAX_SIZE = MOBILE ? 3.5 : 4.2;

// ============================================================
// RENDERER
// ============================================================

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setClearColor(0x050505, 1);

// ============================================================
// CENA
// ============================================================

const scene = new THREE.Scene();

// ============================================================
// CÂMERA ORTOGRÁFICA
// ============================================================
//
// Essa é a principal correção.
// O coração passa a trabalhar diretamente em coordenadas
// da tela, então não desaparece por causa da perspectiva.
// ============================================================

let camera;

function createCamera() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    -1000,
    1000,
  );

  camera.position.z = 500;
}

createCamera();

// ============================================================
// RESIZE
// ============================================================

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;

  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// ============================================================
// TEXTURA DA PARTÍCULA
// ============================================================

function createGlowTexture() {
  const size = 128;

  const c = document.createElement("canvas");

  c.width = size;
  c.height = size;

  const ctx = c.getContext("2d");

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");

  gradient.addColorStop(0.08, "rgba(255,225,235,1)");

  gradient.addColorStop(0.2, "rgba(255,125,170,0.95)");

  gradient.addColorStop(0.45, "rgba(255,40,110,0.45)");

  gradient.addColorStop(1, "rgba(255,0,70,0)");

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

const glowTexture = createGlowTexture();

// ============================================================
// EQUAÇÃO DO CORAÇÃO
// ============================================================

function isInsideHeart(x, y) {
  const equation = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);

  return equation <= 0;
}

// ============================================================
// CRIA PONTO DENTRO DO CORAÇÃO
// ============================================================

function getHeartPoint() {
  let x;
  let y;

  while (true) {
    x = Math.random() * 2.4 - 1.2;

    y = Math.random() * 2.4 - 1.2;

    if (isInsideHeart(x, y)) {
      break;
    }
  }

  return {
    x,
    y,
  };
}

// ============================================================
// ARRAYS
// ============================================================

const positions = new Float32Array(PARTICLE_COUNT * 3);

const targets = new Float32Array(PARTICLE_COUNT * 3);

const scatter = new Float32Array(PARTICLE_COUNT * 3);

const sizes = new Float32Array(PARTICLE_COUNT);

const alpha = new Float32Array(PARTICLE_COUNT);

// ============================================================
// GERAR PARTÍCULAS
// ============================================================

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const index = i * 3;

  // ----------------------------------------------------------
  // Ponto dentro do coração
  // ----------------------------------------------------------

  const p = getHeartPoint();

  // ----------------------------------------------------------
  // Pequena variação de escala
  // ----------------------------------------------------------

  let x = p.x * HEART_SIZE;

  let y = p.y * HEART_SIZE;

  // ----------------------------------------------------------
  // Coloca o coração ligeiramente para cima
  // ----------------------------------------------------------

  y += HEART_SIZE * 0.05;

  // ----------------------------------------------------------
  // Profundidade mínima
  // ----------------------------------------------------------

  const z = (Math.random() - 0.5) * 25;

  // ----------------------------------------------------------
  // TARGET
  // ----------------------------------------------------------

  targets[index] = x;

  targets[index + 1] = y;

  targets[index + 2] = z;

  // ----------------------------------------------------------
  // ESPALHAMENTO
  // ----------------------------------------------------------

  scatter[index] = x + (Math.random() - 0.5) * 650;

  scatter[index + 1] = y + (Math.random() - 0.5) * 500;

  scatter[index + 2] = z + (Math.random() - 0.5) * 250;

  // Começa espalhado

  positions[index] = scatter[index];

  positions[index + 1] = scatter[index + 1];

  positions[index + 2] = scatter[index + 2];

  // ----------------------------------------------------------
  // TAMANHO
  // ----------------------------------------------------------

  const r = Math.random();

  if (r < 0.75) {
    sizes[i] = PARTICLE_MIN_SIZE + Math.random() * 1.7;
  } else {
    sizes[i] = 2.5 + Math.random() * 2.5;
  }

  // ----------------------------------------------------------
  // OPACIDADE
  // ----------------------------------------------------------

  alpha[i] = 0.35 + Math.random() * 0.65;
}

// ============================================================
// GEOMETRIA
// ============================================================

const geometry = new THREE.BufferGeometry();

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));

// ============================================================
// MATERIAL
// ============================================================

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: {
      value: glowTexture,
    },
  },

  vertexShader: `

      attribute float aSize;
      attribute float aAlpha;

      varying float vAlpha;

      void main() {

        vAlpha = aAlpha;

        vec4 positionView =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize *
          1.8;

        gl_Position =
          projectionMatrix *
          positionView;

      }

    `,

  fragmentShader: `

      uniform sampler2D uTexture;

      varying float vAlpha;

      void main() {

        vec4 tex =
          texture2D(
            uTexture,
            gl_PointCoord
          );

        float finalAlpha =
          tex.a *
          vAlpha;

        if (
          finalAlpha < 0.01
        ) {
          discard;
        }

        vec3 pink =
          vec3(
            1.0,
            0.08,
            0.36
          );

        gl_FragColor =
          vec4(
            pink,
            finalAlpha
          );

      }

    `,

  transparent: true,

  depthWrite: false,

  blending: THREE.AdditiveBlending,
});

// ============================================================
// HEART
// ============================================================

const heart = new THREE.Points(geometry, material);

scene.add(heart);

// ============================================================
// ANIMAÇÃO
// ============================================================

const animation = {
  progress: 0,
};

// ============================================================
// ATUALIZAÇÃO
// ============================================================

function updateHeart(progress) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const index = i * 3;

    // --------------------------------------------------------
    // Pequeno atraso entre partículas
    // --------------------------------------------------------

    const delay = (i / PARTICLE_COUNT) * 0.65;

    let p = (progress - delay) / (1 - delay);

    p = Math.max(0, Math.min(1, p));

    // --------------------------------------------------------
    // Easing
    // --------------------------------------------------------

    const ease = p * p * (3 - 2 * p);

    // --------------------------------------------------------
    // X
    // --------------------------------------------------------

    positions[index] =
      scatter[index] + (targets[index] - scatter[index]) * ease;

    // --------------------------------------------------------
    // Y
    // --------------------------------------------------------

    positions[index + 1] =
      scatter[index + 1] + (targets[index + 1] - scatter[index + 1]) * ease;

    // --------------------------------------------------------
    // Z
    // --------------------------------------------------------

    positions[index + 2] =
      scatter[index + 2] + (targets[index + 2] - scatter[index + 2]) * ease;
  }

  geometry.attributes.position.needsUpdate = true;
}

// ============================================================
// NOVO ESPALHAMENTO
// ============================================================

function regenerateScatter() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const index = i * 3;

    scatter[index] = targets[index] + (Math.random() - 0.5) * 650;

    scatter[index + 1] = targets[index + 1] + (Math.random() - 0.5) * 500;

    scatter[index + 2] = targets[index + 2] + (Math.random() - 0.5) * 250;
  }
}

// ============================================================
// FORMAR
// ============================================================

function formHeart() {
  animation.progress = 0;

  gsap.to(animation, {
    progress: 1,

    duration: 4.2,

    ease: "power2.out",

    onUpdate: () => {
      updateHeart(animation.progress);
    },

    onComplete: () => {
      gsap.delayedCall(3.5, dissolveHeart);
    },
  });
}

// ============================================================
// DESFAZER
// ============================================================

function dissolveHeart() {
  gsap.to(animation, {
    progress: 0,

    duration: 4.0,

    ease: "power2.in",

    onUpdate: () => {
      updateHeart(animation.progress);
    },

    onComplete: () => {
      regenerateScatter();

      gsap.delayedCall(0.5, formHeart);
    },
  });
}

// ============================================================
// ROTAÇÃO
// ============================================================

let dragging = false;

let previousX = 0;
let previousY = 0;

let rotationVelocity = 0;

canvas.addEventListener("pointerdown", (event) => {
  dragging = true;

  previousX = event.clientX;

  previousY = event.clientY;

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;

  const dx = event.clientX - previousX;

  const dy = event.clientY - previousY;

  previousX = event.clientX;

  previousY = event.clientY;

  heart.rotation.y += dx * 0.004;

  heart.rotation.x += dy * 0.004;

  rotationVelocity = Math.sqrt(dx * dx + dy * dy);
});

function stopDrag() {
  dragging = false;

  rotationVelocity = 0;
}

canvas.addEventListener("pointerup", stopDrag);

canvas.addEventListener("pointercancel", stopDrag);

// ============================================================
// FAÍSCAS
// ============================================================

const SPARKLE_COUNT = MOBILE ? 600 : 1200;

const sparklePositions = new Float32Array(SPARKLE_COUNT * 3);

const sparkleAlpha = new Float32Array(SPARKLE_COUNT);

const sparkleSizes = new Float32Array(SPARKLE_COUNT);

const sparkleVelocity = [];

const sparkleLife = [];

const sparkleMaxLife = [];

for (let i = 0; i < SPARKLE_COUNT; i++) {
  sparkleAlpha[i] = 0;

  sparkleSizes[i] = 1 + Math.random() * 4;

  sparkleVelocity.push(new THREE.Vector3());

  sparkleLife.push(0);

  sparkleMaxLife.push(1);
}

const sparkleGeometry = new THREE.BufferGeometry();

sparkleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(sparklePositions, 3),
);

sparkleGeometry.setAttribute(
  "aAlpha",
  new THREE.BufferAttribute(sparkleAlpha, 1),
);

sparkleGeometry.setAttribute(
  "aSize",
  new THREE.BufferAttribute(sparkleSizes, 1),
);

const sparkleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: {
      value: glowTexture,
    },
  },

  vertexShader: `

      attribute float aAlpha;
      attribute float aSize;

      varying float vAlpha;

      void main() {

        vAlpha = aAlpha;

        vec4 mv =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize * 2.0;

        gl_Position =
          projectionMatrix *
          mv;

      }

    `,

  fragmentShader: `

      uniform sampler2D uTexture;

      varying float vAlpha;

      void main() {

        vec4 tex =
          texture2D(
            uTexture,
            gl_PointCoord
          );

        gl_FragColor =
          vec4(
            1.0,
            0.05,
            0.32,
            tex.a *
            vAlpha
          );

      }

    `,

  transparent: true,

  depthWrite: false,

  blending: THREE.AdditiveBlending,
});

const sparklePoints = new THREE.Points(sparkleGeometry, sparkleMaterial);

scene.add(sparklePoints);

let sparkleCursor = 0;

// ============================================================
// CRIAR FAÍSCA
// ============================================================

function spawnSparkle(position) {
  const i = sparkleCursor;

  sparklePositions[i * 3] = position.x;

  sparklePositions[i * 3 + 1] = position.y;

  sparklePositions[i * 3 + 2] = position.z;

  sparkleAlpha[i] = 1;

  sparkleLife[i] = 0;

  sparkleMaxLife[i] = 0.3 + Math.random() * 0.7;

  sparkleVelocity[i].set(
    (Math.random() - 0.5) * 80,

    (Math.random() - 0.5) * 80,

    (Math.random() - 0.5) * 50,
  );

  sparkleCursor++;

  if (sparkleCursor >= SPARKLE_COUNT) {
    sparkleCursor = 0;
  }
}

// ============================================================
// ATUALIZAR FAÍSCAS
// ============================================================

function updateSparkles(delta) {
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    if (sparkleAlpha[i] <= 0) {
      continue;
    }

    sparkleLife[i] += delta;

    if (sparkleLife[i] >= sparkleMaxLife[i]) {
      sparkleAlpha[i] = 0;

      continue;
    }

    const t = sparkleLife[i] / sparkleMaxLife[i];

    sparkleAlpha[i] = 1 - t;

    sparklePositions[i * 3] += sparkleVelocity[i].x * delta;

    sparklePositions[i * 3 + 1] += sparkleVelocity[i].y * delta;

    sparklePositions[i * 3 + 2] += sparkleVelocity[i].z * delta;
  }

  sparkleGeometry.attributes.position.needsUpdate = true;

  sparkleGeometry.attributes.aAlpha.needsUpdate = true;
}

// ============================================================
// LOOP
// ============================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Giro automático bem suave

  if (!dragging) {
    heart.rotation.y += 0.0007;
  }

  // ----------------------------------------------------------
  // FAÍSCAS DURANTE ARRASTE
  // ----------------------------------------------------------

  if (dragging && rotationVelocity > 1) {
    const amount = Math.min(12, Math.floor(rotationVelocity / 2));

    for (let i = 0; i < amount; i++) {
      const random = Math.floor(Math.random() * PARTICLE_COUNT);

      const index = random * 3;

      const point = new THREE.Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2],
      );

      point.applyMatrix4(heart.matrixWorld);

      spawnSparkle(point);
    }
  }

  updateSparkles(delta);

  renderer.render(scene, camera);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

updateHeart(0);

formHeart();

animate();
