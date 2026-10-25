#!/usr/bin/env bash
# actualiza a la ultima version publicada (paso 8.6)
#   1. copia de seguridad (las versiones nuevas pueden traer migraciones de la base de datos)
#   2. descarga las imagenes nuevas de GitHub (API_IMAGE y WEB_IMAGE en el .env)
#   3. recrea solo los contenedores que han cambiado
# uso: deploy/update.sh
set -euo pipefail
source "$(dirname "$0")/comun.sh"

deploy/backup.sh
compose pull api web
compose up -d
# borra las imagenes viejas que ya no usa ningun contenedor
docker image prune -f > /dev/null

# espera a que la API este sana (el healthcheck del Dockerfile; Flyway migra al arrancar)
for _ in $(seq 1 36); do
  if [ "$(docker inspect --format '{{.State.Health.Status}}' "$(compose ps -q api)")" = "healthy" ]; then
    echo "$(date '+%F %T') actualizado y funcionando"
    exit 0
  fi
  sleep 5
done
avisar "La API no responde despues de actualizar: revisa 'docker compose -f docker-compose.prod.yml logs api'"
exit 1
