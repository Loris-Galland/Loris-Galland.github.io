const canvas = document.getElementById("renderCanvas");

// Création de l'engine Babylon.js
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});

// Setup de base
var createScene = function () {
  // Scène
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.13, 0.14, 0.16, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.02;
  scene.fogColor = new BABYLON.Color3(0.13, 0.14, 0.16);

  // Caméra
  // ArcRotateCamera pour le dezoom
  const camera = new BABYLON.ArcRotateCamera(
    "camera1",
    -Math.PI / 2, 
    Math.PI / 3.5, 
    8, 
    new BABYLON.Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 40;
  camera.wheelPrecision = 100;
  camera.allowUpsideDown = false; 
  camera.lowerBetaLimit = 0.1; 
  camera.upperBetaLimit = Math.PI / 2; 

  // Lumières
  const hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.6;
  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-1, -2, -1),
    scene
  );
  dirLight.position = new BABYLON.Vector3(5, 8, 5);

  // Sol
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 40, height: 40 },
    scene
  );
  ground.position.y = -1;
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.17, 0.18, 0.21);
  ground.material = groundMat;

  // Cube
  const cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 1.2 }, scene);
  cube.position = new BABYLON.Vector3(-2, 0.6, 1);
  const cubeMat = new BABYLON.StandardMaterial("cubeMat", scene);
  cubeMat.diffuseTexture = new BABYLON.Texture(
    "https://threejs.org/examples/textures/brick_diffuse.jpg",
    scene
  );
  cube.material = cubeMat;

  // Sphère
  const sphere = BABYLON.MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 1.6, segments: 32 },
    scene
  );
  sphere.position = new BABYLON.Vector3(2, 0.8, 1);
  const sphereMat = new BABYLON.StandardMaterial("sphereMat", scene);
  sphereMat.diffuseColor = new BABYLON.Color3(1, 0.48, 0.42);
  sphere.material = sphereMat;

  // GLTF Model
  let model = null;
  BABYLON.SceneLoader.ImportMesh(
    "", // importer tous les meshes
    "./ressources/", // dossier
    "scene.gltf", // fichier
    scene,
    function (meshes) {
      // callback de succès
      if (meshes.length > 0) {
        model = new BABYLON.TransformNode("modelRoot", scene); // un noeud parent pour tout le modèle
        meshes.forEach((m) => {
          m.parent = model;
          if (m instanceof BABYLON.Mesh) {
            m.receiveShadows = true;
          }
        });
        model.position = new BABYLON.Vector3(0, 0, -3);
        model.scaling = new BABYLON.Vector3(2, 2, 2);
        // model.rotation.y = Math.PI / 2;
      }
      console.log("Modèle GLTF chargé !");
    },
    null,
    function (scene, message, exception) {
      console.error("Erreur de chargement GLTF :", message, exception);
    }
  );

  // Particules
  const particleSystem = new BABYLON.ParticleSystem("particles", 500, scene);
  particleSystem.particleTexture = new BABYLON.Texture(
    "https://playground.babylonjs.com/textures/flare.png",
    scene
  );
  particleSystem.emitter = new BABYLON.Vector3(0, 6, 0);
  particleSystem.minEmitBox = new BABYLON.Vector3(-10, 0, -10);
  particleSystem.maxEmitBox = new BABYLON.Vector3(10, 0, 10);
  particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
  particleSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
  particleSystem.minSize = 0.05;
  particleSystem.maxSize = 0.1;
  particleSystem.minLifeTime = 1;
  particleSystem.maxLifeTime = 3;
  particleSystem.emitRate = 120;
  particleSystem.gravity = new BABYLON.Vector3(0, -0.6, 0);
  particleSystem.direction1 = new BABYLON.Vector3(-0.1, -1, -0.1);
  particleSystem.direction2 = new BABYLON.Vector3(0.1, -1, 0.1);
  particleSystem.start();

  // HUD
  const hud = document.getElementById("hud");
  function updateHUD() {
    const pos = camera.position;
    hud.textContent = `pos: x=${pos.x.toFixed(2)} y=${pos.y.toFixed(
      2
    )} z=${pos.z.toFixed(2)}`;
  }

  // DeviceOrientation
  let gyroRotation = { x: 0, y: 0 };
  window.addEventListener("deviceorientation", (event) => {
    const { alpha, beta } = event;
    if (alpha !== null && beta !== null) {
      gyroRotation.x = BABYLON.Angle.FromDegrees(beta - 90).radians();
      gyroRotation.y = BABYLON.Angle.FromDegrees(alpha).radians();
    }
  });

  // Animation
  let accumTime = 0;
  scene.registerBeforeRender(function () {
    accumTime += engine.getDeltaTime() / 1000;

    // base anim
    const baseX = accumTime * 0.6;
    const baseY = accumTime * 0.8;

    // Animation + gyroscope
    cube.rotation.x = baseX + gyroRotation.x * 0.25;
    cube.rotation.y = baseY + gyroRotation.y * 0.25;

    // sphère + gyroscope
    sphere.position.y = 0.8 + Math.sin(accumTime * 2) * 0.15;
    sphere.rotation.x = gyroRotation.x * 0.5;
    sphere.rotation.y = gyroRotation.y * 0.5;

    // modèle + offset
    if (model) {
      model.rotation.x = gyroRotation.x * 0.3;
      model.rotation.y = gyroRotation.y * 0.3;
    }

    updateHUD();
  });

  return scene;
};

// Création de la scène
const scene = createScene();

engine.runRenderLoop(function () {
  scene.render();
});

// Responsive
window.addEventListener("resize", function () {
  engine.resize();
});
