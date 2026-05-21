// Lasciando vuoto, il browser userà lo stesso dominio (es. localhost o render.com)
const API_BASE = '/api'; 

export async function fetchSpacePosts(lat, lon) {
    try {
        const response = await fetch(`${API_BASE}/space?lat=${lat}&lon=${lon}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero Space Posts:", error);
        return [];
    }
}

export async function fetchTimePosts(label) {
    try {
        const response = await fetch(`${API_BASE}/time/${label}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero Time Posts:", error);
        return [];
    }
}

export async function publish(type, formData) {
    // type può essere 'space' o 'time'
    const response = await fetch(`${API_BASE}/${type}`, {
        method: 'POST',
        body: formData // Form data gestisce automaticamente file e testo
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore di pubblicazione");
    }
    return await response.json();
}

export async function fetchRecentLabels() {
    try {
        const response = await fetch(`${API_BASE}/labels/recent`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Errore recupero label recenti:", error);
        return [];
    }
}

export async function sendContactMessage(email, message, honeypot) {
    const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        // Aggiungi honeypot qui
        body: JSON.stringify({ email, message, honeypot }) 
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore invio messaggio");
    }
    return await response.json();
}