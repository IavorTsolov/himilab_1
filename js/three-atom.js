/* ============================================================
   ХимиЛаб — 3D Atom Renderer (three-atom.js)
   Powered by Three.js
   ============================================================ */

let scene, camera, renderer, atomGroup, animationId;
let electrons = [];
let isPlaying = true;
let angleMultiplier = 1.0;
let _container = null;
let currentRotation = { x: 0.3, y: 0.3 };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Shared geometries and materials for performance
let sphereGeometryCache = {};
let orbitMaterial, electronMaterial, protonMaterial, neutronMaterial;

function getSphereGeometry(radius, segments) {
  const key = `${radius}_${segments}`;
  if (!sphereGeometryCache[key]) {
    sphereGeometryCache[key] = new THREE.SphereGeometry(radius, segments, segments);
  }
  return sphereGeometryCache[key];
}

function init3DScene(container) {
  if (!window.THREE) {
    console.error("Three.js not loaded. Cannot initialize 3D atom visualizer.");
    return;
  }
  _container = container;
  const width = container.clientWidth || 320;
  const height = container.clientHeight || 320;

  // Scene setup
  scene = new THREE.Scene();

  // Camera setup
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 18;

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  
  // Clear container and append canvas
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Lights setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight1.position.set(10, 15, 10);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x4facfe, 0.3);
  dirLight2.position.set(-10, -10, -10);
  scene.add(dirLight2);

  // Core Atom Group
  atomGroup = new THREE.Group();
  atomGroup.rotation.x = currentRotation.x;
  atomGroup.rotation.y = currentRotation.y;
  scene.add(atomGroup);

  // Initialize Materials
  orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0x8da3c8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide
  });

  electronMaterial = new THREE.MeshStandardMaterial({
    color: 0x3bc9ff,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.8
  });

  protonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5fa2,
    roughness: 0.15,
    metalness: 0.7,
    emissive: 0xe11d48,
    emissiveIntensity: 1.2
  });

  neutronMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b8cff,
    roughness: 0.25,
    metalness: 0.6,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.7
  });

  // Mouse & Touch Interaction for rotation
  const canvas = renderer.domElement;
  
  const handleStart = (x, y) => {
    isDragging = true;
    previousMousePosition = { x, y };
  };

  const handleMove = (x, y) => {
    if (!isDragging) return;
    const deltaX = x - previousMousePosition.x;
    const deltaY = y - previousMousePosition.y;

    currentRotation.y += deltaX * 0.007;
    currentRotation.x += deltaY * 0.007;

    // Clamp rotation X to prevent flipping over
    currentRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, currentRotation.x));

    atomGroup.rotation.x = currentRotation.x;
    atomGroup.rotation.y = currentRotation.y;

    previousMousePosition = { x, y };
  };

  const handleEnd = () => {
    isDragging = false;
  };

  // Bind Mouse Events
  canvas.addEventListener("mousedown", (e) => handleStart(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", handleEnd);

  // Bind Touch Events
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
  
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });
  
  canvas.addEventListener("touchend", handleEnd);

  // Resize handler
  window.addEventListener("resize", handleResize);

  isPlaying = true;
  animate3D();
}

function handleResize() {
  if (!renderer || !_container || !camera) return;
  const width = _container.clientWidth || 320;
  const height = _container.clientHeight || 320;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function updateAtomStructure(atomicNumber, atomicWeight, category) {
  if (!atomGroup) return;

  // Clear previous meshes
  while (atomGroup.children.length > 0) {
    atomGroup.remove(atomGroup.children[0]);
  }
  electrons = [];

  // Determine proton & neutron counts
  const protons = Number(atomicNumber);
  const neutrons = Math.max(0, Math.round(Number(atomicWeight)) - protons);

  // 1. Render Nucleus (Cluster of Protons and Neutrons)
  const nucleusGroup = new THREE.Group();
  atomGroup.add(nucleusGroup);

  const particleRadius = 0.55;
  const segments = 20;
  const protonGeo = getSphereGeometry(particleRadius, segments);
  const neutronGeo = getSphereGeometry(particleRadius, segments);

  const totalNucleons = protons + neutrons;
  // Volumetric scale factor based on number of nucleons - much larger for prominence
  const nucleusScale = Math.max(1.0, Math.min(3.5, Math.pow(totalNucleons, 1/3) * 0.65));

  // Generate nucleon positions inside a sphere using Fibonacci grid
  const phi = Math.PI * (3 - Math.sqrt(5));
  const particleList = [];
  
  for (let i = 0; i < protons; i++) particleList.push({ type: 'proton' });
  for (let i = 0; i < neutrons; i++) particleList.push({ type: 'neutron' });

  // Shuffle list for natural scattering
  for (let i = particleList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [particleList[i], particleList[j]] = [particleList[j], particleList[i]];
  }

  // Create nucleon spheres
  for (let i = 0; i < particleList.length; i++) {
    const p = particleList[i];
    const k = i + 0.5;
    const y = 1 - (k / totalNucleons) * 2;
    const theta = phi * k;
    const r = Math.sqrt(1 - y * y);

    const x = Math.cos(theta) * r * nucleusScale;
    const z = Math.sin(theta) * r * nucleusScale;
    const yPos = y * nucleusScale;

    // Standard positioning with a tiny random jitter
    const jitter = 0.08;
    const px = x + (Math.random() - 0.5) * jitter;
    const py = yPos + (Math.random() - 0.5) * jitter;
    const pz = z + (Math.random() - 0.5) * jitter;

    const mesh = new THREE.Mesh(
      p.type === 'proton' ? protonGeo : neutronGeo,
      p.type === 'proton' ? protonMaterial : neutronMaterial
    );
    mesh.position.set(px, py, pz);
    nucleusGroup.add(mesh);
  }

  // Nucleus center glow light
  if (protons > 1) {
    const glowLight = new THREE.PointLight(0xff5fa2, 2.5, 12);
    nucleusGroup.add(glowLight);
  }

  // 2. Render Electron Shells and Orbiting Electrons
  // Bohr model simplified electron configuration builder
  const shellCaps = [2, 8, 8, 18, 18, 32, 32];
  let electronsRemaining = protons;
  let shellsUsed = 0;

  const electronRadius = 0.22;
  const elGeo = getSphereGeometry(electronRadius, 12);

  // Customize electron emissive color based on element category for custom glow
  let glowColor = 0x3bc9ff;
  if (category === 'alkali' || category === 'alkaline') glowColor = 0xff9e45;
  else if (category === 'noble') glowColor = 0x9b8cff;
  else if (category === 'nonmetal' || category === 'halogen') glowColor = 0x34e3b0;
  
  electronMaterial.color.setHex(glowColor);
  electronMaterial.emissive.setHex(glowColor);

  for (let s = 0; s < shellCaps.length; s++) {
    if (electronsRemaining <= 0) break;
    shellsUsed++;
    const count = Math.min(electronsRemaining, shellCaps[s]);
    electronsRemaining -= count;

    // Shell radius starts outside nucleus and extends outward
    const shellRadius = nucleusScale + 2.2 + s * 1.5;

    // Renders Orbit Ring (using TorusGeometry)
    const torusTube = 0.022;
    const orbitGeo = new THREE.TorusGeometry(shellRadius, torusTube, 8, 64);
    const orbitMesh = new THREE.Mesh(orbitGeo, orbitMaterial);
    orbitMesh.rotation.x = Math.PI / 2;
    atomGroup.add(orbitMesh);

    // Place orbiting electrons
    for (let e = 0; e < count; e++) {
      const elMesh = new THREE.Mesh(elGeo, electronMaterial);
      const angleOffset = (e / count) * Math.PI * 2;
      
      elMesh.userData = {
        radius: shellRadius,
        angle: angleOffset,
        speed: (0.015 - s * 0.0016) * (1.2 - Math.random() * 0.4), // Inner shell electrons orbit faster
        trailMeshes: []
      };

      elMesh.position.x = shellRadius * Math.cos(angleOffset);
      elMesh.position.z = shellRadius * Math.sin(angleOffset);
      elMesh.position.y = 0;

      // Create electron tail/trail for smooth visual fluid flow
      const trailCount = 5;
      for (let t = 0; t < trailCount; t++) {
        const trailMat = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.35 - t * 0.06
        });
        const trailGeo = getSphereGeometry(electronRadius * (1.0 - t * 0.15), 8);
        const trailMesh = new THREE.Mesh(trailGeo, trailMat);
        trailMesh.position.copy(elMesh.position);
        atomGroup.add(trailMesh);
        elMesh.userData.trailMeshes.push(trailMesh);
      }

      atomGroup.add(elMesh);
      electrons.push(elMesh);
    }
  }

  // Adjust camera distance depending on atom size
  const maxRadius = nucleusScale + 2.2 + (shellsUsed - 1) * 1.5;
  camera.position.z = Math.max(12, Math.min(35, maxRadius * 2.2));
  currentRotation = { x: 0.3, y: 0.3 };
  atomGroup.rotation.set(currentRotation.x, currentRotation.y, 0);
}

function animate3D() {
  if (!renderer || !isPlaying) return;
  animationId = requestAnimationFrame(animate3D);

  const speedMultiplier = angleMultiplier * 1.0;

  // Orbit electrons and update trails
  electrons.forEach((el) => {
    // Save previous positions for trails
    const history = [];
    const trail = el.userData.trailMeshes;

    if (trail.length > 0) {
      // Shift trail positions down the chain
      for (let i = trail.length - 1; i > 0; i--) {
        trail[i].position.copy(trail[i - 1].position);
      }
      trail[0].position.copy(el.position);
    }

    // Increment orbital angle
    el.userData.angle += el.userData.speed * speedMultiplier;
    const r = el.userData.radius;
    const a = el.userData.angle;

    el.position.x = r * Math.cos(a);
    el.position.z = r * Math.sin(a);
    el.position.y = 0.05 * Math.sin(a * 2); // Tiny wobble to make orbits 3D
  });

  // Soft rotation of entire atom group
  if (!isDragging) {
    atomGroup.rotation.y += 0.0035;
  }

  renderer.render(scene, camera);
}

function toggleAtomPlay(play) {
  isPlaying = play;
  if (isPlaying) {
    animate3D();
  } else {
    cancelAnimationFrame(animationId);
  }
}

function resetAtomView() {
  currentRotation = { x: 0.3, y: 0.3 };
  if (atomGroup) {
    atomGroup.rotation.set(currentRotation.x, currentRotation.y, 0);
  }
}

function cleanup3D() {
  cancelAnimationFrame(animationId);
  window.removeEventListener("resize", handleResize);
  sphereGeometryCache = {};
  scene = null;
  camera = null;
  renderer = null;
  atomGroup = null;
  electrons = [];
  _container = null;
}
