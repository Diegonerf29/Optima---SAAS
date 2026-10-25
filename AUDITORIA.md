# Auditoría del proyecto Optima

> Fecha: 25/10/2026 · Rama auditada: `claude/laughing-knuth-u9vz3w` (commit `2f8566a`)
> Alcance: backend Spring Boot completo, esquema SQL, Docker, configuración, documentación e historial de Git.
> Última actualización: 25/10/2026. Las correcciones aplicadas después de la auditoría se apuntan en la sección 0.

---

## 0. Registro de correcciones

Cada cambio que se aplica al código se apunta aquí y en la columna **Estado** de la tabla resumen (sección 2). Los números de línea del resto del informe se refieren al commit auditado (`2f8566a`).

| Fecha | Commit | Cambio | Hallazgos afectados |
|-------|--------|--------|---------------------|
| 25/10/2026 | `a641114` | La clave JWT ya no tiene valor por defecto. La clave de desarrollo pasa a `application-dev.properties` y `JwtUtil` la rechaza fuera del perfil `dev` | A2 ✅ |
| 25/10/2026 | `e208a28` | Se elimina `README.md` (daba por hechas cosas falsas y publicaba la URL de producción con credenciales de demo) | M10, M13 🟡, B18 🟡 |
| 25/10/2026 | `ac38ebf` | Todo el trabajo pasa a `develop`. Se sube un `CLAUDE.md` compartido para que todas las sesiones de IA trabajen en esa rama y apunten aquí sus cambios | — |
| 25/10/2026 | `712c5db` | Nuevo `plan.md`: ordena en fases todos los hallazgos de este informe, añade lo que falta para producción (P1–P10), el frontend y los pagos. `CLAUDE.md` pide seguirlo | — |

**Estados:** ⏳ Pendiente · 🟡 En parte · ✅ Resuelto

---

## 1. Resumen ejecutivo

Optima es un backend REST **multi-tenant** (varios negocios comparten la misma base de datos) para gestionar citas. Está bien organizado por módulos y tiene buenas ideas de seguridad: el filtro `TenantGuardFilter` impide que un usuario entre en recursos de otro negocio, todas las consultas filtran por `businessId`, las contraseñas usan BCrypt y el token de recuperación se guarda como hash.

Aun así hay **4 problemas de gravedad alta** que conviene arreglar cuanto antes:

1. **Secretos reales en el historial de Git** (clave JWT de producción y contraseña de aplicación de Gmail).
2. **Clave JWT con un valor por defecto público**: si en producción falta la variable `JWT_SECRET`, cualquiera puede fabricar tokens válidos. ✅ *Resuelto en `a641114`.*
3. **Fuga de datos entre negocios**: al dar de alta un empleado con un email que ya existe, el sistema reutiliza esa cuenta y devuelve su nombre y teléfono a un negocio ajeno.
4. **No hay ni un solo test automatizado.**

Además hay 14 problemas de gravedad media (por ejemplo, **doble reserva posible bajo concurrencia** y un **bug con el intervalo de 45 minutos** que hace fallar la mayoría de reservas) y 20 de gravedad baja, casi todos de duplicación de código y estructura.

| Gravedad | Nº de hallazgos |
|----------|-----------------|
| 🔴 Alta  | 4  |
| 🟠 Media | 14 |
| 🟢 Baja  | 20 |

### Cómo se ha hecho la auditoría

1. Lectura completa de los 150 ficheros del repositorio (controladores, servicios, repositorios, entidades, DTOs, filtros de seguridad, `schema_v20.sql`, `docker-compose.yml`, `README.md`, colección Postman).
2. Revisión del historial de Git en busca de secretos.
3. Compilación en una copia aparte (`mvn test` → `BUILD SUCCESS`, *"No tests to run"*) y listado de versiones reales de dependencias (`mvn dependency:list`).
4. **No** se ha hecho ninguna prueba contra la URL de producción. Los escenarios de ataque se describen razonando sobre el código.

### Criterio de gravedad

- **🔴 Alta**: se puede explotar a distancia o compromete datos de otros usuarios/negocios, o impide garantizar la calidad del proyecto.
- **🟠 Media**: bug funcional importante, fallo de seguridad que necesita condiciones concretas, o riesgo grande si se despliega tal cual.
- **🟢 Baja**: mantenimiento, duplicación, estructura, robustez o documentación.

---

## 2. Tabla resumen

| ID | Problema | Área | Gravedad | Archivo principal | Estado |
|----|----------|------|----------|-------------------|--------|
| A1 | Secretos reales en el historial de Git | Configuración | 🔴 Alta | `.env-example`, `application.properties` (commits < `16335ce`) | ⏳ Pendiente |
| A2 | Clave JWT con valor por defecto público | Autenticación | 🔴 Alta | `src/main/resources/application.properties:23` | ✅ Resuelto |
| A3 | Alta de empleado reutiliza cuentas ajenas y filtra sus datos | Permisos / multi-tenant | 🔴 Alta | `modules/user/service/UserService.java:57` | ⏳ Pendiente |
| A4 | No existe ningún test automatizado | Tests | 🔴 Alta | `pom.xml`, falta `src/test` | ⏳ Pendiente |
| M1 | Doble reserva posible con peticiones simultáneas | API / BD | 🟠 Media | `modules/appointment/service/AppointmentService.java:67` | ⏳ Pendiente |
| M2 | Con intervalo de 45 min la disponibilidad ofrece huecos que luego se rechazan | API | 🟠 Media | `AvailabilityService.java:325` / `AppointmentValidator.java:182` | ⏳ Pendiente |
| M3 | El límite de intentos se puede saltar con `X-Forwarded-For` | Autenticación | 🟠 Media | `common/security/RateLimitFilter.java:102` | ⏳ Pendiente |
| M4 | Negocio desactivado: los tokens siguen funcionando y no se puede reactivar | Permisos | 🟠 Media | `common/security/TenantGuardFilter.java:72` | ⏳ Pendiente |
| M5 | Los tokens no se invalidan al cambiar contraseña; email cambiable sin contraseña | Autenticación | 🟠 Media | `modules/user/service/UserService.java:163` | ⏳ Pendiente |
| M6 | "Olvidé mi contraseña" permite enumerar cuentas por tiempo y deja tokens viejos válidos | Autenticación | 🟠 Media | `modules/auth/service/PasswordResetService.java:53` | ⏳ Pendiente |
| M7 | Un empleado puede modificar cualquier cita, pagos y clientes | Permisos | 🟠 Media | `AppointmentController.java:72`, `ClientController.java:58` | ⏳ Pendiente |
| M8 | El estado de pago no tiene control ni registro y editar recalcula precios | Pagos | 🟠 Media | `AppointmentService.java:550` | ⏳ Pendiente |
| M9 | `POST /api/businesses` crea negocios huérfanos | API / permisos | 🟠 Media | `modules/business/controller/BusinessController.java:25` | ⏳ Pendiente |
| M10 | Base de datos y Docker con configuración insegura para producción | Configuración / BD | 🟠 Media | `docker-compose.yml`, `docs/schema_v20.sql:902` | ⏳ Pendiente |
| M11 | Dependencias desactualizadas con vulnerabilidades conocidas | Dependencias | 🟠 Media | `pom.xml:8` | ⏳ Pendiente |
| M12 | `AppointmentService` duplica ~120 líneas entre crear y editar | Código repetido | 🟠 Media | `AppointmentService.java:117` y `:432` | ⏳ Pendiente |
| M13 | Credenciales de demo publicadas junto a la URL de producción | Configuración | 🟠 Media | `README.md:7`, `README.md:139` | 🟡 En parte |
| M14 | Fechas comparadas con el reloj del servidor (UTC) y no con la hora del negocio | API | 🟠 Media | `CreateAppointmentRequest.java:29` | ⏳ Pendiente |
| B1 | Swagger público y activado por defecto | Configuración | 🟢 Baja | `application.properties:50` | ⏳ Pendiente |
| B2 | `show-sql=true` por defecto | Configuración | 🟢 Baja | `application.properties:13` | ⏳ Pendiente |
| B3 | Se devuelven al cliente mensajes internos de `IllegalArgumentException` | API | 🟢 Baja | `GlobalExceptionHandler.java:48` | ⏳ Pendiente |
| B4 | Faltan límites de tamaño en textos y listas | API | 🟢 Baja | varios DTOs | ⏳ Pendiente |
| B5 | Código que escribe errores JSON repetido en 4 sitios | Código repetido | 🟢 Baja | `SecurityConfig.java:57`, filtros | ⏳ Pendiente |
| B6 | "No se encontró…" y `findOrThrow` repetidos en todos los servicios | Código repetido | 🟢 Baja | todos los `*Service.java` | ⏳ Pendiente |
| B7 | DTOs `Create*`/`Update*` idénticos y expresiones regulares copiadas | Código repetido | 🟢 Baja | `dto/request/*` | ⏳ Pendiente |
| B8 | Lógica duplicada en ausencias y horarios de empleados | Código repetido | 🟢 Baja | `EmployeeAbsenceService.java:48` | ⏳ Pendiente |
| B9 | Nombres engañosos (`{userId}` es un id de membresía, etc.) | Estructura | 🟢 Baja | `EmployeeAbsenceController.java:19` | ⏳ Pendiente |
| B10 | Estados y roles como texto suelto; IDs fijos en el SQL | Estructura / BD | 🟢 Baja | `schema_v20.sql:185` | ⏳ Pendiente |
| B11 | Un impuesto se puede archivar aunque lo usen servicios activos | API | 🟢 Baja | `TaxService.java:88` | ⏳ Pendiente |
| B12 | Huecos pasados en disponibilidad y edición de citas hacia el pasado | API | 🟢 Baja | `UpdateAppointmentRequest.java:23` | ⏳ Pendiente |
| B13 | Un negocio puede quedarse sin ningún administrador | Permisos | 🟢 Baja | `UserService.java:98` | ⏳ Pendiente |
| B14 | Filtros de seguridad registrados dos veces | Estructura | 🟢 Baja | `common/security/*Filter.java` | ⏳ Pendiente |
| B15 | Sin migraciones de BD ni validación del esquema | Base de datos | 🟢 Baja | `application.properties:12`, `schema_v20.sql` | ⏳ Pendiente |
| B16 | La tabla `password_resets` crece sin límite | Base de datos | 🟢 Baja | `PasswordResetService.java` | ⏳ Pendiente |
| B17 | Listados paginados sin orden por defecto | API | 🟢 Baja | repositorios `findByBusinessId…` | ⏳ Pendiente |
| B18 | Documentación desactualizada y sin integración continua | Documentación | 🟢 Baja | `README.md:121`, `pom.xml:16` | 🟡 En parte |
| B19 | Llamadas externas dentro de transacciones y datos personales en logs | API | 🟢 Baja | `BusinessService.java:69`, `GeocodingService.java:91` | ⏳ Pendiente |
| B20 | Búsqueda de clientes sin escapar `%` y `_`; bloqueos de BD → 500 | API | 🟢 Baja | `ClientRepository.java:30` | ⏳ Pendiente |
| — | Frontend no presente en el repositorio | Frontend | Informativo | `README.md:121` | — |
| — | Pagos: solo existe un indicador `isPaid` | Pagos | Informativo | ver M8 | — |

---

## 3. Hallazgos de gravedad ALTA 🔴

### A1. Secretos reales en el historial de Git

- **Área:** Configuración y dependencias
- **Archivos:** `.env-example` y `src/main/resources/application.properties` en las versiones anteriores al commit `16335ce` (por ejemplo, `git show 16335ce^:.env-example`).
- **Gravedad:** 🔴 Alta

**¿Qué pasa?**
El commit `16335ce` cambió los secretos por valores de desarrollo, pero el propio mensaje del commit lo reconoce: *"los secretos reales siguen en el historial; deben rotarse en Google/AWS"*. En versiones anteriores de `.env-example` estaban:

- la **clave JWT** que, según la documentación de entonces, era la misma que usaba la versión desplegada, y
- el usuario y la **contraseña de aplicación de Gmail** del proyecto.

(En este informe no se copian los valores a propósito.)

**¿Por qué es un problema?**
Git guarda todas las versiones. Cualquiera que clone el repositorio puede ver esos valores con `git log -p`. Si el repositorio es o ha sido público, hay que darlos por comprometidos:
- Con la clave JWT se pueden **fabricar tokens** para cualquier usuario (ver A2 para el ataque completo).
- Con la contraseña de Gmail se pueden **enviar correos en nombre de Optima** (por ejemplo, phishing con enlaces falsos de "restablece tu contraseña").

**Cómo arreglarlo (paso a paso):**
1. **Rotar** (lo más importante, aunque se limpie el historial):
   - Generar una clave JWT nueva: `openssl rand -base64 64` y ponerla en el `.env` del servidor de AWS. Al cambiarla se cierran todas las sesiones, es lo esperado.
   - Revocar la contraseña de aplicación en la cuenta de Google (*Seguridad → Contraseñas de aplicaciones*) y crear otra.
2. **Opcional:** limpiar el historial con `git filter-repo` o BFG. Reescribe la historia, así que hay que avisar a quien tenga clones. Sin la rotación del paso 1 esto no sirve de nada.
3. Activar el *secret scanning* de GitHub en el repositorio para que avise si vuelve a pasar.
4. Seguir sin subir el `.env` (el `.gitignore` ya lo excluye ✔️).

---

### A2. Clave JWT con valor por defecto público ✅

- **Área:** Autenticación
- **Archivos:** `src/main/resources/application.properties:23`, `.env-example:4`, `src/main/java/com/optima/api/common/utils/JwtUtil.java:33-40`
- **Gravedad:** 🔴 Alta
- **Estado:** ✅ Resuelto en `a641114` (25/10/2026). Ver "Corrección aplicada" al final de este apartado.

**¿Qué pasa?**
```properties
app.jwt.secret=${JWT_SECRET:dev-secret-solo-para-local-no-usar-en-produccion-0123456789}
```
Si la variable `JWT_SECRET` no existe, Spring usa el texto que va después de los dos puntos. Ese texto está publicado en el repositorio. Además, `.env-example` trae el mismo valor y el README dice que *"no hace falta modificar nada"*, así que es fácil acabar desplegando con esa clave. `JwtUtil.init()` solo comprueba que la clave tenga 32 caracteres o más, y esta los tiene.

**¿Por qué es un problema? (escenario)**
Con la clave conocida, un atacante firma su propio token:
1. Crea un token con `userId = 1` (los IDs son correlativos y fáciles de adivinar).
2. Llama a `PUT /api/me` con ese token y cambia el email de la víctima por el suyo (no se pide la contraseña, ver M5).
3. Llama a `POST /api/auth/forgot-password` con su email, recibe el enlace y pone una contraseña nueva.
4. Ya tiene la cuenta de la víctima de forma permanente.

También puede fabricar tokens de negocio (`businessId`, `role=ADMIN`): `TenantGuardFilter` comprueba en la BD que esa membresía exista, pero con IDs correlativos y solo dos roles es trivial acertar.

**Cómo arreglarlo:**
1. Quitar el valor por defecto para que la aplicación **no arranque** sin clave:
   ```properties
   app.jwt.secret=${JWT_SECRET}
   ```
2. Para que en local siga siendo cómodo, crear `src/main/resources/application-dev.properties` (perfil de desarrollo) con la clave de pruebas y arrancar en local con `SPRING_PROFILES_ACTIVE=dev`.
3. En `JwtUtil.init()` rechazar explícitamente la clave de desarrollo cuando no estemos en el perfil `dev`:
   ```java
   if (secretString.startsWith("dev-secret")) {
       throw new IllegalStateException("No se puede usar la clave JWT de desarrollo fuera del perfil dev");
   }
   ```
4. Cambiar el README: en producción **sí** hay que definir `JWT_SECRET`.

**Corrección aplicada (`a641114`):**
1. `application.properties`: `app.jwt.secret=${JWT_SECRET}`, sin valor por defecto. Si falta la variable, Spring no arranca (`Could not resolve placeholder 'JWT_SECRET'`).
2. Nuevo `src/main/resources/application-dev.properties` con la clave de desarrollo. Solo se carga con `SPRING_PROFILES_ACTIVE=dev`.
3. `JwtUtil.init()`: recibe `Environment` por constructor y lanza `IllegalStateException` si la clave es la de desarrollo y el perfil `dev` no está activo (`environment.matchesProfiles("dev")`). Se compara con la clave **exacta** y no con `startsWith("dev-secret")`, para no rechazar por casualidad una clave válida.
4. `.env-example`: `JWT_SECRET=CAMBIAME`, que no llega a 32 caracteres y por eso no deja arrancar. Un comentario explica cómo generarla con `openssl rand -base64 64` (la salida ocupa 2 líneas y hay que juntarla en una) y cómo arrancar en local con el perfil `dev`.
5. README: en lugar de actualizarlo se ha eliminado (`e208a28`, ver B18).

**Verificación:** `./mvnw compile` sin errores. Con un programa de prueba aparte:

| Caso | Resultado |
|------|-----------|
| Clave de desarrollo + perfil `dev` | ✅ arranca, crea y valida tokens |
| Clave de desarrollo sin perfil o con perfil `prod` | ❌ `IllegalStateException` |
| `CAMBIAME` | ❌ "al menos 32 caracteres" |
| Clave generada con `openssl` (88 caracteres) | ✅ arranca, crea y valida tokens |
| Sin `JWT_SECRET` y sin perfil | ❌ no se resuelve `app.jwt.secret` |
| Sin `JWT_SECRET` y perfil `dev` | ✅ usa la clave de desarrollo |

**Queda fuera del código:**
- Si el `.env` del servidor de AWS tiene la clave de desarrollo, la aplicación **no arrancará** al desplegar este cambio. Antes de desplegar hay que poner una clave nueva generada con `openssl rand -base64 64 | tr -d '\n'` y no activar el perfil `dev` en producción.
- Esto **no resuelve A1**: la clave de producción antigua que está en el historial sigue sirviendo hasta que se rote.

---

### A3. El alta de empleados reutiliza cuentas ajenas y filtra sus datos personales

- **Área:** Autenticación y permisos (aislamiento multi-tenant)
- **Archivos:** `src/main/java/com/optima/api/modules/user/service/UserService.java:44-80` (sobre todo `:57-66`), `modules/user/dto/response/UserResponse.java:25-40`
- **Gravedad:** 🔴 Alta

**¿Qué pasa?**
```java
// si el usuario existe se reutiliza su cuenta
User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> { ... });
...
return UserResponse.from(membershipRepository.save(m));   // incluye fullName, email y phone del User
```
Cuando el administrador de un negocio crea un empleado con un email que **ya existe en cualquier otro negocio**, el sistema:
1. Ignora el nombre, teléfono y contraseña que ha escrito el administrador.
2. Vincula la cuenta existente a su negocio, sin pedir permiso al dueño de la cuenta.
3. Le devuelve el **nombre real y el teléfono** de esa persona.

**¿Por qué es un problema? (escenario)**
- El registro de negocios es público (`POST /api/auth/register`). Cualquiera crea un negocio en segundos y se convierte en ADMIN.
- Después prueba emails en `POST /api/businesses/{suNegocio}/users`. Si la respuesta trae un nombre distinto al que escribió, sabe que esa persona usa Optima y obtiene **su nombre y teléfono**. Si luego la persona cambia sus datos, el atacante los sigue viendo en `GET /users`.
- La víctima aparece como empleada de un negocio que no conoce (e incluso como ADMIN, porque el rol lo elige el atacante), y en su próximo login le saldrá ese negocio en la lista.

Es una **fuga de datos personales entre negocios** (RGPD) y además permite **enumerar cuentas**.

**Cómo arreglarlo (opción recomendada, sencilla):**
1. Si el email ya existe, **no** vincular la cuenta directamente. Crear la membresía como **pendiente** (por ejemplo, `isActive = false` y una columna nueva `invited_at`).
2. Enviar un email a esa persona: *"El negocio X te ha invitado. Entra en Optima para aceptar"*.
3. Añadir `GET /api/me/invitations` y `POST /api/me/invitations/{id}/accept`, que activan la membresía.
4. Mientras esté pendiente, en `UserResponse` devolver **solo el email** que escribió el admin, nunca el nombre ni el teléfono de la cuenta existente.

Arreglo mínimo inmediato si no da tiempo: devolver en la respuesta los datos que ha enviado el administrador (no los de la BD) y no permitir asignar el rol ADMIN a una cuenta que ya existía.

---

### A4. No existe ningún test automatizado

- **Área:** Tests
- **Archivos:** `pom.xml` (no tiene `spring-boot-starter-test`), no existe la carpeta `src/test`, no hay `.github/workflows`
- **Gravedad:** 🔴 Alta

**¿Qué pasa?**
`mvn test` termina con *"No tests to run"*. La única forma de probar es a mano con Postman o con el frontend.

**¿Por qué es un problema?**
La aplicación tiene lógica delicada: aislamiento entre negocios (`TenantGuardFilter`), cálculo de huecos (`AvailabilityService`), transiciones de estado de citas y concurrencia. Sin tests:
- Un cambio pequeño puede romper la seguridad sin que nadie se entere. Por ejemplo, si alguien cambia la expresión regular de `TenantGuardFilter`.
- Bugs como **M2** (intervalo de 45 minutos) habrían aparecido con un test que comparase la disponibilidad con la validación al crear la cita.

**Cómo arreglarlo:** ver la sección 7, *Plan de tests recomendado*, con dependencias y ejemplos.

---

## 4. Hallazgos de gravedad MEDIA 🟠

### M1. Doble reserva posible con peticiones simultáneas

- **Área:** API / Base de datos (concurrencia)
- **Archivos:** `modules/appointment/service/AppointmentService.java:67` (primera lectura) y `:96` (bloqueo), `:383/:399/:412` (edición); `modules/appointment/repository/AppointmentRepository.java:50-107`; `docs/schema_v20.sql:184-201`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
La idea del código es buena: antes de comprobar solapes se bloquea la fila del empleado con `SELECT … FOR UPDATE` (`findByIdAndBusinessIdForUpdate`), para que dos reservas del mismo empleado se hagan por turnos. El problema es **cuándo** se bloquea.

MySQL trabaja por defecto en el nivel de aislamiento **REPEATABLE READ**. En ese nivel, la **primera lectura normal** de la transacción crea una "foto" (instantánea) de la base de datos, y todas las lecturas normales posteriores ven esa misma foto, aunque otra transacción haya confirmado cambios después. Los `FOR UPDATE` sí leen datos actuales, pero la consulta de solape (`existsOverlappingAppointment`) es una lectura normal.

Línea temporal con dos peticiones del mismo empleado, A (10:00–11:00) y B (10:30–11:30):

| Paso | Transacción A | Transacción B |
|------|---------------|---------------|
| 1 | `findById(business)` → se crea la foto de A | |
| 2 | | `findById(business)` → se crea la foto de B |
| 3 | `FOR UPDATE` empleado → bloqueo conseguido | |
| 4 | | `FOR UPDATE` empleado → **espera** |
| 5 | comprueba solape → no hay; inserta 10:00; COMMIT | |
| 6 | | consigue el bloqueo; comprueba solape **con su foto del paso 2** → no ve la cita de A |
| 7 | | inserta 10:30 → **dos citas solapadas** |

Los índices únicos `uq_appointment_active_slot` solo evitan dos citas que empiezan **a la misma hora exacta**, no las que se solapan. Con las cabinas pasa lo mismo.

**Cómo arreglarlo (la opción más sencilla):**
Hacer que estos dos métodos usen **READ COMMITTED**, donde cada consulta ve lo último que se ha confirmado:
```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public AppointmentResponse createAppointment(Long businessId, CreateAppointmentRequest request) { ... }

@Transactional(isolation = Isolation.READ_COMMITTED)
public AppointmentResponse updateAppointment(...) { ... }
```
Alternativa: que la **primera** sentencia del método sea el `FOR UPDATE` del empleado (y de la cabina, siempre en el mismo orden para evitar interbloqueos).

Para comprobarlo: un test que lance dos `createAppointment` a la vez con dos hilos y verifique que solo uno termina bien.

---

### M2. Con intervalo de 45 minutos la disponibilidad ofrece huecos que luego se rechazan

- **Área:** API / backend (bug funcional)
- **Archivos:** `modules/appointment/service/AvailabilityService.java:263`, `:290`, `:325-331`; `modules/appointment/service/AppointmentValidator.java:182-190`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
El negocio puede elegir un intervalo de 15, 30, **45** o 60 minutos. Dos partes del código calculan los huecos de forma distinta:

- `AvailabilityService` empieza en la hora de apertura y va sumando el intervalo: **10:00 → 10:45 → 11:30 → 12:15 → 13:00…**
- `AppointmentValidator.validateAppointmentInterval` exige que **los minutos de la hora** sean múltiplos del intervalo (`minutes % interval == 0`), así que con 45 solo acepta `:00` y `:45`.

Resultado: el calendario muestra 11:30 como libre, el usuario lo elige y el backend responde **400 "La hora de inicio debe ser múltiplo de 45 minutos"**. Con intervalo 45, aproximadamente dos de cada tres huecos fallan. Con 15, 30 y 60 no se nota porque esos números dividen exactamente a 60.

**Cómo arreglarlo:**
Usar la **misma regla en los dos sitios**, contando los minutos desde medianoche:
```java
// AppointmentValidator
int minutosDesdeMedianoche = startDateTime.getHour() * 60 + startDateTime.getMinute();
if (minutosDesdeMedianoche % interval != 0) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "La hora de inicio debe coincidir con un hueco de " + interval + " minutos");
}

// AvailabilityService.alignUpToInterval
int minutos = t.getHour() * 60 + t.getMinute();
int resto = minutos % interval;
if (resto == 0 && t.getSecond() == 0 && t.getNano() == 0) return t;
return t.withSecond(0).withNano(0).plusMinutes(interval - resto);
```
Y añadir un test que, para cada intervalo, compruebe que **todos** los huecos que devuelve la disponibilidad pasan la validación.

---

### M3. El límite de intentos se puede saltar con la cabecera `X-Forwarded-For`

- **Área:** Autenticación
- **Archivos:** `common/security/RateLimitFilter.java:101-103` y `:120-126`; `docker-compose.yml:33-34`
- **Gravedad:** 🟠 Media (sería Alta si el puerto 8080 está accesible desde Internet)

**¿Qué pasa?**
```java
String xff = request.getHeader("X-Forwarded-For");
String ip = (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : request.getRemoteAddr();
...
if (buckets.size() > MAX_TRACKED_IPS) { buckets.clear(); }
```
1. La "IP" sale de una cabecera que **escribe el cliente**. Basta con mandar `X-Forwarded-For: 1.2.3.<n>` distinto en cada petición para tener intentos ilimitados.
2. Cuando hay más de 10 000 IPs se **borran todos los contadores**, también los de los demás. Un atacante puede vaciar el mapa a propósito.
3. El límite es solo por IP; no hay bloqueo por cuenta. Con contraseñas de 8 caracteres sin más requisitos (ver M13) se facilita la fuerza bruta.

Detrás de Caddy, la primera IP suele ser la real, pero `docker-compose.yml` publica el `8080` en todas las interfaces. Si ese puerto está abierto, se llega a la API sin pasar por Caddy.

**Cómo arreglarlo:**
1. Dejar que Tomcat calcule la IP real **solo si la petición viene del proxy de confianza** y usar siempre `request.getRemoteAddr()`:
   ```properties
   server.forward-headers-strategy=native
   server.tomcat.remoteip.internal-proxies=127\\.0\\.0\\.1|172\\.1[6-9]\\..*
   ```
2. En `docker-compose.yml` publicar la API solo en local: `"127.0.0.1:8080:8080"`.
3. En vez de `clear()`, ignorar las IPs nuevas cuando el mapa esté lleno, o borrar solo las entradas antiguas.
4. Añadir un segundo contador **por email** en el login (por ejemplo, 5 fallos → esperar 15 minutos).

---

### M4. Negocio desactivado: los tokens siguen funcionando y no se puede reactivar

- **Área:** Autenticación y permisos
- **Archivos:** `common/security/TenantGuardFilter.java:72-82`; `modules/business/service/BusinessService.java:124-133`; `modules/auth/service/AuthService.java:73-77`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
- `TenantGuardFilter` comprueba que la membresía esté activa y que el rol no haya cambiado, pero **no** mira si el **negocio** (`business.isActive`) ni el **usuario** (`user.isActive`) siguen activos. Tras `DELETE /api/businesses/{id}`, los tokens emitidos siguen dando acceso a clientes, citas, etc. durante 4 horas. Solo algunos métodos sueltos (crear/editar cita, editar negocio) comprueban el estado.
- Por otro lado, el login descarta los negocios inactivos. Cuando el token caduca, el administrador **ya no puede entrar**, así que `PATCH /api/businesses/{id}/reactivate` es inalcanzable. El negocio queda bloqueado para siempre.

**Cómo arreglarlo:**
1. En `findForSessionGuard` cargar también el negocio y el usuario (`@EntityGraph(attributePaths = {"role", "business", "user"})`) y rechazar si alguno está inactivo.
2. Decidir la regla de reactivación. La opción más simple:
   - Permitir que el login de un **ADMIN** incluya también sus negocios inactivos.
   - En el filtro, si el negocio está inactivo, dejar pasar **solo** `PATCH /api/businesses/{id}/reactivate`.

---

### M5. Los tokens no se invalidan al cambiar la contraseña y el email se cambia sin pedir contraseña

- **Área:** Autenticación
- **Archivos:** `modules/user/service/UserService.java:163-180` (perfil) y `:194-217` (contraseña); `modules/auth/service/PasswordResetService.java:104-128`; `modules/user/controller/MeController.java:43-47`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
1. Los JWT son válidos 4 horas y **no hay forma de revocarlos**: ni al cambiar la contraseña, ni al usar el enlace de recuperación, ni con un "cerrar sesión" del servidor. Si alguien te roba el token y cambias la contraseña, el ladrón sigue dentro.
2. `PUT /api/me` cambia el **email** sin pedir la contraseña actual. Con un token robado se cambia el email, se pide "olvidé mi contraseña" y la cuenta queda robada para siempre (el mismo encadenamiento que en A2).

**Cómo arreglarlo (sencillo):**
1. Añadir a `users` una columna `token_version INT NOT NULL DEFAULT 0`.
2. Meter ese número en el JWT (`claims.put("ver", user.getTokenVersion())`).
3. En `JwtAuthenticationFilter` (o en `TenantGuardFilter`) comparar el `ver` del token con el de la BD. Si no coincide → 401.
4. Sumar 1 a `token_version` en `changePassword`, en `consumeReset` y en un nuevo `POST /api/auth/logout`.
5. Añadir `currentPassword` a `UpdateMeRequest` y exigirlo cuando cambie el email. Mejor aún: enviar un email de confirmación a la dirección nueva.

---

### M6. "Olvidé mi contraseña" permite enumerar cuentas por tiempo y deja tokens antiguos válidos

- **Área:** Autenticación
- **Archivos:** `modules/auth/service/PasswordResetService.java:53-101`; `common/mail/MailService.java:27-40`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
1. El código responde lo mismo exista o no el email (bien ✔️), pero si existe **envía el correo por SMTP antes de responder**, lo que tarda uno o varios segundos. Si no existe, responde al instante. Midiendo el tiempo se sabe qué emails están registrados.
2. Cada petición crea un token nuevo y **no anula los anteriores**. Al usar uno, los demás siguen sirviendo durante una hora.
3. Además, como el envío va dentro de la transacción, una conexión de BD queda ocupada mientras se habla con Gmail.

**Cómo arreglarlo:**
1. Enviar el correo en segundo plano: `@EnableAsync` en `ApiApplication` y `@Async` en `MailService.sendSimpleEmail`. Así el tiempo de respuesta es igual en los dos casos.
2. Antes de crear un token nuevo, y al consumir uno, marcar como usados los demás de ese usuario:
   ```java
   @Modifying
   @Query("UPDATE PasswordResetToken t SET t.usedAt = CURRENT_TIMESTAMP WHERE t.user.id = :userId AND t.usedAt IS NULL")
   void invalidateAllForUser(@Param("userId") Long userId);
   ```

---

### M7. Un empleado puede modificar cualquier cita, los pagos y los clientes

- **Área:** Permisos
- **Archivos:** `modules/appointment/controller/AppointmentController.java:31-78` (sobre todo `markPayment`, `:72-78`); `modules/client/controller/ClientController.java:58-72`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
Los endpoints de catálogo, cabinas, horarios… tienen `@PreAuthorize("hasRole('ADMIN')")`, pero los de **citas** y **clientes** no tienen ninguno. Cualquier `EMPLOYEE` puede:
- Editar, reagendar o cancelar citas **de otros compañeros**.
- Marcar citas como **pagadas o no pagadas** (`PATCH …/payment`).
- Archivar y reactivar clientes.
- Ver todos los empleados con su email y teléfono.

Puede ser una decisión de diseño válida en un negocio pequeño, pero conviene que sea **explícita**. Tal como está, un empleado podría marcar como "no pagado" algo que cobró en efectivo.

**Cómo arreglarlo:**
1. Lo mínimo: `@PreAuthorize("hasRole('ADMIN')")` en `markPayment` y en archivar/reactivar clientes.
2. Si los empleados solo deben tocar **sus** citas, comprobarlo en el servicio:
   ```java
   boolean esAdmin = "ADMIN".equals(principal.role());
   boolean esSuya = appointment.getMembership().getUser().getId().equals(principal.userId());
   if (!esAdmin && !esSuya) {
       throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes modificar tus propias citas");
   }
   ```
3. Documentar en el README qué puede hacer cada rol (una tabla rol × acción).

---

### M8. Pagos: el estado de pago no tiene control ni registro y editar una cita recalcula precios

- **Área:** Pagos
- **Archivos:** `modules/appointment/service/AppointmentService.java:550-566` (recalcula precios al editar), `:571-590` (`markPayment`); `modules/appointment/model/Appointment.java` (`isPaid`)
- **Gravedad:** 🟠 Media

**Contexto:** el proyecto **no tiene pasarela de pago** (ni Stripe, ni Redsys…). "Pago" es solo el campo booleano `isPaid`. Lo bueno ✔️: al reservar se **congelan** el precio y el IVA de cada servicio en `appointment_services`, así una subida de precios no cambia citas antiguas.

**¿Qué falla?**
1. `updateAppointment` **borra los servicios reservados y los vuelve a crear con el precio actual del catálogo**, aunque la cita ya esté pagada o solo se haya cambiado una nota. Se pierde el precio por el que realmente se cobró.
2. `markPayment` deja marcar como pagada una cita `CANCELLED` o `NO_SHOW`, y no guarda **quién** ni **cuándo**.
3. No se calcula el total en el servidor. Cada cliente (frontend, app) tiene que sumar precio + IVA por su cuenta, con riesgo de redondeos distintos.

**Cómo arreglarlo:**
1. En `updateAppointment`: si `isPaid` es `true`, no permitir cambiar los servicios. Si no está pagada, conservar el `appliedPrice` de los servicios que se mantienen y usar el precio actual solo para los nuevos.
2. En `markPayment`: rechazar si el estado es `CANCELLED` o `NO_SHOW`, y guardar `paid_at` y `paid_by_membership_id` (dos columnas nuevas).
3. Añadir `total` a `AppointmentResponse`, calculado con `BigDecimal` y `setScale(2, RoundingMode.HALF_UP)`.

---

### M9. `POST /api/businesses` crea negocios huérfanos

- **Área:** API / permisos
- **Archivos:** `modules/business/controller/BusinessController.java:25-30`; `modules/business/service/BusinessService.java:28-30`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
Cualquier ADMIN puede llamar a `POST /api/businesses`. Se crea el negocio, pero **no se crea ninguna membresía**, así que nadie puede gestionarlo. Esta ruta no tiene `{id}`, así que `TenantGuardFilter` no actúa y el rol se toma **solo del token**, sin comprobarlo en la BD: un admin degradado conserva el permiso hasta que caduque su token. Permite además "reservar" slugs y emails de otros negocios (son únicos).

**Cómo arreglarlo:**
- Opción simple: **eliminar** el endpoint, porque el alta de negocios ya se hace con `/api/auth/register`.
- Si se quiere mantener ("un admin crea su segundo negocio"), crear en el mismo método una membresía ADMIN para quien llama y comprobar su rol en la BD.

---

### M10. Base de datos y Docker con configuración insegura para producción

- **Área:** Configuración / Base de datos
- **Archivos:** `src/main/resources/application.properties:6-8`; `docker-compose.yml:8-12`, `:33-34`, `:38`, `:48`; `docs/schema_v20.sql:4` y `:902-905`; `README.md:41-44`
- **Gravedad:** 🟠 Media (Alta si este `docker-compose.yml` es el que se usa en AWS)
- **Estado:** ⏳ Pendiente. Al eliminar el README (`e208a28`) desaparece la frase falsa *"las credenciales viven en variables de entorno"*, pero los problemas de configuración siguen igual.

**¿Qué pasa?**
- Usuario y contraseña de la BD **fijos en el código** (`optima_user` / `optima_pass`) y `MYSQL_ROOT_PASSWORD: root_password` en el compose. El README dice que *"las credenciales viven en variables de entorno"*, pero no es así.
- El script crea `'optima_user'@'%'`, es decir, usuario aceptado **desde cualquier host**, con `GRANT ALL PRIVILEGES`. La aplicación solo necesita leer y escribir datos.
- El compose publica MySQL en `3307` y la API en `8080` en **todas las interfaces**. En un servidor con el puerto abierto, la BD es accesible desde Internet con una contraseña conocida.
- El script empieza con `DROP DATABASE IF EXISTS optima_db;`. Ejecutarlo por error en producción borra todo.
- La API se ejecuta con `mvn spring-boot:run` y DevTools activado (recarga en caliente), que es un modo de desarrollo.
- `useSSL=false` en la conexión JDBC.

**Cómo arreglarlo:**
1. `spring.datasource.username=${DB_USERNAME}` y `spring.datasource.password=${DB_PASSWORD}`, sin valor por defecto fuera del perfil `dev`.
2. En el compose: `"127.0.0.1:3307:3306"` o quitar `ports` de MySQL (la API lo alcanza por la red interna de Docker).
3. Usuario con permisos mínimos:
   ```sql
   CREATE USER 'optima_app'@'%' IDENTIFIED BY '<contraseña larga aleatoria>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON optima_db.* TO 'optima_app'@'%';
   ```
4. Separar `schema.sql` (tablas), `seed-demo.sql` (datos de ejemplo) y `users.sql`, y sacar el `DROP DATABASE` del script de producción.
5. Para producción, un `Dockerfile` que haga `mvn package` y ejecute `java -jar app.jar` (en el jar empaquetado DevTools ya no se incluye).

---

### M11. Dependencias desactualizadas con vulnerabilidades conocidas

- **Área:** Dependencias
- **Archivos:** `pom.xml:8` (Spring Boot `3.4.1`); `RegisterRequest.java:39-41`, `ResetPasswordRequest.java:15-17`, `ChangePasswordRequest.java:14-16`, `CreateUserRequest.java:28-30` (contraseñas de hasta 100 caracteres)
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
Versiones reales comprobadas con `mvn dependency:list`:

| Componente | Versión usada | Comentario |
|------------|---------------|------------|
| Spring Boot | 3.4.1 | La rama 3.4 ya no recibe parches gratuitos (consúltalo en spring.io/projects/spring-boot#support) |
| Spring Security | 6.4.2 | Afectada por **CVE-2025-22228** (BCrypt con contraseñas de más de 72 bytes), corregida en 6.4.4 |
| Tomcat embebido | 10.1.34 | Afectado por **CVE-2025-24813** (corregida en 10.1.35) y otras posteriores |
| Spring Framework | 6.2.1 | Tiene parches de seguridad posteriores |

Relacionado: BCrypt **solo usa los primeros 72 bytes** de la contraseña, pero los DTOs permiten 100 caracteres. Dos contraseñas que empiezan igual en los 72 primeros caracteres se consideran iguales. Las versiones nuevas de Spring Security **lanzan error** con más de 72 bytes, así que al actualizar fallaría el registro con contraseñas largas si no se ajusta la validación.

**Cómo arreglarlo:**
1. Subir el `<parent>` a la última versión con soporte (3.5.x o la que indique spring.io) y volver a probar.
2. Cambiar las validaciones de contraseña a `@Size(min = 8, max = 72)`.
3. Activar **Dependabot** en GitHub (fichero `.github/dependabot.yml`) para que avise de nuevas versiones.

---

### M12. `AppointmentService` duplica unas 120 líneas entre crear y editar (y se comportan distinto)

- **Área:** Código repetido / bug menor
- **Archivos:** `modules/appointment/service/AppointmentService.java:117-142` vs `:432-454` (carga de servicios), `:224-242` vs `:530-548` (captura de errores de BD), `:245-259` vs `:555-565` (servicios reservados), `:67-109` vs `:399-424` (comprobaciones de negocio y empleado); `AvailabilityService.java:182`
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
`createAppointment` y `updateAppointment` repiten casi el mismo código. Si se corrige un bug en uno, es fácil olvidarse del otro. Ya hay **diferencias**:
- Al crear, `serviceIds = [5, 5]` reserva el servicio **dos veces** y suma su duración dos veces, pero `AvailabilityService` elimina los duplicados con un `HashSet`. La disponibilidad calcula 30 minutos y la cita se crea de 60.
- Los servicios se cargan **uno a uno** en un bucle (N consultas), mientras que la disponibilidad usa `findAllByIdInAndBusinessId` (una sola consulta).
- Detectar el conflicto buscando el nombre de la restricción dentro del texto del error (`msg.contains("uq_appointment_active_slot")`) es frágil y está copiado dos veces.

**Cómo arreglarlo:** extraer métodos privados pequeños y llamarlos desde los dos sitios:
```java
private List<BusinessService> cargarServiciosActivos(Long businessId, List<Long> serviceIds) {
    Set<Long> ids = new LinkedHashSet<>(serviceIds);          // quita duplicados
    List<BusinessService> servicios = serviceRepository.findAllByIdInAndBusinessId(ids, businessId);
    if (servicios.size() != ids.size()) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Alguno de los servicios no existe en este negocio");
    }
    for (BusinessService s : servicios) {
        if (!s.getIsActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El servicio con ID: " + s.getId() + " está desactivado");
        }
    }
    return servicios;
}

private Appointment guardarControlandoConflictos(Appointment a) { ... }   // el try/catch actual
private List<BookedService> guardarServiciosReservados(Appointment a, List<BusinessService> servicios) { ... }
private void validarHorario(Long businessId, Long membershipId, Long boothId, LocalDateTime inicio, LocalDateTime fin, Long excluirId) { ... }
```

---

### M13. Credenciales de demo publicadas junto a la URL de producción y política de contraseñas débil

- **Área:** Configuración / Autenticación
- **Archivos:** `README.md:7` (URL de producción), `README.md:139-140` (`admin@optima.com` / `12345678`); `docs/schema_v20.sql` (semilla); validaciones `@Size(min = 8)`
- **Gravedad:** 🟠 Media
- **Estado:** 🟡 En parte. Con el README eliminado (`e208a28`), el repositorio ya no publica la URL de producción junto a las credenciales de demo. Pero siguen en el historial de Git (`git show e208a28^:README.md`), así que la contraseña del admin de demo en producción hay que cambiarla igualmente. Los pasos 1 y 3 siguen pendientes.

**¿Qué pasa?**
El README invita a probar en `optima-aws.duckdns.org` y publica la contraseña del ADMIN de demo. Si esa semilla está cargada allí, **cualquier visitante es administrador**: puede cambiar la contraseña del admin (`PUT /api/me/password`) y dejar fuera al tribunal, borrar datos o usar el fallo A3. La única regla de contraseñas es "mínimo 8 caracteres", así que se aceptan `12345678` o `aaaaaaaa`.

**Cómo arreglarlo:**
1. Tratar el despliegue público como entorno **demo**: base de datos aparte, sin datos reales, y una tarea que la restaure cada noche.
2. Contraseñas de demo distintas a las del README del repositorio. Se pueden facilitar al tribunal por otro canal.
3. Exigir algo más que la longitud. Por ejemplo, al menos una letra y un número:
   ```java
   @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
            message = "La contraseña debe tener entre 8 y 72 caracteres, con letras y números")
   ```

---

### M14. Las fechas se comparan con el reloj del servidor (UTC) y no con la hora del negocio

- **Área:** API / backend
- **Archivos:** `modules/appointment/dto/request/CreateAppointmentRequest.java:29` (`@FutureOrPresent`); `AvailabilityController.java:36`; usos de `LocalDateTime.now()` en `BoothService.java:101`, `ClientService.java:94`, `UserService.java:130`; `application.properties:6` (`serverTimezone=UTC`)
- **Gravedad:** 🟠 Media

**¿Qué pasa?**
Las citas llegan como `LocalDateTime` sin zona (hora de Madrid, por ejemplo), pero `@FutureOrPresent` y `LocalDateTime.now()` usan la zona de la JVM. En un contenedor Docker suele ser **UTC**, una o dos horas por detrás de España. A las 10:30 de Madrid (08:30 UTC) se puede reservar a las 09:00 de ese mismo día, que ya ha pasado. Cerca de medianoche, "hoy" y "mañana" se confunden.

**Cómo arreglarlo (sencillo):**
1. Fijar la zona del servidor: `TZ=Europe/Madrid` en el compose y/o `-Duser.timezone=Europe/Madrid`.
2. Mejor: guardar la zona en el negocio (columna `timezone`, por ejemplo `Europe/Madrid`) y comparar con `LocalDateTime.now(ZoneId.of(business.getTimezone()))` en el servicio, en lugar de con `@FutureOrPresent`.

---

## 5. Hallazgos de gravedad BAJA 🟢

### B1. Swagger público y activado por defecto
- **Archivos:** `application.properties:50-51`, `config/SecurityConfig.java:86-91`, `.env-example` (`SWAGGER_ENABLED=true`)
- **Por qué:** en producción enseña a cualquiera el mapa completo de la API.
- **Arreglo:** `SWAGGER_ENABLED` con valor por defecto `false` y activarlo solo en el perfil `dev`.

### B2. `show-sql=true` por defecto
- **Archivo:** `application.properties:13`
- **Por qué:** cada consulta SQL va al log. En producción llena el disco y ralentiza.
- **Arreglo:** `${SHOW_SQL:false}`.

### B3. Se devuelven al cliente mensajes internos de `IllegalArgumentException`
- **Archivo:** `common/exception/GlobalExceptionHandler.java:48-52`
- **Por qué:** muchas librerías (Spring, Jackson, BCrypt…) lanzan esta excepción con mensajes técnicos que acaban en la respuesta.
- **Arreglo:** crear una excepción propia (`BadRequestException`) para los errores "de negocio" y, para `IllegalArgumentException` genérica, registrar el detalle en el log y devolver un mensaje genérico.

### B4. Faltan límites de tamaño en textos y listas
- **Archivos:** `CreateAppointmentRequest.java:32` y `:34-36` (`notes`, `serviceIds`), `UpdateAppointmentRequest.java`, `CreateClientRequest.java:28` (`notes`), `CreateServiceRequest.java:27` (`description`), `LoginRequest.java:9-10`, `BusinessAbsencesController.java:35-39` (rango de fechas sin límite)
- **Por qué:** se pueden mandar notas de varios MB o listas con miles de IDs (con el bucle de M12, miles de consultas). Es una forma fácil de saturar el servidor.
- **Arreglo:** `@Size(max = 2000)` en notas y descripciones, `@Size(max = 20)` en `serviceIds`, `@Size(max = 150)` / `@Size(max = 72)` en el login, y limitar el rango de fechas a, por ejemplo, 3 meses.

### B5. Código que escribe errores JSON repetido en 4 sitios
- **Archivos:** `config/SecurityConfig.java:43` y `:57-76`, `common/security/RateLimitFilter.java:129-135`, `common/security/TenantGuardFilter.java:98-106`
- **Por qué:** los cuatro hacen lo mismo (`setStatus`, `setContentType`, `new ErrorResponse(...)`, `writeValue`). Además `SecurityConfig` crea su propio `new ObjectMapper()` en vez de usar el de Spring.
- **Arreglo:** una clase pequeña reutilizable:
  ```java
  @Component
  @RequiredArgsConstructor
  public class ErrorWriter {
      private final ObjectMapper objectMapper;
      public void write(HttpServletResponse res, HttpStatus status, String message) throws IOException {
          res.setStatus(status.value());
          res.setContentType(MediaType.APPLICATION_JSON_VALUE);
          objectMapper.writeValue(res.getOutputStream(),
                  new ErrorResponse(status.value(), status.getReasonPhrase(), message, Instant.now().toString()));
      }
  }
  ```

### B6. "No se encontró…" y `findOrThrow` repetidos en todos los servicios
- **Archivos:** `BoothService`, `BusinessHourService`, `ScheduleBlockService`, `TaxService`, `BusinessServiceService`, `ServiceCategoryService`, `ClientService`, `UserService`, `AppointmentService`, `AvailabilityService` (el bloque `businessRepository.findById(...).orElseThrow(... "No se encontró el negocio con ID: " ...)` aparece en más de 10 sitios)
- **Por qué:** mucho código repetido. Cambiar el formato del mensaje obliga a tocar decenas de líneas.
- **Arreglo:** una excepción propia y un método de ayuda:
  ```java
  public class NotFoundException extends ResponseStatusException {
      public NotFoundException(String entidad, Long id) {
          super(HttpStatus.NOT_FOUND, "No se encontró " + entidad + " con ID: " + id);
      }
  }
  // uso
  Business b = businessRepository.findById(id).orElseThrow(() -> new NotFoundException("el negocio", id));
  ```

### B7. DTOs `Create*` y `Update*` idénticos y expresiones regulares copiadas
- **Archivos:** `CreateBoothRequest`/`UpdateBoothRequest`, `CreateBusinessHourRequest`/`UpdateBusinessHourRequest`, `CreateCategoryRequest`/`UpdateCategoryRequest`, `CreateServiceRequest`/`UpdateServiceRequest`, `CreateTaxRequest`/`UpdateTaxRequest`, `CreateClientRequest`/`UpdateClientRequest`, `Create/UpdateEmployeeAbsenceRequest`, `Create/UpdateEmployeeScheduleRequest`. La regex de teléfono está copiada en 5 DTOs y la de color en 3.
- **Por qué:** si cambia una regla, hay que acordarse de todos los ficheros.
- **Arreglo:** usar un único record cuando son iguales (`BoothRequest`) y guardar las regex en constantes (`public static final String PHONE_REGEX = "...";` en una clase `ValidationPatterns`), usadas como `@Pattern(regexp = ValidationPatterns.PHONE_REGEX)`.

### B8. Lógica duplicada en ausencias y horarios de empleados
- **Archivos:** `modules/user/service/EmployeeAbsenceService.java:48-55` (comprobación de solape escrita a mano) vs `:142-155` (`validateNoOverlap`, que hace lo mismo); `EmployeeScheduleService.java:35-43` vs `:129-142`; `ensureMembershipOfBusiness` copiado en ambos (`:114-120` y `:103-109`); `normalize` copiado en `ClientService.java:128-132` y `EmployeeAbsenceService.java:160-164`
- **Por qué:** mismo motivo que B6. Además el repositorio ya tiene `findOverlappingByMembershipAndRange`, que hace el solape en SQL, y no se usa aquí.
- **Arreglo:** en `create` llamar a `validateNoOverlap(..., null)`; mover `ensureMembershipOfBusiness` y `normalize` a un sitio común (por ejemplo, un método `default` o una clase `TextUtils`).

### B9. Nombres engañosos
- **Archivos:** `EmployeeAbsenceController.java:19` y `EmployeeScheduleController.java:19` (`/users/{userId}/...`, pero el valor se usa como **id de membresía**); `UserController.java` (`/users/{id}` también es id de membresía); entidad `catalog/model/BusinessService.java` (se confunde con un `@Service` de Spring); `common/utils/JwtUtil.java` (es seguridad, no "utilidades")
- **Por qué:** el frontend puede mandar el `userId` real y fallar con un 404 confuso. Los nombres deben decir la verdad.
- **Arreglo:** renombrar la variable de ruta a `{membershipId}` (o la ruta a `/employees/{membershipId}`), la entidad a `Offering` o `CatalogService`, y mover `JwtUtil` a `common/security/JwtService`.

### B10. Estados y roles como texto suelto e IDs fijos en el SQL
- **Archivos:** `AppointmentValidator.java:35-39`, `AppointmentService.java:206`, `:371-375`, consultas JPQL con `'PENDING', 'CONFIRMED', 'IN_PROGRESS'` (`AppointmentRepository.java:55` y siguientes), `AuthService.java:147` (`"ADMIN"`), `docs/schema_v20.sql:185` y `:190` (`id_status IN (1, 2, 3)`)
- **Por qué:** un error de escritura (`"CONFIRMD"`) no lo detecta el compilador. Las columnas generadas del SQL dependen del **orden** en que se insertaron los estados: si cambia, los índices únicos dejan de proteger.
- **Arreglo:** una clase de constantes (`AppointmentStatusNames.PENDING`) o un `enum` sencillo, y en el SQL documentar con un comentario que los IDs 1-3 deben coincidir con PENDING, CONFIRMED e IN_PROGRESS (o insertarlos con ID explícito).

### B11. Un impuesto se puede archivar aunque lo usen servicios activos
- **Archivos:** `modules/business/service/TaxService.java:88-97` (no comprueba nada) vs `ServiceCategoryService.java:97-104` (sí comprueba); `TaxService.java:37` (comprueba el duplicado **sin** `trim()` pero guarda con `trim()`)
- **Por qué:** comportamiento incoherente entre categorías e impuestos. Además `" IVA"` y `"IVA"` no se detectan como duplicado y luego la BD da un 409 genérico.
- **Arreglo:** añadir `countByTaxIdAndIsActiveTrue` en `BusinessServiceRepository` y usarlo igual que con las categorías; hacer `trim()` antes de `existsBy…`.

### B12. Huecos pasados en disponibilidad y edición de citas hacia el pasado
- **Archivos:** `AvailabilityService.java:265-291` (para "hoy" devuelve huecos de horas ya pasadas); `UpdateAppointmentRequest.java:23-24` (sin `@FutureOrPresent`); `AppointmentService.java:371-375` (se puede editar una cita `IN_PROGRESS`)
- **Por qué:** el usuario ve huecos que luego no puede reservar, y se pueden mover citas al pasado o una cita en curso a otro día.
- **Arreglo:** si `date` es hoy, empezar en la hora actual redondeada al siguiente hueco; validar la fecha también al editar; añadir `IN_PROGRESS` a `NON_EDITABLE_STATUSES` (o permitir solo cambiar notas).

### B13. Un negocio puede quedarse sin ningún administrador
- **Archivo:** `modules/user/service/UserService.java:98-114`
- **Por qué:** `deactivate` impide archivarse a uno mismo (bien ✔️), pero `update` permite que el admin se cambie **su propio rol** a EMPLOYEE (o que el último admin pierda el rol). El negocio queda sin nadie que lo gestione.
- **Arreglo:** antes de quitar el rol ADMIN, contar los admins activos del negocio y rechazar si es el último.

### B14. Filtros de seguridad registrados dos veces
- **Archivos:** `common/security/JwtAuthenticationFilter.java:25`, `RateLimitFilter.java:32`, `TenantGuardFilter.java:31` (todos con `@Component`)
- **Por qué:** Spring Boot registra automáticamente cualquier `Filter` que sea un bean en el contenedor de servlets, **además** de añadirlo a la cadena de seguridad. Hoy no rompe nada porque `OncePerRequestFilter` evita la segunda ejecución, pero es frágil y confunde al depurar.
- **Arreglo:** desactivar el registro automático:
  ```java
  @Bean
  public FilterRegistrationBean<TenantGuardFilter> tenantGuardRegistration(TenantGuardFilter f) {
      FilterRegistrationBean<TenantGuardFilter> r = new FilterRegistrationBean<>(f);
      r.setEnabled(false);
      return r;
  }
  ```
  (igual para los otros dos), o crear los filtros con `new` dentro de `SecurityConfig` en vez de anotarlos.

### B15. Sin migraciones de base de datos ni validación del esquema
- **Archivos:** `application.properties:12` (`ddl-auto=none`), `docs/schema_v20.sql` (un único script "v20" que mezcla tablas, datos demo y usuarios)
- **Por qué:** no hay forma de actualizar una BD existente de v19 a v20 sin borrarla. Si una entidad JPA no coincide con la tabla, se descubre en tiempo de ejecución.
- **Arreglo:** como mínimo `spring.jpa.hibernate.ddl-auto=validate` (Hibernate comprueba al arrancar que entidades y tablas coinciden). Opcional: **Flyway** (`V1__esquema.sql`, `V2__...sql`), que aplica solo los cambios pendientes.

### B16. La tabla `password_resets` crece sin límite y el token viaja en la URL
- **Archivos:** `modules/auth/service/PasswordResetService.java:68-77`
- **Por qué:** cada solicitud añade una fila que nunca se borra. El token va en `?token=`, que puede quedar en el historial del navegador o en logs.
- **Arreglo:** borrar los tokens caducados al crear uno nuevo (o con `@Scheduled` una vez al día). En el frontend, leer el token y quitarlo de la URL enseguida (`history.replaceState`), y servir la página con `Referrer-Policy: no-referrer`.

### B17. Listados paginados sin orden por defecto
- **Archivos:** `ClientRepository.java:20-25`, `BoothRepository.java:21-24`, `TaxRepository.java:16-19`, `ServiceCategoryRepository.java:16-19`, `BusinessServiceRepository.java:23-27`, `MembershipRepository.java:23-27`
- **Por qué:** sin `ORDER BY`, MySQL puede devolver las filas en cualquier orden, y al pasar de página pueden repetirse o saltarse elementos.
- **Arreglo:** `@PageableDefault(sort = "id")` en los controladores, o `...OrderByIdAsc` en los nombres de los métodos del repositorio.

### B18. Documentación desactualizada y sin integración continua
- **Archivos:** `README.md:121-125` y `:162` (habla de `frontend-v2/`, que se borró en el último commit), `README.md:151-165` (la estructura no coincide con `modules/…`), `README.md:41-44` (ver M10), `pom.xml:16-18` (`url`/`scm` apuntan a `mirsugogu/tfg-backend`), `docs/optima-postman-collection-v4.json` (describe el "flujo v16"); no existe `.github/workflows`
- **Por qué:** quien llega al proyecto (o el tribunal) sigue instrucciones que ya no funcionan.
- **Estado:** 🟡 En parte. El README desactualizado se ha eliminado (`e208a28`). Ahora **no hay README**: las únicas instrucciones de arranque son los comentarios de `.env-example`. Siguen pendientes el `pom.xml`, la colección de Postman y la integración continua.
- **Arreglo:** actualizar el README y el `pom.xml`; añadir un workflow mínimo de GitHub Actions que ejecute `./mvnw -B verify` en cada push (útil sobre todo cuando haya tests, ver A4).

### B19. Llamadas externas dentro de transacciones y datos personales en los logs
- **Archivos:** `modules/business/service/BusinessService.java:69-73` y `:114-118` (geocodificación con Nominatim dentro de `@Transactional`), `AuthService.java:176-184` (correo de bienvenida dentro de la transacción), `common/geocoding/GeocodingService.java:91` (registra la dirección completa), `common/mail/MailService.java:38` (registra el email destino)
- **Por qué:** mientras se espera a Nominatim o a Gmail (hasta 5 s), la conexión a la BD queda ocupada; con pocas peticiones simultáneas se agota el pool. Guardar direcciones y emails en logs va en contra del principio de minimización del RGPD.
- **Arreglo:** geocodificar **antes** de abrir la transacción (o en segundo plano, igual que el correo con `@Async`, ver M6) y registrar en el log solo el ID del negocio o del usuario.

### B20. Búsqueda de clientes sin escapar `%`/`_` y errores de bloqueo devueltos como 500
- **Archivos:** `modules/client/repository/ClientRepository.java:30-34`; `common/exception/GlobalExceptionHandler.java` (no trata `CannotAcquireLockException` ni `PessimisticLockingFailureException`)
- **Por qué:** buscar `%` devuelve todos los clientes (no es una inyección SQL, porque el parámetro va enlazado ✔️, pero el resultado no es el esperado). Si dos reservas compiten por el mismo `FOR UPDATE` y hay un timeout o interbloqueo, el usuario recibe "Error interno del servidor".
- **Arreglo:** escapar `\`, `%` y `_` antes de buscar; añadir un `@ExceptionHandler` que devuelva **409 "Otra persona está modificando esta agenda, inténtalo de nuevo"**.

---

## 6. Áreas sin código o con hallazgos agrupados

### Frontend (no presente)
El último commit (`2f8566a`, *"elimina frontend original, empiezo de cero"*) borró la carpeta `frontend-v2/`, así que **no hay frontend que auditar**. Recomendaciones para el nuevo, a partir de lo que hacía la versión anterior y de cómo funciona el backend:

1. **No guardar el token en `localStorage`.** La versión anterior lo hacía (`AuthContext.jsx`), y cualquier fallo XSS permitiría robarlo. Mejor guardarlo en memoria (estado de React) y, si se quiere mantener la sesión al recargar, en `sessionStorage`.
2. **No pintar nunca HTML recibido del backend** (las notas de clientes y citas son texto libre). React ya escapa el texto ✔️; basta con no usar `dangerouslySetInnerHTML`.
3. **Gestionar los 401 del backend** (`TenantGuardFilter` devuelve 401 cuando cambia el rol o se revoca el acceso): borrar el token y volver al login.
4. Las comprobaciones de rol del frontend son **solo visuales**. La seguridad real está (y debe seguir estando) en el backend.
5. Pedir a Caddy cabeceras de seguridad para el frontend: `Content-Security-Policy`, `Referrer-Policy: no-referrer` (ver B16) y HSTS.
6. Configurar la URL de la API con una variable de entorno de Vite (`VITE_API_URL`) y actualizar `CORS_ALLOWED_ORIGINS` en el backend con el dominio real.

### Pagos
No hay pasarela de pago ni datos de tarjeta, así que **no aplica PCI-DSS**. El "pago" es el indicador `isPaid` de cada cita. Sus problemas están en **M8** (control y registro del pago, precios recalculados) y **M7** (quién puede marcarlo).

---

## 7. Plan de tests recomendado (para resolver A4)

### Paso 1: dependencias en `pom.xml`
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```
`spring-boot-starter-test` ya trae JUnit 5, Mockito y AssertJ.

### Paso 2: qué probar primero (de más a menos importante)

| Prioridad | Clase | Qué comprobar | Tipo de test |
|-----------|-------|---------------|--------------|
| 1 | `TenantGuardFilter` | token del negocio 1 → `/api/businesses/2/...` da 403; membresía inactiva da 401; rol cambiado da 401 | Unitario con `MockHttpServletRequest` y Mockito |
| 2 | `AppointmentValidator` | transiciones de estado válidas e inválidas; intervalo (incluido el caso 45 min de M2); cruzar medianoche | Unitario puro |
| 3 | `AvailabilityService` | huecos con turno partido, ausencias, bloqueos, cabinas; **todo hueco devuelto pasa la validación** | Unitario con repositorios simulados (Mockito) |
| 4 | `AuthService` | login correcto, contraseña mala, usuario inactivo, 1 o varias membresías | Unitario con Mockito |
| 5 | `PasswordResetService` | token caducado, ya usado, válido | Unitario con Mockito |
| 6 | Controladores | `@PreAuthorize`: un EMPLOYEE recibe 403 al crear un servicio | `@WebMvcTest` + `@WithMockUser` |
| 7 | `UserService.create` | regresión de A3: no devolver datos de una cuenta ajena | Unitario con Mockito |

### Paso 3: ejemplo mínimo (unitario puro, sin base de datos)
```java
package com.optima.api.modules.appointment.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppointmentValidatorTest {

    // los repositorios no se usan en estos metodos, por eso se pasan como null
    private final AppointmentValidator validator =
            new AppointmentValidator(null, null, null, null, null);

    @Test
    void pendientePuedePasarAConfirmada() {
        assertThatCode(() -> validator.validateStatusTransition("PENDING", "CONFIRMED"))
                .doesNotThrowAnyException();
    }

    @Test
    void completadaNoPuedeCambiarDeEstado() {
        assertThatThrownBy(() -> validator.validateStatusTransition("COMPLETED", "PENDING"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void intervalo45AceptaLasOnceYMedia() {   // falla hoy: demuestra el bug M2
        LocalDateTime inicio = LocalDateTime.of(2030, 1, 7, 11, 30);
        assertThatCode(() -> validator.validateAppointmentInterval(inicio, 45))
                .doesNotThrowAnyException();
    }
}
```
Se ejecutan con `./mvnw test`.

> Para tests de integración con la BD real (consultas JPQL, columnas generadas de MySQL) H2 no sirve, porque no entiende las columnas `GENERATED ALWAYS`. Cuando se domine lo básico, la opción es **Testcontainers** con MySQL. No hace falta empezar por ahí.

---

## 8. Puntos fuertes del proyecto ✔️

Para valorar el informe en su justa medida, esto está **bien hecho**:

- **Aislamiento entre negocios:** `TenantGuardFilter` compara el negocio de la URL con el del token y **vuelve a consultar la BD** en cada petición (detecta revocaciones y cambios de rol). Además todos los repositorios filtran por `businessId` (`findByIdAndBusinessId`) y se comprueba que cliente, empleado, cabina, servicios, categoría e impuesto pertenezcan al negocio. No he encontrado ninguna ruta que permita leer datos de otro negocio por ID (salvo A3, que es por email).
- **Contraseñas con BCrypt** y comparación con un hash ficticio cuando el usuario no existe, para no revelar emails por tiempo en el login.
- **Token de recuperación** aleatorio (`SecureRandom`, 32 bytes), guardado como **hash SHA-256**, con caducidad de 1 hora y de un solo uso.
- **Respuestas de error uniformes** (`ErrorResponse`) y un manejador genérico que **no** filtra trazas al cliente.
- **Precios e IVA congelados** al reservar (`appointment_services`).
- **Intento de control de concurrencia** con `PESSIMISTIC_WRITE` e índices únicos en columnas generadas (solo hay que completarlo, ver M1).
- **Validación de entrada** amplia con Bean Validation y mensajes en español.
- **Paginación** con tope de 100 elementos y lista blanca de campos de ordenación en citas.
- `open-in-view=false`, `@Transactional(readOnly = true)` en lecturas y `@EntityGraph` para evitar consultas N+1 en los listados principales.
- `.env` excluido de Git y CORS sin credenciales (el token va en cabecera, así que desactivar CSRF es correcto).

---

## 9. Orden sugerido de corrección

1. **Hoy:** A1 (rotar secretos) y A2 (quitar la clave JWT por defecto, ✅ hecho en `a641114`). Son cambios pequeños con mucho impacto.
2. **Esta semana:** A3 (alta de empleados), M3 (rate limit), M10 (BD y puertos), M13 (demo en producción), M11 (actualizar Spring Boot y `max = 72`).
3. **Siguiente:** A4. Montar los tests de la sección 7 y escribir primero los que reproducen M1 y M2; después arreglar esos bugs.
4. **Después:** M4–M9 y M14, que son decisiones de diseño (qué puede hacer cada rol, reglas de pago y de reactivación).
5. **Refactor tranquilo, con los tests ya en marcha:** M12 y las bajas B5–B10 (duplicación y nombres). El resto de bajas, cuando se toque cada fichero.
