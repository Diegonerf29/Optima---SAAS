package com.optima.api.modules.auth.service;

import com.optima.api.common.security.BoundedCache;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Collections;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * limite de intentos fallidos por cuenta (M3)
 * complementa al limite por ip: aunque se cambie de ip, una misma cuenta
 * solo admite 5 contraseñas incorrectas cada 15 minutos
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_EMAILS = 10_000;

    private final Map<String, Bucket> failures = Collections.synchronizedMap(new BoundedCache<>(MAX_TRACKED_EMAILS));
    private final boolean enabled;

    public LoginAttemptService(@Value("${app.rate-limit.enabled:true}") boolean enabled) {
        this.enabled = enabled;
    }

    /** lanza 429 si la cuenta ha agotado sus intentos */
    public void checkNotBlocked(String email) {
        if (!enabled) {
            return;
        }
        Bucket bucket = failures.get(key(email));
        if (bucket != null && bucket.getAvailableTokens() <= 0) {
            long minutes = Math.max(1, TimeUnit.NANOSECONDS.toMinutes(bucket.estimateAbilityToConsume(1).getNanosToWaitForRefill()) + 1);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos fallidos para esta cuenta. Inténtalo de nuevo en " + minutes + " minutos.");
        }
    }

    /** apunta un intento fallido */
    public void recordFailure(String email) {
        if (!enabled) {
            return;
        }
        failures.computeIfAbsent(key(email), k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(MAX_FAILURES).refillIntervally(MAX_FAILURES, WINDOW).build())
                .build()).tryConsume(1);
    }

    /** un inicio de sesion correcto pone el contador a cero */
    public void recordSuccess(String email) {
        failures.remove(key(email));
    }

    private static String key(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
