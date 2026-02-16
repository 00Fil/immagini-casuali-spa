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
    const [ results ] = await conn.query("SELECT * FROM images;");
    conn.close();
    return results;
}

async function salvaImmagine(immagine) {
    let conn = null;
    let affectedRows = 0;

    try {
        conn = await creaConnessione();
        const [ results ] = await conn.query(
            "INSERT INTO images (image_url, description, rating) VALUES (?, ?, ?);",
            [ immagine.image_url, immagine.description, immagine.rating ]
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
        const [ results ] = await conn.query(
            "SELECT * FROM images WHERE id = ?;", [ id ]
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
        const [ result ] = await conn.query(
            "UPDATE images SET image_url = ?, description = ?, rating = ? WHERE id = ?;",
            [ immagine.image_url, immagine.description, immagine.rating, id ]
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
        const [ result ] = await conn.execute(
            "DELETE FROM images WHERE id = ?;", [ id ]
        );
        affectedRows = result.affectedRows;
    } catch (e) {
        return false;
    } finally {
        if (conn !== null) conn.close();
    }

    return affectedRows > 0;
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
    eliminaImmagine
}
