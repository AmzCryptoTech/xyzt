import { setLanguage } from './i18n.js';
import { publish, fetchSpacePosts, fetchTimePosts, fetchRecentLabels } from './api.js';
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

// Salva Profilo
document.getElementById('btn-save-profile').addEventListener('click', () => {
    const nick = document.getElementById('input-nickname').value.trim();
    if (nick) {
        localStorage.setItem('xyzt_nickname', nick);
        alert('Profilo salvato!');
        showSpace(); // Torna alla home
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

    const formData = new FormData();
    const savedNick = localStorage.getItem('xyzt_nickname');
    const finalAuthorId = savedNick ? `${savedNick}(${myDeviceId})` : myDeviceId;
    formData.append('author_id', finalAuthorId);
    
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

// Imposta la lingua predefinita
setLanguage('en');