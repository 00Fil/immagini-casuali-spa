const fs = require('node:fs');

let immagini = [];
let idCounter = 1;

async function getImmagini() {
    return immagini;
}

async function salvaImmagine(img) {
    img.id = idCounter;
    idCounter += 1;
    immagini.push(img);
    return true;
}

async function trovaImmagine(id) {
    for (img of immagini) {
        if (img.id === id) return img;
    }
    return null;
}

async function modificaImmagine(id, immagine) {
    const i = trovaIndiceImmagine(id);
    if (i >= 0) {
        immagini[i] = immagine;
        immagini[i].id = id;
        return true;
    }
    return false;
}

async function eliminaImmagine(id) {
    const i = trovaIndiceImmagine(id);
    if (i >= 0) {
        immagini.splice(i, 1);
        return true;
    }
    return false;
}

function trovaIndiceImmagine(id) {
    for (let i = 0; i < immagini.length; i++) {
        if (immagini[i].id === id) return i;
    }
    return -1;
}

const DB_FILE_PATH = './db.json';

function inizializza(callback) {
    fs.readFile(DB_FILE_PATH, (err, content) => {
        if (err) console.log('Lettura DB non riuscita');
        else {
            console.log('DB caricato correttamente');
            immagini = JSON.parse(content);
        }

        // ogni 10 secondi salvo le immagini in un file json
        setInterval(() => {
            const dbContent = JSON.stringify(immagini);
            fs.writeFile(DB_FILE_PATH, dbContent, err => {
                if (err) console.log("Non sono riuscito a salvare il db :(");
                else     console.log("Il db è stato salvato");
            })
        }, 10000);

        callback();
    });
}

module.exports = {
    inizializza,
    getImmagini,
    salvaImmagine,
    trovaImmagine,
    modificaImmagine,
    eliminaImmagine
}