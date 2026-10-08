# Imagem para hospedar em qualquer provedor com Docker (Railway, Fly.io, VPS).
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production \
    PORT=3001 \
    ROSAN_DB=/data/rosan.db
VOLUME ["/data"]
EXPOSE 3001
CMD ["npm", "start"]
