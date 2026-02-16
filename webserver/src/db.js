const mysql = require('mysql2/promise');

async function creaConnessione() {
    return await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: 'root',
        password: '',
        database: 'spa_images',
    });
}

async function getImmagini() {
    const conn = await creaConnessione();
    /* Ordiniamo per posizione (default 0) e poi per ID */
    const [results] = await conn.query("SELECT * FROM images ORDER BY position ASC, id DESC;");
    conn.close();
    return results;
}

async function salvaImmagine(immagine) {
    let conn = null;
    let affectedRows = 0;

    try {
        conn = await creaConnessione();
        /* Al salvataggio, se non specificato, la posizione resta 0 */
        const [results] = await conn.query(
            "INSERT INTO images (image_url, description, rating, position) VALUES (?, ?, ?, ?);",
            [immagine.image_url, immagine.description, immagine.rating, immagine.position || 0]
        );
        affectedRows = results.affectedRows;
    } catch (e) {
        return false;
    } finally {
        if (conn !== null) conn.close();
    }

    return affectedRows > 0;
}

async function trovaImmagine(id) {
    let conn = null;

    try {
        conn = await creaConnessione();
        const [results] = await conn.query(
            "SELECT * FROM images WHERE id = ?;", [id]
        );
        if (results.length > 0) return results[0];
        else return null;
    } catch (e) {
        return null;
    } finally {
        if (conn !== null) conn.close();
    }
}

async function modificaImmagine(id, immagine) {
    let conn = null;
    let affectedRows = 0;

    try {
        conn = await creaConnessione();
        const [result] = await conn.query(
            "UPDATE images SET image_url = ?, description = ?, rating = ?, position = ? WHERE id = ?;",
            [immagine.image_url, immagine.description, immagine.rating, immagine.position || 0, id]
        );
        affectedRows = result.affectedRows;
    } catch (e) {
        return false;
    } finally {
        if (conn !== null) conn.close();
    }

    return affectedRows > 0;
}

async function eliminaImmagine(id) {
    let conn = null;
    let affectedRows = 0;

    try {
        conn = await creaConnessione();
        const [result] = await conn.execute(
            "DELETE FROM images WHERE id = ?;", [id]
        );
        affectedRows = result.affectedRows;
    } catch (e) {
        return false;
    } finally {
        if (conn !== null) conn.close();
    }

    return affectedRows > 0;
}

/**
 * Aggiorna le posizioni di più immagini contemporaneamente.
 * Riceve un array di oggetti { id, position }.
 */
async function aggiornaPosizioni(ordini) {
    let conn = null;
    try {
        conn = await creaConnessione();
        for (const item of ordini) {
            await conn.query("UPDATE images SET position = ? WHERE id = ?;", [item.position, item.id]);
        }
        return true;
    } catch (e) {
        console.error('Errore aggiornaPosizioni:', e);
        return false;
    } finally {
        if (conn !== null) conn.close();
    }
}

// per ora non serve a nulla ma la teniamo per compatibilita' con in-memory-db.js
function inizializza(callback) {
    callback();
}

module.exports = {
    inizializza,
    getImmagini,
    salvaImmagine,
    trovaImmagine,
    modificaImmagine,
    eliminaImmagine,
    aggiornaPosizioni
}
