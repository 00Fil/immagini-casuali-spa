
FROM node:18.20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 1337

CMD ["npx", "nodemon", "src/index.js"]
