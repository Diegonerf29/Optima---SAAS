package com.optima.api.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** codigo recibido por correo para confirmar el email */
public record VerifyEmailRequest(
        @NotBlank(message = "El token es obligatorio")
        @Size(max = 255, message = "El token no puede superar los 255 caracteres")
        String token
) {}
