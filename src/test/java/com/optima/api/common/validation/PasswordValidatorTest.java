package com.optima.api.common.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordValidatorTest {

    private final PasswordValidator validator = new PasswordValidator();

    @ParameterizedTest
    @ValueSource(strings = {"abcdefg1", "Contraseña2024", "1234567a", "una frase larga con 1 numero"})
    void aceptaContrasenasConLetrasYNumeros(String password) {
        assertThat(validator.isValid(password, null)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc12", "12345678", "abcdefgh", "        "})
    void rechazaCortasOSinLetrasOSinNumeros(String password) {
        assertThat(validator.isValid(password, null)).isFalse();
    }

    @Test
    void rechazaMasDe72Bytes() {
        // 36 "ñ" son 36 caracteres pero 72 bytes; con un numero mas ya no cabe
        String password = "ñ".repeat(36) + "1";
        assertThat(password.length()).isLessThan(72);
        assertThat(validator.isValid(password, null)).isFalse();
    }

    @Test
    void elVacioLoControlaNotBlank() {
        assertThat(validator.isValid(null, null)).isTrue();
        assertThat(validator.isValid("", null)).isTrue();
    }
}
