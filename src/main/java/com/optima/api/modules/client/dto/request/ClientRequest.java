package com.optima.api.modules.client.dto.request;

import com.optima.api.common.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * datos para crear o actualizar un cliente dentro de un negocio
 */
public record ClientRequest(

        @NotBlank(message = "El nombre completo es obligatorio")
        @Size(max = 150, message = "El nombre no puede exceder los 150 caracteres")
        String fullName,

        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede exceder los 150 caracteres")
        String email,

        @Size(max = 20, message = "El teléfono no puede exceder los 20 caracteres")
        @Pattern(
                regexp = ValidationPatterns.PHONE,
                message = ValidationPatterns.PHONE_MESSAGE
        )
        String phone,

        @Size(max = 2000, message = "Las notas no pueden superar los 2000 caracteres")

        String notes
) {}
