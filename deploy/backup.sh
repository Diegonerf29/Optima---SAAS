#!/usr/bin/env bash
# copia de seguridad de la base de datos (paso 8.5, P3)
#   1. mysqldump dentro del contenedor de MySQL, comprimido con gzip
#   2. en el servidor se guardan las de los ultimos BACKUP_DAYS dias (14 por defecto)
#   3. si BACKUP_REMOTE esta en el .env, se sube una copia FUERA del servidor con rclone
# uso: deploy/backup.sh   (cada noche con cron, ver deploy/README.md)
set -euo pipefail
source "$(dirname "$0")/comun.sh"

DIAS=$(valor BACKUP_DAYS); DIAS=${DIAS:-14}
REMOTO=$(valor BACKUP_REMOTE)
mkdir -p backups
FICHERO="backups/optima-$(date +%Y-%m-%d_%H%M).sql.gz"

# si algo falla: se borra la copia a medias y llega un aviso
trap 'rm -f "$FICHERO.tmp"; avisar "Ha fallado la copia de seguridad"' ERR

# la contraseña se lee dentro del contenedor, asi no aparece en la lista de procesos del servidor
compose exec -T mysqldb sh -c \
  'exec mysqldump --single-transaction --routines --triggers --no-tablespaces -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" 2>/dev/null' \
  | gzip > "$FICHERO.tmp"

# mysqldump escribe "Dump completed" al final: si no esta, la copia esta cortada
gunzip -c "$FICHERO.tmp" | tail -n 1 | grep -q "Dump completed"
mv "$FICHERO.tmp" "$FICHERO"
echo "$(date '+%F %T') copia creada: $FICHERO ($(du -h "$FICHERO" | cut -f1))"

# borra las copias antiguas del servidor
find backups -name 'optima-*.sql.gz' -mtime +"$DIAS" -delete

# copia fuera del servidor: si se pierde el VPS o la cuenta de Hostinger, los datos siguen a salvo
if [ -n "$REMOTO" ]; then
  rclone copy "$FICHERO" "$REMOTO"
  rclone delete "$REMOTO" --min-age "${DIAS}d" --include 'optima-*.sql.gz'
  echo "$(date '+%F %T') subida a $REMOTO"
else
  echo "$(date '+%F %T') ojo: sin BACKUP_REMOTE la copia solo esta en este servidor"
fi
