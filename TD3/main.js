let scene, camera, renderer, globe, raycaster, mouse;
let userMarker3D, countryMarkers = [];
let autoRotate = true;
let countries = [];
let map, userMarkerLeaflet, countryMarkersLeaflet = [];
let userPosition = null;


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
    const container = document.getElementById('canvas-container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Raycaster pour la détection des clics
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    createGlobe();
    
    renderer.domElement.addEventListener('click', onGlobeClick);
    window.addEventListener('resize', onWindowResize);
    
    renderer.setAnimationLoop(animate);
}

// Création de la sphère texturée (planète Terre)
function createGlobe() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    const loader = new THREE.TextureLoader();
    const earthTexture = loader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
        function() {
            console.log('Texture de la Terre chargée');
        },
        undefined,
        function(err) {
            console.error('Erreur chargement texture:', err);
        }
    );
    
    const material = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.7,
        metalness: 0.1
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);
}

// Conversion Lat/Lon en coordonnées cartésiennes 3D
function latLonToVector3(lat, lon, radius = 1, height = 0) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    
    const x = -(radius + height) * Math.sin(phi) * Math.cos(theta);
    const y = (radius + height) * Math.cos(phi);
    const z = (radius + height) * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
}

// Conversion coordonnées 3D en Lat/Lon
function vector3ToLatLon(vector) {
    const normalized = vector.clone().normalize();
    const lat = Math.asin(normalized.y) * 180 / Math.PI;
    const lon = Math.atan2(normalized.z, -normalized.x) * 180 / Math.PI;
    return { lat, lon };
}

// Ajout d'un marqueur pour la position de l'utilisateur
function addUserMarker3D(lat, lon) {
    if (userMarker3D) {
        scene.remove(userMarker3D);
    }
    
    const geometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
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
    showStatusMessage('Chargement des pays...');
    
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
        const allCountries = await response.json();
        
        // Prendre 30 pays aléatoires
        countries = allCountries
            .filter(c => c.latlng && c.latlng.length === 2)
            .sort(() => Math.random() - 0.5)
            .slice(0, 30);
        
        console.log('Pays chargés:', countries.length);
        
        // Effacer les anciens marqueurs
        countryMarkers.forEach(marker => scene.remove(marker));
        countryMarkers = [];
        
        // Créer les marqueurs 3D pour chaque pays
        countries.forEach(country => {
            const [lat, lon] = country.latlng;
            
            const geometry = new THREE.SphereGeometry(0.015, 16, 16);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 0.3
            });
            
            const marker = new THREE.Mesh(geometry, material);
            const position = latLonToVector3(lat, lon, 1, 0.02);
            marker.position.copy(position);
            
            marker.userData = {
                country: country.name.common,
                lat: lat,
                lon: lon,
                flag: country.flags.png,
                capital: country.capital ? country.capital[0] : 'N/A',
                population: country.population
            };
            
            scene.add(marker);
            countryMarkers.push(marker);
        });
        
        document.getElementById('countryCount').textContent = countryMarkers.length;
        hideStatusMessage();
        
        addCountriesToLeaflet();
        
    } catch (error) {
        console.error('Erreur chargement pays:', error);
        alert('Erreur lors du chargement des pays. Vérifiez votre connexion internet.');
        hideStatusMessage();
    }
}

// Animation du globe
function animate() {
    if (autoRotate && globe) {
        globe.rotation.y += 0.001;
    }
    
    renderer.render(scene, camera);
}


// Exercice 2
// Détection des clics sur le globe (Raycaster)
function onGlobeClick(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Vérifier intersection avec les marqueurs de pays
    const intersects = raycaster.intersectObjects(countryMarkers);
    
    if (intersects.length > 0) {
        const clickedMarker = intersects[0].object;
        const countryData = clickedMarker.userData;
        
        console.log('Pays cliqué:', countryData.country);
        
        // Recentrer la carte Leaflet sur le pays cliqué
        if (map) {
            map.setView([countryData.lat, countryData.lon], 5);
            
            L.popup()
                .setLatLng([countryData.lat, countryData.lon])
                .setContent(`
                    <b>${countryData.country}</b><br>
                    <img src="${countryData.flag}" width="50"><br>
                    Capitale: ${countryData.capital}<br>
                    Population: ${countryData.population.toLocaleString()}
                `)
                .openOn(map);
        }
        
        // Centrer le globe sur le pays
        rotateGlobeToPosition(countryData.lat, countryData.lon);
        
        document.getElementById('lastClick').textContent = countryData.country;
    } else {
        // Clic sur le globe lui-même
        const intersectsGlobe = raycaster.intersectObject(globe);
        if (intersectsGlobe.length > 0) {
            const point = intersectsGlobe[0].point;
            const coords = vector3ToLatLon(point);
            
            console.log('Clic sur globe:', coords.lat, coords.lon);
            
            // Recentrer la carte Leaflet
            if (map) {
                map.setView([coords.lat, coords.lon], 8);
            }
            
            // Centrer le globe sur la position cliquée
            rotateGlobeToPosition(coords.lat, coords.lon);
            
            document.getElementById('lastClick').textContent = 
                `${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°`;
        }
    }
}

// Rotation du globe pour centrer sur une position (AMÉLIORÉ)
function rotateGlobeToPosition(lat, lon) {
    autoRotate = false;
    document.getElementById('autoRotate').checked = false;
    
    // Convertir les coordonnées géographiques en vecteur 3D
    const targetPosition = latLonToVector3(lat, lon, 1, 0);
    
    // Calculer les rotations nécessaires pour amener ce point face à la caméra
    const targetRotationY = -lon * Math.PI / 180;
    const targetRotationX = (lat) * Math.PI / 180;
    
    // Appliquer les rotations pour centrer le point
    globe.rotation.y = targetRotationY;
    globe.rotation.x = -targetRotationX * 0.3;
    
    console.log(`Globe centré sur: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
}

// Initialisation de Leaflet
function initLeaflet() {
    map = L.map('map').setView([48.8566, 2.3522], 3);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Handler pour les clics sur la carte
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        
        console.log('Clic sur carte:', lat, lon);
        
        // Repositionner le globe 3D sur cet endroit
        rotateGlobeToPosition(lat, lon);
        
        L.popup()
            .setLatLng(e.latlng)
            .setContent(`Position: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`)
            .openOn(map);
        
        document.getElementById('lastClick').textContent = 
            `Carte: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    });
}

// Ajout des marqueurs pays sur Leaflet
function addCountriesToLeaflet() {
    // Effacer les anciens marqueurs
    countryMarkersLeaflet.forEach(marker => map.removeLayer(marker));
    countryMarkersLeaflet = [];
    
    countries.forEach(country => {
        if (country.latlng && country.latlng.length === 2) {
            const [lat, lon] = country.latlng;
            
            const marker = L.marker([lat, lon]).addTo(map);
            
            marker.bindPopup(`
                <b>${country.name.common}</b><br>
                <img src="${country.flags.png}" width="50"><br>
                Capitale: ${country.capital ? country.capital[0] : 'N/A'}<br>
                Population: ${country.population.toLocaleString()}
            `);
            
            // Clic sur marqueur recentre le globe
            marker.on('click', function() {
                rotateGlobeToPosition(lat, lon);
            });
            
            countryMarkersLeaflet.push(marker);
        }
    });
}


function findMyLocation() {
    if (!navigator.geolocation) {
        alert('Géolocalisation non supportée');
        return;
    }
    
    showStatusMessage('Recherche de votre position...');
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            userPosition = { lat, lon };
            
            addUserMarker3D(lat, lon);
            
            if (userMarkerLeaflet) {
                map.removeLayer(userMarkerLeaflet);
            }
            
            userMarkerLeaflet = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'user-marker-leaflet',
                    html: '<div style="background: #ff0000; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [15, 15]
                })
            }).addTo(map);
            
            userMarkerLeaflet.bindPopup(`
                <b>Votre position</b><br>
                Lat: ${lat.toFixed(4)}°<br>
                Lon: ${lon.toFixed(4)}°
            `);
            
            map.setView([lat, lon], 10);
            
            document.getElementById('userCoords').textContent = 
                `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
            
            hideStatusMessage();
        },
        function(error) {
            console.error('Erreur géolocalisation:', error);
            hideStatusMessage();
            alert('Impossible de récupérer votre position');
        }
    );
}

function resetGlobeView() {
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    globe.rotation.set(0, 0, 0);
    autoRotate = true;
    document.getElementById('autoRotate').checked = true;
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    if (map) {
        map.invalidateSize();
    }
}

function showStatusMessage(message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.querySelector('h2').textContent = 'Information';
    statusEl.querySelector('p').textContent = message;
    statusEl.classList.remove('hidden');
}

function hideStatusMessage() {
    document.getElementById('statusMessage').classList.add('hidden');
}

document.getElementById('autoRotate').addEventListener('change', function(e) {
    autoRotate = e.target.checked;
});

document.getElementById('showUserPosition').addEventListener('change', function(e) {
    if (userMarker3D) {
        userMarker3D.visible = e.target.checked;
    }
    if (userMarkerLeaflet) {
        if (e.target.checked) {
            map.addLayer(userMarkerLeaflet);
        } else {
            map.removeLayer(userMarkerLeaflet);
        }
    }
});

document.getElementById('showCountries').addEventListener('change', function(e) {
    countryMarkers.forEach(marker => {
        marker.visible = e.target.checked;
    });
    
    countryMarkersLeaflet.forEach(marker => {
        if (e.target.checked) {
            map.addLayer(marker);
        } else {
            map.removeLayer(marker);
        }
    });
});

window.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation TD3...');
    initThreeJS();
    initLeaflet();
    loadCountries();
    
    setTimeout(findMyLocation, 1000);
});