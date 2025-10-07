let scene, camera, renderer, globe, raycaster, mouse;
let userMarker3D,
  countryMarkers = [];
let autoRotate = false;
let countries = [];
let map,
  userMarkerLeaflet,
  countryMarkersLeaflet = [];
let userPosition = null;

let flagGroup;

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let hasMoved = false;
let justDragged = false;

// Exercice 1
// Initialisation de la scène Three.js
function initThreeJS() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / 2 / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  const container = document.getElementById("canvas-container");
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // lumières
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);

  // Raycaster pour la détection des clics
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createGlobe();

  // Evénements souris
  renderer.domElement.addEventListener("click", onGlobeClick);
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  window.addEventListener("resize", onWindowResize);

  renderer.setAnimationLoop(animate);
}

// Création de la sphère texturée
function createGlobe() {
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const loader = new THREE.TextureLoader();
  const earthTexture = loader.load(
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    () => console.log("Texture de la Terre chargée"),
    undefined,
    (err) => console.error("Erreur chargement texture:", err)
  );

  const material = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.7,
    metalness: 0.1,
  });

  globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Groupe pour les drapeaux
  flagGroup = new THREE.Group();
  globe.add(flagGroup);
}

// Conversion lat/lon en coordonnées cartésiennes 3D
function latLonToVector3(lat, lon, radius = 1, height = 0) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;

  const x = -(radius + height) * Math.sin(phi) * Math.cos(theta);
  const y = (radius + height) * Math.cos(phi);
  const z = (radius + height) * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// Conversion coordonnées 3D en lat/lon
function vector3ToLatLon(vector) {
  const normalized = vector.clone().normalize();
  const lat = (Math.asin(normalized.y) * 180) / Math.PI;
  const lon = (Math.atan2(normalized.z, -normalized.x) * 180) / Math.PI;
  return { lat, lon };
}

// Ajout d'un marqueur pour la position de utilisateur
function addUserMarker3D(lat, lon) {
  if (userMarker3D) scene.remove(userMarker3D);

  const geometry = new THREE.ConeGeometry(0.02, 0.08, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });

  userMarker3D = new THREE.Mesh(geometry, material);
  const position = latLonToVector3(lat, lon, 1, 0.04);
  userMarker3D.position.copy(position);
  userMarker3D.lookAt(0, 0, 0);
  userMarker3D.rotateX(Math.PI);
  scene.add(userMarker3D);

  rotateGlobeToPosition(lat, lon);
}

// Chargement des pays depuis l'API RestCountries
async function loadCountries() {
  showStatusMessage("Chargement des pays...");

  try {
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,latlng,flags,capital,population"
    );
    const allCountries = await response.json();

    countries = allCountries.filter((c) => c.latlng && c.latlng.length === 2);
    console.log("Pays chargés:", countries.length);

    countryMarkers.forEach((marker) => flagGroup.remove(marker));
    countryMarkers = [];
    document.getElementById("countryCount").textContent = "0";

    const textureLoader = new THREE.TextureLoader();
    let loadedCount = 0;

    if (countries.length === 0) {
      hideStatusMessage();
      addCountriesToLeaflet();
      return;
    }

    countries.forEach((country) => {
      const [lat, lon] = country.latlng;
      textureLoader.load(
        country.flags && country.flags.png ? country.flags.png : "",
        function (texture) {
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
          });
          const sprite = new THREE.Sprite(material);
          const position = latLonToVector3(lat, lon, 1, 0.02);
          sprite.position.copy(position);

          const img = texture.image;
          const aspect =
            img && img.width && img.height ? img.width / img.height : 2;
          const flagHeight = 0.08;
          sprite.scale.set(flagHeight * aspect, flagHeight, 1);

          sprite.userData = {
            country: country.name.common,
            lat: lat,
            lon: lon,
            flag: country.flags.png,
            capital: country.capital ? country.capital[0] : "N/A",
            population: country.population ?? 0,
          };

          flagGroup.add(sprite);
          countryMarkers.push(sprite);

          loadedCount++;
          document.getElementById("countryCount").textContent =
            countryMarkers.length;

          if (loadedCount === countries.length) {
            hideStatusMessage();
            addCountriesToLeaflet();
          }
        },
        undefined,
        function (err) {
          console.error("Erreur chargement drapeau:", err);
          const geometry = new THREE.SphereGeometry(0.015, 16, 16);
          const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3,
          });
          const marker = new THREE.Mesh(geometry, material);
          const position = latLonToVector3(lat, lon, 1, 0.02);
          marker.position.copy(position);

          marker.userData = {
            country: country.name.common,
            lat: lat,
            lon: lon,
            flag: country.flags?.png || "",
            capital: country.capital ? country.capital[0] : "N/A",
            population: country.population ?? 0,
          };

          flagGroup.add(marker);
          countryMarkers.push(marker);

          loadedCount++;
          document.getElementById("countryCount").textContent =
            countryMarkers.length;

          if (loadedCount === countries.length) {
            hideStatusMessage();
            addCountriesToLeaflet();
          }
        }
      );
    });
  } catch (error) {
    console.error("Erreur chargement pays:", error);
    alert("Erreur lors du chargement des pays.");
    hideStatusMessage();
  }
}

// Fonction d'animation
function animate() {
  if (autoRotate) globe.rotation.y += 0.001;
  renderer.render(scene, camera);
}

// Clic sur le globe
function onGlobeClick(event) {
  if (justDragged) {
    justDragged = false;
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(countryMarkers);
  if (intersects.length > 0) {
    const clicked = intersects[0].object.userData;
    if (map) {
      map.setView([clicked.lat, clicked.lon], 5);
      L.popup()
        .setLatLng([clicked.lat, clicked.lon])
        .setContent(
          `
                    <b>${clicked.country}</b><br>
                    <img src="${clicked.flag}" width="50"><br>
                    Capitale: ${clicked.capital}<br>
                    Population: ${clicked.population.toLocaleString()}
                `
        )
        .openOn(map);
    }
    rotateGlobeToPosition(clicked.lat, clicked.lon);
    document.getElementById("lastClick").textContent = clicked.country;
  } else {
    const intersectsGlobe = raycaster.intersectObject(globe);
    if (intersectsGlobe.length > 0) {
      const point = intersectsGlobe[0].point;
      const coords = vector3ToLatLon(point);
      if (map) map.setView([coords.lat, coords.lon], 8);
      rotateGlobeToPosition(coords.lat, coords.lon);
      document.getElementById("lastClick").textContent = `${coords.lat.toFixed(
        2
      )}°, ${coords.lon.toFixed(2)}°`;
    }
  }
}

// Rotation vers une position donnée
function rotateGlobeToPosition(lat, lon) {
  autoRotate = false;
  document.getElementById("autoRotate").checked = false;
  const targetRotationY = (-lon * Math.PI) / 180;
  const targetRotationX = (lat * Math.PI) / 180;
  globe.rotation.y = targetRotationY;
  globe.rotation.x = -targetRotationX * 0.3;
}

// Initialisation de Leaflet
function initLeaflet() {
  map = L.map("map").setView([48.8566, 2.3522], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  map.on("click", function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    rotateGlobeToPosition(lat, lon);
    L.popup()
      .setLatLng(e.latlng)
      .setContent(`Position: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`)
      .openOn(map);
    document.getElementById("lastClick").textContent = `Carte: ${lat.toFixed(
      2
    )}°, ${lon.toFixed(2)}°`;
  });
}

// Ajout des pays sur la carte Leaflet
function addCountriesToLeaflet() {
  countryMarkersLeaflet.forEach((m) => map.removeLayer(m));
  countryMarkersLeaflet = [];
  countries.forEach((country) => {
    const [lat, lon] = country.latlng;
    const marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(`
            <b>${country.name.common}</b><br>
            <img src="${country.flags.png}" width="50"><br>
            Capitale: ${country.capital ? country.capital[0] : "N/A"}<br>
            Population: ${country.population.toLocaleString()}
        `);
    marker.on("click", () => rotateGlobeToPosition(lat, lon));
    countryMarkersLeaflet.push(marker);
  });
}

// Géolocalisation utilisateur
function findMyLocation() {
  if (!navigator.geolocation) {
    alert("Géolocalisation non supportée");
    return;
  }
  showStatusMessage("Recherche de votre position...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      userPosition = { lat, lon };
      addUserMarker3D(lat, lon);
      if (userMarkerLeaflet) map.removeLayer(userMarkerLeaflet);
      userMarkerLeaflet = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "user-marker-leaflet",
          html: '<div style="background: #ff0000; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
          iconSize: [15, 15],
        }),
      }).addTo(map);
      userMarkerLeaflet.bindPopup(`
                <b>Votre position</b><br>
                Lat: ${lat.toFixed(4)}°<br>
                Lon: ${lon.toFixed(4)}°
            `);
      map.setView([lat, lon], 10);
      document.getElementById("userCoords").textContent = `${lat.toFixed(
        2
      )}°, ${lon.toFixed(2)}°`;
      hideStatusMessage();
    },
    (error) => {
      console.error("Erreur géolocalisation:", error);
      hideStatusMessage();
      alert("Impossible de récupérer votre position");
    }
  );
}

// Réinitialisation de la vue du globe
function resetGlobeView() {
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  globe.rotation.set(0, 0, 0);
  autoRotate = false;
  document.getElementById("autoRotate").checked = false;
}

// redimensionnement
function onWindowResize() {
  const container = document.getElementById("canvas-container");
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  if (map) map.invalidateSize();
}

// Affichage des messages d'état
function showStatusMessage(msg) {
  const el = document.getElementById("statusMessage");
  el.querySelector("h2").textContent = "Information";
  el.querySelector("p").textContent = msg;
  el.classList.remove("hidden");
}
function hideStatusMessage() {
  document.getElementById("statusMessage").classList.add("hidden");
}

// Gestion du drag de la souris pour faire tourner le globe
function onMouseDown(e) {
  isDragging = true;
  hasMoved = false;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  autoRotate = false;
  document.getElementById("autoRotate").checked = false;
}
function onMouseMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > 16) {
    hasMoved = true;
    const rotationSpeed = 0.005;
    globe.rotation.y += dx * rotationSpeed;
    globe.rotation.x += dy * rotationSpeed;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
  }
}
function onMouseUp() {
  isDragging = false;
  if (hasMoved) {
    justDragged = true;
    setTimeout(() => {
      justDragged = false;
    }, 100);
  }
}

// Gestion des boutons de l'interface
document.getElementById("autoRotate").addEventListener("change", (e) => {
  autoRotate = e.target.checked;
});
document.getElementById("showUserPosition").addEventListener("change", (e) => {
  if (userMarker3D) userMarker3D.visible = e.target.checked;
  if (userMarkerLeaflet) {
    e.target.checked
      ? map.addLayer(userMarkerLeaflet)
      : map.removeLayer(userMarkerLeaflet);
  }
});
document.getElementById("showCountries").addEventListener("change", (e) => {
  countryMarkers.forEach((m) => (m.visible = e.target.checked));
  countryMarkersLeaflet.forEach((m) => {
    e.target.checked ? map.addLayer(m) : map.removeLayer(m);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("Initialisation TD3...");
  initThreeJS();
  initLeaflet();
  loadCountries();
  setTimeout(findMyLocation, 1000);
});
