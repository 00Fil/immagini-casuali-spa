/**
 * ============================================================================
 * SERVER HTTP — Backend REST per la SPA "Immagini Casuali"
 * ============================================================================
 * 
 * Questo file crea un server HTTP che espone delle API REST per gestire
 * una collezione di immagini. Ogni immagine ha: URL, descrizione e voto.
 * 
 * ENDPOINTS DISPONIBILI:
 *   GET    /images      → restituisce tutte le immagini salvate
 *   POST   /images      → salva una nuova immagine (con validazione)
 *   GET    /images/:id  → restituisce una singola immagine per ID
 *   PUT    /images/:id  → modifica un'immagine esistente (con validazione)
 *   DELETE /images/:id  → elimina un'immagine per ID
 * 
 * FUNZIONALITÀ EXTRA:
 *   - CORS abilitato per consentire richieste dal frontend (file:// o altro dominio)
 *   - Validazione dati lato server: URL valido, voto 1-5, descrizione max 200 char
 * ============================================================================
 */

const http = require('http');

/*
 * SCELTA DEL DATABASE:
 *   - './db'           → usa MySQL/MariaDB (richiede Docker o un server MySQL in esecuzione)
 *   - './in-memory-db' → usa un database in memoria con persistenza su file JSON
 * 
 * Utilizziamo il database MySQL tramite Docker Compose.
 * Se vuoi usare il db in memoria senza Docker, cambia in: require('./in-memory-db')
 */
const db = require('./db');

/** Porta su cui il server resterà in ascolto */
const PORT = 1337;


/**
 * ==========================================================================
 * FUNZIONE DI VALIDAZIONE
 * ==========================================================================
 * 
 * Controlla che i dati di un'immagine rispettino le regole:
 *   1. image_url → deve essere presente e iniziare con http:// o https://
 *   2. rating    → deve essere un intero compreso tra 1 e 5
 *   3. description → non può superare i 200 caratteri
 * 
 * @param {Object} immagine - L'oggetto immagine da validare
 * @returns {string[]} - Array di messaggi di errore (vuoto se tutto ok)
 */
function validaImmagine(immagine) {
    const errori = [];

    /* --- Validazione URL --- */
    /* Verifica che l'URL sia presente e che inizi con http://, https:// o data:image/ */
    if (!immagine.image_url || typeof immagine.image_url !== 'string') {
        errori.push("L'URL dell'immagine è obbligatorio.");
    } else if (!/^https?:\/\/.+/.test(immagine.image_url) && !/^data:image\/.+/.test(immagine.image_url)) {
        errori.push("L'URL dell'immagine deve essere valido (http/https) o un'immagine in base64.");
    }

    /* --- Validazione voto --- */
    /* Il voto deve essere un numero intero tra 1 e 5 (inclusi) */
    if (immagine.rating === undefined || immagine.rating === null) {
        errori.push("Il voto è obbligatorio.");
    } else {
        const voto = Number(immagine.rating);
        if (!Number.isInteger(voto) || voto < 1 || voto > 5) {
            errori.push("Il voto deve essere un numero intero compreso tra 1 e 5.");
        }
    }

    /* --- Validazione descrizione --- */
    /* La descrizione può essere vuota ma non può superare i 200 caratteri */
    if (immagine.description && typeof immagine.description === 'string') {
        if (immagine.description.length > 200) {
            errori.push("La descrizione non può superare i 200 caratteri.");
        }
    }

    return errori;
}


/**
 * ==========================================================================
 * CREAZIONE DEL SERVER HTTP
 * ==========================================================================
 * 
 * Il server gestisce ogni richiesta in arrivo con una funzione asincrona.
 * Per prima cosa imposta gli header CORS su OGNI risposta, poi fa il routing
 * confrontando metodo HTTP e percorso URL con i vari endpoint definiti.
 */
const server = http.createServer(async (req, res) => {

    /* -----------------------------------------------------------------------
     * CORS (Cross-Origin Resource Sharing)
     * -----------------------------------------------------------------------
     * Questi header permettono al frontend di fare richieste al backend
     * anche se si trovano su origini diverse (es. file:// vs http://localhost).
     * 
     *   Access-Control-Allow-Origin  → "*" consente qualsiasi origine
     *   Access-Control-Allow-Methods → metodi HTTP permessi
     *   Access-Control-Allow-Headers → header personalizzati permessi (es. Content-Type)
     * ----------------------------------------------------------------------- */
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    /* -----------------------------------------------------------------------
     * GESTIONE PREFLIGHT (OPTIONS)
     * -----------------------------------------------------------------------
     * Il browser invia automaticamente una richiesta OPTIONS prima di una fetch
     * con metodi "non semplici" (PUT, DELETE) o con header personalizzati.
     * Rispondiamo con 204 (No Content) per confermare che il server accetta
     * queste richieste cross-origin.
     * ----------------------------------------------------------------------- */
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    /* Tutte le risposte con contenuto saranno in formato JSON */
    res.setHeader('Content-Type', 'application/json');

    /**
     * Funzione helper che legge il body della richiesta HTTP.
     * Il body arriva in "chunks" (pezzi) che vengono concatenati e poi
     * parsati come JSON. Restituisce una Promise con l'oggetto risultante.
     */
    const getBody = () => {
        return new Promise((resolve, reject) => {
            let chunks = [];
            /* Ogni volta che arriva un pezzo di dati, lo aggiungiamo all'array */
            req.on('data', chunk => chunks.push(chunk));

            /* Quando il flusso di dati finisce, concateniamo tutto e parsiamo */
            req.on('end', () => {
                /* FIX: Buffer.concat unisce i buffer correttamente. chunks.join() creerebbe una stringa corrotta. */
                const body = Buffer.concat(chunks).toString();
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    /* Se il JSON non è valido, restituiamo un oggetto vuoto o gestiamo l'errore */
                    resolve({});
                }
            });

            /* Gestione errori stream */
            req.on('error', (err) => {
                console.error('Errore lettura body:', err);
                reject(err);
            });
        });
    };

    /**
     * Funzione helper per il routing.
     * Confronta metodo HTTP e percorso URL della richiesta con quelli specificati.
     * Supporta parametri dinamici nell'URL (es. :id in /images/:id).
     * I parametri estratti vengono salvati nell'oggetto `params`.
     * 
     * @param {string} method - Metodo HTTP atteso (GET, POST, PUT, DELETE)
     * @param {string} path   - Percorso atteso, con eventuali parametri (es. /images/:id)
     * @returns {boolean} - true se la richiesta corrisponde
     */
    let params;
    const reqMatch = (method, path) => {
        params = {};

        /* Se il metodo non corrisponde, uscita immediata */
        if (req.method !== method) return false;

        /* Confronto segmento per segmento dell'URL */
        const urlSplit = req.url.split('/');
        const pathSplit = path.split('/');
        /* Se il numero di segmenti è diverso, i percorsi non possono corrispondere */
        if (urlSplit.length !== pathSplit.length) return false;

        let result = true;
        for (let i = 0; i < urlSplit.length; i++) {
            /* Se il segmento del path inizia con ":", è un parametro dinamico */
            if (pathSplit[i].startsWith(':')) {
                const paramName = pathSplit[i].substr(1);
                params[paramName] = urlSplit[i];
            }
            /* Altrimenti deve corrispondere esattamente */
            else if (pathSplit[i] !== urlSplit[i]) {
                result = false;
                break;
            }
        }
        return result;
    }


    /* =====================================================================
     * ROUTING — Gestione dei vari endpoint
     * ===================================================================== */

    /* --- GET /images → Restituisce tutte le immagini salvate --- */
    if (reqMatch('GET', '/images')) {
        const immagini = await db.getImmagini();
        res.end(JSON.stringify(immagini));
    }

    /* --- POST /images → Salva una nuova immagine --- */
    /* Prima valida i dati ricevuti, poi li salva nel database */
    else if (reqMatch('POST', '/images')) {
        const immagine = await getBody();
        console.log('POST /images received body:', JSON.stringify(immagine).substring(0, 100) + '...');

        /* Validazione: se ci sono errori, rispondi con 400 e la lista errori */
        const errori = validaImmagine(immagine);
        if (errori.length > 0) {
            console.log('Validation errors:', errori);
            res.statusCode = 400;
            res.end(JSON.stringify({ errori }));
            return;
        }

        const ok = await db.salvaImmagine(immagine);
        if (ok) {
            res.statusCode = 201;
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ errori: ['Errore nel salvataggio del database (verificare log backend)'] }));
        }
    }

    /* --- GET /images/:id → Restituisce una singola immagine per ID --- */
    else if (reqMatch('GET', '/images/:id')) {
        const id = parseInt(params.id);
        const trovata = await db.trovaImmagine(id);
        if (trovata) res.end(JSON.stringify(trovata));
        else {
            res.statusCode = 404;
            res.end();
        }
    }

    /* --- PUT /images/:id → Modifica un'immagine esistente --- */
    /* Anche qui valida i dati prima di aggiornare il database */
    else if (reqMatch('PUT', '/images/:id')) {
        const id = parseInt(params.id);
        const immagine = await getBody();

        /* Validazione: se ci sono errori, rispondi con 400 e la lista errori */
        const errori = validaImmagine(immagine);
        if (errori.length > 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ errori }));
            return;
        }

        const ok = await db.modificaImmagine(id, immagine);
        res.statusCode = ok ? 204 : 404;
        res.end();
    }

    /* --- DELETE /images/:id → Elimina un'immagine per ID --- */
    else if (reqMatch('DELETE', '/images/:id')) {
        const id = parseInt(params.id);
        const ok = await db.eliminaImmagine(id);
        res.statusCode = ok ? 204 : 404;
        res.end();
    }

    /* --- Fallback: endpoint non trovato → 404 --- */
    else {
        res.statusCode = 404;
        res.end();
    }
});


/**
 * ==========================================================================
 * AVVIO DEL SERVER
 * ==========================================================================
 * 
 * Inizializza il database (carica i dati da file/DB), poi mette il server
 * in ascolto sulla porta definita. Il messaggio in console conferma l'avvio.
 */
db.inizializza(() => {
    server.listen(PORT, () => {
        console.log('Server in ascolto su http://localhost:' + PORT);
    });
});
