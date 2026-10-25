package com.optima.api.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * datos necesarios para iniciar sesion
 */
public record LoginRequest(
        @NotBlank(message = "El email es obligatorio")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(max = 200, message = "La contraseña no puede superar los 200 caracteres")
        String password
) {}
