package com.optima.api.modules.user.dto.request;

import com.optima.api.common.validation.Password;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * datos para cambiar la contrasena del usuario autenticado
 */
public record ChangePasswordRequest(

        @NotBlank(message = "La contraseña actual es obligatoria")
        @Size(max = 200, message = "La contraseña no puede superar los 200 caracteres")
        String currentPassword,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Password
        String newPassword
) {}
