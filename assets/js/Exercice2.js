let map = null;
let userPosition = null;
let userMarker = null;
let precisionCircle = null;
let bermudaTriangle = null;
let niceMarker = null;
let marseilleMarker = null;
let routeControl = null;
let geoJsonLayer = null;
let currentMapStyle = 'osm';
let markerCount = 0;

const CITIES = {
    nice: [43.7102, 7.2620],
    marseille: [43.2965, 5.3698],
    bermuda1: [25.7617, -80.1918], // Miami
    bermuda2: [32.3078, -64.7505], // Bermudes
    bermuda3: [18.4655, -66.1057]  // Porto Rico
};

const MAP_STYLES = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        name: 'OpenStreetMap'
    },
    stamen_terrain: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
        attribution: '© Stadia Maps © Stamen Design © OpenMapTiles',
        name: 'Stamen Terrain'
    },
    cartodb: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap © CartoDB',
        name: 'CartoDB Light'
    }
};

function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.style.background = type === 'error' ? 'rgba(231, 76, 60, 0.2)' : 
                              type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 
                              'rgba(255, 255, 255, 0.1)';
}

function updateInfo() {
    const infoContent = document.getElementById('infoContent');
    infoContent.innerHTML = `
        <div class="info-item">Position: ${userPosition ? 
            `${userPosition.lat.toFixed(4)}, ${userPosition.lng.toFixed(4)}` : 'Non définie'}</div>
        <div class="info-item">Précision: ${userPosition && userPosition.accuracy ? 
            `${userPosition.accuracy.toFixed(0)}m` : 'Non mesurée'}</div>
        <div class="info-item">Markers: ${markerCount}</div>
        <div class="info-item">Style: ${MAP_STYLES[currentMapStyle].name}</div>
    `;
}

//Initialiser la carte Leaflet centrée sur Nice 
function initializeMap() {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView(CITIES.nice, 13);
    L.tileLayer(MAP_STYLES[currentMapStyle].url, {
        attribution: MAP_STYLES[currentMapStyle].attribution,
        maxZoom: 18
    }).addTo(map);
    updateStatus('Carte initialisée avec succès!', 'success');
    updateInfo();
}

//Trouver et afficher la position actuelle de l’utilisateur  
function findMyLocation() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    updateStatus('Recherche de votre position...');
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
    };
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            userPosition = { lat, lng, accuracy };
            if (userMarker) {
                map.removeLayer(userMarker);
                markerCount--;
            }
            userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<div style="background: #ff6b6b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map);
            userMarker.bindPopup(`
                <b>Votre position</b><br>
                Latitude: ${lat.toFixed(6)}°<br>
                Longitude: ${lng.toFixed(6)}°<br>
                Précision: ${accuracy.toFixed(0)}m
            `);
            map.setView([lat, lng], 15);
            markerCount++;
            updateStatus(`Position trouvée avec une précision de ${accuracy.toFixed(0)}m`, 'success');
            updateInfo();
        },
        function(error) {
            let errorMessage = 'Erreur de géolocalisation: ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Permission refusée'; break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Position non disponible'; break;
                case error.TIMEOUT:
                    errorMessage += 'Délai dépassé'; break;
                default:
                    errorMessage += 'Erreur inconnue'; break;
            }
            updateStatus(errorMessage, 'error');
        },
        options
    );
}

// Ajouter un marker pour Nice
function addNiceMarker() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    if (niceMarker) {
        map.removeLayer(niceMarker);
        markerCount--;
    }
    niceMarker = L.marker(CITIES.nice, {
        icon: L.divIcon({
            className: 'nice-marker',
            html: '<div style="background: #4ecdc4; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 12px;"></div>',
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        })
    }).addTo(map);
    niceMarker.bindPopup(`
        <b>Nice - Centre ville</b><br>
        Latitude: ${CITIES.nice[0]}°<br>
        Longitude: ${CITIES.nice[1]}°<br>
        <em>Ville de la Côte d'Azur</em>
    `);
    markerCount++;
    updateStatus('Marker de Nice ajouté!', 'success');
    updateInfo();
}

// Tracer le triangle des Bermudes
function drawBermudaTriangle() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    if (bermudaTriangle) {
        map.removeLayer(bermudaTriangle);
    }
    const triangleCoords = [
        CITIES.bermuda1,
        CITIES.bermuda2,
        CITIES.bermuda3,
        CITIES.bermuda1
    ];
    bermudaTriangle = L.polyline(triangleCoords, {
        color: 'red',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
    }).addTo(map);
    bermudaTriangle.bindPopup(`
        <b>Triangle des Bermudes</b><br>
        Zone mystérieuse de l'océan Atlantique<br>
        <em>Entre Miami, les Bermudes et Porto Rico</em>
    `);
    map.fitBounds(bermudaTriangle.getBounds(), { padding: [50, 50] });
    updateStatus('Triangle des Bermudes tracé en rouge!', 'success');
    updateInfo();
}

// Calculer la distance et tracer un segment vers Marseille
function calculateDistanceToMarseille() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    if (!userPosition) {
        updateStatus('Veuillez d\'abord obtenir votre position', 'error');
        return;
    }
    if (marseilleMarker) {
        map.removeLayer(marseilleMarker);
        markerCount--;
    }
    marseilleMarker = L.marker(CITIES.marseille, {
        icon: L.divIcon({
            className: 'marseille-marker',
            html: '<div style="background: #74b9ff; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 12px;"></div>',
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        })
    }).addTo(map);
    markerCount++;
    const distance = calculateHaversineDistance(
        userPosition.lat, userPosition.lng,
        CITIES.marseille[0], CITIES.marseille[1]
    );
    const line = L.polyline([
        [userPosition.lat, userPosition.lng],
        CITIES.marseille
    ], {
        color: '#fdcb6e',
        weight: 3,
        opacity: 0.8
    }).addTo(map);
    marseilleMarker.bindPopup(`
        <b>Marseille</b><br>
        Distance depuis votre position:<br>
        <strong>${distance.toFixed(2)} km</strong><br>
        <em>Calculée avec la formule de Haversine</em>
    `);
    const group = L.featureGroup([userMarker, marseilleMarker, line]);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
    updateStatus(`Distance calculée: ${distance.toFixed(2)} km`, 'success');
    updateInfo();
}

// Ajouter un cercle représentant la précision de la position
function addPrecisionCircle() {
    if (!map || !userPosition) {
        updateStatus('Veuillez d\'abord obtenir votre position', 'error');
        return;
    }
    if (precisionCircle) {
        map.removeLayer(precisionCircle);
    }
    precisionCircle = L.circle([userPosition.lat, userPosition.lng], {
        color: '#00b894',
        fillColor: '#00b894',
        fillOpacity: 0.1,
        radius: userPosition.accuracy
    }).addTo(map);
    precisionCircle.bindPopup(`
        <b>Cercle de précision</b><br>
        Rayon: ${userPosition.accuracy.toFixed(0)}m<br>
        <em>Votre position réelle est dans ce cercle</em>
    `);
    updateStatus(`Cercle de précision ajouté (${userPosition.accuracy.toFixed(0)}m)`, 'success');
}

//Changer de style de carte
function changeMapStyle() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    const styles = Object.keys(MAP_STYLES);
    const currentIndex = styles.indexOf(currentMapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    currentMapStyle = styles[nextIndex];
    map.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    L.tileLayer(MAP_STYLES[currentMapStyle].url, {
        attribution: MAP_STYLES[currentMapStyle].attribution,
        maxZoom: 18
    }).addTo(map);
    updateStatus(`Style changé: ${MAP_STYLES[currentMapStyle].name}`, 'success');
    updateInfo();
}

// Ajouter des données GeoJSON sur la carte
function loadGeoJsonData() {
    if (!map) {
        updateStatus('Veuillez d\'abord initialiser la carte', 'error');
        return;
    }
    const geoJsonUrl = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson';
    updateStatus('Chargement des données GeoJSON...');
    fetch(geoJsonUrl)
        .then(response => response.json())
        .then(data => {
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
            geoJsonLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: '#4ecdc4',
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.3
                    };
                },
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties.nom) {
                        layer.bindPopup(`
                            <b>${feature.properties.nom}</b><br>
                            Code: ${feature.properties.code || 'N/A'}<br>
                            <em>Département français</em>
                        `);
                    }
                }
            }).addTo(map);
            map.fitBounds(geoJsonLayer.getBounds());
            updateStatus('Données GeoJSON des départements français chargées!', 'success');
        })
        .catch(error => {
            updateStatus('Erreur lors du chargement des données GeoJSON', 'error');
            console.error('Erreur GeoJSON:', error);
        });
}

// Afficher un trajet/itinéraire avec OSRM
function showRoute() {
    if (!map || !userPosition) {
        updateStatus('Veuillez d\'abord obtenir votre position', 'error');
        return;
    }
    updateStatus('Calcul de l\'itinéraire avec OSRM...');
    const start = `${userPosition.lng},${userPosition.lat}`;
    const end = `${CITIES.nice[1]},${CITIES.nice[0]}`;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
    fetch(osrmUrl)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                if (routeControl) {
                    map.removeLayer(routeControl);
                }
                routeControl = L.polyline(coordinates, {
                    color: '#e17055',
                    weight: 4,
                    opacity: 0.8
                }).addTo(map);
                const distance = (route.distance / 1000).toFixed(2);
                const duration = Math.round(route.duration / 60);
                routeControl.bindPopup(`
                    <b>Itinéraire OSRM</b><br>
                    Distance: ${distance} km<br>
                    Durée estimée: ${duration} min<br>
                    <em>De votre position vers Nice</em>
                `);
                map.fitBounds(routeControl.getBounds(), { padding: [50, 50] });
                updateStatus(`Itinéraire calculé: ${distance}km, ${duration}min`, 'success');
            } else {
                updateStatus('Aucun itinéraire trouvé', 'error');
            }
        })
        .catch(error => {
            updateStatus('Erreur lors du calcul de l\'itinéraire', 'error');
            console.error('Erreur OSRM:', error);
        });
}

// Effacer tous les éléments de la carte et réinitialiser
function clearMap() {
    if (!map) {
        updateStatus('Aucune carte à effacer', 'error');
        return;
    }
    if (userMarker) map.removeLayer(userMarker);
    if (niceMarker) map.removeLayer(niceMarker);
    if (marseilleMarker) map.removeLayer(marseilleMarker);
    if (precisionCircle) map.removeLayer(precisionCircle);
    if (bermudaTriangle) map.removeLayer(bermudaTriangle);
    if (routeControl) map.removeLayer(routeControl);
    if (geoJsonLayer) map.removeLayer(geoJsonLayer);
    userPosition = null;
    userMarker = null;
    niceMarker = null;
    marseilleMarker = null;
    precisionCircle = null;
    bermudaTriangle = null;
    routeControl = null;
    geoJsonLayer = null;
    markerCount = 0;
    map.setView(CITIES.nice, 13);
    updateStatus('Carte effacée et recentrée sur Nice', 'success');
    updateInfo();
}

// Calcul Haversine pour la distance
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

window.addEventListener('load', function() {
    updateInfo();
    updateStatus('Page chargée. Cliquez sur "Initialiser la carte" pour commencer.');
});
