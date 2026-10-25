package com.optima.api.modules.user.dto.request;

import com.optima.api.common.validation.ValidationPatterns;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/**
 * datos para actualizar la relacion de un empleado en un negocio
 */
public record UpdateUserRequest(

        @NotNull(message = "El ID del rol es obligatorio")
        @Positive(message = "El ID del rol debe ser positivo")
        Long roleId,

        @Pattern(
                regexp = ValidationPatterns.COLOR,
                message = ValidationPatterns.COLOR_MESSAGE
        )
        String color
) {}
