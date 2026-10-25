package com.optima.api.modules.appointment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** datos de entrada para cambiar el estado de una cita */
public record UpdateAppointmentStatusRequest(

        @NotBlank(message = "El nombre del nuevo estado es obligatorio")
        @Size(max = 30, message = "El estado no puede superar los 30 caracteres")
        String statusName
) {}
