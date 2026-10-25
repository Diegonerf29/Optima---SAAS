# Optima

Agenda y gestión de citas para **locales pequeños** (peluquerías, centros de estética, barberías...): un solo local, pocos empleados y muchas veces un único PC en recepción.

Es un SaaS **multi-tenant**: muchos negocios comparten la misma aplicación y la misma base de datos, pero cada uno solo ve sus datos.

> Estado del proyecto y siguientes pasos: [`plan.md`](plan.md). Auditoría de seguridad y calidad, con el registro de cada corrección: [`AUDITORIA.md`](AUDITORIA.md).

## Qué hace

- **Agenda**: citas por empleado y cabina, con huecos libres calculados según el horario del negocio (con turno partido), el de cada empleado, ausencias, bloqueos y citas ya reservadas.
- **Clientes**, **catálogo** (servicios, categorías e impuestos), **equipo** (empleados, horarios, ausencias) y **configuración del negocio** (horario, cabinas, zona horaria).
- **Cobros**: quién cobró, cuándo y cómo (efectivo, tarjeta, Bizum); total con IVA calculado en el servidor.
- **Emails a clientes**: confirmación, cambios, cancelación y recordatorio el día antes.
- **Cuentas**: registro de negocio, confirmación del email, invitaciones de empleados, recuperación de contraseña y cierre de sesión en todos los dispositivos.

## Tecnologías

| Parte | Tecnología |
|-------|------------|
| Backend | Java 21, Spring Boot 4.1 (Web MVC, Security, Data JPA, Validation, Mail, Actuator) |
| Base de datos | MySQL 8.4 con migraciones Flyway (`src/main/resources/db/migration`) |
| Seguridad | JWT (jjwt), BCrypt, límite de intentos (Bucket4j) |
| Documentación de la API | OpenAPI / Swagger UI (springdoc) |
| Tests | JUnit 5, Mockito, AssertJ, MockMvc y Testcontainers (MySQL real en Docker) |
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

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- Usuarios de demo (contraseña `12345678`): `admin@optima.com` (ADMIN del negocio *Demo* y EMPLOYEE de *Aura*) y `empleado@optima.com` (EMPLOYEE de *Demo*).

El perfil `dev` trae una clave JWT de desarrollo, la base de datos local, los datos de demo y Swagger activado. **Nunca se usa en producción**: la aplicación rechaza la clave de desarrollo fuera de ese perfil.

## Tests

```bash
./mvnw verify
```

Hay tests unitarios y de integración. Los de integración arrancan un MySQL real con Testcontainers, así que **Docker tiene que estar en marcha**. GitHub Actions los ejecuta en cada push y pull request.

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

Los empleados gestionan todas las citas y clientes porque en un local pequeño quien está en recepción atiende a todos; a cambio, cada cobro queda registrado con quién lo hizo. Un negocio siempre conserva al menos un ADMIN.

## API

- La documentación completa está en Swagger UI (perfil `dev`) y en formato OpenAPI en `/v3/api-docs`, que se puede importar directamente en Postman.
- Los errores tienen siempre la misma forma: `{status, error, message, timestamp}`.
- Los listados paginados devuelven `{content: [...], page: {size, number, totalElements, totalPages}}`.
- Las fechas de las citas van **sin zona horaria** (`2030-01-07T10:00:00`) y son la hora local del negocio.

## Despliegue

En producción se usa [`docker-compose.prod.yml`](docker-compose.prod.yml) en un servidor con Docker: Caddy (HTTPS y el frontend), la API y MySQL, con solo los puertos 80 y 443 abiertos. Los pasos están en [`plan.md`](plan.md), fase 8.
