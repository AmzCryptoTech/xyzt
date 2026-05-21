require('dotenv').config();
const rateLimit = require('express-rate-limit');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Configurazione Middleware
app.use(cors());
app.use(express.json());

// Connessione a Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurazione Multer per i file in memoria (limite 5MB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 3, 
    message: { error: "Troppe richieste. Per favore riprova più tardi." }
});

const bayes = require('bayes');
const spamClassifier = bayes();

// 1. Addestramento rapido (lo fai una volta all'avvio del server)
// Insegni alla libreria cosa è "buono" (ham) e cosa è "cattivo" (spam)
spamClassifier.learn('ciao a tutti, come funziona questa app?', 'ham');
spamClassifier.learn('qualcuno ha visto il mio cane in centro?', 'ham');
spamClassifier.learn('buy cheap crypto and bitcoin investment guaranteed return', 'spam');
spamClassifier.learn('click here for best seo services and followers', 'spam');

const Filter = require('bad-words');
const filter = new Filter();

// Puoi aggiungere i tuoi termini specifici per i bot
filter.addWords('crypto', 'investment', 'casino', 'viagra', 'seo services');

async function isSpamBayesian(text) {
    if (!text) return false;
    
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 2) return true;

    // L'IA locale analizza il testo e restituisce 'spam' o 'ham'
    const result = await spamClassifier.categorize(text);
    return result === 'spam';
}

function isSpam(text) {
    if (!text) return false;
    
    // Controllo dei link (questo rimane sempre utile)
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 2) return true;

    // filter.isProfane controlla se il testo contiene parole della blacklist
    return filter.isProfane(text); 
}

// --- FUNZIONI DI SUPPORTO ---

// Calcolo del valore della label (Curva di degrado per il Tempo)
function calcoloValoreLabel(label) {
    if (!label) return 1;
    const L = label.length;
    
    if (L === 7) return 100;
    if (L >= 1 && L < 7) return Math.floor(1 + (99 / 6) * (L - 1));
    if (L > 7 && L <= 30) return Math.floor(100 - (99 / 23) * (L - 7));
    
    return 1; // Per lunghezze superiori a 30
}

// Upload immagine su Supabase Storage e restituzione URL pubblico
async function uploadMedia(file) {
    if (!file) return null;
    
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const { error: uploadError } = await supabase.storage
        .from('xyzt-media')
        .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
        .from('xyzt-media')
        .getPublicUrl(fileName);
        
    return urlData.publicUrl;
}

// --- API: DIMENSIONE SPAZIO ---

// Pubblica uno Space Post
app.post('/api/space', upload.single('media'), async (req, res) => {
    const { content, lat, lon, author_id } = req.body;

    try {
        const media_url = await uploadMedia(req.file);

        // expires_at viene gestito in automatico dal database (NOW() + 27 hours)
        const { data, error } = await supabase.from('space_posts').insert([{
            content,
            media_url,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
			author_id: author_id || 'anon'
        }]).select('id, created_at, expires_at').single();

        if (error) throw error;
        res.status(201).json(data);

    } catch (error) {
        console.error("Errore Pubblicazione Space:", error);
        res.status(500).json({ error: error.message });
    }
});

// Leggi il feed dello Spazio (Tramite PostGIS, max 30 risultati gestiti dal DB)
app.get('/api/space', async (req, res) => {
    const { lat, lon, radius = 5000 } = req.query; // 5km default
    
    try {
        const { data, error } = await supabase.rpc('get_nearby_space_posts', {
            user_lat: parseFloat(lat),
            user_lon: parseFloat(lon),
            radius_meters: parseFloat(radius)
        });

        if (error) throw error;
        res.json(data || []);
        
    } catch (error) {
        console.error("Errore Lettura Space:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- API: DIMENSIONE TEMPO ---

// Pubblica un Time Post
app.post('/api/time', upload.single('media'), async (req, res) => {
    const { content, label, author_id } = req.body;

    try {
        const media_url = await uploadMedia(req.file);

        // Standardizza la label in minuscolo e calcola la scadenza esatta
        const safeLabel = label ? label.toLowerCase() : 'xyzt';
        const value = calcoloValoreLabel(safeLabel);
		
		const alertLabels = (process.env.ALERT_LABELS || '').split(',');
		if (alertLabels.includes(safeLabel)) {
			transporter.sendMail({
				from: process.env.SMTP_USER,
				to: process.env.ADMIN_EMAIL,
				subject: `[xyzt][alert] Utilizzata label monitorata: #${safeLabel} ⚠️`,
				text: `Un utente ha appena pubblicato nella label monitorata: #${safeLabel}\nContenuto: ${content}`
			}).catch(err => console.error("Errore invio Alert Email:", err));
		}
        
        const expiresInMinutes = 10 + value; // 10 min fissi + calcolo
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60000).toISOString();

        const { data, error } = await supabase.from('time_posts').insert([{
            label: safeLabel,
            content,
            media_url,
            expires_at: expiresAt,
			author_id: author_id || 'anon'
        }]).select('id, created_at, expires_at').single();

        if (error) throw error;
        res.status(201).json(data);

    } catch (error) {
        console.error("Errore Pubblicazione Time:", error);
        res.status(500).json({ error: error.message });
    }
});

// Leggi il feed del Tempo (Tramite label esatta)
app.get('/api/time/:label', async (req, res) => {
    const { label } = req.params;
    
    try {
        const { data, error } = await supabase.from('time_posts')
            .select('*')
            .eq('label', label.toLowerCase())
            .gt('expires_at', new Date().toISOString()) // Solo quelli ancora validi
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
        
    } catch (error) {
        console.error("Errore Lettura Time:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- PULIZIA PERIODICA (Cron interno) ---

// Funzione helper per estrarre il nome del file dall'URL
function extractFileName(url) {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1]; // Prende l'ultimo pezzo, es: "1684323-42.jpg"
}

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// --- MODULO CONTATTI ---
app.post('/api/contact', contactLimiter, async (req, res) => {
    const { message, email, honeypot } = req.body;

    // SCUDO 1: Controllo Honeypot (Trappola per bot ciechi)
    if (honeypot) {
        console.log("🛑 Bot bloccato: Campo Honeypot compilato.");
        // Finto successo per far credere al bot di avercela fatta
        return res.json({ success: true }); 
    }

	let subject_pref = '[xyzt]';
    // SCUDO 2: Controllo del Contenuto (Trappola semantica)
    if (isSpam(message)) {
        console.log("🛑 Messaggio scartato: Contenuto classificato come SPAM." + message);
        // Anche qui, finto successo
        return res.json({ success: true }); 
    }
	
	if (isSpamBayesian(message)) {
        console.log("🛑 Messaggio scartato: Contenuto classificato come SPAM Bayes." + message);        
        //return res.json({ success: false }); 
		subject_pref = '[xyzt][spam-bayes]';
    }

    // Se passa entrambi gli scudi, invia l'email	
    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: subject_pref + ' Nuovo messaggio di contatto',
            text: `Inviato da: ${email || 'Anonimo'}\n\nMessaggio:\n${message}`
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- REPORT GIORNALIERO AUTOMATICO (Ogni 24 Ore) ---
setInterval(async () => {
    try {
        const ventiquattroOreFa = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Estrai statistiche rilevanti da Supabase
        const { data: nuoveLabel } = await supabase
            .from('category_stats')
            .select('category_id, total_posts')
            .eq('category_type', 'TIME')
            .gt('last_activity', ventiquattroOreFa);

        let listaLabel = nuoveLabel.map(l => `- #${l.category_id} (Post totali: ${l.total_posts})`).join('\n');

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `[xyzt] Daily Activity Report 📊`,
            text: `Ecco le attività nelle ultime 24 ore:\n\nLabel attive o create di recente:\n${listaLabel || 'Nessuna nuova attività.'}`
        });
    } catch (error) {
        console.error("Errore generazione report giornaliero:", error);
    }
}, 1000 * 60 * 60 * 24); // Spara esattamente ogni 24 ore

// Controlla il DB ogni 5 minuti, rimuove le immagini e poi i post scaduti
setInterval(async () => {
    try {
        const now = new Date().toISOString();

        // 1. Trova i post scaduti con immagini (Spazio)
        const { data: expiredSpace } = await supabase.from('space_posts')
            .select('media_url')
            .lt('expires_at', now)
            .not('media_url', 'is', null);

        // 2. Trova i post scaduti con immagini (Tempo)
        const { data: expiredTime } = await supabase.from('time_posts')
            .select('media_url')
            .lt('expires_at', now)
            .not('media_url', 'is', null);

        // 3. Raccogli tutti i nomi dei file da eliminare
        let filesToDelete = [];
        if (expiredSpace) filesToDelete.push(...expiredSpace.map(p => extractFileName(p.media_url)));
        if (expiredTime) filesToDelete.push(...expiredTime.map(p => extractFileName(p.media_url)));

        // Pulisci l'array da eventuali valori null o indefiniti
        filesToDelete = filesToDelete.filter(f => f != null);

        // 4. Elimina i file dallo storage in un colpo solo
        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage.from('xyzt-media').remove(filesToDelete);
            if (storageError) console.error("Errore pulizia Storage:", storageError);
        }

        // 5. Elimina i record dal database
        await supabase.from('space_posts').delete().lt('expires_at', now);
        await supabase.from('time_posts').delete().lt('expires_at', now);
        
    } catch (error) {
        console.error("Errore durante il ciclo di pulizia globale:", error);
    }
}, 60000 * 5); // Esegue ogni 5 minuti


// --- FRONTEND ROUTING E GESTIONE FILE STATICI ---

app.get('/api/space/map-points', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('space_posts')
            .select('lat, lon')
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ottieni le ultime 10 label attive
app.get('/api/labels/recent', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('category_stats')
            .select('category_id')
            .eq('category_type', 'TIME')
            .order('last_activity', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error("Errore Lettura Labels:", error);
        res.status(500).json({ error: error.message });
    }
});

// Serve tutti i file nella cartella 'public' (css, js, immagini, ecc.)
app.use(express.static('public'));

// Fallback: per qualsiasi altra URL non gestita dalle API (es. www.xyzt.com/gemini)
// restituisce index.html, lasciando che Javascript (app.js) gestisca il cambio pagina visivo
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- AVVIO SERVER ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 xyzt core è online. API in ascolto sulla porta ${PORT}`);
});