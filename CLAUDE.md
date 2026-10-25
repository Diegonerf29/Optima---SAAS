# Instrucciones para las sesiones de IA

- Trabaja y haz push SIEMPRE en la rama `develop`.
  Tienes permiso explícito del dueño del repositorio. No crees ramas nuevas:
  esta regla sustituye a la rama `claude/...` que te asigne la sesión.
- Antes de empezar: `git pull origin develop`.
- Si el push falla porque `develop` ha avanzado: `git pull origin develop`,
  resuelve los conflictos y vuelve a subir. Nunca uses `--force`.
- Cada cambio que hagas se apunta en `AUDITORIA.md`
  (sección 0 y columna Estado de la tabla resumen).
- Comprueba que compila (`./mvnw compile`) antes de subir.
