require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Connessione a Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configurazione base per ricevere file in memoria (limite 5MB per evitare abusi)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// Utility: Calcola il giorno dell'anno (1-365)
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}



// 1. PUBBLICA UN POST (Aggiornato per supportare immagini)
app.post('/posts', upload.single('media'), async (req, res) => {
    // Nota: ora usiamo req.body per i testi e req.file per l'immagine
    const { content, lat, lon } = req.body;
    const now = new Date();
    let media_url = null;

    try {
        // Se l'utente ha inviato una foto, caricala nel bucket Supabase
        if (req.file) {
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
            const { data, error } = await supabase.storage
                .from('xyzt-media')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype
                });

            if (error) throw error;

            // Recupera l'URL pubblico e permanente dell'immagine appena caricata
            const { data: urlData } = supabase.storage
                .from('xyzt-media')
                .getPublicUrl(fileName);
            
            media_url = urlData.publicUrl;
        }

        // Salva tutto nel database (con il link all'immagine se esiste)
        const { data, error } = await supabase.from('posts').insert([{
            content,
            media_url: media_url,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            day_of_year: getDayOfYear(now),
            hour: now.getHours()
        }]).select('id, deletion_token, created_at').single();

        if (error) throw error;
        res.status(201).json(data);

    } catch (error) {
        console.error("Errore upload:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. ELIMINA UN POST (Solo entro 10 minuti)
app.delete('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const { deletion_token } = req.body;

    // Recupera il post per controllare i tempi
    const { data: post, error: fetchError } = await supabase
        .from('posts').select('created_at').eq('id', id).eq('deletion_token', deletion_token).single();

    if (fetchError || !post) return res.status(403).json({ error: "Post non trovato o token non valido" });

    // Controlla se sono passati meno di 10 minuti (600.000 ms)
    const ageInMs = new Date() - new Date(post.created_at);
    if (ageInMs > 600000) {
        return res.status(403).json({ error: "Tempo scaduto. Il post è ormai permanente." });
    }

    // Procedi all'eliminazione
    await supabase.from('posts').delete().eq('id', id);
    res.json({ message: "Post eliminato con successo" });
});

// 3. FEED TEMPORALE (Ciclico)
app.get('/feed/time', async (req, res) => {
    const now = new Date();
    const currentDay = getDayOfYear(now);
    const currentHour = now.getHours();

    const { data, error } = await supabase
        .from('posts')
        .select('id, content, media_url, lat, lon, created_at')
        .eq('day_of_year', currentDay)
        .eq('hour', currentHour);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 4. FEED SPAZIALE (Geo-localizzato)
app.get('/feed/geo', async (req, res) => {
    const { lat, lon, radius = 5000 } = req.query; // Default: 5km

    // Richiama la funzione RPC scritta in PostGIS
    const { data, error } = await supabase.rpc('get_nearby_posts', {
        user_lat: parseFloat(lat),
        user_lon: parseFloat(lon),
        radius_meters: parseFloat(radius)
    });

    if (error) return res.status(500).json({ error: error.message });
    
    // Rimuoviamo il token di sicurezza dai dati inviati al pubblico
    const cleanData = data.map(({ deletion_token, ...rest }) => rest);
    res.json(cleanData);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Spacetime API in ascolto sulla porta ${PORT}`));