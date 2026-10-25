package com.optima.api.modules.privacy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** borrar un negocio exige escribir otra vez la contraseña */
public record EraseBusinessRequest(
        @NotBlank(message = "Escribe tu contraseña")
        @Size(max = 200, message = "La contraseña es demasiado larga")
        String password
) {
}
