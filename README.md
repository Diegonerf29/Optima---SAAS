# Optima

Agenda y gestión de citas para **locales pequeños** (peluquerías, centros de estética, barberías...): un solo local, pocos empleados y muchas veces un único PC en recepción.

Es un SaaS **multi-tenant**: muchos negocios comparten la misma aplicación y la misma base de datos, pero cada uno solo ve sus datos.

> Estado del proyecto y siguientes pasos: [`plan.md`](plan.md). Auditoría de seguridad y calidad, con el registro de cada corrección: [`AUDITORIA.md`](AUDITORIA.md).

## Qué hace

- **Agenda**: citas por empleado y cabina, con huecos libres calculados según el horario del negocio (con turno partido), el de cada empleado (quien no tiene horario propio trabaja todo el del local), ausencias, bloqueos y citas ya reservadas.
- **Clientes**, **catálogo** (servicios, categorías e impuestos; un negocio nuevo ya trae el IVA 21 % y la categoría General), **equipo** (empleados, horarios, ausencias) y **configuración del negocio** (horario, cabinas, zona horaria).
- **Cobros**: quién cobró, cuándo y cómo (efectivo, tarjeta, Bizum); total con IVA calculado en el servidor.
- **Emails a clientes**: confirmación, cambios, cancelación y recordatorio el día antes.
- **Suscripción**: 14 días de prueba sin tarjeta y después un único plan mensual con Stripe (pago, portal de facturas y avisos firmados). Sin suscripción activa el negocio solo puede ver su estado y pagar.
- **Cuentas**: registro de negocio, confirmación del email, invitaciones de empleados, recuperación de contraseña y cierre de sesión en todos los dispositivos.

## Tecnologías

| Parte | Tecnología |
|-------|------------|
| Backend | Java 21, Spring Boot 4.1 (Web MVC, Security, Data JPA, Validation, Mail, Actuator) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, componentes Radix (estilo shadcn/ui), TanStack Query, React Hook Form + Zod, react-big-calendar |
| Base de datos | MySQL 8.4 con migraciones Flyway (`src/main/resources/db/migration`) |
| Seguridad | JWT (jjwt), BCrypt, límite de intentos (Bucket4j) |
| Documentación de la API | OpenAPI / Swagger UI (springdoc) |
| Tests | Backend: JUnit 5, Mockito, AssertJ, MockMvc y Testcontainers (MySQL real en Docker). Frontend: Vitest y Testing Library; recorridos completos con Playwright |
| Despliegue | Docker, Docker Compose, Caddy (HTTPS automático) |
| Integración continua | GitHub Actions y Dependabot |

## Estructura

```
src/main/java/com/optima/api
├── common/        utilidades comunes: errores, seguridad (filtros JWT, negocio y límites), correo, validaciones
├── config/        configuración de Spring (seguridad, Jackson, OpenAPI, reloj)
└── modules/       un paquete por área: auth, business, catalog, client, appointment, user
    └── <módulo>/  controller → service → repository, model (entidades) y dto (entrada/salida)
src/main/resources
├── application.properties       configuración de producción (segura por defecto)
├── application-dev.properties   perfil dev para trabajar en local
└── db/migration, db/demo        migraciones de Flyway y datos de demostración (solo dev)

frontend/src
├── api/           cliente HTTP, tipos generados desde OpenAPI (schema.d.ts) y consultas (queries.ts)
├── auth/          sesión (token en sessionStorage), contexto y protección de rutas
├── components/    ui/ (botones, diálogos...), layout/ (menú y cabecera) y common/ (piezas reutilizables)
├── features/      una carpeta por pantalla: agenda, clients, catalog, team, settings, profile, auth, public
└── lib/           formato de fechas y dinero, y reglas de validación (las mismas que el backend)
deploy/Caddyfile   servidor web de producción (HTTPS, la web y /api)
```

## Arrancar en local

Hace falta **Docker** (y Java 21 si quieres arrancar la API fuera de Docker).

**Opción A, todo en Docker:**

```bash
docker compose up
```

**Opción B, solo MySQL en Docker y la API desde el IDE o la terminal:**

```bash
docker compose up -d mysqldb
DB_PORT=3307 SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

Y el frontend (hace falta **Node 22 o superior**), en otra terminal:

```bash
cd frontend
npm install
npm run dev
```

- Aplicación: http://localhost:5173 (las llamadas a `/api` las pasa Vite a la API)
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- Usuarios de demo (contraseña `12345678`): `admin@optima.com` (ADMIN del negocio *Demo* y EMPLOYEE de *Aura*) y `empleado@optima.com` (EMPLOYEE de *Demo*).

El perfil `dev` trae una clave JWT de desarrollo, la base de datos local, los datos de demo y Swagger activado. **Nunca se usa en producción**: la aplicación rechaza la clave de desarrollo fuera de ese perfil.

## Tests

```bash
./mvnw verify
```

Hay tests unitarios y de integración. Los de integración arrancan un MySQL real con Testcontainers, así que **Docker tiene que estar en marcha**. GitHub Actions los ejecuta en cada push y pull request.

En el frontend (`cd frontend`):

| Comando | Qué hace |
|---------|----------|
| `npm test` | Tests unitarios y de componentes (Vitest) |
| `npm run e2e` | Recorridos completos en un navegador (Playwright). Necesita la API arrancada con el perfil `dev`; la primera vez, `npx playwright install chromium` |
| `npm run lint`, `npm run typecheck`, `npm run format` | Lint (oxlint), comprobación de tipos y formato (Prettier) |
| `npm run gen:api` | Regenera `src/api/schema.d.ts` desde la API en marcha. Hay que hacerlo cada vez que cambie un endpoint o un DTO |

## Variables de entorno (producción)

Se definen en un fichero `.env` (plantilla comentada en [`.env-example`](.env-example)). El `.env` nunca se sube a Git.

| Variable | Obligatoria | Para qué |
|----------|-------------|----------|
| `JWT_SECRET` | sí | Clave para firmar las sesiones (`openssl rand -base64 64 \| tr -d '\n'`) |
| `DB_USERNAME`, `DB_PASSWORD` | sí | Usuario de la base de datos |
| `MYSQL_ROOT_PASSWORD` | sí (Docker) | Contraseña de root de MySQL |
| `DOMAIN`, `FRONTEND_URL` | sí | Dominio público y dirección del frontend (enlaces de los correos y CORS) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | para enviar correos | Proveedor SMTP |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | no | Dónde está MySQL (por defecto `localhost:3306/optima_db`) |
| `JWT_EXPIRATION` | no | Duración de la sesión en ms (por defecto 12 h) |
| `BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | para cobrar | Suscripción con Stripe. Con `BILLING_ENABLED=false` (por defecto) no se cobra ni se bloquea a nadie |
| `BACKUP_REMOTE`, `NOTIFY_URL` | recomendadas | Copia de seguridad fuera del servidor y avisos al móvil (ver [`deploy/README.md`](deploy/README.md)) |
| `SWAGGER_ENABLED` | no | `true` para activar Swagger (apagado por defecto) |

## Qué puede hacer cada rol

| Acción | ADMIN | EMPLOYEE |
|--------|:-----:|:--------:|
| Ver la agenda, las citas, los clientes, el catálogo y los horarios | ✅ | ✅ |
| Crear, editar, reagendar y cambiar el estado de cualquier cita | ✅ | ✅ |
| Cobrar una cita | ✅ | ✅ |
| Deshacer un cobro | ✅ | ❌ |
| Crear y editar clientes | ✅ | ✅ |
| Archivar y reactivar clientes | ✅ | ❌ |
| Ver al equipo (nombre y color) | ✅ | ✅ |
| Ver el email y el teléfono del equipo | ✅ | Solo los suyos |
| Catálogo, impuestos, cabinas, horario del negocio y bloqueos | ✅ | Solo ver |
| Empleados e invitaciones, sus horarios y ausencias | ✅ | Solo ver |
| Datos del negocio, desactivarlo y reactivarlo | ✅ | ❌ |
| Suscripción: pagar, tarjeta y facturas | ✅ | Solo ver su estado |

Los empleados gestionan todas las citas y clientes porque en un local pequeño quien está en recepción atiende a todos; a cambio, cada cobro queda registrado con quién lo hizo. Un negocio siempre conserva al menos un ADMIN.

## API

- La documentación completa está en Swagger UI (perfil `dev`) y en formato OpenAPI en `/v3/api-docs`, que se puede importar directamente en Postman.
- Los errores tienen siempre la misma forma: `{status, error, message, timestamp}`.
- Los listados paginados devuelven `{content: [...], page: {size, number, totalElements, totalPages}}`.
- Las fechas de las citas van **sin zona horaria** (`2030-01-07T10:00:00`) y son la hora local del negocio.

## Despliegue

En producción se usa [`docker-compose.prod.yml`](docker-compose.prod.yml) en un servidor con Docker: Caddy (HTTPS y el frontend), la API y MySQL, con solo los puertos 80 y 443 abiertos. Los pasos están en [`plan.md`](plan.md), fase 8.

- La imagen de la web ([`frontend/Dockerfile`](frontend/Dockerfile)) compila React con Node y lo sirve con Caddy ([`deploy/Caddyfile`](deploy/Caddyfile)), que además pide el certificado HTTPS y pasa `/api` a la API. Web y API comparten dominio, así que no hace falta CORS.
- Para probar la imagen de producción en local basta con `DOMAIN=localhost` en el `.env` (Caddy usa entonces un certificado propio).
- Guía completa del servidor (SSH, cortafuegos, correo, copias de seguridad, actualizaciones y avisos): [`deploy/README.md`](deploy/README.md).
