import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// Setup de base 
const container = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20232a);
scene.fog = new THREE.Fog(0x20232a, 10, 25);

const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(4, 3, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

//  Lumières 
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// Sol 
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

// Contrôles souris 
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Cube texturé 
const textureLoader = new THREE.TextureLoader();
const cubeTex = textureLoader.load(
  'https://threejs.org/examples/textures/brick_diffuse.jpg'
);
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ map: cubeTex, roughness: 0.6 })
);
cube.position.set(-2, 0, 0);
cube.castShadow = true;
scene.add(cube);

// Sphère 
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xff7b6b, metalness: 0.2 })
);
sphere.position.set(2, 0, 0);
sphere.castShadow = true;
scene.add(sphere);

// GLTF Model 
const loader = new GLTFLoader();
loader.load(
  '/ressources/scene.gltf',
  (gltf) => {
    const model = gltf.scene;
    model.position.set(0, -1, -3);
    model.scale.setScalar(2);
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    scene.add(model);
  },
  (xhr) => console.log(`Chargement GLTF: ${((xhr.loaded / xhr.total) * 100).toFixed(1)}%`),
  (err) => console.warn('Erreur chargement GLTF', err)
);

// Particules
const particleCount = 500;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 1] = Math.random() * 10 + 2;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 })
);
scene.add(particles);

//  DeviceOrientation 
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', (event) => {
    const { alpha, beta, gamma } = event;
    if (alpha !== null && beta !== null && gamma !== null) {
      // contrôle simple : fait tourner la caméra
      camera.rotation.x = THREE.MathUtils.degToRad(beta - 90);
      camera.rotation.y = THREE.MathUtils.degToRad(alpha);
    }
  });
}

// Animation 
const clock = new THREE.Clock();

// HUD 
const hud = document.getElementById('hud');
function updateHUD() {
  // Position
  const { x, y, z } = camera.position;
  const pos = `pos: x=${x.toFixed(2)} y=${y.toFixed(2)} z=${z.toFixed(2)}`;

  // Rotation en degrés
  const rx = THREE.MathUtils.radToDeg(camera.rotation.x).toFixed(1);
  const ry = THREE.MathUtils.radToDeg(camera.rotation.y).toFixed(1);
  const rz = THREE.MathUtils.radToDeg(camera.rotation.z).toFixed(1);
  const rot = `rot: x=${rx}° y=${ry}° z=${rz}°`;

  hud.textContent = `${pos}\n${rot}`;
}

function animate() {
  const t = clock.getElapsedTime();

  // Animations
  cube.rotation.x = t * 0.6;
  cube.rotation.y = t * 0.8;

  sphere.position.y = Math.sin(t * 2) * 0.5;

  // Particules qui tombent
  const pos = particles.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.array[i * 3 + 1] -= 0.05;
    if (pos.array[i * 3 + 1] < -1) {
      pos.array[i * 3 + 1] = Math.random() * 10 + 5;
    }
  }
  pos.needsUpdate = true;
  
  updateHUD();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Responsive 
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
