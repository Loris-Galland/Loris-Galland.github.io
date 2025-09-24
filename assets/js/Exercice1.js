let watchId = null;
let isWatching = false;

// Vérifier si la géolocalisation est supportée
if (!navigator.geolocation) {
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('status').innerHTML = 'La géolocalisation n\'est pas supportée par ce navigateur';
        document.getElementById('status').className = 'status error';
        
        // Désactiver les boutons
        document.getElementById('currentBtn').disabled = true;
        document.getElementById('watchBtn').disabled = true;
    });
}

function getCurrentLocation() {
    updateStatus('Récupération de la position actuelle...', 'waiting');

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        function(position) {
            displayCurrentPosition(position);
            updateStatus('Position actuelle récupérée avec succès !', 'success');
        },
        function(error) {
            displayCurrentError(error);
            updateStatus(`Erreur: ${getErrorMessage(error)}`, 'error');
        },
        options
    );
}

function toggleWatchPosition() {
    if (isWatching) {
        stopWatching();
    } else {
        startWatching();
    }
}

function startWatching() {
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
    };

    watchId = navigator.geolocation.watchPosition(
        function(position) {
            displayWatchPosition(position);
            updateStatus('Surveillance de la position active', 'success');
        },
        function(error) {
            displayWatchError(error);
            updateStatus(`Erreur de surveillance: ${getErrorMessage(error)}`, 'error');
        },
        options
    );

    isWatching = true;
    document.getElementById('watchBtn').innerHTML = 'Arrêter la surveillance';
    updateStatus('Démarrage de la surveillance...', 'waiting');
}

function stopWatching() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isWatching = false;
    document.getElementById('watchBtn').innerHTML = 'Surveillance (watchPosition)';
    updateStatus('Surveillance arrêtée', 'waiting');
}

function displayCurrentPosition(position) {
    const coords = position.coords;
    const timestamp = new Date(position.timestamp);

    document.getElementById('currentResults').innerHTML = `
        <div class="data-item">
            <span class="data-label">Latitude:</span>
            <span class="data-value">${coords.latitude.toFixed(6)}°</span>
        </div>
        <div class="data-item">
            <span class="data-label">Longitude:</span>
            <span class="data-value">${coords.longitude.toFixed(6)}°</span>
        </div>
        <div class="data-item">
            <span class="data-label">Altitude:</span>
            <span class="data-value">${coords.altitude ? coords.altitude.toFixed(2) + ' m' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Précision:</span>
            <span class="data-value">${coords.accuracy.toFixed(2)} m</span>
        </div>
        <div class="data-item">
            <span class="data-label">Précision altitude:</span>
            <span class="data-value">${coords.altitudeAccuracy ? coords.altitudeAccuracy.toFixed(2) + ' m' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Vitesse:</span>
            <span class="data-value">${coords.speed ? (coords.speed * 3.6).toFixed(2) + ' km/h' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Direction:</span>
            <span class="data-value">${coords.heading ? coords.heading.toFixed(2) + '°' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Horodatage:</span>
            <span class="data-value">${timestamp.toLocaleString()}</span>
        </div>
    `;
}

function displayWatchPosition(position) {
    const coords = position.coords;
    const timestamp = new Date(position.timestamp);

    document.getElementById('watchResults').innerHTML = `
        <div class="data-item">
            <span class="data-label">Latitude:</span>
            <span class="data-value">${coords.latitude.toFixed(6)}°</span>
        </div>
        <div class="data-item">
            <span class="data-label">Longitude:</span>
            <span class="data-value">${coords.longitude.toFixed(6)}°</span>
        </div>
        <div class="data-item">
            <span class="data-label">Altitude:</span>
            <span class="data-value">${coords.altitude ? coords.altitude.toFixed(2) + ' m' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Précision:</span>
            <span class="data-value">${coords.accuracy.toFixed(2)} m</span>
        </div>
        <div class="data-item">
            <span class="data-label">Précision altitude:</span>
            <span class="data-value">${coords.altitudeAccuracy ? coords.altitudeAccuracy.toFixed(2) + ' m' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Vitesse:</span>
            <span class="data-value">${coords.speed ? (coords.speed * 3.6).toFixed(2) + ' km/h' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Direction:</span>
            <span class="data-value">${coords.heading ? coords.heading.toFixed(2) + '°' : 'Non disponible'}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Dernière MAJ:</span>
            <span class="data-value">${timestamp.toLocaleString()}</span>
        </div>
        <div class="data-item">
            <span class="data-label">Statut:</span>
            <span class="data-value">En surveillance</span>
        </div>
    `;
}

function displayCurrentError(error) {
    document.getElementById('currentResults').innerHTML = `
        <div class="data-item error">
            <span class="data-label">Erreur:</span>
            <span class="data-value">${getErrorMessage(error)}</span>
        </div>
    `;
}

function displayWatchError(error) {
    document.getElementById('watchResults').innerHTML = `
        <div class="data-item error">
            <span class="data-label">Erreur:</span>
            <span class="data-value">${getErrorMessage(error)}</span>
        </div>
    `;
}

function updateStatus(message, type = 'waiting') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

function getErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Permission refusée par l'utilisateur";
        case error.POSITION_UNAVAILABLE:
            return "Position non disponible";
        case error.TIMEOUT:
            return "Délai d'attente dépassé";
        default:
            return "Erreur inconnue";
    }
}

function clearResults() {
    stopWatching();
    
    document.getElementById('currentResults').innerHTML = `
        <div class="data-item">
            <span class="data-label">Statut:</span>
            <span class="data-value">Non testé</span>
        </div>
    `;
    
    document.getElementById('watchResults').innerHTML = `
        <div class="data-item">
            <span class="data-label">Statut:</span>
            <span class="data-value">Non démarré</span>
        </div>
    `;
    
    updateStatus('Résultats effacés - Cliquez sur un bouton pour tester', 'waiting');
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    if (navigator.geolocation) {
        console.log('API Geolocation supportée');
    } else {
        console.log('API Geolocation non supportée');
    }
});