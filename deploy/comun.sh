# funciones que usan los scripts de deploy/ (no se ejecuta solo: se carga con "source")
# todos trabajan desde la carpeta del proyecto, donde estan el .env y docker-compose.prod.yml

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ENV_FILE=${ENV_FILE:-.env}
[ -f "$ENV_FILE" ] || { echo "No encuentro $ENV_FILE en $(pwd)"; exit 1; }

# docker compose de produccion con las variables del .env
compose() {
  docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"
}

# lee una variable del .env sin ejecutarlo (por si algun valor tiene simbolos raros)
valor() {
  grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true
}

# manda un aviso al movil si NOTIFY_URL esta en el .env (por ejemplo https://ntfy.sh/un-tema-secreto)
avisar() {
  local url
  url=$(valor NOTIFY_URL)
  echo "$(date '+%F %T') AVISO: $1"
  [ -n "$url" ] && curl -fsS -m 10 -H "Title: Optima" -d "$1" "$url" > /dev/null || true
}
