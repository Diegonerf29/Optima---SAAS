package com.optima.api.modules.business.dto.request;

import com.optima.api.common.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * datos para crear un negocio
 * las reglas de negocio se completan en el servicio
 */
public record CreateBusinessRequest(

        @NotBlank(message = "El nombre del negocio es obligatorio")
        @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
        String name,

        @NotBlank(message = "El slug es obligatorio")
        @Size(max = 150, message = "El slug no puede superar los 150 caracteres")
        String slug,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @Size(max = 20, message = "El teléfono no puede superar los 20 caracteres")
        @Pattern(
                regexp = ValidationPatterns.PHONE,
                message = ValidationPatterns.PHONE_MESSAGE
        )
        String phone,

        @Size(max = 255, message = "La dirección no puede superar los 255 caracteres")
        String address,

        @Size(max = 100, message = "La ciudad no puede superar los 100 caracteres")
        String city,

        @Size(max = 100, message = "El estado/provincia no puede superar los 100 caracteres")
        String state,

        @Size(max = 100, message = "El país no puede superar los 100 caracteres")
        String country,

        @Size(max = 20, message = "El código postal no puede superar los 20 caracteres")
        @Pattern(
                regexp = ValidationPatterns.POSTAL_CODE,
                message = ValidationPatterns.POSTAL_CODE_MESSAGE
        )
        String postalCode,

        Integer appointmentInterval,

        // opcional: si no se indica, Europe/Madrid
        @Size(max = 50, message = "La zona horaria no puede superar los 50 caracteres")
        String timezone
) {}
