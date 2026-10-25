package com.optima.api.modules.user.dto.request;

import com.optima.api.common.validation.Password;
import com.optima.api.common.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * datos para crear un empleado dentro de un negocio
 */
public record CreateUserRequest(

        @NotNull(message = "El ID del rol es obligatorio")
        @Positive(message = "El ID del rol debe ser positivo")
        Long roleId,

        @NotBlank(message = "El nombre completo es obligatorio")
        @Size(max = 150, message = "El nombre no puede exceder los 150 caracteres")
        String fullName,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede exceder los 150 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Password
        String password,

        @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
        @Pattern(
                regexp = ValidationPatterns.PHONE,
                message = ValidationPatterns.PHONE_MESSAGE
        )
        String phone
) {}
