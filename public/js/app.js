import { dictionary, setLanguage } from './i18n.js';
import { publish, fetchSpacePosts, fetchTimePosts, fetchRecentLabels, sendContactMessage } from './api.js';
import { getCurrentLocation } from './geofeed.js';
import { renderFeed } from './ui.js';
const viewProfile = document.getElementById('view-profile');
const viewFaq = document.getElementById('view-faq');
const publishSection = document.getElementById('publish-section');
const mainToggles = document.getElementById('main-toggles');
const path = window.location.pathname.substring(1); 
const viewSpace = document.getElementById('view-space');
const viewTime = document.getElementById('view-time');
const btnSpace = document.getElementById('mode-space');
const btnTime = document.getElementById('mode-time');
const btnPublish = document.getElementById('btn-publish');
const btnSubscribe = document.getElementById('btn-subscribe');
const viewContact = document.getElementById('view-contact');

// Array locale memorizzato nel telefono per le label preferite da ascoltare
let subscribedLabels = JSON.parse(localStorage.getItem('xyzt_subscriptions') || '[]');

// --- GESTIONE IDENTITA' DISPOSITIVO ---
let myAuthorId = localStorage.getItem('xyzt_author_id');
if (!myAuthorId) {
    // Genera un ID casuale es: "a7f2b9" al primo accesso
    myAuthorId = Math.random().toString(16).substring(2, 8);
    localStorage.setItem('xyzt_author_id', myAuthorId);
}

let myDeviceId = localStorage.getItem('xyzt_device_id');
if (!myDeviceId) {
    myDeviceId = Math.random().toString(16).substring(2, 8);
    localStorage.setItem('xyzt_device_id', myDeviceId);
}

// Carica il nick al riavvio
document.getElementById('input-nickname').value = localStorage.getItem('xyzt_nickname') || '';

document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, "", "/");
    showSpace();
});

// Salva Profilo
document.getElementById('btn-save-profile').addEventListener('click', () => {
    const nick = document.getElementById('input-nickname').value.trim();
    if (nick) {
        localStorage.setItem('xyzt_nickname', nick);
        // Usa il dizionario per l'alert
        const lang = document.getElementById('lang-selector').value;
        alert(dictionary[lang].profile_saved_alert);
        showSpace(); 
    }
});

// Inizializzazione al caricamento della pagina
if (path === '' || path === 'time') {
    showSpace();
} else {
    showTime(path);
}

// Eventi dei bottoni Toggle (Spazio / Tempo)
btnSpace.addEventListener('click', () => {
    window.history.pushState({}, "", "/");
    showSpace();
});

btnTime.addEventListener('click', () => {
    const defaultLabel = 'time';
    window.history.pushState({}, "", `/${defaultLabel}`);
    showTime(defaultLabel);
});

// Evento Selettore Lingua
document.getElementById('lang-selector').addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

// Funzioni di visualizzazione
function hideAllViews() {
    viewSpace.style.display = 'none';
    viewTime.style.display = 'none';
    viewProfile.style.display = 'none';
    viewFaq.style.display = 'none';
    viewContact.style.display = 'none';     
    const viewMap = document.getElementById('view-map');
    if (viewMap) viewMap.style.display = 'none';    
    publishSection.style.display = 'block';
    mainToggles.style.display = 'flex';
}

function showSpace() {
    hideAllViews();
    viewSpace.style.display = 'block';
    btnSpace.classList.add('active');
    btnTime.classList.remove('active');
    loadSpaceFeed();
}

function showTime(label) {
    hideAllViews();
    viewTime.style.display = 'block';
    btnSpace.classList.remove('active');
    btnTime.classList.add('active');
    document.getElementById('current-label').innerText = label;
	updateSubscribeButton(label);
    loadRecentLabels();
    loadTimeFeed(label); 
}

// Navigazione Menu Alto
document.getElementById('nav-profile').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    publishSection.style.display = 'none';
    mainToggles.style.display = 'none';
    viewProfile.style.display = 'block';
});

document.getElementById('nav-faq').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    publishSection.style.display = 'none';
    mainToggles.style.display = 'none';
    viewFaq.style.display = 'block';
});

// Naviga a una nuova Label
document.getElementById('btn-go-label').addEventListener('click', () => {
    let newLabel = document.getElementById('input-search-label').value.trim().toLowerCase();
    if (newLabel) {
        // Rimuove spazi vuoti e caratteri strani
        newLabel = newLabel.replace(/[^a-z0-9]/g, ''); 
        document.getElementById('input-search-label').value = '';
        window.history.pushState({}, "", `/${newLabel}`);
        showTime(newLabel);
    }
});

let map = null;

document.getElementById('nav-map').addEventListener('click', async (e) => {
    e.preventDefault();
    hideAllViews(); // La tua funzione che nasconde gli altri main
    document.getElementById('publish-section').style.display = 'none';
    document.getElementById('main-toggles').style.display = 'none';
    const mapView = document.getElementById('view-map');
    mapView.style.display = 'block';

    const coords = await getCurrentLocation(); // Cache o GPS lineare

    // Inizializza la mappa se non esiste
    if (!map) {
        map = L.map('view-map').setView([coords.lat, coords.lon], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: 'OpenStreetMap & CartoDB'
        }).addTo(map);
    } else {
        map.setView([coords.lat, coords.lon], 13);
    }

    // Disegna i punti dei post recuperati dal backend
    const response = await fetch('/api/space/map-points');
    const points = await response.json();

    points.forEach(p => {
        L.circleMarker([p.lat, p.lon], {
            color: '#8a2be2',
            radius: 6,
            fillOpacity: 0.8
        }).addTo(map);
    });
});

// Richiesta permessi notifiche browser
if (customElements && Notification.permission === "default") {
    Notification.requestPermission();
}

// Funzione di supporto per iscriversi/disiscriversi da una stanza
function toggleSubscription(label) {
    if (subscribedLabels.includes(label)) {
        subscribedLabels = subscribedLabels.filter(l => l !== label);
    } else {
        subscribedLabels.push(label);
    }
    localStorage.setItem('xyzt_subscriptions', JSON.stringify(subscribedLabels));
    
    const lang = document.getElementById('lang-selector').value;
    alert(`${dictionary[lang].notif_updated} #${label}`);
}

function updateSubscribeButton(label) {
    if (!btnSubscribe) return;
    
    const lang = document.getElementById('lang-selector').value;
    
    if (subscribedLabels.includes(label)) {
        btnSubscribe.innerText = dictionary[lang].btn_stop_listen;
        btnSubscribe.style.color = "#ff4757";       
        btnSubscribe.style.borderColor = "#ff4757";
    } else {
        btnSubscribe.innerText = dictionary[lang].btn_listen;
        btnSubscribe.style.color = "#ffeb3b";       
        btnSubscribe.style.borderColor = "#ffeb3b";
    }
}

// Evento al click sul bottone
btnSubscribe.addEventListener('click', () => {
    const currentLabel = document.getElementById('current-label').innerText;
    if (!currentLabel) return;
    
    toggleSubscription(currentLabel); // Aggiunge/Rimuove dall'array
    updateSubscribeButton(currentLabel); // Aggiorna i colori del bottone
});

// Ciclo in background lato Client (Gira ogni 30 secondi sul telefono dell'utente)
setInterval(async () => {
    if (Notification.permission !== "granted" || subscribedLabels.length === 0) return;

    for (const label of subscribedLabels) {
        const response = await fetch(`/api/time/${label}`);
        const posts = await response.json();
        
        if (posts.length > 0) {
            const ultimoPost = posts[0];
            const ultimoIdNotificato = localStorage.getItem(`notif_last_id_${label}`);

            // Se c'è un nuovo post che non abbiamo mai visto, manda la notifica di sistema
            if (ultimoPost.id !== ultimoIdNotificato) {
                localStorage.setItem(`notif_last_id_${label}`, ultimoPost.id);
                
                new Notification(`xyzt: Nuova trasmissione in #${label}`, {
                    body: ultimoPost.content,
                    icon: '/favicon.ico' // opzionale
                });
            }
        }
    }
}, 60000); // Controlla le stanze preferite ogni 60 secondi

// Forza Refresh GPS
document.getElementById('btn-refresh-gps').addEventListener('click', async () => {
    const containerId = 'space-feed';
    document.getElementById(containerId).innerHTML = '<p class="empty-feed">Ricalibrazione GPS (ignorando la cache)...</p>';
    try {
        const coords = await getCurrentLocation(true); // true forza il refresh
        const posts = await fetchSpacePosts(coords.lat, coords.lon);
        renderFeed(containerId, posts);
    } catch (e) {
        document.getElementById(containerId).innerHTML = `<p class="empty-feed">Errore GPS: ${e.message}</p>`;
    }
});

async function loadRecentLabels() {
    const labels = await fetchRecentLabels();
    const container = document.getElementById('recent-labels');
    container.innerHTML = '';
    
    labels.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'label-pill';
        btn.innerText = `#${l.category_id}`;
        btn.addEventListener('click', () => {
            window.history.pushState({}, "", `/${l.category_id}`);
            showTime(l.category_id);
        });
        container.appendChild(btn);
    });
}

// Logica di caricamento dei Feed
async function loadSpaceFeed() {
    const containerId = 'space-feed';
    document.getElementById(containerId).innerHTML = '<p class="empty-feed">Ricerca coordinate in corso...</p>';
    try {
        const coords = await getCurrentLocation();
        const posts = await fetchSpacePosts(coords.lat, coords.lon);
        renderFeed(containerId, posts);
    } catch (e) {
        document.getElementById(containerId).innerHTML = `<p class="empty-feed">Impossibile ottenere la posizione: ${e.message}</p>`;
    }
}

async function loadTimeFeed(label) {
    const containerId = 'time-feed';
    document.getElementById(containerId).innerHTML = '<p class="empty-feed">Caricamento dimensione tempo...</p>';
    const posts = await fetchTimePosts(label);
    renderFeed(containerId, posts);
}

// Logica del pulsante PUBBLICA
btnPublish.addEventListener('click', async () => {
    const isSpaceMode = viewSpace.style.display !== 'none';
    const content = document.getElementById('post-content').value;
    const fileInput = document.getElementById('post-media').files[0];
    
    if (!content && !fileInput) return alert("Inserisci un testo o una foto!");

    // Disabilita il bottone durante l'invio
    btnPublish.disabled = true;
    btnPublish.innerText = "Pubblicazione...";

    const savedNick = localStorage.getItem('xyzt_nickname');
    const myDeviceId = localStorage.getItem('xyzt_device_id');
    
    // Formato richiesto: Nickname(ID) o solo ID se il nick è assente
    const finalAuthorId = savedNick ? `${savedNick}(${myDeviceId})` : myDeviceId;
    
    const formData = new FormData();
    formData.append('content', content);
    formData.append('author_id', finalAuthorId); // Invia l'ID combinato
    
    if (fileInput) formData.append('media', fileInput);

    try {
        if (isSpaceMode) {
            // Pubblica nello SPAZIO
            const coords = await getCurrentLocation();
            formData.append('lat', coords.lat);
            formData.append('lon', coords.lon);
            await publish('space', formData);
            
            // Ripulisci il modulo e aggiorna
            document.getElementById('post-content').value = '';
            document.getElementById('post-media').value = '';
            loadSpaceFeed();
        } else {
            // Pubblica nel TEMPO (Label)
            const currentLabel = window.location.pathname.substring(1) || 'time';
            formData.append('label', currentLabel);
            await publish('time', formData);
            
            // Ripulisci il modulo e aggiorna
            document.getElementById('post-content').value = '';
            document.getElementById('post-media').value = '';
            loadTimeFeed(currentLabel);
        }
    } catch (error) {
        alert("Errore di pubblicazione: " + error.message);
    } finally {
        // Riabilita il bottone
        btnPublish.disabled = false;
        btnPublish.innerText = "Publish";
    }
});

// Mostra vista Contatti
document.getElementById('nav-contact').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    publishSection.style.display = 'none';
    mainToggles.style.display = 'none';
    viewContact.style.display = 'block';
});

// Invio modulo Contatti
document.getElementById('btn-send-contact').addEventListener('click', async () => {
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const honeypot = document.getElementById('contact-website').value; // CATTURA L'ESCA
    const btnSend = document.getElementById('btn-send-contact');
    const lang = document.getElementById('lang-selector').value;
    
    if (!message) return alert("Inserisci un messaggio prima di inviare.");
    
    btnSend.disabled = true;
    btnSend.innerText = "Invio in corso...";
    
    try {
        // Passa l'honeypot alla funzione
        await sendContactMessage(email, message, honeypot); 
        alert(dictionary[lang].contact_success_alert);
        document.getElementById('contact-message').value = ''; 
        showSpace();
    } catch (error) {
        alert("Errore: " + error.message);
    } finally {
        btnSend.disabled = false;
        btnSend.innerText = dictionary[lang].contact_send_btn;
    }
});

function initSearchLabelUI() {
    const searchInput = document.getElementById('input-search-label');
    const goBtn = document.getElementById('btn-go-label');
    if(searchInput) searchInput.setAttribute('data-i18n', 'search_label_placeholder');
    if(goBtn) goBtn.setAttribute('data-i18n', 'go_label_btn');
}
initSearchLabelUI();

// Imposta la lingua predefinita
setLanguage('en');