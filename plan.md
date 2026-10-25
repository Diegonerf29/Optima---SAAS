# Plan para dejar Optima listo para producción

> Creado: 25/10/2026 · Rama de trabajo: `develop`
>
> Este plan dice **en qué orden** hacer las cosas. El **detalle** de cada problema (qué pasa, por qué y cómo arreglarlo) está en `AUDITORIA.md`: busca su ID (A3, M1, B12…). Los IDs con prefijo **P** son nuevos y se explican en la sección 1.2.

## Cómo usar este plan

1. Se avanza **fase a fase y en orden**. Dentro de cada fase, paso a paso.
2. Regla para los arreglos: **primero un test que demuestre el fallo, luego el arreglo**. Si el test pasa después del cambio, el fallo está resuelto y no vuelve sin que nadie se entere.
3. Al terminar un paso:
   - marcar su casilla `[x]` aquí,
   - apuntar el cambio en `AUDITORIA.md` (sección 0 y columna **Estado**),
   - comprobar que compila (`./mvnw compile`) y, en cuanto haya tests, que pasan (`./mvnw verify`).
4. Un paso = un commit pequeño (o unos pocos). Si algo se rompe, es fácil saber qué cambio fue.
5. 👤 = lo tienes que hacer tú (fuera del código) o necesito que decidas algo.

---

## 1. Dónde estamos

### 1.1 Diagnóstico

| Parte | Estado | Comentario |
|-------|--------|------------|
| Backend (Spring Boot 3.4.1, Java 21, MySQL 8) | 🟡 Funciona, con fallos | Bien organizado por módulos y con buen aislamiento entre negocios. `AUDITORIA.md` tiene 38 hallazgos: 1 resuelto, 2 en parte y 35 pendientes (3 altos, 13 medios y 19 bajos) |
| Versión de Spring Boot | 🔴 Sin parches | La rama 3.x no publica versiones desde la 3.5.16 (25/06/2026); la 4.1 sí (4.1.2, 22/10/2026) |
| Tests | 🔴 No hay | `./mvnw test` → *"No tests to run"* |
| Frontend | 🔴 No hay | Se borró para empezar de cero (commit `2f8566a`) |
| Despliegue | 🔴 Solo modo desarrollo | `docker-compose.yml` usa `mvn spring-boot:run`, contraseñas fijas y puertos abiertos |
| Pagos | 🔴 No hay | Solo existe el indicador `isPaid` de cada cita |
| Documentación | 🔴 No hay README | Se eliminó por estar desactualizado |

Comprobado para este plan:
- El código no ha cambiado desde la auditoría, salvo la clave JWT (A2). Los hallazgos pendientes **siguen vigentes** (revisados de nuevo A3, M3 y la configuración).
- `./mvnw compile` funciona.

### 1.2 Lo que falta y no está en la auditoría

La auditoría busca fallos en el código que existe. Para que un SaaS funcione de verdad hacen falta además estas piezas:

| ID | Qué falta | Por qué importa |
|----|-----------|-----------------|
| P1 | Comprobación de salud (`/actuator/health`) | Docker y la monitorización necesitan saber si la API está viva |
| P2 | `Dockerfile` de producción, `docker-compose.prod.yml` y `Caddyfile` en el repositorio | Hoy no hay una forma reproducible de desplegar |
| P3 | Copias de seguridad de MySQL | Si se pierde el servidor, se pierden los datos de todos los negocios |
| P4 | Verificar el email al registrarse | Se pueden registrar negocios con emails falsos o de otra persona |
| P5 | Correo enviado con un Gmail personal | Gmail limita los envíos diarios y los correos acaban en spam. En producción: proveedor de correo transaccional con dominio propio (SPF/DKIM) |
| P6 | Avisos a los clientes (confirmación y recordatorio de cita) | Reducen las citas a las que nadie se presenta; hoy solo hay correos de bienvenida y de recuperación |
| P7 | Textos legales y RGPD | Aviso legal, privacidad, condiciones y contrato de encargado del tratamiento (Optima guarda datos de los clientes de cada negocio) |
| P8 | Logs de producción y apagado ordenado | Niveles de log adecuados y sin datos personales; `server.shutdown=graceful` para no cortar peticiones al reiniciar |
| P9 | `pom.xml` y propiedades con datos que no son del proyecto | `url`/`scm` apuntan a `mirsugogu/tfg-backend`; el `User-Agent` de geocodificación lleva un email personal |
| P10 | Dominio propio | Con `duckdns.org` el correo no llega bien y no da imagen de producto |

### 1.3 Para quién es Optima (y qué cambia por eso)

Optima es para **locales pequeños**: un solo local, pocos empleados y muchas veces **un único PC en recepción**. No es para cadenas ni empresas grandes. Esto simplifica muchas decisiones:

| Consecuencia | Qué hacemos |
|--------------|-------------|
| Quien está en recepción apunta, mueve y cobra citas de cualquier compañero | Los empleados gestionan **todas** las citas y clientes (ver D1). En vez de prohibir, se **registra quién hizo cada cobro** (M8) |
| El PC de recepción está encendido toda la jornada | La sesión dura una jornada (unas 12 h) en lugar de 4 h, y "cerrar sesión" anula el token de verdad (M5, paso 2.3) |
| Si en recepción se deja abierta la cuenta del dueño, cualquiera puede tocar la configuración | Cada local elige (D8): una cuenta EMPLOYEE "Recepción" compartida para ese PC o una cuenta por persona. El dueño usa su cuenta ADMIN desde su móvil o su ordenador |
| Casi todos los usuarios tienen un solo negocio | El frontend se salta la pantalla "elige negocio" cuando solo hay uno. El soporte de varios negocios por usuario se queda en el backend (ya existe y no estorba) |
| Pantalla grande en recepción, pero el dueño mira la agenda desde el móvil | Frontend pensado primero para escritorio, pero usable en móvil |
| Equipos de 1 a 5 personas | La vista principal de la agenda es **una columna por empleado** |
| Pocos usuarios a la vez | Basta un servidor pequeño. Nada de Kubernetes, balanceadores ni microservicios |
| Todos los empleados salen a Internet con la misma IP | El límite actual (10 inicios de sesión por minuto e IP) sobra para un local; se mantiene |

---

## 2. Decisiones

✅ = decidida. El resto lleva mi recomendación: si no dices otra cosa, sigo con ella.

| # | Pregunta | Afecta a | Decisión / recomendación |
|---|----------|----------|--------------------------|
| D1 ✅ | ¿Qué puede hacer un EMPLOYEE? | M7 | Hoy ya **no** puede tocar nada de configuración (catálogo, cabinas, horarios, impuestos, bloqueos, equipo, datos del negocio): todo eso es solo ADMIN ✔️. Sí puede gestionar **todas** las citas y clientes, y se queda así (recepción). Solo cambia: **desmarcar** una cita como pagada y archivar/reactivar clientes pasan a ser solo ADMIN; se guarda quién cobró y cuándo; y en la lista de empleados un EMPLOYEE ve nombre y color, pero no el email ni el teléfono de sus compañeros |
| D2 ✅ | Al añadir un empleado cuyo email ya existe | A3 | Invitación por email que la persona acepta. Mientras no acepte, el negocio no ve sus datos. Es un caso raro (alguien que ya usó Optima en otro local), así que se hace en su versión más sencilla |
| D3 | ¿Qué pasa con un negocio desactivado? | M4 | Nadie entra salvo su ADMIN, y solo para reactivarlo. Servirá también para "suscripción impagada" (fase 9) |
| D4 | Zona horaria | M14 | Columna `timezone` en cada negocio (por defecto `Europe/Madrid`) |
| D5 | ¿Los clientes finales reservarán solos por internet? | Frontend, API | Sí, pero **después** del lanzamiento: primero el panel de gestión |
| D6 | ¿Cómo cobra Optima a los negocios? | Fase 9 | **Un único plan** mensual por local, con 14 días de prueba gratis, con Stripe. Para locales pequeños no hacen falta niveles por número de empleados |
| D7 ✅ | Servidor y dominio | Fase 8 | **VPS de Hostinger** (KVM 1 para empezar, KVM 2 si se queda corto), en un centro de datos de la UE, con el dominio comprado allí mismo. Nunca los planes de "hosting web" compartido: no ejecutan Java ni Docker |
| D8 | ¿Cuenta "Recepción" compartida o una cuenta por persona? | Frontend, README | **Se decide más adelante**, viendo cómo lo usan los locales. El backend ya permite las dos formas (una cuenta de recepción es un empleado más) y el registro de quién cobró sirve en ambos casos. Si se elige "por persona", se puede añadir un cambio rápido de usuario en el PC de recepción |

---

## 3. Recomendación de frontend

**React + Vite + TypeScript**, en una carpeta `frontend/` dentro de este mismo repositorio.

Por qué:
1. **Ya lo conoces.** El frontend anterior era React 19 + Vite + Tailwind; aprovechas lo aprendido.
2. **Es una aplicación de gestión detrás de un login** (una SPA). No necesita SEO ni renderizado en servidor, así que no hace falta Next.js: el backend ya es Spring Boot y otro servidor más solo complica el despliegue.
3. **Despliegue sencillo.** `npm run build` genera ficheros estáticos (`dist/`) que Caddy sirve directamente.
4. **TypeScript** avisa al compilar si usas mal un dato de la API (un campo que no existe, un número que llega como texto). Con unos 40 DTOs en el backend ahorra muchos errores, y los tipos se pueden **generar solos** desde Swagger (`/v3/api-docs`) con `openapi-typescript`.

Librerías (cada una resuelve un problema concreto):

| Necesidad | Librería | Por qué esta |
|-----------|----------|--------------|
| Estilos | Tailwind CSS 4 | Ya la usabas |
| Componentes (botones, diálogos, tablas, menús) | shadcn/ui | El código de cada componente se copia al proyecto y se puede modificar; son accesibles |
| Navegación | React Router | La estándar |
| Llamadas a la API | `fetch` + TanStack Query | Guarda en caché, recarga y gestiona "cargando / error" sin repetirlo en cada pantalla |
| Formularios | React Hook Form + Zod | Validar en el navegador con las mismas reglas que el backend |
| Agenda | react-big-calendar | Es la pantalla principal. Es gratuita (licencia MIT) e incluye la vista **una columna por empleado**, la más útil en un local pequeño (sección 1.3). FullCalendar es más vistosa, pero esa vista es de pago |
| Fechas | date-fns | Sencilla |
| Tests | Vitest + Testing Library; Playwright para 2-3 recorridos completos | Mismo ecosistema que Vite |

- **Alternativa razonable:** Angular (todo incluido y muy estructurado). Solo si lo dominas mejor que React.
- **Móvil:** más adelante, la misma web como PWA (se instala desde el navegador) o con Capacitor (ya lo usaste) si hace falta publicarla en Google Play.
- **Seguridad** (de `AUDITORIA.md`, sección 6): token en memoria + `sessionStorage` (no en `localStorage`), nunca `dangerouslySetInnerHTML`, cerrar sesión ante un 401 y la URL de la API en `VITE_API_URL`.

---

## 4. Cómo quedará en producción

```
            Internet (solo HTTPS)
                     │
              ┌──────▼──────┐
              │    Caddy    │  certificado HTTPS automático
              │             │  sirve el frontend (frontend/dist)
              └──────┬──────┘  /api/* → api:8080
                     │  red interna de Docker
              ┌──────▼──────┐        ┌──────────────┐
              │     api     │───────►│    MySQL     │  sin puertos abiertos a Internet
              │ (java -jar) │        │  + copia     │  copia diaria guardada
              └─────────────┘        │    diaria    │  fuera del servidor
                                     └──────────────┘
Servicios externos: proveedor de correo (P5) · Stripe (fase 9) · aviso de caídas (fase 8)
```

---

## 5. Plan por fases

### Fase 0 — Urgente y manual 👤 (hoy, ~1 hora)

No es código, pero sin esto el resto no protege nada.

- [ ] 0.1 Rotar la clave JWT de producción: `openssl rand -base64 64 | tr -d '\n'` y ponerla en el `.env` del servidor (A1)
- [ ] 0.2 Revocar la contraseña de aplicación de Gmail que está en el historial y crear otra (A1)
- [ ] 0.3 Cambiar la contraseña del admin de demo en el servidor publicado (M13)
- [ ] 0.4 En GitHub, *Settings → Code security*: activar *Secret scanning* y *Dependabot alerts* (A1, M11)
- [x] 0.5 Decidir D1, D2 y D7 (sección 2). D3–D6 siguen con mi recomendación mientras no digas otra cosa; D8 se decide más adelante

### Fase 1 — Cimientos: versión con soporte, tests e integración continua

Objetivo: trabajar sobre una versión que recibe parches y saber al momento si un cambio rompe algo.

- [x] 1.1 Subir Spring Boot a 3.5.16. Es el paso intermedio que recomienda Spring: con la 3.5 el compilador avisa de todo lo que desaparece en la 4.x (M11)
- [x] 1.2 Contraseñas con `@Size(min = 8, max = 72)` y al menos una letra y un número. Va antes del salto a 4.x porque las versiones nuevas de Spring Security dan error con más de 72 bytes (M11, M13)
- [x] 1.3 Añadir `spring-boot-starter-test` y `spring-security-test` y los primeros tests unitarios: `AppointmentValidator` y `TenantGuardFilter` (A4)
- [x] 1.4 Migrar a Spring Boot 4.1.x: Jackson 3, springdoc 3.x, nombres nuevos de algunos *starters*. Los tests del paso 1.3 dicen si algo se ha roto (M11)
- [x] 1.5 GitHub Actions: `./mvnw -B verify` en cada push y pull request a `develop` (B18)
- [x] 1.6 `.github/dependabot.yml` para que avise de versiones nuevas (M11)

**Hecho cuando:** la app arranca con Spring Boot 4.1 y `./mvnw verify` pasa en local y en GitHub.

### Fase 2 — Seguridad

- [x] 2.1 Alta de empleado con email existente → invitación que se acepta (A3, D2)
- [x] 2.2 Límite de intentos: IP real solo si viene del proxy, sin vaciar todos los contadores, y límite por email en el login (M3)
- [x] 2.3 Revocar sesiones: `token_version` en `users`, `POST /api/auth/logout` y pedir la contraseña para cambiar el email. Con esto ya se puede alargar la sesión a una jornada (~12 h) para el PC de recepción (M5, sección 1.3)
- [x] 2.4 "Olvidé mi contraseña": correo en segundo plano (`@Async`), anular los enlaces anteriores y borrar los caducados (M6, B16)
- [x] 2.5 Negocio o usuario desactivado: comprobarlo en `TenantGuardFilter` y permitir la reactivación (M4, D3)
- [x] 2.6 Eliminar `POST /api/businesses`, que crea negocios sin dueño (M9)
- [x] 2.7 Verificar el email al registrarse (P4)
- [x] 2.8 Mensajes de error genéricos para `IllegalArgumentException` y límites de tamaño en textos y listas (B3, B4)

**Hecho cuando:** cada arreglo tiene su test y ningún hallazgo alto queda pendiente salvo A1 (que es manual, fase 0).

### Fase 3 — Citas y agenda (el corazón del producto)

- [x] 3.1 Tests de `createAppointment` y `updateAppointment` y, con ellos en verde, extraer el código repetido: cargar servicios en una sola consulta, quitar duplicados de `serviceIds`, un único control de conflictos (M12). Va primero porque los pasos 3.2 y 4.2 tocan este mismo código
- [x] 3.2 Doble reserva bajo concurrencia: `READ_COMMITTED` y test con dos hilos (M1)
- [x] 3.3 Intervalo de 45 minutos: la misma regla en disponibilidad y en validación, y test "todo hueco ofrecido se puede reservar" (M2)
- [x] 3.4 Fechas con la zona horaria del negocio (M14, D4)
- [x] 3.5 Sin huecos ya pasados; no mover citas al pasado ni editar las que están `IN_PROGRESS` (B12)
- [x] 3.6 Bloqueos de la BD → 409 en lugar de 500; búsqueda de clientes escapando `%` y `_` (B20)
- [x] 3.7 Orden por defecto en los listados paginados (B17)

### Fase 4 — Reglas de negocio: roles y cobros

- [x] 4.1 Permisos según D1: desmarcar pagos y archivar/reactivar clientes solo ADMIN; un EMPLOYEE no ve el email ni el teléfono de sus compañeros (M7)
- [x] 4.2 Cobro de citas: no marcar como pagadas las canceladas o no presentadas, guardar quién y cuándo cobró, no recalcular precios al editar y devolver el `total` calculado en el servidor (M8)
- [x] 4.3 Un negocio no puede quedarse sin ADMIN (B13); no archivar impuestos que usan servicios activos (B11)
- [x] 4.4 (Opcional) Correo de confirmación de cita al cliente y recordatorio el día antes (P6)

### Fase 5 — Backend preparado para producción

- [ ] 5.1 Perfiles: `dev` para local y valores seguros por defecto para producción. Credenciales de la BD por variables de entorno; Swagger y `show-sql` apagados fuera de `dev` (M10, B1, B2)
- [x] 5.2 (hecho en la fase 2, antes de los cambios de esquema) Flyway: el esquema actual pasa a `V1__esquema_inicial.sql`, los datos de demo van aparte (solo `dev`) y `ddl-auto=validate` (B15, B10)
- [ ] 5.3 Actuator con solo `/actuator/health` público (P1)
- [ ] 5.4 `Dockerfile` en dos etapas: compila con Maven y ejecuta `java -jar` con un usuario sin privilegios (M10, P2)
- [ ] 5.5 `docker-compose.yml` solo para desarrollo y `docker-compose.prod.yml` sin puertos de MySQL abiertos, usuario de BD con permisos mínimos y `TZ` (M10, M3)
- [ ] 5.6 Logs sin datos personales, geocodificación fuera de las transacciones, apagado ordenado y cabeceras del proxy (`server.forward-headers-strategy`) (B19, P8)
- [ ] 5.7 Quitar el registro doble de los filtros de seguridad (B14)
- [ ] 5.8 Correo configurable por variables (host, puerto, usuario) para poder usar cualquier proveedor (P5)
- [ ] 5.9 README nuevo (qué es, cómo arrancar en local, variables de entorno, cómo desplegar, tabla rol × acción); arreglar `pom.xml` y la colección de Postman (B18, P9)

### Fase 6 — Limpieza de código

Hazla **antes del frontend**: así la API ya no cambia mientras se construyen las pantallas.

- [x] 6.1 Clase común `ErrorWriter` para los errores JSON de los filtros (B5)
- [ ] 6.2 `NotFoundException` en lugar de los "No se encontró…" repetidos (B6)
- [ ] 6.3 Unificar los DTOs `Create*`/`Update*` idénticos y guardar las regex en `ValidationPatterns` (B7)
- [ ] 6.4 Quitar la lógica repetida de ausencias y horarios (B8)
- [ ] 6.5 Nombres que digan la verdad: `{membershipId}`, `JwtUtil` → `JwtService` (B9)
- [ ] 6.6 Estados y roles como constantes en lugar de texto suelto (B10)

### Fase 7 — Frontend

Antes de empezar: fases 2 a 6 terminadas y Swagger al día.

- [ ] 7.1 Crear `frontend/` (Vite + React + TypeScript), Tailwind, shadcn/ui, ESLint y Prettier; `VITE_API_URL`; tipos generados desde `/v3/api-docs`
- [ ] 7.2 Base: cliente HTTP que añade el token, manejo de 401/403, rutas protegidas por rol, estructura (menú lateral + cabecera) y páginas de error
- [ ] 7.3 Acceso: login, selección de negocio (se salta si solo hay uno), registro de negocio, verificación de email, "olvidé mi contraseña" y restablecerla
- [ ] 7.4 Agenda: vista de día con una columna por empleado y vista de semana, crear cita con los huecos libres, editar, cambiar estado y cobrar
- [ ] 7.5 Clientes: lista con búsqueda y paginación, ficha con su historial de citas
- [ ] 7.6 Catálogo: categorías, servicios e impuestos
- [ ] 7.7 Equipo: empleados e invitaciones, horarios y ausencias
- [ ] 7.8 Configuración del negocio: datos, horario de apertura, cabinas y bloqueos
- [ ] 7.9 Perfil: datos personales, cambiar contraseña y cerrar sesión
- [ ] 7.10 Inicio: citas de hoy y pendientes de cobro (seguramente necesite un endpoint de resumen en el backend)
- [ ] 7.11 Calidad: pensado para escritorio y usable en móvil, accesibilidad básica, tests de los formularios clave, 2-3 recorridos con Playwright y el frontend añadido a GitHub Actions
- [ ] 7.12 Páginas públicas: portada sencilla, precios, aviso legal y privacidad (P7)

### Fase 8 — Despliegue

- [ ] 8.1 👤 Contratar un VPS de Hostinger (KVM 1, centro de datos en la UE, plantilla Ubuntu con Docker) y comprar el dominio (D7, P10)
- [ ] 8.2 `Caddyfile`: HTTPS, servir `frontend/dist`, redirigir `/api` y cabeceras de seguridad (`Content-Security-Policy`, HSTS, `Referrer-Policy`)
- [ ] 8.3 Servidor: Docker, cortafuegos (solo puertos 22, 80 y 443), SSH solo con clave y `.env` de producción
- [ ] 8.4 👤 Proveedor de correo transaccional con plan gratuito (por ejemplo Brevo o Resend) conectado al dominio con los registros SPF, DKIM y DMARC (P5)
- [ ] 8.5 Copias de seguridad: `mysqldump` diario guardado **fuera de Hostinger** (las copias del propio proveedor no sirven si se pierde la cuenta), y **probar a restaurar una** (P3)
- [ ] 8.6 Publicar versiones: GitHub Actions construye la imagen Docker; en el servidor, `docker compose pull && docker compose up -d`
- [ ] 8.7 Monitorización mínima: un servicio gratuito que avise si `/actuator/health` deja de responder, y aviso de disco lleno
- [ ] 8.8 Entorno de demo separado de producción, con datos que se restauran cada noche (M13)

### Fase 9 — Pagos (Stripe)

Hay dos tipos de pago y conviene no mezclarlos:
1. **Suscripción del SaaS**: el negocio paga a Optima. Es lo necesario para vender el producto. ← esta fase
2. **Cobro de citas por internet**: el cliente final paga al negocio. Es opcional, más complejo (Stripe Connect) y solo tiene sentido con la reserva online (D5).

Con Stripe Checkout y el Customer Portal, **los datos de la tarjeta nunca pasan por nuestro servidor**: los recoge Stripe en su propia página.

- [ ] 9.1 👤 Cuenta de Stripe, productos y precios (en modo de pruebas)
- [ ] 9.2 Migración Flyway: `stripe_customer_id`, `subscription_status`, `plan` y `trial_ends_at` en `businesses`
- [ ] 9.3 Al registrarse: 14 días de prueba gratis, sin tarjeta
- [ ] 9.4 `POST /api/businesses/{id}/billing/checkout`: crea una sesión de Stripe Checkout y devuelve su URL
- [ ] 9.5 `POST /api/businesses/{id}/billing/portal`: abre el Customer Portal (cambiar tarjeta o plan, cancelar, ver facturas)
- [ ] 9.6 `POST /api/webhooks/stripe`: público pero **comprobando la firma** de Stripe; actualiza `subscription_status` y guarda los eventos ya procesados para no aplicarlos dos veces
- [ ] 9.7 Aplicar el estado: suscripción caducada → negocio bloqueado salvo la pantalla de pago (reutiliza M4). Con un único plan (D6) no hay límites que controlar
- [ ] 9.8 Frontend: página de precios, pantalla "Suscripción" en configuración y aviso cuando la prueba está a punto de acabar
- [ ] 9.9 Probar con las tarjetas de prueba y Stripe CLI: pago correcto, rechazado, cancelación y renovación
- [ ] 9.10 👤 Facturas e IVA: revisarlo con una gestoría (Stripe puede emitir las facturas y calcular impuestos con Stripe Tax)

### Fase 10 — Lanzamiento

- [ ] 10.1 👤 Textos legales: aviso legal, privacidad, condiciones de uso y contrato de encargado del tratamiento (P7)
- [ ] 10.2 RGPD en la app: exportar y borrar de verdad los datos de un cliente y de un negocio que se da de baja (P7)
- [ ] 10.3 Repaso de `AUDITORIA.md`: ningún hallazgo alto o medio pendiente
- [ ] 10.4 Prueba completa en producción: registro, configurar negocio, citas, suscripción y recuperar contraseña
- [ ] 10.5 Restaurar una copia de seguridad en un entorno aparte y comprobar que funciona
- [ ] 10.6 👤 Pasar Stripe a modo real

---

## 6. Después del lanzamiento (ideas, no obligatorias)

- Reserva online para clientes finales en una página pública del negocio (`/reservar/{slug}`) (D5)
- Recordatorios por SMS o WhatsApp (P6)
- Pago por adelantado de citas con Stripe Connect
- Informes: facturación por mes, por empleado y por servicio
- App en Google Play con Capacitor
