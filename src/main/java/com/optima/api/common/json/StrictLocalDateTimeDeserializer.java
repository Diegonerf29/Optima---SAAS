package com.optima.api.common.json;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.exc.InvalidFormatException;
import tools.jackson.databind.ext.javatime.deser.LocalDateTimeDeserializer;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * maneja que las fechas lleguen sin zona horaria
 * asi evitamos cambios de hora no esperados
 */
public class StrictLocalDateTimeDeserializer extends LocalDateTimeDeserializer {

    // con este control detectamos desfases tipo +02:00 o -05:00
    private static final Pattern OFFSET_PATTERN = Pattern.compile(".*[+-]\\d{2}:\\d{2}$");

    /** comprueba que la fecha no venga con zona */
    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) {
        String text = p.getString();
        // si viene con z o con offset se rechaza
        if (text != null && (text.endsWith("Z") || OFFSET_PATTERN.matcher(text).matches())) {
            throw new TimezoneNotAllowedException(p, text);
        }
        return super.deserialize(p, ctxt);
    }

    /** excepcion para fechas con zona horaria */
    public static class TimezoneNotAllowedException extends InvalidFormatException {
        public TimezoneNotAllowedException(JsonParser p, String value) {
            super(p,
                "Las fechas no deben incluir zona horaria. Usa formato 'YYYY-MM-DDTHH:mm:ss' sin sufijo.",
                value, LocalDateTime.class);
        }
    }
}
