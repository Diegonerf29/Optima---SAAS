package com.optima.api.modules.appointment.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * datos de entrada para editar una cita
 * no cambia cliente estado ni pago
 */
public record UpdateAppointmentRequest(

        @NotNull(message = "El ID del empleado es obligatorio")
        @Positive(message = "El ID del empleado debe ser positivo")
        Long membershipId,

        @Positive(message = "El ID de la cabina debe ser positivo")
        Long boothId,

        @NotNull(message = "La fecha/hora de inicio es obligatoria")
        LocalDateTime startDateTime,

        @Size(max = 2000, message = "Las notas no pueden superar los 2000 caracteres")
        String notes,

        @NotEmpty(message = "Debe incluir al menos un servicio")
        @Size(max = 20, message = "Una cita no puede tener más de 20 servicios")
        List<@NotNull(message = "El ID del servicio es obligatorio")
              @Positive(message = "El ID del servicio debe ser positivo") Long> serviceIds
) {}
