export function getCurrentLocation(forceRefresh = false) {
    return new Promise((resolve, reject) => {
        // Controllo della cache
        if (!forceRefresh) {
            const cached = localStorage.getItem('xyzt_location');
            if (cached) {
                const parsed = JSON.parse(cached);
                const now = new Date().getTime();
                // Verifica se sono passate meno di 24 ore
                if (now - parsed.timestamp < 86400000) {
                    return resolve({ lat: parsed.lat, lon: parsed.lon });
                }
            }
        }

        if (!navigator.geolocation) {
            reject(new Error("Geolocalizzazione non supportata."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = { 
                    lat: position.coords.latitude, 
                    lon: position.coords.longitude,
                    timestamp: new Date().getTime()
                };
                // Salva la nuova posizione in cache
                localStorage.setItem('xyzt_location', JSON.stringify(coords));
                resolve(coords);
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}