# Despliegue de Optima en un VPS

Guía paso a paso para poner Optima en un servidor propio (pensada para un VPS KVM 1 de Hostinger con Ubuntu, pero sirve para cualquier VPS con Docker). Los pasos con 👤 los tienes que hacer tú fuera del código.

## Qué hay en el servidor

```
Internet ──443──▶ web (Caddy) ──/api──▶ api (Spring Boot) ──▶ mysqldb (MySQL)
                  │ HTTPS automático       solo red interna       solo red interna
                  └ sirve la aplicación React
```

- Solo están abiertos los puertos **22** (SSH), **80** y **443**. La API y MySQL no se ven desde fuera.
- Todo se arranca con `docker-compose.prod.yml` y se configura con un fichero `.env` (plantilla en `.env-example`).
- Los scripts de esta carpeta hacen el mantenimiento: `backup.sh`, `restore.sh`, `update.sh` y `check-disk.sh`.

## 1. 👤 Servidor y dominio

1. Contrata el VPS (KVM 1 llega de sobra) con el **centro de datos en la UE** (los datos de los clientes son datos personales: RGPD) y la plantilla **Ubuntu 24.04 con Docker**.
2. Compra el dominio y crea en su DNS un registro **A** con la IP del servidor (por ejemplo `optima.tudominio.com → 203.0.113.10`). Si el VPS tiene IPv6, añade también un registro **AAAA**.

## 2. Preparar el servidor

Desde tu ordenador, primero como `root` (la contraseña te la da Hostinger):

```bash
ssh root@IP_DEL_SERVIDOR
adduser optima                # usuario para trabajar, sin usar root
usermod -aG sudo,docker optima
```

Copia tu clave SSH al usuario nuevo (desde **tu** ordenador; si no tienes clave, `ssh-keygen -t ed25519`):

```bash
ssh-copy-id optima@IP_DEL_SERVIDOR
```

Ya en el servidor como `optima`, solo se entra con clave y nunca como root:

```bash
sudo tee /etc/ssh/sshd_config.d/optima.conf > /dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
sudo systemctl restart ssh
```

> Antes de cerrar la sesión, comprueba en **otra terminal** que `ssh optima@IP_DEL_SERVIDOR` funciona. Si no, puedes quedarte fuera.

Cortafuegos (solo SSH y web) y actualizaciones de seguridad automáticas:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo apt update && sudo apt install -y unattended-upgrades
```

Si la plantilla no trae Docker: `curl -fsSL https://get.docker.com | sudo sh`.

## 3. Instalar Optima

```bash
sudo mkdir -p /opt/optima && sudo chown optima: /opt/optima
git clone https://github.com/Diegonerf29/Optima---SAAS.git /opt/optima
cd /opt/optima
cp .env-example .env
chmod 600 .env                # solo tu usuario puede leerlo
nano .env                     # rellenar (ver abajo)
```

Valores obligatorios del `.env`:

| Variable | Cómo generarla |
|----------|----------------|
| `DOMAIN`, `FRONTEND_URL` | Tu dominio, por ejemplo `optima.tudominio.com` y `https://optima.tudominio.com` |
| `JWT_SECRET` | `openssl rand -base64 64 \| tr -d '\n'` |
| `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` | `openssl rand -base64 24` (una distinta para cada una) |

Primer arranque (construye las imágenes en el propio servidor; tarda unos minutos):

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # los tres en "running"/"healthy"
curl https://optima.tudominio.com/actuator/health   # {"status":"UP"}
```

Abre `https://optima.tudominio.com`, registra tu negocio y comprueba que llega el email de confirmación (paso 4).

## 4. 👤 Correo (P5)

Sin correo no funcionan la confirmación del email, "olvidé mi contraseña" ni los avisos a los clientes.

1. Crea una cuenta en un proveedor con plan gratuito, por ejemplo **Brevo** (300 correos al día).
2. Da de alta tu dominio en el proveedor y añade en el DNS los registros que te indique: **SPF**, **DKIM** y **DMARC** (para empezar, `v=DMARC1; p=none; rua=mailto:tu@correo.com`). Sin ellos los correos acaban en spam.
3. Pon en el `.env` los datos SMTP (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM=no-reply@tudominio.com`) y reinicia la API:

```bash
docker compose -f docker-compose.prod.yml up -d api
```

## 5. Copias de seguridad (P3)

`deploy/backup.sh` hace un `mysqldump` comprimido, guarda en `backups/` los últimos 14 días y, si está configurado, sube una copia **fuera del servidor**. Las copias del propio Hostinger no bastan: si se pierde la cuenta o el servidor, se pierden con él.

1. Instala rclone y crea un "remoto" (por ejemplo Backblaze B2, que regala 10 GB, o Google Drive):

   ```bash
   sudo apt install -y rclone
   rclone config          # crea un remoto, por ejemplo "b2"
   ```

   Para que el proveedor no pueda leer las copias, crea además un remoto de tipo **crypt** encima del anterior y usa ese.

2. En el `.env`: `BACKUP_REMOTE=b2:optima-copias` (remoto:carpeta).
3. Pruébalo a mano: `deploy/backup.sh`.
4. Programa la copia diaria con `crontab -e`:

   ```cron
   30 3 * * * /opt/optima/deploy/backup.sh >> /opt/optima/backups/backup.log 2>&1
   ```

**Una copia que nunca se ha restaurado no es una copia.** Haz un simulacro al instalar y de vez en cuando. Este levanta un MySQL aparte (otro nombre de proyecto), así que no toca producción:

```bash
export COMPOSE_PROJECT_NAME=optima-simulacro
docker compose --env-file .env -f docker-compose.prod.yml up -d mysqldb
sleep 40                                                # a que MySQL arranque
deploy/restore.sh backups/optima-AAAA-MM-DD_HHMM.sql.gz --si
docker compose --env-file .env -f docker-compose.prod.yml exec mysqldb \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM appointments"'
docker compose --env-file .env -f docker-compose.prod.yml down -v   # borra el simulacro
unset COMPOSE_PROJECT_NAME
```

Para restaurar **de verdad** en producción: `deploy/restore.sh backups/<copia>.sql.gz` (pide escribir `RESTAURAR`; para la API mientras tanto).

## 6. Publicar versiones nuevas (paso 8.6)

1. El trabajo se hace en `develop`. Para publicar, se lleva a `main` (pull request de `develop` a `main`).
2. Cuando la CI pasa en `main`, el workflow **Publicar imágenes** sube a GitHub las imágenes `ghcr.io/diegonerf29/optima-api` y `optima-web`, con las etiquetas `latest` y la del commit.
3. La primera vez, en el `.env` del servidor:

   ```bash
   API_IMAGE=ghcr.io/diegonerf29/optima-api:latest
   WEB_IMAGE=ghcr.io/diegonerf29/optima-web:latest
   ```

   Si los paquetes de GitHub son privados, el servidor necesita entrar una vez con un token que solo pueda leer paquetes (`read:packages`): `docker login ghcr.io -u Diegonerf29`.

4. Para actualizar: `deploy/update.sh`. Hace una copia de seguridad, descarga las imágenes, recrea los contenedores y espera a que la API esté sana (Flyway aplica las migraciones al arrancar).

**Volver atrás:** pon en `API_IMAGE`/`WEB_IMAGE` la etiqueta del commit anterior (por ejemplo `optima-api:5bdc9ff`) y ejecuta `deploy/update.sh`. Si la versión nueva ya había migrado la base de datos, restaura además la copia que hizo `update.sh` justo antes.

## 7. 👤 Cobrar con Stripe (fase 9)

Mientras `BILLING_ENABLED=false` nadie paga ni se bloquea. Para empezar a cobrar:

1. Crea la cuenta de [Stripe](https://dashboard.stripe.com) y trabaja primero en **modo de prueba** (claves `sk_test_...`).
2. **Producto y precio:** *Catálogo de productos → Añadir producto*, "Optima", precio **recurrente mensual**. Copia el id del precio (`price_...`) y pon el mismo importe en `frontend/src/lib/plan.ts` (es lo que se anuncia en la portada).
3. **Portal del cliente:** *Configuración → Billing → Portal del cliente*: activa cambiar la tarjeta, ver facturas y cancelar.
4. **Webhook:** *Desarrolladores → Webhooks → Añadir endpoint* con la dirección `https://optima.tudominio.com/api/webhooks/stripe` y estos eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused` y `customer.subscription.resumed`. Copia su secreto (`whsec_...`).
5. En el `.env`: `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `STRIPE_PRICE_ID`. Reinicia la API (`docker compose -f docker-compose.prod.yml up -d api`). Si falta alguna clave, la API no arranca y el log dice cuál.
6. **Prueba (9.9)** con las tarjetas de prueba de Stripe: `4242 4242 4242 4242` (pago correcto) y `4000 0000 0000 0341` (se rechaza al cobrar). Comprueba en *Configuración → Suscripción* que el estado cambia, y cancela desde "Pagos y facturas". Con [Stripe CLI](https://docs.stripe.com/stripe-cli) puedes mandar avisos a tu ordenador: `stripe listen --forward-to localhost:8080/api/webhooks/stripe`.
7. Cuando todo funcione, repite los pasos 2 a 5 en **modo real** (claves `sk_live_...`, otro precio y otro webhook).
8. Facturas e IVA (9.10): revísalo con una gestoría. Stripe puede emitir las facturas y calcular el impuesto (Stripe Tax).

**Cómo funciona:** al registrarse, cada negocio tiene 14 días de prueba sin tarjeta. "Suscribirme" abre la página de pago de Stripe (Optima nunca ve la tarjeta) y respeta los días de prueba que queden. Stripe avisa al webhook de cada cambio; Optima comprueba la firma del aviso y pregunta a Stripe el estado actual. Con la prueba terminada o la suscripción cancelada, el negocio solo puede ver su estado y pagar (sus datos se conservan). Si falla un cobro (`PAST_DUE`) se sigue entrando mientras Stripe reintenta.

## 8. Monitorización (paso 8.7)

- **¿Está caída?** Crea un monitor gratuito en [UptimeRobot](https://uptimerobot.com) de tipo *Keyword* contra `https://optima.tudominio.com/actuator/health` buscando `UP`. Avisa por email si deja de responder.
- **Avisos al móvil** (copia fallida, disco lleno, actualización que no arranca): instala la app [ntfy](https://ntfy.sh), suscríbete a un tema con un nombre largo y difícil de adivinar y ponlo en el `.env`: `NOTIFY_URL=https://ntfy.sh/optima-un-tema-largo-y-secreto`.
- **Disco lleno:** cada hora con `crontab -e`:

  ```cron
  0 * * * * /opt/optima/deploy/check-disk.sh
  ```

- **Ver qué pasa:** `docker compose -f docker-compose.prod.yml logs -f --tail=100 api` (o `web` para Caddy).

## Resumen de tareas programadas (`crontab -e`)

```cron
30 3 * * * /opt/optima/deploy/backup.sh >> /opt/optima/backups/backup.log 2>&1
0  * * * * /opt/optima/deploy/check-disk.sh
```

## Si algo va mal

| Síntoma | Qué mirar |
|---------|-----------|
| La web no carga o da error de certificado | El registro A del DNS apunta a la IP del servidor y los puertos 80 y 443 están abiertos. `docker compose -f docker-compose.prod.yml logs web` |
| "Bad gateway" (502) | La API no está en marcha: `docker compose -f docker-compose.prod.yml logs api` |
| La API no arranca: falta `JWT_SECRET` o `DB_PASSWORD` | El `.env` no tiene ese valor o sigue en `CAMBIAME` |
| No llegan los correos | Datos SMTP del `.env` y registros SPF/DKIM del dominio |
| Disco lleno | `docker system prune` (imágenes viejas) y copias antiguas de `backups/` |
