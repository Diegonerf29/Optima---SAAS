package com.optima.api.common.validation;

/**
 * expresiones regulares y mensajes que se repiten en varios DTOs (B7)
 * si cambia una regla, se cambia aqui y vale para toda la API
 * uso: @Pattern(regexp = ValidationPatterns.PHONE, message = ValidationPatterns.PHONE_MESSAGE)
 */
public final class ValidationPatterns {

    /** telefono opcional: digitos, +, -, (, ) y espacios, de 6 a 20 caracteres */
    public static final String PHONE = "^$|^[0-9+\\s()-]{6,20}$";
    public static final String PHONE_MESSAGE =
            "El teléfono solo admite dígitos y los símbolos + - ( ) y espacios (6-20 caracteres)";

    /** codigo postal opcional: de 4 a 10 digitos */
    public static final String POSTAL_CODE = "^$|^[0-9]{4,10}$";
    public static final String POSTAL_CODE_MESSAGE = "El código postal solo admite dígitos (4-10)";

    /** colores de la paleta del frontend para empleados y cabinas */
    public static final String COLOR = "cyan|amber|emerald|indigo|pink|sky|violet|teal";
    public static final String COLOR_MESSAGE = "El color debe ser uno de la paleta permitida";

    private ValidationPatterns() {
    }
}
