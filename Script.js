// ============================================================
// CORAÇÃO DE PARTÍCULAS
// ============================================================

const canvas = document.getElementById("canvas");

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const isMobile = window.innerWidth < 700;

const PARTICLE_COUNT = isMobile ? 18000 : 30000;

const HEART_WIDTH = isMobile ? 250 : 340;

const PARTICLE_SIZE = isMobile ? 1.8 : 2.2;

const SPREAD = isMobile ? 520 : 650;

// ============================================================
// THREE
// ============================================================

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setClearColor(0x050505);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  3000,
);

camera.position.z = 600;

// ============================================================
// RESIZE
// ============================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// TEXTURA DA PARTÍCULA
// ============================================================

function createParticleTexture() {
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

  gradient.addColorStop(0.08, "rgba(255,220,235,1)");

  gradient.addColorStop(0.22, "rgba(255,100,155,0.95)");

  gradient.addColorStop(0.45, "rgba(255,30,100,0.5)");

  gradient.addColorStop(1, "rgba(255,0,70,0)");

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

const particleTexture = createParticleTexture();

// ============================================================
// EQUAÇÃO DO CORAÇÃO
// ============================================================
//
// (x² + y² - 1)³ - x²y³ <= 0
//
// Essa equação representa a ÁREA inteira do coração.
// Diferentemente do código anterior, não usamos apenas
// o contorno.
// ============================================================

function insideHeart(x, y) {
  const value = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);

  return value <= 0;
}

// ============================================================
// GERA UM PONTO DENTRO DO CORAÇÃO
// ============================================================

function randomHeartPoint() {
  let x;
  let y;

  // Rejection sampling
  // sorteia até cair dentro do coração

  while (true) {
    x = Math.random() * 2.8 - 1.4;

    y = Math.random() * 2.4 - 1.2;

    if (insideHeart(x, y)) {
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

const targetPositions = new Float32Array(PARTICLE_COUNT * 3);

const initialPositions = new Float32Array(PARTICLE_COUNT * 3);

const sizes = new Float32Array(PARTICLE_COUNT);

const alphas = new Float32Array(PARTICLE_COUNT);

// ============================================================
// CRIA PARTÍCULAS
// ============================================================

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const index = i * 3;

  // ----------------------------------------------------------
  // PONTO DO CORAÇÃO
  // ----------------------------------------------------------

  const p = randomHeartPoint();

  let x = p.x * HEART_WIDTH;

  let y = p.y * HEART_WIDTH;

  // ----------------------------------------------------------
  // DISTRIBUIÇÃO
  // ----------------------------------------------------------

  // Pequena variação para não ficar perfeitamente uniforme

  x += (Math.random() - 0.5) * 4;

  y += (Math.random() - 0.5) * 4;

  // ----------------------------------------------------------
  // PROFUNDIDADE
  // ----------------------------------------------------------

  const z = (Math.random() - 0.5) * 35;

  // ----------------------------------------------------------
  // POSIÇÃO FINAL
  // ----------------------------------------------------------

  targetPositions[index] = x;

  targetPositions[index + 1] = y;

  targetPositions[index + 2] = z;

  // ----------------------------------------------------------
  // POSIÇÃO ESPALHADA
  // ----------------------------------------------------------

  initialPositions[index] = x + (Math.random() - 0.5) * SPREAD;

  initialPositions[index + 1] = y + (Math.random() - 0.5) * SPREAD;

  initialPositions[index + 2] = z + (Math.random() - 0.5) * SPREAD;

  // ----------------------------------------------------------
  // COMEÇA ESPALHADO
  // ----------------------------------------------------------

  positions[index] = initialPositions[index];

  positions[index + 1] = initialPositions[index + 1];

  positions[index + 2] = initialPositions[index + 2];

  // ----------------------------------------------------------
  // TAMANHO
  // ----------------------------------------------------------

  const random = Math.random();

  if (random < 0.75) {
    sizes[i] = 1.0 + Math.random() * 2.2;
  } else {
    sizes[i] = 2.5 + Math.random() * 4;
  }

  // ----------------------------------------------------------
  // OPACIDADE
  // ----------------------------------------------------------

  alphas[i] = 0.25 + Math.random() * 0.75;
}

// ============================================================
// GEOMETRIA
// ============================================================

const geometry = new THREE.BufferGeometry();

geometry.setAttribute(
  "position",

  new THREE.BufferAttribute(positions, 3),
);

geometry.setAttribute(
  "aSize",

  new THREE.BufferAttribute(sizes, 1),
);

geometry.setAttribute(
  "aAlpha",

  new THREE.BufferAttribute(alphas, 1),
);

// ============================================================
// MATERIAL
// ============================================================

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: {
      value: particleTexture,
    },
  },

  vertexShader: `

      attribute float aSize;
      attribute float aAlpha;

      varying float vAlpha;

      void main() {

        vAlpha = aAlpha;

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize *
          (450.0 / -mvPosition.z);

        gl_Position =
          projectionMatrix *
          mvPosition;

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

        if (
          tex.a *
          vAlpha <
          0.01
        ) {
          discard;
        }

        vec3 pink =
          vec3(
            1.0,
            0.08,
            0.35
          );

        gl_FragColor =
          vec4(
            pink,
            tex.a *
            vAlpha
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

function updateParticles(progress) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const index = i * 3;

    // --------------------------------------------------------
    // atraso individual
    // --------------------------------------------------------

    const delay = (i / PARTICLE_COUNT) * 0.55;

    let p = (progress - delay) / (1 - delay);

    p = Math.max(0, Math.min(1, p));

    // --------------------------------------------------------
    // suavização
    // --------------------------------------------------------

    const ease = p * p * (3 - 2 * p);

    // --------------------------------------------------------
    // posição X
    // --------------------------------------------------------

    positions[index] =
      initialPositions[index] +
      (targetPositions[index] - initialPositions[index]) * ease;

    // --------------------------------------------------------
    // posição Y
    // --------------------------------------------------------

    positions[index + 1] =
      initialPositions[index + 1] +
      (targetPositions[index + 1] - initialPositions[index + 1]) * ease;

    // --------------------------------------------------------
    // posição Z
    // --------------------------------------------------------

    positions[index + 2] =
      initialPositions[index + 2] +
      (targetPositions[index + 2] - initialPositions[index + 2]) * ease;
  }

  geometry.attributes.position.needsUpdate = true;
}

// ============================================================
// RECRIAR ESPALHAMENTO
// ============================================================

function regenerateScatter() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const index = i * 3;

    initialPositions[index] =
      targetPositions[index] + (Math.random() - 0.5) * SPREAD;

    initialPositions[index + 1] =
      targetPositions[index + 1] + (Math.random() - 0.5) * SPREAD;

    initialPositions[index + 2] =
      targetPositions[index + 2] + (Math.random() - 0.5) * SPREAD;
  }
}

// ============================================================
// CICLO
// ============================================================

function startAnimation() {
  animation.progress = 0;

  gsap.to(animation, {
    progress: 1,

    duration: 4.5,

    ease: "power2.out",

    onUpdate: () => {
      updateParticles(animation.progress);
    },

    onComplete: () => {
      gsap.delayedCall(3.5, dissolve);
    },
  });
}

// ============================================================
// DISSOLVE
// ============================================================

function dissolve() {
  gsap.to(animation, {
    progress: 0,

    duration: 4,

    ease: "power2.in",

    onUpdate: () => {
      updateParticles(animation.progress);
    },

    onComplete: () => {
      regenerateScatter();

      gsap.delayedCall(0.5, startAnimation);
    },
  });
}

// ============================================================
// MOUSE / TOUCH
// ============================================================

let dragging = false;

let lastX = 0;
let lastY = 0;

let velocity = 0;

canvas.addEventListener("pointerdown", (e) => {
  dragging = true;

  lastX = e.clientX;

  lastY = e.clientY;

  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const dx = e.clientX - lastX;

  const dy = e.clientY - lastY;

  lastX = e.clientX;

  lastY = e.clientY;

  heart.rotation.y += dx * 0.006;

  heart.rotation.x += dy * 0.006;

  velocity = Math.sqrt(dx * dx + dy * dy);
});

function release() {
  dragging = false;

  velocity = 0;
}

canvas.addEventListener("pointerup", release);

canvas.addEventListener("pointercancel", release);

// ============================================================
// FAÍSCAS
// ============================================================

const SPARKLE_COUNT = isMobile ? 800 : 1500;

const sparklePositions = new Float32Array(SPARKLE_COUNT * 3);

const sparkleAlpha = new Float32Array(SPARKLE_COUNT);

const sparkleSizes = new Float32Array(SPARKLE_COUNT);

const sparkleVelocity = [];

const sparkleLife = [];

const sparkleMaxLife = [];

for (let i = 0; i < SPARKLE_COUNT; i++) {
  sparkleAlpha[i] = 0;

  sparkleSizes[i] = 1 + Math.random() * 5;

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
      value: particleTexture,
    },
  },

  vertexShader: `

      attribute float aAlpha;
      attribute float aSize;

      varying float vAlpha;

      void main() {

        vAlpha =
          aAlpha;

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize *
          (400.0 / -mvPosition.z);

        gl_Position =
          projectionMatrix *
          mvPosition;

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
            0.30,
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

let sparkleIndex = 0;

// ============================================================
// CRIAR FAÍSCA
// ============================================================

function createSparkle(position) {
  const i = sparkleIndex;

  sparklePositions[i * 3] = position.x;

  sparklePositions[i * 3 + 1] = position.y;

  sparklePositions[i * 3 + 2] = position.z;

  sparkleAlpha[i] = 1;

  sparkleLife[i] = 0;

  sparkleMaxLife[i] = 0.3 + Math.random() * 0.7;

  sparkleVelocity[i].set(
    (Math.random() - 0.5) * 100,

    (Math.random() - 0.5) * 100,

    (Math.random() - 0.5) * 100,
  );

  sparkleIndex++;

  if (sparkleIndex >= SPARKLE_COUNT) {
    sparkleIndex = 0;
  }
}

// ============================================================
// ATUALIZA FAÍSCAS
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

  // ----------------------------------------------------------
  // Giro automático
  // ----------------------------------------------------------

  if (!dragging) {
    heart.rotation.y += 0.001;
  }

  // ----------------------------------------------------------
  // Faíscas no arraste
  // ----------------------------------------------------------

  if (dragging && velocity > 1) {
    const amount = Math.min(15, Math.floor(velocity / 2));

    for (let i = 0; i < amount; i++) {
      const random = Math.floor(Math.random() * PARTICLE_COUNT);

      const index = random * 3;

      const point = new THREE.Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2],
      );

      point.applyMatrix4(heart.matrixWorld);

      createSparkle(point);
    }
  }

  updateSparkles(delta);

  renderer.render(scene, camera);
}

// ============================================================
// INICIAR
// ============================================================

updateParticles(0);

startAnimation();

animate();
