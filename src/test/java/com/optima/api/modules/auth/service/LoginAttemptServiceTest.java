package com.optima.api.modules.auth.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** regresion de M3: limite de fallos por cuenta */
class LoginAttemptServiceTest {

    private final LoginAttemptService service = new LoginAttemptService(true);

    @Test
    void cincoFallosBloqueanLaCuenta() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES; i++) {
            assertThatCode(() -> service.checkNotBlocked("ana@ejemplo.com")).doesNotThrowAnyException();
            service.recordFailure("ana@ejemplo.com");
        }
        assertThatThrownBy(() -> service.checkNotBlocked("ana@ejemplo.com"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(429));
    }

    @Test
    void noDistingueMayusculasNiEspacios() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES; i++) {
            service.recordFailure(" ANA@ejemplo.com ");
        }
        assertThatThrownBy(() -> service.checkNotBlocked("ana@ejemplo.com"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void unAciertoPoneElContadorACero() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES - 1; i++) {
            service.recordFailure("luis@ejemplo.com");
        }
        service.recordSuccess("luis@ejemplo.com");
        service.recordFailure("luis@ejemplo.com");
        assertThatCode(() -> service.checkNotBlocked("luis@ejemplo.com")).doesNotThrowAnyException();
    }

    @Test
    void otraCuentaNoSeVeAfectada() {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES; i++) {
            service.recordFailure("eva@ejemplo.com");
        }
        assertThatCode(() -> service.checkNotBlocked("otra@ejemplo.com")).doesNotThrowAnyException();
    }
}
