package com.optima.api.modules.business.dto.request;

import com.optima.api.common.validation.ValidationPatterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** datos para crear o actualizar una cabina */
public record BoothRequest(

        @NotBlank(message = "El nombre de la cabina es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres")
        String name,

        @Pattern(
                regexp = ValidationPatterns.COLOR,
                message = ValidationPatterns.COLOR_MESSAGE
        )
        String color
) {}
