# imagen de la web: se construye la aplicacion React con Node y se sirve con Caddy,
# que ademas pone el HTTPS y pasa /api a la API
# se construye desde la raiz del repositorio (lo hace docker-compose.prod.yml):
#   docker build -f frontend/Dockerfile -t optima-web .

# etapa 1: compilar la aplicacion (el resultado son ficheros estaticos en dist/)
FROM node:24-alpine AS build
WORKDIR /app
# primero solo las dependencias: si no cambian, Docker reutiliza esta capa
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# etapa 2: solo Caddy y los ficheros estaticos (sin Node ni el codigo fuente)
FROM caddy:2.11-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
