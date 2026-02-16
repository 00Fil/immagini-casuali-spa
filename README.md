# SPA immagini casuali

Una SPA (single page application) composta da:
* **frontend** => composto da un unico file: [frontend.html](./frontend.html)
* **backend** => server HTTP implementato in Node.js che utilizza un DB MySQL, espone le API per gestire una risorsa REST, sta nella cartella [webserver](./webserver)


## Istruzioni per l'uso

Per eseguire il frontend basta aprire il file 'frontend.html' con un browser.

Il backend puo' essere eseguito in due modi:

### 1. Con Docker
[Installare Docker](https://docs.docker.com/engine/install/) sul proprio computer.
Aprire un terminale, spostarsi nella cartella 'immagini-casuali-spa' ed eseguire il comando
```
docker compose up
```
Questo comando avvia sia il webserver che il database.

Se i server rimangono attivi e si vuole disattivarli usare il comando
```
docker compose down
```

### 2. Senza Docker
Installare Node.js e un database MySQL (ad esempio con Laragon).

Database:
* Far partire il server MySQL sulla porta 3306
* Creare il db eseguendo lo script [create-db.sql](./create-db.sql)

Webserver:
* Aprire un terminale, spostarsi nella cartella 'webserver' ed eseguire i seguenti comandi:
* `npm install` (per installare le dipendenze)
* `npx nodemon src/index.js` (per far partire il server)
