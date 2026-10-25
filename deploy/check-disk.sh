#!/usr/bin/env bash
# avisa si el disco del servidor se esta llenando (paso 8.7)
# uso: deploy/check-disk.sh   (cada hora con cron, ver deploy/README.md)
set -euo pipefail
source "$(dirname "$0")/comun.sh"

LIMITE=$(valor DISK_ALERT_PERCENT); LIMITE=${LIMITE:-85}
USO=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
if [ "$USO" -ge "$LIMITE" ]; then
  avisar "El disco del servidor esta al ${USO}%. Borra copias o imagenes viejas: docker system prune"
fi
