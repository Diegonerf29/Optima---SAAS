package com.optima.api.modules.appointment.notification;

/**
 * algo le ha pasado a una cita y quiza hay que avisar al cliente
 * se publica dentro de la transaccion y se procesa cuando ya se ha guardado (AFTER_COMMIT)
 */
public record AppointmentEvent(Long appointmentId, Type type) {

    public enum Type { CREATED, RESCHEDULED, CANCELLED }
}
