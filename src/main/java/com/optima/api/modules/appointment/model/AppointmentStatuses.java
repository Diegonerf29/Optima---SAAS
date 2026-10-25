package com.optima.api.modules.appointment.model;

import java.util.Set;

/**
 * nombres de los estados de una cita (tabla appointment_statuses) en un solo sitio (B10)
 * asi una errata ("CONFIRMD") la detecta el compilador
 */
public final class AppointmentStatuses {

    public static final String PENDING = "PENDING";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String COMPLETED = "COMPLETED";
    public static final String CANCELLED = "CANCELLED";
    public static final String NO_SHOW = "NO_SHOW";

    /** estados que ocupan la agenda (en la BD son los ids 1, 2 y 3, ver V1__esquema_inicial.sql) */
    public static final Set<String> ACTIVE = Set.of(PENDING, CONFIRMED, IN_PROGRESS);

    /** lo mismo para las consultas JPQL: ... AND a.status.name IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS') */
    public static final String ACTIVE_JPQL = "('" + PENDING + "', '" + CONFIRMED + "', '" + IN_PROGRESS + "')";

    /** citas que aun pueden recibir el recordatorio */
    public static final String REMINDABLE_JPQL = "('" + PENDING + "', '" + CONFIRMED + "')";

    private AppointmentStatuses() {
    }
}
