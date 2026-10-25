package com.optima.api.modules.user.dto.request;

import com.optima.api.common.validation.Password;
import jakarta.validation.constraints.NotBlank;

/**
 * datos para cambiar la contrasena del usuario autenticado
 */
public record ChangePasswordRequest(

        @NotBlank(message = "La contraseña actual es obligatoria")
        String currentPassword,

        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Password
        String newPassword
) {}
