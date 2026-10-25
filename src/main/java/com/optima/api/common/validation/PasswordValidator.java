package com.optima.api.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

/**
 * comprueba la regla de @Password
 * se cuentan bytes y no caracteres porque BCrypt solo usa los 72 primeros bytes
 */
public class PasswordValidator implements ConstraintValidator<Password, String> {

    public static final int MIN_CHARS = 8;
    public static final int MAX_BYTES = 72;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // el vacio lo controla @NotBlank
        if (value == null || value.isEmpty()) {
            return true;
        }
        if (value.length() < MIN_CHARS) {
            return false;
        }
        // una letra con tilde o una ñ ocupan 2 bytes
        if (value.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            return false;
        }
        boolean hasLetter = value.chars().anyMatch(Character::isLetter);
        boolean hasDigit = value.chars().anyMatch(Character::isDigit);
        return hasLetter && hasDigit;
    }
}
