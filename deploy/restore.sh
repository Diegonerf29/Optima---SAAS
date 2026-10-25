#!/usr/bin/env bash
# restaura una copia de seguridad: SUSTITUYE todos los datos actuales por los de la copia
# uso: deploy/restore.sh backups/optima-2026-10-25_0330.sql.gz
#      (con --si al final no pregunta; lo usa el entorno de demo que se restaura cada noche)
set -euo pipefail
source "$(dirname "$0")/comun.sh"

COPIA=${1:-}
[ -f "$COPIA" ] || { echo "Uso: deploy/restore.sh <fichero .sql.gz>"; exit 1; }
gunzip -t "$COPIA" || { echo "$COPIA esta dañado"; exit 1; }

if [ "${2:-}" != "--si" ]; then
  read -r -p "Se borraran los datos actuales y se pondran los de $COPIA. Escribe RESTAURAR para seguir: " ok
  [ "$ok" = "RESTAURAR" ] || { echo "Cancelado"; exit 1; }
fi

# la API se para para que nadie escriba mientras se restaura
API=$(compose ps -q --status running api)
if [ -n "$API" ]; then compose stop api; fi
gunzip -c "$COPIA" | compose exec -T mysqldb sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" 2>/dev/null'
if [ -n "$API" ]; then compose start api; fi
echo "$(date '+%F %T') restaurada $COPIA"
