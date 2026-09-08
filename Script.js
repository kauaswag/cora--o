// ============================================================
// HEART PARTICLE ANIMATION
// ============================================================

// ------------------------------------------------------------
// CONFIGURAÇÕES
// ------------------------------------------------------------

const CONFIG = {
  // Quantidade principal de partículas
  PARTICLES: window.innerWidth < 600 ? 8500 : 14000,

  // Quantidade de partículas soltas ao redor
  SPARKLES: window.innerWidth < 600 ? 1200 : 2200,

  // Tamanho das partículas
  PARTICLE_SIZE: window.innerWidth < 600 ? 2.8 : 3.2,

  // Tamanho máximo das partículas
  PARTICLE_SIZE_RANDOM: 3.8,

  // Tamanho do coração
  HEART_SCALE: window.innerWidth < 600 ? 13.5 : 15.5,

  // Espessura 3D do coração
  DEPTH: 75,

  // Quanto o coração se espalha
  SCATTER_X: 700,
  SCATTER_Y: 650,
  SCATTER_Z: 600,

  // Tempo parado depois de formar
  HOLD_TIME: 3.5,

  // Tempo para formar
  FORM_TIME: 3.8,

  // Tempo para desaparecer
  DISSOLVE_TIME: 4.0,

  // Intervalo entre partículas
  STAGGER: 0.00018,
};

// ============================================================
// THREE.JS
// ============================================================

const canvas = document.getElementById("canvas");

canvas.style.touchAction = "none";

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setClearColor(0x050505, 1);

// ------------------------------------------------------------
// SCENE
// ------------------------------------------------------------

const scene = new THREE.Scene();

// ------------------------------------------------------------
// CAMERA
// ------------------------------------------------------------

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  3000,
);

camera.position.z = 520;

// ============================================================
// RESIZE
// ============================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

// ============================================================
// TEXTURA DE GLOW
// ============================================================

function createGlowTexture() {
  const size = 128;

  const textureCanvas = document.createElement("canvas");

  textureCanvas.width = size;
  textureCanvas.height = size;

  const ctx = textureCanvas.getContext("2d");

  const center = size / 2;

  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");

  gradient.addColorStop(0.12, "rgba(255,210,225,1)");

  gradient.addColorStop(0.3, "rgba(255,105,160,0.95)");

  gradient.addColorStop(0.55, "rgba(255,45,115,0.45)");

  gradient.addColorStop(1, "rgba(255,0,90,0)");

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(textureCanvas);

  texture.needsUpdate = true;

  return texture;
}

const glowTexture = createGlowTexture();

// ============================================================
// FUNÇÃO MATEMÁTICA DO CORAÇÃO
// ============================================================
//
// Essa é a famosa equação paramétrica:
//
// X = 16 sin³(t)
// Y = 13 cos(t)
//     - 5 cos(2t)
//     - 2 cos(3t)
//     - cos(4t)
//
// Aqui usamos ela para gerar uma área preenchida,
// e não apenas o contorno.
// ============================================================

function heartPoint(t, scale) {
  const x = 16 * Math.pow(Math.sin(t), 3);

  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);

  return {
    x: x * scale,
    y: y * scale,
  };
}

// ============================================================
// GERAÇÃO DAS PARTÍCULAS DO CORAÇÃO
// ============================================================

const particleCount = CONFIG.PARTICLES;

const positions = new Float32Array(particleCount * 3);

const targets = new Float32Array(particleCount * 3);

const scatterPositions = new Float32Array(particleCount * 3);

const particleSizes = new Float32Array(particleCount);

const particleAlpha = new Float32Array(particleCount);

// ------------------------------------------------------------
// Função que cria um ponto dentro do coração
// ------------------------------------------------------------

function createHeartParticle() {
  // Escolhemos um ângulo
  const t = Math.random() * Math.PI * 2;

  // Ponto da borda
  const edge = heartPoint(t, CONFIG.HEART_SCALE);

  // sqrt cria distribuição mais uniforme
  // dentro da área.
  const radius = Math.sqrt(Math.random());

  let x = edge.x * radius;

  let y = edge.y * radius;

  // Pequena irregularidade
  x += (Math.random() - 0.5) * 2.5;

  y += (Math.random() - 0.5) * 2.5;

  // ----------------------------------------------------------
  // Cria profundidade 3D
  // ----------------------------------------------------------

  const z = (Math.random() - 0.5) * CONFIG.DEPTH;

  // ----------------------------------------------------------
  // Algumas partículas ficam mais próximas da borda.
  // Isso ajuda a dar o aspecto "nuvem".
  // ----------------------------------------------------------

  if (Math.random() < 0.38) {
    const edgeAmount = 0.82 + Math.random() * 0.2;

    x *= edgeAmount;
    y *= edgeAmount;
  }

  return {
    x,
    y,
    z,
  };
}

// ============================================================
// CRIA TODAS AS PARTÍCULAS
// ============================================================

for (let i = 0; i < particleCount; i++) {
  const index = i * 3;

  // Posição final
  const heart = createHeartParticle();

  targets[index] = heart.x;

  targets[index + 1] = heart.y;

  targets[index + 2] = heart.z;

  // ----------------------------------------------------------
  // Posição inicial espalhada
  // ----------------------------------------------------------

  scatterPositions[index] = heart.x + (Math.random() - 0.5) * CONFIG.SCATTER_X;

  scatterPositions[index + 1] =
    heart.y + (Math.random() - 0.5) * CONFIG.SCATTER_Y;

  scatterPositions[index + 2] =
    heart.z + (Math.random() - 0.5) * CONFIG.SCATTER_Z;

  // Começa espalhado
  positions[index] = scatterPositions[index];

  positions[index + 1] = scatterPositions[index + 1];

  positions[index + 2] = scatterPositions[index + 2];

  // ----------------------------------------------------------
  // Tamanho aleatório
  // ----------------------------------------------------------

  particleSizes[i] =
    CONFIG.PARTICLE_SIZE + Math.random() * CONFIG.PARTICLE_SIZE_RANDOM;

  // Alpha aleatório
  particleAlpha[i] = 0.35 + Math.random() * 0.65;
}

// ============================================================
// GEOMETRIA
// ============================================================

const geometry = new THREE.BufferGeometry();

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

geometry.setAttribute("aSize", new THREE.BufferAttribute(particleSizes, 1));

geometry.setAttribute("aAlpha", new THREE.BufferAttribute(particleAlpha, 1));

// ============================================================
// SHADER DAS PARTÍCULAS
// ============================================================

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: {
      value: glowTexture,
    },

    uPixelRatio: {
      value: Math.min(window.devicePixelRatio || 1, 2),
    },
  },

  vertexShader: `

      attribute float aSize;
      attribute float aAlpha;

      varying float vAlpha;

      uniform float uPixelRatio;

      void main() {

        vAlpha = aAlpha;

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize *
          uPixelRatio *
          (420.0 / -mvPosition.z);

        gl_Position =
          projectionMatrix *
          mvPosition;

      }

    `,

  fragmentShader: `

      uniform sampler2D uTexture;

      varying float vAlpha;

      void main() {

        vec4 textureColor =
          texture2D(
            uTexture,
            gl_PointCoord
          );

        // Rosa principal
        vec3 pink =
          vec3(
            1.0,
            0.12,
            0.42
          );

        // Pequena variação de brilho
        float brightness =
          textureColor.r;

        vec3 finalColor =
          pink *
          (0.65 + brightness * 0.65);

        float alpha =
          textureColor.a *
          vAlpha;

        if (alpha < 0.01)
          discard;

        gl_FragColor =
          vec4(
            finalColor,
            alpha
          );

      }

    `,

  transparent: true,

  depthWrite: false,

  blending: THREE.AdditiveBlending,
});

// ============================================================
// OBJETO DO CORAÇÃO
// ============================================================

const heart = new THREE.Points(geometry, particleMaterial);

scene.add(heart);

// ============================================================
// ANIMAÇÃO DAS PARTÍCULAS
// ============================================================

const animationData = {
  progress: 0,
};

// ------------------------------------------------------------
// Função para atualizar posição
// ------------------------------------------------------------

function updateParticles(progress) {
  for (let i = 0; i < particleCount; i++) {
    const index = i * 3;

    // --------------------------------------------------------
    // Delay individual
    // --------------------------------------------------------

    const delay = (i / particleCount) * 0.65;

    let p = (progress - delay) / (1 - delay);

    p = Math.max(0, Math.min(1, p));

    // Ease
    const eased = p * p * (3 - 2 * p);

    // --------------------------------------------------------
    // Movimento
    // --------------------------------------------------------

    positions[index] =
      scatterPositions[index] +
      (targets[index] - scatterPositions[index]) * eased;

    positions[index + 1] =
      scatterPositions[index + 1] +
      (targets[index + 1] - scatterPositions[index + 1]) * eased;

    positions[index + 2] =
      scatterPositions[index + 2] +
      (targets[index + 2] - scatterPositions[index + 2]) * eased;
  }

  geometry.attributes.position.needsUpdate = true;
}

// ============================================================
// LOOP DE ANIMAÇÃO GSAP
// ============================================================

function playHeartAnimation() {
  animationData.progress = 0;

  // ----------------------------------------------------------
  // FORMA
  // ----------------------------------------------------------

  gsap.to(animationData, {
    progress: 1,

    duration: CONFIG.FORM_TIME,

    ease: "power2.out",

    onUpdate: () => {
      updateParticles(animationData.progress);
    },

    onComplete: () => {
      // Espera parado
      gsap.delayedCall(CONFIG.HOLD_TIME, dissolveHeart);
    },
  });
}

// ============================================================
// DISSOLVE
// ============================================================

function dissolveHeart() {
  gsap.to(animationData, {
    progress: 0,

    duration: CONFIG.DISSOLVE_TIME,

    ease: "power2.inOut",

    onUpdate: () => {
      updateParticles(animationData.progress);
    },

    onComplete: () => {
      // Novas posições aleatórias
      for (let i = 0; i < particleCount; i++) {
        const index = i * 3;

        scatterPositions[index] =
          targets[index] + (Math.random() - 0.5) * CONFIG.SCATTER_X;

        scatterPositions[index + 1] =
          targets[index + 1] + (Math.random() - 0.5) * CONFIG.SCATTER_Y;

        scatterPositions[index + 2] =
          targets[index + 2] + (Math.random() - 0.5) * CONFIG.SCATTER_Z;
      }

      // Reinicia
      gsap.delayedCall(0.7, playHeartAnimation);
    },
  });
}

// ============================================================
// FAÍSCAS
// ============================================================

const sparkleCount = CONFIG.SPARKLES;

const sparklePositions = new Float32Array(sparkleCount * 3);

const sparkleAlpha = new Float32Array(sparkleCount);

const sparkleSize = new Float32Array(sparkleCount);

// ------------------------------------------------------------
// Dados individuais
// ------------------------------------------------------------

const sparkleVelocity = [];

const sparkleLife = [];

const sparkleMaxLife = [];

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------

for (let i = 0; i < sparkleCount; i++) {
  sparklePositions[i * 3] = 0;
  sparklePositions[i * 3 + 1] = 0;
  sparklePositions[i * 3 + 2] = 0;

  sparkleAlpha[i] = 0;

  sparkleSize[i] = 1.5 + Math.random() * 4;

  sparkleVelocity.push(new THREE.Vector3());

  sparkleLife.push(0);

  sparkleMaxLife.push(1);
}

// ============================================================
// GEOMETRIA DAS FAÍSCAS
// ============================================================

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
  new THREE.BufferAttribute(sparkleSize, 1),
);

// ============================================================
// SHADER DAS FAÍSCAS
// ============================================================

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

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position, 1.0);

        gl_PointSize =
          aSize *
          (350.0 / -mvPosition.z);

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

        vec3 color =
          vec3(
            1.0,
            0.18,
            0.48
          );

        gl_FragColor =
          vec4(
            color,
            tex.a * vAlpha
          );

      }

    `,

  transparent: true,

  depthWrite: false,

  blending: THREE.AdditiveBlending,
});

const sparklePoints = new THREE.Points(sparkleGeometry, sparkleMaterial);

scene.add(sparklePoints);

// ============================================================
// CRIAR UMA FAÍSCA
// ============================================================

let sparkleCursor = 0;

function spawnSparkle(position) {
  const i = sparkleCursor;

  sparklePositions[i * 3] = position.x;

  sparklePositions[i * 3 + 1] = position.y;

  sparklePositions[i * 3 + 2] = position.z;

  sparkleAlpha[i] = 1;

  sparkleSize[i] = 2 + Math.random() * 6;

  sparkleVelocity[i].set(
    (Math.random() - 0.5) * 80,

    (Math.random() - 0.5) * 80,

    (Math.random() - 0.5) * 80,
  );

  sparkleLife[i] = 0;

  sparkleMaxLife[i] = 0.35 + Math.random() * 0.8;

  sparkleCursor++;

  if (sparkleCursor >= sparkleCount) {
    sparkleCursor = 0;
  }
}

// ============================================================
// ATUALIZA FAÍSCAS
// ============================================================

function updateSparkles(delta) {
  for (let i = 0; i < sparkleCount; i++) {
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
// CONTROLE DE MOUSE / TOUCH
// ============================================================

let isDragging = false;

let previousX = 0;
let previousY = 0;

let dragVelocity = 0;

// ------------------------------------------------------------
// DOWN
// ------------------------------------------------------------

canvas.addEventListener("pointerdown", (event) => {
  isDragging = true;

  previousX = event.clientX;

  previousY = event.clientY;

  canvas.setPointerCapture(event.pointerId);
});

// ------------------------------------------------------------
// MOVE
// ------------------------------------------------------------

canvas.addEventListener("pointermove", (event) => {
  if (!isDragging) return;

  const dx = event.clientX - previousX;

  const dy = event.clientY - previousY;

  previousX = event.clientX;

  previousY = event.clientY;

  // Sensibilidade
  const sensitivity = 0.006;

  heart.rotation.y += dx * sensitivity;

  heart.rotation.x += dy * sensitivity;

  dragVelocity = Math.sqrt(dx * dx + dy * dy);
});

// ------------------------------------------------------------
// UP
// ------------------------------------------------------------

function stopDragging() {
  isDragging = false;

  dragVelocity = 0;
}

canvas.addEventListener("pointerup", stopDragging);

canvas.addEventListener("pointercancel", stopDragging);

// ============================================================
// ANIMAÇÃO
// ============================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // ----------------------------------------------------------
  // Rotação automática
  // ----------------------------------------------------------

  if (!isDragging) {
    heart.rotation.y += 0.0012;
  }

  // ----------------------------------------------------------
  // Faíscas durante arraste
  // ----------------------------------------------------------

  if (isDragging && dragVelocity > 1) {
    const amount = Math.min(18, Math.floor(dragVelocity / 2));

    for (let i = 0; i < amount; i++) {
      const randomIndex = Math.floor(Math.random() * particleCount);

      const index = randomIndex * 3;

      const localPosition = new THREE.Vector3(
        positions[index],
        positions[index + 1],
        positions[index + 2],
      );

      const worldPosition = localPosition.applyMatrix4(heart.matrixWorld);

      spawnSparkle(worldPosition);
    }
  }

  updateSparkles(delta);

  renderer.render(scene, camera);
}

// ============================================================
// INICIAR
// ============================================================

updateParticles(0);

playHeartAnimation();

animate();
